/**
 * Coaching composer tests (IN-5, BB-231, docs/18 §7): deterministic
 * structured output, evidence-grade register phrasing, L1–L4 claim
 * levels, free-form rejection, §13 fallbacks — valid / invalid /
 * boundary / property per the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  COACH_COMPOSER_VERSION,
  composeCoach,
  ComposerError,
  FALLBACK_RESEARCH_CONTEXT,
  NOOP_LLM,
  selectResearch,
  validateCoachOutput,
  type CoachInput,
  type CoachOutput,
  type LlmProvider,
} from '../src';
import { createKnowledgeBase, type KnowledgeRecord } from '../src';
import { KNOWLEDGE_SEEDS } from '../src';
import { createMappingStore, mappingsFor, OBSERVATION_CONCEPT_MAPPINGS } from '../src';
import { OBSERVATION_TYPES, type MatchObservation, type ObservationType } from '../src';
import type { ReviewMoment } from '../src';

const base = createKnowledgeBase([...KNOWLEDGE_SEEDS]);
const store = createMappingStore(OBSERVATION_CONCEPT_MAPPINGS, OBSERVATION_TYPES);

function observation(type: ObservationType, magnitude?: number): MatchObservation {
  return {
    type,
    version: 'observation-engine-0.1.0',
    ...(magnitude !== undefined ? { magnitude } : {}),
    measurements: {},
    eventRefs: [1],
    confidence: 'deterministic',
    source: 'deterministic',
  };
}

function input(type: ObservationType, research: KnowledgeRecord[] = [], moment: ReviewMoment | null = null): CoachInput {
  return {
    playerId: 'player-0001',
    matchId: 'match-0001',
    observation: observation(type, 3),
    moment,
    concepts: mappingsFor(store, type),
    research,
    objective: null,
  };
}

describe('coaching composer (IN-5)', () => {
  it('produces deterministic structured output for a fixed input', () => {
    const coachInput = input('UNRECIPROCATED_CONCESSION');
    const first = composeCoach(coachInput);
    const second = composeCoach(coachInput);
    expect(second).toEqual(first);
    expect(first.version).toBe(COACH_COMPOSER_VERSION);
    expect(first.observationType).toBe('UNRECIPROCATED_CONCESSION');
    expect(first.headline.level).toBe('L1');
    expect(first.observation.level).toBe('L1');
    expect(first.suggested_action.level).toBe('L4');
    expect(first.practice_recommendation.level).toBe('L4');
    // no research → ONE_POSSIBILITY + fallback context, no invented citations
    expect(first.certainty_language).toBe('ONE_POSSIBILITY');
    expect(first.research_context.text).toBe(FALLBACK_RESEARCH_CONTEXT);
    expect(first.citations).toEqual([]);
    expect(validateCoachOutput(first, coachInput)).toEqual([]);
  });

  it('applies the evidence-grade register from retrieved research', () => {
    // cialdini (grade C) carries RECIPROCITY — matches UNRECIPROCATED_CONCESSION concepts
    const cialdini = base.byId.get('kb-cialdini-influence')!;
    const coachInput = input('UNRECIPROCATED_CONCESSION', [cialdini]);
    const output = composeCoach(coachInput);
    expect(output.certainty_language).toBe('FRAMEWORK_RECOMMENDS');
    expect(output.why_it_matters.text).toMatch(/^A widely used negotiation framework recommends:/);
    expect(output.citations).toEqual([cialdini.citation_text]);
    expect(validateCoachOutput(output, coachInput)).toEqual([]);

    // grade B research (galinsky, FIRST_OFFERS) on STRONG_OPENING_POSITION
    const galinsky = base.byId.get('kb-galinsky-first-offers')!;
    const openingOutput = composeCoach(input('STRONG_OPENING_POSITION', [galinsky]));
    expect(openingOutput.certainty_language).toBe('RESEARCH_SUGGESTS');
    expect(openingOutput.why_it_matters.text).toMatch(/^Research suggests:/);
  });

  it('uses the review moment facts when available (L1 source)', () => {
    const coachInput = input('UNRECIPROCATED_CONCESSION', [], {
      kind: 'UNRECIPROCATED_CONCESSION',
      headline: 'YOU MOVED WHILE THEY HELD',
      detail: 'You conceded 3 times while their position had not changed.',
      eventRefs: [7],
      measurements: {},
    });
    const output = composeCoach(coachInput);
    expect(output.headline.text).toBe('YOU MOVED WHILE THEY HELD');
    expect(output.observation.text).toBe('You conceded 3 times while their position had not changed.');
  });

  it('falls back to deterministic Game Review facts for unknown observation types (§13)', () => {
    const unknown = input('NOT_A_REAL_TYPE' as ObservationType);
    const output = composeCoach(unknown);
    expect(output.certainty_language).toBe('STATES');
    expect(output.headline.text).toBe('GAME REVIEW FALLBACK');
    expect(output.citations).toEqual([]);
    expect(validateCoachOutput(output, unknown)).toEqual([]);
  });

  it('rejects free-form LLM output — never repeats it (§7)', () => {
    const coachInput = input('TIMEOUT');
    const talkative: LlmProvider = { supplement: () => 'Here is a paragraph of free-form advice.' };
    expect(() => composeCoach(coachInput, talkative)).toThrow(ComposerError);
    expect(() => composeCoach(coachInput, talkative)).toThrow(/unsupported free-form output rejected/);

    // the NOOP stub changes nothing: output identical with or without a provider
    const withNoop = composeCoach(coachInput, NOOP_LLM);
    const withoutProvider = composeCoach(coachInput);
    expect(withNoop).toEqual(withoutProvider);
  });

  it('selects research deterministically: best grade, tag intersection, at most 3', () => {
    const selected = selectResearch(
      [...KNOWLEDGE_SEEDS],
      mappingsFor(store, 'FAILED_POSITIVE_ZOPA'),
    );
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(3);
    const gradeRank = { A: 0, B: 1, C: 2, D: 3 };
    for (let i = 1; i < selected.length; i++) {
      expect(gradeRank[selected[i]!.evidence_level]).toBeGreaterThanOrEqual(gradeRank[selected[i - 1]!.evidence_level]);
    }
    const concepts = new Set(mappingsFor(store, 'FAILED_POSITIVE_ZOPA').map((c) => c.concept));
    for (const record of selected) {
      expect(record.ontology_tags.some((tag) => concepts.has(tag))).toBe(true);
    }
    // determinism
    expect(selectResearch([...KNOWLEDGE_SEEDS], mappingsFor(store, 'FAILED_POSITIVE_ZOPA'))).toEqual(selected);
  });

  it('rejects structurally invalid output', () => {
    const coachInput = input('TIMEOUT');
    const output = composeCoach(coachInput);
    const tampered: CoachOutput = { ...output, citations: ['Fabricated citation.'] };
    expect(validateCoachOutput(tampered, coachInput).map((e) => e.field)).toEqual(['citations']);

    const badLevel: CoachOutput = { ...output, headline: { level: 'L4', text: output.headline.text } };
    expect(validateCoachOutput(badLevel, coachInput).map((e) => e.field)).toContain('headline');

    const badCertainty: CoachOutput = { ...output, certainty_language: 'PROBABLY' as never };
    expect(validateCoachOutput(badCertainty, coachInput).map((e) => e.field)).toContain('certainty_language');

    const tooManyCitations = input('TIMEOUT', [...KNOWLEDGE_SEEDS.slice(0, 10)]);
    expect(() => selectResearch(tooManyCitations.research, tooManyCitations.concepts)).not.toThrow(); // selection caps at 3
    const capped = composeCoach(tooManyCitations);
    expect(capped.citations.length).toBeLessThanOrEqual(3);
  });
});
