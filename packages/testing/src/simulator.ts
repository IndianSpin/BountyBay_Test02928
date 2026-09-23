/**
 * Headless simulator (docs/15_SIMULATION_VALIDATION_PLAN.md §1).
 *
 * Runs full matches entirely in memory from the domain package. Inputs:
 * reservation values, first mover, balance-config version, two strategy
 * agents, a stochastic seed, and a thinking-time model. Outputs: the final
 * state/events plus per-player economy and strategy metadata.
 *
 * Everything a strategy does passes normal domain validation — the simulator
 * exercises the engine, it never bypasses it.
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import {
  applyCommand,
  createMatch,
  viewMatchFor,
  type DomainCommand,
  type DomainEvent,
  type MatchState,
  type MatchView,
  type PlayerId,
} from '@bounty-bay/domain';
import type { ScenarioSeed } from './factories';
import { makeMatchInput } from './factories';
import { mulberry32, type Rng } from './rng';

export interface StrategyDecision {
  command: DomainCommand | null;
  /** Simulated decision time in ms (the thinking-time model). */
  thinkMs: number;
}

/** A strategy sees only its own legal view (SI-001) plus its own RV. */
export interface Strategy {
  name: string;
  decide(view: MatchView, rng: Rng, state: MatchState): StrategyDecision;
}

export interface SimulatedMatch {
  state: MatchState;
  events: DomainEvent[];
  terminal: boolean;
  turns: number;
  strategyFailures: number;
  abortedByCap: boolean;
  buyerStrategy: string;
  sellerStrategy: string;
  seed: number;
}

export interface RunMatchOptions {
  seed: number;
  scenario: ScenarioSeed;
  buyer: Strategy;
  seller: Strategy;
  config?: EconomyConfig;
  /** Safety cap on offer/turn count before an administrative abort. */
  maxTurns?: number;
  /** Consecutive strategy failures tolerated before the turn is forced to walk away. */
  maxConsecutiveFailures?: number;
}

const DEFAULT_MAX_TURNS = 400;
const DEFAULT_MAX_FAILURES = 20;

export function runMatch(options: RunMatchOptions): SimulatedMatch {
  // DD Phase 1: simulation batches pin the config to no hard decision-time
  // limit — simulated turns jump by large time offsets that would trip the
  // 90 s test-default budget. Callers pass `config` to opt into timeouts.
  const config = options.config ?? makeEconomyConfig({ hardDecisionTimeLimitMs: undefined, timeoutPolicy: undefined });
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const maxFailures = options.maxConsecutiveFailures ?? DEFAULT_MAX_FAILURES;
  const rng = mulberry32(options.seed);

  const input = makeMatchInput({ matchId: `sim-${options.seed}` }, options.scenario);
  const created = createMatch(input, config);
  if (!created.ok) throw new Error(`simulator: createMatch failed (${created.code}: ${created.message})`);
  let state = created.state;

  const events: DomainEvent[] = [];
  const apply = (command: DomainCommand): boolean => {
    const result = applyCommand(state, command, config);
    if (!result.ok) return false;
    state = result.state;
    events.push(...result.events);
    return true;
  };

  let now = state.createdAt;
  const playerIds = state.participants.map((p) => p.playerId);
  const readyOrder = [options.scenario.firstPlayerId, ...playerIds.filter((id) => id !== options.scenario.firstPlayerId)];
  for (const playerId of readyOrder) {
    if (!apply({ kind: 'READY', playerId, now })) throw new Error('simulator: READY failed');
  }

  const strategyFor = (playerId: PlayerId): Strategy => (playerId === input.buyer.playerId ? options.buyer : options.seller);

  let turns = 0;
  let strategyFailures = 0;
  let consecutiveFailures = 0;
  let abortedByCap = false;

  while (state.status === 'ACTIVE' && turns < maxTurns) {
    const owner = state.activePlayerId!;
    const view = viewMatchFor(state, owner, now, config);
    const decision = strategyFor(owner).decide(view, rng, state);

    now += Math.max(0, Math.round(decision.thinkMs));
    turns += 1;

    if (decision.command === null) {
      consecutiveFailures += 1;
      strategyFailures += 1;
    } else if (!apply(decision.command)) {
      consecutiveFailures += 1;
      strategyFailures += 1;
    } else {
      consecutiveFailures = 0;
    }

    // A wedged strategy must not stall the match forever: force a legal exit.
    if (consecutiveFailures >= maxFailures) {
      apply({ kind: 'WALK_AWAY', playerId: state.activePlayerId!, now });
      consecutiveFailures = 0;
    }

    // The non-active player may chat (GR-013: no turn/clock effect).
    if (state.status === 'ACTIVE' && rng() < 0.08) {
      const talker = state.participants.find((p) => p.playerId !== state.activePlayerId)!;
      apply({ kind: 'MESSAGE', playerId: talker.playerId, messageId: `sim-msg-${turns}`, body: 'I can move, but not much.', now });
    }
  }

  if (state.status === 'ACTIVE') {
    apply({ kind: 'ABORT', now });
    abortedByCap = true;
  }

  return {
    state,
    events,
    terminal: state.status === 'DEAL' || state.status === 'NO_DEAL',
    turns,
    strategyFailures,
    abortedByCap,
    buyerStrategy: options.buyer.name,
    sellerStrategy: options.seller.name,
    seed: options.seed,
  };
}
