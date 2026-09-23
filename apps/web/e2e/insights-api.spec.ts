/**
 * BB-220 API-level E2E: the Insights endpoint serves the caller's IN-3
 * longitudinal profile after a real friend match completes over the HTTP
 * stack — non-null profile with windows and role split, and the
 * opponent's id never appears in the payload (docs/18 §14 self-analysis).
 */

import { expect, request, test } from '@playwright/test';

const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

test('insights: a completed friend match feeds the caller’s longitudinal profile only', async () => {
  const api = await request.newContext({ baseURL: API_URL });

  const signin = async (subject: string) => {
    const res = await api.post('/v1/auth/dev/signin', { data: { subject } });
    expect(res.status()).toBe(200);
    return (await res.json()) as { token: string; userId: string };
  };
  const authOf = (token: string) => ({ authorization: `Bearer ${token}` });
  const cmd = () => ({ commandId: crypto.randomUUID() });

  const buyer = await signin('e2e_insights_buyer');
  const seller = await signin('e2e_insights_seller');

  // No completed matches yet → the empty state, not an error.
  const before = await api.get('/v1/me/insights', { headers: authOf(buyer.token) });
  expect(before.status()).toBe(200);
  expect(await before.json()).toEqual({ profile: null });

  // A terminal friend match: challenge → join → ready both → one side walks.
  const created = await api.post('/v1/challenges', { headers: authOf(buyer.token), data: cmd() });
  expect(created.status()).toBe(201);
  const { matchId, token: invite } = (await created.json()) as { matchId: string; token: string };
  const joined = await api.post(`/v1/challenges/${invite}/join`, { headers: authOf(seller.token), data: cmd() });
  expect(joined.status()).toBe(200);
  for (const account of [buyer, seller]) {
    const ready = await api.post(`/v1/matches/${matchId}/ready`, { headers: authOf(account.token), data: cmd() });
    expect(ready.status()).toBe(200);
  }
  const walkStatuses: number[] = [];
  for (const account of [buyer, seller]) {
    const walked = await api.post(`/v1/matches/${matchId}/walk-away`, { headers: authOf(account.token), data: cmd() });
    walkStatuses.push(walked.status());
  }
  expect(walkStatuses.filter((s) => s === 200)).toHaveLength(1);

  // The buyer's profile now exists and carries only the buyer's data.
  const after = await api.get('/v1/me/insights', { headers: authOf(buyer.token) });
  expect(after.status()).toBe(200);
  const raw = await after.text();
  expect(raw).toContain(buyer.userId);
  expect(raw).not.toContain(seller.userId);
  const { profile } = (await after.json()) as {
    profile: {
      version: string;
      playerId: string;
      matchCount: number;
      confidenceBand: string;
      lifetime: { matchCount: number };
      roleSplit: { buyer: { matchCount: number }; seller: { matchCount: number } };
    };
  };
  expect(profile).not.toBeNull();
  expect(profile.version).toBe('longitudinal-profile-0.1.0');
  expect(profile.playerId).toBe(buyer.userId);
  expect(profile.matchCount).toBe(1);
  expect(profile.confidenceBand).toBe('INSUFFICIENT_DATA');
  expect(profile.lifetime.matchCount).toBe(1);
  expect(profile.roleSplit.buyer.matchCount + profile.roleSplit.seller.matchCount).toBe(1);

  // The seller completed the same match but sees only their own row.
  const sellerProfile = await api.get('/v1/me/insights', { headers: authOf(seller.token) });
  const sellerBody = (await sellerProfile.json()) as { profile: { playerId: string; matchCount: number } | null };
  expect(sellerBody.profile?.playerId).toBe(seller.userId);
  expect(sellerBody.profile?.matchCount).toBe(1);
});
