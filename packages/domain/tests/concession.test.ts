import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { concessionCostChips, concessionMagnitude } from '../src/concession';

const config = makeEconomyConfig(); // K=10, alpha=0.6

describe('concessionMagnitude — GE-006 scale independence', () => {
  it('is symmetric: 100 -> 50 equals 50 -> 100', () => {
    expect(concessionMagnitude(1000, 500)).toBeCloseTo(concessionMagnitude(500, 1000), 15);
  });

  it('is scale-independent: halving a million costs the same magnitude as halving a hundred', () => {
    expect(concessionMagnitude(10_000_000, 5_000_000)).toBeCloseTo(concessionMagnitude(1000, 500), 15);
  });

  it('equals ln(2) for a halving movement', () => {
    expect(concessionMagnitude(1000, 500)).toBeCloseTo(Math.log(2), 15);
  });

  it('is zero for no movement', () => {
    expect(concessionMagnitude(1000, 1000)).toBe(0);
  });
});

describe('concessionCostChips — GE-007 shape', () => {
  it('costs zero for zero magnitude (opening offers are free)', () => {
    expect(concessionCostChips(0, config)).toBe(0);
  });

  it('costs at least 1 chip for any non-zero concession', () => {
    expect(concessionCostChips(1e-9, config)).toBe(1);
    expect(concessionCostChips(0.001, config)).toBe(1);
  });

  it('halving movement costs ceil(10 * ln2^0.6) = 9 under v0.1 defaults', () => {
    expect(concessionCostChips(Math.log(2), config)).toBe(9);
  });

  it('invariant: larger magnitudes never cost less (GE-005)', () => {
    let previous = 0;
    for (let i = 1; i <= 200; i++) {
      const m = i / 20; // 0.05 .. 10
      const cost = concessionCostChips(m, config);
      expect(cost).toBeGreaterThanOrEqual(previous);
      previous = cost;
    }
  });

  it('invariant: marginal cost never increases — doubling the magnitude at most doubles the cost (GE-005)', () => {
    // ceil() quantization makes adjacent-point averages wobble, so assert the
    // robust form of declining marginal cost: cost(2m) <= 2 * cost(m) for
    // every m (strictly below the doubling line away from the ceil flat zone).
    for (let i = 1; i <= 200; i++) {
      const m = i / 40; // 0.025 .. 5
      const cost = concessionCostChips(m, config);
      const costDouble = concessionCostChips(2 * m, config);
      expect(costDouble).toBeGreaterThanOrEqual(cost);
      expect(costDouble).toBeLessThanOrEqual(2 * cost);
    }
    // Strictly below doubling away from the flat zone: 16 < 2 * 10.
    const costOne = concessionCostChips(1, config); // 10 chips
    const costTwo = concessionCostChips(2, config); // 16 chips
    expect(costTwo).toBeLessThan(2 * costOne);
    // Average cost per unit declines accordingly: 10 vs 8.
    expect(costTwo / 2).toBeLessThan(costOne);
  });
});
