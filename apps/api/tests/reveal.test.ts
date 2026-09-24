/**
 * DD-M3 (GR-028) reveal API: POST /v1/matches/:id/reveals is a formal game
 * action — turn-gated, GR-023-subject, immutable. Hidden-information proof
 * on the RAW response bytes: only facts the opponent has formally revealed
 * are ever serialized to a participant payload (SI-001-grade, like the RV).
 */

import { createPrismaClient, MatchCommandService, verifiableFactIdsForRole, type PrismaClient } from '@bounty-bay/db';
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

/** An ACTIVE friend match on the seeded scenario, with the real dossier fact ids. */
async function activeMatch(buyerId: string, sellerId: string): Promise<{ matchId: string; buyerFacts: string[]; sellerFacts: string[] }> {
  const scenario = await prisma.scenario.findFirstOrThrow({ where: { id: SEEDED_SCENARIO_ID, version: 1 } });
  const buyerFacts = verifiableFactIdsForRole(scenario, 'BUYER');
  const sellerFacts = verifiableFactIdsForRole(scenario, 'SELLER');
  expect(buyerFacts.length).toBeGreaterThan(0);
  expect(sellerFacts.length).toBeGreaterThan(0);

  const matchId = randomUUID();
  const created = await service.createMatch({
    matchId,
    mode: 'FRIEND_LIVE',
    scenarioId: SEEDED_SCENARIO_ID,
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.2.0',
    ratingVersion: null,
    buyer: { playerId: buyerId, role: 'BUYER', reservationValueTenths: 500, verifiableFactIds: buyerFacts },
    seller: { playerId: sellerId, role: 'SELLER', reservationValueTenths: 300, verifiableFactIds: sellerFacts },
    firstPlayerId: buyerId,
    createdAt: Date.now(),
  });
  expect(created.ok).toBe(true);
  const now = Date.now();
  for (const playerId of [buyerId, sellerId]) {
    const ready = await service.ready({ kind: 'READY', matchId, playerId, commandId: randomUUID(), now });
    expect(ready.ok).toBe(true);
  }
  return { matchId, buyerFacts, sellerFacts };
}

async function reveal(token: string, matchId: string, factId: string) {
  return app.inject({
    method: 'POST',
    url: `/v1/matches/${matchId}/reveals`,
    headers: auth(token),
    payload: { commandId: randomUUID(), factId },
  });
}

describe.skipIf(!RUN)('Reveal API (PostgreSQL)', () => {
  beforeEach(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    service = new MatchCommandService(prisma);
    app = await buildApp({ auth: createDevAuthAdapter('test-secret'), prisma, exposeDevAuth: true, timeoutScheduler: null });
  });

  afterEach(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('reveals a verifiable fact; the opponent sees exactly the revealed fact and never the rest (raw-payload proof)', async () => {
    const buyer = await signin('dev_reveal_buyer');
    const seller = await signin('dev_reveal_seller');
    const { matchId, buyerFacts } = await activeMatch(buyer.userId, seller.userId);

    const scenarioRow = await prisma.scenario.findFirstOrThrow({ where: { id: SEEDED_SCENARIO_ID, version: 1 } });
    type RowFact = { id: string; text: string; category: string; verifiable: boolean; optionalRevealLabel?: string };
    const allBuyerFacts = scenarioRow.buyerPrivateFacts as RowFact[];
    const revealedFact = allBuyerFacts.find((f) => f.id === buyerFacts[0])!;
    const unrevealed = allBuyerFacts.filter((f) => f.id !== revealedFact.id);

    // The buyer (first player) formally reveals.
    const res = await reveal(buyer.token, matchId, revealedFact.id);
    expect(res.statusCode).toBe(200);
    expect((res.json() as { factId: string }).factId).toBe(revealedFact.id);

    // The seller's snapshot: the revealed fact's TEXT is present (decorated
    // via revealedFacts); every unrevealed fact and the buyer's private
    // context are absent from the raw bytes; the verifiable id list is never
    // serialized anywhere.
    const snapshot = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(seller.token) });
    expect(snapshot.statusCode).toBe(200);
    const raw = String(snapshot.body);
    expect(raw).toContain(revealedFact.text);
    for (const fact of unrevealed) expect(raw).not.toContain(fact.text);
    expect(raw).not.toContain(scenarioRow.buyerPrivateContext ?? '');
    expect(raw).not.toContain('"verifiableFactIds"');

    const body = snapshot.json() as { revealedFacts: Record<string, RowFact[]>; view: { participants: { playerId: string; revealedFactIds: string[] }[] } };
    expect(body.revealedFacts[buyer.userId]!.map((f) => f.id)).toEqual([revealedFact.id]);
    expect(body.revealedFacts[seller.userId]).toEqual([]);
    expect(body.view.participants.find((p) => p.playerId === buyer.userId)!.revealedFactIds).toEqual([revealedFact.id]);
  });

  it('rejects non-verifiable facts, repeats, non-participants, and off-turn reveals', async () => {
    const buyer = await signin('dev_reveal_guard_buyer');
    const seller = await signin('dev_reveal_guard_seller');
    const bystander = await signin('dev_reveal_guard_bystander');
    const { matchId, buyerFacts, sellerFacts } = await activeMatch(buyer.userId, seller.userId);
    const firstBuyerFact = buyerFacts[0]!;

    // The buyer cannot reveal a SELLER fact (REVEAL_NOT_VERIFIABLE).
    const foreign = await reveal(buyer.token, matchId, sellerFacts[0]!);
    expect(foreign.statusCode).toBe(400);
    expect((foreign.json() as { code: string }).code).toBe('REVEAL_NOT_VERIFIABLE');

    // The seller is not the active player yet (buyer's opening turn).
    const offTurn = await reveal(seller.token, matchId, sellerFacts[0]!);
    expect(offTurn.statusCode).toBe(409);
    expect((offTurn.json() as { code: string }).code).toBe('NOT_YOUR_TURN');

    // Bystanders are refused.
    const notParticipant = await reveal(bystander.token, matchId, sellerFacts[0]!);
    expect(notParticipant.statusCode).toBe(403);

    // Buyer reveals, seller reveals, buyer repeats → REVEAL_ALREADY_MADE.
    const first = await reveal(buyer.token, matchId, firstBuyerFact);
    expect(first.statusCode).toBe(200);
    const second = await reveal(seller.token, matchId, sellerFacts[0]!);
    expect(second.statusCode).toBe(200);
    const repeat = await reveal(buyer.token, matchId, firstBuyerFact);
    expect(repeat.statusCode).toBe(409);
    expect((repeat.json() as { code: string }).code).toBe('REVEAL_ALREADY_MADE');

    // The event stream records both reveals immutably.
    const events = await service.listEvents(matchId);
    const revealEvents = events.filter((e) => e.type === 'FACT_REVEALED');
    expect(revealEvents).toHaveLength(2);
    expect(revealEvents.map((e) => e.actorPlayerId)).toEqual([buyer.userId, seller.userId]);
  });

  it('carries revealed facts into the result reveal (GR-018 + GR-028)', async () => {
    const buyer = await signin('dev_reveal_result_buyer');
    const seller = await signin('dev_reveal_result_seller');
    const { matchId } = await activeMatch(buyer.userId, seller.userId);

    const scenarioRow = await prisma.scenario.findFirstOrThrow({ where: { id: SEEDED_SCENARIO_ID, version: 1 } });
    type RowFact = { id: string; text: string; category: string; verifiable: boolean; optionalRevealLabel?: string };
    const allBuyerFacts = scenarioRow.buyerPrivateFacts as RowFact[];
    const revealedFact = allBuyerFacts.find((f) => f.verifiable === true)!;

    const res = await reveal(buyer.token, matchId, revealedFact.id);
    expect(res.statusCode).toBe(200);
    // The seller (now the turn holder) walks away → terminal.
    const walked = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/walk-away`,
      headers: auth(seller.token),
      payload: cmd(),
    });
    expect(walked.statusCode).toBe(200);

    const result = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}/result`, headers: auth(seller.token) });
    expect(result.statusCode).toBe(200);
    const body = result.json() as { revealedFacts: Record<string, RowFact[]> };
    expect(body.revealedFacts[buyer.userId]!.map((f) => f.id)).toEqual([revealedFact.id]);
    expect(String(result.body)).toContain(revealedFact.text);
  });

  it('AI matches give the human their verifiable facts and the bot an empty set', async () => {
    const human = await signin('dev_reveal_ai');
    const created = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(human.token),
      payload: { commandId: randomUUID(), persona: 'closer' },
    });
    expect(created.statusCode).toBe(201);
    const { matchId } = created.json() as { matchId: string };

    const snapshot = await service.loadSnapshot(matchId);
    expect(snapshot).not.toBeNull();
    const me = snapshot!.state.participants.find((p) => p.playerId === human.userId)!;
    const bot = snapshot!.state.participants.find((p) => p.playerId !== human.userId)!;
    expect(me.verifiableFactIds.length).toBeGreaterThan(0);
    expect(bot.verifiableFactIds).toEqual([]);
  });
});
