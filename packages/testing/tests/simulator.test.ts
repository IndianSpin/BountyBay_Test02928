/**
 * Simulator validation (docs/15_SIMULATION_VALIDATION_PLAN.md).
 *
 * Milestone 1 exit: a full match runs entirely in memory, seeded runs are
 * deterministic, strategy agents stay legal, and the hard invariants hold
 * across the whole strategy matrix.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { defaultScenarioSeed } from '../src/factories';
import { runMatch, type SimulatedMatch } from '../src/simulator';
import { STRATEGY_FACTORIES, type StrategyName } from '../src/strategies';

const config = makeEconomyConfig();
const NAMES = Object.keys(STRATEGY_FACTORIES) as StrategyName[];

function run(seed: number, buyer: StrategyName, seller: StrategyName): SimulatedMatch {
  return runMatch({
    seed,
    scenario: defaultScenarioSeed(),
    buyer: STRATEGY_FACTORIES[buyer](config),
    seller: STRATEGY_FACTORIES[seller](config),
    config,
  });
}

describe('simulator smoke — full in-memory matches', () => {
  it('completes seeded matches for every strategy pairing without illegal commands', () => {
    let terminalCount = 0;
    let dealCount = 0;
    for (const buyerName of NAMES) {
      for (const sellerName of NAMES) {
        for (let seed = 1; seed <= 25; seed++) {
          const result = run(seed, buyerName, sellerName);
          expect(result.abortedByCap).toBe(false);
          expect(result.terminal).toBe(true);
          expect(result.strategyFailures).toBe(0);
          expect(result.turns).toBeGreaterThan(0);
          terminalCount += 1;
          if (result.state.status === 'DEAL') dealCount += 1;

          if (result.state.economy) {
            for (const p of Object.values(result.state.economy.players)) {
              expect(p.clockMultiplier).toBeGreaterThanOrEqual(0.3 - 1e-12);
              expect(p.clockMultiplier).toBeLessThanOrEqual(1 + 1e-12);
              expect(p.chipsSpent).toBeGreaterThanOrEqual(0);
              expect(p.remainingChips + p.chipsSpent).toBe(100); // budget conserved
            }
            if (result.state.status === 'DEAL') {
              const s = result.state.settlementTenths!;
              const seller = result.state.participants.find((p) => p.role === 'SELLER')!;
              const buyer = result.state.participants.find((p) => p.role === 'BUYER')!;
              expect(s).toBeGreaterThanOrEqual(seller.reservationValueTenths);
              expect(s).toBeLessThanOrEqual(buyer.reservationValueTenths);
              expect(result.state.economy.buyerSurplusShare! + result.state.economy.sellerSurplusShare!).toBeCloseTo(1, 9);
            } else {
              for (const p of Object.values(result.state.economy.players)) {
                expect(p.grossReward).toBe(0);
              }
            }
          }
        }
      }
    }
    // Sanity: the matrix is not degenerate — both outcomes occur.
    expect(terminalCount).toBe(400);
    expect(dealCount).toBeGreaterThan(0);
    expect(dealCount).toBeLessThan(terminalCount);
  });

  it('is deterministic: same seed yields identical state and events', () => {
    const a = run(1234, 'moderate-anchor', 'fast-closer');
    const b = run(1234, 'moderate-anchor', 'fast-closer');
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    const c = run(9999, 'moderate-anchor', 'fast-closer');
    expect(JSON.stringify(c.state)).not.toBe(JSON.stringify(a.state));
  });

  it('personalities behave differently (fast closers deal more than extreme anchors)', () => {
    let fastDeals = 0;
    let extremeDeals = 0;
    for (let seed = 1; seed <= 100; seed++) {
      if (run(seed, 'fast-closer', 'fast-closer').state.status === 'DEAL') fastDeals += 1;
      if (run(seed, 'extreme-anchor', 'extreme-anchor').state.status === 'DEAL') extremeDeals += 1;
    }
    expect(fastDeals).toBeGreaterThan(extremeDeals);
  });

  it('never leaks the opponent RV into events', () => {
    const result = run(7, 'random-legal', 'moderate-anchor');
    const serialized = JSON.stringify(result.events);
    // Scenario RVs: buyer 1000 (100.0), seller 400 (40.0). The string "400"
    // must not appear in any event payload.
    expect(serialized).not.toContain('"reservationValueTenths":400');
    expect(serialized).not.toContain('"reservationValueTenths":1000');
  });
});
