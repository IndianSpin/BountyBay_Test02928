import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { clockMultiplier, elapsedActiveMs } from '../src/clock';
import type { MatchState, ParticipantState } from '../src/types';
import { BUYER_ID, startedMatch } from './helpers';

const config = makeEconomyConfig(); // floor 0.30, T_floor 60s (economy-0.2.0), grace 0

describe('clockMultiplier — GE-008', () => {
  it('starts at 100%', () => {
    expect(clockMultiplier(0, config)).toBe(1);
  });

  it('is 65% halfway to the floor', () => {
    expect(clockMultiplier(config.clockFloorMs / 2, config)).toBeCloseTo(0.65, 12);
  });

  it('hits the settled 30% floor exactly at T_floor', () => {
    expect(clockMultiplier(config.clockFloorMs, config)).toBeCloseTo(0.3, 12);
  });

  it('never goes below the 30% floor', () => {
    expect(clockMultiplier(config.clockFloorMs + 1, config)).toBeCloseTo(0.3, 12);
    expect(clockMultiplier(1_000_000, config)).toBeCloseTo(0.3, 12);
  });

  it('is monotonically non-increasing (never recovers)', () => {
    let previous = clockMultiplier(0, config);
    for (let t = 100; t <= config.clockFloorMs + 10_000; t += 100) {
      const current = clockMultiplier(t, config);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it('respects a per-turn grace window', () => {
    const graceful = makeEconomyConfig({ turnGraceMs: 5_000 });
    expect(clockMultiplier(4_000, graceful)).toBe(1);
    expect(clockMultiplier(5_000, graceful)).toBe(1);
    expect(clockMultiplier(6_000, graceful)).toBeCloseTo(1 - 0.7 * (1_000 / config.clockFloorMs), 12);
  });

  it('respects a configurable floor (invariant holds for other floors)', () => {
    const custom = makeEconomyConfig({ clockFloorMultiplier: 0.5 });
    expect(clockMultiplier(config.clockFloorMs, custom)).toBeCloseTo(0.5, 12);
    expect(clockMultiplier(1e9, custom)).toBeCloseTo(0.5, 12);
  });
});

describe('elapsedActiveMs — GR-014 server-authoritative derivation', () => {
  function makeParticipant(): ParticipantState {
    const { state } = startedMatch();
    return state.participants.find((p) => p.playerId === BUYER_ID)!;
  }

  function actState(): MatchState {
    return startedMatch().state;
  }

  it('returns stored cumulative while the player is not the active owner', () => {
    const state = actState();
    const seller = state.participants.find((p) => p.playerId !== BUYER_ID)!;
    expect(elapsedActiveMs(seller, state, 1_010_000)).toBe(0);
  });

  it('adds the running segment for the active owner', () => {
    const state = actState();
    const buyer = makeParticipant();
    expect(elapsedActiveMs(buyer, state, 1_010_000)).toBe(10_000);
  });

  it('does not go backwards if a stale `now` is supplied', () => {
    const state = actState();
    const buyer = makeParticipant();
    expect(elapsedActiveMs(buyer, state, 999_999)).toBe(0);
  });

  it('returns cumulative when the clock is frozen (turnStartedAt null)', () => {
    const state = actState();
    const frozen: MatchState = structuredClone(state);
    frozen.turnStartedAt = null;
    frozen.participants[0]!.cumulativeActiveMs = 42_000;
    const buyer = frozen.participants[0]!;
    expect(elapsedActiveMs(buyer, frozen, 1_999_999)).toBe(42_000);
  });
});
