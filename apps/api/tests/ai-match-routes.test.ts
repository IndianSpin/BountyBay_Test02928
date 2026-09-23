/**
 * AI practice lifecycle (DEC-025, docs/08): POST /v1/matches/ai creates an
 * unrated practice match; the AI readies immediately, answers through the
 * same command path as humans, and the match settles with the AI's RV
 * revealed only post-terminal. Includes the restart/idempotency guarantees
 * of the turn engine and the bot-identity hardening.
 */

import { createPrismaClient, MatchCommandService, type PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { AiTurnEngine } from '../src/ai/engine';
import { buildApp } from '../src/app';
import { createDevAuthAdapter } from '../src/auth/adapters';
import { cleanupDevUsers } from './helpers';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

let app: FastifyInstance;
let prisma: PrismaClient;
let dev: ReturnType<typeof createDevAuthAdapter>;

interface Account {
  token: string;
  userId: string;
}

async function signin(subject: string): Promise<Account> {
  const res = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject } });
  expect(res.statusCode).toBe(200);
  return res.json() as Account;
}

async function pollUntil(cond: () => Promise<boolean>, timeoutMs: number, stepMs = 250): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await cond()) return;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error('poll timed out');
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function matchStatus(matchId: string, token: string): Promise<string> {
  const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(token) });
  expect(res.statusCode).toBe(200);
  return (res.json() as { view: { status: string } }).view.status;
}

describe.skipIf(!RUN)('AI practice routes (PostgreSQL)', () => {
  beforeAll(async () => {
    dev = createDevAuthAdapter('test-secret');
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    app = await buildApp({ auth: dev, prisma, exposeDevAuth: true });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /v1/matches/ai creates an unrated AI match with the persona', async () => {
    const human = await signin('dev_ai_route_h');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(human.token),
      payload: { commandId: randomUUID(), persona: 'closer' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.mode).toBe('AI');
    expect(body.unrated).toBe(true);
    expect(body.persona).toMatchObject({ key: 'closer', displayName: 'The Closer', handle: 'TheCloser' });
    expect(body.aiReady).toBe(true);
    expect(typeof body.matchId).toBe('string');
    expect(typeof body.reservationValueTenths).toBe('number');

    const row = await prisma.match.findUniqueOrThrow({
      where: { id: body.matchId },
      include: { participants: { include: { user: true } } },
    });
    expect(row.mode).toBe('AI');
    expect(row.ratingVersion).toBeNull();
    expect(row.aiPersonaKey).toBe('closer');
    expect(row.aiPersonaVersion).toBe('ai-personas-0.1.0');
    expect(row.participants).toHaveLength(2);
    expect(row.participants.some((p) => p.user.isBot)).toBe(true);
    expect(row.participants.some((p) => p.userId === human.userId)).toBe(true);
  });

  it('rejects invalid personas and missing commandIds', async () => {
    const human = await signin('dev_ai_route_h2');
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(human.token),
      payload: { commandId: randomUUID(), persona: 'salesman' },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().code).toBe('INVALID_REQUEST');

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(human.token),
      payload: { persona: 'closer' },
    });
    expect(missing.statusCode).toBe(400);
  });

  it('bot profiles are never publicly served (DEC-025)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/profiles/TheCloser' });
    expect(res.statusCode).toBe(404);
  });

  it('full practice match: AI answers, deal settles, no rating side effects', { timeout: 30_000 }, async () => {
    const human = await signin('dev_ai_route_full');
    const meBefore = await app.inject({ method: 'GET', url: '/v1/me', headers: auth(human.token) });
    expect(meBefore.statusCode).toBe(200);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(human.token),
      payload: { commandId: randomUUID(), persona: 'closer' },
    });
    expect(created.statusCode).toBe(201);
    const matchId = created.json().matchId as string;
    const myRv = created.json().reservationValueTenths as number;
    const aiPlayerId = created.json().aiPlayerId as string;

    // snapshot carries the labeled AI opponent
    const snapshot = async () => {
      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(human.token) });
      expect(res.statusCode).toBe(200);
      return res.json() as {
        view: {
          status: string;
          myTurn: boolean;
          myPlayerId: string;
          participants: { playerId: string; latestOfferTenths: number | null; reservationValueTenths?: number }[];
        };
        aiOpponents: { playerId: string; personaKey: string; displayName: string }[];
      };
    };
    const first = await snapshot();
    expect(first.aiOpponents).toEqual([{ playerId: aiPlayerId, personaKey: 'closer', displayName: 'The Closer' }]);

    // active-match discovery (item 30 partial)
    const active = await app.inject({ method: 'GET', url: '/v1/me/active-match', headers: auth(human.token) });
    expect(active.statusCode).toBe(200);
    expect(active.json().activeMatch).toMatchObject({ matchId, mode: 'AI', aiPersonaKey: 'closer', opponentHandle: 'TheCloser' });

    // human readies → ACTIVE; the AI (maybe first mover) answers within its think range
    const ready = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/ready`,
      headers: auth(human.token),
      payload: { commandId: randomUUID() },
    });
    expect(ready.statusCode).toBe(200);

    await pollUntil(async () => (await snapshot()).view.status === 'ACTIVE', 5_000);
    // wait for my turn: immediate when I am the first mover, after the AI's
    // move otherwise. The AI may answer with accept instead of an offer, so
    // only the turn matters here.
    await pollUntil(async () => (await snapshot()).view.myTurn, 10_000, 400);

    // offer at my own RV — crosses the AI's line; the Closer accepts any legal deal
    const offer = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/offers`,
      headers: auth(human.token),
      payload: { commandId: randomUUID(), offerId: randomUUID(), amountTenths: myRv },
    });
    expect(offer.statusCode).toBe(200);

    await pollUntil(async () => (await snapshot()).view.status === 'DEAL', 15_000, 400);

    // the reveal includes the AI's RV (GR-018) and the match is unrated
    const result = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/result`, headers: auth(human.token) });
    expect(result.statusCode).toBe(200);
    const resultView = result.json().view as { participants: { playerId: string; reservationValueTenths?: number }[]; economy: { ratedEligible: boolean } };
    const aiEntry = resultView.participants.find((p) => p.playerId === aiPlayerId)!;
    expect(aiEntry.reservationValueTenths).toBeDefined();
    expect(resultView.economy.ratedEligible).toBe(false);

    // AI games have separate stats: profile byte-identical, zero rating events
    const meAfter = await app.inject({ method: 'GET', url: '/v1/me', headers: auth(human.token) });
    expect(meAfter.json()).toEqual(meBefore.json());
    expect(await prisma.ratingEvent.findMany({ where: { matchId } })).toHaveLength(0);

    // no active match remains
    const afterActive = await app.inject({ method: 'GET', url: '/v1/me/active-match', headers: auth(human.token) });
    expect(afterActive.json().activeMatch).toBeNull();
  });

  it('the turn engine commits exactly one AI move across double scheduling and a "restart"', { timeout: 30_000 }, async () => {
    const human = await signin('dev_ai_route_restart');
    const created = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(human.token),
      payload: { commandId: randomUUID(), persona: 'grinder' },
    });
    expect(created.statusCode).toBe(201);
    const matchId = created.json().matchId as string;

    const ready = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/ready`,
      headers: auth(human.token),
      payload: { commandId: randomUUID() },
    });
    expect(ready.statusCode).toBe(200);

    const snapshot = async () => {
      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(human.token) });
      return res.json().view as { myTurn: boolean; participants: { playerId: string; latestOfferTenths: number | null }[] };
    };
    await pollUntil(async () => (await snapshot()).participants.some((p) => p.playerId !== human.userId), 3_000);

    // if the human moves first, hand the turn to the AI
    const initial = await snapshot();
    if (initial.myTurn && initial.participants.every((p) => p.latestOfferTenths === null)) {
      const myRv = created.json().reservationValueTenths as number;
      const offer = await app.inject({
        method: 'POST',
        url: `/v1/matches/${matchId}/offers`,
        headers: auth(human.token),
        payload: { commandId: randomUUID(), offerId: randomUUID(), amountTenths: myRv },
      });
      expect(offer.statusCode).toBe(200);
    }

    // a fresh engine (the "restart") schedules twice; the row lock + turn
    // re-check guarantee exactly one committed AI offer
    const restartedPrisma = createPrismaClient(DATABASE_URL);
    const engine = new AiTurnEngine({
      service: new MatchCommandService(restartedPrisma),
      prisma: restartedPrisma,
      broadcast: () => {},
    });
    try {
      await engine.bootScan();
      await engine.maybeSchedule(matchId);
      await engine.maybeSchedule(matchId);

      await pollUntil(async () => {
        const view = await snapshot();
        const ai = view.participants.find((p) => p.playerId !== human.userId)!;
        // the AI answered: an offer stands, or it accepted the human's RV
        // offer directly (no offer of its own ever happens then)
        return ai.latestOfferTenths !== null || (await matchStatus(matchId, human.token)) === 'DEAL';
      }, 12_000, 400);

      await new Promise((resolve) => setTimeout(resolve, 5_000)); // give any racing timer time to fail

      // exactly one bot-authored move in total (offer or accept) — never two
      const botMoves = await prisma.matchEvent.findMany({
        where: {
          matchId,
          type: { in: ['OFFER_SUBMITTED', 'OFFER_ACCEPTED'] },
          actorUserId: { not: human.userId },
        },
      });
      expect(botMoves).toHaveLength(1);
    } finally {
      await restartedPrisma.$disconnect();
    }
  });
});
