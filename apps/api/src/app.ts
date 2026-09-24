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
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import type { AuthAdapter } from './auth/adapters';
import { registerMatchRoutes } from './match-routes';
import { registerRematchRoutes } from './rematch-routes';
import { registerInsightsRoutes } from './insights-routes';
import { registerAiRoutes } from './ai/ai-routes';
import { AiTurnEngine } from './ai/engine';
import { attachRealtime } from './realtime';
import { TimeoutScheduler } from './timeout-scheduler';
import { createAnalyticsEmitter, type DeploymentTags } from './analytics';

declare module 'fastify' {
  interface FastifyRequest {
    authSubject?: string;
    userId?: string;
  }
}

/** DA-P1 §1: BB_ENV wins; production when NODE_ENV says so; else development. */
function resolveEnvironment(): string {
  if (process.env.BB_ENV) return process.env.BB_ENV;
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
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
  /** DA-P1 §1: deployment tags stamped on every analytics line (resolved from env when omitted). */
  deployment?: DeploymentTags;
  /** DA-P1 §2: Fastify built-in pino structured logging (default false). */
  logger?: boolean;
}

/** Routes that require a verified token. */
const PROTECTED_PREFIXES = ['/v1/me', '/v1/matches', '/v1/challenges', '/v1/analytics'];

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger === true });
  const users = new UserRepository(options.prisma);
  const service = new MatchCommandService(options.prisma);
  const auth = options.auth;
  const deployment: DeploymentTags =
    options.deployment ?? { environment: resolveEnvironment(), release: process.env.BB_RELEASE ?? 'local' };
  // DA-P1: created beside auth so every route below (dev signin,
  // requireAuth, handle, analytics event) closes over the same emitter.
  const analytics = createAnalyticsEmitter(undefined, deployment);

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

  // DA-P1 §2: unhandled route errors only — Zod 400s, domain 4xx/409s and
  // 404s reply directly and are untouched. The 500 body is sanitized
  // (never Fastify's default error.message echo — docs/10); the request id
  // rides pino automatically. Never log tokens, RVs, or bodies here.
  // BB-233 (BB-229-1): framework-thrown parser errors (malformed JSON,
  // wrong content-type) carry a 4xx statusCode — pass them through as
  // sanitized INVALID_REQUEST at warn level instead of misreporting client
  // errors as 500s.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status =
      typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;
    request.log[status === 500 ? 'error' : 'warn'](
      {
        err: error,
        userId: request.userId ?? undefined,
        matchId: (request.params as { matchId?: string } | undefined)?.matchId ?? undefined,
        environment: deployment.environment,
        release: deployment.release,
      },
      status === 500 ? 'unhandled request error' : 'invalid request',
    );
    void reply.code(status).send(
      status === 500
        ? { code: 'INTERNAL_ERROR', message: 'internal server error' }
        : { code: 'INVALID_REQUEST', message: 'invalid request body' },
    );
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'bounty-bay-api',
    version: '0.1.0',
    environment: deployment.environment,
    release: deployment.release,
  }));

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
    // QA-006: the full strict E2E suite signs in ~49 times per run; a
    // 30/min cap deterministically 429s its last tests. The higher cap is
    // development-only by construction — this route is never registered
    // when NODE_ENV is production (devAuthAllowed above), so production
    // cannot hit it at any rate.
    app.post('/v1/auth/dev/signin', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async (request, reply) => {
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
      // DA-P1 §3.1: exactly once per human user (created is true only on
      // row creation; bots can never reach this route).
      if (ensured.created) analytics.emit('signup_completed', { playerId: ensured.userId, authProvider: auth.name });
      if (parsed.data.handle) {
        const set = await users.setHandle(ensured.userId, parsed.data.handle);
        if (!set.ok) return reply.code(set.code === 'HANDLE_TAKEN' ? 409 : 400).send(set);
        // DA-P1 §3.2: every successful setHandle (possibly repeated; the
        // funnel step derives from the stream).
        analytics.emit('handle_created', { playerId: ensured.userId });
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
    let ensured: { userId: string; handle: string; created: boolean };
    try {
      ensured = await users.ensureUserBySubject(verified.subject);
      // DA-P1 §3.1 call site B: with Clerk (no dev signin) the first
      // protected request creates the row; with dev auth the dev-signin
      // route fired first and `created` is false here — no double fire.
      if (ensured.created) analytics.emit('signup_completed', { playerId: ensured.userId, authProvider: auth.name });
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
    // DA-P1 §3.2: every successful setHandle (possibly repeated).
    analytics.emit('handle_created', { playerId: request.userId! });
    return { ok: true, handle: result.handle };
  });

  /**
   * GET /v1/me/active-match — resume support (DEC-025, docs/08): the first
   * of the caller's live matches (CREATED/READY/ACTIVE/PAUSED), newest first.
   * PDR-3: open rematch proposals are excluded — a proposal is not a
   * playable match, and resuming into one would show a misleading screen.
   */
  app.get('/v1/me/active-match', async (request, _reply) => {
    const participant = await options.prisma.matchParticipant.findFirst({
      where: {
        userId: request.userId!,
        match: { status: { in: ['CREATED', 'READY', 'ACTIVE', 'PAUSED'] }, rematchFromMatchId: null },
      },
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
  const engine = new AiTurnEngine({ service, prisma: options.prisma, broadcast, analytics });
  const timeoutScheduler =
    options.timeoutScheduler === undefined
      ? new TimeoutScheduler({ service, prisma: options.prisma, broadcast, analytics })
      : options.timeoutScheduler;
  engineRef.current = engine;
  timeoutRef.current = timeoutScheduler;

  /**
   * POST /v1/analytics/event — client observability (docs/11, DEC-028 §41;
   * DA-P1 §3.4). IN-2 ships review_opened / review_step_viewed; DA-P1
   * adds the W2 client events + meta + client deployment tags.
   * Authenticated and rate-limited; the sink is stdout-only until P1-M9
   * replaces it.
   */
  const analyticsEventSchema = z.object({
    name: z.enum(['review_opened', 'review_step_viewed', 'rematch_clicked', 'play_again_clicked', 'client_exception', 'bay_viewed']),
    matchId: z.string().uuid().optional(),
    meta: z.object({
      message: z.string().max(500).optional(),
      stack: z.string().max(2000).optional(),
      path: z.string().max(200).optional(),
    }).optional(),
    client_environment: z.string().max(40).optional(),
    client_release: z.string().max(40).optional(),
  });
  app.post('/v1/analytics/event', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = analyticsEventSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'invalid analytics event' });
    analytics.emit(parsed.data.name, {
      playerId: request.userId!,
      ...(parsed.data.matchId ? { matchId: parsed.data.matchId } : {}),
      ...(parsed.data.meta ?? {}),
      ...(parsed.data.client_environment ? { client_environment: parsed.data.client_environment } : {}),
      ...(parsed.data.client_release ? { client_release: parsed.data.client_release } : {}),
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

  registerRematchRoutes(app, {
    service,
    prisma: options.prisma,
    gameRulesVersion: GAME_RULES_VERSION,
    economyConfigVersion: DEFAULT_ECONOMY_CONFIG.version,
    timeoutScheduler: timeoutScheduler ?? undefined,
    analytics,
  });

  registerInsightsRoutes(app, { prisma: options.prisma });

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
