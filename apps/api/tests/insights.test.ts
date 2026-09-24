/**
 * Insights API (BB-220, D-25): GET /v1/me/insights serves the IN-3
 * longitudinal profile for the caller themselves — computed from their
 * own stored feature rows (DEC-028) by the pure profile engine. The
 * opponent never appears in the payload (docs/18 §14 self-analysis).
 */

import { createPrismaClient, MatchCommandService, type PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDevAuthAdapter } from '../src/auth/adapters';
import { cleanupDevUsers } from './helpers';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';
const SEEDED_SCENARIO_ID = '00000000-0000-4000-8000-000000000001';

let app: FastifyInstance;
let prisma: PrismaClient;
let service: MatchCommandService;

interface Account {
  token: string;
  userId: string;
}

async function signin(subject: string): Promise<Account> {
  const res = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject } });
  expect(res.statusCode).toBe(200);
  return res.json() as Account;
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

/**
 * A terminal match via the service (buyer walks away → NO_DEAL), with a
 * controllable completion timestamp so profile ordering is deterministic.
 * `abort` produces an ABORTED completion (technical termination).
 */
async function completeMatch(
  buyerId: string,
  sellerId: string,
  completedAt: number,
  mode: 'walk-away' | 'abort' = 'walk-away',
): Promise<string> {
  const matchId = randomUUID();
  const created = await service.createMatch({
    matchId,
    mode: 'FRIEND_LIVE',
    scenarioId: SEEDED_SCENARIO_ID,
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.2.0',
    ratingVersion: null,
    buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 500, verifiableFactIds: [] },
    seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 300, verifiableFactIds: [] },
    firstPlayerId: buyerId,
    createdAt: completedAt - 60_000,
  });
  expect(created.ok).toBe(true);
  for (const playerId of [buyerId, sellerId]) {
    const ready = await service.ready({ kind: 'READY', matchId, playerId, commandId: randomUUID(), now: completedAt - 30_000 });
    expect(ready.ok).toBe(true);
  }
  const outcome =
    mode === 'walk-away'
      ? await service.walkAway({ kind: 'WALK_AWAY', matchId, playerId: buyerId, commandId: randomUUID(), now: completedAt })
      : await service.abort({ kind: 'ABORT', matchId, commandId: randomUUID(), now: completedAt });
  expect(outcome.ok).toBe(true);
  return matchId;
}

async function insightsOf(token: string) {
  return app.inject({ method: 'GET', url: '/v1/me/insights', headers: auth(token) });
}

interface InsightPayload {
  profile: {
    version: string;
    playerId: string;
    matchCount: number;
    confidenceBand: string;
    lastMatchEndedAt: number;
    lifetime: { matchCount: number; dimensions: Record<string, { count: number; mean: number | null; min: number | null; max: number | null }> };
    recent: { matchCount: number };
    previous: { matchCount: number };
    rolling: { matchCount: number };
    trends: { metric: string; recent: number; previous: number; direction: string; delta: number }[];
    descriptors: { id: string; label: string; evidence: unknown[] }[];
    roleSplit: {
      buyer: { matchCount: number; agreementRate: { mean: number | null } };
      seller: { matchCount: number; agreementRate: { mean: number | null } };
    };
  } | null;
}

describe.skipIf(!RUN)('Insights API (PostgreSQL)', () => {
  beforeAll(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    service = new MatchCommandService(prisma);
    app = await buildApp({ auth: createDevAuthAdapter('test-secret'), prisma, exposeDevAuth: true, timeoutScheduler: null });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('returns profile: null for a player with no completed matches', async () => {
    const fresh = await signin('dev_insights_empty');
    const res = await insightsOf(fresh.token);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ profile: null });
  });

  it('profiles only the caller’s own matches — opponent id never appears (docs/18 §14)', async () => {
    const me = await signin('dev_insights_me');
    const opponent = await signin('dev_insights_opponent');
    const stranger = await signin('dev_insights_stranger');
    await completeMatch(me.userId, opponent.userId, Date.now());
    // The opponent's own separate history must never leak into my payload.
    await completeMatch(opponent.userId, stranger.userId, Date.now() + 1);

    const res = await insightsOf(me.token);
    expect(res.statusCode).toBe(200);
    const raw = String(res.body);
    expect(raw).toContain(me.userId);
    expect(raw).not.toContain(opponent.userId);

    const profile = (res.json() as InsightPayload).profile!;
    expect(profile.playerId).toBe(me.userId);
    expect(profile.matchCount).toBe(1);
    expect(profile.version).toBe('longitudinal-profile-0.1.0');
  });

  it('walk-away dims are exact: agreement 0, noDeal 1, timeout 0, walkAway 1', async () => {
    const buyer = await signin('dev_insights_dims');
    const seller = await signin('dev_insights_dims_opp');
    await completeMatch(buyer.userId, seller.userId, Date.now());

    const profile = (await insightsOf(buyer.token).then((r) => r.json()) as InsightPayload).profile!;
    const dims = profile.lifetime.dimensions;
    expect(dims.agreementRate!.mean).toBe(0);
    expect(dims.noDealRate!.mean).toBe(1);
    expect(dims.timeoutRate!.mean).toBe(0);
    expect(dims.walkAwayRate!.mean).toBe(1);
    expect(profile.confidenceBand).toBe('INSUFFICIENT_DATA');
    expect(profile.lastMatchEndedAt).toBeGreaterThan(0);
  });

  it('excludes aborted matches (technical termination is not a negotiation)', async () => {
    const buyer = await signin('dev_insights_abort');
    const seller = await signin('dev_insights_abort_opp');
    const now = Date.now();
    await completeMatch(buyer.userId, seller.userId, now);
    await completeMatch(buyer.userId, seller.userId, now + 1, 'abort');

    const profile = (await insightsOf(buyer.token).then((r) => r.json()) as InsightPayload).profile!;
    expect(profile.matchCount).toBe(1);

    // An abort-only history is the empty state, not an error.
    const abortOnly = await signin('dev_insights_abort_only');
    await completeMatch(abortOnly.userId, seller.userId, now + 2, 'abort');
    const empty = await insightsOf(abortOnly.token);
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ profile: null });
  });

  it('windows, band, trends, and role split across twelve matches', async () => {
    const buyer = await signin('dev_insights_windows');
    const seller = await signin('dev_insights_windows_opp');
    const base = Date.now() - 12 * 60_000;
    for (let i = 0; i < 12; i += 1) {
      await completeMatch(buyer.userId, seller.userId, base + i * 60_000);
    }
    // One match as SELLER (first player walks — set seller as first player).
    const asSeller = randomUUID();
    const created = await service.createMatch({
      matchId: asSeller,
      mode: 'FRIEND_LIVE',
      scenarioId: SEEDED_SCENARIO_ID,
      scenarioVersion: 1,
      gameRulesVersion: 'game-rules-0.1.0',
      economyConfigVersion: 'economy-0.2.0',
      ratingVersion: null,
      buyer: { playerId: seller.userId, role: 'BUYER', reservationValueTenths: 500, verifiableFactIds: [] },
      seller: { playerId: buyer.userId, role: 'SELLER', reservationValueTenths: 300, verifiableFactIds: [] },
      firstPlayerId: buyer.userId, // seller is first player → the walk is legal
      createdAt: Date.now() - 60_000,
    });
    expect(created.ok).toBe(true);
    for (const playerId of [buyer.userId, seller.userId]) {
      const ready = await service.ready({ kind: 'READY', matchId: asSeller, playerId, commandId: randomUUID(), now: Date.now() - 30_000 });
      expect(ready.ok).toBe(true);
    }
    const walked = await service.walkAway({ kind: 'WALK_AWAY', matchId: asSeller, playerId: buyer.userId, commandId: randomUUID(), now: Date.now() });
    expect(walked.ok).toBe(true);

    const profile = (await insightsOf(buyer.token).then((r) => r.json()) as InsightPayload).profile!;
    expect(profile.matchCount).toBe(13);
    expect(profile.confidenceBand).toBe('EARLY_SIGNAL'); // 13 ≤ 14
    expect(profile.recent.matchCount).toBe(10);
    expect(profile.previous.matchCount).toBe(3); // 13 − 10
    expect(profile.rolling.matchCount).toBe(5);
    // Both windows have data → trends exist for the non-deal dimensions,
    // each with a legal direction and a numeric delta.
    expect(profile.trends.length).toBeGreaterThan(0);
    for (const trend of profile.trends) {
      expect(['UP', 'DOWN', 'FLAT']).toContain(trend.direction);
      expect(Number.isFinite(trend.delta)).toBe(true);
      expect(Math.abs(trend.delta - (trend.recent - trend.previous))).toBeLessThan(1e-9);
    }
    expect(profile.roleSplit.buyer.matchCount).toBe(12);
    expect(profile.roleSplit.seller.matchCount).toBe(1);
    // Descriptors (provisional thresholds, OQ-025): gated by minMatches,
    // capped, evidence-carrying, gameplay-tendency ids only.
    const knownIds = [
      'AGGRESSIVE_OPENER', 'CAUTIOUS_OPENER', 'HARD_BARGAINER', 'FREQUENT_CONCEDER', 'SILENT_NEGOTIATOR',
      'QUICK_DECIDER', 'SLOW_DECIDER', 'PATIENT_CLOSER', 'QUICK_CLOSER', 'TIME_PRESSURED',
    ];
    expect(profile.descriptors.length).toBeLessThanOrEqual(3);
    for (const descriptor of profile.descriptors) {
      expect(knownIds).toContain(descriptor.id);
      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.evidence.length).toBeGreaterThan(0);
    }
    // Under the 5-match gate there are no descriptors at all.
    const few = await signin('dev_insights_few');
    await completeMatch(few.userId, seller.userId, Date.now());
    const fewProfile = (await insightsOf(few.token).then((r) => r.json()) as InsightPayload).profile!;
    expect(fewProfile.descriptors).toEqual([]);
  });
});
