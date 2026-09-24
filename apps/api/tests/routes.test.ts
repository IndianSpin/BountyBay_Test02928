/**
 * API route integration tests (08_API_CONTRACTS.md shapes; DEC-023 adapter
 * boundary). Run with the database up: `pnpm test:db`.
 */

import { createPrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { cleanupDevUsers } from './helpers';
import { createDevAuthAdapter } from '../src/auth/adapters';

const RUN = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';

let app: FastifyInstance;
let dev: ReturnType<typeof createDevAuthAdapter>;

describe.skipIf(!RUN)('API routes (PostgreSQL)', () => {
  beforeAll(async () => {
    dev = createDevAuthAdapter('test-secret');
    const prisma = createPrismaClient(DATABASE_URL);
    // Only this file's dev users — other DB test files share the database.
    await cleanupDevUsers(prisma);
    await prisma.$disconnect();
    app = await buildApp({ auth: dev, prisma: createPrismaClient(DATABASE_URL), exposeDevAuth: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responds', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, service: 'bounty-bay-api' });
  });

  it('GET /v1/me returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('UNAUTHENTICATED');
  });

  it('GET /v1/me returns 401 for a garbage token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer garbage' } });
    expect(res.statusCode).toBe(401);
  });

  it('dev sign-in rejects bot subjects (DEC-025)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/dev/signin',
      payload: { subject: 'bot:closer' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('bot subjects');
  });

  it('dev sign-in is never registered in production, even when exposeDevAuth is true (QA-006)', async () => {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodApp = await buildApp({ auth: dev, prisma: createPrismaClient(DATABASE_URL), exposeDevAuth: true });
      expect(prodApp.hasRoute({ method: 'POST', url: '/v1/auth/dev/signin' })).toBe(false);
      await prodApp.close();
    } finally {
      process.env.NODE_ENV = saved;
    }
  });

  it('production gameplay rate caps are pinned; development caps are generous (QA-009, BB-250)', async () => {
    // hasRoute returns only a boolean (no config), so the pins are proven
    // behaviorally: in production the exact per-minute caps fire one
    // request past the pinned value; in development the same volume never
    // 429s (10× caps via gameRouteCap).
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodApp = await buildApp({ auth: dev, prisma: createPrismaClient(DATABASE_URL), exposeDevAuth: false });
      // The dev adapter shares the test secret, so a dev-minted token from
      // the main app authenticates against the production-mode app too.
      const signin = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_cap_probe' } });
      const { token } = signin.json() as { token: string };
      const headers = { authorization: `Bearer ${token}` };

      // challenges: pinned 20/min — the 21st request 429s.
      let matchId: string | null = null;
      let last = 0;
      for (let i = 0; i < 21; i += 1) {
        const res = await prodApp.inject({ method: 'POST', url: '/v1/challenges', headers, payload: { commandId: randomUUID() } });
        last = res.statusCode;
        if (res.statusCode === 201) matchId = (res.json() as { matchId: string }).matchId;
      }
      expect(last).toBe(429);
      expect(matchId).not.toBeNull();

      // The remaining pinned caps: the limiter counts requests regardless
      // of the domain outcome, so fire cap+1 requests at each route.
      const pinned = [
        { url: `/v1/matches/${matchId}/ready`, max: 30, body: { commandId: randomUUID() } },
        { url: `/v1/matches/${matchId}/offers`, max: 60, body: { commandId: randomUUID(), amountTenths: 100 } },
        { url: `/v1/matches/${matchId}/accept`, max: 30, body: { commandId: randomUUID(), offerId: randomUUID() } },
        { url: `/v1/matches/${matchId}/walk-away`, max: 30, body: { commandId: randomUUID() } },
        { url: `/v1/matches/${matchId}/messages`, max: 30, body: { commandId: randomUUID(), body: 'probe' } },
      ];
      for (const { url, max, body } of pinned) {
        let status = 0;
        for (let i = 0; i < max + 1; i += 1) {
          const res = await prodApp.inject({
            method: 'POST',
            url,
            headers: { 'content-type': 'application/json', ...headers },
            payload: { ...body, commandId: randomUUID() },
          });
          status = res.statusCode;
        }
        expect(status, `${url} hits its production cap`).toBe(429);
      }
      await prodApp.close();
    } finally {
      process.env.NODE_ENV = saved;
    }

    // Development: the same volume never 429s (gameRouteCap ×10). Use the
    // two QA-009-critical routes; the others share the same helper.
    const devSignin = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_cap_probe_dev' } });
    const devHeaders = { authorization: `Bearer ${(devSignin.json() as { token: string }).token}` };
    let devMatchId: string | null = null;
    for (let i = 0; i < 21; i += 1) {
      const res = await app.inject({ method: 'POST', url: '/v1/challenges', headers: devHeaders, payload: { commandId: randomUUID() } });
      expect(res.statusCode).not.toBe(429);
      if (res.statusCode === 201) devMatchId = (res.json() as { matchId: string }).matchId;
    }
    expect(devMatchId).not.toBeNull();
    for (let i = 0; i < 31; i += 1) {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/matches/${devMatchId}/ready`,
        headers: devHeaders,
        payload: { commandId: randomUUID() },
      });
      expect(res.statusCode).not.toBe(429);
    }
  });

  it('a bot user can never authenticate, even with a validly signed token (DEC-025)', async () => {
    const token = dev.signToken('bot:closer');
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });

  it('dev sign-in → /v1/me → handle → public profile end-to-end', async () => {
    const signin = await app.inject({
      method: 'POST',
      url: '/v1/auth/dev/signin',
      payload: { subject: 'dev_user_001', handle: 'BlackParrot' },
    });
    expect(signin.statusCode).toBe(200);
    const { token, userId } = signin.json();
    expect(typeof token).toBe('string');

    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(200);
    const body = me.json();
    expect(body).toMatchObject({ id: userId, handle: 'BlackParrot' });
    expect(body.profile).toMatchObject({ bountyRating: 1200, ratedGames: 0, agreementRate: 0, averageSurplusShare: 0 });

    const profile = await app.inject({ method: 'GET', url: '/v1/profiles/BlackParrot' });
    expect(profile.statusCode).toBe(200);
    // Exact public shape (08_API_CONTRACTS): no id, no authSubject.
    expect(profile.json()).toEqual({
      handle: 'BlackParrot',
      bountyRating: 1200,
      ratedGames: 0,
      agreementRate: 0,
      averageSurplusShare: 0,
    });

    const unknown = await app.inject({ method: 'GET', url: '/v1/profiles/NoSuchHandle' });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().code).toBe('PROFILE_NOT_FOUND');
  });

  it('sign-in is idempotent per subject and preserves the chosen handle', async () => {
    const first = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_002' } });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.handle).toMatch(/^[A-Za-z0-9_-]{3,16}$/);

    const second = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_002' } });
    expect(second.statusCode).toBe(200);
    expect(second.json().userId).toBe(firstBody.userId);
    expect(second.json().handle).toBe(firstBody.handle);
  });

  it('rejects duplicate handles case-insensitively and invalid handle formats', async () => {
    const a = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_003', handle: 'IronAnchor' } });
    expect(a.statusCode).toBe(200);

    const b = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_004', handle: 'ironanchor' } });
    expect(b.statusCode).toBe(409);
    expect(b.json().code).toBe('HANDLE_TAKEN');

    const bad = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_005', handle: 'x' } });
    expect(bad.statusCode).toBe(400);

    const token = a.json().token as string;
    const change = await app.inject({
      method: 'POST',
      url: '/v1/me/handle',
      headers: { authorization: `Bearer ${token}` },
      payload: { handle: 'IRONANCHOR' },
    });
    // Own handle, different case: allowed to adopt the casing.
    expect(change.statusCode).toBe(200);

    // A third user owns a distinct handle; taking it must be rejected.
    const c = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_005', handle: 'TakenGull' } });
    expect(c.statusCode).toBe(200);
    const taken = await app.inject({
      method: 'POST',
      url: '/v1/me/handle',
      headers: { authorization: `Bearer ${token}` },
      payload: { handle: 'takenGull' },
    });
    expect(taken.statusCode).toBe(409);
  });

  it('POST /v1/me/handle requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/me/handle', payload: { handle: 'SneakyGull' } });
    expect(res.statusCode).toBe(401);
  });

  it('dev auth fails closed under NODE_ENV=production: the route does not exist', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodApp = await buildApp({
        auth: dev, // a dev adapter is even supplied on purpose
        prisma: createPrismaClient(DATABASE_URL),
        exposeDevAuth: true, // and the flag is forced true
      });
      try {
        const res = await prodApp.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_prod_probe' } });
        expect(res.statusCode).toBe(404); // structurally unregistered, not just refused
      } finally {
        await prodApp.close();
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('dev signin requires a well-formed handle', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/dev/signin', payload: { subject: 'dev_user_006', handle: 'Bad Handle!' } });
    expect(res.statusCode).toBe(400);
  });
});
