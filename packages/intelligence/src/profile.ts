/**
 * Longitudinal player profile (IN-3, DEC-028, docs/18 §9 + docs/20
 * "Longitudinal profile"). Pure and deterministic: aggregates a player's
 * completed-match analyses (feature-engine outputs, in match-end order)
 * into a versioned profile over gameplay tendencies.
 *
 * Hard rules:
 * - Never personality claims — descriptors fire only on explicit
 *   numeric thresholds (OQ-025) and are gameplay tendencies.
 * - Never causal attribution — trends carry metric + windows + delta +
 *   direction only; there is no free-text surface in this module.
 * - No clock reads — ordering comes from input `endedAt`; the profile
 *   reports `lastMatchEndedAt`, never a generated timestamp.
 * - Rating-independent (D-21): no rating key anywhere; rating-dependent
 *   comparisons and cohorts stay with P1-M2 / IN-8.
 * - ABORTED matches are excluded (technical termination is not a
 *   negotiation).
 */

import type { PlayerId } from '@bounty-bay/domain';
import { FEATURE_ENGINE_VERSION, type BehaviorFeatures } from './types';

export const PROFILE_ENGINE_VERSION = 'longitudinal-profile-0.1.0';

export interface MatchProfileInput {
  matchId: string;
  /** Server timestamp of match completion, ms epoch — the ordering key. */
  endedAt: number;
  features: BehaviorFeatures;
}

// -- confidence bands --------------------------------------------------------

export type ConfidenceBand = 'INSUFFICIENT_DATA' | 'EARLY_SIGNAL' | 'EMERGING_PATTERN' | 'ESTABLISHED';

export interface BandThresholds {
  /** 1..insufficientMax → INSUFFICIENT DATA (docs/18 §9: 1–4). */
  insufficientMax: number;
  /** insufficientMax+1 .. earlyMax → EARLY SIGNAL (5–14). */
  earlyMax: number;
  /** earlyMax+1 .. emergingMax → EMERGING PATTERN (15–29); above → ESTABLISHED (30+). */
  emergingMax: number;
}

export const DEFAULT_BAND_THRESHOLDS: BandThresholds = {
  insufficientMax: 4,
  earlyMax: 14,
  emergingMax: 29,
};

export function confidenceBandOf(matchCount: number, thresholds: BandThresholds = DEFAULT_BAND_THRESHOLDS): ConfidenceBand {
  if (matchCount < 1) throw new Error(`confidence band requires at least 1 match (got ${matchCount})`);
  if (matchCount <= thresholds.insufficientMax) return 'INSUFFICIENT_DATA';
  if (matchCount <= thresholds.earlyMax) return 'EARLY_SIGNAL';
  if (matchCount <= thresholds.emergingMax) return 'EMERGING_PATTERN';
  return 'ESTABLISHED';
}

// -- dimension aggregates ----------------------------------------------------

export interface MetricStat {
  /** Matches contributing a non-null value. */
  count: number;
  mean: number | null;
  min: number | null;
  max: number | null;
}

function statOf(values: number[]): MetricStat {
  if (values.length === 0) return { count: 0, mean: null, min: null, max: null };
  let sum = 0;
  let min = values[0]!;
  let max = values[0]!;
  for (const value of values) {
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { count: values.length, mean: sum / values.length, min, max };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface ProfileDimensions {
  /** Share of the ZOPA the opening claims from the opponent's limit — LOWER = more aggressive. */
  openingPositionInZopa: MetricStat;
  openingDistanceFromRv: MetricStat;
  /** Concessions per match. */
  concessionCount: MetricStat;
  /** Per-match mean relative concession size (size / pre-move gap). */
  concessionMeanRelativeSize: MetricStat;
  concessionEfficiency: MetricStat;
  unreciprocatedConcessions: MetricStat;
  maxConsecutiveUnilateral: MetricStat;
  fastConcessionsAfterResistance: MetricStat;
  /** Per-match mean decision time. */
  decisionSpeedMs: MetricStat;
  longHolds: MetricStat;
  /** Per-match 0/1 — mean IS the agreement rate. */
  agreementRate: MetricStat;
  /** DEAL matches only. */
  surplusCapture: MetricStat;
  /** Per-match 0/1 — walked or timed out. */
  noDealRate: MetricStat;
  timeoutRate: MetricStat;
  walkAwayRate: MetricStat;
  messagesSent: MetricStat;
  pitchedOffers: MetricStat;
  timePressureExposure: MetricStat;
  floorTimeMs: MetricStat;
  /** DEAL matches only. */
  timeFromCrossedToSettlementMs: MetricStat;
  finalGapTenths: MetricStat;
  offerCount: MetricStat;
  chipsSpent: MetricStat;
}

interface MetricDef {
  key: keyof ProfileDimensions;
  extract: (features: BehaviorFeatures) => number | null;
}

const METRIC_DEFS: readonly MetricDef[] = [
  { key: 'openingPositionInZopa', extract: (f) => f.openingPositionInZopa },
  { key: 'openingDistanceFromRv', extract: (f) => f.openingDistanceFromRv },
  { key: 'concessionCount', extract: (f) => f.concessionCount },
  {
    key: 'concessionMeanRelativeSize',
    extract: (f) => mean(f.concessionRelativeSizes.filter((value): value is number => value !== null)),
  },
  { key: 'concessionEfficiency', extract: (f) => f.concessionEfficiency },
  { key: 'unreciprocatedConcessions', extract: (f) => f.unreciprocatedConcessionCount },
  { key: 'maxConsecutiveUnilateral', extract: (f) => f.maxConsecutiveUnilateralConcessions },
  { key: 'fastConcessionsAfterResistance', extract: (f) => f.fastConcessionAfterResistanceCount },
  { key: 'decisionSpeedMs', extract: (f) => f.meanDecisionMs },
  { key: 'longHolds', extract: (f) => f.longHolds },
  { key: 'agreementRate', extract: (f) => (f.agreementReached ? 1 : 0) },
  { key: 'surplusCapture', extract: (f) => (f.outcome === 'DEAL' ? f.surplusShareCaptured : null) },
  { key: 'noDealRate', extract: (f) => (f.outcome === 'NO_DEAL_WALKED' || f.outcome === 'NO_DEAL_TIMED_OUT' ? 1 : 0) },
  { key: 'timeoutRate', extract: (f) => (f.outcome === 'NO_DEAL_TIMED_OUT' ? 1 : 0) },
  { key: 'walkAwayRate', extract: (f) => (f.outcome === 'NO_DEAL_WALKED' ? 1 : 0) },
  { key: 'messagesSent', extract: (f) => f.messagesSent },
  { key: 'pitchedOffers', extract: (f) => f.pitchedOffers },
  { key: 'timePressureExposure', extract: (f) => f.timePressureExposureFraction },
  { key: 'floorTimeMs', extract: (f) => f.floorTimeMs },
  { key: 'timeFromCrossedToSettlementMs', extract: (f) => (f.outcome === 'DEAL' ? f.timeFromCrossedToSettlementMs : null) },
  { key: 'finalGapTenths', extract: (f) => f.finalGapTenths },
  { key: 'offerCount', extract: (f) => f.offerCount },
  { key: 'chipsSpent', extract: (f) => f.chipsSpent },
];

function dimsOf(inputs: MatchProfileInput[]): ProfileDimensions {
  const byKey = new Map<keyof ProfileDimensions, number[]>();
  for (const input of inputs) {
    for (const def of METRIC_DEFS) {
      const value = def.extract(input.features);
      if (value !== null && Number.isFinite(value)) {
        const list = byKey.get(def.key) ?? [];
        list.push(value);
        byKey.set(def.key, list);
      }
    }
  }
  const dimensions = {} as Record<keyof ProfileDimensions, MetricStat>;
  for (const def of METRIC_DEFS) {
    dimensions[def.key] = statOf(byKey.get(def.key) ?? []);
  }
  return dimensions;
}

// -- windows + trends --------------------------------------------------------

export interface ProfileWindow {
  matchCount: number;
  dimensions: ProfileDimensions;
}

export interface ProfileOptions {
  /** Recent window size (docs/18 §9 "recent N / previous N"). */
  recentN: number;
  /** Rolling window size for the short-horizon view. */
  rollingN: number;
  bandThresholds: BandThresholds;
  descriptorThresholds: DescriptorThresholds;
  /** Relative flatness epsilon for trend direction (default 0.001). */
  flatRelativeEpsilon: number;
}

export type TrendDirection = 'UP' | 'DOWN' | 'FLAT';

export interface TrendReport {
  metric: keyof ProfileDimensions;
  recent: number;
  previous: number;
  direction: TrendDirection;
  /** recent − previous. */
  delta: number;
}

function directionOf(recent: number, previous: number, epsilon: number): TrendDirection {
  const delta = recent - previous;
  const scale = Math.max(1, Math.abs(recent), Math.abs(previous));
  return Math.abs(delta) <= epsilon * scale ? 'FLAT' : delta > 0 ? 'UP' : 'DOWN';
}

export type StyleDescriptorId =
  | 'AGGRESSIVE_OPENER'
  | 'CAUTIOUS_OPENER'
  | 'HARD_BARGAINER'
  | 'FREQUENT_CONCEDER'
  | 'SILENT_NEGOTIATOR'
  | 'QUICK_DECIDER'
  | 'SLOW_DECIDER'
  | 'PATIENT_CLOSER'
  | 'QUICK_CLOSER'
  | 'TIME_PRESSURED';

export interface DescriptorCondition {
  metric: keyof ProfileDimensions;
  comparison: 'LTE' | 'GTE' | 'EQ';
  threshold: number;
}

export interface StyleDescriptor {
  id: StyleDescriptorId;
  /** Fixed tendency label — gameplay tendency, never personality. */
  label: string;
  /** The measured values that triggered the rule (Level 1 facts). */
  evidence: { metric: keyof ProfileDimensions; value: number; comparison: DescriptorCondition['comparison']; threshold: number }[];
}

export interface DescriptorThresholds {
  /** Descriptors apply only from this many matches (EARLY SIGNAL floor). */
  minMatches: number;
  /** How many descriptors may apply at once (OQ-025, provisional). */
  maxDescriptors: number;
  aggressiveOpeningMax: number;
  cautiousOpeningMin: number;
  hardBargainerSurplusMin: number;
  frequentConcederMin: number;
  quickDecisionMaxMs: number;
  slowDecisionMinMs: number;
  patientCloseMinMs: number;
  quickCloseMaxMs: number;
  pressureExposureMin: number;
}

export const DEFAULT_DESCRIPTOR_THRESHOLDS: DescriptorThresholds = {
  minMatches: 5,
  maxDescriptors: 3,
  aggressiveOpeningMax: 0.35,
  cautiousOpeningMin: 0.65,
  hardBargainerSurplusMin: 0.6,
  frequentConcederMin: 3,
  quickDecisionMaxMs: 8000,
  slowDecisionMinMs: 25000,
  patientCloseMinMs: 60000,
  quickCloseMaxMs: 5000,
  pressureExposureMin: 0.25,
};

export const DEFAULT_PROFILE_OPTIONS: ProfileOptions = {
  recentN: 10,
  rollingN: 5,
  bandThresholds: DEFAULT_BAND_THRESHOLDS,
  descriptorThresholds: DEFAULT_DESCRIPTOR_THRESHOLDS,
  flatRelativeEpsilon: 0.001,
};

interface DescriptorRule {
  id: StyleDescriptorId;
  label: string;
  conditions: (thresholds: DescriptorThresholds) => DescriptorCondition[];
}

/** Priority order = array order; provisional until OQ-025 closes. */
const DESCRIPTOR_RULES: readonly DescriptorRule[] = [
  {
    id: 'AGGRESSIVE_OPENER',
    label: 'AGGRESSIVE OPENER',
    conditions: (t) => [{ metric: 'openingPositionInZopa', comparison: 'LTE', threshold: t.aggressiveOpeningMax }],
  },
  {
    id: 'CAUTIOUS_OPENER',
    label: 'CAUTIOUS OPENER',
    conditions: (t) => [{ metric: 'openingPositionInZopa', comparison: 'GTE', threshold: t.cautiousOpeningMin }],
  },
  {
    id: 'HARD_BARGAINER',
    label: 'HARD BARGAINER',
    conditions: (t) => [{ metric: 'surplusCapture', comparison: 'GTE', threshold: t.hardBargainerSurplusMin }],
  },
  {
    id: 'FREQUENT_CONCEDER',
    label: 'FREQUENT CONCEDER',
    conditions: (t) => [{ metric: 'concessionCount', comparison: 'GTE', threshold: t.frequentConcederMin }],
  },
  {
    id: 'SILENT_NEGOTIATOR',
    label: 'SILENT NEGOTIATOR',
    conditions: () => [
      { metric: 'messagesSent', comparison: 'EQ', threshold: 0 },
      { metric: 'offerCount', comparison: 'GTE', threshold: 3 },
    ],
  },
  {
    id: 'QUICK_DECIDER',
    label: 'QUICK DECIDER',
    conditions: (t) => [{ metric: 'decisionSpeedMs', comparison: 'LTE', threshold: t.quickDecisionMaxMs }],
  },
  {
    id: 'SLOW_DECIDER',
    label: 'SLOW DECIDER',
    conditions: (t) => [{ metric: 'decisionSpeedMs', comparison: 'GTE', threshold: t.slowDecisionMinMs }],
  },
  {
    id: 'PATIENT_CLOSER',
    label: 'PATIENT CLOSER',
    conditions: (t) => [{ metric: 'timeFromCrossedToSettlementMs', comparison: 'GTE', threshold: t.patientCloseMinMs }],
  },
  {
    id: 'QUICK_CLOSER',
    label: 'QUICK CLOSER',
    conditions: (t) => [{ metric: 'timeFromCrossedToSettlementMs', comparison: 'LTE', threshold: t.quickCloseMaxMs }],
  },
  {
    id: 'TIME_PRESSURED',
    label: 'UNDER TIME PRESSURE',
    conditions: (t) => [{ metric: 'timePressureExposure', comparison: 'GTE', threshold: t.pressureExposureMin }],
  },
];

function conditionHolds(condition: DescriptorCondition, value: number): boolean {
  if (condition.comparison === 'LTE') return value <= condition.threshold;
  if (condition.comparison === 'GTE') return value >= condition.threshold;
  return value === condition.threshold;
}

// -- role split --------------------------------------------------------------

export interface RoleSplit {
  buyer: RoleSide;
  seller: RoleSide;
}

export interface RoleSide {
  matchCount: number;
  agreementRate: MetricStat;
  surplusCapture: MetricStat;
}

function roleSide(inputs: MatchProfileInput[], role: 'BUYER' | 'SELLER'): RoleSide {
  const filtered = inputs.filter((input) => input.features.role === role);
  const dimensions = dimsOf(filtered);
  return {
    matchCount: filtered.length,
    agreementRate: dimensions.agreementRate,
    surplusCapture: dimensions.surplusCapture,
  };
}

// -- the profile -------------------------------------------------------------

export interface LongitudinalProfile {
  version: string;
  featureEngineVersion: string;
  playerId: PlayerId;
  matchCount: number;
  confidenceBand: ConfidenceBand;
  /** endedAt of the most recent contributing match (data, not a clock read). */
  lastMatchEndedAt: number;
  lifetime: ProfileWindow;
  recent: ProfileWindow;
  previous: ProfileWindow;
  rolling: ProfileWindow;
  /** Fixed dimension order; emitted only where both windows have data. */
  trends: TrendReport[];
  descriptors: StyleDescriptor[];
  roleSplit: RoleSplit;
}

function sortByEnd(inputs: MatchProfileInput[]): MatchProfileInput[] {
  return [...inputs].sort((a, b) => (a.endedAt !== b.endedAt ? a.endedAt - b.endedAt : a.matchId < b.matchId ? -1 : a.matchId > b.matchId ? 1 : 0));
}

function windowOf(inputs: MatchProfileInput[]): ProfileWindow {
  return { matchCount: inputs.length, dimensions: dimsOf(inputs) };
}

export function buildProfile(
  inputs: MatchProfileInput[],
  playerId: PlayerId,
  options: ProfileOptions = DEFAULT_PROFILE_OPTIONS,
): LongitudinalProfile {
  if (options.recentN < 1 || options.rollingN < 1) throw new Error(`window sizes must be ≥ 1 (recentN ${options.recentN}, rollingN ${options.rollingN})`);

  const seen = new Set<string>();
  for (const input of inputs) {
    if (!Number.isFinite(input.endedAt)) throw new Error(`match ${input.matchId} has a non-finite endedAt`);
    if (seen.has(input.matchId)) throw new Error(`duplicate match ${input.matchId} in profile history`);
    seen.add(input.matchId);
  }

  // Technical termination is not a negotiation — excluded entirely.
  const playable = sortByEnd(inputs.filter((input) => input.features.outcome !== 'ABORTED'));
  if (playable.length === 0) throw new Error('profile requires at least one non-aborted completed match');

  const lifetime = windowOf(playable);
  const rolling = windowOf(playable.slice(-options.rollingN));
  const recent = windowOf(playable.slice(-options.recentN));
  const previous = windowOf(playable.slice(Math.max(0, playable.length - options.recentN * 2), Math.max(0, playable.length - options.recentN)));

  const trends: TrendReport[] = [];
  for (const def of METRIC_DEFS) {
    const recentMean = recent.dimensions[def.key].mean;
    const previousMean = previous.dimensions[def.key].mean;
    if (recentMean === null || previousMean === null) continue;
    trends.push({
      metric: def.key,
      recent: recentMean,
      previous: previousMean,
      direction: directionOf(recentMean, previousMean, options.flatRelativeEpsilon),
      delta: recentMean - previousMean,
    });
  }

  const descriptors: StyleDescriptor[] = [];
  const thresholdSet = options.descriptorThresholds;
  if (playable.length >= thresholdSet.minMatches) {
    const means = lifetime.dimensions;
    for (const rule of DESCRIPTOR_RULES) {
      if (descriptors.length >= thresholdSet.maxDescriptors) break;
      const conditions = rule.conditions(thresholdSet);
      const evidence = conditions
        .map((condition) => ({ ...condition, value: means[condition.metric].mean }))
        .filter((item): item is { metric: keyof ProfileDimensions; value: number; comparison: DescriptorCondition['comparison']; threshold: number } => item.value !== null);
      if (evidence.length !== conditions.length) continue; // not enough data for this rule
      if (evidence.every((item) => conditionHolds(item, item.value))) {
        descriptors.push({ id: rule.id, label: rule.label, evidence });
      }
    }
  }

  return {
    version: PROFILE_ENGINE_VERSION,
    featureEngineVersion: FEATURE_ENGINE_VERSION,
    playerId,
    matchCount: playable.length,
    confidenceBand: confidenceBandOf(playable.length, options.bandThresholds),
    lastMatchEndedAt: playable[playable.length - 1]!.endedAt,
    lifetime,
    recent,
    previous,
    rolling,
    trends,
    descriptors,
    roleSplit: { buyer: roleSide(playable, 'BUYER'), seller: roleSide(playable, 'SELLER') },
  };
}
