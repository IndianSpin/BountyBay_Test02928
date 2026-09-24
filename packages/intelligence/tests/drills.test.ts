/**
 * Practice system tests (IN-6, BB-237, docs/18 §8): drill schema
 * enforcement — including the no-universal-answer rule — lesson
 * validation, recommendation lookups — valid / invalid / boundary /
 * property per the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  createPracticeStore,
  drillById,
  lessonsForObservation,
  PRACTICE_VERSION,
  practicePlan,
  recommendForObservation,
  type Drill,
  type MicroLesson,
  type PracticeRecommendation,
  type PracticeSeedSet,
} from '../src';
import { KNOWLEDGE_SEEDS } from '../src';
import { OBSERVATION_TYPES } from '../src';

const KNOWN_CITATIONS = new Set(KNOWLEDGE_SEEDS.map((record) => record.citation_text));

function drill(overrides: Partial<Drill> = {}): Drill {
  return {
    id: 'drill-test',
    version: PRACTICE_VERSION,
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'Test drill',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: 800, timeRemainingMs: 60000, chipsRemaining: 50, roundNumber: 3 },
    privateInfo: {},
    options: [
      { id: 'a', label: 'Option A', outcome: 'Outcome A.', teachingNote: 'Note A.' },
      { id: 'b', label: 'Option B', outcome: 'Outcome B.', teachingNote: 'Note B.' },
    ],
    teachingObjective: 'Test objective.',
    conceptTags: ['ANCHORING'],
    explanation: 'Test explanation.',
    sources: [KNOWLEDGE_SEEDS[0]!.citation_text],
    benchmark: null,
    ...overrides,
  };
}

function lesson(overrides: Partial<MicroLesson> = {}): MicroLesson {
  return {
    id: 'lesson-test',
    version: PRACTICE_VERSION,
    title: 'Test lesson',
    minutes: 2,
    conceptTags: ['ANCHORING'],
    steps: [{ text: 'A step.', level: 'L1' }],
    sources: [KNOWLEDGE_SEEDS[0]!.citation_text],
    callableFrom: ['STRONG_OPENING_POSITION'],
    ...overrides,
  };
}

function seeds(overrides: Partial<PracticeSeedSet> = {}): PracticeSeedSet {
  return {
    drills: [drill()],
    lessons: [lesson()],
    recommendations: [{ observationType: 'STRONG_OPENING_POSITION', drillIds: ['drill-test'], personaKey: 'anchor' }],
    fallbackDrillId: 'drill-test',
    ...overrides,
  };
}

describe('practice system (IN-6)', () => {
  it('builds a store with deterministic lookups', () => {
    const store = createPracticeStore(
      seeds({
        lessons: [
          lesson({ callableFrom: ['STRONG_OPENING_POSITION', 'LARGE_OPENING'] }),
        ],
        recommendations: OBSERVATION_TYPES.map((observationType) => ({
          observationType,
          drillIds: ['drill-test'],
          personaKey: 'anchor',
        })),
      }),
      KNOWN_CITATIONS,
      OBSERVATION_TYPES,
    );
    expect(store.version).toBe(PRACTICE_VERSION);
    expect(drillById(store, 'drill-test')!.title).toBe('Test drill');
    expect(lessonsForObservation(store, 'STRONG_OPENING_POSITION').map((l) => l.id)).toEqual(['lesson-test']);
    expect(lessonsForObservation(store, 'TIMEOUT')).toEqual([]);
    const recommendation = recommendForObservation(store, 'STRONG_OPENING_POSITION');
    expect(recommendation.personaKey).toBe('anchor');
    // deterministic
    expect(recommendForObservation(store, 'STRONG_OPENING_POSITION')).toEqual(recommendation);
  });

  it('enforces the no-universal-answer rule structurally', () => {
    // a single option implies one universal answer → rejected
    const singleOption = drill({ options: [drill().options[0]!] });
    expect(() => createPracticeStore(seeds({ drills: [singleOption] }), KNOWN_CITATIONS, OBSERVATION_TYPES)).toThrow(
      /at least 2 options are required/,
    );
    // two options with the SAME outcome imply one answer → rejected
    const sameOutcome = drill({
      options: [
        { id: 'a', label: 'Option A', outcome: 'Same outcome.', teachingNote: 'Note A.' },
        { id: 'b', label: 'Option B', outcome: 'Same outcome.', teachingNote: 'Note B.' },
      ],
    });
    expect(() => createPracticeStore(seeds({ drills: [sameOutcome] }), KNOWN_CITATIONS, OBSERVATION_TYPES)).toThrow(
      /outcomes must be pairwise distinct/,
    );
  });

  it('rejects invalid drills and lessons', () => {
    const cases: Array<[PracticeSeedSet, RegExp]> = [
      [seeds({ drills: [drill({ conceptTags: ['NOT_A_TAG'] })] }), /unknown ontology tag/],
      [seeds({ drills: [drill({ sources: ['Fabricated, I. (2000). Made up.'] })] }), /source not present in the knowledge base/],
      [seeds({ drills: [drill({ benchmark: {} as never })] }), /benchmark must be null until IN-8/],
      [seeds({ drills: [drill({ scenario: { ...drill().scenario, reservationValueTenths: 0 } })] }), /reservationValueTenths must be a positive integer/],
      [seeds({ drills: [drill(), drill({ id: 'drill-test' })] }), /duplicate drill id/],
      [seeds({ lessons: [lesson({ minutes: 6 })] }), /minutes must be an integer in 1–5/],
      [seeds({ lessons: [lesson({ minutes: 0 })] }), /minutes must be an integer in 1–5/],
      [seeds({ lessons: [lesson({ callableFrom: [] })] }), /at least one callableFrom/],
      [seeds({ lessons: [lesson({ sources: ['Nope (1999). Nothing.'] })] }), /source not present in the knowledge base/],
      [seeds({ recommendations: [{ observationType: 'STRONG_OPENING_POSITION', drillIds: ['drill-ghost'], personaKey: null }] }), /unknown drill id/],
      [seeds({ fallbackDrillId: 'drill-ghost' }), /fallback drill id is not a drill/],
    ];
    for (const [bad, pattern] of cases) {
      expect(() => createPracticeStore(bad, KNOWN_CITATIONS, OBSERVATION_TYPES)).toThrow(pattern);
    }
  });

  it('requires full recommendation coverage of the observation vocabulary', () => {
    // seeds() only covers STRONG_OPENING_POSITION — the other 25 types must fail
    expect(() => createPracticeStore(seeds(), KNOWN_CITATIONS, OBSERVATION_TYPES)).toThrow(/missing recommendation for observation type/);
  });

  it('falls back deterministically for unknown observation types', () => {
    const store = createPracticeStore(
      seeds({
        recommendations: OBSERVATION_TYPES.map((observationType) => ({
          observationType,
          drillIds: ['drill-test'],
          personaKey: null,
        })),
      }),
      KNOWN_CITATIONS,
      OBSERVATION_TYPES,
    );
    const unknown = recommendForObservation(store, 'NOT_A_REAL_TYPE' as never);
    expect(unknown.drillIds).toEqual(['drill-test']);
    expect(unknown.personaKey).toBeNull();
    // empty plan → empty list; duplicates collapse
    expect(practicePlan(store, [])).toEqual([]);
    const plan = practicePlan(store, ['TIMEOUT', 'TIMEOUT', 'DEADLOCK']);
    expect(plan.map((p) => p.observationType)).toEqual(['TIMEOUT', 'DEADLOCK']);
  });

  it('is deterministic: the same seeds build the same store', () => {
    const full: PracticeRecommendation[] = OBSERVATION_TYPES.map((observationType) => ({
      observationType,
      drillIds: ['drill-test'],
      personaKey: 'anchor',
    }));
    const first = createPracticeStore(seeds({ recommendations: full }), KNOWN_CITATIONS, OBSERVATION_TYPES);
    const second = createPracticeStore(seeds({ recommendations: full }), KNOWN_CITATIONS, OBSERVATION_TYPES);
    for (const type of OBSERVATION_TYPES) {
      expect(recommendForObservation(second, type)).toEqual(recommendForObservation(first, type));
    }
  });
});
