/**
 * Practice system (IN-6, DEC-028, docs/18 §8 + docs/20 "Practice
 * system"). Deterministic drill + micro-lesson schemas with strict
 * validation.
 *
 * No-universal-answer rule, enforced structurally:
 * - every drill needs ≥ 2 options with pairwise DISTINCT outcomes;
 * - the schema has no correctness field — no option can be marked "the
 *   answer", and validation rejects any attempt to smuggle one in.
 *
 * Drills train isolated decisions (WHAT WOULD YOU DO?); micro-lessons
 * are 1–5 minutes and callable from Game Review observation types;
 * practice recommendations map weaknesses (observation types) to drills
 * and DEC-025 personas. Sources are knowledge-base citation texts —
 * validation rejects fabricated references. Daily/skill drills and
 * streaks are OUT (OQ-026 gate). Pure: no I/O, no clocks, no LLM.
 */

import { isOntologyTag } from './ontology';
import type { ObservationType } from './types';

export const PRACTICE_VERSION = 'practice-system-0.1.0';

export type PersonaKey = 'anchor' | 'grinder' | 'closer' | 'wall' | 'mirror';

export interface DrillScenario {
  role: 'BUYER' | 'SELLER';
  reservationValueTenths: number;
  opponentLatestOfferTenths: number | null;
  /** Remaining decision budget in ms; null = no hard limit in the scenario. */
  timeRemainingMs: number | null;
  chipsRemaining: number;
  roundNumber: number;
}

export interface DrillOption {
  id: string;
  /** What the player would do — a concrete, playable move. */
  label: string;
  /** Deterministic consequence (L1 objective fact, in game language). */
  outcome: string;
  /** What choosing this option surfaces about the concept (L4). */
  teachingNote: string;
}

export interface Drill {
  id: string;
  version: string;
  kind: 'WHAT_WOULD_YOU_DO';
  title: string;
  scenario: DrillScenario;
  /** Information the player holds privately in this drill. */
  privateInfo: Record<string, unknown>;
  options: DrillOption[];
  teachingObjective: string;
  /** Ontology tags the drill trains. */
  conceptTags: string[];
  /** What the concept is and why it matters (L3/L4, register-aware when cited). */
  explanation: string;
  /** Knowledge-base citation texts — validated against the KB. */
  sources: string[];
  /** Cohort benchmark — IN-8 fills this; always null in the starter set. */
  benchmark: null;
}

export type LessonClaimLevel = 'L1' | 'L3' | 'L4';

export interface LessonStep {
  text: string;
  level: LessonClaimLevel;
}

export interface MicroLesson {
  id: string;
  version: string;
  title: string;
  /** 1–5, validated. */
  minutes: number;
  conceptTags: string[];
  steps: LessonStep[];
  sources: string[];
  /** Observation types whose Game Review moments may surface this lesson. */
  callableFrom: ObservationType[];
}

export interface PracticeRecommendation {
  observationType: ObservationType;
  drillIds: string[];
  /** DEC-025 persona key, or null when no persona drill applies. */
  personaKey: PersonaKey | null;
}

export interface PracticeValidationError {
  id: string;
  field: string;
  message: string;
}

function validateDrill(drill: Drill, knownCitations: ReadonlySet<string>): PracticeValidationError[] {
  const errors: PracticeValidationError[] = [];
  const fail = (field: string, message: string) => errors.push({ id: drill.id, field, message });

  if (!drill.id || drill.id.trim() === '') fail('id', 'id is required');
  if (!drill.title || drill.title.trim() === '') fail('title', 'title is required');
  if (!drill.teachingObjective || drill.teachingObjective.trim() === '') fail('teachingObjective', 'teachingObjective is required');
  if (!drill.explanation || drill.explanation.trim() === '') fail('explanation', 'explanation is required');
  if (drill.kind !== 'WHAT_WOULD_YOU_DO') fail('kind', `unknown drill kind "${drill.kind}"`);
  if (drill.version !== PRACTICE_VERSION) fail('version', `version must be ${PRACTICE_VERSION} (got ${drill.version})`);
  if (!Number.isInteger(drill.scenario.reservationValueTenths) || drill.scenario.reservationValueTenths <= 0) {
    fail('scenario', 'reservationValueTenths must be a positive integer');
  }
  if (drill.scenario.opponentLatestOfferTenths !== null && !Number.isInteger(drill.scenario.opponentLatestOfferTenths)) {
    fail('scenario', 'opponentLatestOfferTenths must be an integer or null');
  }
  if (drill.scenario.timeRemainingMs !== null && !Number.isFinite(drill.scenario.timeRemainingMs)) {
    fail('scenario', 'timeRemainingMs must be finite or null');
  }
  if (!Number.isInteger(drill.scenario.roundNumber) || drill.scenario.roundNumber < 1) {
    fail('scenario', 'roundNumber must be a positive integer');
  }
  if (!['BUYER', 'SELLER'].includes(drill.scenario.role)) fail('scenario', `unknown role ${drill.scenario.role}`);

  if (drill.conceptTags.length === 0) fail('conceptTags', 'at least one concept tag is required');
  for (const tag of drill.conceptTags) {
    if (!isOntologyTag(tag)) fail('conceptTags', `unknown ontology tag "${tag}"`);
  }

  // no-universal-answer rule: at least two options, pairwise distinct outcomes
  if (drill.options.length < 2) {
    fail('options', 'at least 2 options are required — a single option implies one universal answer');
  }
  const outcomes = new Set<string>();
  for (const option of drill.options) {
    if (!option.id || option.id.trim() === '') fail('options', 'option id is required');
    if (!option.label || option.label.trim() === '') fail('options', `option ${option.id} label is required`);
    if (!option.outcome || option.outcome.trim() === '') fail('options', `option ${option.id} outcome is required`);
    if (!option.teachingNote || option.teachingNote.trim() === '') fail('options', `option ${option.id} teachingNote is required`);
    if (outcomes.has(option.outcome)) fail('options', `options ${option.id} and another share the same outcome — outcomes must be pairwise distinct`);
    outcomes.add(option.outcome);
  }

  // sources must be real KB citation texts — fabricated references rejected
  if (drill.sources.length === 0) fail('sources', 'at least one knowledge-base source is required');
  for (const source of drill.sources) {
    if (!knownCitations.has(source)) fail('sources', `source not present in the knowledge base: ${source.slice(0, 60)}…`);
  }
  if (drill.benchmark !== null) fail('benchmark', 'benchmark must be null until IN-8');
  return errors;
}

function validateLesson(lesson: MicroLesson, knownCitations: ReadonlySet<string>): PracticeValidationError[] {
  const errors: PracticeValidationError[] = [];
  const fail = (field: string, message: string) => errors.push({ id: lesson.id, field, message });

  if (!lesson.id || lesson.id.trim() === '') fail('id', 'id is required');
  if (!lesson.title || lesson.title.trim() === '') fail('title', 'title is required');
  if (!Number.isInteger(lesson.minutes) || lesson.minutes < 1 || lesson.minutes > 5) {
    fail('minutes', `minutes must be an integer in 1–5 (got ${lesson.minutes})`);
  }
  if (lesson.version !== PRACTICE_VERSION) fail('version', `version must be ${PRACTICE_VERSION} (got ${lesson.version})`);
  if (lesson.steps.length === 0) fail('steps', 'at least one lesson step is required');
  for (const step of lesson.steps) {
    if (!step.text || step.text.trim() === '') fail('steps', 'lesson step text is required');
    if (!['L1', 'L3', 'L4'].includes(step.level)) fail('steps', `unknown claim level ${step.level}`);
  }
  for (const tag of lesson.conceptTags) {
    if (!isOntologyTag(tag)) fail('conceptTags', `unknown ontology tag "${tag}"`);
  }
  if (lesson.callableFrom.length === 0) fail('callableFrom', 'at least one callableFrom observation type is required');
  for (const source of lesson.sources) {
    if (!knownCitations.has(source)) fail('sources', `source not present in the knowledge base: ${source.slice(0, 60)}…`);
  }
  return errors;
}

// -- store ---------------------------------------------------------------------

export interface PracticeStore {
  version: string;
  drills: ReadonlyMap<string, Drill>;
  lessons: ReadonlyMap<string, MicroLesson>;
  /** observation type → lessons callable from its review moments. */
  lessonsByObservation: ReadonlyMap<ObservationType, MicroLesson[]>;
  /** observation type → recommendation. */
  recommendations: ReadonlyMap<ObservationType, PracticeRecommendation>;
  /** Fallback drill id for unknown observation types. */
  fallbackDrillId: string;
}

export interface PracticeSeedSet {
  drills: readonly Drill[];
  lessons: readonly MicroLesson[];
  recommendations: readonly PracticeRecommendation[];
  fallbackDrillId: string;
}

export function createPracticeStore(
  seeds: PracticeSeedSet,
  knownCitations: ReadonlySet<string>,
  allObservationTypes: readonly ObservationType[],
): PracticeStore {
  const errors: PracticeValidationError[] = [];

  const drills = new Map<string, Drill>();
  for (const drill of seeds.drills) {
    if (drills.has(drill.id)) errors.push({ id: drill.id, field: 'id', message: 'duplicate drill id' });
    errors.push(...validateDrill(drill, knownCitations));
    drills.set(drill.id, drill);
  }

  const lessons = new Map<string, MicroLesson>();
  for (const lesson of seeds.lessons) {
    if (lessons.has(lesson.id)) errors.push({ id: lesson.id, field: 'id', message: 'duplicate lesson id' });
    errors.push(...validateLesson(lesson, knownCitations));
    lessons.set(lesson.id, lesson);
  }

  if (!drills.has(seeds.fallbackDrillId)) {
    errors.push({ id: seeds.fallbackDrillId, field: 'fallbackDrillId', message: 'fallback drill id is not a drill in the set' });
  }

  const recommendations = new Map<ObservationType, PracticeRecommendation>();
  const seenRecommendations = new Set<ObservationType>();
  for (const recommendation of seeds.recommendations) {
    if (seenRecommendations.has(recommendation.observationType)) {
      errors.push({ id: recommendation.observationType, field: 'observationType', message: 'duplicate recommendation' });
    }
    seenRecommendations.add(recommendation.observationType);
    if (recommendation.drillIds.length === 0) {
      errors.push({ id: recommendation.observationType, field: 'drillIds', message: 'at least one drill id is required' });
    }
    for (const drillId of recommendation.drillIds) {
      if (!drills.has(drillId)) errors.push({ id: recommendation.observationType, field: 'drillIds', message: `unknown drill id "${drillId}"` });
    }
    recommendations.set(recommendation.observationType, recommendation);
  }

  // full coverage: every known observation type needs a recommendation
  for (const type of allObservationTypes) {
    if (!recommendations.has(type)) {
      errors.push({ id: type, field: 'recommendations', message: 'missing recommendation for observation type' });
    }
  }

  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.id}: ${e.field}: ${e.message}`).join('; ');
    throw new Error(`invalid practice set: ${detail}`);
  }

  const lessonsByObservation = new Map<ObservationType, MicroLesson[]>();
  for (const lesson of lessons.values()) {
    for (const type of lesson.callableFrom) {
      const list = lessonsByObservation.get(type) ?? [];
      list.push(lesson);
      lessonsByObservation.set(type, list);
    }
  }

  return { version: PRACTICE_VERSION, drills, lessons, lessonsByObservation, recommendations, fallbackDrillId: seeds.fallbackDrillId };
}

export function drillById(store: PracticeStore, id: string): Drill | undefined {
  return store.drills.get(id);
}

export function lessonsForObservation(store: PracticeStore, type: ObservationType): MicroLesson[] {
  return store.lessonsByObservation.get(type) ?? [];
}

export function recommendForObservation(store: PracticeStore, type: ObservationType): PracticeRecommendation {
  return store.recommendations.get(type) ?? { observationType: type, drillIds: [store.fallbackDrillId], personaKey: null };
}

/** A practice plan for a set of weakness signals (review observations). */
export function practicePlan(store: PracticeStore, observationTypes: ObservationType[]): PracticeRecommendation[] {
  const seen = new Set<ObservationType>();
  const plan: PracticeRecommendation[] = [];
  for (const type of observationTypes) {
    if (seen.has(type)) continue;
    seen.add(type);
    plan.push(recommendForObservation(store, type));
  }
  return plan;
}
