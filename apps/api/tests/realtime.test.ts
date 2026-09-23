/**
 * Realtime integration tests (06 §7, GR-015/GR-016, 08 socket events).
 * A real HTTP server + socket.io clients; the game is played over HTTP and
 * both sockets must receive committed events and their role-scoped states.
 */

import { createPrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connectSocket, type Socket as ClientSocket } from 'socket.io-client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { cleanupDevUsers } from './helpers';
import { createDevAuthAdapter } from '../src/auth/adapters';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

interface Account {
  token: string;
  userId: string;
}

interface MatchViewPayload {
  view: {
    status: string;
    activePlayerId: string | null;
    myRole: 'BUYER' | 'SELLER';
    myReservationValueTenths?: number;
    participants: { playerId: string; reservationValueTenths?: number; latestOfferTenths: number | null; standingOfferId: string | null }[];
  };
  serverNow: number;
}

let app: FastifyInstance;
let dev: ReturnType<typeof createDevAuthAdapter>;
let baseUrl: string;

function waitFor<T = Record<string, unknown>>(socket: ClientSocket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Listens until a match:state payload satisfies the predicate (states arrive per command). */
function waitForState(socket: ClientSocket, predicate: (view: MatchViewPayload['view']) => boolean, timeoutMs = 4000): Promise<MatchViewPayload> {
  return new Promise<MatchViewPayload>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('match:state', handler);
      reject(new Error('timed out waiting for match:state predicate'));
    }, timeoutMs);
    function handler(payload: MatchViewPayload): void {
      if (predicate(payload.view)) {
        clearTimeout(timer);
        socket.off('match:state', handler);
        resolve(payload);
      }
    }
    socket.on('match:state', handler);
  });
}

async function api(path: string, account: Account, method = 'GET', body?: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${account.token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function register(socket: ClientSocket, account: Account): Promise<void> {
  const done = waitFor(socket, 'user:registered');
  socket.emit('user:register', { userId: account.userId });
  await done;
}

async function joinMatch(socket: ClientSocket, matchId: string): Promise<void> {
  const done = waitFor(socket, 'match:joined');
  socket.emit('match:join', { matchId });
  await done;
}

describe.skipIf(!RUN)('realtime layer (socket.io + PostgreSQL)', () => {
  beforeAll(async () => {
    dev = createDevAuthAdapter('test-secret');
    const prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    await prisma.$disconnect();
    // Short debounce: the disconnect test still exercises the debounce path.
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

  async function createAndJoinChallenge(buyer: Account, seller: Account): Promise<string> {
    const created = await api('/v1/challenges', buyer, 'POST', { commandId: randomUUID() });
    expect(created.status).toBe(201);
    const { matchId, token } = (await created.json()) as { matchId: string; token: string };
    const joined = await api(`/v1/challenges/${token}/join`, seller, 'POST', { commandId: randomUUID() });
    expect(joined.status).toBe(200);
    return matchId;
  }

  it('two sockets receive committed events and role-scoped states for a live match', async () => {
    const buyer = await signIn('dev_sock_buyer');
    const seller = await signIn('dev_sock_seller');
    const matchId = await createAndJoinChallenge(buyer, seller);

    const buyerSocket = connectSocket(baseUrl, { auth: { token: buyer.token }, transports: ['websocket'] });
    const sellerSocket = connectSocket(baseUrl, { auth: { token: seller.token }, transports: ['websocket'] });
    try {
      await Promise.all([register(buyerSocket, buyer), register(sellerSocket, seller)]);
      await Promise.all([joinMatch(buyerSocket, matchId), joinMatch(sellerSocket, matchId)]);

      // Ready both; the seller's role-scoped ACTIVE state arrives over the socket.
      const sellerState = waitForState(sellerSocket, (view) => view.status === 'ACTIVE');
      for (const account of [buyer, seller]) {
        const res = await api(`/v1/matches/${matchId}/ready`, account, 'POST', { commandId: randomUUID() });
        expect(res.status).toBe(200);
      }
      const sellerView = await sellerState;
      expect(sellerView.view.myReservationValueTenths).toBeGreaterThan(0); // own RV always visible

      // SI-001: the buyer's HTTP snapshot never carries the seller's RV.
      const snapshot = await api(`/v1/matches/${matchId}`, buyer);
      const buyerSnapshot = (await snapshot.json()) as MatchViewPayload;
      const sellerEntry = buyerSnapshot.view.participants.find((p) => p.playerId === seller.userId)!;
      expect(sellerEntry.reservationValueTenths).toBeUndefined();

      // The active player offers over HTTP; both sockets receive match:event.
      // Offering exactly at the player's own RV is legal for either role
      // (GR-003 boundary) regardless of the random assignment.
      const buyerEvent = waitFor<{ events: { type: string }[] }>(buyerSocket, 'match:event');
      const sellerEvent = waitFor<{ events: { type: string }[] }>(sellerSocket, 'match:event');
      const activeAccount = buyerSnapshot.view.activePlayerId === buyer.userId ? buyer : seller;
      const activeRv = buyerSnapshot.view.myReservationValueTenths;
      const offer = await api(`/v1/matches/${matchId}/offers`, activeAccount, 'POST', { commandId: randomUUID(), amountTenths: activeRv });
      expect(offer.status).toBe(200);

      for (const eventPayload of [await buyerEvent, await sellerEvent]) {
        expect(eventPayload.events.some((e) => e.type === 'OFFER_SUBMITTED')).toBe(true);
      }
    } finally {
      buyerSocket.disconnect();
      sellerSocket.disconnect();
    }
  });

  it('a verified disconnect pauses the match after the debounce and reconnection resumes (GR-015)', async () => {
    const buyer = await signIn('dev_sock_buyer2');
    const seller = await signIn('dev_sock_seller2');
    const matchId = await createAndJoinChallenge(buyer, seller);
    for (const account of [buyer, seller]) {
      await api(`/v1/matches/${matchId}/ready`, account, 'POST', { commandId: randomUUID() });
    }

    const snapshot = await api(`/v1/matches/${matchId}`, buyer);
    const { view } = (await snapshot.json()) as MatchViewPayload;
    const activeAccount = view.activePlayerId === buyer.userId ? buyer : seller;
    const otherAccount = view.activePlayerId === buyer.userId ? seller : buyer;

    const activeSocket = connectSocket(baseUrl, { auth: { token: activeAccount.token }, transports: ['websocket'] });
    const otherSocket = connectSocket(baseUrl, { auth: { token: otherAccount.token }, transports: ['websocket'] });
    try {
      await Promise.all([register(activeSocket, activeAccount), register(otherSocket, otherAccount)]);
      await Promise.all([joinMatch(activeSocket, matchId), joinMatch(otherSocket, matchId)]);

      // The active player drops; after the debounce the match pauses.
      const pausedEvent = waitFor<{ events: { type: string }[] }>(otherSocket, 'match:event');
      activeSocket.disconnect();
      const { events } = await pausedEvent;
      expect(events.some((e) => e.type === 'PLAYER_DISCONNECTED')).toBe(true);
      expect(events.some((e) => e.type === 'MATCH_PAUSED')).toBe(true);

      // Reconnecting the same player resumes the same player's clock.
      const resumedEvent = waitFor<{ events: { type: string }[] }>(otherSocket, 'match:event');
      const reconnected = connectSocket(baseUrl, { auth: { token: activeAccount.token }, transports: ['websocket'] });
      try {
        await register(reconnected, activeAccount);
        await joinMatch(reconnected, matchId);
        const { events: resumeEvents } = await resumedEvent;
        expect(resumeEvents.some((e) => e.type === 'PLAYER_RECONNECTED')).toBe(true);
      } finally {
        reconnected.disconnect();
      }
    } finally {
      otherSocket.disconnect();
    }
  });
});
