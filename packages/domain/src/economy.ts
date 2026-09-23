/**
 * Match economy (GE-001, GE-002, GE-003, GE-009, GE-010).
 *
 * Surplus share is the canonical measure of distributive bargaining outcome:
 * for settlement `p`, `zopa = buyer_max - seller_min`,
 * `seller_share = (p - seller_min) / zopa`,
 * `buyer_share = (buyer_max - p) / zopa`.
 * Shares are computed over integer tenths; float division only appears here,
 * never on offer amounts. The invariant `seller + buyer = 1.0` holds within
 * fixed-point tolerance (docs/15_SIMULATION_VALIDATION_PLAN.md §5).
 */

export interface SurplusShares {
  zopaTenths: number;
  buyerShare: number;
  sellerShare: number;
}

export function surplusShares(
  buyerRvTenths: number,
  sellerRvTenths: number,
  settlementTenths: number,
): SurplusShares {
  const zopaTenths = buyerRvTenths - sellerRvTenths;
  return {
    zopaTenths,
    sellerShare: (settlementTenths - sellerRvTenths) / zopaTenths,
    buyerShare: (buyerRvTenths - settlementTenths) / zopaTenths,
  };
}

/** GE-009: `gross = MATCH_BOUNTY * surplus_share * clock_multiplier` (deal only). */
export function grossRewardChips(share: number, multiplier: number, matchBountyChips: number): number {
  return matchBountyChips * share * multiplier;
}

/** GE-010: `net = gross - concession_chips_spent` (no deal => gross is 0). */
export function netResultChips(grossReward: number, chipsSpent: number): number {
  return grossReward - chipsSpent;
}
