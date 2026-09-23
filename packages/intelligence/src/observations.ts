/**
 * Observation engine (DEC-028, docs/20). Deterministic rules over the
 * feature set and the classified moves; every observation carries event
 * refs for timeline linkage (IN-2 UI), a magnitude where meaningful, and
 * source/confidence 'deterministic'. No moral labels; see docs/20 for the
 * exact trigger of each type.
 */

import type { DomainEvent, MatchState, PlayerId } from '@bounty-bay/domain';
import { classifyMoves, computeFeatures } from './features';
import {
  DEFAULT_THRESHOLDS,
  FEATURE_ENGINE_VERSION,
  OBSERVATION_ENGINE_VERSION,
  type BehaviorFeatures,
  type MatchAnalysis,
  type MatchObservation,
  type ObservationThresholds,
  type ObservationType,
  type PlayerAnalysis,
} from './types';

function obs(
  type: ObservationType,
  magnitude: number | undefined,
  measurements: Record<string, number>,
  eventRefs: number[],
): MatchObservation {
  return {
    type,
    version: OBSERVATION_ENGINE_VERSION,
    ...(magnitude !== undefined ? { magnitude } : {}),
    measurements,
    eventRefs,
    confidence: 'deterministic',
    source: 'deterministic',
  };
}

export function detectObservations(
  state: MatchState,
  events: DomainEvent[],
  playerId: PlayerId,
  features: BehaviorFeatures,
  thresholds: ObservationThresholds = DEFAULT_THRESHOLDS,
): MatchObservation[] {
  const out: MatchObservation[] = [];
  const moves = classifyMoves(state, events, playerId, thresholds);
  const concessions = moves.filter((m) => !m.isOpening);
  const budget = features.chipsSpent + features.chipsRemaining;
  const opening = moves.find((m) => m.isOpening);
  const terminal = events.find((e) => e.type === 'OFFER_ACCEPTED' || e.type === 'WALKED_AWAY' || e.type === 'TIMED_OUT');
  const terminalRef = terminal ? [terminal.sequence] : [];
  const offerRefs = moves.map((m) => m.seq);

  // opening — position measures 0 = opponent's limit, 1 = own limit
  // (negative = beyond the opponent's limit), so a STRONG/ambitious opening
  // sits LOW on the scale
  if (features.openingPositionInZopa !== null && features.openingPositionInZopa <= thresholds.strongOpeningPosition) {
    out.push(obs('STRONG_OPENING_POSITION', undefined, { positionInZopa: features.openingPositionInZopa }, opening ? [opening.seq] : []));
  }
  if (features.openingPositionInZopa !== null && features.openingPositionInZopa >= thresholds.conservativeOpeningPosition) {
    out.push(obs('CONSERVATIVE_OPENING', undefined, { positionInZopa: features.openingPositionInZopa }, opening ? [opening.seq] : []));
  }
  if (features.openingDistanceFromRv !== null && features.openingDistanceFromRv >= thresholds.largeOpeningDistance) {
    out.push(obs('LARGE_OPENING', undefined, { distanceFromRv: features.openingDistanceFromRv }, opening ? [opening.seq] : []));
  }

  // concessions
  const unreciprocatedMoves = concessions.filter((m) => m.unreciprocated);
  if (features.unreciprocatedConcessionCount >= 1) {
    out.push(
      obs(
        'UNRECIPROCATED_CONCESSION',
        features.unreciprocatedConcessionCount,
        { concessionCount: features.concessionCount },
        unreciprocatedMoves.map((m) => m.seq),
      ),
    );
  }
  if (features.maxConsecutiveUnilateralConcessions >= 2) {
    let best: number[] = [];
    let current: number[] = [];
    for (const move of concessions) {
      if (move.unreciprocated) {
        current.push(move.seq);
        if (current.length > best.length) best = current;
      } else {
        current = [];
      }
    }
    out.push(obs('CONSECUTIVE_UNILATERAL_CONCESSIONS', best.length, {}, best));
  }
  const largestIndex = concessions.findIndex((m) => m.magnitude === features.largestConcessionMagnitude);
  if (features.largestConcessionMagnitude !== null && largestIndex >= 0) {
    const largest = concessions[largestIndex]!;
    out.push(
      obs(
        'LARGEST_CONCESSION',
        features.largestConcessionMagnitude,
        { tenths: Math.abs(largest.amountTenths - (largest.prevAmountTenths ?? largest.amountTenths)), turn: features.largestConcessionTurn ?? 0 },
        [largest.seq],
      ),
    );
    const inLastThird =
      features.largestConcessionTurn !== null && features.offerCount >= 3 && features.largestConcessionTurn > Math.floor((2 * features.offerCount) / 3);
    if (features.concessionCount >= 2 && inLastThird) {
      out.push(obs('LATE_LARGE_CONCESSION', features.largestConcessionMagnitude, { turn: features.largestConcessionTurn! }, [largest.seq]));
    }
  }
  if (features.concessionPattern === 'DECLINING') out.push(obs('DECLINING_CONCESSIONS', undefined, {}, offerRefs));
  if (features.concessionPattern === 'INCREASING') out.push(obs('INCREASING_CONCESSIONS', undefined, {}, offerRefs));
  if (features.fastConcessionAfterResistanceCount >= 1) {
    const fast = concessions.filter(
      (m, i) => m.unreciprocated && i > 0 && concessions[i - 1]!.unreciprocated && m.activeTimeMs <= thresholds.fastResistanceMs,
    );
    out.push(
      obs(
        'FAST_CONCESSION_AFTER_RESISTANCE',
        fast.length,
        { fastResistanceMs: thresholds.fastResistanceMs },
        fast.map((m) => m.seq),
      ),
    );
  }

  // time
  if (features.longHolds >= 1) {
    const holds = moves.filter((m) => m.activeTimeMs >= thresholds.longHoldMs);
    out.push(obs('LONG_HOLD', holds.length, { maxDecisionMs: features.maxDecisionMs ?? 0 }, holds.map((m) => m.seq)));
  }
  if (features.timePressureExposureFraction !== null && features.timePressureExposureFraction >= thresholds.pressureExposureFraction) {
    out.push(obs('TIME_PRESSURE_EXPOSURE', undefined, { exposureFraction: features.timePressureExposureFraction }, []));
  }

  // chips
  if (features.chipsSpent >= thresholds.highChipSpendFraction * budget) {
    out.push(obs('HIGH_CHIP_SPEND', features.chipsSpent, { fraction: budget > 0 ? features.chipsSpent / budget : 0 }, offerRefs));
  }
  if (features.chipsSpent <= thresholds.lowChipSpendFraction * budget && features.concessionCount >= 1) {
    out.push(obs('LOW_CHIP_SPEND', features.chipsSpent, { fraction: budget > 0 ? features.chipsSpent / budget : 0 }, offerRefs));
  }

  // closing
  if (
    features.agreementReached &&
    features.offerCount <= thresholds.efficientCloseMaxOffers &&
    features.chipsSpent <= thresholds.efficientCloseMaxChipFraction * budget
  ) {
    out.push(obs('EFFICIENT_CLOSE', undefined, { offerCount: features.offerCount, chipsSpent: features.chipsSpent }, terminalRef));
  }
  if (features.agreementReached && features.settlementWithinOwnLimitFraction !== null && features.settlementWithinOwnLimitFraction <= thresholds.nearLimitFraction) {
    out.push(obs('DEAL_NEAR_OWN_LIMIT', undefined, { fraction: features.settlementWithinOwnLimitFraction }, terminalRef));
  }
  if (
    features.agreementReached &&
    features.settlementWithinOpponentLimitFraction !== null &&
    features.settlementWithinOpponentLimitFraction <= thresholds.nearLimitFraction
  ) {
    out.push(obs('DEAL_NEAR_OPPONENT_LIMIT', undefined, { fraction: features.settlementWithinOpponentLimitFraction }, terminalRef));
  }
  if (features.agreementReached && features.surplusShareCaptured !== null && features.surplusShareCaptured >= thresholds.strongSurplusShare) {
    out.push(obs('STRONG_SURPLUS_CAPTURE', features.surplusShareCaptured, {}, terminalRef));
  }
  if (features.agreementReached && features.surplusShareCaptured !== null && features.surplusShareCaptured <= thresholds.lowSurplusShare) {
    out.push(obs('LOW_SURPLUS_CAPTURE', features.surplusShareCaptured, {}, terminalRef));
  }
  if (features.foregoneValueTenths !== null && features.foregoneValueTenths > 0) {
    out.push(obs('MISSED_STANDING_OFFER', features.foregoneValueTenths, {}, terminalRef));
  }
  if ((features.outcome === 'NO_DEAL_WALKED' || features.outcome === 'NO_DEAL_TIMED_OUT') && features.zopaExisted) {
    out.push(obs('FAILED_POSITIVE_ZOPA', features.zopaTenths, {}, terminalRef));
  }
  const allOffers = events.filter((e) => e.type === 'OFFER_SUBMITTED');
  if (
    !features.agreementReached &&
    features.finalGapTenths !== null &&
    features.zopaTenths > 0 &&
    features.finalGapTenths <= thresholds.deadlockGapFraction * features.zopaTenths &&
    allOffers.length >= thresholds.deadlockMinTotalOffers
  ) {
    out.push(
      obs('DEADLOCK', features.finalGapTenths, { zopaTenths: features.zopaTenths }, [
        ...allOffers.slice(-2).map((e) => e.sequence),
        ...terminalRef,
      ]),
    );
  }
  if (features.outcome === 'NO_DEAL_TIMED_OUT') {
    out.push(obs('TIMEOUT', features.totalActiveMs, {}, terminalRef));
  }
  if (
    features.agreementReached &&
    features.crossedOffersExisted &&
    features.timeFromCrossedToSettlementMs !== null &&
    features.timeFromCrossedToSettlementMs <= thresholds.fastCloseMs
  ) {
    out.push(obs('FAST_CLOSE', features.timeFromCrossedToSettlementMs, {}, terminalRef));
  }
  if (features.offerCount >= 3 && features.messagesSent === 0) {
    out.push(obs('SILENT_NEGOTIATION', features.offerCount, {}, offerRefs));
  }
  if (features.pitchedOffers >= 1) {
    const pitched = moves.filter((m) => m.pitched);
    out.push(obs('OFFER_WITH_PITCH', pitched.length, {}, pitched.map((m) => m.seq)));
  }

  return out;
}

/** Full deterministic analysis of a completed match (docs/19 + docs/20). */
export function analyzeMatch(
  state: MatchState,
  events: DomainEvent[],
  config: Parameters<typeof computeFeatures>[2],
  thresholds: ObservationThresholds = DEFAULT_THRESHOLDS,
): MatchAnalysis {
  const featuresByPlayer = computeFeatures(state, events, config, thresholds);
  const players: Record<PlayerId, PlayerAnalysis> = {};
  for (const participant of state.participants) {
    const playerId = participant.playerId;
    players[playerId] = {
      playerId,
      features: featuresByPlayer[playerId]!,
      observations: detectObservations(state, events, playerId, featuresByPlayer[playerId]!, thresholds),
    };
  }
  return {
    matchId: state.matchId,
    version: FEATURE_ENGINE_VERSION,
    observationVersion: OBSERVATION_ENGINE_VERSION,
    players,
  };
}
