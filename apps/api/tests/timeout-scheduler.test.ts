/**
 * TimeoutScheduler integration tests (GR-023/GR-024, DD Phase 1).
 * Run with the database up: `pnpm test:db`.
 *
 * No sleep-based fixes: every wait is an expect.poll for the authoritative
 * terminal state (NO_DEAL / completionReason TIMED_OUT).
 */

import { MatchCommandService, Prisma, createPrismaClient } from '@bounty-bay/db';
import { elapsedActiveMs } from '@bounty-bay/domain';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { cleanupDevUsers } from './helpers';
import { createDevAuthAdapter } from '../src/auth/adapters';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';
const SCENARIO_FIXTURE_ID = '00000000-0000-4000-8000-000000000001'; // seed: Harbor Tug
const TTL_VERSION = 'economy-ttl-sched';
const TTL_MS = 300;

let prisma: ReturnType<typeof createPrismaClient>;
let app: FastifyInstance;
let buyerToken: string;
let sellerToken: string;
let buyerId: string;
let sellerId: string;

function auth(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

async function seedTtlConfig(): Promise<void> {
  await prisma.gameBalanceConfig.upsert({
    where: { version: TTL_VERSION },
    update: {},
    create: {
      version: TTL_VERSION,
      matchBountyChips: 100,
      concessionBudgetChips: 100,
      concessionK: new Prisma.Decimal(10),
      concessionAlpha: new Prisma.Decimal(0.6),
      clockFloorMultiplier: new Prisma.Decimal(0.3),
      clockFloorMs: BigInt(60_000),
      turnGraceMs: 0,
      maxAmountTenths: BigInt(9_999_999_999),
      hardDecisionTimeLimitMs: BigInt(TTL_MS),
      timeoutPolicy: 'ATTRIBUTED_NO_DEAL',
      timeWarningLowMs: 200,
      timeWarningCriticalMs: 100,
      activeForNewMatches: false,
    },
  });
}

/** Creates a match under the tiny-limit config (CREATED, not readied). */
async function createTtlMatch(service: MatchCommandService): Promise<string> {
  const matchId = randomUUID();
  const created = await service.createMatch({
    matchId,
    mode: 'FRIEND_LIVE',
    scenarioId: SCENARIO_FIXTURE_ID,
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: TTL_VERSION,
    ratingVersion: null,
    buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 1000 },
    seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 400 },
    firstPlayerId: buyerId,
    createdAt: Date.now(),
  });
  expect(created.ok).toBe(true);
  return matchId;
}

async function readyViaHttp(matchId: string): Promise<void> {
  for (const token of [buyerToken, sellerToken]) {
    const res = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(token), payload: { commandId: randomUUID() } });
    expect(res.statusCode).toBe(200);
  }
}

async function snapshotOf(matchId: string, token: string): Promise<{ status: number; reason: string | null; timeoutPlayerId: string | null }> {
  const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(token) });
  const body = res.json() as { view?: { status: string; completionReason: string | null }; timeoutPlayerId?: string | null };
  return {
    status: res.statusCode,
    reason: body.view?.completionReason ?? null,
    timeoutPlayerId: body.timeoutPlayerId ?? null,
  };
}

describe.skipIf(!RUN)('TimeoutScheduler (PostgreSQL)', () => {
  beforeAll(async () => {
    const dev = createDevAuthAdapter('test-secret');
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    await seedTtlConfig();
    app = await buildApp({ auth: dev, prisma, exposeDevAuth: true, disconnectDebounceMs: 0 });

    const buyer = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_sched_buyer' } });
    buyerToken = buyer.json().token as string;
    buyerId = buyer.json().userId as string;
    const seller = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_sched_seller' } });
    sellerToken = seller.json().token as string;
    sellerId = seller.json().userId as string;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('fires the TIMEOUT command at the deadline: NO_DEAL, reason TIMED_OUT, attribution persisted', async () => {
    const service = new MatchCommandService(prisma);
    const matchId = await createTtlMatch(service);

    // Ready via the HTTP route so commitAndBroadcast arms the scheduler.
    await readyViaHttp(matchId);

    await expect.poll(async () => (await snapshotOf(matchId, buyerToken)).reason, { interval: 25 }).toBe('TIMED_OUT');

    // Distinct record: reason + attribution, never a walk-away.
    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
    expect(row.status).toBe('NO_DEAL');
    expect(row.completionReason).toBe('TIMED_OUT');
    expect(row.timeoutPlayerId).toBe(buyerId); // buyer was the stalled first mover

    // The committed event stream carries TIMED_OUT + MATCH_COMPLETED.
    const events = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/events`, headers: auth(buyerToken) });
    const types = events.json().events.map((e: { type: string }) => e.type);
    expect(types).toContain('TIMED_OUT');
    expect(types).toContain('MATCH_COMPLETED');
  });

  it('bootScan times out an over-limit ACTIVE match left by a restart', async () => {
    // Create + ready with NO scheduler listening: this is the state a crash
    // leaves behind (ACTIVE, deadline passed). Poll for the domain-level
    // condition "budget exhausted" instead of sleeping.
    const service = new MatchCommandService(prisma);
    const matchId = await createTtlMatch(service);
    const now = Date.now();
    expect((await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: randomUUID(), now })).ok).toBe(true);
    expect((await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: randomUUID(), now })).ok).toBe(true);

    await expect
      .poll(
        async () => {
          const snapshot = await service.loadSnapshot(matchId);
          if (!snapshot) return null;
          const { state } = snapshot;
          if (state.status !== 'ACTIVE' || state.activePlayerId === null) return null;
          const active = state.participants.find((p) => p.playerId === state.activePlayerId)!;
          return elapsedActiveMs(active, state, Date.now());
        },
        { interval: 25 },
      )
      .toBeGreaterThanOrEqual(TTL_MS);

    // A fresh API boot rescues it (onReady → bootScan → fire).
    const dev = createDevAuthAdapter('test-secret');
    const restarted = await buildApp({ auth: dev, prisma, exposeDevAuth: true, disconnectDebounceMs: 0 });
    try {
      await restarted.ready();
      await expect
        .poll(async () => {
          const res = await restarted.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyerToken) });
          const body = res.json() as { view?: { status: string; completionReason: string | null } };
          return { status: body.view?.status ?? null, reason: body.view?.completionReason ?? null };
        })
        .toMatchObject({ status: 'NO_DEAL', reason: 'TIMED_OUT' });
    } finally {
      await restarted.close();
    }
  }, 10_000);
});
