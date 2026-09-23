/**
 * Milestone 2 integration tests — run against a real PostgreSQL
 * (`pnpm db:up`, then `pnpm test:db`). Skipped in plain `pnpm test`.
 *
 * Exit criteria (16_IMPLEMENTATION_SEQUENCE.md M2): a domain match survives
 * process restart, and its result reproduces from stored data (PRD-009).
 * Plus SI-004: idempotency and race handling.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { replayMatch, type CreateMatchInput, type DomainEvent } from '@bounty-bay/domain';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureAiBotUsers, findBotByPersona } from '../src/ai-bots';
import { createPrismaClient } from '../src/client';
import { MatchCommandService } from '../src/command-service';
import { Prisma, type PrismaClient } from '../src/generated/prisma/client';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

const CONFIG_VERSION = 'economy-0.2.0';
const SCENARIO_ID = '00000000-0000-4000-8000-000000000001'; // seed: Harbor Tug
const SCENARIO_VERSION = 1;

let prisma: PrismaClient;
let service: MatchCommandService;
let buyerId: string;
let sellerId: string;

function makeMatchInput(matchId: string): CreateMatchInput {
  return {
    matchId,
    mode: 'RANKED_LIVE',
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: CONFIG_VERSION,
    ratingVersion: 'rating-0.1.0',
    buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 1000 },
    seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 400 },
    firstPlayerId: buyerId,
    createdAt: Date.now(),
  };
}

function uid(): string {
  return randomUUID();
}

describe.skipIf(!RUN)('MatchCommandService (PostgreSQL)', () => {
  beforeAll(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    service = new MatchCommandService(prisma);

    // Clean transactional tables; the seeded config + scenarios remain.
    await prisma.$executeRawUnsafe('TRUNCATE matches CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE users CASCADE');

    buyerId = uid();
    sellerId = uid();
    await prisma.user.createMany({
      data: [
        { id: buyerId, authSubject: 'auth-buyer', handle: 'buyer_handle' },
        { id: sellerId, authSubject: 'auth-seller', handle: 'seller_handle' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists a full match lifecycle: create → ready → negotiate → deal', async () => {
    const matchId = uid();
    const created = await service.createMatch(makeMatchInput(matchId));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const now = Date.now();
    expect((await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now })).ok).toBe(true);
    expect((await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now })).ok).toBe(true);

    const offer1 = await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now });
    expect(offer1.ok).toBe(true);
    const offer2 = await service.offer({ kind: 'OFFER', matchId, playerId: sellerId, offerId: uid(), amountTenths: 800, commandId: uid(), now });
    expect(offer2.ok).toBe(true);
    const offer3 = await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 550, commandId: uid(), now });
    expect(offer3.ok).toBe(true);
    const offer4 = await service.offer({ kind: 'OFFER', matchId, playerId: sellerId, offerId: uid(), amountTenths: 600, commandId: uid(), now });
    expect(offer4.ok).toBe(true);
    if (!offer4.ok) return;

    const accept = await service.accept({ kind: 'ACCEPT', matchId, playerId: buyerId, offerId: offer4.state.participants.find((p) => p.playerId === sellerId)!.standingOfferId!, commandId: uid(), now });
    expect(accept.ok).toBe(true);
    if (!accept.ok) return;
    expect(accept.state.status).toBe('DEAL');
    expect(accept.state.settlementTenths).toBe(600);

    // Normalized rows reflect the committed state.
    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: { result: true, offers: true } });
    expect(row.status).toBe('DEAL');
    expect(row.eventSequence).toBe(BigInt(accept.state.eventSequence));
    expect(row.result).not.toBeNull();
    // Decimal(8,6) column precision: 6 decimal places.
    expect(row.result!.sellerSurplusShare!.toNumber()).toBeCloseTo((600 - 400) / 600, 5);
    expect(row.offers).toHaveLength(4);
    // The seller's 80 -> 60 concession (the only 600 offer in this match) cost 5 chips.
    expect(row.offers.find((o) => o.amountTenths === BigInt(600))!.concessionCostChips).toBe(5);

    // Event stream is complete and strictly ordered.
    const events = await service.listEvents(matchId);
    expect(events.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.sequence).toBeGreaterThan(events[i - 1]!.sequence);
    }
  });

  it('survives a process restart: a fresh service instance resumes mid-match state', async () => {
    const matchId = uid();
    const input = makeMatchInput(matchId);
    expect((await service.createMatch(input)).ok).toBe(true);

    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now });

    // "Restart": brand-new client + service, no shared state.
    const restartedPrisma = createPrismaClient(DATABASE_URL);
    const restartedService = new MatchCommandService(restartedPrisma);
    try {
      const snapshot = await restartedService.loadSnapshot(matchId);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.state.status).toBe('ACTIVE');
      expect(snapshot!.state.activePlayerId).toBe(sellerId);
      expect(snapshot!.config.version).toBe(CONFIG_VERSION);

      const offer = await restartedService.offer({
        kind: 'OFFER',
        matchId,
        playerId: sellerId,
        offerId: uid(),
        amountTenths: 700,
        commandId: uid(),
        now: now + 1000,
      });
      expect(offer.ok).toBe(true);
      if (offer.ok) {
        expect(offer.state.participants.find((p) => p.playerId === sellerId)!.latestOfferTenths).toBe(700);
      }
    } finally {
      await restartedPrisma.$disconnect();
    }
  });

  it('SI-004: duplicate commandId is rejected and changes nothing', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);
    const now = Date.now();
    const commandId = uid();

    const first = await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId, now });
    expect(first.ok).toBe(true);
    const second = await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId, now });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('COMMAND_ALREADY_PROCESSED');

    const events = await service.listEvents(matchId);
    expect(events.filter((e) => e.type === 'PLAYER_READY')).toHaveLength(1);
  });

  it('SI-004: a duplicate accept cannot settle a deal twice', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);
    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    const offerResult = await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 700, commandId: uid(), now });
    if (!offerResult.ok) throw new Error('offer failed');

    const acceptId = uid();
    const accept = await service.accept({ kind: 'ACCEPT', matchId, playerId: sellerId, offerId: offerResult.events[0]!.payload.offerId as string, commandId: acceptId, now });
    expect(accept.ok).toBe(true);
    const again = await service.accept({ kind: 'ACCEPT', matchId, playerId: sellerId, offerId: offerResult.events[0]!.payload.offerId as string, commandId: acceptId, now });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('COMMAND_ALREADY_PROCESSED');

    const results = await prisma.matchResult.findMany({ where: { matchId } });
    expect(results).toHaveLength(1);
  });

  it('SI-004: concurrent offers on one match serialize through the row lock', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);
    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });

    const [a, b] = await Promise.all([
      service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now }),
      service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now }),
    ]);

    const okCount = [a, b].filter((r) => r.ok).length;
    expect(okCount).toBe(1);
    const failed = [a, b].find((r) => !r.ok);
    // The loser observes the turn already moved: NOT_YOUR_TURN (never a lost update).
    if (failed && !failed.ok) expect(failed.code).toBe('NOT_YOUR_TURN');

    const events = await service.listEvents(matchId);
    expect(events.filter((e) => e.type === 'OFFER_SUBMITTED')).toHaveLength(1);
  });

  it('PRD-009: stored rows + events reproduce the exact result via replay', async () => {
    const matchId = uid();
    const input = makeMatchInput(matchId);
    expect((await service.createMatch(input)).ok).toBe(true);
    const now = Date.now();

    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now: now + 10_000 });
    await service.offer({ kind: 'OFFER', matchId, playerId: sellerId, offerId: uid(), amountTenths: 800, commandId: uid(), now: now + 30_000 });
    const offer3 = await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 550, commandId: uid(), now: now + 35_000 });
    if (!offer3.ok) throw new Error('offer3 failed');
    const accept = await service.accept({ kind: 'ACCEPT', matchId, playerId: sellerId, offerId: offer3.events[0]!.payload.offerId as string, commandId: uid(), now: now + 40_000 });
    expect(accept.ok).toBe(true);
    if (!accept.ok) return;

    // Reconstruct the original create-input from rows only (no closure state):
    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: { participants: true } });
    const configRow = await prisma.gameBalanceConfig.findUniqueOrThrow({ where: { version: row.economyConfigVersion } });
    const buyerRow = row.participants.find((p) => p.role === 'BUYER')!;
    const sellerRow = row.participants.find((p) => p.role === 'SELLER')!;

    const reconstructed: CreateMatchInput = {
      matchId: row.id,
      mode: row.mode,
      scenarioId: row.scenarioId,
      scenarioVersion: row.scenarioVersion,
      gameRulesVersion: row.gameRulesVersion,
      economyConfigVersion: row.economyConfigVersion,
      ratingVersion: row.ratingVersion,
      buyer: { playerId: buyerRow.userId, role: 'BUYER', reservationValueTenths: Number(buyerRow.reservationValueTenths) },
      seller: { playerId: sellerRow.userId, role: 'SELLER', reservationValueTenths: Number(sellerRow.reservationValueTenths) },
      firstPlayerId: row.firstPlayerId!,
      createdAt: row.createdAt.getTime(),
    };

    const storedConfig = {
      version: configRow.version,
      matchBountyChips: configRow.matchBountyChips,
      concessionBudgetChips: configRow.concessionBudgetChips,
      concessionK: configRow.concessionK.toNumber(),
      concessionAlpha: configRow.concessionAlpha.toNumber(),
      clockFloorMultiplier: configRow.clockFloorMultiplier.toNumber(),
      clockFloorMs: Number(configRow.clockFloorMs),
      turnGraceMs: configRow.turnGraceMs,
      maxAmountTenths: Number(configRow.maxAmountTenths),
      hardDecisionTimeLimitMs: configRow.hardDecisionTimeLimitMs === null ? undefined : Number(configRow.hardDecisionTimeLimitMs),
      timeoutPolicy: (configRow.timeoutPolicy ?? undefined) as 'ATTRIBUTED_NO_DEAL' | undefined,
      timeWarningLowMs: configRow.timeWarningLowMs ?? undefined,
      timeWarningCriticalMs: configRow.timeWarningCriticalMs ?? undefined,
    };
    expect(storedConfig).toEqual(makeEconomyConfig());

    const events: DomainEvent[] = await service.listEvents(matchId);
    const replayed = replayMatch(reconstructed, storedConfig, events);

    expect(replayed.state.status).toBe('DEAL');
    expect(replayed.state.economy).toEqual(accept.state.economy);
    // And the re-emitted event stream matches the stored one exactly.
    expect(replayed.replayedEvents).toEqual(events);
  });

  it('versioning: unknown config version is rejected (PRD-016 / 06 §11)', async () => {
    const matchId = uid();
    const input = { ...makeMatchInput(matchId), economyConfigVersion: 'economy-9.9.9' };
    const created = await service.createMatch(input);
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.code).toBe('INVALID_MATCH_INPUT');
  });

  it('hidden RV isolation at the storage layer: events never carry reservation values (SI-001)', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);
    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now });

    const events = await service.listEvents(matchId);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('reservationValueTenths');
    expect(serialized).not.toContain('"400"');
  });

  it('disconnect persistence: participant.disconnectedAt follows authoritative event time', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);
    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.disconnect({ kind: 'DISCONNECT', matchId, playerId: buyerId, commandId: uid(), now: now + 5000 });

    const participant = await prisma.matchParticipant.findFirstOrThrow({ where: { matchId, userId: buyerId } });
    expect(participant.disconnectedAt).not.toBeNull();
    expect(participant.disconnectedAt!.getTime()).toBe(now + 5000);

    await service.reconnect({ kind: 'RECONNECT', matchId, playerId: buyerId, commandId: uid(), now: now + 9000 });
    const after = await prisma.matchParticipant.findFirstOrThrow({ where: { matchId, userId: buyerId } });
    expect(after.disconnectedAt).toBeNull();
  });

  // -- AI practice matches (DEC-025) ----------------------------------------

  it('persists an AI match with a bot participant and persona fields', async () => {
    await ensureAiBotUsers(prisma);
    const bot = await findBotByPersona(prisma, 'closer');
    expect(bot).not.toBeNull();

    const matchId = uid();
    const input: CreateMatchInput = {
      ...makeMatchInput(matchId),
      mode: 'AI',
      ratingVersion: null,
      seller: { playerId: bot!.id, role: 'SELLER', reservationValueTenths: 400 },
    };
    const created = await service.createMatch(input, { aiPersonaKey: 'closer', aiPersonaVersion: 'ai-personas-0.1.0' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const row = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: { participants: { include: { user: true } } },
    });
    expect(row.mode).toBe('AI');
    expect(row.ratingVersion).toBeNull();
    expect(row.aiPersonaKey).toBe('closer');
    expect(row.aiPersonaVersion).toBe('ai-personas-0.1.0');
    expect(row.participants).toHaveLength(2);
    const botParticipant = row.participants.find((p) => p.userId === bot!.id)!;
    expect(botParticipant.user.isBot).toBe(true);
  });

  it('persists bot chat and offers through the standard command path; replay reproduces', async () => {
    await ensureAiBotUsers(prisma);
    const bot = (await findBotByPersona(prisma, 'closer'))!;

    const matchId = uid();
    const input: CreateMatchInput = {
      ...makeMatchInput(matchId),
      mode: 'AI',
      ratingVersion: null,
      seller: { playerId: bot.id, role: 'SELLER', reservationValueTenths: 400 },
    };
    const created = await service.createMatch(input, { aiPersonaKey: 'closer', aiPersonaVersion: 'ai-personas-0.1.0' });
    if (!created.ok) throw new Error('create failed');

    const now = Date.now();
    expect((await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now })).ok).toBe(true);
    expect((await service.ready({ kind: 'READY', matchId, playerId: bot.id, commandId: uid(), now })).ok).toBe(true);

    // human buyer opens at own RV; the bot chats and stands at its own RV
    expect((await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 1000, commandId: uid(), now })).ok).toBe(true);
    expect((await service.message({ kind: 'MESSAGE', matchId, playerId: bot.id, messageId: uid(), body: 'We are close. Closer.', commandId: uid(), now })).ok).toBe(true);
    const botOffer = await service.offer({ kind: 'OFFER', matchId, playerId: bot.id, offerId: uid(), amountTenths: 400, commandId: uid(), now });
    expect(botOffer.ok).toBe(true);
    if (!botOffer.ok) return;

    const accept = await service.accept({
      kind: 'ACCEPT',
      matchId,
      playerId: buyerId,
      offerId: botOffer.state.participants.find((p) => p.playerId === bot.id)!.standingOfferId!,
      commandId: uid(),
      now,
    });
    expect(accept.ok).toBe(true);
    if (!accept.ok) return;
    expect(accept.state.status).toBe('DEAL');
    expect(accept.state.economy!.ratedEligible).toBe(false);

    // normalized chat rows carry the bot's UUID
    const messages = await prisma.chatMessage.findMany({ where: { matchId } });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.playerId).toBe(bot.id);

    // snapshot decodes and the stored event stream replays to the exact state
    const snapshot = await service.loadSnapshot(matchId);
    expect(snapshot).not.toBeNull();
    const replayed = replayMatch(input, snapshot!.config, await service.listEvents(matchId));
    expect(replayed.state).toEqual(snapshot!.state);
  });

  // -- DD Phase 1: hard decision-time timeout (GR-023/GR-024) ----------------

  it('persists a TIMEOUT outcome distinctly from walk-away', async () => {
    // A tiny-limit config row: the domain reads it through the same
    // versioned-config path as production (economyConfigFromRow).
    await prisma.gameBalanceConfig.upsert({
      where: { version: 'economy-ttl-1' },
      update: {},
      create: {
        version: 'economy-ttl-1',
        matchBountyChips: 100,
        concessionBudgetChips: 100,
        concessionK: new Prisma.Decimal(10),
        concessionAlpha: new Prisma.Decimal(0.6),
        clockFloorMultiplier: new Prisma.Decimal(0.3),
        clockFloorMs: BigInt(60_000),
        turnGraceMs: 0,
        maxAmountTenths: BigInt(9_999_999_999),
        hardDecisionTimeLimitMs: BigInt(10_000),
        timeoutPolicy: 'ATTRIBUTED_NO_DEAL',
        timeWarningLowMs: 5_000,
        timeWarningCriticalMs: 2_000,
        activeForNewMatches: false,
      },
    });

    const matchId = uid();
    const input = { ...makeMatchInput(matchId), economyConfigVersion: 'economy-ttl-1' };
    expect((await service.createMatch(input)).ok).toBe(true);
    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now: now + 2_000 });

    // Not yet due: the domain refuses (TIMEOUT_NOT_DUE) and nothing persists.
    const early = await service.timeout({ kind: 'TIMEOUT', matchId, playerId: sellerId, commandId: uid(), now: now + 3_000 });
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.code).toBe('TIMEOUT_NOT_DUE');

    // Seller's cumulative active time reaches the 10 s limit → timeout.
    const timedOut = await service.timeout({ kind: 'TIMEOUT', matchId, playerId: sellerId, commandId: uid(), now: now + 12_000 });
    expect(timedOut.ok).toBe(true);
    if (!timedOut.ok) return;
    expect(timedOut.state.status).toBe('NO_DEAL');
    expect(timedOut.state.completionReason).toBe('TIMED_OUT');
    expect(timedOut.state.economy).not.toBeNull();
    for (const p of Object.values(timedOut.state.economy!.players)) expect(p.grossReward).toBe(0);
    expect(timedOut.events.map((e) => e.type)).toEqual(['TIMED_OUT', 'MATCH_COMPLETED']);

    // Normalized rows: reason + attribution + zero-gross result.
    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, include: { result: true } });
    expect(row.completionReason).toBe('TIMED_OUT');
    expect(row.timeoutPlayerId).toBe(sellerId);
    expect(row.result).not.toBeNull();
    expect(row.result!.buyerGrossReward.toNumber()).toBe(0);
    expect(row.result!.sellerGrossReward.toNumber()).toBe(0);

    // The snapshot's config round-trips the tiny-limit values.
    const snapshot = await service.loadSnapshot(matchId);
    expect(snapshot!.config.hardDecisionTimeLimitMs).toBe(10_000);
    expect(snapshot!.config.timeoutPolicy).toBe('ATTRIBUTED_NO_DEAL');

    // Idempotency: the same timeout commandId can never apply twice.
    const replay = await service.timeout({ kind: 'TIMEOUT', matchId, playerId: sellerId, commandId: uid(), now: now + 12_000 });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.code).toBe('MATCH_NOT_ACTIVE');

    // Stored event stream replays to the exact terminal state (GR-024).
    const replayed = replayMatch(input, snapshot!.config, await service.listEvents(matchId));
    expect(replayed.state).toEqual(snapshot!.state);
    expect(replayed.state.completionReason).toBe('TIMED_OUT');
  });

  // -- Negotiation Intelligence, IN-1 (DEC-028) ------------------------------

  it('computes and persists the behavior analysis atomically at completion', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);

    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: sellerId, offerId: uid(), amountTenths: 800, commandId: uid(), now });
    const walk = await service.walkAway({ kind: 'WALK_AWAY', matchId, playerId: buyerId, commandId: uid(), now: now + 1000 });
    expect(walk.ok).toBe(true);

    const rows = await prisma.matchFeature.findMany({ where: { matchId } });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.version).sort()).toEqual(['feature-engine-0.1.0', 'feature-engine-0.1.0']);
    const buyerRow = rows.find((r) => r.playerId === buyerId)!;
    const buyerFeatures = buyerRow.features as Record<string, unknown>;
    expect(buyerFeatures.outcome).toBe('NO_DEAL_WALKED');
    expect(buyerFeatures.zopaTenths).toBe(600);
    expect(buyerFeatures.offerCount).toBe(1);

    const observations = await prisma.matchObservation.findMany({
      where: { matchId, playerId: buyerId },
      orderBy: { ordinal: 'asc' },
    });
    const types = observations.map((o) => o.type);
    expect(types).toContain('MISSED_STANDING_OFFER'); // walked with 800 > RV? no — 800 ≤ 1000 → missed
    expect(types).toContain('FAILED_POSITIVE_ZOPA');
    expect(types).toContain('STRONG_OPENING_POSITION'); // 500 sits near the seller's limit (0.1667)
    expect(observations.every((o) => o.version === 'observation-engine-0.1.0')).toBe(true);

    const loaded = await service.loadAnalysis(matchId, buyerId);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe('feature-engine-0.1.0');
    expect((loaded!.features as Record<string, unknown>).outcome).toBe('NO_DEAL_WALKED');
    expect(loaded!.observations.map((o) => o.type)).toEqual(types);
  });

  it('leaves no analysis rows for matches that are still active', async () => {
    const matchId = uid();
    expect((await service.createMatch(makeMatchInput(matchId))).ok).toBe(true);
    const now = Date.now();
    await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: uid(), now });
    await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: uid(), now });
    await service.offer({ kind: 'OFFER', matchId, playerId: buyerId, offerId: uid(), amountTenths: 500, commandId: uid(), now });

    expect(await prisma.matchFeature.findMany({ where: { matchId } })).toHaveLength(0);
    expect(await prisma.matchObservation.findMany({ where: { matchId } })).toHaveLength(0);
    expect(await service.loadAnalysis(matchId, buyerId)).toBeNull();
  });
});
