/**
 * DD Phase 1 — hard personal decision-time budget and timeout
 * (GR-023/GR-024, DEC-027).
 *
 * Covering: the pre-dispatch guard (gameplay commands rejected once the
 * active player's budget is exhausted), the server-only TIMEOUT command
 * (due-validation, terminal transition, zero bounty, distinct from
 * walk-away), exemptions, the PAUSED freeze, and legacy no-limit configs.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch, replayMatch, viewMatchFor } from '../src';
import type { DomainCommand, DomainEvent, MatchState } from '../src/types';
import { BUYER_ID, SELLER_ID, START_NOW, apply, create, makeInput, offerId, startedMatch } from './helpers';

const LIMIT = 90_000;
const config = makeEconomyConfig({
  hardDecisionTimeLimitMs: LIMIT,
  timeoutPolicy: 'ATTRIBUTED_NO_DEAL',
  timeWarningLowMs: 30_000,
  timeWarningCriticalMs: 10_000,
});

/** Readies both players; buyer is first mover with the clock running from START_NOW. */
function active(): MatchState {
  return startedMatch({}, config).state;
}

function timeoutCmd(playerId: string, at: number): DomainCommand {
  return { kind: 'TIMEOUT', playerId, now: at };
}

describe('GR-023 — guard: gameplay commands past the budget are rejected without mutation', () => {
  it('valid: gameplay commands before the deadline behave as before', () => {
    let state = active();
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 10_000 }, config);
    expect(state.participants.find((p) => p.playerId === BUYER_ID)!.latestOfferTenths).toBe(500);
  });

  it('boundary: OFFER at exactly the limit is TIMED_OUT; one ms earlier is legal', () => {
    let state = active();
    const before = structuredClone(state);
    const atLimit = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + LIMIT }, config);
    expect(atLimit.ok).toBe(false);
    if (!atLimit.ok) expect(atLimit.code).toBe('TIMED_OUT');
    expect(state).toEqual(before); // failed commands never mutate

    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + LIMIT - 1 }, config);
    expect(state.participants.find((p) => p.playerId === BUYER_ID)!.latestOfferTenths).toBe(500);
  });

  it('boundary: ACCEPT and WALK_AWAY are also rejected past the budget', () => {
    const state = active();
    const accept = applyCommand(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(99), now: START_NOW + LIMIT }, config);
    expect(accept.ok).toBe(false);
    if (!accept.ok) expect(accept.code).toBe('TIMED_OUT');
    const walk = applyCommand(state, { kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + LIMIT }, config);
    expect(walk.ok).toBe(false);
    if (!walk.ok) expect(walk.code).toBe('TIMED_OUT');
    expect(state.status).toBe('ACTIVE'); // nothing committed
  });

  it('exempt: MESSAGE and DISCONNECT are legal past the budget (no gameplay effect)', () => {
    let state = active();
    state = apply(state, { kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'm1', body: 'still here', now: START_NOW + LIMIT + 5_000 }, config);
    state = apply(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW + LIMIT + 5_000 }, config);
    expect(state.status).toBe('PAUSED'); // disconnect froze the over-limit clock; timeout needs ACTIVE
  });

  it('invariant: guard is inert when the config has no limit (legacy snapshots)', () => {
    const legacy = makeEconomyConfig({ hardDecisionTimeLimitMs: undefined, timeoutPolicy: undefined });
    let state = startedMatch({}, legacy).state;
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 200_000 }, legacy);
    expect(state.status).toBe('ACTIVE');
    expect(state.participants.find((p) => p.playerId === BUYER_ID)!.latestOfferTenths).toBe(500);
  });
});

describe('GR-024 — TIMEOUT transition', () => {
  it('valid: at exactly the limit the active player times out — NO_DEAL, distinct from walk-away', () => {
    let state = active();
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 5_000 }, config);
    // Seller is now active from START_NOW + 5_000; at +95_000 their elapsed is exactly LIMIT.
    const result = applyCommand(state, timeoutCmd(SELLER_ID, START_NOW + 5_000 + LIMIT), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.status).toBe('NO_DEAL');
    expect(result.state.completionReason).toBe('TIMED_OUT');
    expect(result.state.activePlayerId).toBeNull();
    expect(result.state.turnStartedAt).toBeNull();
    expect(result.events.map((e) => e.type)).toEqual(['TIMED_OUT', 'MATCH_COMPLETED']);
    expect(result.events[0]!.actorPlayerId).toBe(SELLER_ID);
    expect(result.events[0]!.payload.timedOutPlayerId).toBe(SELLER_ID);
    expect(result.events[1]!.payload.reason).toBe('TIMED_OUT');

    // Zero bounty both sides; multipliers remain within [floor, 1]; chips preserved.
    const economy = result.state.economy!;
    expect(economy.settlementTenths).toBeNull();
    for (const p of Object.values(economy.players)) {
      expect(p.grossReward).toBe(0);
      expect(p.clockMultiplier).toBeGreaterThanOrEqual(0.3 - 1e-12);
      expect(p.clockMultiplier).toBeLessThanOrEqual(1 + 1e-12);
    }
    expect(result.state.participants.find((p) => p.playerId === BUYER_ID)!.chipsSpent).toBe(0);
  });

  it('valid: a late fire (past the limit) is still legal', () => {
    let state = active();
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 5_000 }, config);
    const result = applyCommand(state, timeoutCmd(SELLER_ID, START_NOW + 5_000 + LIMIT + 30_000), config);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.completionReason).toBe('TIMED_OUT');
  });

  it('invalid: TIMEOUT requires ACTIVE', () => {
    const created = create({}, config);
    const onCreated = applyCommand(created, timeoutCmd(BUYER_ID, START_NOW), config);
    expect(onCreated.ok).toBe(false);
    if (!onCreated.ok) expect(onCreated.code).toBe('MATCH_NOT_ACTIVE');
  });

  it('invalid: only the active player can time out', () => {
    const state = active();
    const result = applyCommand(state, timeoutCmd(SELLER_ID, START_NOW + LIMIT), config);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_YOUR_TURN');
  });

  it('invalid: not yet due → TIMEOUT_NOT_DUE', () => {
    const state = active();
    const result = applyCommand(state, timeoutCmd(BUYER_ID, START_NOW + LIMIT - 1), config);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TIMEOUT_NOT_DUE');
  });

  it('invalid: no limit configured → TIMEOUT_NOT_DUE (legacy configs never time out)', () => {
    const legacy = makeEconomyConfig({ hardDecisionTimeLimitMs: undefined, timeoutPolicy: undefined });
    const state = startedMatch({}, legacy).state;
    const result = applyCommand(state, timeoutCmd(BUYER_ID, START_NOW + LIMIT + 1_000), legacy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TIMEOUT_NOT_DUE');
  });

  it('invariant: never fires while PAUSED; reconnect resumes the budget and then times out', () => {
    let state = active();
    // Buyer thinks 89 s, then disconnects: clock frozen just under the limit.
    state = apply(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW + LIMIT - 1_000 }, config);
    expect(state.status).toBe('PAUSED');
    const paused = applyCommand(state, timeoutCmd(BUYER_ID, START_NOW + LIMIT), config);
    expect(paused.ok).toBe(false);
    if (!paused.ok) expect(paused.code).toBe('MATCH_NOT_ACTIVE');

    // Reconnect resumes the same player's clock with the remaining budget.
    state = apply(state, { kind: 'RECONNECT', playerId: BUYER_ID, now: START_NOW + LIMIT }, config);
    expect(state.status).toBe('ACTIVE');
    const result = applyCommand(state, timeoutCmd(BUYER_ID, START_NOW + LIMIT + 1_000), config);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.completionReason).toBe('TIMED_OUT');
  });

  it('projection: the terminal view reveals RVs and shows the timeout reason (GR-018)', () => {
    let state = active();
    const result = applyCommand(state, timeoutCmd(BUYER_ID, START_NOW + LIMIT), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = result.state;
    const view = viewMatchFor(state, SELLER_ID, START_NOW + LIMIT, config);
    expect(view.completionReason).toBe('TIMED_OUT');
    expect(view.participants.find((p) => p.playerId === BUYER_ID)!.reservationValueTenths).toBe(1000);
  });
});

describe('GR-023 × GR-024 — replay determinism', () => {
  it('a TIMED_OUT event stream replays through the TIMEOUT command to the same state', () => {
    const { input, state, events } = playTimeoutMatch();
    const replayed = replayMatch(input, config, events);
    expect(replayed.state.status).toBe('NO_DEAL');
    expect(replayed.state.completionReason).toBe('TIMED_OUT');
    expect(replayed.state.economy).toEqual(state.economy);
    expect(replayed.replayedEvents).toEqual(events);
  });
});

/** Plays a full timeout match through the live command path. */
function playTimeoutMatch(): { input: ReturnType<typeof makeInput>; state: MatchState; events: DomainEvent[] } {
  const input = makeInput({ matchId: 'replay-timeout-match' });
  const created = createMatch(input, config);
  if (!created.ok) throw new Error('create failed');
  let state = created.state;
  const events: DomainEvent[] = [];

  const run = (command: DomainCommand): void => {
    const r = applyCommand(state, command, config);
    if (!r.ok) throw new Error(`command failed: ${r.code}`);
    state = r.state;
    events.push(...r.events);
  };

  run({ kind: 'READY', playerId: BUYER_ID, now: START_NOW });
  run({ kind: 'READY', playerId: SELLER_ID, now: START_NOW });
  run({ kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 5_000 });
  run(timeoutCmd(SELLER_ID, START_NOW + 5_000 + LIMIT));

  return { input, state, events };
}
