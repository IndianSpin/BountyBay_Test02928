/**
 * Shared test helpers for domain tests (kept local: the @bounty-bay/testing
 * package depends on the domain, so domain tests must not depend on it).
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import { applyCommand, createMatch } from '../src/match';
import type { CreateMatchInput, DomainCommand, DomainResult, MatchState, PlayerId } from '../src/types';

export const BUYER_ID = 'buyer-0001';
export const SELLER_ID = 'seller-0001';

export const START_NOW = 1_000_000;

let matchCounter = 0;

/** Buyer RV 100.0, seller RV 40.0 => ZOPA 60.0 (docs/03 Example A scenario). */
export function makeInput(overrides: Partial<CreateMatchInput> = {}): CreateMatchInput {
  matchCounter += 1;
  return {
    matchId: `match-${String(matchCounter).padStart(4, '0')}`,
    mode: 'RANKED_LIVE',
    scenarioId: 'scenario-0001',
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.2.0',
    ratingVersion: 'rating-0.1.0',
    buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000 },
    seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 400 },
    firstPlayerId: BUYER_ID,
    createdAt: START_NOW,
    ...overrides,
  };
}

export function mustOk(result: DomainResult) {
  if (!result.ok) throw new Error(`expected ok, got ${result.code}: ${result.message}`);
  return result;
}

export function mustFail(result: DomainResult): { code: string; message: string } {
  if (result.ok) throw new Error('expected failure, got ok');
  return result;
}

export function create(stateInput: Partial<CreateMatchInput> = {}, config?: EconomyConfig): MatchState {
  const result = createMatch(makeInput(stateInput), config ?? makeEconomyConfig());
  return mustOk(result).state;
}

export function apply(state: MatchState, command: DomainCommand, config: EconomyConfig): MatchState {
  return mustOk(applyCommand(state, command, config)).state;
}

/** Creates a match and readies both players; returns ACTIVE state at `now`. */
export function startedMatch(
  inputOverrides: Partial<CreateMatchInput> = {},
  config: EconomyConfig = makeEconomyConfig(),
  now: number = START_NOW,
): { state: MatchState; config: EconomyConfig } {
  let state = create(inputOverrides, config);
  state = apply(state, { kind: 'READY', playerId: BUYER_ID, now }, config);
  state = apply(state, { kind: 'READY', playerId: SELLER_ID, now }, config);
  return { state, config };
}

export function buyerOf(state: MatchState) {
  return state.participants.find((p) => p.role === 'BUYER')!;
}

export function sellerOf(state: MatchState) {
  return state.participants.find((p) => p.role === 'SELLER')!;
}

export function byId(state: MatchState, playerId: PlayerId) {
  return state.participants.find((p) => p.playerId === playerId)!;
}

/** Deterministic 32-bit RNG (mulberry32) — for property tests only. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function offerId(n: number): string {
  return `offer-${String(n).padStart(4, '0')}`;
}
