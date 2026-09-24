/**
 * BB-251 (BB-247 alpha gaps): the funnel signals — challenge_created,
 * challenge_joined, match_started (friend + rematch + AI-human READY),
 * and the AI-engine match_completed (the first-alpha path must be
 * visible). Stdout lines captured per test with vi.spyOn.
 */

import { createPrismaClient, MatchCommandService, type PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
let stdoutSpy: ReturnType<typeof vi.spyOn>;

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

function cmd() {
  return { commandId: randomUUID() };
}

function linesOf(name: string): Record<string, unknown>[] {
  return stdoutSpy.mock.calls
    .map((call: unknown[]) => String(call[0]))
    .filter((chunk: string) => chunk.includes('analytics_event'))
    .map((chunk: string) => JSON.parse(chunk) as Record<string, unknown>)
    .filter((line: Record<string, unknown>) => line.analytics_event === name);
}

async function pollUntil(predicate: () => Promise<boolean>, timeoutMs: number, intervalMs: number): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) throw new Error('poll timed out');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe.skipIf(!RUN)('Alpha funnel signals (PostgreSQL)', () => {
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

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('emits challenge_created, challenge_joined, and match_started across the friend funnel', async () => {
    const buyer = await signin('dev_gap_buyer');
    const seller = await signin('dev_gap_seller');

    const created = await app.inject({ method: 'POST', url: '/v1/challenges', headers: auth(buyer.token), payload: cmd() });
    expect(created.statusCode).toBe(201);
    const { matchId, token: invite, role: buyerRole } = created.json() as { matchId: string; token: string; role: 'BUYER' | 'SELLER' };

    const joined = await app.inject({ method: 'POST', url: `/v1/challenges/${invite}/join`, headers: auth(seller.token), payload: cmd() });
    expect(joined.statusCode).toBe(200);
    const { role: sellerRole } = joined.json() as { role: 'BUYER' | 'SELLER' };

    for (const account of [buyer, seller]) {
      const ready = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(account.token), payload: cmd() });
      expect(ready.statusCode).toBe(200);
    }

    const createdLines = linesOf('challenge_created');
    expect(createdLines).toHaveLength(1);
    expect(createdLines[0]!.matchId).toBe(matchId);
    expect(createdLines[0]!.playerId).toBe(buyer.userId);
    expect(createdLines[0]!.mode).toBe('FRIEND_LIVE');
    expect(createdLines[0]!.role).toBe(buyerRole);
    expect(createdLines[0]!.environment).toBeDefined();

    const joinedLines = linesOf('challenge_joined');
    expect(joinedLines).toHaveLength(1);
    expect(joinedLines[0]!.matchId).toBe(matchId);
    expect(joinedLines[0]!.playerId).toBe(seller.userId);
    expect(joinedLines[0]!.role).toBe(sellerRole);

    const startedLines = linesOf('match_started');
    expect(startedLines).toHaveLength(1);
    expect(startedLines[0]!.matchId).toBe(matchId);
    expect(startedLines[0]!.playerId).toBeNull();
    expect(startedLines[0]!.mode).toBe('FRIEND_LIVE');
  });

  it('emits match_started when a rematch accept opens the new match', async () => {
    const buyer = await signin('dev_gap_rm_buyer');
    const seller = await signin('dev_gap_rm_seller');

    // A terminal friend match via the service.
    const sourceId = randomUUID();
    const created = await service.createMatch({
      matchId: sourceId,
      mode: 'FRIEND_LIVE',
      scenarioId: SEEDED_SCENARIO_ID,
      scenarioVersion: 1,
      gameRulesVersion: 'game-rules-0.1.0',
      economyConfigVersion: 'economy-0.3.0',
      ratingVersion: null,
      buyer: { playerId: buyer.userId, role: 'BUYER', reservationValueTenths: 500, verifiableFactIds: [] },
      seller: { playerId: seller.userId, role: 'SELLER', reservationValueTenths: 300, verifiableFactIds: [] },
      firstPlayerId: buyer.userId,
      createdAt: Date.now(),
    });
    expect(created.ok).toBe(true);
    const now = Date.now();
    for (const playerId of [buyer.userId, seller.userId]) {
      const ready = await service.ready({ kind: 'READY', matchId: sourceId, playerId, commandId: randomUUID(), now });
      expect(ready.ok).toBe(true);
    }
    const walked = await service.walkAway({ kind: 'WALK_AWAY', matchId: sourceId, playerId: buyer.userId, commandId: randomUUID(), now });
    expect(walked.ok).toBe(true);

    const propose = await app.inject({ method: 'POST', url: `/v1/matches/${sourceId}/rematch`, headers: auth(seller.token), payload: cmd() });
    expect(propose.statusCode).toBe(201);
    const proposalId = (propose.json() as { matchId: string }).matchId;
    const accept = await app.inject({ method: 'POST', url: `/v1/matches/${proposalId}/rematch/accept`, headers: auth(buyer.token), payload: cmd() });
    expect(accept.statusCode).toBe(200);

    const startedLines = linesOf('match_started');
    expect(startedLines).toHaveLength(1);
    expect(startedLines[0]!.matchId).toBe(proposalId);
    expect(startedLines[0]!.mode).toBe('FRIEND_LIVE');
  });

  it('emits match_completed when the AI engine (not the human route) completes a practice match', { timeout: 30_000 }, async () => {
    const human = await signin('dev_gap_ai');
    const created = await app.inject({ method: 'POST', url: '/v1/matches/ai', headers: auth(human.token), payload: { commandId: randomUUID(), persona: 'closer' } });
    expect(created.statusCode).toBe(201);
    const { matchId } = created.json() as { matchId: string };

    const ready = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(human.token), payload: cmd() });
    expect(ready.statusCode).toBe(200);

    // Offer at my own RV — crosses the AI's line; the Closer accepts any
    // legal deal, so the completion commits through the engine's path.
    const snapshot = async () => {
      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(human.token) });
      return res.json() as { view: { myReservationValueTenths?: number; status: string; myTurn: boolean } };
    };
    await pollUntil(async () => (await snapshot()).view.status === 'ACTIVE', 5_000, 400);
    // Wait for my turn: immediate when I am the first mover, after the AI's
    // move otherwise (the first mover is random).
    await pollUntil(async () => (await snapshot()).view.myTurn, 10_000, 400);
    const myRv = (await snapshot()).view.myReservationValueTenths!;
    const offer = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/offers`,
      headers: auth(human.token),
      payload: { commandId: randomUUID(), offerId: randomUUID(), amountTenths: myRv },
    });
    expect(offer.statusCode).toBe(200);
    await pollUntil(async () => (await snapshot()).view.status === 'DEAL', 15_000, 400);

    const completed = linesOf('match_completed').filter((line) => line.matchId === matchId);
    expect(completed).toHaveLength(1);
    expect(completed[0]!.mode).toBe('AI');
    expect(completed[0]!.completionReason).toBe('ACCEPTED');
  });

  it('passes the bay_viewed client event through and keeps feedback_submitted server-only', async () => {
    const human = await signin('dev_gap_bay');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/analytics/event',
      headers: auth(human.token),
      payload: { name: 'bay_viewed', client_environment: 'e2e', client_release: 'local' },
    });
    expect(res.statusCode).toBe(200);
    const bay = linesOf('bay_viewed');
    expect(bay).toHaveLength(1);
    expect(bay[0]!.playerId).toBe(human.userId);
    expect(bay[0]!.client_environment).toBe('e2e');

    // feedback_submitted is a server-side event (BB-248's endpoint emits
    // it) — never a client-submittable name.
    const rejected = await app.inject({
      method: 'POST',
      url: '/v1/analytics/event',
      headers: auth(human.token),
      payload: { name: 'feedback_submitted' },
    });
    expect(rejected.statusCode).toBe(400);
  });
});
