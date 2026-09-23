/**
 * Game Review curation (IN-2, DEC-028, docs/20 "Review curation").
 *
 * Deterministic selection of the 1–5 most important moments of a match,
 * with objective game-language copy built from measurements. Pure — no
 * LLM, no interpretation. Every statement is a Level 1 objective fact
 * (docs/18 §2): numbers come from the feature engine, phrasing is fixed
 * per type. Version: review-curation-0.1.0.
 */

import { formatTenths } from '@bounty-bay/domain';
import type { BehaviorFeatures, MatchObservation, ObservationType } from './types';

export const REVIEW_CURATION_VERSION = 'review-curation-0.1.0';

export interface ReviewMoment {
  kind: 'RESULT' | ObservationType;
  headline: string;
  detail: string | null;
  eventRefs: number[];
  measurements: Record<string, number>;
}

/** Selection order: result-shaping moments first, then behavior, then flavor. */
const PRIORITY: readonly ObservationType[] = [
  'MISSED_STANDING_OFFER',
  'DEADLOCK',
  'TIMEOUT',
  'FAILED_POSITIVE_ZOPA',
  'UNRECIPROCATED_CONCESSION',
  'CONSECUTIVE_UNILATERAL_CONCESSIONS',
  'LATE_LARGE_CONCESSION',
  'FAST_CONCESSION_AFTER_RESISTANCE',
  'STRONG_OPENING_POSITION',
  'LARGE_OPENING',
  'CONSERVATIVE_OPENING',
  'LARGEST_CONCESSION',
  'STRONG_SURPLUS_CAPTURE',
  'LOW_SURPLUS_CAPTURE',
  'DEAL_NEAR_OWN_LIMIT',
  'DEAL_NEAR_OPPONENT_LIMIT',
  'FAST_CLOSE',
  'EFFICIENT_CLOSE',
  'DECLINING_CONCESSIONS',
  'INCREASING_CONCESSIONS',
  'LONG_HOLD',
  'TIME_PRESSURE_EXPOSURE',
  'HIGH_CHIP_SPEND',
  'LOW_CHIP_SPEND',
  'SILENT_NEGOTIATION',
  'OFFER_WITH_PITCH',
];

export const MOMENT_CAP = 5;

function pct(fraction: number): number {
  return Math.round(fraction * 100);
}

export function curateReview(features: BehaviorFeatures, observations: MatchObservation[]): ReviewMoment[] {
  const moments: ReviewMoment[] = [resultMoment(features)];

  // The RESULT moment already states the outcome facts; matching
  // observation moments would duplicate it.
  const skip = new Set<ObservationType>();
  if (features.outcome === 'NO_DEAL_TIMED_OUT') skip.add('TIMEOUT');
  if (features.outcome === 'NO_DEAL_WALKED' && features.foregoneValueTenths !== null) skip.add('MISSED_STANDING_OFFER');
  if (features.outcome === 'DEAL') {
    skip.add('STRONG_SURPLUS_CAPTURE');
    skip.add('LOW_SURPLUS_CAPTURE');
  }

  const byType = new Map<ObservationType, MatchObservation>();
  for (const observation of observations) {
    if (!byType.has(observation.type)) byType.set(observation.type, observation);
  }
  for (const type of PRIORITY) {
    if (moments.length >= MOMENT_CAP) break;
    if (skip.has(type)) continue;
    const observation = byType.get(type);
    if (!observation) continue;
    moments.push(momentFor(type, observation, features));
  }
  return moments;
}

function resultMoment(features: BehaviorFeatures): ReviewMoment {
  if (features.outcome === 'DEAL' && features.surplusShareCaptured !== null) {
    return {
      kind: 'RESULT',
      headline: `YOU CAPTURED ${pct(features.surplusShareCaptured)}%`,
      detail: `Agreement reached at ${formatTenths(features.settlementTenths ?? 0)} with ${features.chipsRemaining} chips remaining.`,
      eventRefs: [],
      measurements: {
        surplusShareCaptured: features.surplusShareCaptured,
        settlementTenths: features.settlementTenths ?? 0,
        chipsRemaining: features.chipsRemaining,
      },
    };
  }
  if (features.outcome === 'NO_DEAL_TIMED_OUT') {
    return {
      kind: 'RESULT',
      headline: 'TIME RAN OUT',
      detail: `The decision budget expired after ${Math.round(features.totalActiveMs / 1000)}s of active thinking. Zero bounty for both.`,
      eventRefs: [],
      measurements: { totalActiveMs: features.totalActiveMs },
    };
  }
  if (features.outcome === 'ABORTED') {
    return {
      kind: 'RESULT',
      headline: 'MATCH ABORTED',
      detail: 'The match ended by technical termination. No bounty was awarded.',
      eventRefs: [],
      measurements: {},
    };
  }
  return {
    kind: 'RESULT',
    headline: 'NO DEAL — ZERO BOUNTY',
    detail:
      features.foregoneValueTenths !== null
        ? `You walked away while a standing offer inside your limit remained — ${formatTenths(features.foregoneValueTenths)} of value stayed on the table.`
        : 'Both sides walked away. No bounty for either player.',
    eventRefs: [],
    measurements: { foregoneValueTenths: features.foregoneValueTenths ?? 0 },
  };
}

function momentFor(type: ObservationType, observation: MatchObservation, features: BehaviorFeatures): ReviewMoment {
  const m = observation.measurements;
  switch (type) {
    case 'MISSED_STANDING_OFFER':
      return {
        kind: type,
        headline: 'A STANDING DEAL WAS AVAILABLE',
        detail: `Their standing offer sat inside your limit — ending the match this way gave up ${formatTenths(m.foregoneTenths ?? observation.magnitude ?? 0)}.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'DEADLOCK':
      return {
        kind: type,
        headline: 'THE DEAL STALLED',
        detail: `Both sides stopped ${formatTenths(features.finalGapTenths ?? 0)} apart on a ${formatTenths(features.zopaTenths)} range.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'TIMEOUT':
      return {
        kind: type,
        headline: 'TIME RAN OUT',
        detail: `The decision budget expired after ${Math.round(features.totalActiveMs / 1000)}s of active thinking.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'FAILED_POSITIVE_ZOPA':
      return {
        kind: type,
        headline: 'A DEAL WAS POSSIBLE',
        detail: `The bargaining range was ${formatTenths(features.zopaTenths)} wide, and no agreement was reached.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'UNRECIPROCATED_CONCESSION':
      return {
        kind: type,
        headline: 'YOU MOVED WHILE THEY HELD',
        detail: `You conceded ${observation.magnitude ?? 1} time${observation.magnitude === 1 ? '' : 's'} while their position had not changed since your previous move.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'CONSECUTIVE_UNILATERAL_CONCESSIONS':
      return {
        kind: type,
        headline: 'ONE-SIDED RUN',
        detail: `A run of ${observation.magnitude ?? 2} consecutive concessions without reciprocal movement.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'LATE_LARGE_CONCESSION':
      return {
        kind: type,
        headline: 'LATE LARGE GIVE',
        detail: `Your largest concession was ${formatTenths(m.tenths ?? 0)} — made at move ${m.turn ?? 0}, late in the match.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'FAST_CONCESSION_AFTER_RESISTANCE':
      return {
        kind: type,
        headline: 'QUICK RETREAT',
        detail: `${observation.magnitude ?? 1} concession${observation.magnitude === 1 ? '' : 's'} followed resistance within ${Math.round((m.fastResistanceMs ?? 3000) / 1000)}s.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'STRONG_OPENING_POSITION':
      return {
        kind: type,
        headline: 'STRONG OPENING POSITION',
        detail: `You opened at ${formatTenths(features.openingOfferTenths ?? 0)} — ${pct(m.positionInZopa ?? 0)}% of the way across the range, toward their limit.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'LARGE_OPENING':
      return {
        kind: type,
        headline: 'LARGE OPENING MOVE',
        detail: `You opened at ${formatTenths(features.openingOfferTenths ?? 0)} — unusually far from your own limit.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'CONSERVATIVE_OPENING':
      return {
        kind: type,
        headline: 'CAUTIOUS OPENING',
        detail: `You opened at ${formatTenths(features.openingOfferTenths ?? 0)} — right beside your own limit.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'LARGEST_CONCESSION':
      return {
        kind: type,
        headline: 'LARGEST CONCESSION',
        detail: `Your largest single concession was ${formatTenths(m.tenths ?? 0)} at move ${m.turn ?? 0}.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'STRONG_SURPLUS_CAPTURE':
      return {
        kind: type,
        headline: 'STRONG SURPLUS CAPTURE',
        detail: `You claimed ${pct(features.surplusShareCaptured ?? 0)}% of the available surplus.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'LOW_SURPLUS_CAPTURE':
      return {
        kind: type,
        headline: 'THIN SURPLUS CAPTURE',
        detail: `You claimed ${pct(features.surplusShareCaptured ?? 0)}% of the available surplus.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'DEAL_NEAR_OWN_LIMIT':
      return {
        kind: type,
        headline: 'DEAL AT YOUR LIMIT',
        detail: `You settled within ${pct(m.fraction ?? 0)}% of your own limit.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'DEAL_NEAR_OPPONENT_LIMIT':
      return {
        kind: type,
        headline: 'DEAL AT THEIR LIMIT',
        detail: `You settled within ${pct(m.fraction ?? 0)}% of their limit.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'FAST_CLOSE':
      return {
        kind: type,
        headline: 'CLOSED FAST',
        detail: `From crossed offers to agreement: ${Math.round((observation.magnitude ?? 0) / 1000)}s.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'EFFICIENT_CLOSE':
      return {
        kind: type,
        headline: 'EFFICIENT CLOSE',
        detail: `${m.offerCount ?? 0} offers, ${m.chipsSpent ?? 0} chips spent.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'DECLINING_CONCESSIONS':
      return {
        kind: type,
        headline: 'SHRINKING CONCESSIONS',
        detail: 'Your concessions shrank move over move.',
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'INCREASING_CONCESSIONS':
      return {
        kind: type,
        headline: 'GROWING CONCESSIONS',
        detail: 'Your concessions grew move over move.',
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'LONG_HOLD':
      return {
        kind: type,
        headline: 'LONG HOLD',
        detail: `${observation.magnitude ?? 1} decision${observation.magnitude === 1 ? '' : 's'} of 30 seconds or more.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'TIME_PRESSURE_EXPOSURE':
      return {
        kind: type,
        headline: 'UNDER TIME PRESSURE',
        detail: `${pct(m.exposureFraction ?? 0)}% of your decision time ran inside the low-time window.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'HIGH_CHIP_SPEND':
      return {
        kind: type,
        headline: 'HEAVY CHIP SPEND',
        detail: `${features.chipsSpent} chips spent — ${pct(m.fraction ?? 0)}% of your budget.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'LOW_CHIP_SPEND':
      return {
        kind: type,
        headline: 'LIGHT CHIP SPEND',
        detail: `${features.chipsSpent} chips spent across the match.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'SILENT_NEGOTIATION':
      return {
        kind: type,
        headline: 'SILENT NEGOTIATION',
        detail: `${features.offerCount} formal offers, no messages.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
    case 'OFFER_WITH_PITCH':
      return {
        kind: type,
        headline: 'OFFERS WITH A PITCH',
        detail: `${observation.magnitude ?? 1} offer${observation.magnitude === 1 ? '' : 's'} arrived moments after a message.`,
        eventRefs: observation.eventRefs,
        measurements: m,
      };
  }
}
