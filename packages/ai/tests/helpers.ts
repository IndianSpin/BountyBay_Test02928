/**
 * Headless duel driver for persona tests: two personas negotiate through
 * the exact same domain path as humans (applyCommand), driven by
 * role-scoped views. Used by the legality, signature, and hidden-info
 * suites. One illegal intent would throw inside `commit` — so a green
 * suite means the personas never emitted an illegal move.
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import {
  applyCommand,
  concessionMagnitude,
  createMatch,
  replayMatch,
  viewMatchFor,
  type CreateMatchInput,
  type DomainCommand,
  type DomainEvent,
  type DomainResult,
  type MatchState,
  type PlayerId,
} from '@bounty-bay/domain';
import { expect } from 'vitest';
import { resolveAgent } from '../src/registry';
import { matchSeed, mulberry32 } from '../src/rng';
import type { OpponentAgent, PersonaKey } from '../src/types';

export const BUYER_ID = 'duel-buyer';
export const SELLER_ID = 'duel-seller';

export const START_NOW = 1_000_000;

/** Buyer RV 100.0, seller RV 40.0 — ZOPA 60.0 (docs/03 Example A scenario). */
export function makeDuelInput(seed: number, matchIdSuffix = ''): CreateMatchInput {
  return {
    matchId: `ai-duel-${seed}${matchIdSuffix}`,
    mode: 'AI',
    scenarioId: 'scenario-0001',
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.1.0',
    ratingVersion: null,
    buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: [] },
    seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 400, verifiableFactIds: [] },
    firstPlayerId: BUYER_ID,
    createdAt: START_NOW,
  };
}

export function mustOk(result: DomainResult): Extract<DomainResult, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got ${result.code}: ${result.message}`);
  return result as Extract<DomainResult, { ok: true }>;
}

export interface DuelResult {
  outcome: 'DEAL' | 'NO_DEAL' | 'UNFINISHED';
  turns: number;
  events: DomainEvent[];
  magnitudes: Record<PlayerId, number[]>;
  openings: Record<PlayerId, number | null>;
  state: MatchState;
}

/**
 * Drives one complete persona-vs-persona match. `personaA` plays the buyer,
 * `personaB` the seller. Every intent flows through applyCommand; the
 * replay engine must reproduce the exact final state and event stream.
 */
export function driveDuel(
  personaA: PersonaKey,
  personaB: PersonaKey,
  seed: number,
  opts: { maxTurns?: number; config?: EconomyConfig } = {},
): DuelResult {
  const config = opts.config ?? makeEconomyConfig();
  const input = makeDuelInput(seed);

  let state = mustOk(createMatch(input, config)).state;
  const events: DomainEvent[] = [];
  const commit = (command: DomainCommand): void => {
    const result = mustOk(applyCommand(state, command, config));
    state = result.state;
    events.push(...result.events);
  };

  commit({ kind: 'READY', playerId: BUYER_ID, now: START_NOW });
  commit({ kind: 'READY', playerId: SELLER_ID, now: START_NOW });

  const agents: Record<PlayerId, OpponentAgent> = {
    [BUYER_ID]: resolveAgent(personaA, config),
    [SELLER_ID]: resolveAgent(personaB, config),
  };
  const rngs: Record<PlayerId, () => number> = {
    [BUYER_ID]: mulberry32(matchSeed(state.matchId, personaA)),
    [SELLER_ID]: mulberry32(matchSeed(state.matchId, personaB)),
  };

  const magnitudes: Record<PlayerId, number[]> = { [BUYER_ID]: [], [SELLER_ID]: [] };
  const openings: Record<PlayerId, number | null> = { [BUYER_ID]: null, [SELLER_ID]: null };

  const maxTurns = opts.maxTurns ?? 500;
  let turns = 0;
  let now = START_NOW + 1000;

  while (state.status === 'ACTIVE' && turns < maxTurns) {
    turns += 1;
    now += 1000;
    const active = state.activePlayerId!;
    const agent = agents[active]!;
    const rng = rngs[active]!;

    let decision = agent.decide({ view: viewMatchFor(state, active, now, config), now, rng, chatAllowed: true });
    if (Array.isArray(decision)) {
      for (const message of decision) {
        commit({ kind: 'MESSAGE', playerId: active, messageId: message.messageId, body: message.body, now });
      }
      decision = agent.decide({ view: viewMatchFor(state, active, now, config), now, rng, chatAllowed: false });
      if (Array.isArray(decision)) throw new Error(`${agent.personaKey} returned chat twice in one turn`);
    }

    if (decision.kind === 'OFFER') {
      const me = state.participants.find((p) => p.playerId === active)!;
      if (me.latestOfferTenths === null) openings[active] = decision.amountTenths;
      else magnitudes[active]!.push(concessionMagnitude(me.latestOfferTenths, decision.amountTenths));
      commit({ kind: 'OFFER', playerId: active, offerId: decision.offerId, amountTenths: decision.amountTenths, now });
    } else if (decision.kind === 'ACCEPT') {
      commit({ kind: 'ACCEPT', playerId: active, offerId: decision.offerId, now });
    } else {
      commit({ kind: 'WALK_AWAY', playerId: active, now });
    }
  }

  const outcome = state.status === 'DEAL' ? 'DEAL' : state.status === 'NO_DEAL' ? 'NO_DEAL' : 'UNFINISHED';

  // replay must reproduce the exact final state and event stream (PRD-009)
  const replayed = replayMatch(input, config, events);
  expect(replayed.state).toEqual(state);
  expect(replayed.replayedEvents).toEqual(events);

  return { outcome, turns, events, magnitudes, openings, state };
}
