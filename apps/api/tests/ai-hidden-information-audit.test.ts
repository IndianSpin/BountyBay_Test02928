/**
 * Hidden-information audit for AI matches (SI-001, GR-002, DEC-025): the
 * human's entire observable wire traffic during an AI practice match must
 * be free of the AI's reservation value and of the AI's private BATNA
 * narrative — both known only after the post-completion reveal / from the
 * DB. Also asserts the AI opponent's snapshot entry carries no
 * reservationValueTenths key pre-terminal (structural).
 */

import { createPrismaClient, type PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connectSocket, type Socket as ClientSocket } from 'socket.io-client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDevAuthAdapter } from '../src/auth/adapters';
import { cleanupDevUsers } from './helpers';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

let app: FastifyInstance;
let prisma: PrismaClient;
let baseUrl: string;
let activeSocket: ClientSocket | null = null;

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function pollUntil(cond: () => Promise<boolean>, timeoutMs: number, stepMs = 300): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await cond()) return;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error('poll timed out');
}

describe.skipIf(!RUN)('AI match hidden-information wire audit', () => {
  beforeAll(async () => {
    const dev = createDevAuthAdapter('test-secret');
    prisma = createPrismaClient(DATABASE_URL);
    await cleanupDevUsers(prisma);
    app = await buildApp({ auth: dev, prisma, exposeDevAuth: true, disconnectDebounceMs: 200 });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (address === null || typeof address === 'string') throw new Error('no bound port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    activeSocket?.disconnect();
    await app.close();
    await prisma.$disconnect();
  });

  it('no pre-result payload exposes the AI RV or the AI private narrative', { timeout: 30_000 }, async () => {
    // human identity
    const signin = await fetch(`${baseUrl}/v1/auth/dev/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'dev_ai_audit_h' }),
    });
    const { token, userId } = (await signin.json()) as { token: string; userId: string };

    const created = await fetch(`${baseUrl}/v1/matches/ai`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ commandId: randomUUID(), persona: 'closer' }),
    });
    expect(created.status).toBe(201);
    const { matchId, aiPlayerId, role, reservationValueTenths } = (await created.json()) as {
      matchId: string;
      aiPlayerId: string;
      role: 'BUYER' | 'SELLER';
      reservationValueTenths: number;
    };

    // capture every socket payload the human observes, pre-terminal
    const socket = connectSocket(baseUrl, { auth: { token }, transports: ['websocket'] });
    activeSocket = socket;
    const captured: unknown[] = [];
    socket.on('match:state', (payload: unknown) => captured.push(payload));
    socket.on('match:event', (payload: unknown) => captured.push(payload));
    await waitFor(socket, 'connect');
    const registered = waitFor(socket, 'user:registered');
    socket.emit('user:register', { userId });
    await registered; // the handler sets socket.data.userId asynchronously
    const joined = waitFor(socket, 'match:joined');
    socket.emit('match:join', { matchId });
    await joined;

    // play to completion: ready, offer at own RV (crosses), the Closer accepts
    const post = async (url: string, payload: object) => {
      const res = await fetch(`${baseUrl}${url}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
    };
    await post(`/v1/matches/${matchId}/ready`, { commandId: randomUUID() });
    // wait for my turn: immediate when I am the first mover, after the AI
    // otherwise (the AI may accept directly instead of offering)
    await pollUntil(async () => {
      const res = await fetch(`${baseUrl}/v1/matches/${matchId}`, { headers: { authorization: `Bearer ${token}` } });
      const body = (await res.json()) as { view: { myTurn: boolean } };
      return body.view.myTurn;
    }, 15_000);
    await post(`/v1/matches/${matchId}/offers`, {
      commandId: randomUUID(),
      offerId: randomUUID(),
      amountTenths: reservationValueTenths,
    });
    await pollUntil(async () => {
      const res = await fetch(`${baseUrl}/v1/matches/${matchId}`, { headers: { authorization: `Bearer ${token}` } });
      return ((await res.json()) as { view: { status: string } }).view.status === 'DEAL';
    }, 15_000);

    socket.disconnect();

    // ground truth from the terminal reveal + DB
    const result = await fetch(`${baseUrl}/v1/matches/${matchId}/result`, { headers: { authorization: `Bearer ${token}` } });
    const resultView = ((await result.json()) as { view: { participants: { playerId: string; reservationValueTenths?: number }[] } }).view;
    const aiRv = resultView.participants.find((p) => p.playerId === aiPlayerId)!.reservationValueTenths;
    expect(aiRv).toBeDefined();

    const row = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, select: { scenarioId: true, scenarioVersion: true } });
    const scenario = await prisma.scenario.findFirstOrThrow({ where: { id: row.scenarioId, version: row.scenarioVersion } });
    const aiNarrative = role === 'BUYER' ? scenario.sellerBatnaNarrative : scenario.buyerBatnaNarrative;

    // string scan: the AI RV and the AI narrative never appeared in any
    // PRE-TERMINAL payload the human observed (terminal payloads legally
    // reveal both RVs — GR-018)
    const preTerminal = captured.filter((payload) => {
      const status = (payload as { view?: { status?: string } }).view?.status;
      return status !== 'DEAL' && status !== 'NO_DEAL' && status !== 'ABORTED' && status !== undefined;
    });
    expect(preTerminal.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(preTerminal);
    expect(serialized).not.toContain(`"reservationValueTenths":${aiRv}`);
    expect(serialized).not.toContain(aiNarrative);

    // structural: the AI's participant entry carried no RV key pre-terminal
    for (const payload of preTerminal) {
      const statePayload = payload as { view?: { participants?: { playerId: string; reservationValueTenths?: number }[] } };
      if (!statePayload.view?.participants) continue;
      const aiEntry = statePayload.view.participants.find((p) => p.playerId === aiPlayerId);
      if (aiEntry) expect(aiEntry.reservationValueTenths).toBeUndefined();
    }
  });
});
