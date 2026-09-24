/**
 * DA-P1 (BB-229) integration: deployment tags on /health, sanitized 500s,
 * and the server-side events (signup_completed, handle_created,
 * result_viewed with in-process dedup, client event passthrough) — checked
 * on the emitted stdout lines. stdout capture is scoped per test with
 * vi.spyOn; analytics lines are the only stdout writes from these paths.
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

function analyticsLines(): Record<string, unknown>[] {
  return stdoutSpy.mock.calls
    .map((call: unknown[]) => String(call[0]))
    .filter((chunk: string) => chunk.includes('analytics_event'))
    .map((chunk: string) => JSON.parse(chunk) as Record<string, unknown>);
}

describe.skipIf(!RUN)('DA-P1 observability (PostgreSQL)', () => {
  beforeAll(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    service = new MatchCommandService(prisma);
    app = await buildApp({
      auth: createDevAuthAdapter('test-secret'),
      prisma,
      exposeDevAuth: true,
      timeoutScheduler: null,
      deployment: { environment: 'e2e', release: 'da-p1-test' },
    });
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

  it('tags /health with environment and release', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; service: string; environment: string; release: string };
    expect(body.ok).toBe(true);
    expect(body.environment).toBe('e2e');
    expect(body.release).toBe('da-p1-test');
  });

  it('sanitizes unhandled route errors to INTERNAL_ERROR without echoing the message', async () => {
    const account = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_dap1_error' } });
    const { token } = account.json() as { token: string };
    // A non-uuid match id makes the participant lookup throw (Prisma
    // validation) — an unhandled route error, not a domain refusal.
    const res = await app.inject({ method: 'GET', url: '/v1/matches/not-a-uuid', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ code: 'INTERNAL_ERROR', message: 'internal server error' });
    // A normal 404 path is untouched by the handler.
    const missing = await app.inject({ method: 'GET', url: '/v1/nope', headers: { authorization: `Bearer ${token}` } });
    expect(missing.statusCode).toBe(404);
  });

  it('passes framework parser errors through as sanitized 400 INVALID_REQUEST (BB-233)', async () => {
    // Malformed JSON body: Fastify throws FST_ERR_CTP_INVALID_JSON_BODY
    // (statusCode 400) — a client error, not a 500.
    const malformed = await app.inject({
      method: 'POST',
      url: '/v1/auth/dev/signin',
      headers: { 'content-type': 'application/json' },
      payload: 'not-json',
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ code: 'INVALID_REQUEST', message: 'invalid request body' });
  });

  it('emits signup_completed exactly once per user (dev signin + protected request paths)', async () => {
    const first = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_dap1_signup' } });
    expect(first.statusCode).toBe(200);
    const { token } = first.json() as { token: string };

    const signups = analyticsLines().filter((line) => line.analytics_event === 'signup_completed');
    expect(signups).toHaveLength(1);
    expect(signups[0]!.playerId).toBe((first.json() as { userId: string }).userId);
    expect(signups[0]!.authProvider).toBe('dev');
    expect(signups[0]!.environment).toBe('e2e');
    expect(signups[0]!.release).toBe('da-p1-test');
    expect(signups[0]!.service).toBe('api');

    // Same subject again + a protected request: still exactly one signup.
    await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_dap1_signup' } });
    await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(analyticsLines().filter((line) => line.analytics_event === 'signup_completed')).toHaveLength(1);
  });

  it('emits handle_created on every successful setHandle (both routes)', async () => {
    const withHandle = await app.inject({
      method: 'POST',
      url: '/v1/auth/dev/signin',
      payload: { subject: 'dev_dap1_handle', handle: 'DapOne' },
    });
    expect(withHandle.statusCode).toBe(200);
    const { token, userId } = withHandle.json() as { token: string; userId: string };

    const change = await app.inject({
      method: 'POST',
      url: '/v1/me/handle',
      headers: { authorization: `Bearer ${token}` },
      payload: { handle: 'DapTwo' },
    });
    expect(change.statusCode).toBe(200);

    const handles = analyticsLines().filter((line) => line.analytics_event === 'handle_created');
    expect(handles).toHaveLength(2);
    expect(handles.every((line) => line.playerId === userId)).toBe(true);
  });

  it('emits result_viewed at most once per (match, player) per process', async () => {
    const buyer = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_dap1_result' } });
    const seller = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_dap1_result_opp' } });
    const { token: buyerToken, userId: buyerId } = buyer.json() as { token: string; userId: string };
    const { userId: sellerId } = seller.json() as { userId: string };

    const matchId = randomUUID();
    const created = await service.createMatch({
      matchId,
      mode: 'FRIEND_LIVE',
      scenarioId: SEEDED_SCENARIO_ID,
      scenarioVersion: 1,
      gameRulesVersion: 'game-rules-0.1.0',
      economyConfigVersion: 'economy-0.2.0',
      ratingVersion: null,
      buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 500 },
      seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 300 },
      firstPlayerId: buyerId,
      createdAt: Date.now() - 60_000,
    });
    expect(created.ok).toBe(true);
    const now = Date.now();
    for (const playerId of [buyerId, sellerId]) {
      const ready = await service.ready({ kind: 'READY', matchId, playerId, commandId: randomUUID(), now });
      expect(ready.ok).toBe(true);
    }
    const walked = await service.walkAway({ kind: 'WALK_AWAY', matchId, playerId: buyerId, commandId: randomUUID(), now });
    expect(walked.ok).toBe(true);

    const first = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/result`, headers: { authorization: `Bearer ${buyerToken}` } });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/result`, headers: { authorization: `Bearer ${buyerToken}` } });
    expect(second.statusCode).toBe(200);

    const results = analyticsLines().filter((line) => line.analytics_event === 'result_viewed');
    expect(results).toHaveLength(1); // the second view was deduped
    expect(results[0]!.matchId).toBe(matchId);
    expect(results[0]!.playerId).toBe(buyerId);
  });

  it('passes client events through with meta and client deployment tags', async () => {
    const signin = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_dap1_client' } });
    const { token, userId } = signin.json() as { token: string; userId: string };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/analytics/event',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'rematch_clicked',
        matchId: randomUUID(),
        meta: { path: '/play' },
        client_environment: 'e2e',
        client_release: 'local',
      },
    });
    expect(res.statusCode).toBe(200);
    const events = analyticsLines().filter((line) => line.analytics_event === 'rematch_clicked');
    expect(events).toHaveLength(1);
    expect(events[0]!.playerId).toBe(userId);
    expect(events[0]!.path).toBe('/play');
    expect(events[0]!.client_environment).toBe('e2e');
    expect(events[0]!.client_release).toBe('local');
    expect(events[0]!.environment).toBe('e2e'); // server tags still win the api-side stamp

    // Unknown names are rejected by the enum.
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/analytics/event',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'not_an_event' },
    });
    expect(bad.statusCode).toBe(400);
  });
});
