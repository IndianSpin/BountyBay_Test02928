/**
 * Scripted-match driver for intelligence tests: builds a match by running
 * a script of domain commands (all must succeed), collects the exact event
 * stream the command service would persist, and verifies replay
 * reproduction before handing the result to the feature/observation
 * engines.
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import {
  applyCommand,
  createMatch,
  replayMatch,
  type CreateMatchInput,
  type DomainCommand,
  type DomainEvent,
  type DomainResult,
  type MatchState,
} from '@bounty-bay/domain';
import { expect } from 'vitest';

export const BUYER_ID = 'buyer-0001';
export const SELLER_ID = 'seller-0001';
export const START_NOW = 1_000_000;

let matchCounter = 0;

export function makeInput(overrides: Partial<CreateMatchInput> = {}): CreateMatchInput {
  matchCounter += 1;
  return {
    matchId: `intel-${String(matchCounter).padStart(4, '0')}`,
    mode: 'RANKED_LIVE',
    scenarioId: 'scenario-0001',
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.2.0',
    ratingVersion: 'rating-0.1.0',
    buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: [] },
    seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 400, verifiableFactIds: [] },
    firstPlayerId: BUYER_ID,
    createdAt: START_NOW,
    ...overrides,
  };
}

export function mustOk(result: DomainResult): Extract<DomainResult, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got ${result.code}: ${result.message}`);
  return result as Extract<DomainResult, { ok: true }>;
}

export interface ScriptedMatch {
  state: MatchState;
  events: DomainEvent[];
  config: EconomyConfig;
  input: CreateMatchInput;
}

export interface ScriptApi {
  offer: (n: number) => string;
}

/** Convenience: READY both at the given time. */
export function readyBoth(commit: (c: DomainCommand) => void, at = START_NOW): void {
  commit({ kind: 'READY', playerId: BUYER_ID, now: at });
  commit({ kind: 'READY', playerId: SELLER_ID, now: at });
}

/**
 * Runs a script of commands; every command must succeed. Verifies the
 * event stream replays to the exact final state before returning.
 */
export function play(
  script: (commit: (c: DomainCommand) => void, api: ScriptApi) => void,
  overrides: Partial<CreateMatchInput> = {},
  config: EconomyConfig = makeEconomyConfig({ hardDecisionTimeLimitMs: 90_000 }), // pinned 90s limit — the product default moved (DEC-031 #3)
): ScriptedMatch {
  const input = makeInput(overrides);
  let state = mustOk(createMatch(input, config)).state;
  const events: DomainEvent[] = [];
  let counter = 0;
  const commit = (command: DomainCommand) => {
    const result = mustOk(applyCommand(state, command, config));
    state = result.state;
    events.push(...result.events);
  };
  script(commit, { offer: () => `offer-${String(++counter).padStart(4, '0')}` });
  const replayed = replayMatch(input, config, events);
  expect(replayed.state).toEqual(state);
  expect(replayed.replayedEvents).toEqual(events);
  return { state, events, config, input };
}
