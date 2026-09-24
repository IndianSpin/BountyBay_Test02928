/**
 * Starter practice-set integrity tests (IN-6, BB-237): every seed
 * drill and lesson validates against the schema, the canonical §8
 * example holds, and all 26 observation types have recommendations.
 */

import { describe, expect, it } from 'vitest';
import { createPracticeStore, PRACTICE_SEEDS, recommendForObservation } from '../src';
import { KNOWLEDGE_SEEDS } from '../src';
import { OBSERVATION_TYPES } from '../src';

const KNOWN_CITATIONS = new Set(KNOWLEDGE_SEEDS.map((record) => record.citation_text));

describe('practice seeds (IN-6)', () => {
  const store = createPracticeStore(PRACTICE_SEEDS, KNOWN_CITATIONS, OBSERVATION_TYPES);

  it('ships 10 drills and 5 micro-lessons, all validating', () => {
    expect(store.drills.size).toBe(10);
    expect(store.lessons.size).toBe(5);
    for (const drill of store.drills.values()) {
      expect(drill.kind).toBe('WHAT_WOULD_YOU_DO');
      expect(drill.options.length).toBeGreaterThanOrEqual(2);
      expect(drill.benchmark).toBeNull();
      expect(drill.sources.length).toBeGreaterThanOrEqual(1);
    }
    for (const lesson of store.lessons.values()) {
      expect(lesson.minutes).toBeGreaterThanOrEqual(1);
      expect(lesson.minutes).toBeLessThanOrEqual(5);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(1);
      expect(lesson.callableFrom.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('enforces the no-universal-answer rule across the set', () => {
    for (const drill of store.drills.values()) {
      const outcomes = drill.options.map((option) => option.outcome);
      expect(new Set(outcomes).size).toBe(outcomes.length);
      // the schema has no correctness field: no option is marked the answer
      for (const option of drill.options) {
        expect(Object.keys(option).sort()).toEqual(['id', 'label', 'outcome', 'teachingNote']);
      }
    }
  });

  it('holds the canonical §8 example: UNRECIPROCATED CONCESSIONS → PLAY THE WALL', () => {
    const recommendation = recommendForObservation(store, 'UNRECIPROCATED_CONCESSION');
    expect(recommendation.personaKey).toBe('wall');
    expect(recommendation.drillIds).toContain('drill-unreciprocated');
  });

  it('covers all 26 observation types with drill + persona recommendations', () => {
    for (const type of OBSERVATION_TYPES) {
      const recommendation = recommendForObservation(store, type);
      expect(recommendation.drillIds.length).toBeGreaterThanOrEqual(1);
      expect(recommendation.observationType).toBe(type);
    }
  });

  it('cites every drill and lesson from the founder-REVIEWED knowledge base', () => {
    for (const drill of store.drills.values()) {
      for (const source of drill.sources) {
        expect(KNOWN_CITATIONS.has(source)).toBe(true);
      }
    }
    for (const lesson of store.lessons.values()) {
      for (const source of lesson.sources) {
        expect(KNOWN_CITATIONS.has(source)).toBe(true);
      }
    }
    // every lesson is callable from at least one review observation type
    for (const type of OBSERVATION_TYPES) {
      const lessons = store.lessonsByObservation.get(type);
      if (lessons && lessons.length > 0) {
        for (const lesson of lessons) expect(lesson.callableFrom).toContain(type);
      }
    }
  });
});
