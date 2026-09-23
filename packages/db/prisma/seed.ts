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
import { validateDossierFacts } from '@bounty-bay/domain';
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
      shared:
        'A private sale after the wharf closes. Both of you know what the compass is worth to the right patron — and what the wrong price costs.',
      buyerContext:
        'Your patron collects navigator’s instruments and has waited years for one. A rival collector knows of the sale and would pay dearly. You carry a sealed mandate: do not exceed your limit.',
      buyer: 'Your patron will pay handsomely for this compass. You have authority to buy it. Walk away and the rival collector you answer to will be displeased. Do not exceed your limit.',
      buyerFacts: [
        { id: 'compass-b1', text: 'Your patron has wanted a compass of this era for years.', category: 'PREFERENCE', verifiable: false },
        { id: 'compass-b2', text: 'A rival collector would also take it — but you would answer to your patron for missing it.', category: 'MARKET_SIGNAL', verifiable: true, optionalRevealLabel: 'A rival buyer exists' },
        { id: 'compass-b3', text: 'Your sealed mandate covers exactly what your patron authorised.', category: 'CONSTRAINT', verifiable: false },
      ],
      sellerContext:
        'The compass is a family heirloom, but the debts are real and pressing. You must sell tonight. Letting it go below your floor would betray the family that trusted you with it.',
      seller: 'The compass has been in your family for generations, but the debts are real. You must sell. Letting it go for less than your floor would be a betrayal. Defend your limit.',
      sellerFacts: [
        { id: 'compass-s1', text: 'The debts come due before the next tide.', category: 'URGENCY', verifiable: false },
        { id: 'compass-s2', text: 'Another buyer has expressed credible interest.', category: 'MARKET_SIGNAL', verifiable: true, optionalRevealLabel: 'Another interested buyer' },
        { id: 'compass-s3', text: 'The compass has been in your family for generations.', category: 'CONTEXT', verifiable: false },
      ],
    },
    {
      title: 'The Last Lighthouse Deed',
      description: 'The final stretch of the bay’s coast with no light. Whoever holds the deed controls the shipping lane.',
      shared:
        'The deed trades tonight or the harbour board freezes the lane for the season. Whoever holds it names the toll.',
      buyerContext:
        'Your fleet needs that light before the winter storms arrive. Chartering a lightship of your own would cost far more than the deed ever should. Your harbour master gave you a hard ceiling.',
      buyer: 'Your fleet needs that light before the winter storms. Chartering your own vessel as a lightship costs far more. Stay within your mandate.',
      buyerFacts: [
        { id: 'deed-b1', text: 'The storms arrive soon and your ships need the lane lit.', category: 'URGENCY', verifiable: false },
        { id: 'deed-b2', text: 'Your charter alternative is ruinously expensive.', category: 'ALTERNATIVE', verifiable: true, optionalRevealLabel: 'A costlier alternative exists' },
        { id: 'deed-b3', text: 'Your harbour master set a hard ceiling on the purchase.', category: 'CONSTRAINT', verifiable: false },
      ],
      sellerContext:
        'The deed is yours, but upkeep has bled you dry for years. Selling below your floor leaves you worse off than keeping the light burning at a loss — and the harbour board will not wait.',
      seller: 'The deed is yours, but the upkeep has bled you dry. Sell above your floor or keep the light burning at a loss.',
      sellerFacts: [
        { id: 'deed-s1', text: 'Upkeep has cost you more than the lane has paid.', category: 'CONTEXT', verifiable: false },
        { id: 'deed-s2', text: 'The harbour board freezes the lane if the deed does not trade soon.', category: 'URGENCY', verifiable: true, optionalRevealLabel: 'The board will freeze the lane' },
        { id: 'deed-s3', text: 'You have kept this light burning through every storm.', category: 'CREDIBILITY', verifiable: false },
      ],
    },
    {
      title: 'The Sky-Orchid Cargo',
      description: 'A hold full of sky-orchids that bloom only once a decade. They wilt at dawn.',
      shared:
        'The cargo sits on the dock and wilts at sunrise. Tonight is the only market there will ever be.',
      buyerContext:
        'Your apothecary needs the petals for a standing royal order that cannot wait another decade. Your alternative supply costs triple. The crown will notice if the order goes unfilled — and so will your limit.',
      buyer: 'Your apothecary needs the petals for a standing royal order. Your alternative supply is triple the price. Do not pay beyond your limit.',
      buyerFacts: [
        { id: 'orchid-b1', text: 'The royal order cannot wait for the next bloom.', category: 'URGENCY', verifiable: false },
        { id: 'orchid-b2', text: 'Your alternative supply costs triple the going price.', category: 'ALTERNATIVE', verifiable: true, optionalRevealLabel: 'A costlier supply exists' },
        { id: 'orchid-b3', text: 'The crown personally follows this order.', category: 'RELATIONSHIP', verifiable: false },
      ],
      sellerContext:
        'The cargo spoils at sunrise and there is no second market. Your only alternative is dumping the hold for nothing. Hold your floor and let the clock work for you — but not past dawn.',
      seller: 'The cargo spoils at sunrise. Your only alternative is to dump it for nothing. Hold your floor and let the clock work for you.',
      sellerFacts: [
        { id: 'orchid-s1', text: 'The hold spoils completely at sunrise.', category: 'URGENCY', verifiable: true, optionalRevealLabel: 'The cargo wilts at dawn' },
        { id: 'orchid-s2', text: 'You have no other market for this bloom.', category: 'ALTERNATIVE', verifiable: false },
        { id: 'orchid-s3', text: 'You have handled this bloom safely every decade.', category: 'CREDIBILITY', verifiable: false },
      ],
    },
  ] as const;

  for (const [index, scenario] of scenarios.entries()) {
    // GR-028: private dossiers must pass the content discipline before
    // they may be seeded (number-free facts and contexts).
    const buyerProblems = validateDossierFacts([...scenario.buyerFacts], [scenario.buyerContext]);
    const sellerProblems = validateDossierFacts([...scenario.sellerFacts], [scenario.sellerContext]);
    if (buyerProblems.length > 0 || sellerProblems.length > 0) {
      throw new Error(
        `seed scenario ${scenario.title} failed dossier validation: ${[...buyerProblems, ...sellerProblems].join('; ')}`,
      );
    }

    await prisma.scenario.upsert({
      where: { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` },
      update: {
        version: 1,
        title: scenario.title,
        description: scenario.description,
        buyerBatnaNarrative: scenario.buyer,
        sellerBatnaNarrative: scenario.seller,
        sharedContext: scenario.shared,
        buyerPrivateContext: scenario.buyerContext,
        sellerPrivateContext: scenario.sellerContext,
        buyerPrivateFacts: [...scenario.buyerFacts] as unknown as Prisma.InputJsonValue,
        sellerPrivateFacts: [...scenario.sellerFacts] as unknown as Prisma.InputJsonValue,
        status: 'PUBLISHED',
      },
      create: {
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        version: 1,
        title: scenario.title,
        description: scenario.description,
        buyerBatnaNarrative: scenario.buyer,
        sellerBatnaNarrative: scenario.seller,
        sharedContext: scenario.shared,
        buyerPrivateContext: scenario.buyerContext,
        sellerPrivateContext: scenario.sellerContext,
        buyerPrivateFacts: [...scenario.buyerFacts] as unknown as Prisma.InputJsonValue,
        sellerPrivateFacts: [...scenario.sellerFacts] as unknown as Prisma.InputJsonValue,
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
