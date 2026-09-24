/**
 * Friend-rematch API (PDR-3, QA-004): rematch = mutual consent. Either side
 * proposes after the result (same scenario, same roles, unrated); only the
 * fixed opponent may accept; acceptance starts a new ACTIVE match with
 * fresh RVs. Declines and cancels remove the proposal; either side may
 * propose again. UI half is BB-219b for W2.
 */

import { createPrismaClient, MatchCommandService, type PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

function cmd() {
  return { commandId: randomUUID() };
}

/**
 * A terminal FRIEND_LIVE match via the service: buyer is first player and
 * walks away, so the match completes deterministically (NO_DEAL).
 */
async function terminalMatch(buyerId: string, sellerId: string, mode: 'FRIEND_LIVE' | 'RANKED_LIVE' | 'AI' = 'FRIEND_LIVE'): Promise<string> {
  const matchId = randomUUID();
  const created = await service.createMatch({
    matchId,
    mode,
    scenarioId: SEEDED_SCENARIO_ID,
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.2.0',
    ratingVersion: null,
    buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 500, verifiableFactIds: [] },
    seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 300, verifiableFactIds: [] },
    firstPlayerId: buyerId,
    createdAt: Date.now(),
  });
  expect(created.ok).toBe(true);
  const now = Date.now();
  const readyBuyer = await service.ready({ kind: 'READY', matchId, playerId: buyerId, commandId: randomUUID(), now });
  expect(readyBuyer.ok).toBe(true);
  const readySeller = await service.ready({ kind: 'READY', matchId, playerId: sellerId, commandId: randomUUID(), now });
  expect(readySeller.ok).toBe(true);
  const walked = await service.walkAway({ kind: 'WALK_AWAY', matchId, playerId: buyerId, commandId: randomUUID(), now });
  expect(walked.ok).toBe(true);
  return matchId;
}

async function proposeRematch(token: string, matchId: string) {
  return app.inject({ method: 'POST', url: `/v1/matches/${matchId}/rematch`, headers: auth(token), payload: cmd() });
}

async function actRematch(action: 'accept' | 'decline' | 'cancel', token: string, matchId: string) {
  return app.inject({ method: 'POST', url: `/v1/matches/${matchId}/rematch/${action}`, headers: auth(token), payload: cmd() });
}

describe.skipIf(!RUN)('Friend-rematch API (PostgreSQL)', () => {
  // A fresh app per test: propose is rate-limited (10/min per app instance),
  // and per-test instances keep the suite's deliberate propose spam from
  // tripping the product rate limit.
  beforeEach(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    service = new MatchCommandService(prisma);
    // Null scheduler: no background deadlines fire mid-test; the domain
    // guard still rejects post-limit commands.
    app = await buildApp({ auth: createDevAuthAdapter('test-secret'), prisma, exposeDevAuth: true, timeoutScheduler: null });
  });

  afterEach(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('propose → accept → new ACTIVE match with same scenario, fixed roles, fresh RVs, unrated (GR-019)', async () => {
    const buyer = await signin('dev_rematch_buyer');
    const seller = await signin('dev_rematch_seller');
    const sourceId = await terminalMatch(buyer.userId, seller.userId);

    // The SELLER proposes (covers either-side-may-propose).
    const propose = await proposeRematch(seller.token, sourceId);
    expect(propose.statusCode).toBe(201);
    const proposal = propose.json() as {
      matchId: string;
      role: string;
      reservationValueTenths: number;
      scenario: { id: string } | null;
      token?: string;
    };
    expect(proposal.role).toBe('SELLER');
    expect(proposal.scenario?.id).toBe(SEEDED_SCENARIO_ID);
    expect(proposal.reservationValueTenths).toBeGreaterThanOrEqual(100);
    expect(proposal.reservationValueTenths).toBeLessThanOrEqual(290);
    expect(proposal).not.toHaveProperty('token'); // fixed opponent — no share link

    const proposalRow = await prisma.match.findUniqueOrThrow({ where: { id: proposal.matchId }, include: { participants: true } });
    expect(proposalRow.status).toBe('CREATED');
    expect(proposalRow.inviteToken).toBeNull();
    expect(proposalRow.rematchFromMatchId).toBe(sourceId);
    expect(proposalRow.rematchOpponentUserId).toBe(buyer.userId);
    expect(proposalRow.participants.map((p) => p.userId)).toEqual([seller.userId]);

    // The in-session prompt query (BB-219b): opponent sees incoming, proposer sees outgoing.
    const asOpponent = await app.inject({ method: 'GET', url: `/v1/matches/${sourceId}/rematch`, headers: auth(buyer.token) });
    expect((asOpponent.json() as { incoming: { matchId: string } | null; outgoing: unknown }).incoming?.matchId).toBe(proposal.matchId);
    const asProposer = await app.inject({ method: 'GET', url: `/v1/matches/${sourceId}/rematch`, headers: auth(seller.token) });
    expect((asProposer.json() as { incoming: unknown; outgoing: { matchId: string } | null }).outgoing?.matchId).toBe(proposal.matchId);

    // The proposer's pre-join view of the proposal row is never the share-link panel.
    const preJoin = await app.inject({ method: 'GET', url: `/v1/matches/${proposal.matchId}`, headers: auth(seller.token) });
    expect(preJoin.statusCode).toBe(200);
    const preJoinBody = preJoin.json() as { status: string; rematch: { fromMatchId: string } | null };
    expect(preJoinBody.status).toBe('REMATCH_PENDING');
    expect(preJoinBody.rematch?.fromMatchId).toBe(sourceId);

    // The fixed opponent accepts → the new match is ACTIVE immediately.
    const accept = await actRematch('accept', buyer.token, proposal.matchId);
    expect(accept.statusCode).toBe(200);
    const accepted = accept.json() as { matchId: string; role: string; reservationValueTenths: number; status: string };
    expect(accepted.matchId).toBe(proposal.matchId);
    expect(accepted.role).toBe('BUYER');
    expect(accepted.status).toBe('ACTIVE');
    expect(accepted.reservationValueTenths).toBeGreaterThanOrEqual(300);
    expect(accepted.reservationValueTenths).toBeLessThanOrEqual(1000);

    const newRow = await prisma.match.findUniqueOrThrow({ where: { id: proposal.matchId }, include: { participants: true } });
    expect(newRow.status).toBe('ACTIVE');
    expect(newRow.mode).toBe('FRIEND_LIVE');
    expect(newRow.ratingVersion).toBeNull(); // unrated (GR-019)
    expect(newRow.scenarioId).toBe(SEEDED_SCENARIO_ID); // same scenario (PDR-3)
    const roles = Object.fromEntries(newRow.participants.map((p) => [p.userId, p.role]));
    expect(roles[buyer.userId]).toBe('BUYER'); // same roles (PDR-3)
    expect(roles[seller.userId]).toBe('SELLER');

    const snapshot = await service.loadSnapshot(proposal.matchId);
    expect(snapshot?.state.status).toBe('ACTIVE');
    expect(snapshot?.state.participants).toHaveLength(2);
    expect(snapshot?.state.participants.every((p) => p.ready)).toBe(true);

    // The new match's event stream opens with readiness + MATCH_STARTED.
    const events = await service.listEvents(proposal.matchId);
    expect(events.some((e) => e.type === 'MATCH_STARTED')).toBe(true);

    // The joiner can read the new match through the normal snapshot route.
    const view = await app.inject({ method: 'GET', url: `/v1/matches/${proposal.matchId}`, headers: auth(buyer.token) });
    expect(view.statusCode).toBe(200);
    expect((view.json() as { view: { status: string } }).view.status).toBe('ACTIVE');
  });

  it('accept is fixed-opponent-only, and ordinary matches are not proposals', async () => {
    const buyer = await signin('dev_rematch_fixed_buyer');
    const seller = await signin('dev_rematch_fixed_seller');
    const bystander = await signin('dev_rematch_fixed_bystander');
    const sourceId = await terminalMatch(buyer.userId, seller.userId);

    const propose = await proposeRematch(seller.token, sourceId);
    expect(propose.statusCode).toBe(201);
    const proposalId = (propose.json() as { matchId: string }).matchId;

    // A bystander is not the fixed opponent.
    const byBystander = await actRematch('accept', bystander.token, proposalId);
    expect(byBystander.statusCode).toBe(403);
    expect((byBystander.json() as { code: string }).code).toBe('REMATCH_FORBIDDEN');

    // Neither is the proposer.
    const byProposer = await actRematch('accept', seller.token, proposalId);
    expect(byProposer.statusCode).toBe(403);
    expect((byProposer.json() as { code: string }).code).toBe('REMATCH_FORBIDDEN');

    // An ordinary match id is not a proposal.
    const onSource = await actRematch('accept', buyer.token, sourceId);
    expect(onSource.statusCode).toBe(404);
    expect((onSource.json() as { code: string }).code).toBe('REMATCH_NOT_FOUND');

    // None of the rejections resolved the proposal — the real opponent still accepts.
    const accept = await actRematch('accept', buyer.token, proposalId);
    expect(accept.statusCode).toBe(200);
    expect((accept.json() as { status: string }).status).toBe('ACTIVE');
  });

  it('propose guards: participation, terminal state, friend mode, one open proposal', async () => {
    const buyer = await signin('dev_rematch_guard_buyer');
    const seller = await signin('dev_rematch_guard_seller');
    const bystander = await signin('dev_rematch_guard_bystander');
    const sourceId = await terminalMatch(buyer.userId, seller.userId);

    // Non-participants cannot propose.
    const byBystander = await proposeRematch(bystander.token, sourceId);
    expect(byBystander.statusCode).toBe(403);

    // A pre-start challenge is not terminal (one participant).
    const challenge = await app.inject({ method: 'POST', url: '/v1/challenges', headers: auth(buyer.token), payload: cmd() });
    expect(challenge.statusCode).toBe(201);
    const challengeBody = challenge.json() as { matchId: string; token: string };
    const onChallenge = await proposeRematch(buyer.token, challengeBody.matchId);
    expect(onChallenge.statusCode).toBe(409);
    expect((onChallenge.json() as { code: string }).code).toBe('REMATCH_NOT_AVAILABLE');

    // An ACTIVE (not yet terminal) match cannot be rematched.
    const joined = await app.inject({ method: 'POST', url: `/v1/challenges/${challengeBody.token}/join`, headers: auth(seller.token), payload: cmd() });
    expect(joined.statusCode).toBe(200);
    for (const account of [buyer, seller]) {
      const ready = await app.inject({ method: 'POST', url: `/v1/matches/${challengeBody.matchId}/ready`, headers: auth(account.token), payload: cmd() });
      expect(ready.statusCode).toBe(200);
    }
    const onActive = await proposeRematch(buyer.token, challengeBody.matchId);
    expect(onActive.statusCode).toBe(409);
    expect((onActive.json() as { code: string }).code).toBe('REMATCH_NOT_AVAILABLE');

    // Non-friend modes cannot be rematched (rated matches need rating rules).
    for (const mode of ['RANKED_LIVE', 'AI'] as const) {
      const otherMode = await terminalMatch(buyer.userId, seller.userId, mode);
      const onOtherMode = await proposeRematch(buyer.token, otherMode);
      expect(onOtherMode.statusCode).toBe(409);
      expect((onOtherMode.json() as { code: string }).code).toBe('REMATCH_NOT_AVAILABLE');
    }

    // One open proposal per source match — either direction.
    const first = await proposeRematch(seller.token, sourceId);
    expect(first.statusCode).toBe(201);
    const byBuyer = await proposeRematch(buyer.token, sourceId);
    expect(byBuyer.statusCode).toBe(409);
    expect((byBuyer.json() as { code: string }).code).toBe('REMATCH_ALREADY_PROPOSED');
    const again = await proposeRematch(seller.token, sourceId);
    expect(again.statusCode).toBe(409);
    expect((again.json() as { code: string }).code).toBe('REMATCH_ALREADY_PROPOSED');
  });

  it('decline and cancel remove the proposal; either side may propose again', async () => {
    const buyer = await signin('dev_rematch_decline_buyer');
    const seller = await signin('dev_rematch_decline_seller');
    const bystander = await signin('dev_rematch_decline_bystander');
    const sourceId = await terminalMatch(buyer.userId, seller.userId);

    const first = await proposeRematch(seller.token, sourceId);
    expect(first.statusCode).toBe(201);
    const firstId = (first.json() as { matchId: string }).matchId;

    // Only the fixed opponent may decline.
    const byProposer = await actRematch('decline', seller.token, firstId);
    expect(byProposer.statusCode).toBe(403);
    const byBystander = await actRematch('decline', bystander.token, firstId);
    expect(byBystander.statusCode).toBe(403);

    const decline = await actRematch('decline', buyer.token, firstId);
    expect(decline.statusCode).toBe(200);
    expect(decline.json()).toEqual({ declined: true });
    expect(await prisma.match.findUnique({ where: { id: firstId } })).toBeNull();

    const afterDecline = await app.inject({ method: 'GET', url: `/v1/matches/${sourceId}/rematch`, headers: auth(buyer.token) });
    expect((afterDecline.json() as { incoming: unknown }).incoming).toBeNull();

    // The proposer may propose again after a decline.
    const second = await proposeRematch(seller.token, sourceId);
    expect(second.statusCode).toBe(201);
    const secondId = (second.json() as { matchId: string }).matchId;

    // The proposer may cancel their own proposal.
    const byOpponentCancel = await actRematch('cancel', buyer.token, secondId);
    expect(byOpponentCancel.statusCode).toBe(403);
    const cancel = await actRematch('cancel', seller.token, secondId);
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json()).toEqual({ cancelled: true });
    expect(await prisma.match.findUnique({ where: { id: secondId } })).toBeNull();

    // And the other side may now propose (mutual consent works both ways).
    const third = await proposeRematch(buyer.token, sourceId);
    expect(third.statusCode).toBe(201);
  });

  it('a resolved proposal cannot be accepted or declined again', async () => {
    const buyer = await signin('dev_rematch_resolved_buyer');
    const seller = await signin('dev_rematch_resolved_seller');
    const sourceId = await terminalMatch(buyer.userId, seller.userId);

    const propose = await proposeRematch(seller.token, sourceId);
    expect(propose.statusCode).toBe(201);
    const proposalId = (propose.json() as { matchId: string }).matchId;

    const accept = await actRematch('accept', buyer.token, proposalId);
    expect(accept.statusCode).toBe(200);

    const again = await actRematch('accept', buyer.token, proposalId);
    expect(again.statusCode).toBe(409);
    expect((again.json() as { code: string }).code).toBe('REMATCH_NOT_OPEN');

    const decline = await actRematch('decline', buyer.token, proposalId);
    expect(decline.statusCode).toBe(409);
    expect((decline.json() as { code: string }).code).toBe('REMATCH_NOT_OPEN');
  });

  it('a rematch match can itself be rematched once it completes', async () => {
    const buyer = await signin('dev_rematch_chain_buyer');
    const seller = await signin('dev_rematch_chain_seller');
    const sourceId = await terminalMatch(buyer.userId, seller.userId);

    const propose = await proposeRematch(seller.token, sourceId);
    expect(propose.statusCode).toBe(201);
    const rematchId = (propose.json() as { matchId: string }).matchId;
    const accept = await actRematch('accept', buyer.token, rematchId);
    expect(accept.statusCode).toBe(200);

    // Complete the rematch (first player is random — exactly one walk succeeds).
    const now = Date.now();
    const walkBuyer = await service.walkAway({ kind: 'WALK_AWAY', matchId: rematchId, playerId: buyer.userId, commandId: randomUUID(), now });
    const walkSeller = await service.walkAway({ kind: 'WALK_AWAY', matchId: rematchId, playerId: seller.userId, commandId: randomUUID(), now });
    expect([walkBuyer.ok, walkSeller.ok].filter(Boolean)).toHaveLength(1);

    // The rematch row (rematchFromMatchId still set) works as a source match.
    const next = await proposeRematch(seller.token, rematchId);
    expect(next.statusCode).toBe(201);
  });

  it('rematch-letters (BB-239 seam) lists only the caller’s own open proposals', async () => {
    const buyer = await signin('dev_letters_buyer');
    const seller = await signin('dev_letters_seller');
    const otherA = await signin('dev_letters_other_a');
    const otherB = await signin('dev_letters_other_b');

    // Empty for a player with no proposals.
    const empty = await app.inject({ method: 'GET', url: '/v1/me/rematch-letters', headers: auth(otherA.token) });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ letters: [] });

    // Seller proposes to buyer; otherA proposes to otherB (not the buyer).
    const sourceId = await terminalMatch(buyer.userId, seller.userId);
    const otherSource = await terminalMatch(otherA.userId, otherB.userId);
    const toBuyer = await proposeRematch(seller.token, sourceId);
    expect(toBuyer.statusCode).toBe(201);
    const proposalId = (toBuyer.json() as { matchId: string }).matchId;
    const toOther = await proposeRematch(otherA.token, otherSource);
    expect(toOther.statusCode).toBe(201);

    // The buyer sees exactly their own letter, with the public shape only.
    const letters = await app.inject({ method: 'GET', url: '/v1/me/rematch-letters', headers: auth(buyer.token) });
    expect(letters.statusCode).toBe(200);
    const body = letters.json() as { letters: { proposalMatchId: string; sourceMatchId: string; fromHandle: string | null; scenarioTitle: string | null; createdAt: string }[] };
    expect(body.letters).toHaveLength(1);
    expect(body.letters[0]!.proposalMatchId).toBe(proposalId);
    expect(body.letters[0]!.sourceMatchId).toBe(sourceId);
    expect(body.letters[0]!.scenarioTitle).not.toBeNull();
    const raw = String(letters.body);
    expect(raw).not.toContain('reservationValue'); // no RV or dossier leakage in the letters payload

    // otherB does not see the buyer's letter — only their own (otherA's).
    const otherLetters = await app.inject({ method: 'GET', url: '/v1/me/rematch-letters', headers: auth(otherB.token) });
    const otherBody = otherLetters.json() as { letters: { proposalMatchId: string }[] };
    expect(otherBody.letters.map((l) => l.proposalMatchId)).toEqual([(toOther.json() as { matchId: string }).matchId]);

    // An accepted proposal leaves the letters tray.
    const accept = await actRematch('accept', buyer.token, proposalId);
    expect(accept.statusCode).toBe(200);
    const after = await app.inject({ method: 'GET', url: '/v1/me/rematch-letters', headers: auth(buyer.token) });
    expect((after.json() as { letters: unknown[] }).letters).toEqual([]);

    // Unauthenticated is refused structurally (the /v1/me prefix guard).
    const anon = await app.inject({ method: 'GET', url: '/v1/me/rematch-letters' });
    expect(anon.statusCode).toBe(401);
  });
});
