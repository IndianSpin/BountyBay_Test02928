/**
 * Bounty Bay API application factory (Fastify 5).
 *
 * `buildApp` is the testable composition root; `server.ts` only binds the
 * port. Routes implement 08_API_CONTRACTS.md semantics; every protected
 * route verifies the token through the AuthAdapter and maps the subject to
 * the internal user (DEC-023). Match mutations go over HTTP and broadcast
 * through the realtime layer (06 §7).
 */

import { GAME_RULES_VERSION, DEFAULT_ECONOMY_CONFIG } from '@bounty-bay/config';
import { MatchCommandService, UserRepository, ensureAiBotUsers } from '@bounty-bay/db';
import type { PrismaClient } from '@bounty-bay/db';
import { z } from 'zod';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import type { AuthAdapter } from './auth/adapters';
import { registerMatchRoutes } from './match-routes';
import { registerAiRoutes } from './ai/ai-routes';
import { AiTurnEngine } from './ai/engine';
import { attachRealtime } from './realtime';
import { TimeoutScheduler } from './timeout-scheduler';
import { createAnalyticsEmitter } from './analytics';

declare module 'fastify' {
  interface FastifyRequest {
    authSubject?: string;
    userId?: string;
  }
}

export interface BuildAppOptions {
  auth: AuthAdapter;
  prisma: PrismaClient;
  /** Registers POST /v1/auth/dev/signin — dev adapters only, never production. */
  exposeDevAuth?: boolean;
  /** GR-015 technical debounce before freezing the clock on disconnect. */
  disconnectDebounceMs?: number;
  /**
   * DD Phase 1: the hard decision-time scheduler. Defaults to a live
   * instance; pass null to disable (test seam — the domain guard still
   * rejects post-limit commands, GR-023).
   */
  timeoutScheduler?: TimeoutScheduler | null;
}

/** Routes that require a verified token. */
const PROTECTED_PREFIXES = ['/v1/me', '/v1/matches', '/v1/challenges', '/v1/analytics'];

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const users = new UserRepository(options.prisma);
  const service = new MatchCommandService(options.prisma);
  const auth = options.auth;

  // SI-005: baseline rate limiting (profile enumeration and command spam).
  await app.register(rateLimit, {
    global: false,
    max: 300,
    timeWindow: '1 minute',
  });

  // Cross-origin browser access (the web app runs on a different port).
  // Dev default allows any origin; production pins CORS_ORIGIN (comma-separated).
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true,
  });

  app.get('/health', async () => ({ ok: true, service: 'bounty-bay-api', version: '0.1.0' }));

  // -- public ---------------------------------------------------------------

  /** GET /v1/profiles/:handle — public fields only (08_API_CONTRACTS). */
  app.get<{ Params: { handle: string } }>('/v1/profiles/:handle', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const profile = await users.getPublicProfileByHandle(request.params.handle);
    if (!profile) return reply.code(404).send({ code: 'PROFILE_NOT_FOUND', message: 'no profile with that handle' });
    return profile;
  });

  // -- dev auth (non-production only) ---------------------------------------
  // Fail closed, structurally: the route is NOT REGISTERED when NODE_ENV is
  // production, regardless of the adapter or flags. There is no code path
  // that can activate the dev bypass in staging/production.
  const devAuthAllowed = options.exposeDevAuth && process.env.NODE_ENV !== 'production';

  if (devAuthAllowed) {
    const devSigninSchema = z.object({
      subject: z.string().min(3).max(64).optional(),
      handle: z.string().regex(/^[A-Za-z0-9_-]{3,16}$/).optional(),
    });
    app.post('/v1/auth/dev/signin', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
      const parsed = devSigninSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message });
      const dev = auth as unknown as { signToken: (subject: string) => string };
      const subject = parsed.data.subject ?? `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      // DEC-025 hardening: the dev adapter signs arbitrary subjects, so the
      // bot subject namespace must be refused here — never impersonate an AI.
      if (subject.startsWith('bot:')) {
        return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'bot subjects cannot sign in' });
      }
      const ensured = await users.ensureUserBySubject(subject);
      if (parsed.data.handle) {
        const set = await users.setHandle(ensured.userId, parsed.data.handle);
        if (!set.ok) return reply.code(set.code === 'HANDLE_TAKEN' ? 409 : 400).send(set);
      }
      return { token: dev.signToken(subject), userId: ensured.userId, handle: (parsed.data.handle ?? ensured.handle) };
    });
  }

  // -- protected -------------------------------------------------------------

  const requireAuth = async (request: { headers: { authorization?: string } }): Promise<{ subject: string; userId: string } | null> => {
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) return null;
    const verified = await auth.verifyToken(token);
    if (!verified) return null;
    // DEC-025: bots can never authenticate — ensureUserBySubject throws for
    // the bot: subject namespace, and the seeded bot rows are refused below.
    let ensured: { userId: string; handle: string };
    try {
      ensured = await users.ensureUserBySubject(verified.subject);
    } catch {
      return null;
    }
    const row = await options.prisma.user.findUnique({ where: { id: ensured.userId }, select: { isBot: true } });
    if (!row || row.isBot) return null;
    return { subject: verified.subject, userId: ensured.userId };
  };

  app.addHook('preHandler', async (request, reply) => {
    const url = request.routeOptions.url ?? '';
    if (!PROTECTED_PREFIXES.some((prefix) => url.startsWith(prefix))) return;
    const resolved = await requireAuth(request);
    if (!resolved) return reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'missing or invalid credentials' });
    request.authSubject = resolved.subject;
    request.userId = resolved.userId;
  });

  /** GET /v1/me — authenticated profile and entitlements. */
  app.get('/v1/me', async (request, reply) => {
    const me = await users.getMe(request.userId!);
    if (!me) return reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'account unavailable' });
    return me;
  });

  /** POST /v1/me/handle — choose/change the public anonymous handle. */
  const handleSchema = z.object({ handle: z.string().regex(/^[A-Za-z0-9_-]{3,16}$/) });
  app.post('/v1/me/handle', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = handleSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_HANDLE', message: 'handle must be 3-16 characters: letters, digits, underscore or hyphen' });
    const result = await users.setHandle(request.userId!, parsed.data.handle);
    if (!result.ok) return reply.code(result.code === 'HANDLE_TAKEN' ? 409 : 400).send(result);
    return { ok: true, handle: result.handle };
  });

  /**
   * GET /v1/me/active-match — resume support (DEC-025, docs/08): the first
   * of the caller's live matches (CREATED/READY/ACTIVE/PAUSED), newest first.
   */
  app.get('/v1/me/active-match', async (request, _reply) => {
    const participant = await options.prisma.matchParticipant.findFirst({
      where: { userId: request.userId!, match: { status: { in: ['CREATED', 'READY', 'ACTIVE', 'PAUSED'] } } },
      orderBy: { match: { createdAt: 'desc' } },
      include: {
        match: { select: { id: true, mode: true, status: true, aiPersonaKey: true, inviteToken: true } },
      },
    });
    if (!participant) return { activeMatch: null };
    const opponent = await options.prisma.matchParticipant.findFirst({
      where: { matchId: participant.matchId, userId: { not: request.userId! } },
      include: { user: { select: { handle: true } } },
    });
    return {
      activeMatch: {
        matchId: participant.match.id,
        mode: participant.match.mode,
        status: participant.match.status,
        aiPersonaKey: participant.match.aiPersonaKey,
        opponentHandle: opponent?.user.handle ?? null,
        inviteToken: participant.match.inviteToken,
      },
    };
  });

  // -- realtime + match routes ----------------------------------------------

  // The engine and the timeout scheduler need the broadcaster; match:join
  // wants both. Break the cycle with refs filled in after the realtime
  // layer is attached.
  const engineRef: { current: AiTurnEngine | null } = { current: null };
  const timeoutRef: { current: TimeoutScheduler | null } = { current: null };
  const { broadcast } = attachRealtime(app, {
    auth,
    service,
    prisma: options.prisma,
    disconnectDebounceMs: options.disconnectDebounceMs,
    onMatchJoin: (matchId) => {
      void engineRef.current?.maybeSchedule(matchId);
      void timeoutRef.current?.refresh(matchId);
    },
    onMatchStateChange: (matchId) => {
      void engineRef.current?.maybeSchedule(matchId);
      void timeoutRef.current?.refresh(matchId);
    },
  });
  const engine = new AiTurnEngine({ service, prisma: options.prisma, broadcast });
  const analytics = createAnalyticsEmitter();
  const timeoutScheduler =
    options.timeoutScheduler === undefined
      ? new TimeoutScheduler({ service, prisma: options.prisma, broadcast, analytics })
      : options.timeoutScheduler;
  engineRef.current = engine;
  timeoutRef.current = timeoutScheduler;

  /**
   * POST /v1/analytics/event — client observability (docs/11, DEC-028 §41).
   * IN-2 ships review_opened / review_step_viewed. Authenticated and
   * rate-limited; the sink is stdout-only until P1-M9 replaces it.
   */
  const analyticsEventSchema = z.object({
    name: z.enum(['review_opened', 'review_step_viewed']),
    matchId: z.string().uuid().optional(),
  });
  app.post('/v1/analytics/event', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = analyticsEventSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'invalid analytics event' });
    analytics.emit(parsed.data.name, {
      playerId: request.userId!,
      ...(parsed.data.matchId ? { matchId: parsed.data.matchId } : {}),
    });
    return { ok: true };
  });

  registerMatchRoutes(app, {
    service,
    prisma: options.prisma,
    broadcast,
    gameRulesVersion: GAME_RULES_VERSION,
    economyConfigVersion: DEFAULT_ECONOMY_CONFIG.version,
    aiEngine: engine,
    timeoutScheduler: timeoutScheduler ?? undefined,
    analytics,
  });

  registerAiRoutes(app, {
    service,
    prisma: options.prisma,
    broadcast,
    engine,
    gameRulesVersion: GAME_RULES_VERSION,
    economyConfigVersion: DEFAULT_ECONOMY_CONFIG.version,
  });

  // DEC-025: bots are seeded fixtures; any AI match left mid-turn after a
  // restart resumes here. DD Phase 1: over-limit ACTIVE matches time out
  // here after a restart (GR-024).
  app.addHook('onReady', async () => {
    await ensureAiBotUsers(options.prisma);
    await engine.bootScan();
    if (timeoutScheduler) await timeoutScheduler.bootScan();
  });

  return app;
}
