/**
 * Transparent simulation strategy agents (docs/15_SIMULATION_VALIDATION_PLAN.md §2).
 *
 * The initial set implements four of the ten listed agents: Random Legal
 * (#9, baseline/noob), Extreme Anchor (#1), Moderate Anchor (#2), and Fast
 * Closer (#3). The remaining agents (Hardball, Micro/Chunk Conceder,
 * Reciprocal, Deadline Player, Search/Best-Response) are later validation
 * work — OQ-008 concerns AI opponents, not the simulator.
 *
 * Strategies never see the opponent's RV (SI-001) and never see state the
 * engine does not legally expose. Everything they propose passes normal
 * domain validation.
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import { concessionCostChips, concessionMagnitude, type MatchState, type MatchView } from '@bounty-bay/domain';
import type { Rng } from './rng';
import type { Strategy, StrategyDecision } from './simulator';

const CHAT_LINES = ['I can move, but not much.', "That's ambitious.", 'Let’s meet in the middle.', 'Your move.', 'Hmm, interesting.'];

export interface OfferPlanner {
  /** Proposed offer amount in tenths, or null when the planner has no legal idea. */
  nextOffer(view: MatchView, state: MatchState, rng: Rng): number | null;
  /** Accept when the opponent's standing offer is at least this good, as a fraction of own RV. */
  acceptThreshold: number;
  /** Probability of walking away on a given turn. */
  walkProbability: number;
  /** Thinking-time model: [minMs, maxMs]. */
  thinkRange: [number, number];
}

/**
 * Builds a strategy from a planner. The strategy is a pure function of the
 * legal view plus injected randomness; the simulator supplies both.
 *
 * Concession affordability (GR-017) is checked before committing, so a
 * planner that proposes an unaffordable jump falls back to accept/walk
 * instead of producing an illegal command.
 */
export function strategyFromPlanner(name: string, planner: OfferPlanner, config: EconomyConfig = makeEconomyConfig()): Strategy {
  return {
    name,
    decide(view: MatchView, rng: Rng, state: MatchState): StrategyDecision {
      const now = view.turnStartedAt ?? view.startedAt ?? 0;
      const [minMs, maxMs] = planner.thinkRange;
      const thinkMs = minMs + rng() * (maxMs - minMs);

      if (!view.myTurn) {
        if (rng() < 0.05) {
          return {
            command: {
              kind: 'MESSAGE',
              playerId: view.myPlayerId,
              messageId: `sim-msg-${Math.floor(rng() * 1e9)}`,
              body: CHAT_LINES[Math.floor(rng() * CHAT_LINES.length)]!,
              now,
            },
            thinkMs: 0,
          };
        }
        return { command: null, thinkMs: 0 };
      }

      const rv = view.myReservationValueTenths ?? 0;
      const opponent = view.participants.find((p) => p.playerId !== view.myPlayerId);
      const opponentOffer = opponent?.latestOfferTenths ?? null;
      const standingOfferId = opponent?.standingOfferId ?? null;

      // Accept when the opponent's standing offer crosses the planner's threshold.
      if (opponentOffer !== null && standingOfferId !== null) {
        const goodEnough =
          view.myRole === 'BUYER' ? opponentOffer <= rv * planner.acceptThreshold : opponentOffer >= rv * planner.acceptThreshold;
        if (goodEnough && rng() < 0.9) {
          return { command: { kind: 'ACCEPT', playerId: view.myPlayerId, offerId: standingOfferId, now }, thinkMs };
        }
      }

      if (rng() < planner.walkProbability) {
        return { command: { kind: 'WALK_AWAY', playerId: view.myPlayerId, now }, thinkMs };
      }

      let amount = planner.nextOffer(view, state, rng);

      // Affordability guard: never propose a concession the budget cannot pay.
      const myPrevious = view.participants.find((p) => p.playerId === view.myPlayerId)?.latestOfferTenths ?? null;
      if (amount !== null && myPrevious !== null) {
        const cost = concessionCostChips(concessionMagnitude(myPrevious, amount), config);
        const remaining = view.participants.find((p) => p.playerId === view.myPlayerId)?.remainingChips ?? 0;
        if (cost > remaining) amount = null;
      }

      if (amount === null) {
        // No legal concession available: accept if possible, else walk.
        if (opponentOffer !== null && standingOfferId !== null) {
          return { command: { kind: 'ACCEPT', playerId: view.myPlayerId, offerId: standingOfferId, now }, thinkMs };
        }
        return { command: { kind: 'WALK_AWAY', playerId: view.myPlayerId, now }, thinkMs };
      }
      return {
        command: { kind: 'OFFER', playerId: view.myPlayerId, offerId: `sim-offer-${Math.floor(rng() * 1e15)}`, amountTenths: amount, now },
        thinkMs,
      };
    },
  };
}

/** The active strategy's own participant state. */
function me(state: MatchState, view: MatchView) {
  return state.participants.find((p) => p.playerId === view.myPlayerId)!;
}

function randomOpening(rv: number, role: 'BUYER' | 'SELLER', rng: Rng): number {
  return role === 'BUYER' ? 1 + Math.floor(rng() * rv) : rv + Math.floor(rng() * (9_999_999_999 - rv));
}

/** A legal next concession: strictly toward the opponent, within own RV. */
function concession(view: MatchView, state: MatchState, fractionOfGap: number, rng: Rng): number | null {
  const participant = me(state, view);
  const rv = participant.reservationValueTenths;
  const previous = participant.latestOfferTenths;
  if (previous === null) return randomOpening(rv, participant.role, rng);

  if (participant.role === 'BUYER') {
    if (previous >= rv) return null; // already at the wall
    const gap = rv - previous;
    const step = Math.max(1, Math.floor(gap * fractionOfGap * rng()));
    return Math.min(rv, previous + step);
  }
  if (previous <= rv) return null; // already at the wall
  const gap = previous - rv;
  const step = Math.max(1, Math.floor(gap * fractionOfGap * rng()));
  return Math.max(rv, previous - step);
}

function openingBuyer(rv: number, fraction: number, rng: Rng): number {
  return Math.max(1, Math.floor(rv * fraction * (0.9 + 0.2 * rng())));
}

function openingSeller(rv: number, fraction: number, rng: Rng): number {
  return Math.min(9_999_999_999, Math.ceil(rv * fraction * (0.9 + 0.2 * rng())));
}

// ---------------------------------------------------------------------------
// #9 Random Legal — baseline/noob
// ---------------------------------------------------------------------------

export function randomLegalStrategy(config?: EconomyConfig): Strategy {
  return strategyFromPlanner('random-legal', {
    acceptThreshold: 1.25,
    walkProbability: 0.02,
    thinkRange: [100, 3000],
    nextOffer(view, state, rng) {
      const participant = me(state, view);
      if (participant.latestOfferTenths === null) return randomOpening(participant.reservationValueTenths, participant.role, rng);
      return concession(view, state, 0.25, rng);
    },
  }, config);
}

// ---------------------------------------------------------------------------
// #1 Extreme Anchor — opens far from RV; reluctant movement
// ---------------------------------------------------------------------------

export function extremeAnchorStrategy(config?: EconomyConfig): Strategy {
  return strategyFromPlanner('extreme-anchor', {
    acceptThreshold: 1.45,
    walkProbability: 0.15,
    thinkRange: [200, 3000],
    nextOffer(view, state, rng) {
      const participant = me(state, view);
      if (participant.latestOfferTenths === null) {
        const rv = participant.reservationValueTenths;
        return participant.role === 'BUYER' ? openingBuyer(rv, 0.02, rng) : openingSeller(rv, 5000, rng);
      }
      return concession(view, state, 0.03, rng);
    },
  }, config);
}

// ---------------------------------------------------------------------------
// #2 Moderate Anchor — aggressive but plausible relative to own RV
// ---------------------------------------------------------------------------

export function moderateAnchorStrategy(config?: EconomyConfig): Strategy {
  return strategyFromPlanner('moderate-anchor', {
    acceptThreshold: 1.35,
    walkProbability: 0.05,
    thinkRange: [400, 4000],
    nextOffer(view, state, rng) {
      const participant = me(state, view);
      if (participant.latestOfferTenths === null) {
        const rv = participant.reservationValueTenths;
        return participant.role === 'BUYER' ? openingBuyer(rv, 0.55, rng) : openingSeller(rv, 1.8, rng);
      }
      return concession(view, state, 0.1, rng);
    },
  }, config);
}

// ---------------------------------------------------------------------------
// #3 Fast Closer — prioritizes agreement and fast decisions
// ---------------------------------------------------------------------------

export function fastCloserStrategy(config?: EconomyConfig): Strategy {
  return strategyFromPlanner('fast-closer', {
    acceptThreshold: 1.15,
    walkProbability: 0,
    thinkRange: [100, 800],
    nextOffer(view, state, rng) {
      const participant = me(state, view);
      if (participant.latestOfferTenths === null) {
        const rv = participant.reservationValueTenths;
        return participant.role === 'BUYER' ? openingBuyer(rv, 0.85, rng) : openingSeller(rv, 1.15, rng);
      }
      return concession(view, state, 0.35, rng);
    },
  }, config);
}

export const STRATEGY_FACTORIES = {
  'random-legal': randomLegalStrategy,
  'extreme-anchor': extremeAnchorStrategy,
  'moderate-anchor': moderateAnchorStrategy,
  'fast-closer': fastCloserStrategy,
} as const;

export type StrategyName = keyof typeof STRATEGY_FACTORIES;
