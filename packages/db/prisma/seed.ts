/**
 * Seed: versioned balance config + placeholder fantasy scenarios.
 *
 * The config row is the economy-0.2.0 v0.2 test-default set
 * (docs/03_GAME_ECONOMY.md §2 — provisional values, server-configurable),
 * including the DD Phase 1 hard decision-time budget (GR-023/GR-024).
 * The previous economy-0.1.0 row's values are never edited (configs are
 * immutable once used); only its active flag is cleared.
 *
 * E2E overrides (DD Phase 1, DEC-027): when set,
 * E2E_HARD_LIMIT_MS / E2E_WARN_LOW_MS / E2E_WARN_CRITICAL_MS shorten the
 * active row's time-control values so the timeout spec can run in seconds.
 * Scenario content is placeholder flavor for the M2 integration tests;
 * real published scenarios arrive with M10 seeded content.
 */

import 'dotenv/config';
import { DEFAULT_ECONOMY_CONFIG } from '@bounty-bay/config';
import { Prisma } from '../src/generated/prisma/client';
import { ensureAiBotUsers } from '../src/ai-bots';
import { createPrismaClient } from '../src/client';

const prisma = createPrismaClient();

function e2eIntOverride(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer (got ${raw})`);
  return value;
}

async function main(): Promise<void> {
  const c = DEFAULT_ECONOMY_CONFIG;
  const hardLimit = e2eIntOverride('E2E_HARD_LIMIT_MS');
  const warnLow = e2eIntOverride('E2E_WARN_LOW_MS');
  const warnCritical = e2eIntOverride('E2E_WARN_CRITICAL_MS');

  const hardLimitMs = hardLimit ?? c.hardDecisionTimeLimitMs ?? null;
  await prisma.gameBalanceConfig.upsert({
    where: { version: c.version },
    update: {
      // Re-seeding restores test defaults when overrides are absent.
      hardDecisionTimeLimitMs: hardLimitMs === null ? null : BigInt(hardLimitMs),
      timeoutPolicy: c.timeoutPolicy ?? null,
      timeWarningLowMs: warnLow ?? c.timeWarningLowMs ?? null,
      timeWarningCriticalMs: warnCritical ?? c.timeWarningCriticalMs ?? null,
    },
    create: {
      version: c.version,
      matchBountyChips: c.matchBountyChips,
      concessionBudgetChips: c.concessionBudgetChips,
      concessionK: new Prisma.Decimal(c.concessionK),
      concessionAlpha: new Prisma.Decimal(c.concessionAlpha),
      clockFloorMultiplier: new Prisma.Decimal(c.clockFloorMultiplier),
      clockFloorMs: BigInt(c.clockFloorMs),
      turnGraceMs: c.turnGraceMs,
      maxAmountTenths: BigInt(c.maxAmountTenths),
      hardDecisionTimeLimitMs: hardLimitMs === null ? null : BigInt(hardLimitMs),
      timeoutPolicy: c.timeoutPolicy ?? null,
      timeWarningLowMs: warnLow ?? c.timeWarningLowMs ?? null,
      timeWarningCriticalMs: warnCritical ?? c.timeWarningCriticalMs ?? null,
    },
  });

  // Legacy row: values immutable; clear the active flag so new matches use 0.2.0.
  await prisma.gameBalanceConfig.updateMany({
    where: { version: 'economy-0.1.0' },
    data: { activeForNewMatches: false },
  });
  await prisma.gameBalanceConfig.updateMany({
    where: { version: c.version },
    data: { activeForNewMatches: true },
  });

  const scenarios = [
    {
      title: 'The Ruby Compass',
      description: 'A fabled navigator’s instrument. It points to what you want most.',
      buyer: 'Your patron will pay handsomely for this compass. You have authority to buy it. Walk away and the rival collector you answer to will be displeased. Do not exceed your limit.',
      seller: 'The compass has been in your family for generations, but the debts are real. You must sell. Letting it go for less than your floor would be a betrayal. Defend your limit.',
    },
    {
      title: 'The Last Lighthouse Deed',
      description: 'The final stretch of the bay’s coast with no light. Whoever holds the deed controls the shipping lane.',
      buyer: 'Your fleet needs that light before the winter storms. Chartering your own vessel as a lightship costs far more. Stay within your mandate.',
      seller: 'The deed is yours, but the upkeep has bled you dry. Sell above your floor or keep the light burning at a loss.',
    },
    {
      title: 'The Sky-Orchid Cargo',
      description: 'A hold full of sky-orchids that bloom only once a decade. They wilt at dawn.',
      buyer: 'Your apothecary needs the petals for a standing royal order. Your alternative supply is triple the price. Do not pay beyond your limit.',
      seller: 'The cargo spoils at sunrise. Your only alternative is to dump it for nothing. Hold your floor and let the clock work for you.',
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    await prisma.scenario.upsert({
      where: { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` },
      update: {
        version: 1,
        title: scenario.title,
        description: scenario.description,
        buyerBatnaNarrative: scenario.buyer,
        sellerBatnaNarrative: scenario.seller,
        status: 'PUBLISHED',
      },
      create: {
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        version: 1,
        title: scenario.title,
        description: scenario.description,
        buyerBatnaNarrative: scenario.buyer,
        sellerBatnaNarrative: scenario.seller,
        status: 'PUBLISHED',
      },
    });
  }

  console.log(`seeded economy config ${c.version} and ${scenarios.length} scenarios`);

  await ensureAiBotUsers(prisma);
  console.log('seeded 5 AI persona users (DEC-025)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
