/**
 * QA adversarial battery (Agent 5). Drives the live API with three dev
 * accounts and attacks the GR/SI invariants from the network: boundaries,
 * direction, duplicates, acceptance legality, accept races, chat, walk-away
 * semantics, reconnect freeze/resume (GR-015), non-participant access.
 *
 * Usage: boot the API against the isolated QA DB, then
 *   BASE=http://localhost:4300 pnpm --filter @bounty-bay/db exec tsx .agents/qa/tools/battery.ts
 * Results → .agents/qa/evidence/battery-results.jsonl (append, PASS/FAIL/INFO).
 */
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as connectSocket, type Socket } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:4300';
const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = process.env.RESULTS ?? path.resolve(TOOLS_DIR, '..', 'evidence', 'battery-results.jsonl');

function record(probe: string, verdict: 'PASS' | 'FAIL' | 'INFO', expected: string, actual: unknown, evidence?: unknown): void {
  appendFileSync(RESULTS, JSON.stringify({ at: new Date().toISOString(), probe, verdict, expected, actual, evidence }) + '\n');
  console.log(`[${verdict}] ${probe} :: expected ${expected} :: got ${JSON.stringify(actual)?.slice(0, 200)}`);
}

interface Account { token: string; userId: string; }
interface View { status: string; activePlayerId: string | null; myReservationValueTenths?: number; participants: { playerId: string; role: string; latestOfferTenths: number | null; standingOfferId: string | null; decisionTimeRemainingMs: number | null }[]; }

async function signin(subject: string): Promise<Account> {
  const res = await fetch(`${BASE}/v1/auth/dev/signin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject }) });
  return (await res.json()) as Account;
}
async function api(path: string, account: Account, method = 'GET', body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${account.token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, body: parsed as Record<string, unknown> };
}
async function snapshot(account: Account, matchId: string): Promise<View> {
  const r = await api(`/v1/matches/${matchId}`, account);
  return (r.body as { view: View }).view;
}
function expectStatus(probe: string, want: number, got: { status: number; body: Record<string, unknown> }, codeCheck?: (b: Record<string, unknown>) => boolean): void {
  const ok = got.status === want && (!codeCheck || codeCheck(got.body));
  record(probe, ok ? 'PASS' : 'FAIL', `status ${want}`, { status: got.status, code: got.body?.code }, got.body);
}
function waitFor<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });
}
async function newMatch(a: Account, b: Account): Promise<{ matchId: string; token: string }> {
  const created = await api('/v1/challenges', a, 'POST', { commandId: randomUUID() });
  const { matchId, token } = created.body as { matchId: string; token: string };
  await api(`/v1/challenges/${token}/join`, b, 'POST', { commandId: randomUUID() });
  return { matchId, token };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const tag = `qa_${Date.now() % 100000}`;
  const a = await signin(`${tag}_a`);
  const b = await signin(`${tag}_b`);
  const c = await signin(`${tag}_c`); // hostile third party
  console.log('accounts ready', tag);

  // ============================ MATCH 1: integrity ============================
  const { matchId } = await newMatch(a, b);
  for (const acct of [a, b]) await api(`/v1/matches/${matchId}/ready`, acct, 'POST', { commandId: randomUUID() });
  let view = await snapshot(a, matchId);
  const active = view.activePlayerId === a.userId ? a : b;
  const passive = view.activePlayerId === a.userId ? b : a;
  const activeRole = view.participants.find((p) => p.playerId === active.userId)!.role;
  const activeRv = (await snapshot(active, matchId)).myReservationValueTenths!;
  const passiveRv = (await snapshot(passive, matchId)).myReservationValueTenths!;

  // GR-003 boundary on the opening offer
  const beyond = activeRole === 'BUYER' ? activeRv + 1 : activeRv - 1;
  expectStatus('GR-003 opening beyond RV rejected', 400, await api(`/v1/matches/${matchId}/offers`, active, 'POST', { commandId: randomUUID(), amountTenths: beyond }), (b) => b.code === 'OUTSIDE_RESERVATION_VALUE');

  // GR-004 amount domain
  for (const [label, amount] of [['zero', 0], ['negative', -10], ['above-max', 10000000000], ['non-integer', 193.7], ['scientific-string', '1e3']] as const) {
    expectStatus(`GR-004 ${label} rejected`, 400, await api(`/v1/matches/${matchId}/offers`, active, 'POST', { commandId: randomUUID(), amountTenths: amount }));
  }

  // openings at own RV (legal at GR-003 boundary)
  await api(`/v1/matches/${matchId}/offers`, active, 'POST', { commandId: randomUUID(), amountTenths: activeRv });
  await api(`/v1/matches/${matchId}/offers`, passive, 'POST', { commandId: randomUUID(), amountTenths: passiveRv });
  view = await snapshot(a, matchId);
  record('turn returned to first mover after two openings', view.activePlayerId === active.userId ? 'PASS' : 'FAIL', `active=${active.userId.slice(-4)}`, view.activePlayerId?.slice(-4));
  record('GR-011 crossed offers do not settle', view.status === 'ACTIVE' ? 'PASS' : 'FAIL', 'ACTIVE after crossing', view.status);

  // GR-007 duplicate while own turn
  const dup = await api(`/v1/matches/${matchId}/offers`, active, 'POST', { commandId: randomUUID(), amountTenths: activeRv });
  expectStatus('GR-007 duplicate while own turn', 400, dup, (b) => b.code === 'DUPLICATE_OFFER');

  // GR-008 backwards direction
  const wrongDir = activeRole === 'BUYER' ? activeRv - 10 : activeRv + 10;
  expectStatus('GR-008 backwards offer rejected', 400, await api(`/v1/matches/${matchId}/offers`, active, 'POST', { commandId: randomUUID(), amountTenths: wrongDir }), (b) => b.code === 'NON_MONOTONIC_CONCESSION');

  // GR-010 acceptance legality
  expectStatus('accept garbage offerId rejected', 409, await api(`/v1/matches/${matchId}/accept`, active, 'POST', { commandId: randomUUID(), offerId: randomUUID() }), (b) => b.code === 'OFFER_NOT_CURRENT');
  const myStanding = (await snapshot(active, matchId)).participants.find((p) => p.playerId === active.userId)!.standingOfferId;
  expectStatus('accept own standing offer rejected', 409, await api(`/v1/matches/${matchId}/accept`, active, 'POST', { commandId: randomUUID(), offerId: myStanding }), (b) => b.code === 'OFFER_NOT_CURRENT');
  expectStatus('non-active player cannot accept', 409, await api(`/v1/matches/${matchId}/accept`, passive, 'POST', { commandId: randomUUID(), offerId: myStanding }), (b) => b.code === 'NOT_YOUR_TURN');

  // GR-013 chat: passive player chats, turn unchanged
  const msgRes = await api(`/v1/matches/${matchId}/messages`, passive, 'POST', { commandId: randomUUID(), body: 'not an offer, just talk' });
  const afterChat = await snapshot(a, matchId);
  record('GR-013 chat accepted, turn unchanged', msgRes.status === 200 && afterChat.activePlayerId === active.userId ? 'PASS' : 'FAIL', '200 + same active', { status: msgRes.status, body: msgRes.body });

  // GR-012 walk-away by NON-active player: PDR-2 with the founder —
  // documented conflict between GR-012 text and the domain's turn gate.
  const walkPassive = await api(`/v1/matches/${matchId}/walk-away`, passive, 'POST', { commandId: randomUUID() });
  record('GR-012 walk-away by non-active player — PDR-2 (report only)', 'INFO', 'domain turn-gates; spec text implies either player', { status: walkPassive.status, code: walkPassive.body?.code });

  // idempotency: identical commandId replayed on a FRESH pre-start match
  // (READY is the only amount-free command that can be replayed safely).
  const mIdem = await newMatch(a, b);
  const cmdId = randomUUID();
  const first = await api(`/v1/matches/${mIdem.matchId}/ready`, a, 'POST', { commandId: cmdId });
  const replay = await api(`/v1/matches/${mIdem.matchId}/ready`, a, 'POST', { commandId: cmdId });
  record('idempotency: commandId replay not double-committed', first.status === 200 && replay.status === 409 && replay.body?.code === 'COMMAND_ALREADY_PROCESSED' ? 'PASS' : 'FAIL', 'first 200, replay 409 already-processed', { first: first.status, replay: replay.status, code: replay.body?.code });

  // accept race: two concurrent accepts, exactly one settles
  const fresh = await snapshot(a, matchId);
  const oppOffer = fresh.participants.find((p) => p.playerId !== fresh.activePlayerId)!.standingOfferId!;
  const activeNow = fresh.activePlayerId === a.userId ? a : b;
  const [r1, r2] = await Promise.all([
    api(`/v1/matches/${matchId}/accept`, activeNow, 'POST', { commandId: randomUUID(), offerId: oppOffer }),
    api(`/v1/matches/${matchId}/accept`, activeNow, 'POST', { commandId: randomUUID(), offerId: oppOffer }),
  ]);
  const statuses = [r1.status, r2.status].sort((x, y) => x - y);
  record('accept race: exactly one 200, no double settlement', statuses[0] === 200 && statuses[1] !== 200 ? 'PASS' : 'FAIL', 'one 200 + one 4xx', statuses);

  const post = await snapshot(a, matchId);
  record('post-accept terminal state', post.status === 'DEAL' ? 'PASS' : 'FAIL', 'DEAL', post.status);

  // settlement math from result
  const resultA = await api(`/v1/matches/${matchId}/result`, a);
  const dealView = (resultA.body as { view: { settlementTenths: number; participants: { playerId: string; reservationValueTenths?: number }[] } }).view;
  const settlement = dealView.settlementTenths;
  const pA = dealView.participants.find((p: { playerId: string; reservationValueTenths?: number }) => p.playerId === a.userId);
  const pB = dealView.participants.find((p: { playerId: string; reservationValueTenths?: number }) => p.playerId === b.userId);
  record('settlement within both RVs (GR invariant)', settlement >= Math.min(pA?.reservationValueTenths ?? 0, pB?.reservationValueTenths ?? 0) && settlement <= Math.max(pA?.reservationValueTenths ?? 0, pB?.reservationValueTenths ?? 0) ? 'PASS' : 'FAIL', 'seller_min <= settlement <= buyer_max', { settlement, rvA: pA?.reservationValueTenths, rvB: pB?.reservationValueTenths });
  record('result reveals both RVs post-completion (GR-018)', pA?.reservationValueTenths != null && pB?.reservationValueTenths != null ? 'PASS' : 'FAIL', 'both RVs present', { rvA: pA?.reservationValueTenths, rvB: pB?.reservationValueTenths });

  // post-terminal commands
  expectStatus('post-terminal offer rejected', 409, await api(`/v1/matches/${matchId}/offers`, a, 'POST', { commandId: randomUUID(), amountTenths: 100 }), (b) => b.code === 'MATCH_NOT_ACTIVE');
  expectStatus('post-terminal walk rejected', 409, await api(`/v1/matches/${matchId}/walk-away`, a, 'POST', { commandId: randomUUID() }), (b) => b.code === 'MATCH_NOT_ACTIVE');

  // third-party (non-participant) access
  expectStatus('non-participant snapshot denied', 403, await api(`/v1/matches/${matchId}`, c), (b) => b.code === 'NOT_A_MATCH_PARTICIPANT');
  expectStatus('non-participant result denied', 403, await api(`/v1/matches/${matchId}/result`, c), (b) => b.code === 'NOT_A_MATCH_PARTICIPANT');
  expectStatus('non-participant review denied', 403, await api(`/v1/matches/${matchId}/review`, c), (b) => b.code === 'NOT_A_MATCH_PARTICIPANT');
  expectStatus('non-participant events denied', 403, await api(`/v1/matches/${matchId}/events`, c), (b) => b.code === 'NOT_A_MATCH_PARTICIPANT');
  expectStatus('non-participant offer denied', 403, await api(`/v1/matches/${matchId}/offers`, c, 'POST', { commandId: randomUUID(), amountTenths: 100 }), (b) => b.code === 'NOT_A_MATCH_PARTICIPANT');

  // ============================ MATCH 2: reconnect freeze/resume ============================
  const m2 = await newMatch(a, b);
  for (const acct of [a, b]) await api(`/v1/matches/${m2.matchId}/ready`, acct, 'POST', { commandId: randomUUID() });
  const v2 = await snapshot(a, m2.matchId);
  const active2 = v2.activePlayerId === a.userId ? a : b;
  const activeEntry = (v: View) => v.participants.find((p) => p.playerId === v.activePlayerId)!;

  const sock = connectSocket(BASE, { auth: { token: active2.token }, transports: ['websocket'] });
  const reg = waitFor(sock, 'user:registered');
  sock.emit('user:register', { userId: active2.userId });
  await reg;
  const join = waitFor(sock, 'match:joined');
  sock.emit('match:join', { matchId: m2.matchId });
  await join;
  sock.disconnect();
  await sleep(7500); // past the 5s debounce
  const frozen1 = activeEntry(await snapshot(a, m2.matchId)).decisionTimeRemainingMs;
  await sleep(2500);
  const frozen2 = activeEntry(await snapshot(a, m2.matchId)).decisionTimeRemainingMs;
  record('GR-015 frozen after debounce: remaining stable', frozen1 === frozen2 ? 'PASS' : 'FAIL', 'two samples equal', { frozen1, frozen2 });

  const sock2 = connectSocket(BASE, { auth: { token: active2.token }, transports: ['websocket'] });
  const reg2 = waitFor(sock2, 'user:registered');
  sock2.emit('user:register', { userId: active2.userId });
  await reg2;
  const join2 = waitFor(sock2, 'match:joined');
  sock2.emit('match:join', { matchId: m2.matchId });
  await join2;
  await sleep(1500);
  const resumed = activeEntry(await snapshot(a, m2.matchId)).decisionTimeRemainingMs;
  record('GR-015 reconnect resumes same clock', resumed !== null && frozen2 !== null && resumed < frozen2 ? 'PASS' : 'FAIL', 'remaining decreased after resume', { frozen2, resumed });
  sock2.disconnect();

  console.log('battery complete →', RESULTS);
}

void main().catch((e) => { console.error(e); process.exit(1); });
