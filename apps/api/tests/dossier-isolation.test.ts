/**
 * DD-M2 dossier serialization isolation (GR-028, SI-001-grade): the
 * viewer's own private dossier is served; the opponent's private context
 * and facts are never serialized into any participant payload — checked
 * on the RAW response bytes, not just the parsed fields.
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

describe.skipIf(!RUN)('Dossier serialization isolation (PostgreSQL)', () => {
  beforeAll(async () => {
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    app = await buildApp({ auth: createDevAuthAdapter('test-secret'), prisma, exposeDevAuth: true });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('serves each role its own dossier and never the opponent’s — raw-payload proof', async () => {
    const buyer = await signin('dev_dossier_buyer');
    const seller = await signin('dev_dossier_seller');

    // The seeded scenario (Harbor Tug slot 000…1) carries dossiers.
    const scenarioRow = await prisma.scenario.findFirstOrThrow({
      where: { id: '00000000-0000-4000-8000-000000000001', version: 1 },
    });
    type RowFact = { id: string; text: string; category: string; verifiable: boolean; optionalRevealLabel?: string };
    const buyerFacts = scenarioRow.buyerPrivateFacts as RowFact[];
    const sellerFacts = scenarioRow.sellerPrivateFacts as RowFact[];
    const buyerContext = scenarioRow.buyerPrivateContext ?? '';
    const sellerContext = scenarioRow.sellerPrivateContext ?? '';
    expect(buyerFacts.length).toBeGreaterThan(0);
    expect(sellerFacts.length).toBeGreaterThan(0);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/challenges',
      headers: auth(buyer.token),
      payload: { commandId: randomUUID() },
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json() as {
      matchId: string;
      token: string;
      role: 'BUYER' | 'SELLER';
      scenario: { sharedContext: string | null; myPrivateContext: string | null; myPrivateFacts: { id: string; text: string; category: string; verifiable: boolean }[] };
    };

    // Creator's response carries the creator's own dossier (role is random).
    expect(createdBody.scenario.sharedContext).toBe(scenarioRow.sharedContext);
    const creatorFacts = createdBody.role === 'BUYER' ? buyerFacts : sellerFacts;
    expect(createdBody.scenario.myPrivateFacts.map((f) => f.id)).toEqual(creatorFacts.map((f) => f.id));

    const joined = await app.inject({
      method: 'POST',
      url: `/v1/challenges/${createdBody.token}/join`,
      headers: auth(seller.token),
      payload: { commandId: randomUUID() },
    });
    expect(joined.statusCode).toBe(200);
    const joinerRole = (joined.json() as { role: 'BUYER' | 'SELLER' }).role;
    expect(joinerRole).not.toBe(createdBody.role);
    for (const account of [buyer, seller]) {
      const ready = await app.inject({
        method: 'POST',
        url: `/v1/matches/${createdBody.matchId}/ready`,
        headers: auth(account.token),
        payload: { commandId: randomUUID() },
      });
      expect(ready.statusCode).toBe(200);
    }

    // Raw-payload penetration proof, ROLE-AWARE: expectations derive from
    // the ACTUAL assigned role of each account (creator = createdBody.role,
    // joiner = the opposite). Both accounts are checked, so the test covers
    // both role draws deterministically regardless of the random draw.
    const factsFor = (role: 'BUYER' | 'SELLER'): RowFact[] => (role === 'BUYER' ? buyerFacts : sellerFacts);
    const contextFor = (role: 'BUYER' | 'SELLER'): string => (role === 'BUYER' ? buyerContext : sellerContext);
    const otherRole = (role: 'BUYER' | 'SELLER'): 'BUYER' | 'SELLER' => (role === 'BUYER' ? 'SELLER' : 'BUYER');

    const roleOf = (account: Account): 'BUYER' | 'SELLER' => (account.userId === buyer.userId ? createdBody.role : joinerRole);

    for (const account of [buyer, seller]) {
      const role = roleOf(account);
      const snapshot = await app.inject({ method: 'GET', url: `/v1/matches/${createdBody.matchId}`, headers: auth(account.token) });
      expect(snapshot.statusCode).toBe(200);
      const raw = String(snapshot.body);
      for (const fact of factsFor(role)) expect(raw).toContain(fact.text);
      expect(raw).toContain(contextFor(role));
      for (const fact of factsFor(otherRole(role))) expect(raw).not.toContain(fact.text);
      expect(raw).not.toContain(contextFor(otherRole(role)));
    }

    // The AI-match route serves the same role-scoped shape.
    const ai = await signin('dev_dossier_ai');
    const aiMatch = await app.inject({
      method: 'POST',
      url: '/v1/matches/ai',
      headers: auth(ai.token),
      payload: { commandId: randomUUID(), persona: 'closer' },
    });
    expect(aiMatch.statusCode).toBe(201);
    const aiScenario = (aiMatch.json() as { scenario: { myPrivateFacts: unknown[] } }).scenario;
    expect(Array.isArray(aiScenario.myPrivateFacts)).toBe(true);
  });

  it('tolerates scenario rows without dossier fields (boundary)', async () => {
    const legacy = await prisma.scenario.create({
      data: {
        id: randomUUID(),
        version: 1,
        title: 'Legacy Lot',
        description: 'A dossier-less scenario from before DD-M2.',
        buyerBatnaNarrative: 'Buy it.',
        sellerBatnaNarrative: 'Sell it.',
        status: 'DRAFT',
      },
    });
    const buyer = await signin('dev_dossier_legacy');
    const seller = await signin('dev_dossier_legacy_opp');

    // Create a match that references the legacy scenario directly.
    const { MatchCommandService } = await import('@bounty-bay/db');
    const service = new MatchCommandService(prisma);
    const matchId = randomUUID();
    const created = await service.createMatch({
      matchId,
      mode: 'FRIEND_LIVE',
      scenarioId: legacy.id,
      scenarioVersion: 1,
      gameRulesVersion: 'game-rules-0.1.0',
      economyConfigVersion: 'economy-0.2.0',
      ratingVersion: null,
      buyer: { playerId: buyer.userId, role: 'BUYER', reservationValueTenths: 500, verifiableFactIds: [] },
      seller: { playerId: seller.userId, role: 'SELLER', reservationValueTenths: 300, verifiableFactIds: [] },
      firstPlayerId: buyer.userId,
      createdAt: Date.now(),
    });
    expect(created.ok).toBe(true);

    const snapshot = await app.inject({ method: 'GET', url: `/v1/matches/${matchId}`, headers: auth(buyer.token) });
    expect(snapshot.statusCode).toBe(200);
    const scenario = (snapshot.json() as { scenario: { sharedContext: string | null; myPrivateContext: string | null; myPrivateFacts: unknown[] } }).scenario;
    expect(scenario.sharedContext).toBeNull();
    expect(scenario.myPrivateContext).toBeNull();
    expect(scenario.myPrivateFacts).toEqual([]);
  });
});
