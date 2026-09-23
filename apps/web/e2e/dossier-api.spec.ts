/**
 * DD-M2 API-level E2E (BB-204 amended contract): the dossier payload is
 * present, role-scoped, and leakage-free — checked on the raw response
 * text, not parsed fields. No board UI dependency (the Dossier component
 * is wired by W2 in BB-213).
 */

import { expect, request, test } from '@playwright/test';

const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

interface DossierFact {
  id: string;
  text: string;
  category: string;
  verifiable: boolean;
  optionalRevealLabel?: string;
}

interface ScenarioPayload {
  id: string;
  title: string;
  description: string;
  myNarrative: string;
  sharedContext: string | null;
  myPrivateContext: string | null;
  myPrivateFacts: DossierFact[];
}

test('dossier payload is present, role-scoped, and leakage-free (DD-M2)', async () => {
  const api = await request.newContext({ baseURL: API_URL });

  const signin = async (subject: string) => {
    const res = await api.post('/v1/auth/dev/signin', { data: { subject } });
    expect(res.status()).toBe(200);
    return (await res.json()) as { token: string; userId: string };
  };
  const authOf = (token: string) => ({ authorization: `Bearer ${token}` });
  const cmd = () => ({ commandId: crypto.randomUUID() });

  const buyer = await signin('e2e_dossier_buyer');
  const seller = await signin('e2e_dossier_seller');

  const created = await api.post('/v1/challenges', { headers: authOf(buyer.token), data: cmd() });
  expect(created.status()).toBe(201);
  const { matchId, token: invite, scenario: buyerScenario } = (await created.json()) as {
    matchId: string;
    token: string;
    scenario: ScenarioPayload;
  };

  // The creator's response already carries SOME dossier (role is random).
  expect(typeof buyerScenario.sharedContext).toBe('string');
  expect(buyerScenario.myPrivateFacts.length).toBeGreaterThan(0);

  const joined = await api.post(`/v1/challenges/${invite}/join`, { headers: authOf(seller.token), data: cmd() });
  expect(joined.status()).toBe(200);
  for (const account of [buyer, seller]) {
    const ready = await api.post(`/v1/matches/${matchId}/ready`, { headers: authOf(account.token), data: cmd() });
    expect(ready.status()).toBe(200);
  }

  const snapshot = async (token: string) => {
    const res = await api.get(`/v1/matches/${matchId}`, { headers: authOf(token) });
    expect(res.status()).toBe(200);
    return { raw: await res.text(), body: (await res.json()) as { scenario: ScenarioPayload } };
  };

  // Buyer's view: own facts present; the seller's dossier absent from the
  // RAW text (penetration check). Fact texts come from each player's OWN
  // snapshot — roles are randomly assigned.
  const buyerView = await snapshot(buyer.token);
  const sellerView = await snapshot(seller.token);
  const buyerFactTexts = buyerView.body.scenario.myPrivateFacts.map((f) => f.text);
  const sellerFactTexts = sellerView.body.scenario.myPrivateFacts.map((f) => f.text);
  expect(buyerFactTexts.length).toBeGreaterThan(0);
  expect(sellerFactTexts.length).toBeGreaterThan(0);

  for (const text of buyerFactTexts) {
    expect(buyerView.raw).toContain(text);
    expect(sellerView.raw).not.toContain(text);
  }
  for (const text of sellerFactTexts) {
    expect(sellerView.raw).toContain(text);
    expect(buyerView.raw).not.toContain(text);
  }
  expect(buyerView.raw).not.toContain(sellerView.body.scenario.myPrivateContext ?? 'sentinel-context');
  expect(sellerView.raw).not.toContain(buyerView.body.scenario.myPrivateContext ?? 'sentinel-context');

  // Facts obey the content discipline (number-free) at the payload level.
  for (const fact of [...buyerFactTexts, ...sellerFactTexts]) {
    expect(/\d/.test(fact)).toBe(false);
  }

  // Play the deal to a close (deterministic: active player offers own RV,
  // the other accepts — the crossing offer sits inside the acceptor's RV).
  const play = async (token: string) => {
    const s = (await api.get(`/v1/matches/${matchId}`, { headers: authOf(token) })).json() as unknown as {
      view: { myTurn: boolean; myReservationValueTenths?: number; participants: { playerId: string; standingOfferId: string | null }[] };
    };
    const view = await s;
    if (!view.view.myTurn) return;
    const opponent = view.view.participants.find((p) => p.playerId !== (token === buyer.token ? buyer.userId : seller.userId))!;
    if (opponent.standingOfferId !== null) {
      const accept = await api.post(`/v1/matches/${matchId}/accept`, { headers: authOf(token), data: { ...cmd(), offerId: opponent.standingOfferId } });
      expect(accept.status()).toBe(200);
      return;
    }
    const offer = await api.post(`/v1/matches/${matchId}/offers`, { headers: authOf(token), data: { ...cmd(), amountTenths: view.view.myReservationValueTenths } });
    expect(offer.status()).toBe(200);
  };
  for (let round = 0; round < 4; round++) {
    for (const account of [buyer, seller]) await play(account.token);
  }

  // Result route: same role-scoped dossier after completion.
  const result = await api.get(`/v1/matches/${matchId}/result`, { headers: authOf(buyer.token) });
  expect(result.status()).toBe(200);
  const resultRaw = await result.text();
  for (const text of buyerFactTexts) expect(resultRaw).toContain(text);
  for (const text of sellerFactTexts) expect(resultRaw).not.toContain(text);

  await api.dispose();
});
