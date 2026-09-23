/**
 * Persona signature tests (P1-M1): statistical, seeded assertions that each
 * persona actually behaves like its character. Robust margins only — the
 * personality lives in the registry configuration, not in test tuning.
 */

import { describe, expect, it } from 'vitest';
import { mirrorFraction } from '../src/personas';
import { AI_PERSONAS } from '../src/registry';
import { BUYER_ID, driveDuel, SELLER_ID, type DuelResult } from './helpers';
import type { PersonaKey } from '../src/types';

const SEEDS = [5, 17, 29, 41];
const ALL = AI_PERSONAS.map((p) => p.key);

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** All duels with `persona` as the buyer (vs every opponent) and as the seller (every opponent vs it). */
function duelsWith(persona: PersonaKey): DuelResult[] {
  const out: DuelResult[] = [];
  for (const opp of ALL) {
    for (const seed of SEEDS) {
      out.push(driveDuel(persona, opp, seed));
      out.push(driveDuel(opp, persona, seed));
    }
  }
  return out;
}

function magnitudesAs(persona: PersonaKey, role: 'buyer' | 'seller'): number[] {
  const out: number[] = [];
  for (const opp of ALL) {
    for (const seed of SEEDS) {
      const result = role === 'buyer' ? driveDuel(persona, opp, seed) : driveDuel(opp, persona, seed);
      out.push(...result.magnitudes[role === 'buyer' ? BUYER_ID : SELLER_ID]!);
    }
  }
  return out;
}

function dealRate(persona: PersonaKey): number {
  const results = duelsWith(persona);
  const deals = results.filter((r) => r.outcome === 'DEAL').length;
  return deals / results.length;
}

describe('persona signatures', () => {
  it('the Grinder concedes smaller average magnitudes than the Anchor', () => {
    const grinder = [...magnitudesAs('grinder', 'buyer'), ...magnitudesAs('grinder', 'seller')];
    const anchor = [...magnitudesAs('anchor', 'buyer'), ...magnitudesAs('anchor', 'seller')];
    expect(grinder.length).toBeGreaterThan(0);
    expect(mean(grinder)).toBeLessThan(mean(anchor));
  });

  it('the Closer closes more deals than the Wall', () => {
    const closerRate = dealRate('closer');
    const wallRate = dealRate('wall');
    expect(closerRate).toBeGreaterThan(wallRate);
  });

  it('the Anchor opens furthest from its own reservation value', () => {
    const distance = (opening: number) => Math.abs(Math.log(opening / 1000)); // buyer RV 100.0 in duels
    const anchorOpening = driveDuel('anchor', 'wall', 99).openings[BUYER_ID]!;
    for (const persona of ALL.filter((key) => key !== 'anchor')) {
      const opening = driveDuel(persona, 'wall', 99).openings[BUYER_ID]!;
      expect(distance(anchorOpening), persona).toBeGreaterThan(distance(opening));
    }
  });

  it("the Mirror's concession pace is monotone in the opponent's cumulative movement", () => {
    expect(mirrorFraction(0)).toBe(0.04);
    expect(mirrorFraction(0.4)).toBeCloseTo(0.4 / 6, 10);
    expect(mirrorFraction(1.2)).toBeCloseTo(0.2, 10);
    expect(mirrorFraction(2.5)).toBe(0.25);
    expect(mirrorFraction(100)).toBe(0.25);
    expect(mirrorFraction(0)).toBeLessThan(mirrorFraction(0.6));
    expect(mirrorFraction(0.6)).toBeLessThan(mirrorFraction(1.5));
  });
});
