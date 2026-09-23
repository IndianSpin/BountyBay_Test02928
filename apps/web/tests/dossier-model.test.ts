/**
 * Dossier presentation model (DD-M2) — pure helpers used by the Dossier
 * component. Node-environment tests; the component itself is wired by
 * W2 (BB-213) and covered by the API-level E2E dossier spec.
 */

import { describe, expect, it } from 'vitest';
import { dossierCategoryLabel, dossierFactsAsAuthored, dossierVerifiableCount, type DossierFactView } from '../src/components/game/dossier-model';

const facts: DossierFactView[] = [
  { id: 'f1', text: 'Another buyer has expressed credible interest.', category: 'MARKET_SIGNAL', verifiable: true, optionalRevealLabel: 'Another interested buyer' },
  { id: 'f2', text: 'The debts come due before the next tide.', category: 'URGENCY', verifiable: false },
  { id: 'f3', text: '   ', category: 'CONTEXT', verifiable: false },
];

describe('dossierCategoryLabel', () => {
  it('maps known categories and passes through unknown ones', () => {
    expect(dossierCategoryLabel('MARKET_SIGNAL')).toBe('Market signal');
    expect(dossierCategoryLabel('URGENCY')).toBe('Urgency');
    expect(dossierCategoryLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('dossierFactsAsAuthored', () => {
  it('preserves authored order and drops blank entries', () => {
    const result = dossierFactsAsAuthored(facts);
    expect(result.map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it('does not reorder verifiable facts (reveal history references ids)', () => {
    const result = dossierFactsAsAuthored(facts);
    expect(result[1]!.id).toBe('f2');
  });
});

describe('dossierVerifiableCount', () => {
  it('counts only verifiable facts', () => {
    expect(dossierVerifiableCount(facts)).toBe(1);
  });
});
