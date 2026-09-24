/**
 * BB-226 API-level E2E (DD-M3, GR-028): a verifiable dossier fact is
 * formally revealed over the real HTTP stack — the opponent's snapshot and
 * result carry exactly the revealed fact, unrevealed facts never appear,
 * and repeats are refused. No board UI dependency (the reveal UI is a
 * later W2 task).
 */

import { expect, request, test } from '@playwright/test';

const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

test('reveal: a formally revealed fact reaches the opponent — and only that fact (DD-M3)', async () => {
  const api = await request.newContext({ baseURL: API_URL });

  const signin = async (subject: string) => {
    const res = await api.post('/v1/auth/dev/signin', { data: { subject: `e2e_reveal_${subject}_${crypto.randomUUID().slice(0, 8)}` } });
    expect(res.status()).toBe(200);
    return (await res.json()) as { token: string; userId: string };
  };
  const authOf = (token: string) => ({ authorization: `Bearer ${token}` });
  const cmd = () => ({ commandId: crypto.randomUUID() });

  const buyer = await signin('buyer');
  const seller = await signin('seller');

  // A live friend match: challenge → join → ready both.
  const created = await api.post('/v1/challenges', { headers: authOf(buyer.token), data: cmd() });
  expect(created.status()).toBe(201);
  const { matchId, token: invite, role: buyerRole, scenario: buyerScenario } = (await created.json()) as {
    matchId: string;
    token: string;
    role: 'BUYER' | 'SELLER';
    scenario: { myPrivateFacts: { id: string; text: string; verifiable: boolean }[] };
  };
  const joined = await api.post(`/v1/challenges/${invite}/join`, { headers: authOf(seller.token), data: cmd() });
  expect(joined.status()).toBe(200);
  const { role: sellerRole } = (await joined.json()) as { role: 'BUYER' | 'SELLER' };
  for (const account of [buyer, seller]) {
    const ready = await api.post(`/v1/matches/${matchId}/ready`, { headers: authOf(account.token), data: cmd() });
    expect(ready.status()).toBe(200);
  }

  // The FIRST MOVER is random; reveal from whichever player holds the turn.
  const isMyTurn = async (token: string) => {
    const snap = await api.get(`/v1/matches/${matchId}`, { headers: authOf(token) });
    const view = ((await snap.json()) as { view: { myTurn: boolean } }).view;
    return view.myTurn;
  };
  const verifiableOwnFact = (scenario: { myPrivateFacts: { id: string; text: string; verifiable: boolean }[] }) =>
    scenario.myPrivateFacts.find((f) => f.verifiable)!;

  const [turnHolder, holderScenario, holderRole, holderToken] = (await isMyTurn(buyer.token))
    ? ([buyer.userId, buyerScenario, buyerRole, buyer.token] as const)
    : ([seller.userId, await sellerScenarioOf(), sellerRole, seller.token] as const);

  async function sellerScenarioOf() {
    const snap = await api.get(`/v1/matches/${matchId}`, { headers: authOf(seller.token) });
    return ((await snap.json()) as { scenario: { myPrivateFacts: { id: string; text: string; verifiable: boolean }[] } }).scenario;
  }

  const fact = verifiableOwnFact(holderScenario);
  const others = holderScenario.myPrivateFacts.filter((f) => f.id !== fact.id);

  const revealed = await api.post(`/v1/matches/${matchId}/reveals`, {
    headers: authOf(holderToken),
    data: { commandId: crypto.randomUUID(), factId: fact.id },
  });
  expect(revealed.status()).toBe(200);

  // The opponent's snapshot: the revealed fact's text is present; the rest
  // of the revealer's dossier never is.
  const opponent = holderRole === buyerRole ? seller : buyer;
  const snap = await api.get(`/v1/matches/${matchId}`, { headers: authOf(opponent.token) });
  expect(snap.status()).toBe(200);
  const raw = await snap.text();
  expect(raw).toContain(fact.text);
  for (const other of others) expect(raw).not.toContain(other.text);
  const body = (await snap.json()) as { revealedFacts: Record<string, { id: string; text: string }[]> };
  expect(body.revealedFacts[turnHolder]!.map((f) => f.id)).toEqual([fact.id]);

  // The reveal spent the move: the opponent now reveals one of their own
  // facts, handing the turn back to the first revealer…
  const opponentScenario = opponent.userId === buyer.userId ? buyerScenario : await sellerScenarioOf();
  const opponentFact = verifiableOwnFact(opponentScenario);
  const opponentReveal = await api.post(`/v1/matches/${matchId}/reveals`, {
    headers: authOf(opponent.token),
    data: { commandId: crypto.randomUUID(), factId: opponentFact.id },
  });
  expect(opponentReveal.status()).toBe(200);

  // …and a repeat by the original revealer is refused — reveals are
  // immutable once made.
  const repeat = await api.post(`/v1/matches/${matchId}/reveals`, {
    headers: authOf(holderToken),
    data: { commandId: crypto.randomUUID(), factId: fact.id },
  });
  expect(repeat.status()).toBe(409);
  expect(((await repeat.json()) as { code: string }).code).toBe('REVEAL_ALREADY_MADE');
});
