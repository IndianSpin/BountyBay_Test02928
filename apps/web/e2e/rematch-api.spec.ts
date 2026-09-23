/**
 * BB-219a API-level E2E (PDR-3): friend-rematch mutual consent over the
 * real HTTP stack — propose after the result, in-session pending prompt,
 * fixed-opponent accept that starts a new ACTIVE match with the same
 * scenario and roles, and decline. No board UI dependency (the
 * result-screen rematch affordances are BB-219b for W2).
 */

import { expect, request, test } from '@playwright/test';

const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

interface SignedIn {
  token: string;
  userId: string;
}

test('rematch: propose after the result, opponent accepts, new ACTIVE match starts (PDR-3)', async () => {
  const api = await request.newContext({ baseURL: API_URL });

  const signin = async (subject: string): Promise<SignedIn> => {
    const res = await api.post('/v1/auth/dev/signin', { data: { subject } });
    expect(res.status()).toBe(200);
    return (await res.json()) as SignedIn;
  };
  const authOf = (token: string) => ({ authorization: `Bearer ${token}` });
  const cmd = () => ({ commandId: crypto.randomUUID() });

  const buyer = await signin('e2e_rematch_buyer');
  const seller = await signin('e2e_rematch_seller');

  // A terminal friend match: challenge → join → ready both → one side walks.
  const created = await api.post('/v1/challenges', { headers: authOf(buyer.token), data: cmd() });
  expect(created.status()).toBe(201);
  const { matchId, token: invite, role: buyerRole } = (await created.json()) as { matchId: string; token: string; role: 'BUYER' | 'SELLER' };

  const joined = await api.post(`/v1/challenges/${invite}/join`, { headers: authOf(seller.token), data: cmd() });
  expect(joined.status()).toBe(200);
  const { role: sellerRole } = (await joined.json()) as { role: 'BUYER' | 'SELLER' };
  expect(sellerRole).not.toBe(buyerRole);
  for (const account of [buyer, seller]) {
    const ready = await api.post(`/v1/matches/${matchId}/ready`, { headers: authOf(account.token), data: cmd() });
    expect(ready.status()).toBe(200);
  }
  // First-actor determinism: walk-away is turn-gated — exactly one side succeeds.
  const walkStatuses: number[] = [];
  for (const account of [buyer, seller]) {
    const walked = await api.post(`/v1/matches/${matchId}/walk-away`, { headers: authOf(account.token), data: cmd() });
    walkStatuses.push(walked.status());
  }
  expect(walkStatuses.filter((s) => s === 200)).toHaveLength(1);

  // Either side may propose: the seller does.
  const proposed = await api.post(`/v1/matches/${matchId}/rematch`, { headers: authOf(seller.token), data: cmd() });
  expect(proposed.status()).toBe(201);
  const { matchId: proposalId, role: proposerRole } = (await proposed.json()) as { matchId: string; role: string };
  expect(proposerRole).toBe(sellerRole);

  // The in-session prompt (BB-219b surface): opponent sees incoming, proposer outgoing.
  const forBuyer = await api.get(`/v1/matches/${matchId}/rematch`, { headers: authOf(buyer.token) });
  expect(forBuyer.status()).toBe(200);
  const { incoming } = (await forBuyer.json()) as { incoming: { matchId: string } | null; outgoing: unknown };
  expect(incoming?.matchId).toBe(proposalId);
  const forSeller = await api.get(`/v1/matches/${matchId}/rematch`, { headers: authOf(seller.token) });
  const { outgoing } = (await forSeller.json()) as { incoming: unknown; outgoing: { matchId: string } | null };
  expect(outgoing?.matchId).toBe(proposalId);

  // Only the fixed opponent accepts; the new match starts ACTIVE immediately.
  const accepted = await api.post(`/v1/matches/${proposalId}/rematch/accept`, { headers: authOf(buyer.token), data: cmd() });
  expect(accepted.status()).toBe(200);
  const acceptedBody = (await accepted.json()) as { matchId: string; role: string; status: string };
  expect(acceptedBody.matchId).toBe(proposalId);
  expect(acceptedBody.role).toBe(buyerRole); // same roles as the previous match
  expect(acceptedBody.status).toBe('ACTIVE');

  const snapshot = await api.get(`/v1/matches/${proposalId}`, { headers: authOf(buyer.token) });
  expect(snapshot.status()).toBe(200);
  const view = (await snapshot.json()) as { view: { status: string; myRole: string }; scenario: { id: string } };
  expect(view.view.status).toBe('ACTIVE');
  expect(view.view.myRole).toBe(buyerRole);
});

test('rematch: decline removes the proposal and either side may propose again (PDR-3)', async () => {
  const api = await request.newContext({ baseURL: API_URL });

  const signin = async (subject: string): Promise<SignedIn> => {
    const res = await api.post('/v1/auth/dev/signin', { data: { subject } });
    expect(res.status()).toBe(200);
    return (await res.json()) as SignedIn;
  };
  const authOf = (token: string) => ({ authorization: `Bearer ${token}` });
  const cmd = () => ({ commandId: crypto.randomUUID() });

  const buyer = await signin('e2e_rematch_decline_buyer');
  const seller = await signin('e2e_rematch_decline_seller');

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

  const proposed = await api.post(`/v1/matches/${matchId}/rematch`, { headers: authOf(buyer.token), data: cmd() });
  expect(proposed.status()).toBe(201);
  const { matchId: proposalId } = (await proposed.json()) as { matchId: string };

  const declined = await api.post(`/v1/matches/${proposalId}/rematch/decline`, { headers: authOf(seller.token), data: cmd() });
  expect(declined.status()).toBe(200);
  expect(await declined.json()).toEqual({ declined: true });

  // The prompt clears for the opponent…
  const after = await api.get(`/v1/matches/${matchId}/rematch`, { headers: authOf(seller.token) });
  expect(((await after.json()) as { incoming: unknown }).incoming).toBeNull();

  // …and the other side is free to propose.
  const again = await api.post(`/v1/matches/${matchId}/rematch`, { headers: authOf(seller.token), data: cmd() });
  expect(again.status()).toBe(201);
});
