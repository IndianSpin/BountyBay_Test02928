/**
 * Private negotiation dossier content rules (GR-028, DD-M2, docs/17
 * Phase 2).
 *
 * Scenario content is data, not game mechanics — the domain validates the
 * CONTENT DISCIPLINE so a scenario can never leak mathematically
 * equivalent reservation-value information. The directive's BAD examples
 * ("Your opponent's minimum is 61") all carry numbers; the GOOD examples
 * carry none. Rule: private facts and private role contexts must not
 * contain any digits at all. Pure and deterministic; used by scenario
 * authoring/seed and pinned by tests as an invariant.
 *
 * DD-M3 (verified reveals) builds on `verifiable`; nothing here makes
 * game-state decisions.
 */

export const DOSSIER_FACT_CATEGORIES = [
  'ALTERNATIVE',
  'URGENCY',
  'PREFERENCE',
  'CONSTRAINT',
  'MARKET_SIGNAL',
  'RELATIONSHIP',
  'CREDIBILITY',
  'CONTEXT',
] as const;

export type DossierFactCategory = (typeof DOSSIER_FACT_CATEGORIES)[number];

export interface DossierFact {
  /** Stable within the scenario version (reveal history references it, DD-M3). */
  id: string;
  text: string;
  category: DossierFactCategory;
  /** DD-M3: whether this fact may be formally revealed as verified. */
  verifiable: boolean;
  /** Optional short label for the reveal action (DD-M3). */
  optionalRevealLabel?: string;
}

/** Provisional caps (OQ-020 keeps the exact counts open). */
export const MAX_DOSSIER_FACTS = 8;
export const MAX_DOSSIER_FACT_CHARS = 200;

const DIGITS = /\d/;

/**
 * Structural + leak-discipline validation for one role's dossier.
 * Returns human-readable problems; an empty array means the dossier is
 * valid. Private contexts get the same no-digits guard as facts.
 */
export function validateDossierFacts(facts: DossierFact[], privateContexts: string[] = []): string[] {
  const errors: string[] = [];

  if (facts.length > MAX_DOSSIER_FACTS) {
    errors.push(`dossier has ${facts.length} facts; maximum is ${MAX_DOSSIER_FACTS} (OQ-020 provisional)`);
  }

  const seen = new Set<string>();
  for (const fact of facts) {
    if (typeof fact.id !== 'string' || fact.id.trim() === '') {
      errors.push('fact id must be a non-empty string');
    } else if (seen.has(fact.id)) {
      errors.push(`duplicate fact id: ${fact.id}`);
    } else {
      seen.add(fact.id);
    }

    const text = typeof fact.text === 'string' ? fact.text.trim() : '';
    if (text === '') {
      errors.push(`fact ${fact.id || '(no id)'} has empty text`);
    } else if (text.length > MAX_DOSSIER_FACT_CHARS) {
      errors.push(`fact ${fact.id} is ${text.length} chars; maximum is ${MAX_DOSSIER_FACT_CHARS}`);
    } else if (DIGITS.test(text)) {
      // GR-028: private facts must never leak mathematically equivalent
      // reservation-value information — any number is forbidden.
      errors.push(`fact ${fact.id} contains a number; private facts must be number-free (GR-028)`);
    }

    if (!DOSSIER_FACT_CATEGORIES.includes(fact.category)) {
      errors.push(`fact ${fact.id} has unknown category: ${String(fact.category)}`);
    }
  }

  for (const [index, context] of privateContexts.entries()) {
    const text = typeof context === 'string' ? context.trim() : '';
    if (text !== '' && DIGITS.test(text)) {
      errors.push(`private context ${index} contains a number; private contexts must be number-free (GR-028)`);
    }
  }

  return errors;
}
