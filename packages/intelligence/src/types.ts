/**
 * Negotiation Intelligence types (DEC-028, docs/18–20).
 *
 * Pure and deterministic: every feature and observation derives from the
 * final MatchState + persisted event stream + economy config — the exact
 * inputs the command service stored. Nothing here reads clocks, draws
 * randomness, or does I/O. Claims are Level 1 objective facts; source is
 * always 'deterministic' until IN-5 introduces statistical/model-inferred
 * classes.
 */

import type { MatchState, PlayerId } from '@bounty-bay/domain';

export const FEATURE_ENGINE_VERSION = 'feature-engine-0.1.0';
export const OBSERVATION_ENGINE_VERSION = 'observation-engine-0.1.0';

export type MatchOutcome = 'DEAL' | 'NO_DEAL_WALKED' | 'NO_DEAL_TIMED_OUT' | 'ABORTED';
export type ConcessionPattern = 'INCREASING' | 'DECLINING' | 'MIXED' | null;

/**
 * The behavior feature set per player (docs/19). All time in ms, amounts
 * in integer tenths, fractions in [0,1]. null = not defined for this match.
 */
export interface BehaviorFeatures {
  // opening
  openedFirst: boolean;
  openingOfferTenths: number | null;
  openingDistanceFromRv: number | null;
  openingPositionInZopa: number | null;
  timeToOpeningMs: number | null;
  // concessions
  offerCount: number;
  concessionCount: number;
  concessionMagnitudes: number[];
  concessionSizesTenths: number[];
  concessionRelativeSizes: (number | null)[];
  concessionChipCosts: number[];
  concessionEfficiency: number | null;
  totalMovementTenths: number | null;
  largestConcessionMagnitude: number | null;
  largestConcessionTurn: number | null;
  finalConcessionMagnitude: number | null;
  unreciprocatedConcessionCount: number;
  maxConsecutiveUnilateralConcessions: number;
  concessionPattern: ConcessionPattern;
  reciprocalResponseMeanMs: number | null;
  holdResponseMeanMs: number | null;
  fastConcessionAfterResistanceCount: number;
  // time
  totalActiveMs: number;
  meanDecisionMs: number | null;
  medianDecisionMs: number | null;
  maxDecisionMs: number | null;
  longHolds: number;
  timePressureExposureFraction: number | null;
  floorTimeMs: number;
  clockMultiplier: number;
  // information / communication (raw observations only — never NLP)
  messagesSent: number;
  messagesSentBeforeOpening: number;
  pitchedOffers: number;
  silentOfferRunMax: number;
  // closing
  outcome: MatchOutcome;
  acceptedOpponentOffer: boolean;
  ownOfferAccepted: boolean;
  zopaTenths: number;
  zopaExisted: boolean;
  settlementTenths: number | null;
  settlementPositionInZopa: number | null;
  finalGapTenths: number | null;
  foregoneValueTenths: number | null;
  crossedOffersExisted: boolean;
  timeFromCrossedToSettlementMs: number | null;
  settlementWithinOwnLimitFraction: number | null;
  settlementWithinOpponentLimitFraction: number | null;
  // performance
  surplusShareCaptured: number | null;
  opponentSurplusShare: number | null;
  grossReward: number;
  netResult: number;
  chipsSpent: number;
  chipsRemaining: number;
  agreementReached: boolean;
  role: 'BUYER' | 'SELLER';
  firstMover: boolean;
  mode: MatchState['mode'];
  ratedEligible: boolean;
  scenarioVersion: number;
  economyConfigVersion: string;
  gameRulesVersion: string;
  /** Null until P1-M2 ships a rating system (docs/19 §G). */
  opponentRating: null;
}

export type ObservationType =
  | 'STRONG_OPENING_POSITION'
  | 'CONSERVATIVE_OPENING'
  | 'LARGE_OPENING'
  | 'UNRECIPROCATED_CONCESSION'
  | 'CONSECUTIVE_UNILATERAL_CONCESSIONS'
  | 'LARGEST_CONCESSION'
  | 'LATE_LARGE_CONCESSION'
  | 'DECLINING_CONCESSIONS'
  | 'INCREASING_CONCESSIONS'
  | 'FAST_CONCESSION_AFTER_RESISTANCE'
  | 'LONG_HOLD'
  | 'TIME_PRESSURE_EXPOSURE'
  | 'HIGH_CHIP_SPEND'
  | 'LOW_CHIP_SPEND'
  | 'EFFICIENT_CLOSE'
  | 'DEAL_NEAR_OWN_LIMIT'
  | 'DEAL_NEAR_OPPONENT_LIMIT'
  | 'STRONG_SURPLUS_CAPTURE'
  | 'LOW_SURPLUS_CAPTURE'
  | 'MISSED_STANDING_OFFER'
  | 'FAILED_POSITIVE_ZOPA'
  | 'DEADLOCK'
  | 'TIMEOUT'
  | 'FAST_CLOSE'
  | 'SILENT_NEGOTIATION'
  | 'OFFER_WITH_PITCH';

export interface MatchObservation {
  type: ObservationType;
  version: string;
  magnitude?: number;
  measurements: Record<string, number>;
  /** Event sequence numbers that triggered this observation (timeline linkage, IN-2). */
  eventRefs: number[];
  confidence: 'deterministic';
  source: 'deterministic';
}

/** Runtime list of the 26 deterministic observation types (docs/20) — the mapping store's coverage check uses it. */
export const OBSERVATION_TYPES: readonly ObservationType[] = [
  'STRONG_OPENING_POSITION',
  'CONSERVATIVE_OPENING',
  'LARGE_OPENING',
  'UNRECIPROCATED_CONCESSION',
  'CONSECUTIVE_UNILATERAL_CONCESSIONS',
  'LARGEST_CONCESSION',
  'LATE_LARGE_CONCESSION',
  'DECLINING_CONCESSIONS',
  'INCREASING_CONCESSIONS',
  'FAST_CONCESSION_AFTER_RESISTANCE',
  'LONG_HOLD',
  'TIME_PRESSURE_EXPOSURE',
  'HIGH_CHIP_SPEND',
  'LOW_CHIP_SPEND',
  'EFFICIENT_CLOSE',
  'DEAL_NEAR_OWN_LIMIT',
  'DEAL_NEAR_OPPONENT_LIMIT',
  'STRONG_SURPLUS_CAPTURE',
  'LOW_SURPLUS_CAPTURE',
  'MISSED_STANDING_OFFER',
  'FAILED_POSITIVE_ZOPA',
  'DEADLOCK',
  'TIMEOUT',
  'FAST_CLOSE',
  'SILENT_NEGOTIATION',
  'OFFER_WITH_PITCH',
];

export interface PlayerAnalysis {
  playerId: PlayerId;
  features: BehaviorFeatures;
  observations: MatchObservation[];
}

export interface MatchAnalysis {
  matchId: string;
  version: string;
  observationVersion: string;
  players: Record<PlayerId, PlayerAnalysis>;
}

export interface ObservationThresholds {
  strongOpeningPosition: number;
  conservativeOpeningPosition: number;
  largeOpeningDistance: number;
  fastResistanceMs: number;
  longHoldMs: number;
  pressureExposureFraction: number;
  highChipSpendFraction: number;
  lowChipSpendFraction: number;
  efficientCloseMaxOffers: number;
  efficientCloseMaxChipFraction: number;
  nearLimitFraction: number;
  strongSurplusShare: number;
  lowSurplusShare: number;
  deadlockGapFraction: number;
  deadlockMinTotalOffers: number;
  fastCloseMs: number;
  pitchWindowMs: number;
}

export const DEFAULT_THRESHOLDS: ObservationThresholds = {
  // opening position: 0 = opponent's limit, 1 = own limit —
  // strong/ambitious openings sit LOW, conservative ones HIGH
  strongOpeningPosition: 0.3,
  conservativeOpeningPosition: 0.7,
  largeOpeningDistance: Math.log(2),
  fastResistanceMs: 3000,
  longHoldMs: 30_000,
  pressureExposureFraction: 0.25,
  highChipSpendFraction: 0.5,
  lowChipSpendFraction: 0.1,
  efficientCloseMaxOffers: 4,
  efficientCloseMaxChipFraction: 0.2,
  nearLimitFraction: 0.1,
  strongSurplusShare: 0.65,
  lowSurplusShare: 0.35,
  deadlockGapFraction: 0.2,
  deadlockMinTotalOffers: 4,
  fastCloseMs: 5000,
  pitchWindowMs: 10_000,
};
