/**
 * Friend-rematch routes (PDR-3, QA-004): rematch = mutual consent.
 * After the result, either side may propose a rematch (same scenario, same
 * roles, unrated); the opponent sees an in-session accept prompt; on
 * acceptance a new match starts ACTIVE immediately. A proposal is a CREATED
 * Match row with one participant and no invite token — the opponent is
 * fixed, so there is no share link and no rating involvement (GR-019).
 * UI half (result-screen affordances) is BB-219b for W2.
 */

import { walkAwayRequestSchema } from '@bounty-bay/contracts';
import type { MatchCommandService, PrismaClient } from '@bounty-bay/db';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { assignFixedRole, pickFirstPlayer } from './match-assignment';
import { scenarioForRole } from './match-routes';
import type { TimeoutScheduler } from './timeout-scheduler';

export interface RematchRoutesOptions {
  service: MatchCommandService;
  prisma: PrismaClient;
  gameRulesVersion: string;
  economyConfigVersion: string;
  /** PDR-3: the accepted rematch starts ACTIVE — arm its decision-time deadline. */
  timeoutScheduler?: TimeoutScheduler;
}

export function registerRematchRoutes(app: FastifyInstance, options: RematchRoutesOptions): void {
  const { service, prisma } = options;

  const requireParticipant = async (matchId: string, userId: string): Promise<boolean> => {
    const participant = await prisma.matchParticipant.findFirst({ where: { matchId, userId }, select: { id: true } });
    return participant !== null;
  };

  const rejectNotParticipant = (reply: { code: (status: number) => { send: (body: unknown) => void } }) =>
    reply.code(403).send({ code: 'NOT_A_MATCH_PARTICIPANT', message: 'you are not a participant in this match' });

  const reject = (reply: { code: (status: number) => { send: (body: unknown) => void } }, status: number, code: string, message: string) =>
    reply.code(status).send({ code, message });

  /** Loads a proposal row; rejects with the matching rematch code when absent. */
  const loadProposal = async (matchId: string) => {
    const row = await prisma.match.findUnique({ where: { id: matchId }, include: { participants: true } });
    if (!row || row.rematchFromMatchId === null || row.rematchOpponentUserId === null) {
      return { row: null, reason: 'REMATCH_NOT_FOUND' as const };
    }
    return { row, reason: null };
  };

  // -- propose ---------------------------------------------------------------

  /** POST /v1/matches/:matchId/rematch — propose (terminal, FRIEND_LIVE, participant). */
  app.post<{ Params: { matchId: string } }>(
    '/v1/matches/:matchId/rematch',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { matchId } = request.params;
      const parsed = walkAwayRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });
      if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);

      const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: { participants: true } });
      if (row.mode !== 'FRIEND_LIVE') {
        return reject(reply, 409, 'REMATCH_NOT_AVAILABLE', 'rematch is only available for friend matches');
      }
      if (row.participants.length !== 2) {
        return reject(reply, 409, 'REMATCH_NOT_AVAILABLE', 'rematch is available for completed two-player matches');
      }
      const snapshot = await service.loadSnapshot(matchId);
      if (!snapshot || snapshot.state.economy === null) {
        return reject(reply, 409, 'REMATCH_NOT_AVAILABLE', 'rematch is available after the result');
      }

      const me = row.participants.find((p) => p.userId === request.userId)!;
      const opponent = row.participants.find((p) => p.userId !== request.userId)!;
      // PDR-3: same scenario, same roles — only the RV is freshly drawn.
      const assignment = assignFixedRole({ scenarioId: row.scenarioId, scenarioVersion: row.scenarioVersion }, me.role);

      const created = await service.createRematchProposal({
        matchId: randomUUID(),
        sourceMatchId: matchId,
        scenarioId: row.scenarioId,
        scenarioVersion: row.scenarioVersion,
        gameRulesVersion: options.gameRulesVersion,
        economyConfigVersion: options.economyConfigVersion,
        proposer: { userId: me.userId, role: me.role, reservationValueTenths: assignment.reservationValueTenths },
        opponentUserId: opponent.userId,
        createdAt: Date.now(),
      });
      if (!created.ok) {
        return reject(reply, created.code === 'REMATCH_NOT_FOUND' ? 404 : 409, created.code, created.message);
      }

      const scenarioRow = await prisma.scenario.findFirst({ where: { id: row.scenarioId, version: row.scenarioVersion } });
      return reply.code(201).send({
        matchId: created.matchId,
        role: me.role,
        reservationValueTenths: assignment.reservationValueTenths,
        scenario: scenarioRow ? scenarioForRole(scenarioRow, me.role) : null,
      });
    },
  );

  // -- accept / decline / cancel ----------------------------------------------

  /** POST /v1/matches/:matchId/rematch/accept — fixed opponent only → new ACTIVE match. */
  app.post<{ Params: { matchId: string } }>(
    '/v1/matches/:matchId/rematch/accept',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { matchId } = request.params;
      const parsed = walkAwayRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });

      const { row, reason } = await loadProposal(matchId);
      if (!row) return reject(reply, 404, reason, 'rematch proposal not found');
      if (row.status !== 'CREATED' || row.participants.length !== 1) {
        return reject(reply, 409, 'REMATCH_NOT_OPEN', 'rematch proposal is no longer open');
      }
      if (row.rematchOpponentUserId !== request.userId) {
        return reject(reply, 403, 'REMATCH_FORBIDDEN', 'only the fixed opponent may accept this rematch');
      }

      const proposer = row.participants[0]!;
      const joinerRole = proposer.role === 'BUYER' ? 'SELLER' : 'BUYER';
      const assignment = assignFixedRole({ scenarioId: row.scenarioId, scenarioVersion: row.scenarioVersion }, joinerRole);

      const accepted = await service.acceptRematch({
        matchId,
        joiner: { userId: request.userId!, role: joinerRole, reservationValueTenths: assignment.reservationValueTenths },
        firstPlayerId: pickFirstPlayer(proposer.userId, request.userId!),
        now: Date.now(),
      });
      if (!accepted.ok) {
        const status = accepted.code === 'REMATCH_NOT_FOUND' ? 404 : accepted.code === 'REMATCH_FORBIDDEN' ? 403 : 409;
        return reject(reply, status, accepted.code, accepted.message);
      }

      void options.timeoutScheduler?.refresh(matchId); // the new match is ACTIVE — arm the deadline (GR-023)
      return {
        matchId,
        role: joinerRole,
        reservationValueTenths: assignment.reservationValueTenths,
        status: accepted.state.status,
      };
    },
  );

  /** POST /v1/matches/:matchId/rematch/decline — the fixed opponent rejects; the proposal is removed. */
  app.post<{ Params: { matchId: string } }>(
    '/v1/matches/:matchId/rematch/decline',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { matchId } = request.params;
      const parsed = walkAwayRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });

      const { row, reason } = await loadProposal(matchId);
      if (!row) return reject(reply, 404, reason, 'rematch proposal not found');
      if (row.rematchOpponentUserId !== request.userId) {
        return reject(reply, 403, 'REMATCH_FORBIDDEN', 'only the fixed opponent may decline this rematch');
      }
      const removed = await service.deleteRematchProposal({ matchId, userId: request.userId!, role: 'OPPONENT' });
      if (!removed.ok) {
        const status = removed.code === 'REMATCH_NOT_FOUND' ? 404 : removed.code === 'REMATCH_FORBIDDEN' ? 403 : 409;
        return reject(reply, status, removed.code, removed.message);
      }
      return { declined: true };
    },
  );

  /** POST /v1/matches/:matchId/rematch/cancel — the proposer retracts their proposal. */
  app.post<{ Params: { matchId: string } }>(
    '/v1/matches/:matchId/rematch/cancel',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { matchId } = request.params;
      const parsed = walkAwayRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });

      const { row, reason } = await loadProposal(matchId);
      if (!row) return reject(reply, 404, reason, 'rematch proposal not found');
      const proposerId = row.participants[0]?.userId;
      if (proposerId !== request.userId) {
        return reject(reply, 403, 'REMATCH_FORBIDDEN', 'only the proposer may cancel this rematch');
      }
      const removed = await service.deleteRematchProposal({ matchId, userId: request.userId!, role: 'PROPOSER' });
      if (!removed.ok) {
        const status = removed.code === 'REMATCH_NOT_FOUND' ? 404 : removed.code === 'REMATCH_FORBIDDEN' ? 403 : 409;
        return reject(reply, status, removed.code, removed.message);
      }
      return { cancelled: true };
    },
  );

  /**
   * GET /v1/me/rematch-letters — BB-239 (SH4 frame 16): the open rematch
   * proposals addressed to the caller, as The Bay letters. Read-only;
   * the caller is the fixed opponent of each CREATED proposal row.
   */
  app.get('/v1/me/rematch-letters', async (request, _reply) => {
    const rows = await prisma.match.findMany({
      where: { rematchOpponentUserId: request.userId!, status: 'CREATED' },
      orderBy: { createdAt: 'asc' },
      include: { participants: { include: { user: { select: { handle: true } } } } },
    });
    const titles = new Map<string, string>();
    const scenarioKeys = rows.map((row) => ({ id: row.scenarioId, version: row.scenarioVersion }));
    const scenarios = await prisma.scenario.findMany({ where: { OR: scenarioKeys }, select: { id: true, version: true, title: true } });
    for (const scenario of scenarios) titles.set(`${scenario.id}:${scenario.version}`, scenario.title);

    return {
      letters: rows.map((row) => ({
        proposalMatchId: row.id,
        sourceMatchId: row.rematchFromMatchId,
        fromHandle: row.participants[0]?.user.handle ?? null,
        scenarioTitle: titles.get(`${row.scenarioId}:${row.scenarioVersion}`) ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

  // -- pending-proposal query (the BB-219b in-session prompt) -----------------

  /** GET /v1/matches/:matchId/rematch — open proposals attached to this source match. */
  app.get<{ Params: { matchId: string } }>('/v1/matches/:matchId/rematch', async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);

    const [incoming, outgoing] = await Promise.all([
      prisma.match.findFirst({
        where: { rematchFromMatchId: matchId, rematchOpponentUserId: request.userId, status: 'CREATED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true },
      }),
      prisma.match.findFirst({
        where: { rematchFromMatchId: matchId, status: 'CREATED', participants: { some: { userId: request.userId } } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true },
      }),
    ]);

    return {
      incoming: incoming ? { matchId: incoming.id, createdAt: incoming.createdAt.toISOString() } : null,
      outgoing: outgoing ? { matchId: outgoing.id, createdAt: outgoing.createdAt.toISOString() } : null,
    };
  });
}
