/**
 * Negotiation ontology (IN-4, DEC-028, docs/18 §4). Canonical taxonomy
 * of negotiation concepts as typed constants — the tag vocabulary every
 * knowledge record must use. Pure data, no behavior. Extensible per
 * docs/18 §4 ("Extensible").
 */

export const ONTOLOGY_CATEGORIES = [
  'PREPARATION',
  'OPENING',
  'CONCESSIONS',
  'COMMUNICATION',
  'DECISION_BIASES',
  'RELATIONSHIP_SOCIAL',
  'PRESSURE',
  'CLOSING',
  'INTEGRATIVE',
] as const;

export type OntologyCategory = (typeof ONTOLOGY_CATEGORIES)[number];

/**
 * Structured tags within each category — the exact vocabulary records
 * cite. Kept coarse on purpose: tags are classification, not analysis;
 * finer concepts live in record claims + conditions.
 */
export const ONTOLOGY_TAGS: Readonly<Record<OntologyCategory, readonly string[]>> = {
  PREPARATION: ['BATNA', 'RESERVATION_VALUE', 'ASPIRATION_TARGET', 'PLANNING', 'INFORMATION_GATHERING'],
  OPENING: ['FIRST_OFFERS', 'ANCHORING', 'AMBITION', 'CREDIBILITY'],
  CONCESSIONS: ['RECIPROCITY', 'SIZE', 'FREQUENCY', 'PATTERN', 'SIGNALING', 'TIMING'],
  COMMUNICATION: ['QUESTIONS', 'LISTENING', 'INFORMATION_DISCLOSURE', 'FRAMING', 'BLUFFING_DECEPTION', 'CREDIBILITY', 'SILENCE'],
  DECISION_BIASES: ['ANCHORING', 'FIXED_PIE', 'LOSS_AVERSION', 'OVERCONFIDENCE', 'REACTIVE_DEVALUATION', 'ESCALATION'],
  RELATIONSHIP_SOCIAL: ['TRUST', 'RECIPROCITY', 'FACE', 'EMOTION', 'POWER', 'CULTURE'],
  PRESSURE: ['DEADLINES', 'TIME_PRESSURE', 'IMPASSE', 'WALK_AWAY_DECISIONS'],
  CLOSING: ['ACCEPTANCE', 'VALUE_CAPTURE', 'FAILED_ZOPA', 'NO_DEAL', 'CLOSURE'],
  INTEGRATIVE: ['INTERESTS', 'MULTI_ISSUE_TRADING', 'LOGROLLING', 'CONTINGENT_AGREEMENTS', 'VALUE_CREATION'],
};

export const ALL_ONTOLOGY_TAGS: readonly string[] = Object.values(ONTOLOGY_TAGS).flat();

export function isOntologyTag(value: string): boolean {
  return ALL_ONTOLOGY_TAGS.includes(value);
}

export function isOntologyCategory(value: string): boolean {
  return (ONTOLOGY_CATEGORIES as readonly string[]).includes(value);
}

/**
 * The categories a tag belongs to — a tag may legitimately span
 * categories (e.g. ANCHORING is both an opening tactic and a decision
 * bias in §4), so this returns every match, never just the first.
 */
export function categoriesOfTag(tag: string): OntologyCategory[] {
  const categories: OntologyCategory[] = [];
  for (const category of ONTOLOGY_CATEGORIES) {
    if ((ONTOLOGY_TAGS[category] as readonly string[]).includes(tag)) categories.push(category);
  }
  return categories;
}
