/**
 * Fixture factories for tests across packages.
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import {
  applyCommand,
  createMatch,
  type CreateMatchInput,
  type MatchState,
  type ParticipantInput,
  type PlayerId,
} from '@bounty-bay/domain';

export const BUYER_ID = 'buyer-0001';
export const SELLER_ID = 'seller-0001';

export interface ScenarioSeed {
  buyerRvTenths: number;
  sellerRvTenths: number;
  firstPlayerId: PlayerId;
}

/** Buyer RV 100.0 / seller RV 40.0 => ZOPA 60.0 (docs/03 Example A). */
export function defaultScenarioSeed(): ScenarioSeed {
  return { buyerRvTenths: 1000, sellerRvTenths: 400, firstPlayerId: BUYER_ID };
}

export function makeParticipantInput(playerId: PlayerId, role: 'BUYER' | 'SELLER', rvTenths: number): ParticipantInput {
  return { playerId, role, reservationValueTenths: rvTenths };
}

let matchCounter = 0;

export function makeMatchInput(
  overrides: Partial<CreateMatchInput> = {},
  seed: ScenarioSeed = defaultScenarioSeed(),
): CreateMatchInput {
  matchCounter += 1;
  return {
    matchId: `match-${String(matchCounter).padStart(4, '0')}`,
    mode: 'RANKED_LIVE',
    scenarioId: 'scenario-0001',
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.1.0',
    ratingVersion: 'rating-0.1.0',
    buyer: makeParticipantInput(BUYER_ID, 'BUYER', seed.buyerRvTenths),
    seller: makeParticipantInput(SELLER_ID, 'SELLER', seed.sellerRvTenths),
    firstPlayerId: seed.firstPlayerId,
    createdAt: 1_000_000,
    ...overrides,
  };
}

export function makeMatch(
  overrides: Partial<CreateMatchInput> = {},
  config: EconomyConfig = makeEconomyConfig(),
  seed: ScenarioSeed = defaultScenarioSeed(),
): MatchState {
  const result = createMatch(makeMatchInput(overrides, seed), config);
  if (!result.ok) throw new Error(`fixture: createMatch failed (${result.code}: ${result.message})`);
  return result.state;
}

/** Creates and starts (both ready) a match in one call. */
export function makeStartedMatch(
  overrides: Partial<CreateMatchInput> = {},
  config: EconomyConfig = makeEconomyConfig(),
  seed: ScenarioSeed = defaultScenarioSeed(),
): MatchState {
  let state = makeMatch(overrides, config, seed);
  const now = state.createdAt;
  for (const playerId of [BUYER_ID, SELLER_ID]) {
    const r = applyCommand(state, { kind: 'READY', playerId, now }, config);
    if (!r.ok) throw new Error(`fixture: READY failed (${r.code}: ${r.message})`);
    state = r.state;
  }
  return state;
}
