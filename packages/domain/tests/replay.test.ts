/**
 * Replay tests (PRD-009): a full match, stored as events, reproduces the
 * exact final state — and re-emits the exact stored event stream.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch, replayMatch } from '../src';
import type { DomainEvent, MatchState } from '../src/types';
import { BUYER_ID, SELLER_ID, START_NOW, makeInput, mustOk, offerId } from './helpers';

const config = makeEconomyConfig();

/** Plays one full match through the live command path, returning input, final state, and events. */
function playFullMatch(): { input: ReturnType<typeof makeInput>; state: MatchState; events: DomainEvent[] } {
  const input = makeInput({ matchId: 'replay-match' });
  const created = mustOk(createMatch(input, config));
  let state = created.state;
  const events: DomainEvent[] = [];

  const run = (command: Parameters<typeof applyCommand>[1]): void => {
    const r = mustOk(applyCommand(state, command, config));
    state = r.state;
    events.push(...r.events);
  };

  run({ kind: 'READY', playerId: BUYER_ID, now: START_NOW });
  run({ kind: 'READY', playerId: SELLER_ID, now: START_NOW });
  run({ kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 10_000 });
  run({ kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 800, now: START_NOW + 30_000 });
  run({ kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW + 35_000 });
  run({ kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 600, now: START_NOW + 40_000 });
  run({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(4), now: START_NOW + 45_000 });

  return { input, state, events };
}

describe('replayMatch', () => {
  it('reproduces the exact final state and economy from stored events + config', () => {
    const { input, state, events } = playFullMatch();
    const replayed = replayMatch(input, config, events);

    expect(replayed.state.status).toBe('DEAL');
    expect(replayed.state.settlementTenths).toBe(state.settlementTenths);
    expect(replayed.state.economy).toEqual(state.economy);
    expect(replayed.state.eventSequence).toBe(events[events.length - 1]!.sequence);
  });

  it('re-emits the exact stored event stream', () => {
    const { input, events } = playFullMatch();
    expect(replayMatch(input, config, events).replayedEvents).toEqual(events);
  });

  it('throws on a corrupted stream (tampered amount)', () => {
    const { input, events } = playFullMatch();
    const tampered = [...events];
    const offerIndex = tampered.findIndex((e) => e.type === 'OFFER_SUBMITTED');
    tampered[offerIndex] = { ...tampered[offerIndex]!, payload: { ...tampered[offerIndex]!.payload, amountTenths: 9999 } };
    expect(() => replayMatch(input, config, tampered)).toThrow();
  });

  it('replays a partial (pre-terminal) stream without error', () => {
    const { input, events } = playFullMatch();
    const partial = events.filter((e) => e.type !== 'OFFER_ACCEPTED' && e.type !== 'MATCH_COMPLETED');
    const replayed = replayMatch(input, config, partial);
    expect(replayed.state.status).toBe('ACTIVE');
  });
});
