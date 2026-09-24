/**
 * Negotiation knowledge base (IN-4, DEC-028, docs/18 §5 + docs/20
 * "Knowledge base"). Pure store of structured knowledge records with
 * evidence-grade discipline.
 *
 * - Full §5 schema, enforced by deterministic validation.
 * - Evidence grades A–D with structural rules: A/B claim empirical
 *   support (source must be an open-access paper or licensed material);
 *   C is an established practitioner framework; D is a practitioner
 *   heuristic or contested claim. Conflicting research is PRESERVED —
 *   two records may share tags with different claims; the store never
 *   merges or resolves them.
 * - Provenance is mandatory: authors + year + publication +
 *   citation_text on every record; doi/url optional but never invented.
 * - The coaching register phrasing (§5) is fixed per grade:
 *   A/B "Research suggests…", C "A widely used negotiation framework
 *   recommends…", D "One practitioner approach is…".
 * - No I/O, no clocks: created_at values are explicit record data.
 */

import { categoriesOfTag, isOntologyTag, ONTOLOGY_CATEGORIES, type OntologyCategory } from './ontology';

export const KNOWLEDGE_BASE_VERSION = 'knowledge-base-0.1.0';

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';

export const EVIDENCE_GRADES: readonly EvidenceGrade[] = ['A', 'B', 'C', 'D'];

export type SourceType = 'OPEN_ACCESS_PAPER' | 'LICENSED_MATERIAL' | 'BIBLIOGRAPHIC_REFERENCE' | 'CURATED_SUMMARY';

export type ReviewStatus = 'DRAFT' | 'REVIEWED' | 'SUPERSEDED';

export interface LicenseAccess {
  /** SPDX-style license expression where known, else null. */
  license: string | null;
  access: 'OPEN' | 'SUBSCRIPTION' | 'PUBLISHED_BOOK';
}

export interface KnowledgeRecord {
  id: string;
  title: string;
  summary: string;
  /** Tags from the §4 ontology vocabulary only. */
  ontology_tags: string[];
  /** The single core claim, in plain descriptive language. */
  claim: string;
  practical_implication: string;
  /** When the claim is expected to hold (scope/context). */
  conditions: string;
  /** Known limits of the evidence. */
  limitations: string;
  evidence_level: EvidenceGrade;
  source_type: SourceType;
  authors: string[];
  year: number;
  publication: string;
  /** DOI or URL when confidently known — never invented. */
  doi_url: string | null;
  citation_text: string;
  license_access: LicenseAccess;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  /** Explicit data (no clock reads — purity rule). */
  created_at: number;
  version: string;
}

export interface RecordValidationError {
  recordId: string;
  field: string;
  message: string;
}

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/** §5 provenance: these fields must carry real content on every record. */
function validateRecord(record: KnowledgeRecord): RecordValidationError[] {
  const errors: RecordValidationError[] = [];
  const fail = (field: string, message: string) => errors.push({ recordId: record.id, field, message });

  if (!record.id || record.id.trim() === '') fail('id', 'id is required');
  if (!record.title || record.title.trim() === '') fail('title', 'title is required');
  if (!record.summary || record.summary.trim() === '') fail('summary', 'summary is required');
  if (!record.claim || record.claim.trim() === '') fail('claim', 'claim is required');
  if (!record.practical_implication || record.practical_implication.trim() === '') fail('practical_implication', 'practical_implication is required');
  if (!record.conditions || record.conditions.trim() === '') fail('conditions', 'conditions are required');
  if (!record.limitations || record.limitations.trim() === '') fail('limitations', 'limitations are required');
  if (!record.citation_text || record.citation_text.trim() === '') fail('citation_text', 'citation_text is required (provenance)');
  if (!record.publication || record.publication.trim() === '') fail('publication', 'publication is required (provenance)');
  if (!Number.isInteger(record.year) || record.year < 1800 || record.year > 2100) fail('year', 'year must be an integer in [1800, 2100]');
  if (!Number.isFinite(record.created_at)) fail('created_at', 'created_at must be a finite timestamp');
  if (!SEMVER_PATTERN.test(record.version)) fail('version', `version must be semver-like x.y.z (got ${record.version})`);

  if (!Array.isArray(record.authors) || record.authors.length === 0 || record.authors.some((a) => !a || a.trim() === '')) {
    fail('authors', 'authors must be a non-empty list of non-empty names (provenance)');
  }

  if (!Array.isArray(record.ontology_tags) || record.ontology_tags.length === 0) {
    fail('ontology_tags', 'at least one ontology tag is required');
  } else {
    for (const tag of record.ontology_tags) {
      if (!isOntologyTag(tag)) fail('ontology_tags', `unknown ontology tag "${tag}" (§4 vocabulary only)`);
    }
  }

  if (!EVIDENCE_GRADES.includes(record.evidence_level)) {
    fail('evidence_level', `evidence_level must be one of A–D (got ${record.evidence_level})`);
  }

  // Grade discipline: A/B claim empirical support — the source must be
  // empirical literature, not a practitioner book or a summary.
  if (
    (record.evidence_level === 'A' || record.evidence_level === 'B') &&
    record.source_type !== 'OPEN_ACCESS_PAPER' &&
    record.source_type !== 'LICENSED_MATERIAL'
  ) {
    fail('source_type', `grade ${record.evidence_level} requires an empirical source (OPEN_ACCESS_PAPER or LICENSED_MATERIAL), got ${record.source_type}`);
  }
  if (record.source_type !== 'OPEN_ACCESS_PAPER' && record.source_type !== 'LICENSED_MATERIAL' && record.source_type !== 'BIBLIOGRAPHIC_REFERENCE' && record.source_type !== 'CURATED_SUMMARY') {
    fail('source_type', `unknown source_type "${record.source_type}"`);
  }
  if (record.doi_url !== null && typeof record.doi_url !== 'string') fail('doi_url', 'doi_url must be a string or null');
  if (!['DRAFT', 'REVIEWED', 'SUPERSEDED'].includes(record.review_status)) fail('review_status', `unknown review_status "${record.review_status}"`);
  if (record.reviewed_by !== null && typeof record.reviewed_by !== 'string') fail('reviewed_by', 'reviewed_by must be a string or null');

  return errors;
}

// -- coaching register (§5) ---------------------------------------------------

export interface GradeStatement {
  grade: EvidenceGrade;
  register: 'RESEARCH_SUGGESTS' | 'FRAMEWORK_RECOMMENDS' | 'PRACTITIONER_APPROACH';
  phrase: string;
  citation: string;
}

/**
 * Fixed per-grade coaching-register phrasing (§5): A/B "Research
 * suggests…", C "A widely used negotiation framework recommends…",
 * D "One practitioner approach is…". The citation always rides along —
 * no claim without provenance, even in the register.
 */
export function gradeStatement(record: KnowledgeRecord): GradeStatement {
  if (record.evidence_level === 'A' || record.evidence_level === 'B') {
    return {
      grade: record.evidence_level,
      register: 'RESEARCH_SUGGESTS',
      phrase: `Research suggests: ${record.claim}`,
      citation: record.citation_text,
    };
  }
  if (record.evidence_level === 'C') {
    return {
      grade: 'C',
      register: 'FRAMEWORK_RECOMMENDS',
      phrase: `A widely used negotiation framework recommends: ${record.claim}`,
      citation: record.citation_text,
    };
  }
  return {
    grade: 'D',
    register: 'PRACTITIONER_APPROACH',
    phrase: `One practitioner approach is: ${record.claim}`,
    citation: record.citation_text,
  };
}

// -- store ---------------------------------------------------------------------

export interface KnowledgeBase {
  version: string;
  records: KnowledgeRecord[];
  byId: ReadonlyMap<string, KnowledgeRecord>;
  /** All records carrying the tag — conflicting claims preserved side by side. */
  byTag: ReadonlyMap<string, KnowledgeRecord[]>;
  byGrade: ReadonlyMap<EvidenceGrade, KnowledgeRecord[]>;
  /** Tag → records sharing that tag with pairwise different claims. */
  conflicts: ReadonlyMap<string, KnowledgeRecord[][]>;
}

export function createKnowledgeBase(records: KnowledgeRecord[]): KnowledgeBase {
  const seen = new Set<string>();
  const validated: KnowledgeRecord[] = [];
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`duplicate knowledge record id "${record.id}"`);
    seen.add(record.id);
    const errors = validateRecord(record);
    if (errors.length > 0) {
      const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`invalid knowledge record "${record.id}": ${detail}`);
    }
    validated.push(record);
  }

  const byId = new Map<string, KnowledgeRecord>();
  const byTag = new Map<string, KnowledgeRecord[]>();
  const byGrade = new Map<EvidenceGrade, KnowledgeRecord[]>();
  const conflicts = new Map<string, KnowledgeRecord[][]>();

  for (const record of validated) {
    byId.set(record.id, record);
    for (const tag of record.ontology_tags) {
      const list = byTag.get(tag) ?? [];
      list.push(record);
      byTag.set(tag, list);
    }
    const graded = byGrade.get(record.evidence_level) ?? [];
    graded.push(record);
    byGrade.set(record.evidence_level, graded);
  }

  // Conflicts: for each tag, group records with pairwise different
  // claims. Never merged, never resolved — retrieval (IN-5) sees both.
  for (const [tag, tagged] of byTag) {
    const groups: KnowledgeRecord[][] = [];
    for (const record of tagged) {
      const group = groups.find((g) => g[0]!.claim === record.claim);
      if (group) group.push(record);
      else groups.push([record]);
    }
    const distinct = groups.filter((g) => g.length >= 1);
    if (distinct.length >= 2) conflicts.set(tag, distinct);
  }

  return { version: KNOWLEDGE_BASE_VERSION, records: validated, byId, byTag, byGrade, conflicts };
}

/** Grade counts for dashboards; deterministic ordering. */
export function gradeCounts(base: KnowledgeBase): Record<EvidenceGrade, number> {
  const counts: Record<EvidenceGrade, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const grade of EVIDENCE_GRADES) counts[grade] = base.byGrade.get(grade)?.length ?? 0;
  return counts;
}

/** §4 category coverage of a base — tag occurrences per category (a tag spanning categories counts in each). */
export function categoryCoverage(base: KnowledgeBase): Record<OntologyCategory, number> {
  const coverage = Object.fromEntries(ONTOLOGY_CATEGORIES.map((category) => [category, 0])) as Record<OntologyCategory, number>;
  for (const record of base.records) {
    for (const tag of record.ontology_tags) {
      for (const category of categoriesOfTag(tag)) coverage[category] += 1;
    }
  }
  return coverage;
}
