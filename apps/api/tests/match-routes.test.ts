/**
 * Match route integration tests (08_API_CONTRACTS shapes; UF-04 friend
 * challenge flow). Run with the database up: `pnpm test:db`.
 */

import { MatchCommandService, Prisma, createPrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { cleanupDevUsers } from './helpers';
import { createDevAuthAdapter } from '../src/auth/adapters';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';
const SCENARIO_FIXTURE_ID = '00000000-0000-4000-8000-000000000001'; // seed: Harbor Tug

let app: FastifyInstance;
let dev: ReturnType<typeof createDevAuthAdapter>;
let buyerToken: string;
let sellerToken: string;
let buyerId: string;
let sellerId: string;

async function signIn(subject: string): Promise<{ token: string; userId: string }> {
  const res = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject } });
  expect(res.statusCode).toBe(200);
  return res.json() as { token: string; userId: string };
}

function auth(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

describe.skipIf(!RUN)('match routes (PostgreSQL)', () => {
  beforeAll(async () => {
    dev = createDevAuthAdapter('test-secret');
    const prisma = createPrismaClient(DATABASE_URL);
    // Only this file's dev users — profiles FK must go first. Other DB test
    // files share the database, so never truncate globally here.
    await cleanupDevUsers(prisma);
    await prisma.$disconnect();
    app = await buildApp({ auth: dev, prisma: createPrismaClient(DATABASE_URL), exposeDevAuth: true, disconnectDebounceMs: 0 });

    ({ token: buyerToken, userId: buyerId } = await signIn('dev_m4_buyer'));
    ({ token: sellerToken, userId: sellerId } = await signIn('dev_m4_seller'));
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAndJoinChallenge(): Promise<{ matchId: string; buyerRv: number; sellerRv: number }> {
    const created = await app.inject({ method: 'POST', url: '/v1/challenges', headers: auth(buyerToken), payload: { commandId: randomUUID() } });
    expect(created.statusCode).toBe(201);
    const { matchId, token, reservationValueTenths } = created.json();

    const joined = await app.inject({ method: 'POST', url: `/v1/challenges/${token}/join`, headers: auth(sellerToken), payload: { commandId: randomUUID() } });
    expect(joined.statusCode).toBe(200);
    const joinerRv = joined.json().reservationValueTenths as number;

    // Creator RV and joiner RV compose a positive ZOPA (OQ-007 provisional distribution).
    return { matchId, buyerRv: Math.max(reservationValueTenths, joinerRv), sellerRv: Math.min(reservationValueTenths, joinerRv) };
  }

  async function readyBoth(matchId: string): Promise<void> {
    for (const token of [buyerToken, sellerToken]) {
      const res = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/ready`, headers: auth(token), payload: { commandId: randomUUID() } });
      expect(res.statusCode).toBe(200);
    }
  }

  it('full friend-challenge lifecycle over HTTP: create → join → ready → negotiate → deal', async () => {
    const { matchId } = await createAndJoinChallenge();
    await readyBoth(matchId);

    // Snapshot is role-scoped: own RV present, opponent RV absent (SI-001).
    const snapshot = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyerToken) });
    expect(snapshot.statusCode).toBe(200);
    const view = snapshot.json().view;
    expect(view.myReservationValueTenths).toBeGreaterThan(0);
    const opponentView = view.participants.find((p: { playerId: string }) => p.playerId === sellerId);
    expect('reservationValueTenths' in opponentView).toBe(false);

    // Play through the open turn until the match terminates. Openings: buyer
    // at half their RV, seller at double their RV; each turn concedes 25% of
    // the remaining gap, and a player accepts whenever the opponent's
    // standing offer has crossed their own (GR-011: explicit acceptance
    // required — no auto-settlement). At the wall (or on any rule rejection)
    // the player accepts if legally possible, else walks away. RVs are
    // server-random, so the simulation must terminate for every draw.
    let outcome: 'deal' | 'walk' | null = null;
    for (let step = 0; step < 40 && outcome === null; step++) {
      const state = (await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyerToken) })).json();
      const viewState = state.view;
      const activeToken = viewState.activePlayerId === buyerId ? buyerToken : sellerToken;
      const activeId = viewState.activePlayerId as string;
      const me = viewState.participants.find((p: { playerId: string }) => p.playerId === activeId);
      const opponent = viewState.participants.find((p: { playerId: string }) => p.playerId !== activeId);
      const rv = viewState.myReservationValueTenths as number;

      const tryAccept = async (): Promise<boolean> => {
        if (opponent.latestOfferTenths === null || !opponent.standingOfferId) return false;
        const withinRv = viewState.myRole === 'BUYER' ? opponent.latestOfferTenths <= rv : opponent.latestOfferTenths >= rv;
        if (!withinRv) return false;
        const accept = await app.inject({
          method: 'POST',
          url: `/v1/matches/${matchId}/accept`,
          headers: auth(activeToken),
          payload: { commandId: randomUUID(), offerId: opponent.standingOfferId },
        });
        if (accept.statusCode === 200) {
          outcome = 'deal';
          return true;
        }
        return false;
      };

      // Accept on crossing: opponent's standing offer is at or beyond our own.
      if (opponent.latestOfferTenths !== null && me.latestOfferTenths !== null && opponent.standingOfferId) {
        const crossed = viewState.myRole === 'BUYER' ? opponent.latestOfferTenths <= me.latestOfferTenths : opponent.latestOfferTenths >= me.latestOfferTenths;
        if (crossed && (await tryAccept())) break;
      }

      // At the wall: no further legal concession exists.
      const atWall = me.latestOfferTenths !== null && me.latestOfferTenths === rv;
      if (!atWall) {
        const amount =
          me.latestOfferTenths === null
            ? viewState.myRole === 'BUYER'
              ? Math.max(1, Math.floor(rv / 2))
              : rv * 2
            : viewState.myRole === 'BUYER'
              ? Math.min(rv, me.latestOfferTenths + Math.max(1, Math.floor((rv - me.latestOfferTenths) / 4)))
              : Math.max(rv, me.latestOfferTenths - Math.max(1, Math.floor((me.latestOfferTenths - rv) / 4)));

        const offer = await app.inject({
          method: 'POST',
          url: `/v1/matches/${matchId}/offers`,
          headers: auth(activeToken),
          payload: { commandId: randomUUID(), amountTenths: amount },
        });
        if (offer.statusCode === 200) continue;
      }

      // Stuck: accept anything legal, otherwise walk away.
      if (!(await tryAccept())) {
        const walk = await app.inject({
          method: 'POST',
          url: `/v1/matches/${matchId}/walk-away`,
          headers: auth(activeToken),
          payload: { commandId: randomUUID() },
        });
        expect(walk.statusCode).toBe(200);
        outcome = 'walk';
      }
    }
    expect(outcome).not.toBeNull();

    // Result reveal (GR-018): both RVs, ZOPA, economy, settlement.
    const result = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/result`, headers: auth(buyerToken) });
    expect(result.statusCode).toBe(200);
    const reveal = result.json().view;
    expect(reveal.economy).not.toBeNull();
    expect(reveal.participants.every((p: { reservationValueTenths?: number }) => p.reservationValueTenths !== undefined)).toBe(true);
    expect(reveal.economy.ratedEligible).toBe(false); // friend challenges are unrated (DEC-021)

    // Immutable event stream is readable (PRD-010 replay).
    const eventRes = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/events` });
    expect(eventRes.statusCode).toBe(401); // protected route
    const eventRes2 = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/events`, headers: auth(buyerToken) });
    expect(eventRes2.statusCode).toBe(200);
    const eventList = eventRes2.json().events as { sequence: number }[];
    expect(eventList.length).toBeGreaterThan(0);
    for (let i = 1; i < eventList.length; i++) expect(eventList[i]!.sequence).toBeGreaterThan(eventList[i - 1]!.sequence);
  });

  it('rejects non-participants and unauthenticated requests', async () => {
    const { matchId } = await createAndJoinChallenge();
    const stranger = await signIn('dev_m4_stranger');

    const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(stranger.token) });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('NOT_A_MATCH_PARTICIPANT');

    const anon = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}` });
    expect(anon.statusCode).toBe(401);
  });

  it('enforces turn order and idempotency on offers', async () => {
    const { matchId } = await createAndJoinChallenge();
    await readyBoth(matchId);

    const state = (await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyerToken) })).json();
    const active = state.view.activePlayerId;
    const notActiveToken = active === buyerId ? sellerToken : buyerToken;

    // Exactly at the active player's RV: legal for either role (GR-003 boundary).
    const safeAmount = state.view.myReservationValueTenths as number;

    const wrongTurn = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/offers`,
      headers: auth(notActiveToken),
      payload: { commandId: randomUUID(), amountTenths: safeAmount },
    });
    expect(wrongTurn.statusCode).toBe(409);
    expect(wrongTurn.json().code).toBe('NOT_YOUR_TURN');

    // Idempotency: the same commandId twice → COMMAND_ALREADY_PROCESSED.
    const commandId = randomUUID();
    const activeToken = active === buyerId ? buyerToken : sellerToken;
    const first = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/offers`,
      headers: auth(activeToken),
      payload: { commandId, amountTenths: safeAmount },
    });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/offers`,
      headers: auth(activeToken),
      payload: { commandId, amountTenths: safeAmount },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().code).toBe('COMMAND_ALREADY_PROCESSED');
  });

  it('challenge tokens are single-use and creators cannot join their own', async () => {
    const created = await app.inject({ method: 'POST', url: '/v1/challenges', headers: auth(buyerToken), payload: { commandId: randomUUID() } });
    const { token, matchId } = created.json();

    const selfJoin = await app.inject({ method: 'POST', url: `/v1/challenges/${token}/join`, headers: auth(buyerToken), payload: { commandId: randomUUID() } });
    expect(selfJoin.statusCode).toBe(400);
    expect(selfJoin.json().code).toBe('CANNOT_JOIN_OWN_CHALLENGE');

    const joined = await app.inject({ method: 'POST', url: `/v1/challenges/${token}/join`, headers: auth(sellerToken), payload: { commandId: randomUUID() } });
    expect(joined.statusCode).toBe(200);

    const third = await signIn('dev_m4_third');
    const again = await app.inject({ method: 'POST', url: `/v1/challenges/${token}/join`, headers: auth(third.token), payload: { commandId: randomUUID() } });
    expect(again.statusCode).toBe(404); // token consumed

    const snapshot = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(third.token) });
    expect(snapshot.statusCode).toBe(403);
  });

  it('scenario content is role-scoped: my narrative present, opponent narrative never serialized', async () => {
    const { matchId } = await createAndJoinChallenge();
    await readyBoth(matchId);

    const prisma = createPrismaClient(DATABASE_URL);
    try {
      const scenario = await prisma.scenario.findFirstOrThrow({ where: { id: SCENARIO_FIXTURE_ID, version: 1 } });

      const res = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyerToken) });
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        scenario: { title: string; description: string; myNarrative: string };
      };
      // Shared content present.
      expect(body.scenario.title).toBe(scenario.title);
      expect(body.scenario.description).toBe(scenario.description);

      // The viewer's own narrative is present (buyer or seller, per the random
      // role draw) and the opponent's narrative string is absent from the RAW
      // serialized payload — not merely hidden by the UI.
      const raw = res.rawPayload;
      const viewerRole = (res.json() as { view: { myRole: 'BUYER' | 'SELLER' } }).view.myRole;
      if (viewerRole === 'BUYER') {
        expect(body.scenario.myNarrative).toBe(scenario.buyerBatnaNarrative);
        expect(raw).not.toContain(scenario.sellerBatnaNarrative);
      } else {
        expect(body.scenario.myNarrative).toBe(scenario.sellerBatnaNarrative);
        expect(raw).not.toContain(scenario.buyerBatnaNarrative);
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('walk-away ends the match as no deal with zero bounty (GR-012)', async () => {
    const { matchId } = await createAndJoinChallenge();
    await readyBoth(matchId);

    const state = (await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyerToken) })).json();
    const active = state.view.activePlayerId;
    const activeToken = active === buyerId ? buyerToken : sellerToken;
    const walk = await app.inject({ method: 'POST', url: `/v1/matches/${matchId}/walk-away`, headers: auth(activeToken), payload: { commandId: randomUUID() } });
    expect(walk.statusCode).toBe(200);

    const result = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/result`, headers: auth(activeToken) });
    expect(result.statusCode).toBe(200);
    const view = result.json().view;
    expect(view.status).toBe('NO_DEAL');
    for (const p of Object.values(view.economy.players as Record<string, { grossReward: number }>)) {
      expect(p.grossReward).toBe(0);
    }
  });

  // -- DD Phase 1 (GR-023/GR-024) -------------------------------------------

  it('no client route exists for the timeout command (server-only, SI-009)', async () => {
    const res = await app.inject({ method: 'POST', url: `/v1/matches/${randomUUID()}/timeout`, headers: auth(buyerToken), payload: { commandId: randomUUID() } });
    expect(res.statusCode).toBe(404);
  });

  it('rejects offers with 409 TIMED_OUT once the hard decision-time budget is exhausted (GR-023)', async () => {
    // A dedicated app instance without the scheduler isolates the domain
    // guard: after the deadline, only the guard can reject the command.
    const prisma = createPrismaClient(DATABASE_URL);
    const service = new MatchCommandService(prisma);
    const guardApp = await buildApp({ auth: dev, prisma, exposeDevAuth: true, timeoutScheduler: null });
    try {
      await prisma.gameBalanceConfig.upsert({
        where: { version: 'economy-ttl-route' },
        update: {},
        create: {
          version: 'economy-ttl-route',
          matchBountyChips: 100,
          concessionBudgetChips: 100,
          concessionK: new Prisma.Decimal(10),
          concessionAlpha: new Prisma.Decimal(0.6),
          clockFloorMultiplier: new Prisma.Decimal(0.3),
          clockFloorMs: BigInt(60_000),
          turnGraceMs: 0,
          maxAmountTenths: BigInt(9_999_999_999),
          hardDecisionTimeLimitMs: BigInt(1_500),
          timeoutPolicy: 'ATTRIBUTED_NO_DEAL',
          timeWarningLowMs: 800,
          timeWarningCriticalMs: 300,
          activeForNewMatches: false,
        },
      });

      const matchId = randomUUID();
      const created = await service.createMatch({
        matchId,
        mode: 'FRIEND_LIVE',
        scenarioId: SCENARIO_FIXTURE_ID,
        scenarioVersion: 1,
        gameRulesVersion: 'game-rules-0.1.0',
        economyConfigVersion: 'economy-ttl-route',
        ratingVersion: null,
        buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: [] },
        seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 400, verifiableFactIds: [] },
        firstPlayerId: buyerId,
        createdAt: Date.now(),
      });
      expect(created.ok).toBe(true);
      const now = Date.now();
      expect((await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: randomUUID(), now })).ok).toBe(true);
      expect((await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: randomUUID(), now })).ok).toBe(true);
      // Openings via HTTP on the scheduler-less app: buyer 50.0, then seller
      // 60.0 — the turn returns to the buyer, whose running clock accrues
      // against the 1.5 s budget. The domain guard is the only rejection path.
      const buyerOpen = await guardApp.inject({ method: 'POST', url: `/v1/matches/${matchId}/offers`, headers: auth(buyerToken), payload: { commandId: randomUUID(), amountTenths: 500 } });
      expect(buyerOpen.statusCode).toBe(200);
      const sellerOpen = await guardApp.inject({ method: 'POST', url: `/v1/matches/${matchId}/offers`, headers: auth(sellerToken), payload: { commandId: randomUUID(), amountTenths: 600 } });
      expect(sellerOpen.statusCode).toBe(200);

      // Before the deadline the same amount is an ordinary DUPLICATE_OFFER…
      const early = await guardApp.inject({ method: 'POST', url: `/v1/matches/${matchId}/offers`, headers: auth(buyerToken), payload: { commandId: randomUUID(), amountTenths: 500 } });
      expect([400, 409]).toContain(early.statusCode);
      expect(early.json().code).toBe('DUPLICATE_OFFER');

      // …and once the 1.5 s budget exhausts, the very same request flips to
      // TIMED_OUT: the guard rejects before any offer rule runs.
      await expect
        .poll(
          async () => {
            const res = await guardApp.inject({ method: 'POST', url: `/v1/matches/${matchId}/offers`, headers: auth(buyerToken), payload: { commandId: randomUUID(), amountTenths: 500 } });
            return { status: res.statusCode, code: res.json().code };
          },
          { interval: 50, timeout: 5000 },
        )
        .toMatchObject({ status: 409, code: 'TIMED_OUT' });
    } finally {
      await guardApp.close();
      await prisma.$disconnect();
    }
  });
});
