/**
 * Knowledge base tests (IN-4, BB-227, docs/18 §5): schema enforcement,
 * evidence-grade discipline, provenance, conflicting-research
 * preservation — valid / invalid / boundary / property per the AGENTS.md
 * testing rule.
 */

import { describe, expect, it } from 'vitest';
import { categoriesOfTag, ONTOLOGY_CATEGORIES, type OntologyCategory } from '../src/ontology';
import {
  createKnowledgeBase,
  gradeCounts,
  gradeStatement,
  KNOWLEDGE_BASE_VERSION,
  categoryCoverage,
  type KnowledgeRecord,
} from '../src';

function record(overrides: Partial<KnowledgeRecord> = {}): KnowledgeRecord {
  return {
    id: 'kb-test',
    title: 'Test record',
    summary: 'A test record.',
    ontology_tags: ['ANCHORING'],
    claim: 'A test claim.',
    practical_implication: 'A test implication.',
    conditions: 'Test conditions.',
    limitations: 'Test limitations.',
    evidence_level: 'B',
    source_type: 'LICENSED_MATERIAL',
    authors: ['Test Author'],
    year: 2000,
    publication: 'Test Journal',
    doi_url: null,
    citation_text: 'Author, T. (2000). Test record. Test Journal.',
    license_access: { license: null, access: 'SUBSCRIPTION' },
    review_status: 'DRAFT',
    reviewed_by: null,
    created_at: 1744243200000,
    version: '0.1.0',
    ...overrides,
  };
}

describe('knowledge base (IN-4)', () => {
  it('stores valid records and serves typed lookups', () => {
    const alpha = record({ id: 'kb-alpha', claim: 'A claim.' });
    const beta = record({ id: 'kb-beta', ontology_tags: ['TRUST'], evidence_level: 'C', source_type: 'BIBLIOGRAPHIC_REFERENCE', claim: 'B claim.' });
    const base = createKnowledgeBase([alpha, beta]);
    expect(base.version).toBe(KNOWLEDGE_BASE_VERSION);
    expect(base.records).toHaveLength(2);
    expect(base.byId.get('kb-alpha')).toBe(alpha);
    expect(base.byTag.get('ANCHORING')).toEqual([alpha]);
    expect(base.byTag.get('TRUST')).toEqual([beta]);
    expect(base.byGrade.get('B')).toEqual([alpha]);
    expect(base.byGrade.get('C')).toEqual([beta]);
    expect(gradeCounts(base)).toEqual({ A: 0, B: 1, C: 1, D: 0 });
    expect(base.conflicts.size).toBe(0);
  });

  it('preserves conflicting research: same tag, different claims, never merged', () => {
    const first = record({ id: 'kb-a', ontology_tags: ['FIRST_OFFERS'], claim: 'First offers anchor outcomes.' });
    const second = record({ id: 'kb-b', ontology_tags: ['FIRST_OFFERS'], claim: 'Never make the first offer.', evidence_level: 'D', source_type: 'CURATED_SUMMARY', license_access: { license: null, access: 'OPEN' } });
    const agreeing = record({ id: 'kb-c', ontology_tags: ['FIRST_OFFERS'], claim: 'First offers anchor outcomes.' });
    const base = createKnowledgeBase([first, second, agreeing]);
    expect(base.byTag.get('FIRST_OFFERS')).toHaveLength(3);
    const conflict = base.conflicts.get('FIRST_OFFERS');
    expect(conflict).toBeDefined();
    expect(conflict).toHaveLength(2);
    expect(conflict![0]!.map((r) => r.id).sort()).toEqual(['kb-a', 'kb-c']);
    expect(conflict![1]!.map((r) => r.id)).toEqual(['kb-b']);
  });

  it('applies the fixed per-grade coaching register phrasing (§5)', () => {
    const gradeB = gradeStatement(record({ claim: 'X is the case.' }));
    expect(gradeB.register).toBe('RESEARCH_SUGGESTS');
    expect(gradeB.phrase).toBe('Research suggests: X is the case.');
    expect(gradeB.citation).toBe('Author, T. (2000). Test record. Test Journal.');

    const gradeC = gradeStatement(record({ evidence_level: 'C', source_type: 'BIBLIOGRAPHIC_REFERENCE', claim: 'Do Y.' }));
    expect(gradeC.register).toBe('FRAMEWORK_RECOMMENDS');
    expect(gradeC.phrase).toBe('A widely used negotiation framework recommends: Do Y.');

    const gradeD = gradeStatement(record({ evidence_level: 'D', source_type: 'CURATED_SUMMARY', claim: 'Try Z.' }));
    expect(gradeD.register).toBe('PRACTITIONER_APPROACH');
    expect(gradeD.phrase).toBe('One practitioner approach is: Try Z.');
  });

  it('rejects records that break the schema or the grade rules', () => {
    const bad = (overrides: Partial<KnowledgeRecord>, pattern: RegExp) => {
      expect(() => createKnowledgeBase([record(overrides)])).toThrow(pattern);
    };
    bad({ id: '  ' }, /id is required/);
    bad({ title: '' }, /title is required/);
    bad({ ontology_tags: [] }, /at least one ontology tag/);
    bad({ ontology_tags: ['NOT_A_TAG'] }, /unknown ontology tag/);
    bad({ evidence_level: 'X' as never }, /evidence_level/);
    bad({ source_type: 'WIKIPEDIA' as never }, /unknown source_type/);
    bad({ authors: [] }, /authors/);
    bad({ authors: [' '] }, /authors/);
    bad({ year: 42 }, /year/);
    bad({ version: 'v1' }, /version/);
    bad({ created_at: Number.NaN }, /created_at/);
    bad({ citation_text: '' }, /citation_text/);
    bad({ publication: '' }, /publication/);
    bad({ review_status: 'APPROVED' as never }, /review_status/);
    // grade discipline: A/B require empirical sources
    bad({ evidence_level: 'A', source_type: 'BIBLIOGRAPHIC_REFERENCE' }, /grade A requires an empirical source/);
    bad({ evidence_level: 'B', source_type: 'CURATED_SUMMARY' }, /grade B requires an empirical source/);
  });

  it('rejects duplicate ids and handles the empty base', () => {
    expect(() => createKnowledgeBase([record(), record()])).toThrow(/duplicate knowledge record id/);
    const empty = createKnowledgeBase([]);
    expect(empty.records).toEqual([]);
    expect(empty.byId.size).toBe(0);
    expect(empty.conflicts.size).toBe(0);
    expect(gradeCounts(empty)).toEqual({ A: 0, B: 0, C: 0, D: 0 });
  });

  it('maps tags to their §4 categories and reports coverage', () => {
    expect(categoriesOfTag('ANCHORING')).toEqual(['OPENING', 'DECISION_BIASES']); // spans two §4 categories
    expect(categoriesOfTag('BATNA')).toEqual(['PREPARATION']);
    expect(categoriesOfTag('NOT_A_TAG')).toEqual([]);

    const base = createKnowledgeBase([
      record({ id: 'kb-1', ontology_tags: ['ANCHORING'] }),
      record({ id: 'kb-2', ontology_tags: ['BATNA'] }),
    ]);
    const coverage = categoryCoverage(base);
    expect(coverage.DECISION_BIASES).toBe(1);
    expect(coverage.PREPARATION).toBe(1);
    expect(coverage.CLOSING).toBe(0);
    for (const category of ONTOLOGY_CATEGORIES) {
      expect(typeof coverage[category as OntologyCategory]).toBe('number');
    }
  });

  it('is deterministic: same input builds an identical base', () => {
    const records = [record({ id: 'kb-x' }), record({ id: 'kb-y', ontology_tags: ['TRUST'] })];
    const first = createKnowledgeBase(records);
    const second = createKnowledgeBase(records);
    expect(second.records).toEqual(first.records);
    expect([...second.byTag.keys()]).toEqual([...first.byTag.keys()]);
    expect(gradeCounts(second)).toEqual(gradeCounts(first));
  });
});
