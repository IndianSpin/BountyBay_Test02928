/**
 * DD-M2 dossier content discipline (GR-028): private facts and private
 * role contexts must be structurally valid and number-free — any number
 * could encode reservation-value-equivalent information, which the
 * directive forbids. Pure unit tests (no DB).
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_DOSSIER_FACT_CHARS,
  MAX_DOSSIER_FACTS,
  validateDossierFacts,
  type DossierFact,
} from '../src/dossier';

function fact(overrides: Partial<DossierFact> = {}): DossierFact {
  return {
    id: 'f1',
    text: 'Another buyer has expressed credible interest.',
    category: 'MARKET_SIGNAL',
    verifiable: true,
    optionalRevealLabel: 'Another interested buyer',
    ...overrides,
  };
}

describe('validateDossierFacts — valid cases', () => {
  it('accepts a well-formed dossier with verifiable and plain facts', () => {
    const facts: DossierFact[] = [
      fact({ id: 'f1' }),
      fact({ id: 'f2', text: 'The debts come due before the next tide.', category: 'URGENCY', verifiable: false, optionalRevealLabel: undefined }),
    ];
    expect(validateDossierFacts(facts, ['A family heirloom with pressing debts.'])).toEqual([]);
  });

  it('accepts an empty dossier (no facts, no context)', () => {
    expect(validateDossierFacts([])).toEqual([]);
  });
});

describe('validateDossierFacts — invalid cases (GR-028 leak discipline)', () => {
  it('rejects any digit in a private fact — the RV-equivalence guard', () => {
    for (const text of [
      'Your opponent’s minimum is 61.',
      'They will accept anything above 55.',
      'Their BATNA is worth exactly 63.',
      'A rival offered 5 more than you might.',
    ]) {
      const errors = validateDossierFacts([fact({ text })]);
      expect(errors.some((e) => e.includes('number-free'))).toBe(true);
    }
  });

  it('rejects digits in private role contexts', () => {
    const errors = validateDossierFacts([], ['Your ceiling is 78.9 and you know it.']);
    expect(errors.some((e) => e.includes('private context'))).toBe(true);
  });

  it('rejects unknown categories', () => {
    const errors = validateDossierFacts([fact({ category: 'PRICE_HINT' as never })]);
    expect(errors.some((e) => e.includes('unknown category'))).toBe(true);
  });

  it('rejects duplicate fact ids', () => {
    const errors = validateDossierFacts([fact({ id: 'dup' }), fact({ id: 'dup', text: 'Storage becomes expensive next week.' })]);
    expect(errors.some((e) => e.includes('duplicate fact id'))).toBe(true);
  });

  it('rejects empty fact text and missing ids', () => {
    expect(validateDossierFacts([fact({ text: '   ' })]).some((e) => e.includes('empty text'))).toBe(true);
    expect(validateDossierFacts([fact({ id: '  ' })]).some((e) => e.includes('non-empty string'))).toBe(true);
  });
});

describe('validateDossierFacts — boundaries', () => {
  it(`allows exactly ${MAX_DOSSIER_FACTS} facts and rejects one more (OQ-020 provisional)`, () => {
    const atCap = Array.from({ length: MAX_DOSSIER_FACTS }, (_, i) => fact({ id: `f${i}` }));
    expect(validateDossierFacts(atCap)).toEqual([]);
    const overCap = [...atCap, fact({ id: 'f-over' })];
    expect(validateDossierFacts(overCap).some((e) => e.includes('maximum is'))).toBe(true);
  });

  it(`allows a fact at exactly ${MAX_DOSSIER_FACT_CHARS} chars and rejects one longer`, () => {
    const atLimit = fact({ text: 'A'.repeat(MAX_DOSSIER_FACT_CHARS) });
    expect(validateDossierFacts([atLimit]).some((e) => e.includes('chars'))).toBe(false);
    const over = fact({ text: 'A'.repeat(MAX_DOSSIER_FACT_CHARS + 1) });
    expect(validateDossierFacts([over]).some((e) => e.includes('chars'))).toBe(true);
  });
});
