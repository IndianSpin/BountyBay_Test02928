/**
 * Authoritative match state machine (GR-001..GR-022, GE-001..GE-010).
 *
 * Pure and deterministic: `applyCommand(prev, command, config)` produces
 * `{ nextState, events }` with no side effects, no clock reads, and no
 * randomness. The caller (API command service) supplies server-authoritative
 * timestamps, ids, and the first-mover selection; this package only
 * validates and commits.
 *
 * `structuredClone` keeps callers safe from aliasing: the previous state is
 * never mutated.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import { effectiveHardDecisionLimitMs } from '@bounty-bay/config';
import { isValidAmountTenths } from './amount';
import { concessionCostChips, concessionMagnitude } from './concession';
import { clockMultiplier, elapsedActiveMs } from './clock';
import { grossRewardChips, netResultChips, surplusShares } from './economy';
import type {
  CreateMatchInput,
  DomainCommand,
  DomainEvent,
  DomainEventType,
  DomainResult,
  MatchEconomy,
  MatchState,
  ParticipantState,
  PlayerId,
} from './types';
import { failure } from './types';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMatch(input: CreateMatchInput, config: EconomyConfig): DomainResult {
  const { buyer, seller } = input;

  if (buyer.playerId === seller.playerId) return failure('INVALID_MATCH_INPUT', 'players must be distinct');
  if (buyer.role !== 'BUYER' || seller.role !== 'SELLER')
    return failure('INVALID_MATCH_INPUT', 'participants must be one BUYER and one SELLER (GR-001)');
  for (const p of [buyer, seller]) {
    if (!isValidAmountTenths(p.reservationValueTenths, config.maxAmountTenths))
      return failure('INVALID_MATCH_INPUT', `invalid reservation value for ${p.playerId}`);
  }
  // GR-002 + 07_DATA_MODEL: ranked scenarios require a positive ZOPA.
  // Non-ranked matches may exist with zopa <= 0 (no settlement is then legal).
  if (input.mode === 'RANKED_LIVE' && buyer.reservationValueTenths - seller.reservationValueTenths <= 0)
    return failure('INVALID_MATCH_INPUT', 'ranked scenarios require buyer_max > seller_min (ZOPA > 0)');
  if (input.firstPlayerId !== buyer.playerId && input.firstPlayerId !== seller.playerId)
    return failure('INVALID_MATCH_INPUT', 'first mover must be a participant');
  if (!Number.isFinite(input.createdAt))
    return failure('INVALID_MATCH_INPUT', 'createdAt must be a finite timestamp');

  const participant = (p: typeof buyer | typeof seller): ParticipantState => ({
    playerId: p.playerId,
    role: p.role,
    reservationValueTenths: p.reservationValueTenths,
    initialChipBudget: config.concessionBudgetChips,
    chipsSpent: 0,
    cumulativeActiveMs: 0,
    openingOfferTenths: null,
    latestOfferTenths: null,
    standingOfferId: null,
    disconnected: false,
    ready: false,
  });

  const state: MatchState = {
    matchId: input.matchId,
    mode: input.mode,
    status: 'CREATED',
    scenarioId: input.scenarioId,
    scenarioVersion: input.scenarioVersion,
    gameRulesVersion: input.gameRulesVersion,
    economyConfigVersion: config.version,
    ratingVersion: input.ratingVersion,
    participants: [participant(buyer), participant(seller)],
    firstPlayerId: input.firstPlayerId,
    activePlayerId: null,
    turnStartedAt: null,
    eventSequence: 0,
    createdAt: input.createdAt,
    startedAt: null,
    completedAt: null,
    settlementTenths: null,
    completionReason: null,
    economy: null,
  };

  return { ok: true, state, events: [] };
}

// ---------------------------------------------------------------------------
// Command dispatcher
// ---------------------------------------------------------------------------

export function applyCommand(prev: MatchState, command: DomainCommand, config: EconomyConfig): DomainResult {
  const state = structuredClone(prev);

  // GR-023: once the active player's hard decision-time budget is exhausted
  // while ACTIVE, gameplay commands are rejected without mutating state.
  // Only the server-initiated TIMEOUT command (GR-024) advances the match.
  // Exempt: MESSAGE/DISCONNECT/RECONNECT (no gameplay effect; disconnect
  // freezes the clock), READY/ABORT (not ACTIVE play), TIMEOUT itself.
  if (isGameplayCommand(command) && state.status === 'ACTIVE' && state.activePlayerId !== null) {
    const limit = effectiveHardDecisionLimitMs(config);
    const active = findPlayer(state, state.activePlayerId);
    if (limit !== null && active && elapsedActiveMs(active, state, command.now) >= limit) {
      return failure('TIMED_OUT', 'hard decision-time budget exhausted (GR-023)');
    }
  }

  switch (command.kind) {
    case 'READY':
      return applyReady(w(state), command);
    case 'OFFER':
      return applyOffer(w(state), command, config);
    case 'ACCEPT':
      return applyAccept(w(state), command, config);
    case 'WALK_AWAY':
      return applyWalkAway(w(state), command, config);
    case 'MESSAGE':
      return applyMessage(w(state), command);
    case 'DISCONNECT':
      return applyDisconnect(w(state), command);
    case 'RECONNECT':
      return applyReconnect(w(state), command);
    case 'ABORT':
      return applyAbort(w(state), command, config);
    case 'TIMEOUT':
      return applyTimeout(w(state), command, config);
  }
}

function isGameplayCommand(command: DomainCommand): command is Extract<DomainCommand, { kind: 'OFFER' | 'ACCEPT' | 'WALK_AWAY' }> {
  return command.kind === 'OFFER' || command.kind === 'ACCEPT' || command.kind === 'WALK_AWAY';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Working {
  state: MatchState;
  events: DomainEvent[];
}

function w(state: MatchState): Working {
  return { state, events: [] };
}

function emit(working: Working, type: DomainEventType, at: number, actorPlayerId: PlayerId | null, payload: Record<string, unknown>): void {
  working.state.eventSequence += 1;
  working.events.push({ sequence: working.state.eventSequence, type, at, actorPlayerId, payload });
}

function done(working: Working): DomainResult {
  return { ok: true, state: working.state, events: working.events };
}

function findPlayer(state: MatchState, playerId: PlayerId): ParticipantState | undefined {
  return state.participants.find((p) => p.playerId === playerId);
}

function opponentOf(state: MatchState, playerId: PlayerId): ParticipantState {
  const other = state.participants.find((p) => p.playerId !== playerId);
  if (!other) throw new Error(`invariant violated: opponent of ${playerId} not found`);
  return other;
}

/** GR-014: freeze the running clock into cumulativeActiveMs. */
function freezeRunningClock(state: MatchState, now: number): void {
  const active = state.activePlayerId ? findPlayer(state, state.activePlayerId) : undefined;
  if (active && state.turnStartedAt !== null) {
    active.cumulativeActiveMs += Math.max(0, now - state.turnStartedAt);
  }
  state.turnStartedAt = null;
}

function isTerminal(status: MatchState['status']): boolean {
  return status === 'DEAL' || status === 'NO_DEAL' || status === 'ABORTED';
}

// ---------------------------------------------------------------------------
// READY / start (08: match starts when both ready and server state permits)
// ---------------------------------------------------------------------------

function applyReady(working: Working, command: { playerId: PlayerId; now: number }): DomainResult {
  const { state } = working;
  if (state.status !== 'CREATED' && state.status !== 'READY')
    return failure('MATCH_NOT_ACTIVE', 'match is not waiting for readiness');
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (player.ready) return done(working); // idempotent

  player.ready = true;
  state.status = 'READY';
  emit(working, 'PLAYER_READY', command.now, player.playerId, { playerId: player.playerId });

  const other = opponentOf(state, command.playerId);
  if (other.ready) {
    state.status = 'ACTIVE';
    state.startedAt = command.now;
    state.activePlayerId = state.firstPlayerId;
    state.turnStartedAt = command.now;
    emit(working, 'MATCH_STARTED', command.now, null, {
      firstPlayerId: state.firstPlayerId,
      activePlayerId: state.activePlayerId,
      startedAt: command.now,
    });
  }
  return done(working);
}

// ---------------------------------------------------------------------------
// OFFER (GR-003, GR-004, GR-006, GR-007, GR-008, GR-014, GR-017)
// ---------------------------------------------------------------------------

function applyOffer(working: Working, command: { playerId: PlayerId; offerId: string; amountTenths: number; now: number }, config: EconomyConfig): DomainResult {
  const { state } = working;
  if (state.status !== 'ACTIVE') return failure('MATCH_NOT_ACTIVE', 'match is not active');
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (state.activePlayerId !== player.playerId) return failure('NOT_YOUR_TURN', 'it is not your turn (GR-014)');

  if (!isValidAmountTenths(command.amountTenths, config.maxAmountTenths))
    return failure('AMOUNT_OUT_OF_RANGE', 'amount must be an integer number of tenths within [0.1, 999,999,999.9] (GR-004)');

  const withinRv =
    player.role === 'BUYER'
      ? command.amountTenths <= player.reservationValueTenths
      : command.amountTenths >= player.reservationValueTenths;
  if (!withinRv) return failure('OUTSIDE_RESERVATION_VALUE', 'amount is outside your reservation value (GR-003)');

  const previous = player.latestOfferTenths;
  let magnitude: number | null = null;
  let cost = 0;

  if (previous === null) {
    // GR-006: opening offer costs zero chips; any valid amount within RV is legal.
  } else if (command.amountTenths === previous) {
    // GR-007: duplicates cannot transfer the turn.
    return failure('DUPLICATE_OFFER', 'duplicate numerical offers are invalid (GR-007)');
  } else {
    const towardOpponent =
      player.role === 'BUYER'
        ? command.amountTenths > previous
        : command.amountTenths < previous;
    if (!towardOpponent)
      return failure('NON_MONOTONIC_CONCESSION', 'offers may only move toward your opponent (GR-008)');
    magnitude = concessionMagnitude(previous, command.amountTenths);
    cost = concessionCostChips(magnitude, config);
    if (player.chipsSpent + cost > player.initialChipBudget)
      return failure('INSUFFICIENT_CONCESSION_CHIPS', 'concession costs more chips than you have remaining (GR-017)');
  }

  // GR-014: sender's clock stops; opponent's starts.
  freezeRunningClock(state, command.now);
  player.chipsSpent += cost;
  player.latestOfferTenths = command.amountTenths;
  player.openingOfferTenths ??= command.amountTenths;
  player.standingOfferId = command.offerId;

  const other = opponentOf(state, player.playerId);
  state.activePlayerId = other.playerId;
  state.turnStartedAt = command.now;

  emit(working, 'OFFER_SUBMITTED', command.now, player.playerId, {
    offerId: command.offerId,
    amountTenths: command.amountTenths,
    isOpening: previous === null,
    concessionMagnitude: magnitude,
    concessionCostChips: cost,
    remainingConcessionChips: player.initialChipBudget - player.chipsSpent,
    nextActivePlayerId: other.playerId,
  });

  // A disconnected player must never accumulate decision time: their clock
  // freezes the moment the turn would otherwise start running (GR-015).
  if (other.disconnected) {
    state.turnStartedAt = null;
    state.status = 'PAUSED';
    emit(working, 'MATCH_PAUSED', command.now, null, { playerId: other.playerId, reason: 'DISCONNECTED' });
  }

  return done(working);
}

// ---------------------------------------------------------------------------
// ACCEPT (GR-010, GR-011)
// ---------------------------------------------------------------------------

function applyAccept(working: Working, command: { playerId: PlayerId; offerId: string; now: number }, config: EconomyConfig): DomainResult {
  const { state } = working;
  if (state.status !== 'ACTIVE') return failure('MATCH_NOT_ACTIVE', 'match is not active');
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (state.activePlayerId !== player.playerId) return failure('NOT_YOUR_TURN', 'it is not your turn (GR-014)');

  const other = opponentOf(state, player.playerId);
  // GR-010.1/GR-010.4: a standing opponent offer must exist and be current.
  if (other.standingOfferId === null || other.standingOfferId !== command.offerId)
    return failure('OFFER_NOT_CURRENT', 'that offer is not the opponent’s current standing offer (GR-010)');
  const amount = other.latestOfferTenths;
  if (amount === null) return failure('OFFER_NOT_CURRENT', 'the opponent has no standing offer');

  // GR-010.2: the settlement must sit inside the accepting player's RV.
  const withinRv =
    player.role === 'BUYER' ? amount <= player.reservationValueTenths : amount >= player.reservationValueTenths;
  if (!withinRv) return failure('OFFER_NOT_ACCEPTABLE_BY_RESERVATION', 'settlement is outside your reservation value (GR-010)');

  // GR-010: acceptance ends the match immediately and atomically.
  freezeRunningClock(state, command.now);
  state.status = 'DEAL';
  state.settlementTenths = amount;
  state.completionReason = 'ACCEPTED';
  state.completedAt = command.now;
  state.activePlayerId = null;
  state.economy = computeEconomy(state, config);

  emit(working, 'OFFER_ACCEPTED', command.now, player.playerId, {
    offerId: command.offerId,
    amountTenths: amount,
    acceptedByPlayerId: player.playerId,
  });
  emit(working, 'MATCH_COMPLETED', command.now, null, { reason: 'ACCEPTED', economy: serializeEconomy(state.economy) });

  return done(working);
}

// ---------------------------------------------------------------------------
// WALK AWAY (GR-012) — no deal, zero bounty for both
// ---------------------------------------------------------------------------

function applyWalkAway(working: Working, command: { playerId: PlayerId; now: number }, config: EconomyConfig): DomainResult {
  const { state } = working;
  if (state.status !== 'ACTIVE') return failure('MATCH_NOT_ACTIVE', 'match is not active');
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (state.activePlayerId !== player.playerId) return failure('NOT_YOUR_TURN', 'it is not your turn (GR-014)');

  freezeRunningClock(state, command.now);
  state.status = 'NO_DEAL';
  state.completionReason = 'WALKED_AWAY';
  state.completedAt = command.now;
  state.activePlayerId = null;
  state.economy = computeEconomy(state, config);

  emit(working, 'WALKED_AWAY', command.now, player.playerId, {});
  emit(working, 'MATCH_COMPLETED', command.now, null, { reason: 'WALKED_AWAY', economy: serializeEconomy(state.economy) });

  return done(working);
}

// ---------------------------------------------------------------------------
// MESSAGE (GR-013) — no turn transfer, no clock effect
// ---------------------------------------------------------------------------

function applyMessage(working: Working, command: { playerId: PlayerId; messageId: string; body: string; now: number }): DomainResult {
  const { state } = working;
  // Chat is legal during active negotiation, including while paused.
  if (state.status !== 'ACTIVE' && state.status !== 'PAUSED')
    return failure('MATCH_NOT_ACTIVE', 'chat is only available during active negotiation');
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (command.body.trim().length === 0) return failure('MESSAGE_EMPTY', 'message body must not be empty');

  emit(working, 'MESSAGE_SENT', command.now, player.playerId, {
    messageId: command.messageId,
    body: command.body,
  });
  return done(working);
}

// ---------------------------------------------------------------------------
// DISCONNECT / RECONNECT (GR-015) — freeze only the active player's clock
// ---------------------------------------------------------------------------

function applyDisconnect(working: Working, command: { playerId: PlayerId; now: number }): DomainResult {
  const { state } = working;
  if (isTerminal(state.status)) return done(working); // post-match presence is irrelevant
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (player.disconnected) return done(working); // idempotent

  player.disconnected = true;
  emit(working, 'PLAYER_DISCONNECTED', command.now, player.playerId, {});

  if (state.status === 'ACTIVE' && state.activePlayerId === player.playerId) {
    // GR-015: freeze the active clock (debounce/abandonment windows are
    // server-layer configuration, deliberately outside the domain).
    freezeRunningClock(state, command.now);
    state.status = 'PAUSED';
    emit(working, 'MATCH_PAUSED', command.now, null, { playerId: player.playerId, reason: 'DISCONNECTED' });
  }
  return done(working);
}

function applyReconnect(working: Working, command: { playerId: PlayerId; now: number }): DomainResult {
  const { state } = working;
  if (isTerminal(state.status)) return done(working);
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (!player.disconnected) return done(working); // idempotent

  player.disconnected = false;
  emit(working, 'PLAYER_RECONNECTED', command.now, player.playerId, {});

  // GR-015: reconnection resumes the same player's clock.
  if (state.status === 'PAUSED' && state.activePlayerId === player.playerId) {
    state.status = 'ACTIVE';
    state.turnStartedAt = command.now;
  }
  return done(working);
}

// ---------------------------------------------------------------------------
// TIMEOUT (GR-024, DD Phase 1) — hard decision-time budget exhausted.
// Server-only command: validated against the server-computed elapsed time
// so a misfired timer can never fabricate a timeout (SI-009).
// ---------------------------------------------------------------------------

function applyTimeout(working: Working, command: { playerId: PlayerId; now: number }, config: EconomyConfig): DomainResult {
  const { state } = working;
  if (state.status !== 'ACTIVE') return failure('MATCH_NOT_ACTIVE', 'timeout requires an active match');
  const player = findPlayer(state, command.playerId);
  if (!player) return failure('NOT_YOUR_TURN', 'player is not a match participant');
  if (state.activePlayerId !== player.playerId) return failure('NOT_YOUR_TURN', 'only the active player can time out (GR-014)');
  const limit = effectiveHardDecisionLimitMs(config);
  if (limit === null) return failure('TIMEOUT_NOT_DUE', 'no hard decision-time limit configured (GR-023)');
  if (elapsedActiveMs(player, state, command.now) < limit)
    return failure('TIMEOUT_NOT_DUE', 'hard decision-time limit not yet reached (GR-023)');

  freezeRunningClock(state, command.now);
  state.status = 'NO_DEAL';
  state.completionReason = 'TIMED_OUT';
  state.completedAt = command.now;
  state.activePlayerId = null;
  state.economy = computeEconomy(state, config);

  emit(working, 'TIMED_OUT', command.now, player.playerId, {
    timedOutPlayerId: player.playerId,
    cumulativeActiveMs: player.cumulativeActiveMs,
  });
  emit(working, 'MATCH_COMPLETED', command.now, null, { reason: 'TIMED_OUT', economy: serializeEconomy(state.economy) });

  return done(working);
}

// ---------------------------------------------------------------------------
// ABORT — administrative technical termination (GR: "administrative termination")
// ---------------------------------------------------------------------------

function applyAbort(working: Working, command: { now: number }, config: EconomyConfig): DomainResult {
  const { state } = working;
  if (isTerminal(state.status)) return done(working);

  freezeRunningClock(state, command.now);
  state.status = 'ABORTED';
  state.completionReason = 'ABORTED';
  state.completedAt = command.now;
  state.activePlayerId = null;
  state.economy = computeEconomy(state, config);

  emit(working, 'MATCH_ABORTED', command.now, null, {});
  return done(working);
}

// ---------------------------------------------------------------------------
// Economy settlement (GE-001..GE-010)
// ---------------------------------------------------------------------------

function computeEconomy(state: MatchState, config: EconomyConfig): MatchEconomy {
  const [buyer, seller] = orderByRole(state);

  // All clocks are frozen before this runs, so cumulativeActiveMs is final.
  const buyerMultiplier = clockMultiplier(buyer.cumulativeActiveMs, config);
  const sellerMultiplier = clockMultiplier(seller.cumulativeActiveMs, config);

  const shares =
    state.settlementTenths !== null
      ? surplusShares(buyer.reservationValueTenths, seller.reservationValueTenths, state.settlementTenths)
      : null;

  const deal = state.completionReason === 'ACCEPTED';
  // GR-019: technical aborts are never canonical-rated.
  const ratedEligible = state.mode === 'RANKED_LIVE' && state.completionReason !== 'ABORTED';

  const buyerShare = deal && shares ? shares.buyerShare : 0;
  const sellerShare = deal && shares ? shares.sellerShare : 0;

  const buyerGross = deal ? grossRewardChips(buyerShare, buyerMultiplier, config.matchBountyChips) : 0;
  const sellerGross = deal ? grossRewardChips(sellerShare, sellerMultiplier, config.matchBountyChips) : 0;

  return {
    zopaTenths: buyer.reservationValueTenths - seller.reservationValueTenths,
    settlementTenths: state.settlementTenths,
    buyerSurplusShare: shares?.buyerShare ?? null,
    sellerSurplusShare: shares?.sellerShare ?? null,
    ratedEligible,
    players: {
      [buyer.playerId]: {
        playerId: buyer.playerId,
        clockMultiplier: buyerMultiplier,
        grossReward: buyerGross,
        netResult: netResultChips(buyerGross, buyer.chipsSpent),
        chipsSpent: buyer.chipsSpent,
        remainingChips: buyer.initialChipBudget - buyer.chipsSpent,
        cumulativeActiveMs: buyer.cumulativeActiveMs,
      },
      [seller.playerId]: {
        playerId: seller.playerId,
        clockMultiplier: sellerMultiplier,
        grossReward: sellerGross,
        netResult: netResultChips(sellerGross, seller.chipsSpent),
        chipsSpent: seller.chipsSpent,
        remainingChips: seller.initialChipBudget - seller.chipsSpent,
        cumulativeActiveMs: seller.cumulativeActiveMs,
      },
    },
  };
}

function orderByRole(state: MatchState): [ParticipantState, ParticipantState] {
  const buyer = state.participants.find((p) => p.role === 'BUYER');
  const seller = state.participants.find((p) => p.role === 'SELLER');
  if (!buyer || !seller) throw new Error('invariant violated: match missing a role');
  return [buyer, seller];
}

/** JSON-safe economy payload for MATCH_COMPLETED events. */
function serializeEconomy(economy: MatchEconomy): Record<string, unknown> {
  return {
    zopaTenths: economy.zopaTenths,
    settlementTenths: economy.settlementTenths,
    buyerSurplusShare: economy.buyerSurplusShare,
    sellerSurplusShare: economy.sellerSurplusShare,
    ratedEligible: economy.ratedEligible,
    players: economy.players,
  };
}

/** GR-019 convenience: is this match canonical-rating eligible? */
export function isRatedEligible(state: MatchState): boolean {
  return state.economy?.ratedEligible ?? false;
}
