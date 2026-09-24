/**
 * Seed-record integrity tests (IN-4, BB-227): every curated seed passes
 * validation, grade rules and provenance rules; the set spans the §4
 * categories; conflicting research is present and preserved.
 */

import { describe, expect, it } from 'vitest';
import { createKnowledgeBase, gradeCounts, type EvidenceGrade } from '../src/knowledge';
import { KNOWLEDGE_SEEDS } from '../src/knowledge-seeds';
import { ALL_ONTOLOGY_TAGS, ONTOLOGY_CATEGORIES, categoriesOfTag } from '../src/ontology';

describe('knowledge seeds (IN-4)', () => {
  const base = createKnowledgeBase([...KNOWLEDGE_SEEDS]);

  it('has 20–30 curated records, all passing validation', () => {
    expect(KNOWLEDGE_SEEDS.length).toBeGreaterThanOrEqual(20);
    expect(KNOWLEDGE_SEEDS.length).toBeLessThanOrEqual(30);
    expect(base.records).toHaveLength(KNOWLEDGE_SEEDS.length); // no throw = all valid
  });

  it('every seed carries provenance and ships as DRAFT for review', () => {
    for (const record of KNOWLEDGE_SEEDS) {
      expect(record.authors.length).toBeGreaterThan(0);
      expect(record.publication.trim().length).toBeGreaterThan(0);
      expect(record.citation_text.trim().length).toBeGreaterThan(0);
      expect(Number.isInteger(record.year)).toBe(true);
      expect(record.review_status).toBe('DRAFT');
      expect(record.reviewed_by).toBeNull();
      for (const tag of record.ontology_tags) {
        expect(ALL_ONTOLOGY_TAGS).toContain(tag);
      }
    }
  });

  it('grade discipline holds across the set (A/B empirical, D contested)', () => {
    for (const record of KNOWLEDGE_SEEDS) {
      if (record.evidence_level === 'A' || record.evidence_level === 'B') {
        expect(['OPEN_ACCESS_PAPER', 'LICENSED_MATERIAL']).toContain(record.source_type);
      }
      expect(['A', 'B', 'C', 'D']).toContain(record.evidence_level as EvidenceGrade);
    }
    const counts = gradeCounts(base);
    expect(counts.A).toBeGreaterThanOrEqual(1); // meta-analytic records
    expect(counts.B).toBeGreaterThanOrEqual(5);
    expect(counts.C).toBeGreaterThanOrEqual(5);
    expect(counts.D).toBeGreaterThanOrEqual(1); // contested practitioner record
    expect(counts.A + counts.B + counts.C + counts.D).toBe(KNOWLEDGE_SEEDS.length);
  });

  it('spans every §4 ontology category', () => {
    const used = new Set(KNOWLEDGE_SEEDS.flatMap((record) => record.ontology_tags).flatMap((tag) => categoriesOfTag(tag)));
    for (const category of ONTOLOGY_CATEGORIES) {
      expect(used.has(category), `category ${category} has no seed records`).toBe(true);
    }
  });

  it('preserves the anchoring conflict pair (§5 conflicting research)', () => {
    const conflict = base.conflicts.get('FIRST_OFFERS') ?? base.conflicts.get('ANCHORING');
    expect(conflict).toBeDefined();
    expect(conflict!.length).toBeGreaterThanOrEqual(2);
    // both sides retrievable with their conditions intact
    const all = base.byTag.get('FIRST_OFFERS') ?? [];
    for (const record of all) {
      expect(record.conditions.trim().length).toBeGreaterThan(0);
      expect(record.limitations.trim().length).toBeGreaterThan(0);
    }
  });

  it('never invents DOIs: doi_url is either null or a doi.org URL', () => {
    for (const record of KNOWLEDGE_SEEDS) {
      if (record.doi_url !== null) {
        expect(record.doi_url).toMatch(/^https:\/\/doi\.org\/10\./);
      }
    }
  });
});
