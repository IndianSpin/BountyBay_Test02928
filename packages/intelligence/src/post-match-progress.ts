/**
 * Post-match progress payload (BB-258, D-76, docs/20 "Post-match
 * progress"). The engine-side computation for the Journey B result
 * screen: deterministic progress derived from the existing IN-3
 * profile + IN-6 practice data after a completed match.
 *
 * Payload contract (what a result screen should show):
 * - training history: profile matchCount, confidence band, and the
 *   band transition this match caused;
 * - personal records: best surplus capture, fastest close, longest
 *   hold, largest single concession — each with the matchId that set
 *   it;
 * - skill observations: this match's observations mapped through the
 *   practice store to drills, a persona, and micro-lessons;
 * - active training goal: the structured coaching focus + label;
 * - AI mastery: overall and per-persona matches/deals/deal rate/
 *   average surplus capture/current deal streak.
 *
 * Pure and deterministic: every timestamp is input data; no clocks,
 * no I/O, no LLM. The UI seam is W2's (coordinated via the manager);
 * nothing here persists.
 */

import type { PlayerId } from '@bounty-bay/domain';
import type { CoachingState } from './coaching-state';
import { createPracticeStore, lessonsForObservation, recommendForObservation, type PersonaKey, type PracticeStore } from './drills';
import { PRACTICE_SEEDS } from './drill-seeds';
import { KNOWLEDGE_SEEDS } from './knowledge-seeds';
import { OBSERVATION_TYPES } from './types';
import { buildProfile, type ConfidenceBand, type LongitudinalProfile, type MatchProfileInput } from './profile';
import type { MatchObservation, ObservationType } from './types';
import type { BehaviorFeatures } from './types';

export const POST_MATCH_PROGRESS_VERSION = 'post-match-progress-0.1.0';

const DEFAULT_PRACTICE_STORE: PracticeStore = createPracticeStore(
  PRACTICE_SEEDS,
  new Set(KNOWLEDGE_SEEDS.map((record) => record.citation_text)),
  OBSERVATION_TYPES,
);

export interface MatchRecordWithPersona extends MatchProfileInput {
  /** The AI persona faced, or null for human opponents. */
  personaKey: PersonaKey | null;
}

export interface CurrentMatchInput {
  matchId: string;
  endedAt: number;
  features: BehaviorFeatures;
  observations: MatchObservation[];
  personaKey: PersonaKey | null;
}

export interface PostMatchProgressInput {
  playerId: PlayerId;
  currentMatch: CurrentMatchInput;
  /** Prior completed matches — excluded from band transitions. */
  history: MatchRecordWithPersona[];
  coachingState: CoachingState;
}

export type BandTransition = 'FIRST_MATCH' | 'ADVANCED' | 'SAME';

export interface PersonalRecord {
  value: number;
  matchId: string;
}

export interface PersonalRecords {
  /** Highest surplus share captured in a deal (fraction). */
  bestSurplusCapture: PersonalRecord | null;
  /** Shortest crossing→settlement time in a deal (ms). */
  fastestCloseMs: PersonalRecord | null;
  /** Longest single decision time in any match (ms). */
  longestHoldMs: PersonalRecord | null;
  /** Largest single concession step in any match (tenths). */
  largestConcessionTenths: PersonalRecord | null;
}

export interface SkillObservation {
  type: ObservationType;
  magnitude: number | null;
  drillIds: string[];
  personaKey: PersonaKey | null;
  lessonIds: string[];
}

export interface PersonaMastery {
  matchCount: number;
  deals: number;
  dealRate: number | null;
  /** Mean surplus share over deals (fraction). */
  avgSurplusCapture: number | null;
  /**
   * Consecutive deals against this persona counting back from the most
   * recent match against them (matches against other opponents in
   * between do not reset the streak).
   */
  currentDealStreak: number;
}

export interface AiMastery {
  overall: PersonaMastery;
  byPersona: Record<PersonaKey, PersonaMastery>;
}

export interface TrainingGoal {
  topicId: string;
  label: string;
}

export interface PostMatchProgress {
  version: string;
  playerId: PlayerId;
  matchId: string;
  endedAt: number;
  profile: LongitudinalProfile;
  trainingHistory: {
    matchCount: number;
    confidenceBand: ConfidenceBand;
    bandTransition: BandTransition;
  };
  personalRecords: PersonalRecords;
  skillObservations: SkillObservation[];
  activeTrainingGoal: TrainingGoal | null;
  aiMastery: AiMastery;
}

const PERSONA_KEYS: readonly PersonaKey[] = ['anchor', 'grinder', 'closer', 'wall', 'mirror'];

function emptyMastery(): PersonaMastery {
  return { matchCount: 0, deals: 0, dealRate: null, avgSurplusCapture: null, currentDealStreak: 0 };
}

function masteryOf(records: MatchRecordWithPersona[]): PersonaMastery {
  if (records.length === 0) return emptyMastery();
  const deals = records.filter((record) => record.features.agreementReached);
  const captures = deals.map((record) => record.features.surplusShareCaptured).filter((value): value is number => value !== null);
  const avg = captures.length > 0 ? captures.reduce((sum, value) => sum + value, 0) / captures.length : null;

  // streak: from the newest match backward, while deals, within this set
  let streak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i]!.features.agreementReached) streak += 1;
    else break;
  }
  return {
    matchCount: records.length,
    deals: deals.length,
    dealRate: records.length > 0 ? deals.length / records.length : null,
    avgSurplusCapture: avg,
    currentDealStreak: streak,
  };
}

function sortByEnd(records: MatchRecordWithPersona[]): MatchRecordWithPersona[] {
  return [...records].sort((a, b) => (a.endedAt !== b.endedAt ? a.endedAt - b.endedAt : a.matchId < b.matchId ? -1 : a.matchId > b.matchId ? 1 : 0));
}

function personalRecordsOf(playable: MatchRecordWithPersona[]): PersonalRecords {
  let bestSurplusCapture: PersonalRecord | null = null;
  let fastestCloseMs: PersonalRecord | null = null;
  let longestHoldMs: PersonalRecord | null = null;
  let largestConcessionTenths: PersonalRecord | null = null;

  for (const record of playable) {
    const features = record.features;
    if (features.surplusShareCaptured !== null && (bestSurplusCapture === null || features.surplusShareCaptured > bestSurplusCapture.value)) {
      bestSurplusCapture = { value: features.surplusShareCaptured, matchId: record.matchId };
    }
    if (features.timeFromCrossedToSettlementMs !== null && (fastestCloseMs === null || features.timeFromCrossedToSettlementMs < fastestCloseMs.value)) {
      fastestCloseMs = { value: features.timeFromCrossedToSettlementMs, matchId: record.matchId };
    }
    if (features.maxDecisionMs !== null && (longestHoldMs === null || features.maxDecisionMs > longestHoldMs.value)) {
      longestHoldMs = { value: features.maxDecisionMs, matchId: record.matchId };
    }
    const biggestStep = features.concessionSizesTenths.reduce((max, size) => Math.max(max, size), 0);
    if (features.concessionSizesTenths.length > 0 && (largestConcessionTenths === null || biggestStep > largestConcessionTenths.value)) {
      largestConcessionTenths = { value: biggestStep, matchId: record.matchId };
    }
  }
  return { bestSurplusCapture, fastestCloseMs, longestHoldMs, largestConcessionTenths };
}

/** Computes the deterministic post-match progress payload. */
export function buildPostMatchProgress(
  input: PostMatchProgressInput,
  store: PracticeStore = DEFAULT_PRACTICE_STORE,
): PostMatchProgress {
  const { currentMatch, history, playerId, coachingState } = input;
  if (!Number.isFinite(currentMatch.endedAt)) throw new Error(`match ${currentMatch.matchId} has a non-finite endedAt`);
  if (currentMatch.features.outcome === 'ABORTED') throw new Error('post-match progress requires a completed (non-aborted) match');

  const current: MatchRecordWithPersona = {
    matchId: currentMatch.matchId,
    endedAt: currentMatch.endedAt,
    features: currentMatch.features,
    personaKey: currentMatch.personaKey,
  };
  const seen = new Set<string>();
  for (const record of history) {
    if (seen.has(record.matchId)) throw new Error(`duplicate match ${record.matchId} in history`);
    seen.add(record.matchId);
  }
  if (seen.has(current.matchId)) throw new Error(`duplicate match ${current.matchId} in history`);

  const all = sortByEnd([...history, current]);
  const playable = all.filter((record) => record.features.outcome !== 'ABORTED');
  const historyPlayable = playable.filter((record) => record.matchId !== current.matchId);

  // band transition: FIRST_MATCH when there was no profile before
  let before: LongitudinalProfile | null = null;
  if (historyPlayable.length > 0) {
    before = buildProfile(historyPlayable, playerId);
  }
  const profile = buildProfile(playable, playerId);
  const bandTransition: BandTransition = before === null ? 'FIRST_MATCH' : before.confidenceBand === profile.confidenceBand ? 'SAME' : 'ADVANCED';

  const skillObservations: SkillObservation[] = currentMatch.observations.map((observation) => {
    const recommendation = recommendForObservation(store, observation.type);
    return {
      type: observation.type,
      magnitude: observation.magnitude ?? null,
      drillIds: recommendation.drillIds,
      personaKey: recommendation.personaKey,
      lessonIds: lessonsForObservation(store, observation.type).map((lesson) => lesson.id),
    };
  });

  let activeTrainingGoal: TrainingGoal | null = null;
  if (coachingState.focus !== null) {
    const topic = coachingState.topics.find((entry) => entry.id === coachingState.focus);
    if (topic) activeTrainingGoal = { topicId: topic.id, label: topic.label };
  }

  const aiMatches = sortByEnd(playable.filter((record) => record.personaKey !== null));
  const byPersona = Object.fromEntries(PERSONA_KEYS.map((key) => [key, masteryOf(aiMatches.filter((record) => record.personaKey === key))])) as Record<PersonaKey, PersonaMastery>;

  return {
    version: POST_MATCH_PROGRESS_VERSION,
    playerId,
    matchId: current.matchId,
    endedAt: current.endedAt,
    profile,
    trainingHistory: {
      matchCount: profile.matchCount,
      confidenceBand: profile.confidenceBand,
      bandTransition,
    },
    personalRecords: personalRecordsOf(playable),
    skillObservations,
    activeTrainingGoal,
    aiMastery: { overall: masteryOf(aiMatches), byPersona },
  };
}
