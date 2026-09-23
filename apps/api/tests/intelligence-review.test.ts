/**
 * Game Review API contract (DEC-028, IN-1; docs/08): deterministic
 * post-match analysis endpoint. Participant-only, terminal-only,
 * role-scoped — the caller's own features/observations only.
 */

import { createPrismaClient, type PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDevAuthAdapter } from '../src/auth/adapters';
import { cleanupDevUsers } from './helpers';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

let app: FastifyInstance;
let prisma: PrismaClient;

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

describe.skipIf(!RUN)('Game Review API (PostgreSQL)', () => {
  beforeAll(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    app = await buildApp({ auth: createDevAuthAdapter('test-secret'), prisma, exposeDevAuth: true });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function completedFriendMatch(): Promise<{ buyer: Account; seller: Account; matchId: string }> {
    const buyer = await signin('dev_review_buyer');
    const seller = await signin('dev_review_seller');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/challenges',
      headers: auth(buyer.token),
      payload: { commandId: randomUUID() },
    });
    expect(created.statusCode).toBe(201);
    const { token: inviteToken, matchId } = created.json() as { token: string; matchId: string };

    const joined = await app.inject({
      method: 'POST',
      url: `/v1/challenges/${inviteToken}/join`,
      headers: auth(seller.token),
      payload: { commandId: randomUUID() },
    });
    expect(joined.statusCode).toBe(200);

    const ready1 = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(buyer.token), payload: { commandId: randomUUID() } });
    expect(ready1.statusCode).toBe(200);
    const ready2 = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(seller.token), payload: { commandId: randomUUID() } });
    expect(ready2.statusCode).toBe(200);

    const snapshot = async (token: string) => {
      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(token) });
      expect(res.statusCode).toBe(200);
      return res.json() as {
        view: { myTurn: boolean; myReservationValueTenths?: number; myRole: 'BUYER' | 'SELLER' };
      };
    };

    // deterministic play: whoever's turn it is offers at their own RV
    // (always legal), which crosses; the next player accepts
    for (const account of [buyer, seller]) {
      const view = (await snapshot(account.token)).view;
      if (!view.myTurn) continue;
      const offer = await app.inject({
        method: 'POST',
        url: `/v1/matches/${matchId}/offers`,
        headers: auth(account.token),
        payload: { commandId: randomUUID(), offerId: randomUUID(), amountTenths: view.myReservationValueTenths },
      });
      expect(offer.statusCode).toBe(200);
    }
    // accept: the player whose turn it now is accepts the standing offer
    for (const account of [buyer, seller]) {
      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(account.token) });
      const view = (res.json() as { view: { myTurn: boolean; participants: { playerId: string; standingOfferId: string | null }[] } }).view;
      if (!view.myTurn) continue;
      const opponent = view.participants.find((p) => p.playerId !== account.userId)!;
      if (opponent.standingOfferId === null) continue;
      const accept = await app.inject({
        method: 'POST',
        url: `/v1/matches/${matchId}/accept`,
        headers: auth(account.token),
        payload: { commandId: randomUUID(), offerId: opponent.standingOfferId },
      });
      expect(accept.statusCode).toBe(200);
    }

    const final = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyer.token) });
    expect((final.json() as { view: { status: string } }).view.status).toBe('DEAL');
    return { buyer, seller, matchId };
  }

  it('returns 409 before completion and 403 for non-participants', async () => {
    const buyer = await signin('dev_review_early');
    const seller = await signin('dev_review_early_opp');
    const created = await app.inject({
      method: 'POST',
      url: '/v1/challenges',
      headers: auth(buyer.token),
      payload: { commandId: randomUUID() },
    });
    const { token: inviteToken, matchId } = created.json() as { token: string; matchId: string };
    const joined = await app.inject({
      method: 'POST',
      url: `/v1/challenges/${inviteToken}/join`,
      headers: auth(seller.token),
      payload: { commandId: randomUUID() },
    });
    expect(joined.statusCode).toBe(200);

    const early = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/review`, headers: auth(buyer.token) });
    expect(early.statusCode).toBe(409);
    expect(early.json().code).toBe('MATCH_NOT_ACTIVE');

    const stranger = await signin('dev_review_stranger');
    const denied = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/review`, headers: auth(stranger.token) });
    expect(denied.statusCode).toBe(403);

    const unauthenticated = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/review` });
    expect(unauthenticated.statusCode).toBe(401);
  });

  it('returns the caller-scoped deterministic analysis after a completed deal', async () => {
    const { buyer, seller, matchId } = await completedFriendMatch();

    const review = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/review`, headers: auth(buyer.token) });
    expect(review.statusCode).toBe(200);
    const body = review.json() as {
      matchId: string;
      version: string;
      featureVersion: string;
      observationVersion: string;
      curationVersion: string;
      outcome: string;
      timeline: { seq: number; kind: string; actorPlayerId: string | null; role: string | null; amountTenths?: number }[];
      player: {
        playerId: string;
        features: Record<string, unknown>;
        observations: { type: string; source: string; confidence: string }[];
        moments: { kind: string; headline: string; detail: string | null; eventRefs: number[] }[];
      };
    };
    // W1-03 (D-11): the review response rides the game-review-0.1.0 envelope.
    expect(body.version).toBe('game-review-0.1.0');
    expect(body.featureVersion).toBe('feature-engine-0.1.0');
    expect(body.observationVersion).toBe('observation-engine-0.1.0');
    expect(body.curationVersion).toBe('review-curation-0.1.0');
    expect(body.outcome).toBe('DEAL');
    expect(body.player.playerId).toBe(buyer.userId);
    expect(body.player.features.outcome).toBe('DEAL');
    expect(body.player.features.agreementReached).toBe(true);
    expect(body.player.features.opponentRating).toBeNull();
    for (const observation of body.player.observations) {
      expect(observation.source).toBe('deterministic');
      expect(observation.confidence).toBe('deterministic');
    }
    // IN-2: moments lead with RESULT, are capped, and link the timeline
    expect(body.player.moments.length).toBeGreaterThanOrEqual(1);
    expect(body.player.moments[0]!.kind).toBe('RESULT');
    expect(body.player.moments[0]!.headline).toContain('YOU CAPTURED');
    for (const moment of body.player.moments.slice(1)) {
      expect(moment.eventRefs.length).toBeGreaterThan(0);
    }

    // W1-03: the server-built timeline — sequence-ordered, negotiation
    // actions only, and SHARED (both participants see the same steps).
    // (The fixture's first mover is random, so one or two offers may land.)
    expect(body.timeline.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < body.timeline.length; i++) {
      expect(body.timeline[i]!.seq).toBeGreaterThan(body.timeline[i - 1]!.seq);
    }
    const offerEntries = body.timeline.filter((e) => e.kind === 'OFFER');
    expect(offerEntries.length).toBeGreaterThanOrEqual(1);
    for (const entry of offerEntries) {
      expect(entry.amountTenths).toBeGreaterThan(0);
      expect(entry.role).not.toBeNull();
      expect(entry.actorPlayerId).not.toBeNull();
    }
    expect(body.timeline.filter((e) => e.kind === 'ACCEPT')).toHaveLength(1);

    const sellerReview = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/review`, headers: auth(seller.token) });
    expect(sellerReview.statusCode).toBe(200);
    const sellerBody = sellerReview.json() as { player: { playerId: string }; timeline: { seq: number; kind: string }[] };
    expect(sellerBody.player.playerId).toBe(seller.userId);
    expect(sellerBody.timeline).toEqual(body.timeline); // the timeline is shared public data

    // role-scoping: the opponent's id never appears in the CALLER'S OWN
    // analysis object (features/observations/moments are private data).
    // The shared timeline below may contain both actors — identity there
    // is public game data (the same steps both participants see).
    expect(JSON.stringify(body.player)).not.toContain(seller.userId);
  });

  it('timeline covers no-deal outcomes (WALK_AWAY) under the same envelope', async () => {
    const buyer = await signin('dev_review_walk_buyer');
    const seller = await signin('dev_review_walk_seller');
    const created = await app.inject({
      method: 'POST',
      url: '/v1/challenges',
      headers: auth(buyer.token),
      payload: { commandId: randomUUID() },
    });
    expect(created.statusCode).toBe(201);
    const { token: inviteToken, matchId } = created.json() as { token: string; matchId: string };
    expect((await app.inject({ method: 'POST', url: `/v1/challenges/${inviteToken}/join`, headers: auth(seller.token), payload: { commandId: randomUUID() } })).statusCode).toBe(200);
    for (const account of [buyer, seller]) {
      const res = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(account.token), payload: { commandId: randomUUID() } });
      expect(res.statusCode).toBe(200);
    }

    // The active player walks away (GR-012).
    for (const account of [buyer, seller]) {
      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(account.token) });
      const view = (res.json() as { view: { myTurn: boolean } }).view;
      if (!view.myTurn) continue;
      const walk = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/walk-away`, headers: auth(account.token), payload: { commandId: randomUUID() } });
      expect(walk.statusCode).toBe(200);
      break;
    }

    const review = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/review`, headers: auth(buyer.token) });
    expect(review.statusCode).toBe(200);
    const body = review.json() as { version: string; outcome: string; timeline: { kind: string }[] };
    expect(body.version).toBe('game-review-0.1.0');
    expect(body.outcome).toBe('NO_DEAL_WALKED');
    expect(body.timeline.some((e) => e.kind === 'WALK_AWAY')).toBe(true);
  });

  it('accepts review observability events and rejects malformed ones (DEC-028 §41)', async () => {
    const human = await signin('dev_review_events');
    const good = await app.inject({
      method: 'POST',
      url: '/v1/analytics/event',
      headers: auth(human.token),
      payload: { name: 'review_opened', matchId: randomUUID() },
    });
    expect(good.statusCode).toBe(200);

    const bad = await app.inject({
      method: 'POST',
      url: '/v1/analytics/event',
      headers: auth(human.token),
      payload: { name: 'not_an_event' },
    });
    expect(bad.statusCode).toBe(400);

    const unauthenticated = await app.inject({ method: 'POST', url: '/v1/analytics/event', payload: { name: 'review_opened' } });
    expect(unauthenticated.statusCode).toBe(401);
  });
});
