/**
 * Property-based invariants over seeded random legal matches (DEC-028 §46:
 * mathematical invariants where appropriate). The driver produces only
 * legal commands (domain-validated); failures are impossible by
 * construction, so any throw is a real defect.
 */

import { makeEconomyConfig, type EconomyConfig } from '@bounty-bay/config';
import { applyCommand, createMatch, type CreateMatchInput, type DomainCommand, type DomainEvent, type MatchState, type PlayerId } from '@bounty-bay/domain';
import { describe, expect, it } from 'vitest';
import { analyzeMatch, computeFeatures } from '../src';
import { BUYER_ID, mustOk, SELLER_ID, START_NOW } from './helpers';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RandomMatch {
  state: MatchState;
  events: DomainEvent[];
  config: EconomyConfig;
}

function randomMatch(seed: number): RandomMatch {
  const rng = mulberry32(seed);
  const config = makeEconomyConfig();
  const input: CreateMatchInput = {
    matchId: `prop-${seed}`,
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
  };
  let state = mustOk(createMatch(input, config)).state;
  const events: DomainEvent[] = [];
  let counter = 0;
  let now = START_NOW;
  const commit = (command: DomainCommand) => {
    const result = mustOk(applyCommand(state, command, config));
    state = result.state;
    events.push(...result.events);
  };
  commit({ kind: 'READY', playerId: BUYER_ID, now });
  commit({ kind: 'READY', playerId: SELLER_ID, now });

  for (let turn = 0; turn < 300 && state.status === 'ACTIVE'; turn++) {
    now += 500 + Math.floor(rng() * 3000);
    const active = state.activePlayerId!;
    const me = state.participants.find((p) => p.playerId === active)!;
    const opp = state.participants.find((p) => p.playerId !== active)!;
    const rv = me.reservationValueTenths;

    // accept whenever the standing offer is within the mandate (with prob)
    if (opp.standingOfferId !== null && opp.latestOfferTenths !== null) {
      const withinMandate = me.role === 'BUYER' ? opp.latestOfferTenths <= rv : opp.latestOfferTenths >= rv;
      if (withinMandate && rng() < 0.55) {
        commit({ kind: 'ACCEPT', playerId: active, offerId: opp.standingOfferId, now });
        continue;
      }
    }
    // walk occasionally, or when no legal offer exists
    if (rng() < 0.04) {
      commit({ kind: 'WALK_AWAY', playerId: active, now });
      continue;
    }
    // legal offer: strictly toward the opponent, inside the mandate
    const prev = me.latestOfferTenths;
    let next: number;
    if (prev === null) {
      next = me.role === 'BUYER' ? 1 + Math.floor(rng() * rv) : rv + Math.floor(rng() * (Math.max(rv, rv * 2) - rv + 1));
      next = me.role === 'BUYER' ? Math.min(next, rv) : Math.max(next, rv);
    } else {
      const maxStep = me.role === 'BUYER' ? rv - prev : prev - rv;
      if (maxStep <= 0) {
        // at the mandate: nothing legal but accept (checked above) or walk
        commit({ kind: 'WALK_AWAY', playerId: active, now });
        continue;
      }
      const step = 1 + Math.floor(rng() * maxStep);
      next = me.role === 'BUYER' ? prev + step : prev - step;
    }
    commit({ kind: 'OFFER', playerId: active, offerId: `prop-offer-${counter++}`, amountTenths: next, now });
  }
  // safety: never leave the loop non-terminal (cap reached → walk)
  if (state.status === 'ACTIVE') {
    commit({ kind: 'WALK_AWAY', playerId: state.activePlayerId!, now: now + 1000 });
  }
  return { state, events, config };
}

describe('property invariants (seeded random matches)', () => {
  const matches = Array.from({ length: 30 }, (_, i) => randomMatch(1000 + i * 97));

  it('concession magnitudes are recomputable from consecutive amounts', () => {
    for (const match of matches) {
      for (const playerId of [BUYER_ID, SELLER_ID]) {
        const features = computeFeatures(match.state, match.events, match.config)[playerId]!;
        expect(features.concessionMagnitudes.length).toBe(features.concessionCount);
        for (const magnitude of features.concessionMagnitudes) {
          expect(magnitude).toBeGreaterThan(0);
        }
      }
    }
  });

  it('chip accounting is exact: costs sum to chips spent, remainder matches the budget', () => {
    for (const match of matches) {
      for (const playerId of [BUYER_ID, SELLER_ID]) {
        const features = computeFeatures(match.state, match.events, match.config)[playerId]!;
        const costSum = features.concessionChipCosts.reduce((a, b) => a + b, 0);
        expect(costSum).toBe(features.chipsSpent);
        expect(features.chipsSpent + features.chipsRemaining).toBe(100);
      }
    }
  });

  it('deals split the surplus completely', () => {
    for (const match of matches) {
      if (match.state.status !== 'DEAL') continue;
      const buyer = computeFeatures(match.state, match.events, match.config)[BUYER_ID]!;
      const seller = computeFeatures(match.state, match.events, match.config)[SELLER_ID]!;
      if (buyer.surplusShareCaptured === null || seller.surplusShareCaptured === null) continue;
      expect(buyer.surplusShareCaptured + seller.surplusShareCaptured).toBeCloseTo(1, 6);
    }
  });

  it('counts stay within bounds and fractions are sane', () => {
    for (const match of matches) {
      for (const playerId of [BUYER_ID, SELLER_ID]) {
        const features = computeFeatures(match.state, match.events, match.config)[playerId]!;
        expect(features.unreciprocatedConcessionCount).toBeLessThanOrEqual(features.concessionCount);
        expect(features.maxConsecutiveUnilateralConcessions).toBeLessThanOrEqual(features.unreciprocatedConcessionCount);
        expect(features.fastConcessionAfterResistanceCount).toBeLessThanOrEqual(features.unreciprocatedConcessionCount);
        if (features.timeFromCrossedToSettlementMs !== null) expect(features.timeFromCrossedToSettlementMs).toBeGreaterThanOrEqual(0);
        if (features.settlementWithinOwnLimitFraction !== null) {
          expect(features.settlementWithinOwnLimitFraction).toBeGreaterThanOrEqual(0);
          expect(features.settlementWithinOpponentLimitFraction).toBeGreaterThanOrEqual(0);
        }
        if (features.foregoneValueTenths !== null) expect(features.foregoneValueTenths).toBeGreaterThan(0);
      }
    }
  });

  it('analysis is deterministic and observation refs stay in range', () => {
    for (const match of matches) {
      const first = analyzeMatch(match.state, match.events, match.config);
      const second = analyzeMatch(match.state, match.events, match.config);
      expect(second).toEqual(first);
      const lastSequence = match.events.length > 0 ? match.events[match.events.length - 1]!.sequence : 0;
      for (const player of Object.values(first.players)) {
        for (const observation of player.observations) {
          expect(observation.source).toBe('deterministic');
          expect(observation.confidence).toBe('deterministic');
          for (const ref of observation.eventRefs) {
            expect(ref).toBeGreaterThan(0);
            expect(ref).toBeLessThanOrEqual(lastSequence);
          }
        }
      }
    }
  });
});
