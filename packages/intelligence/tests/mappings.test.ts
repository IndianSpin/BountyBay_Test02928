/**
 * Observation→concept mapping tests (IN-5, BB-231, docs/18 §6): full
 * deterministic coverage of the observation vocabulary, weight-ordered
 * lookups, strict validation — valid / invalid / boundary / property
 * per the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  coveredTypes,
  createMappingStore,
  mappingsFor,
  MAPPINGS_VERSION,
  OBSERVATION_CONCEPT_MAPPINGS,
  referencedConcepts,
  unreferencedConcepts,
  validateMappings,
  type ObservationMapping,
} from '../src';
import { OBSERVATION_TYPES, type ObservationType } from '../src';
import { ALL_ONTOLOGY_TAGS, isOntologyTag } from '../src';

describe('observation→concept mappings (IN-5)', () => {
  const store = createMappingStore(OBSERVATION_CONCEPT_MAPPINGS, OBSERVATION_TYPES);

  it('builds with full coverage of all 26 observation types', () => {
    expect(store.version).toBe(MAPPINGS_VERSION);
    expect(coveredTypes(store).sort()).toEqual([...OBSERVATION_TYPES].sort());
    expect(validateMappings(OBSERVATION_CONCEPT_MAPPINGS)).toEqual([]);
  });

  it('returns weight-ordered, tag-valid concepts deterministically', () => {
    const concepts = mappingsFor(store, 'UNRECIPROCATED_CONCESSION');
    expect(concepts.length).toBeGreaterThan(0);
    const weights = concepts.map((c) => c.relevanceWeight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
    for (const concept of concepts) {
      expect(isOntologyTag(concept.concept)).toBe(true);
      expect(concept.relevanceWeight).toBeGreaterThan(0);
      expect(concept.relevanceWeight).toBeLessThanOrEqual(1);
      expect(concept.conditions.trim().length).toBeGreaterThan(0);
    }
    // §6 canonical example: FAILED_POSITIVE_ZOPA → impasse / closing / walk-away decisions
    const failed = mappingsFor(store, 'FAILED_POSITIVE_ZOPA').map((c) => c.concept);
    expect(failed).toContain('IMPASSE');
    expect(failed).toContain('FAILED_ZOPA');
    expect(failed).toContain('WALK_AWAY_DECISIONS');
    // deterministic
    expect(mappingsFor(store, 'UNRECIPROCATED_CONCESSION')).toEqual(concepts);
  });

  it('rejects invalid mappings', () => {
    const badConcept: ObservationMapping = {
      type: 'TIMEOUT',
      version: MAPPINGS_VERSION,
      concepts: [{ concept: 'NOT_A_TAG', relevanceWeight: 0.5, conditions: 'x' }],
    };
    expect(validateMappings([badConcept])).toEqual([{ type: 'TIMEOUT', message: 'unknown ontology concept "NOT_A_TAG"' }]);

    const badWeight: ObservationMapping = {
      type: 'TIMEOUT',
      version: MAPPINGS_VERSION,
      concepts: [{ concept: 'TIME_PRESSURE', relevanceWeight: 0, conditions: 'x' }],
    };
    expect(validateMappings([badWeight])).toEqual([{ type: 'TIMEOUT', message: expect.stringMatching(/relevance weight must be in \(0, 1\]/) }]);

    const badVersion: ObservationMapping = {
      type: 'TIMEOUT',
      version: '0.0.0',
      concepts: [{ concept: 'TIME_PRESSURE', relevanceWeight: 0.5, conditions: 'x' }],
    };
    expect(validateMappings([badVersion])).toEqual([{ type: 'TIMEOUT', message: expect.stringMatching(/version must be/) }]);

    const duplicateConcept: ObservationMapping = {
      type: 'TIMEOUT',
      version: MAPPINGS_VERSION,
      concepts: [
        { concept: 'TIME_PRESSURE', relevanceWeight: 0.9, conditions: 'a' },
        { concept: 'TIME_PRESSURE', relevanceWeight: 0.5, conditions: 'b' },
      ],
    };
    expect(validateMappings([duplicateConcept])).toEqual([{ type: 'TIMEOUT', message: 'duplicate concept TIME_PRESSURE' }]);

    const empty: ObservationMapping = { type: 'TIMEOUT', version: MAPPINGS_VERSION, concepts: [] };
    expect(validateMappings([empty])).toEqual([{ type: 'TIMEOUT', message: 'at least one concept mapping is required' }]);

    const duplicateType = [OBSERVATION_CONCEPT_MAPPINGS[0]!, { ...OBSERVATION_CONCEPT_MAPPINGS[0]! }];
    expect(validateMappings(duplicateType).map((e) => e.message)).toEqual([
      expect.stringMatching(/duplicate mapping for observation type/),
    ]);

    // missing coverage for a known type → store build throws
    expect(() => createMappingStore([OBSERVATION_CONCEPT_MAPPINGS[0]!], OBSERVATION_TYPES)).toThrow(/missing mapping for observation type/);
  });

  it('audits the concept vocabulary (moat)', () => {
    const referenced = referencedConcepts(store);
    for (const concept of referenced) expect(ALL_ONTOLOGY_TAGS).toContain(concept);
    const unreferenced = unreferencedConcepts(store);
    for (const concept of unreferenced) expect(referenced.has(concept)).toBe(false);
    expect([...referenced, ...unreferenced].sort()).toEqual([...ALL_ONTOLOGY_TAGS].sort());
  });

  it('is deterministic: two stores built from the same rows are equal', () => {
    const again = createMappingStore(OBSERVATION_CONCEPT_MAPPINGS, OBSERVATION_TYPES);
    for (const type of OBSERVATION_TYPES as ObservationType[]) {
      expect(mappingsFor(again, type)).toEqual(mappingsFor(store, type));
    }
  });
});
