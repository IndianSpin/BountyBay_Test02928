/**
 * Match routes (08_API_CONTRACTS.md). Critical mutations go over HTTP; every
 * success broadcasts committed events/state through the realtime layer.
 * Error codes are the domain codes mapped to HTTP statuses; responses follow
 * the documented shapes (amounts as integer tenths, commandId idempotency).
 */

import type { MatchCommandService, PrismaClient } from '@bounty-bay/db';
import { commandIdSchema, offerRequestSchema, acceptRequestSchema, walkAwayRequestSchema, messageRequestSchema } from '@bounty-bay/contracts';
import type { DomainErrorCode } from '@bounty-bay/domain';
import { viewMatchFor } from '@bounty-bay/domain';
import { personaByKey } from '@bounty-bay/ai';
import {
  curateReview,
  GAME_REVIEW_VERSION,
  REVIEW_CURATION_VERSION,
  buildTimeline,
  type BehaviorFeatures,
  type MatchObservation,
} from '@bounty-bay/intelligence';
import type { FastifyInstance } from 'fastify';
import type { MatchBroadcaster } from './realtime';
import type { AiTurnEngine } from './ai/engine';
import type { TimeoutScheduler } from './timeout-scheduler';
import { matchCompletedFields, tierEntriesFor, type AnalyticsEmitter } from './analytics';
import { assignCreatorRole, assignJoinerRole, pickFirstPlayer } from './match-assignment';
import { randomUUID } from 'node:crypto';

const HTTP_STATUS: Record<string, number> = {
  MATCH_NOT_ACTIVE: 409,
  NOT_YOUR_TURN: 409,
  COMMAND_ALREADY_PROCESSED: 409,
  OFFER_NOT_CURRENT: 409,
  OFFER_NOT_ACCEPTABLE_BY_RESERVATION: 400,
  INVALID_AMOUNT: 400,
  AMOUNT_OUT_OF_RANGE: 400,
  OUTSIDE_RESERVATION_VALUE: 400,
  NON_MONOTONIC_CONCESSION: 400,
  DUPLICATE_OFFER: 400,
  INSUFFICIENT_CONCESSION_CHIPS: 400,
  TIMED_OUT: 409,
  TIMEOUT_NOT_DUE: 409,
  INVALID_MATCH_INPUT: 400,
  MESSAGE_EMPTY: 400,
};

export interface MatchRoutesOptions {
  service: MatchCommandService;
  prisma: PrismaClient;
  broadcast: MatchBroadcaster;
  gameRulesVersion: string;
  economyConfigVersion: string;
  /** DEC-025: lazily schedules AI practice turns after commands and snapshots. */
  aiEngine?: AiTurnEngine;
  /** DD Phase 1 (GR-023/GR-024): re-arms the hard decision-time deadline. */
  timeoutScheduler?: TimeoutScheduler;
  /** DD Phase 1: structured-log analytics (docs/11). */
  analytics?: AnalyticsEmitter;
}

export function statusFor(code: DomainErrorCode): number {
  return HTTP_STATUS[code] ?? 400;
}

/** Fields of the Scenario row that scenario decoration reads (DD-M2). */
export interface ScenarioContentRow {
  id: string;
  version: number;
  title: string;
  description: string;
  buyerBatnaNarrative: string;
  sellerBatnaNarrative: string;
  sharedContext: string | null;
  buyerPrivateContext: string | null;
  sellerPrivateContext: string | null;
  buyerPrivateFacts: unknown;
  sellerPrivateFacts: unknown;
}

/**
 * DD-M2 (GR-028): role-scoped scenario view — the viewer's own private
 * context and facts only. The opponent's dossier is never serialized to
 * any participant payload, with the same severity as the reservation
 * value (SI-001). `myNarrative` remains the legacy BATNA narrative.
 */
export function scenarioForRole(scenario: ScenarioContentRow, role: 'BUYER' | 'SELLER'): Record<string, unknown> {
  return {
    id: scenario.id,
    version: scenario.version,
    title: scenario.title,
    description: scenario.description,
    myNarrative: role === 'BUYER' ? scenario.buyerBatnaNarrative : scenario.sellerBatnaNarrative,
    sharedContext: scenario.sharedContext ?? null,
    myPrivateContext: role === 'BUYER' ? scenario.buyerPrivateContext : scenario.sellerPrivateContext,
    myPrivateFacts: (role === 'BUYER' ? scenario.buyerPrivateFacts : scenario.sellerPrivateFacts) ?? [],
  };
}

export function registerMatchRoutes(app: FastifyInstance, options: MatchRoutesOptions): void {
  const { service, prisma, broadcast } = options;

  const requireParticipant = async (matchId: string, userId: string): Promise<boolean> => {
    const participant = await prisma.matchParticipant.findFirst({ where: { matchId, userId }, select: { id: true } });
    return participant !== null;
  };

  const rejectNotParticipant = (reply: { code: (status: number) => { send: (body: unknown) => void } }) =>
    reply.code(403).send({ code: 'NOT_A_MATCH_PARTICIPANT', message: 'you are not a participant in this match' });

  /**
   * DEC-025: the AI opponents in this match (empty for human matches).
   * Bots are identified by the is_bot flag, never by the persona handle.
   */
  const aiOpponentsFor = async (matchId: string, viewerId: string) => {
    const row = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { aiPersonaKey: true, participants: { select: { userId: true } } },
    });
    if (!row.aiPersonaKey) return [];
    const persona = personaByKey(row.aiPersonaKey);
    if (!persona) return [];
    const bots = await prisma.user.findMany({ where: { isBot: true }, select: { id: true } });
    const botIds = new Set(bots.map((b) => b.id));
    return row.participants
      .filter((p) => p.userId !== viewerId && botIds.has(p.userId))
      .map((p) => ({ playerId: p.userId, personaKey: row.aiPersonaKey, displayName: persona.displayName }));
  };

  /** Commits a command through the service and broadcasts committed events. */
  const commitAndBroadcast = async (matchId: string, command: Parameters<MatchCommandService['offer']>[0] | Parameters<MatchCommandService['accept']>[0] | Parameters<MatchCommandService['ready']>[0] | Parameters<MatchCommandService['walkAway']>[0] | Parameters<MatchCommandService['message']>[0]) => {
    let outcome;
    switch (command.kind) {
      case 'OFFER': outcome = await service.offer(command); break;
      case 'ACCEPT': outcome = await service.accept(command); break;
      case 'READY': outcome = await service.ready(command); break;
      case 'WALK_AWAY': outcome = await service.walkAway(command); break;
      case 'MESSAGE': outcome = await service.message(command); break;
      default: outcome = { ok: false as const, code: 'INVALID_MATCH_INPUT' as const, message: 'unknown command' };
    }
    if (!outcome.ok) return { outcome };
    const snapshot = await service.loadSnapshot(matchId);
    broadcast(matchId, outcome.events, snapshot);
    void options.aiEngine?.maybeSchedule(matchId); // the human move may hand the turn to an AI opponent
    void options.timeoutScheduler?.refresh(matchId); // the turn transfer re-arms the deadline (GR-023)
    if (snapshot) {
      const serverNow = Date.now();
      if (outcome.events.some((e) => e.type === 'MATCH_COMPLETED')) {
        options.analytics?.emit('match_completed', matchCompletedFields(snapshot.state));
      }
      for (const entry of tierEntriesFor(snapshot.state, snapshot.config, serverNow)) {
        options.analytics?.emit('time_tier_entered', entry);
      }
    }
    return { outcome, snapshot };
  };

  // -- challenge lifecycle ---------------------------------------------------

  /** POST /v1/challenges — creates an unrated friend challenge (UF-04). */
  app.post('/v1/challenges', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = walkAwayRequestSchema.safeParse(request.body); // { commandId }
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });

    const scenario = await prisma.scenario.findFirst({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } });
    if (!scenario) return reply.code(503).send({ code: 'NO_SCENARIO_AVAILABLE', message: 'no published scenario exists' });

    const assignment = assignCreatorRole({ scenarioId: scenario.id, scenarioVersion: scenario.version });
    const matchId = randomUUID();
    const token = randomUUID();

    const created = await service.createChallenge({
      matchId,
      mode: 'FRIEND_LIVE',
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      gameRulesVersion: options.gameRulesVersion,
      economyConfigVersion: options.economyConfigVersion,
      ratingVersion: null, // friend challenges are unrated in v0.1 (DEC-021)
      creator: { userId: request.userId!, role: assignment.role, reservationValueTenths: assignment.reservationValueTenths },
      inviteToken: token,
      createdAt: Date.now(),
    });
    if (!created.ok) return reply.code(statusFor(created.code)).send(created);

    return reply.code(201).send({
      matchId,
      token,
      role: assignment.role,
      reservationValueTenths: assignment.reservationValueTenths,
      scenario: scenarioForRole(scenario, assignment.role),
    });
  });

  /** POST /v1/challenges/:token/join — joins if valid and available (08). */
  app.post<{ Params: { token: string } }>('/v1/challenges/:token/join', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = walkAwayRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });

    const row = await prisma.match.findUnique({ where: { inviteToken: request.params.token }, include: { participants: true } });
    if (!row) return reply.code(404).send({ code: 'CHALLENGE_NOT_FOUND', message: 'no challenge with that token' });
    if (row.participants[0]?.userId === request.userId) {
      return reply.code(400).send({ code: 'CANNOT_JOIN_OWN_CHALLENGE', message: 'you cannot join your own challenge' });
    }

    const creator = row.participants[0]!;
    const assignment = assignJoinerRole({ scenarioId: row.scenarioId, scenarioVersion: row.scenarioVersion }, creator.role);
    const joined = await service.joinChallenge({
      matchId: row.id,
      joiner: { userId: request.userId!, role: assignment.role, reservationValueTenths: assignment.reservationValueTenths },
      firstPlayerId: pickFirstPlayer(creator.userId, request.userId!),
    });
    if (!joined.ok) return reply.code(statusFor(joined.code)).send(joined);

    return {
      matchId: row.id,
      role: assignment.role,
      reservationValueTenths: assignment.reservationValueTenths,
    };
  });

  // -- match queries ---------------------------------------------------------

  /** GET /v1/matches/:matchId — role-scoped snapshot (08: never the opponent RV). */
  app.get<{ Params: { matchId: string } }>('/v1/matches/:matchId', async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);

    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: { participants: true } });
    const snapshot = await service.loadSnapshot(matchId);

    // Public identity: participant handles decorate the view (the domain is
    // identity-free by design; the user service owns handles).
    const handles: Record<string, string> = {};
    for (const participant of row.participants) {
      const user = await prisma.user.findUnique({ where: { id: participant.userId }, select: { handle: true } });
      if (user) handles[participant.userId] = user.handle;
    }

    // Scenario content (08, DEC-024 follow-up, DD-M2 GR-028): title/
    // description and sharedContext are shared; the viewer's OWN BATNA
    // narrative, private context, and private facts are included; the
    // opponent's narrative and dossier are NEVER serialized to any
    // participant payload (RV-grade scoping, SI-001).
    const scenarioRow = await prisma.scenario.findFirst({ where: { id: row.scenarioId, version: row.scenarioVersion } });
    const me = row.participants.find((p) => p.userId === request.userId)!;
    const scenario = scenarioRow ? scenarioForRole(scenarioRow, me.role) : null;

    if (!snapshot) {
      // Pre-join challenge: the domain match does not exist yet.
      return {
        matchId,
        status: 'WAITING_FOR_OPPONENT',
        mode: row.mode,
        role: me.role,
        reservationValueTenths: Number(me.reservationValueTenths),
        inviteToken: row.inviteToken,
        timeoutPlayerId: null,
        scenario,
      };
    }

    const serverNow = Date.now();
    void options.aiEngine?.maybeSchedule(matchId); // lazy: resume an AI turn that survives a restart
    void options.timeoutScheduler?.refresh(matchId); // lazy: re-arm the deadline after a restart
    return {
      matchId,
      view: viewMatchFor(snapshot.state, request.userId!, serverNow, snapshot.config),
      economyConfig: snapshot.config,
      handles,
      scenario,
      aiOpponents: await aiOpponentsFor(matchId, request.userId!),
      serverNow,
      timeoutPlayerId: row.timeoutPlayerId ?? null,
    };
  });

  /** GET /v1/matches/:matchId/result — full reveal after completion (GR-018). */
  app.get<{ Params: { matchId: string } }>('/v1/matches/:matchId/result', async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const snapshot = await service.loadSnapshot(matchId);
    if (!snapshot) return reply.code(409).send({ code: 'MATCH_NOT_ACTIVE', message: 'match has not started' });
    if (snapshot.state.economy === null) {
      return reply.code(409).send({ code: 'MATCH_NOT_ACTIVE', message: 'match has not completed' });
    }
    const handles: Record<string, string> = {};
    for (const participant of snapshot.state.participants) {
      const user = await prisma.user.findUnique({ where: { id: participant.playerId }, select: { handle: true } });
      if (user) handles[participant.playerId] = user.handle;
    }
    // Scenario content with the same scoping rule as the snapshot: only the
    // viewer's own BATNA narrative, private context, and private facts are
    // ever serialized (DD-M2 GR-028).
    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: { participants: true } });
    const meRow = row.participants.find((p) => p.userId === request.userId)!;
    const scenarioRow = await prisma.scenario.findFirst({ where: { id: row.scenarioId, version: row.scenarioVersion } });
    const scenario = scenarioRow ? scenarioForRole(scenarioRow, meRow.role) : null;
    const serverNow = Date.now();
    return {
      view: viewMatchFor(snapshot.state, request.userId!, serverNow, snapshot.config),
      economyConfig: snapshot.config,
      handles,
      scenario,
      aiOpponents: await aiOpponentsFor(matchId, request.userId!),
      serverNow,
      timeoutPlayerId: row.timeoutPlayerId ?? null,
    };
  });

  /**
   * GET /v1/matches/:matchId/review — deterministic post-match analysis
   * (DEC-028, IN-1/IN-2; docs/08). Participant-only, terminal-only, and
   * role-scoped: only the caller's own features and observations are ever
   * serialized — the opponent's behavior is their private data. The
   * timeline is the shared public event stream (both participants see the
   * same steps); message content is never loaded (docs/18 §14).
   */
  app.get<{ Params: { matchId: string } }>('/v1/matches/:matchId/review', async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const snapshot = await service.loadSnapshot(matchId);
    if (!snapshot || snapshot.state.economy === null) {
      return reply.code(409).send({ code: 'MATCH_NOT_ACTIVE', message: 'analysis is available after the match completes' });
    }
    const analysis = await service.loadAnalysis(matchId, request.userId!);
    if (!analysis) {
      return reply.code(409).send({ code: 'MATCH_NOT_ACTIVE', message: 'analysis has not been computed' });
    }
    // IN-2: deterministic moment curation over the stored rows. The casts
    // are safe: rows were written by the same engine versions the loader
    // reads back (feature-engine-0.1.0 / observation-engine-0.1.0).
    const moments = curateReview(
      analysis.features as unknown as BehaviorFeatures,
      analysis.observations as unknown as MatchObservation[],
    );
    // W1-03 (D-11): the server-built shared timeline rides the same
    // versioned envelope as buildGameReview (game-review-0.1.0). Derived
    // from the authoritative event stream — no second source of truth.
    const events = await service.listEvents(matchId);
    const timeline = buildTimeline(snapshot.state, events);
    return {
      matchId,
      version: GAME_REVIEW_VERSION,
      featureVersion: analysis.version,
      observationVersion: analysis.observationVersion,
      curationVersion: REVIEW_CURATION_VERSION,
      player: {
        playerId: request.userId!,
        features: analysis.features,
        observations: analysis.observations,
        moments,
      },
      outcome: (analysis.features as unknown as BehaviorFeatures).outcome,
      timeline,
    };
  });

  /** GET /v1/matches/:matchId/events?afterSequence=N — replay/reconnect (08). */
  app.get<{ Params: { matchId: string }; Querystring: { afterSequence?: string } }>('/v1/matches/:matchId/events', async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const after = Number(request.query.afterSequence ?? 0);
    if (!Number.isFinite(after) || after < 0) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'afterSequence must be a non-negative number' });
    return { events: await service.listEvents(matchId, after) };
  });

  // -- match commands ---------------------------------------------------------

  /** POST /v1/matches/:matchId/ready */
  app.post<{ Params: { matchId: string } }>('/v1/matches/:matchId/ready', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const parsed = walkAwayRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });
    const { outcome } = await commitAndBroadcast(matchId, { kind: 'READY', matchId, playerId: request.userId!, commandId: parsed.data.commandId, now: Date.now() });
    if (!outcome.ok) return reply.code(statusFor(outcome.code)).send(outcome);
    return { eventSequence: outcome.state.eventSequence, serverTimestamp: Date.now() };
  });

  /** POST /v1/matches/:matchId/offers — 08 success shape. */
  app.post<{ Params: { matchId: string } }>('/v1/matches/:matchId/offers', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const parsed = offerRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'invalid offer request' });
    const { outcome } = await commitAndBroadcast(matchId, {
      kind: 'OFFER',
      matchId,
      playerId: request.userId!,
      offerId: randomUUID(),
      amountTenths: parsed.data.amountTenths,
      commandId: parsed.data.commandId,
      now: Date.now(),
    });
    if (!outcome.ok) return reply.code(statusFor(outcome.code)).send(outcome);

    const offerEvent = outcome.events.find((e) => e.type === 'OFFER_SUBMITTED')!;
    const me = outcome.state.participants.find((p) => p.playerId === request.userId)!;
    return {
      eventSequence: outcome.state.eventSequence,
      offerId: offerEvent.payload.offerId,
      amountTenths: parsed.data.amountTenths,
      concessionCostChips: offerEvent.payload.concessionCostChips,
      remainingConcessionChips: me.initialChipBudget - me.chipsSpent,
      nextActivePlayerId: outcome.state.activePlayerId,
      serverTimestamp: Date.now(),
    };
  });

  /** POST /v1/matches/:matchId/accept — atomically completes the match (GR-010). */
  app.post<{ Params: { matchId: string } }>('/v1/matches/:matchId/accept', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const parsed = acceptRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'invalid accept request' });
    const { outcome } = await commitAndBroadcast(matchId, {
      kind: 'ACCEPT',
      matchId,
      playerId: request.userId!,
      offerId: parsed.data.offerId,
      commandId: parsed.data.commandId,
      now: Date.now(),
    });
    if (!outcome.ok) return reply.code(statusFor(outcome.code)).send(outcome);
    return { eventSequence: outcome.state.eventSequence, settlementTenths: outcome.state.settlementTenths, serverTimestamp: Date.now() };
  });

  /** POST /v1/matches/:matchId/walk-away — no deal, idempotent (GR-012). */
  app.post<{ Params: { matchId: string } }>('/v1/matches/:matchId/walk-away', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const parsed = walkAwayRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId is required' });
    const { outcome } = await commitAndBroadcast(matchId, { kind: 'WALK_AWAY', matchId, playerId: request.userId!, commandId: parsed.data.commandId, now: Date.now() });
    if (!outcome.ok) return reply.code(statusFor(outcome.code)).send(outcome);
    return { eventSequence: outcome.state.eventSequence, serverTimestamp: Date.now() };
  });

  /** POST /v1/matches/:matchId/messages — chat; no turn/clock effect (GR-013). */
  app.post<{ Params: { matchId: string } }>('/v1/matches/:matchId/messages', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { matchId } = request.params;
    if (!(await requireParticipant(matchId, request.userId!))) return rejectNotParticipant(reply);
    const parsed = messageRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'invalid message request' });
    const { outcome } = await commitAndBroadcast(matchId, {
      kind: 'MESSAGE',
      matchId,
      playerId: request.userId!,
      messageId: randomUUID(),
      body: parsed.data.body,
      commandId: parsed.data.commandId,
      now: Date.now(),
    });
    if (!outcome.ok) return reply.code(statusFor(outcome.code)).send(outcome);
    return { eventSequence: outcome.state.eventSequence, serverTimestamp: Date.now() };
  });
}

// Re-exported for consumers who validate command ids directly.
export { commandIdSchema };
