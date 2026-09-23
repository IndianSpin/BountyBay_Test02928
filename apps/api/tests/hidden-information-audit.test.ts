/**
 * Hidden-information audit (SI-001, GR-002): from a network inspector's
 * perspective — every HTTP response body and every Socket.IO payload that a
 * participant can observe before completion must be free of the opponent's
 * reservation value.
 *
 * The audit captures raw payloads across a full live match, then scans them
 * for the field-scoped string `"reservationValueTenths":<opponentRv>` after
 * the opponent's RV becomes known from the post-completion reveal. A
 * structural check additionally asserts that pre-terminal match:state views
 * carry no reservationValueTenths key on the opponent entry at all.
 */

import { createPrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connectSocket, type Socket as ClientSocket } from 'socket.io-client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDevAuthAdapter } from '../src/auth/adapters';
import { cleanupDevUsers } from './helpers';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

interface Account {
  token: string;
  userId: string;
}

let app: FastifyInstance;
let baseUrl: string;

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe.skipIf(!RUN)('hidden-information wire audit (socket.io + PostgreSQL)', () => {
  beforeAll(async () => {
    const dev = createDevAuthAdapter('test-secret');
    const prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    await prisma.$disconnect();
    app = await buildApp({ auth: dev, prisma: createPrismaClient(DATABASE_URL), exposeDevAuth: true, disconnectDebounceMs: 200 });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (address === null || typeof address === 'string') throw new Error('no bound port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  async function signIn(subject: string): Promise<Account> {
    const res = await fetch(`${baseUrl}/v1/auth/dev/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject }),
    });
    expect(res.status).toBe(200);
    return (await res.json()) as Account;
  }

  async function api(path: string, account: Account, method = 'GET', body?: unknown): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${account.token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it('no pre-result payload exposes the opponent RV', async () => {
    const buyer = await signIn('dev_audit_buyer');
    const seller = await signIn('dev_audit_seller');

    // Create + join; capture the challenge payloads (buyer's perspective).
    const captured: string[] = [];
    const created = await api('/v1/challenges', buyer, 'POST', { commandId: randomUUID() });
    captured.push(await created.text());
    const { matchId, token } = JSON.parse(captured[captured.length - 1]!) as { matchId: string; token: string };

    // The buyer's socket: register + join, capture everything received.
    const buyerSocket = connectSocket(baseUrl, { auth: { token: buyer.token }, transports: ['websocket'] });
    const socketPayloads: string[] = [];
    buyerSocket.onAny((event: string, payload: unknown) => {
      socketPayloads.push(JSON.stringify({ event, payload }));
    });
    try {
      const registered = waitFor(buyerSocket, 'user:registered');
      buyerSocket.emit('user:register', { userId: buyer.userId });
      await registered;
      const joined = waitFor(buyerSocket, 'match:joined');
      buyerSocket.emit('match:join', { matchId });
      await joined;

      // The join response is delivered to the SELLER (it carries the seller's
      // own RV) — it is not part of the buyer's observable traffic.
      const joinRes = await api(`/v1/challenges/${token}/join`, seller, 'POST', { commandId: randomUUID() });
      expect(joinRes.status).toBe(200);

      // Ready both; capture the snapshot payload.
      for (const account of [buyer, seller]) {
        const res = await api(`/v1/matches/${matchId}/ready`, account, 'POST', { commandId: randomUUID() });
        captured.push(await res.text());
      }
      const snapshot = await api(`/v1/matches/${matchId}`, buyer);
      const snapshotText = await snapshot.text();
      captured.push(snapshotText);

      const state = JSON.parse(snapshotText) as { view: { activePlayerId: string; myReservationValueTenths?: number; participants: { playerId: string; latestOfferTenths: number | null; standingOfferId: string | null }[] } };
      const myRv = state.view.myReservationValueTenths ?? 0;

      // Deterministic deal: whoever is active offers at their own RV (always
      // legal at the GR-003 boundary); the third action accepts the crossing.
      const activeAccount = state.view.activePlayerId === buyer.userId ? buyer : seller;
      const otherAccount = state.view.activePlayerId === buyer.userId ? seller : buyer;
      const activeRv = activeAccount.userId === buyer.userId ? myRv : await otherRv(activeAccount, matchId);

      const offer1 = await api(`/v1/matches/${matchId}/offers`, activeAccount, 'POST', { commandId: randomUUID(), amountTenths: activeRv });
      captured.push(await offer1.text());

      const otherRvValue = await otherRv(otherAccount, matchId);
      const offer2 = await api(`/v1/matches/${matchId}/offers`, otherAccount, 'POST', { commandId: randomUUID(), amountTenths: otherRvValue });
      captured.push(await offer2.text());

      // The active player accepts the opponent's standing offer.
      const acceptOfferId = await otherOfferId(otherAccount, matchId);
      const acceptRes = await api(`/v1/matches/${matchId}/accept`, activeAccount, 'POST', {
        commandId: randomUUID(),
        offerId: acceptOfferId,
      });
      const acceptText = await acceptRes.text();
      captured.push(acceptText);
      expect(acceptRes.status).toBe(200);

      // The opponent's private BATNA narrative must never appear anywhere.
      const scenarioProbe = createPrismaClient(DATABASE_URL);
      let opponentNarrative = '';
      try {
        const scenario = await scenarioProbe.scenario.findFirstOrThrow({ where: { id: '00000000-0000-4000-8000-000000000001', version: 1 } });
        const snapshotProbe = await api(`/v1/matches/${matchId}`, buyer);
        const probeBody = (await snapshotProbe.json()) as { scenario: { myNarrative: string } };
        // Determine which narrative belongs to the buyer (the viewer) vs the seller.
        opponentNarrative = probeBody.scenario.myNarrative === scenario.buyerBatnaNarrative ? scenario.sellerBatnaNarrative : scenario.buyerBatnaNarrative;
        expect(opponentNarrative.length).toBeGreaterThan(0);
      } finally {
        await scenarioProbe.$disconnect();
      }

      // Post-completion reveal: the opponent's RV is now legitimately visible.
      const reveal = await api(`/v1/matches/${matchId}/result`, buyer);
      const revealBody = (await reveal.json()) as {
        view: { participants: { playerId: string; reservationValueTenths?: number }[] };
      };
      const sellerEntry = revealBody.view.participants.find((p) => p.playerId === seller.userId)!;
      const sellerRv = sellerEntry.reservationValueTenths;
      expect(sellerRv).toBeDefined();

      // THE AUDIT: the opponent's RV must not appear in ANY pre-result payload.
      // Terminal-status broadcasts are post-completion (GR-018 reveal) and are
      // legitimately exempt; everything else is pre-result and must be clean.
      const leakField = `"reservationValueTenths":${sellerRv}`;
      for (const payload of captured) {
        expect(payload).not.toContain(leakField);
        expect(payload).not.toContain(opponentNarrative); // private BATNA narrative, RV-grade scoping
      }
      for (const payload of socketPayloads) {
        const parsed = JSON.parse(payload) as { payload?: { view?: { status?: string } } };
        if (parsed.payload?.view?.status === 'DEAL' || parsed.payload?.view?.status === 'NO_DEAL' || parsed.payload?.view?.status === 'ABORTED') {
          continue; // post-completion reveal
        }
        expect(payload).not.toContain(leakField);
        expect(payload).not.toContain(opponentNarrative);
      }

      // Structural check on every pre-result match:state: the opponent entry
      // carries no reservationValueTenths key at all (not just a different value).
      for (const raw of socketPayloads) {
        const parsed = JSON.parse(raw) as { event: string; payload?: { view?: { status?: string; participants?: { playerId: string; reservationValueTenths?: number }[] } } };
        if (parsed.event !== 'match:state') continue;
        const status = parsed.payload?.view?.status;
        if (status === 'DEAL' || status === 'NO_DEAL' || status === 'ABORTED') continue; // post-completion reveal
        for (const participant of parsed.payload?.view?.participants ?? []) {
          if (participant.playerId === seller.userId) {
            expect('reservationValueTenths' in participant).toBe(false);
          }
        }
      }
    } finally {
      buyerSocket.disconnect();
    }
  });

  async function otherRv(account: Account, matchId: string): Promise<number> {
    const res = await api(`/v1/matches/${matchId}`, account);
    const body = (await res.json()) as { view: { myReservationValueTenths?: number } };
    return body.view.myReservationValueTenths ?? 0;
  }

  async function otherOfferId(account: Account, matchId: string): Promise<string> {
    const res = await api(`/v1/matches/${matchId}`, account);
    const body = (await res.json()) as { view: { participants: { playerId: string; standingOfferId: string | null }[] } };
    const entry = body.view.participants.find((p) => p.playerId === account.userId)!;
    if (entry.standingOfferId === null) throw new Error('no standing offer');
    return entry.standingOfferId;
  }
});
