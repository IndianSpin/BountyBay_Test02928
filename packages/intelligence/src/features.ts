/**
 * Behavior feature engine (DEC-028, docs/19). Pure and deterministic:
 * input is the terminal MatchState + the persisted event stream + the
 * economy config the match ran under. Every number below is a Level 1
 * objective fact; see docs/19 for the formula reference.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import type { DomainEvent, MatchState, ParticipantState, PlayerId } from '@bounty-bay/domain';
import { DEFAULT_THRESHOLDS, type BehaviorFeatures, type ConcessionPattern, type MatchOutcome, type ObservationThresholds } from './types';

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

interface TimeSpan {
  from: number;
  to: number;
}

/**
 * The player's own disconnect spans (only these can freeze their clock;
 * the domain pauses only on the active player's disconnect). Exported for
 * the observation engine's final-turn refs.
 */
export function ownDisconnectSpans(events: DomainEvent[], playerId: PlayerId): TimeSpan[] {
  const spans: TimeSpan[] = [];
  let open: TimeSpan | null = null;
  for (const event of events) {
    if (event.type === 'PLAYER_DISCONNECTED' && event.actorPlayerId === playerId) {
      if (open === null) open = { from: event.at, to: event.at };
    } else if (event.type === 'PLAYER_RECONNECTED' && event.actorPlayerId === playerId) {
      if (open !== null) {
        open.to = event.at;
        spans.push(open);
        open = null;
      }
    }
  }
  if (open !== null) {
    open.to = events.length > 0 ? events[events.length - 1]!.at : open.from;
    spans.push(open);
  }
  return spans;
}

export function pausedWithin(spans: TimeSpan[], from: number, to: number): number {
  let paused = 0;
  for (const span of spans) {
    const overlap = Math.min(to, span.to) - Math.max(from, span.from);
    if (overlap > 0) paused += overlap;
  }
  return paused;
}

/** Per-move classification shared by the feature engine and the observation engine (single source). */
export interface ClassifiedMove {
  seq: number;
  at: number;
  amountTenths: number;
  prevAmountTenths: number | null;
  isOpening: boolean;
  magnitude: number | null;
  chipCost: number;
  /** Per-turn active time (wall clock minus own pause overlap) leading to this move. */
  activeTimeMs: number;
  /** The opponent's latest offer was unchanged since the player's previous offer. */
  unreciprocated: boolean;
  /** An own message sat within the pitch window immediately before this offer. */
  pitched: boolean;
  oppLatestBefore: number | null;
}

export function classifyMoves(
  state: MatchState,
  events: DomainEvent[],
  playerId: PlayerId,
  thresholds: ObservationThresholds = DEFAULT_THRESHOLDS,
): ClassifiedMove[] {
  const started = events.find((e) => e.type === 'MATCH_STARTED');
  const spans = ownDisconnectSpans(events, playerId);

  const turnGranted: Partial<Record<PlayerId, number>> = {};
  if (started) turnGranted[started.payload.activePlayerId as PlayerId] = started.at;

  const moves: ClassifiedMove[] = [];
  let oppLatest: number | null = null;
  let oppLatestAtMyPreviousOffer: number | null = null;
  let lastMyMessageAt: number | null = null;

  for (const event of events) {
    if (event.type === 'MESSAGE_SENT' && event.actorPlayerId === playerId) {
      lastMyMessageAt = event.at;
      continue;
    }
    if (event.type !== 'OFFER_SUBMITTED') continue;

    const actor = event.actorPlayerId!;
    const amount = num(event.payload.amountTenths)!;
    const isOpening = event.payload.isOpening === true;

    if (actor === playerId) {
      const grant = turnGranted[playerId] ?? started?.at ?? event.at;
      const activeTime = Math.max(0, event.at - grant - pausedWithin(spans, grant, event.at));
      const prevAmount = moves.length > 0 ? moves[moves.length - 1]!.amountTenths : null;
      const magnitude = !isOpening && prevAmount !== null ? Math.abs(Math.log(amount / prevAmount)) : null;
      moves.push({
        seq: event.sequence,
        at: event.at,
        amountTenths: amount,
        prevAmountTenths: prevAmount,
        isOpening,
        magnitude,
        chipCost: num(event.payload.concessionCostChips) ?? 0,
        activeTimeMs: activeTime,
        unreciprocated: !isOpening && oppLatest === oppLatestAtMyPreviousOffer,
        pitched: lastMyMessageAt !== null && event.at - lastMyMessageAt <= thresholds.pitchWindowMs,
        oppLatestBefore: oppLatest,
      });
      oppLatestAtMyPreviousOffer = oppLatest;
      lastMyMessageAt = null; // one message pitches at most the next offer
    } else {
      oppLatest = amount;
    }
    // Live matches always alternate, so the turn goes to the other player;
    // a hypothetical hold mechanic (or async) would keep it — then the
    // grant restarts from this offer.
    if (event.payload.nextActivePlayerId === actor) {
      turnGranted[actor] = event.at;
    } else {
      turnGranted[event.payload.nextActivePlayerId as PlayerId] = event.at;
    }
  }
  return moves;
}

/** The player's final decision time on the terminal action (accept/walk/timeout), or null. */
export function finalDecisionMs(
  state: MatchState,
  events: DomainEvent[],
  playerId: PlayerId,
): number | null {
  const started = events.find((e) => e.type === 'MATCH_STARTED');
  const terminal = events.find((e) => e.type === 'OFFER_ACCEPTED' || e.type === 'WALKED_AWAY' || e.type === 'TIMED_OUT');
  if (!terminal) return null;
  const actor = terminal.type === 'TIMED_OUT' ? (terminal.payload.timedOutPlayerId as PlayerId) : terminal.actorPlayerId;
  if (actor !== playerId) return null;

  let grant = started?.at ?? terminal.at;
  for (const event of events) {
    if (event.at >= terminal.at) break;
    if (event.type === 'OFFER_SUBMITTED' && event.payload.nextActivePlayerId === playerId) grant = event.at;
  }
  const spans = ownDisconnectSpans(events, playerId);
  return Math.max(0, terminal.at - grant - pausedWithin(spans, grant, terminal.at));
}

function concessionPatternOf(magnitudes: number[]): ConcessionPattern {
  if (magnitudes.length < 3) return null;
  let increasing = true;
  let decreasing = true;
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i]! <= magnitudes[i - 1]!) increasing = false;
    if (magnitudes[i]! >= magnitudes[i - 1]!) decreasing = false;
  }
  return increasing ? 'INCREASING' : decreasing ? 'DECLINING' : 'MIXED';
}

export function computeFeatures(
  state: MatchState,
  events: DomainEvent[],
  config: EconomyConfig,
  thresholds: ObservationThresholds = DEFAULT_THRESHOLDS,
): Record<PlayerId, BehaviorFeatures> {
  const result: Partial<Record<PlayerId, BehaviorFeatures>> = {};
  for (const participant of state.participants) {
    result[participant.playerId] = featuresFor(state, events, config, participant, thresholds);
  }
  return result as Record<PlayerId, BehaviorFeatures>;
}

function featuresFor(
  state: MatchState,
  events: DomainEvent[],
  config: EconomyConfig,
  me: ParticipantState,
  thresholds: ObservationThresholds,
): BehaviorFeatures {
  const opponent = state.participants.find((p) => p.playerId !== me.playerId)!;
  const myRv = me.reservationValueTenths;
  const oppRv = opponent.reservationValueTenths;
  const moves = classifyMoves(state, events, me.playerId, thresholds);
  const concessions = moves.filter((m) => !m.isOpening);
  const magnitudes = concessions.map((m) => m.magnitude!).filter((v): v is number => v !== null);

  // -- crossing (global) -----------------------------------------------------
  const started = events.find((e) => e.type === 'MATCH_STARTED');
  const accepted = events.find((e) => e.type === 'OFFER_ACCEPTED');
  let buyerLatest: number | null = null;
  let sellerLatest: number | null = null;
  let firstCrossAt: number | null = null;
  for (const event of events) {
    if (event.type !== 'OFFER_SUBMITTED') continue;
    const role = state.participants.find((p) => p.playerId === event.actorPlayerId)?.role;
    const amount = num(event.payload.amountTenths);
    if (role === 'BUYER') buyerLatest = amount;
    if (role === 'SELLER') sellerLatest = amount;
    if (buyerLatest !== null && sellerLatest !== null && buyerLatest >= sellerLatest && firstCrossAt === null) {
      firstCrossAt = event.at;
    }
  }

  // -- outcome ---------------------------------------------------------------
  const outcome: MatchOutcome =
    state.status === 'DEAL'
      ? 'DEAL'
      : state.completionReason === 'TIMED_OUT'
        ? 'NO_DEAL_TIMED_OUT'
        : state.completionReason === 'WALKED_AWAY'
          ? 'NO_DEAL_WALKED'
          : 'ABORTED';

  const zopaSigned = state.economy?.zopaTenths ?? myRv - oppRv;
  const settlement = state.settlementTenths;
  const myShare = state.economy
    ? me.role === 'BUYER'
      ? state.economy.buyerSurplusShare
      : state.economy.sellerSurplusShare
    : null;

  // -- closing ---------------------------------------------------------------
  const myLatest = moves.length > 0 ? moves[moves.length - 1]!.amountTenths : null;
  // The opponent's standing offer at terminal time — from the event stream,
  // not from the player's own move history (the opponent may have moved
  // after the player's last offer).
  let oppLatestAtTerminal: number | null = null;
  for (const event of events) {
    if (event.type === 'OFFER_SUBMITTED' && event.actorPlayerId === opponent.playerId) {
      oppLatestAtTerminal = num(event.payload.amountTenths);
    }
  }
  const finalGap =
    myLatest !== null && oppLatestAtTerminal !== null ? Math.abs(myLatest - oppLatestAtTerminal) : null;

  let foregone: number | null = null;
  if ((outcome === 'NO_DEAL_WALKED' || outcome === 'NO_DEAL_TIMED_OUT') && oppLatestAtTerminal !== null) {
    const withinMandate = me.role === 'BUYER' ? oppLatestAtTerminal <= myRv : oppLatestAtTerminal >= myRv;
    if (withinMandate) foregone = me.role === 'BUYER' ? myRv - oppLatestAtTerminal : oppLatestAtTerminal - myRv;
  }

  // -- per-turn decision times ------------------------------------------------
  const finalTurn = finalDecisionMs(state, events, me.playerId);
  const decisionTimes = moves.map((m) => m.activeTimeMs);
  if (finalTurn !== null) decisionTimes.push(finalTurn);

  let unreciprocatedCount = 0;
  let maxUnilateralRun = 0;
  let run = 0;
  for (const move of concessions) {
    if (move.unreciprocated) {
      unreciprocatedCount += 1;
      run += 1;
      maxUnilateralRun = Math.max(maxUnilateralRun, run);
    } else {
      run = 0;
    }
  }
  const fastResistanceCount = concessions.filter(
    (m, i) => m.unreciprocated && i > 0 && concessions[i - 1]!.unreciprocated && m.activeTimeMs <= thresholds.fastResistanceMs,
  ).length;

  const reciprocalTimes = concessions.filter((m) => !m.unreciprocated).map((m) => m.activeTimeMs);
  const holdTimes = concessions.filter((m) => m.unreciprocated).map((m) => m.activeTimeMs);

  // -- opening ---------------------------------------------------------------
  const opening = moves.find((m) => m.isOpening) ?? null;
  const openingTenths = opening?.amountTenths ?? null;
  const openingDistance = openingTenths !== null ? Math.abs(Math.log(openingTenths / myRv)) : null;
  const openingPosition =
    openingTenths !== null && zopaSigned > 0
      ? me.role === 'BUYER'
        ? (openingTenths - oppRv) / zopaSigned
        : (oppRv - openingTenths) / zopaSigned
      : null;
  const openingSpans = ownDisconnectSpans(events, me.playerId);
  const timeToOpening =
    opening !== null && started !== undefined
      ? Math.max(0, opening.at - started.at - pausedWithin(openingSpans, started.at, opening.at))
      : null;

  // -- information -----------------------------------------------------------
  const myMessages = events.filter((e) => e.type === 'MESSAGE_SENT' && e.actorPlayerId === me.playerId);
  const messagesBeforeOpening = opening !== null ? myMessages.filter((m) => m.at < opening.at).length : myMessages.length;

  let silentRun = 0;
  let silentRunMax = 0;
  let hasOwnOffer = false;
  let messageSinceLastOffer = false;
  for (const event of events) {
    if (event.type === 'MESSAGE_SENT') {
      messageSinceLastOffer = true;
      continue;
    }
    if (event.type !== 'OFFER_SUBMITTED' || event.actorPlayerId !== me.playerId) continue;
    if (hasOwnOffer && !messageSinceLastOffer) silentRun += 1;
    else silentRun = 1;
    silentRunMax = Math.max(silentRunMax, silentRun);
    hasOwnOffer = true;
    messageSinceLastOffer = false;
  }

  // -- time pressure ---------------------------------------------------------
  const limit = config.hardDecisionTimeLimitMs ?? null;
  const lowWarning = config.timeWarningLowMs ?? null;
  const totalActive = me.cumulativeActiveMs;
  const pressureFraction =
    limit !== null && lowWarning !== null && totalActive > 0
      ? Math.max(0, totalActive - Math.max(0, limit - lowWarning)) / totalActive
      : null;

  const economy = state.economy?.players[me.playerId];
  const myOpeningIndex = moves.findIndex((m) => m.isOpening);
  const largestIndex = magnitudes.length > 0 ? magnitudes.indexOf(Math.max(...magnitudes)) : -1;

  return {
    openedFirst: events.find((e) => e.type === 'OFFER_SUBMITTED')?.actorPlayerId === me.playerId,
    openingOfferTenths: openingTenths,
    openingDistanceFromRv: openingDistance,
    openingPositionInZopa: openingPosition,
    timeToOpeningMs: timeToOpening,
    offerCount: moves.length,
    concessionCount: concessions.length,
    concessionMagnitudes: magnitudes,
    concessionSizesTenths: concessions.map((m) => Math.abs(m.amountTenths - (m.prevAmountTenths ?? m.amountTenths))),
    concessionRelativeSizes: concessions.map((m) => {
      const gap = m.oppLatestBefore !== null && m.prevAmountTenths !== null ? Math.abs(m.oppLatestBefore - m.prevAmountTenths) : null;
      return gap !== null && gap > 0 ? Math.abs(m.amountTenths - m.prevAmountTenths!) / gap : null;
    }),
    concessionChipCosts: concessions.map((m) => m.chipCost),
    concessionEfficiency:
      openingTenths !== null ? Math.abs((myLatest ?? openingTenths) - openingTenths) / Math.max(1, me.chipsSpent) : null,
    totalMovementTenths: openingTenths !== null ? Math.abs((myLatest ?? openingTenths) - openingTenths) : null,
    largestConcessionMagnitude: magnitudes.length > 0 ? Math.max(...magnitudes) : null,
    largestConcessionTurn: largestIndex >= 0 ? myOpeningIndex + largestIndex + 2 : null,
    finalConcessionMagnitude: magnitudes.length > 0 ? magnitudes[magnitudes.length - 1]! : null,
    unreciprocatedConcessionCount: unreciprocatedCount,
    maxConsecutiveUnilateralConcessions: maxUnilateralRun,
    concessionPattern: concessionPatternOf(magnitudes),
    reciprocalResponseMeanMs: mean(reciprocalTimes),
    holdResponseMeanMs: mean(holdTimes),
    fastConcessionAfterResistanceCount: fastResistanceCount,
    totalActiveMs: totalActive,
    meanDecisionMs: mean(decisionTimes),
    medianDecisionMs: median(decisionTimes),
    maxDecisionMs: decisionTimes.length > 0 ? Math.max(...decisionTimes) : null,
    longHolds: decisionTimes.filter((t) => t >= thresholds.longHoldMs).length,
    timePressureExposureFraction: pressureFraction,
    floorTimeMs: Math.max(0, totalActive - config.clockFloorMs),
    clockMultiplier: economy?.clockMultiplier ?? 1,
    messagesSent: myMessages.length,
    messagesSentBeforeOpening: messagesBeforeOpening,
    pitchedOffers: moves.filter((m) => m.pitched).length,
    silentOfferRunMax: silentRunMax,
    outcome,
    acceptedOpponentOffer: accepted !== undefined && accepted.actorPlayerId === me.playerId,
    ownOfferAccepted: accepted !== undefined && accepted.actorPlayerId === opponent.playerId,
    zopaTenths: zopaSigned,
    zopaExisted: zopaSigned > 0,
    settlementTenths: settlement,
    settlementPositionInZopa: zopaSigned > 0 ? myShare : null,
    finalGapTenths: finalGap,
    foregoneValueTenths: foregone,
    crossedOffersExisted: firstCrossAt !== null,
    timeFromCrossedToSettlementMs: accepted !== undefined && firstCrossAt !== null ? accepted.at - firstCrossAt : null,
    settlementWithinOwnLimitFraction: settlement !== null && myRv > 0 ? Math.abs(settlement - myRv) / myRv : null,
    settlementWithinOpponentLimitFraction: settlement !== null && oppRv > 0 ? Math.abs(settlement - oppRv) / oppRv : null,
    surplusShareCaptured: myShare,
    opponentSurplusShare: state.economy
      ? me.role === 'BUYER'
        ? state.economy.sellerSurplusShare
        : state.economy.buyerSurplusShare
      : null,
    grossReward: economy?.grossReward ?? 0,
    netResult: economy?.netResult ?? 0,
    chipsSpent: me.chipsSpent,
    chipsRemaining: me.initialChipBudget - me.chipsSpent,
    agreementReached: state.status === 'DEAL',
    role: me.role,
    firstMover: state.firstPlayerId === me.playerId,
    mode: state.mode,
    ratedEligible: state.economy?.ratedEligible ?? false,
    scenarioVersion: state.scenarioVersion,
    economyConfigVersion: state.economyConfigVersion,
    gameRulesVersion: state.gameRulesVersion,
    opponentRating: null,
  };
}
