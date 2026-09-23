/**
 * Match command service (06_ARCHITECTURE.md §6 authoritative command
 * transaction; SI-003/SI-004).
 *
 * Every mutation runs the documented transaction:
 *
 *   1. lock the match row (SELECT … FOR UPDATE) — serializes commands;
 *   2. reject already-processed commandIds (SI-004 idempotency);
 *   3. load the stored snapshot { state, config };
 *   4. validate with the pure domain package;
 *   5. append domain events, update the snapshot and normalized rows;
 *   6. commit.
 *
 * Nothing in here reimplements game rules — the domain package remains the
 * single authority. Timestamps come from the caller (server clock), never
 * from client claims or database defaults.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import { validateEconomyConfig } from '@bounty-bay/config';
import { analyzeMatch } from '@bounty-bay/intelligence';
import {
  applyCommand,
  createMatch as createMatchDomain,
  type CreateMatchInput,
  type DomainCommand,
  type DomainErrorCode,
  type DomainEvent,
  type DomainResult,
  type MatchState,
  type ParticipantState,
} from '@bounty-bay/domain';
import { Prisma, type PrismaClient } from './generated/prisma/client';
import { decodeSnapshot, encodeSnapshot, type StoredSnapshot } from './snapshot';

export type CommandOutcome = DomainResult;

/** Challenge lifecycle (08: POST /v1/challenges → /:token/join). */
export interface ChallengeCreatorInput {
  matchId: string;
  mode: 'FRIEND_LIVE';
  scenarioId: string;
  scenarioVersion: number;
  gameRulesVersion: string;
  economyConfigVersion: string;
  ratingVersion: string | null;
  creator: { userId: string; role: 'BUYER' | 'SELLER'; reservationValueTenths: number };
  inviteToken: string;
  createdAt: number;
}

export interface ChallengeJoinInput {
  matchId: string;
  joiner: { userId: string; role: 'BUYER' | 'SELLER'; reservationValueTenths: number };
  firstPlayerId: string;
}

export interface CommandBase {
  matchId: string;
  playerId: string;
  /** Client-generated UUID for idempotent retries (08 API conventions). */
  commandId: string;
  /** Server-authoritative ms epoch (06 §5). */
  now: number;
}

export interface OfferCommand extends CommandBase {
  kind: 'OFFER';
  offerId: string;
  amountTenths: number;
}
export interface AcceptCommand extends CommandBase {
  kind: 'ACCEPT';
  offerId: string;
}
export interface SimpleCommand extends CommandBase {
  kind: 'READY' | 'WALK_AWAY' | 'DISCONNECT' | 'RECONNECT';
}
/** GR-024 (DD Phase 1): server-only timeout command (never a client route). */
export interface TimeoutCommand extends CommandBase {
  kind: 'TIMEOUT';
}
export interface MessageCommand extends CommandBase {
  kind: 'MESSAGE';
  messageId: string;
  body: string;
}
export interface AbortCommand {
  kind: 'ABORT';
  matchId: string;
  commandId: string;
  now: number;
}

export type MatchCommand = OfferCommand | AcceptCommand | SimpleCommand | TimeoutCommand | MessageCommand | AbortCommand;

export class MatchCommandService {
  constructor(private readonly prisma: PrismaClient) {}

  // -- creation ------------------------------------------------------------

  /**
   * Creates a persisted match. The scenario and balance config must exist;
   * the config version is recorded on the match and embedded in the snapshot
   * so results stay reproducible (06 §11, GE invariants).
   */
  async createMatch(
    input: CreateMatchInput,
    ai?: { aiPersonaKey?: string; aiPersonaVersion?: string },
  ): Promise<{ ok: true; state: MatchState } | { ok: false; code: DomainErrorCode; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const configRow = await tx.gameBalanceConfig.findUnique({ where: { version: input.economyConfigVersion } });
      if (!configRow) {
        return { ok: false as const, code: 'INVALID_MATCH_INPUT' as DomainErrorCode, message: `unknown economy config version: ${input.economyConfigVersion}` };
      }
      const config = economyConfigFromRow(configRow);
      const problems = validateEconomyConfig(config);
      if (problems.length > 0) {
        return { ok: false as const, code: 'INVALID_MATCH_INPUT' as DomainErrorCode, message: `stored config ${config.version} is invalid: ${problems.join('; ')}` };
      }

      const scenario = await tx.scenario.findFirst({ where: { id: input.scenarioId, version: input.scenarioVersion } });
      if (!scenario) {
        return { ok: false as const, code: 'INVALID_MATCH_INPUT' as DomainErrorCode, message: `unknown scenario ${input.scenarioId} v${input.scenarioVersion}` };
      }

      const created = createMatchDomain(input, config);
      if (!created.ok) return created;

      await tx.match.create({
        data: {
          id: input.matchId,
          mode: input.mode,
          status: created.state.status,
          scenarioId: input.scenarioId,
          scenarioVersion: input.scenarioVersion,
          gameRulesVersion: input.gameRulesVersion,
          economyConfigVersion: input.economyConfigVersion,
          ratingVersion: input.ratingVersion,
          aiPersonaKey: ai?.aiPersonaKey ?? null,
          aiPersonaVersion: ai?.aiPersonaVersion ?? null,
          domainState: encodeSnapshot({ state: created.state, config }),
          createdAt: new Date(input.createdAt),
          participants: {
            create: created.state.participants.map((p) => participantRowCreate(p)),
          },
        },
      });

      return { ok: true as const, state: created.state };
    });
  }

  // -- challenge lifecycle --------------------------------------------------

  /**
   * Creates a friend-challenge record: a Match row with one participant and
   * no domain state yet. The domain match materializes when the opponent
   * joins (the domain always models exactly two participants, GR-001).
   */
  async createChallenge(input: ChallengeCreatorInput): Promise<{ ok: true; matchId: string } | { ok: false; code: DomainErrorCode; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const configRow = await tx.gameBalanceConfig.findUnique({ where: { version: input.economyConfigVersion } });
      if (!configRow) return { ok: false as const, code: 'INVALID_MATCH_INPUT' as DomainErrorCode, message: `unknown economy config version: ${input.economyConfigVersion}` };
      const scenario = await tx.scenario.findFirst({ where: { id: input.scenarioId, version: input.scenarioVersion } });
      if (!scenario) return { ok: false as const, code: 'INVALID_MATCH_INPUT' as DomainErrorCode, message: 'unknown scenario' };

      await tx.match.create({
        data: {
          id: input.matchId,
          mode: input.mode,
          status: 'CREATED',
          scenarioId: input.scenarioId,
          scenarioVersion: input.scenarioVersion,
          gameRulesVersion: input.gameRulesVersion,
          economyConfigVersion: input.economyConfigVersion,
          ratingVersion: input.ratingVersion,
          inviteToken: input.inviteToken,
          createdAt: new Date(input.createdAt),
          participants: {
            create: {
              user: { connect: { id: input.creator.userId } },
              role: input.creator.role,
              reservationValueTenths: BigInt(input.creator.reservationValueTenths),
              initialChipBudget: configRow.concessionBudgetChips,
            },
          },
        },
      });
      return { ok: true as const, matchId: input.matchId };
    });
  }

  /**
   * Materializes the domain match when the opponent joins. Runs under the
   * match row lock: the challenge must still be joinable (CREATED, token
   * present, exactly one participant).
   */
  async joinChallenge(input: ChallengeJoinInput): Promise<DomainResult & { ok: true } | { ok: false; code: DomainErrorCode; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM matches WHERE id = ${input.matchId}::uuid FOR UPDATE`;
      if (locked.length === 0) return { ok: false as const, code: 'MATCH_NOT_ACTIVE' as DomainErrorCode, message: 'challenge not found' };

      const row = await tx.match.findUniqueOrThrow({ where: { id: input.matchId }, include: { participants: true } });
      if (row.status !== 'CREATED' || row.inviteToken === null) {
        return { ok: false as const, code: 'MATCH_NOT_ACTIVE' as DomainErrorCode, message: 'challenge is no longer joinable' };
      }
      if (row.participants.length !== 1) {
        return { ok: false as const, code: 'MATCH_NOT_ACTIVE' as DomainErrorCode, message: 'challenge already joined' };
      }
      const creator = row.participants[0]!;

      const configRow = await tx.gameBalanceConfig.findUniqueOrThrow({ where: { version: row.economyConfigVersion } });
      const config = economyConfigFromRow(configRow);

      const createInput: CreateMatchInput = {
        matchId: row.id,
        mode: row.mode,
        scenarioId: row.scenarioId,
        scenarioVersion: row.scenarioVersion,
        gameRulesVersion: row.gameRulesVersion,
        economyConfigVersion: row.economyConfigVersion,
        ratingVersion: row.ratingVersion,
        buyer:
          creator.role === 'BUYER'
            ? { playerId: creator.userId, role: 'BUYER', reservationValueTenths: Number(creator.reservationValueTenths) }
            : { playerId: input.joiner.userId, role: 'BUYER', reservationValueTenths: input.joiner.reservationValueTenths },
        seller:
          creator.role === 'SELLER'
            ? { playerId: creator.userId, role: 'SELLER', reservationValueTenths: Number(creator.reservationValueTenths) }
            : { playerId: input.joiner.userId, role: 'SELLER', reservationValueTenths: input.joiner.reservationValueTenths },
        firstPlayerId: input.firstPlayerId,
        createdAt: row.createdAt.getTime(),
      };

      const created = createMatchDomain(createInput, config);
      if (!created.ok) return created;

      await tx.match.update({
        where: { id: row.id },
        data: {
          domainState: encodeSnapshot({ state: created.state, config }),
          firstPlayerId: input.firstPlayerId,
          inviteToken: null, // single-use
        },
      });
      await tx.matchParticipant.create({
        data: {
          match: { connect: { id: row.id } },
          user: { connect: { id: input.joiner.userId } },
          role: input.joiner.role,
          reservationValueTenths: BigInt(input.joiner.reservationValueTenths),
          initialChipBudget: configRow.concessionBudgetChips,
        },
      });
      return { ok: true as const, state: created.state, events: [] };
    });
  }

  // -- commands -------------------------------------------------------------

  async ready(input: SimpleCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'READY', playerId: input.playerId, now: input.now }));
  }
  async offer(input: OfferCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({
      kind: 'OFFER',
      playerId: input.playerId,
      offerId: input.offerId,
      amountTenths: input.amountTenths,
      now: input.now,
    }));
  }
  async accept(input: AcceptCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'ACCEPT', playerId: input.playerId, offerId: input.offerId, now: input.now }));
  }
  async walkAway(input: SimpleCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'WALK_AWAY', playerId: input.playerId, now: input.now }));
  }
  async message(input: MessageCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({
      kind: 'MESSAGE',
      playerId: input.playerId,
      messageId: input.messageId,
      body: input.body,
      now: input.now,
    }));
  }
  async disconnect(input: SimpleCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'DISCONNECT', playerId: input.playerId, now: input.now }));
  }
  async reconnect(input: SimpleCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'RECONNECT', playerId: input.playerId, now: input.now }));
  }
  async abort(input: AbortCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'ABORT', now: input.now }));
  }
  /**
   * GR-024 (DD Phase 1): server-only — submitted by the timeout scheduler,
   * never exposed as a client route. The domain re-validates that the active
   * player's elapsed time actually reached the limit.
   */
  async timeout(input: TimeoutCommand): Promise<CommandOutcome> {
    return this.execute(input.matchId, input.commandId, () => ({ kind: 'TIMEOUT', playerId: input.playerId, now: input.now }));
  }

  // -- reads ----------------------------------------------------------------

  /** Authoritative snapshot for a match, or null when unknown. */
  async loadSnapshot(matchId: string): Promise<StoredSnapshot | null> {
    const row = await this.prisma.match.findUnique({ where: { id: matchId }, select: { domainState: true } });
    return row ? decodeSnapshot(row.domainState) : null;
  }

  /** Immutable event stream, optionally after a sequence (reconnect/replay). */
  async listEvents(matchId: string, afterSequence = 0): Promise<DomainEvent[]> {
    const rows = await this.prisma.matchEvent.findMany({
      where: { matchId, sequence: { gt: afterSequence } },
      orderBy: { sequence: 'asc' },
    });
    return rows.map((row) => ({
      sequence: Number(row.sequence),
      type: row.type as DomainEvent['type'],
      at: row.createdAt.getTime(),
      actorPlayerId: row.actorUserId,
      payload: row.payload as Record<string, unknown>,
    }));
  }

  /**
   * DEC-028 (IN-1): the stored behavior analysis for one participant of a
   * completed match (the caller's own row — role-scoping happens at the
   * API layer). Null when the match has no analysis (not terminal yet).
   */
  async loadAnalysis(matchId: string, playerId: string): Promise<StoredAnalysis | null> {
    const feature = await this.prisma.matchFeature.findUnique({
      where: { matchId_playerId: { matchId, playerId } },
    });
    if (!feature) return null;
    const observations = await this.prisma.matchObservation.findMany({
      where: { matchId, playerId },
      orderBy: { ordinal: 'asc' },
    });
    return {
      version: feature.version,
      observationVersion: observations[0]?.version ?? feature.version,
      features: feature.features as Record<string, unknown>,
      observations: observations.map((row) => ({
        type: row.type,
        version: row.version,
        magnitude: row.magnitude?.toNumber() ?? null,
        measurements: row.measurements as Record<string, unknown>,
        eventRefs: row.eventRefs as unknown,
        confidence: 'deterministic' as const,
        source: 'deterministic' as const,
      })),
    };
  }

  // -- internals -------------------------------------------------------------

  private async execute(
    matchId: string,
    commandId: string,
    build: () => DomainCommand,
  ): Promise<CommandOutcome> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the match row (SI-004): serializes concurrent commands.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM matches WHERE id = ${matchId}::uuid FOR UPDATE`;
      if (locked.length === 0) return { ok: false as const, code: 'MATCH_NOT_ACTIVE' as const, message: 'match not found' };

      // 2. Idempotency: exactly-once per client command (SI-004).
      const duplicate = await tx.matchEvent.findFirst({ where: { matchId, commandId }, select: { id: true } });
      if (duplicate) {
        return { ok: false as const, code: 'COMMAND_ALREADY_PROCESSED' as const, message: `command ${commandId} was already processed` };
      }

      // 3. Load the authoritative snapshot.
      const row = await tx.match.findUniqueOrThrow({ where: { id: matchId }, select: { domainState: true } });
      const snapshot = decodeSnapshot(row.domainState);
      if (!snapshot) return { ok: false as const, code: 'MATCH_NOT_ACTIVE' as const, message: 'match snapshot missing' };

      // 4. Pure domain validation.
      const result = applyCommand(snapshot.state, build(), snapshot.config);
      if (!result.ok) return result;

      // 5. Persist events + snapshot + normalized rows, atomically.
      await persistCommand(tx, {
        matchId,
        commandId,
        prevState: snapshot.state,
        state: result.state,
        events: result.events,
        config: snapshot.config,
      });

      return result;
    });
  }
}

/** Persists one command's committed events and the new snapshot. */
export async function persistCommand(
  tx: Prisma.TransactionClient,
  args: {
    matchId: string;
    commandId: string;
    prevState: MatchState;
    state: MatchState;
    events: DomainEvent[];
    config: EconomyConfig;
  },
): Promise<void> {
  const { matchId, commandId, state, events, config } = args;

  for (const event of events) {
    // The idempotency key rides on the command's first event only:
    // (match_id, command_id) is unique.
    await tx.matchEvent.create({
      data: {
        matchId,
        sequence: BigInt(event.sequence),
        type: event.type,
        actorUserId: event.actorPlayerId,
        commandId: event.sequence === events[0]!.sequence ? commandId : null,
        payload: event.payload as Prisma.InputJsonValue,
        createdAt: new Date(event.at),
      },
    });
    await persistEventRows(tx, { matchId, event, state });
  }

  await tx.match.update({
    where: { id: matchId },
    data: {
      status: state.status,
      firstPlayerId: state.firstPlayerId,
      activePlayerId: state.activePlayerId,
      settlementTenths: state.settlementTenths === null ? null : BigInt(state.settlementTenths),
      completionReason: state.completionReason,
      timeoutPlayerId: timeoutPlayerIdOf(events, state),
      eventSequence: BigInt(state.eventSequence),
      domainState: encodeSnapshot({ state, config }),
      startedAt: state.startedAt === null ? null : new Date(state.startedAt),
      completedAt: state.completedAt === null ? null : new Date(state.completedAt),
    },
  });

  for (const participant of state.participants) {
    await tx.matchParticipant.updateMany({
      where: { matchId, userId: participant.playerId },
      data: {
        chipsSpent: participant.chipsSpent,
        cumulativeActiveMs: BigInt(participant.cumulativeActiveMs),
        openingOfferTenths: participant.openingOfferTenths === null ? null : BigInt(participant.openingOfferTenths),
        latestOfferTenths: participant.latestOfferTenths === null ? null : BigInt(participant.latestOfferTenths),
      },
    });
  }

  // DEC-028 (IN-1): compute the deterministic behavior analysis at match
  // completion, atomically with the terminal state it describes. The
  // computation is pure (packages/intelligence) over the exact stored
  // event stream + snapshot + config.
  if (state.status === 'DEAL' || state.status === 'NO_DEAL' || state.status === 'ABORTED') {
    await persistAnalysis(tx, matchId, state, config);
  }
}

/** DEC-028 (IN-1): stored per-participant behavior analysis (docs/08 review contract). */
export interface StoredAnalysis {
  version: string;
  observationVersion: string;
  features: Record<string, unknown>;
  observations: {
    type: string;
    version: string;
    magnitude: number | null;
    measurements: Record<string, unknown>;
    eventRefs: unknown;
    confidence: 'deterministic';
    source: 'deterministic';
  }[];
}

/** DEC-028 (IN-1): computes and upserts feature + observation rows for a completed match. */
export async function persistAnalysis(
  tx: Prisma.TransactionClient | PrismaClient,
  matchId: string,
  state: MatchState,
  config: EconomyConfig,
): Promise<void> {
  const rows = await tx.matchEvent.findMany({ where: { matchId }, orderBy: { sequence: 'asc' } });
  const events: DomainEvent[] = rows.map((row) => ({
    sequence: Number(row.sequence),
    type: row.type as DomainEvent['type'],
    at: row.createdAt.getTime(),
    actorPlayerId: row.actorUserId,
    payload: row.payload as Record<string, unknown>,
  }));
  const analysis = analyzeMatch(state, events, config);

  for (const participant of state.participants) {
    const player = analysis.players[participant.playerId];
    if (!player) continue;
    await tx.matchFeature.upsert({
      where: { matchId_playerId: { matchId, playerId: participant.playerId } },
      create: {
        matchId,
        playerId: participant.playerId,
        version: analysis.version,
        features: player.features as unknown as Prisma.InputJsonValue,
      },
      update: {
        version: analysis.version,
        features: player.features as unknown as Prisma.InputJsonValue,
      },
    });
    // Observations are immutable computed rows: delete + reinsert keeps a
    // re-computation (never happens for a given version) idempotent.
    await tx.matchObservation.deleteMany({ where: { matchId, playerId: participant.playerId } });
    let ordinal = 0;
    for (const observation of player.observations) {
      await tx.matchObservation.create({
        data: {
          matchId,
          playerId: participant.playerId,
          version: observation.version,
          ordinal,
          type: observation.type,
          magnitude: observation.magnitude ?? null,
          measurements: observation.measurements as unknown as Prisma.InputJsonValue,
          eventRefs: observation.eventRefs as unknown as Prisma.InputJsonValue,
        },
      });
      ordinal += 1;
    }
  }
}

/** GR-024 (DD Phase 1): the timed-out player, from the committed TIMED_OUT event. */
function timeoutPlayerIdOf(events: DomainEvent[], state: MatchState): string | null {
  if (state.completionReason !== 'TIMED_OUT') return null;
  const timedOut = events.find((event) => event.type === 'TIMED_OUT');
  if (!timedOut) return null;
  const fromPayload = timedOut.payload.timedOutPlayerId;
  return typeof fromPayload === 'string' ? fromPayload : timedOut.actorPlayerId;
}

async function persistEventRows(
  tx: Prisma.TransactionClient,
  args: { matchId: string; event: DomainEvent; state: MatchState },
): Promise<void> {
  const { matchId, event, state } = args;
  switch (event.type) {
    case 'OFFER_SUBMITTED': {
      await tx.offer.create({
        data: {
          matchId,
          eventSequence: BigInt(event.sequence),
          playerId: event.actorPlayerId!,
          amountTenths: BigInt(event.payload.amountTenths as number),
          isOpening: event.payload.isOpening === true,
          concessionMagnitude:
            event.payload.concessionMagnitude === null ? null : new Prisma.Decimal(event.payload.concessionMagnitude as number),
          concessionCostChips: event.payload.concessionCostChips as number,
          createdAt: new Date(event.at),
        },
      });
      break;
    }
    case 'MESSAGE_SENT': {
      await tx.chatMessage.create({
        data: {
          matchId,
          eventSequence: BigInt(event.sequence),
          playerId: event.actorPlayerId!,
          body: String(event.payload.body),
          createdAt: new Date(event.at),
        },
      });
      break;
    }
    case 'PLAYER_DISCONNECTED': {
      await tx.matchParticipant.updateMany({
        where: { matchId, userId: event.actorPlayerId! },
        data: { disconnectedAt: new Date(event.at) },
      });
      break;
    }
    case 'PLAYER_RECONNECTED': {
      await tx.matchParticipant.updateMany({
        where: { matchId, userId: event.actorPlayerId! },
        data: { disconnectedAt: null },
      });
      break;
    }
    case 'MATCH_COMPLETED': {
      const economy = state.economy;
      if (!economy) break;
      const buyer = state.participants.find((p) => p.role === 'BUYER')!;
      const seller = state.participants.find((p) => p.role === 'SELLER')!;
      await tx.matchResult.upsert({
        where: { matchId },
        create: matchResultData(matchId, economy, buyer, seller),
        update: {},
      });
      break;
    }
    default:
      break; // presence/state events are captured in the event stream itself
  }
}

function matchResultData(
  matchId: string,
  economy: NonNullable<MatchState['economy']>,
  buyer: ParticipantState,
  seller: ParticipantState,
): Prisma.MatchResultUncheckedCreateInput {
  return {
    matchId,
    zopaTenths: BigInt(economy.zopaTenths),
    buyerSurplusShare: economy.buyerSurplusShare === null ? null : new Prisma.Decimal(economy.buyerSurplusShare),
    sellerSurplusShare: economy.sellerSurplusShare === null ? null : new Prisma.Decimal(economy.sellerSurplusShare),
    buyerClockMultiplier: new Prisma.Decimal(economy.players[buyer.playerId]!.clockMultiplier),
    sellerClockMultiplier: new Prisma.Decimal(economy.players[seller.playerId]!.clockMultiplier),
    buyerGrossReward: new Prisma.Decimal(economy.players[buyer.playerId]!.grossReward),
    sellerGrossReward: new Prisma.Decimal(economy.players[seller.playerId]!.grossReward),
    buyerNetResult: new Prisma.Decimal(economy.players[buyer.playerId]!.netResult),
    sellerNetResult: new Prisma.Decimal(economy.players[seller.playerId]!.netResult),
    ratedEligible: economy.ratedEligible,
    calculatedAt: new Date(),
  };
}

/** Nested create: relations connect explicitly (Prisma 7 has no unchecked FKs in nested writes). */
function participantRowCreate(p: ParticipantState): Prisma.MatchParticipantCreateWithoutMatchInput {
  return {
    user: { connect: { id: p.playerId } },
    role: p.role,
    reservationValueTenths: BigInt(p.reservationValueTenths),
    initialChipBudget: p.initialChipBudget,
    chipsSpent: p.chipsSpent,
    cumulativeActiveMs: BigInt(p.cumulativeActiveMs),
    openingOfferTenths: null,
    latestOfferTenths: null,
    disconnectedAt: null,
  };
}

function economyConfigFromRow(row: {
  version: string;
  matchBountyChips: number;
  concessionBudgetChips: number;
  concessionK: Prisma.Decimal;
  concessionAlpha: Prisma.Decimal;
  clockFloorMultiplier: Prisma.Decimal;
  clockFloorMs: bigint;
  turnGraceMs: number;
  maxAmountTenths: bigint;
  hardDecisionTimeLimitMs: bigint | null;
  timeoutPolicy: string | null;
  timeWarningLowMs: number | null;
  timeWarningCriticalMs: number | null;
}): EconomyConfig {
  return {
    version: row.version,
    matchBountyChips: row.matchBountyChips,
    concessionBudgetChips: row.concessionBudgetChips,
    concessionK: row.concessionK.toNumber(),
    concessionAlpha: row.concessionAlpha.toNumber(),
    clockFloorMultiplier: row.clockFloorMultiplier.toNumber(),
    clockFloorMs: Number(row.clockFloorMs),
    turnGraceMs: row.turnGraceMs,
    maxAmountTenths: Number(row.maxAmountTenths),
    // GR-023 (DD Phase 1): null columns map to undefined → no limit
    // (legacy economy-0.1.0 rows replay with unchanged behavior).
    hardDecisionTimeLimitMs: row.hardDecisionTimeLimitMs === null ? undefined : Number(row.hardDecisionTimeLimitMs),
    timeoutPolicy: row.timeoutPolicy === null ? undefined : (row.timeoutPolicy as EconomyConfig['timeoutPolicy']),
    timeWarningLowMs: row.timeWarningLowMs === null ? undefined : row.timeWarningLowMs,
    timeWarningCriticalMs: row.timeWarningCriticalMs === null ? undefined : row.timeWarningCriticalMs,
  };
}
