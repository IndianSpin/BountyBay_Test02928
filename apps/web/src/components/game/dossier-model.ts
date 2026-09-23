/**
 * Pure dossier presentation model (DD-M2, GR-028). No React, no DOM —
 * unit-testable under the node vitest environment (apps/web/tests).
 */

export type DossierFactCategory =
  | 'ALTERNATIVE'
  | 'URGENCY'
  | 'PREFERENCE'
  | 'CONSTRAINT'
  | 'MARKET_SIGNAL'
  | 'RELATIONSHIP'
  | 'CREDIBILITY'
  | 'CONTEXT';

/** The API's role-scoped fact shape (docs/17; scenarioForRole serialization). */
export interface DossierFactView {
  id: string;
  text: string;
  category: DossierFactCategory;
  verifiable: boolean;
  optionalRevealLabel?: string;
}

export const DOSSIER_CATEGORY_LABELS: Record<DossierFactCategory, string> = {
  ALTERNATIVE: 'Alternative',
  URGENCY: 'Urgency',
  PREFERENCE: 'Preference',
  CONSTRAINT: 'Constraint',
  MARKET_SIGNAL: 'Market signal',
  RELATIONSHIP: 'Relationship',
  CREDIBILITY: 'Credibility',
  CONTEXT: 'Context',
};

export function dossierCategoryLabel(category: string): string {
  return DOSSIER_CATEGORY_LABELS[category as DossierFactCategory] ?? category;
}

/**
 * Authored order is preserved (the scenario author sequences the facts
 * deliberately); verifiable facts are flagged, never reordered — the
 * reveal history will reference their ids (DD-M3).
 */
export function dossierFactsAsAuthored(facts: readonly DossierFactView[]): DossierFactView[] {
  return facts.filter((fact) => typeof fact.text === 'string' && fact.text.trim() !== '');
}

/** How many of the viewer's facts are verifiable (display-only count). */
export function dossierVerifiableCount(facts: readonly DossierFactView[]): number {
  return facts.filter((fact) => fact.verifiable === true).length;
}
