/**
 * Concession pricing (GE-005, GE-006, GE-007).
 *
 * Invariants:
 * - a larger concession costs more total chips than a smaller one;
 * - marginal/per-unit cost declines as magnitude increases;
 * - scale-independent: `100 -> 50` and `1,000,000 -> 500,000` cost the same
 *   normalized magnitude (amounts are strictly positive, so log-ratio is safe);
 * - opening offer is free (GR-006);
 * - minimum cost for any non-zero concession is 1 chip (GE-007).
 */

import type { EconomyConfig } from '@bounty-bay/config';

/**
 * GE-006: normalized concession magnitude `m = |ln(new / prev)|` over integer
 * tenths. Symmetric: a buyer moving 50 -> 100 has the same magnitude as a
 * seller moving 100 -> 50.
 */
export function concessionMagnitude(previousTenths: number, nextTenths: number): number {
  return Math.abs(Math.log(nextTenths / previousTenths));
}

/**
 * GE-007: `cost = ceil(K * m^alpha)`, floored at 1 chip for m > 0.
 * Concave in m: higher total cost, declining marginal cost.
 */
export function concessionCostChips(magnitude: number, config: EconomyConfig): number {
  if (magnitude === 0) return 0;
  const raw = config.concessionK * Math.pow(magnitude, config.concessionAlpha);
  return Math.max(1, Math.ceil(raw));
}
