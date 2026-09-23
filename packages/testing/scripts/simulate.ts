/**
 * Simulation batch runner (docs/15_SIMULATION_VALIDATION_PLAN.md §3).
 *
 * Usage from the repo root:
 *   pnpm --filter @bounty-bay/testing simulate [--matches 100]
 *
 * Runs the full strategy matrix over seeded matches and prints aggregate
 * economy stats. Parameter sweeps (K, alpha, T_floor, budgets, ZOPA
 * distributions) extend from here during validation work.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { runMatch } from '../src/simulator';
import { STRATEGY_FACTORIES, type StrategyName } from '../src/strategies';

interface ScenarioVariant {
  label: string;
  buyerRvTenths: number;
  sellerRvTenths: number;
}

const SCENARIOS: ScenarioVariant[] = [
  { label: 'small (60-unit ZOPA)', buyerRvTenths: 1000, sellerRvTenths: 400 },
  { label: 'large (5M-unit ZOPA)', buyerRvTenths: 6_000_000, sellerRvTenths: 1_000_000 },
];

const args = process.argv.slice(2);
const matchesPerPair = Number(args[args.indexOf('--matches') + 1] ?? 20);

const config = makeEconomyConfig();
const names = Object.keys(STRATEGY_FACTORIES) as StrategyName[];

interface Row {
  label: string;
  deals: number;
  walks: number;
  avgTurns: number;
  avgSellerShare: number;
  avgBuyerNet: number;
  avgSellerNet: number;
}

const rows: Row[] = [];

for (const scenario of SCENARIOS) {
  for (const buyerName of names) {
    for (const sellerName of names) {
      let deals = 0;
      let walks = 0;
      let turns = 0;
      let sellerShareSum = 0;
      let buyerNetSum = 0;
      let sellerNetSum = 0;

      for (let seed = 1; seed <= matchesPerPair; seed++) {
        const result = runMatch({
          seed,
          scenario: { buyerRvTenths: scenario.buyerRvTenths, sellerRvTenths: scenario.sellerRvTenths, firstPlayerId: seed % 2 === 0 ? 'buyer-0001' : 'seller-0001' },
          buyer: STRATEGY_FACTORIES[buyerName](config),
          seller: STRATEGY_FACTORIES[sellerName](config),
          config,
        });
        turns += result.turns;
        if (result.state.status === 'DEAL') {
          deals += 1;
          sellerShareSum += result.state.economy?.sellerSurplusShare ?? 0;
        } else if (result.state.status === 'NO_DEAL') {
          walks += 1;
        }
        buyerNetSum += result.state.economy?.players['buyer-0001']?.netResult ?? 0;
        sellerNetSum += result.state.economy?.players['seller-0001']?.netResult ?? 0;
      }

      rows.push({
        label: `${scenario.label} · ${buyerName} vs ${sellerName}`,
        deals,
        walks,
        avgTurns: turns / matchesPerPair,
        avgSellerShare: deals > 0 ? sellerShareSum / deals : 0,
        avgBuyerNet: buyerNetSum / matchesPerPair,
        avgSellerNet: sellerNetSum / matchesPerPair,
      });
    }
  }
}

const pad = (s: string, w: number) => s.padEnd(w);
console.log(`Bounty Bay simulator — ${matchesPerPair} seeded matches per pairing, config ${config.version}`);
console.log(
  [
    pad('pairing', 52),
    pad('deals', 8),
    pad('walks', 8),
    pad('turns', 8),
    pad('seller%', 10),
    pad('buyerNet', 10),
    pad('sellerNet', 10),
  ].join(''),
);
for (const row of rows) {
  console.log(
    [
      pad(row.label, 52),
      pad(String(row.deals), 8),
      pad(String(row.walks), 8),
      pad(row.avgTurns.toFixed(1), 8),
      pad((row.avgSellerShare * 100).toFixed(1) + '%', 10),
      pad(row.avgBuyerNet.toFixed(2), 10),
      pad(row.avgSellerNet.toFixed(2), 10),
    ].join(''),
  );
}
