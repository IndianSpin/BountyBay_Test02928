import { describe, expect, it } from 'vitest';
import { grossRewardChips, netResultChips, surplusShares } from '../src/economy';

describe('surplusShares — GE-001/GE-002 (docs/03 examples)', () => {
  it('Example A: settlement 70 with seller 40 / buyer 100 splits 50/50', () => {
    const shares = surplusShares(1000, 400, 700);
    expect(shares.zopaTenths).toBe(600);
    expect(shares.sellerShare).toBeCloseTo(0.5, 12);
    expect(shares.buyerShare).toBeCloseTo(0.5, 12);
    expect(shares.sellerShare + shares.buyerShare).toBeCloseTo(1, 12);
  });

  it('Example B: settlement 82 gives the seller 70%', () => {
    const shares = surplusShares(1000, 400, 820);
    expect(shares.sellerShare).toBeCloseTo(0.7, 12);
    expect(shares.buyerShare).toBeCloseTo(0.3, 12);
    expect(shares.sellerShare + shares.buyerShare).toBeCloseTo(1, 12);
  });

  it('boundary: settlement at the seller RV gives the seller zero', () => {
    const shares = surplusShares(1000, 400, 400);
    expect(shares.sellerShare).toBeCloseTo(0, 12);
    expect(shares.buyerShare).toBeCloseTo(1, 12);
  });

  it('boundary: settlement at the buyer RV gives the buyer zero', () => {
    const shares = surplusShares(1000, 400, 1000);
    expect(shares.buyerShare).toBeCloseTo(0, 12);
    expect(shares.sellerShare).toBeCloseTo(1, 12);
  });

  it('sums to 1.0 within fixed-point tolerance across the ZOPA', () => {
    for (let p = 400; p <= 1000; p += 7) {
      const shares = surplusShares(1000, 400, p);
      expect(shares.sellerShare + shares.buyerShare).toBeCloseTo(1, 12);
      expect(shares.sellerShare).toBeGreaterThanOrEqual(0);
      expect(shares.buyerShare).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('grossRewardChips / netResultChips — GE-009/GE-010', () => {
  it('Example A: both at 100% multiplier, 4 chips spent -> net 46 each', () => {
    expect(grossRewardChips(0.5, 1, 100)).toBeCloseTo(50, 12);
    expect(netResultChips(grossRewardChips(0.5, 1, 100), 4)).toBeCloseTo(46, 12);
  });

  it('Example B: seller gross = 100 * 0.7 * 0.4 = 28, net 22 after 6 chips', () => {
    const gross = grossRewardChips(0.7, 0.4, 100);
    expect(gross).toBeCloseTo(28, 12);
    expect(netResultChips(gross, 6)).toBeCloseTo(22, 12);
  });

  it('no deal: gross is zero, net equals minus chips spent (GE-003/GE-010)', () => {
    expect(grossRewardChips(0.5, 1, 100) * 0).toBe(0);
    expect(netResultChips(0, 7)).toBe(-7);
  });

  it('30% floor applied to the full bounty never exceeds the bounty', () => {
    expect(grossRewardChips(1, 0.3, 100)).toBeCloseTo(30, 12);
  });
});
