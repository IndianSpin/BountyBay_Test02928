/**
 * Observation engine tests on constructed matches (docs/20 triggers,
 * DEC-028 §46). Asserts the exact observation sets in deterministic order,
 * including eventRefs for timeline linkage.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { analyzeMatch, type MatchObservation, type ObservationType } from '../src';
import { BUYER_ID, play, readyBoth, SELLER_ID, START_NOW } from './helpers';

function types(observations: MatchObservation[]): ObservationType[] {
  return observations.map((o) => o.type);
}

function find(observations: MatchObservation[], type: ObservationType): MatchObservation {
  const found = observations.find((o) => o.type === type);
  if (!found) throw new Error(`missing observation ${type}; got ${types(observations).join(', ')}`);
  return found;
}

describe('observation engine', () => {
  it('deal: conservative opening, efficient close, strong capture (buyer side)', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 800, now: START_NOW + 2000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3000 });
      const sellerStanding = api.offer(4);
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 600, now: START_NOW + 4000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 5000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;

    expect(types(buyer.observations)).toEqual([
      'STRONG_OPENING_POSITION', // 0.1667: near the seller's limit — ambitious
      'LARGE_OPENING', // 500 is exactly RV/2 → distance ln(2) ≥ ln(2) threshold
      'LARGEST_CONCESSION',
      'LOW_CHIP_SPEND',
      'EFFICIENT_CLOSE',
      'STRONG_SURPLUS_CAPTURE',
    ]);
    expect(find(buyer.observations, 'STRONG_OPENING_POSITION').measurements.positionInZopa).toBeCloseTo(100 / 600, 10);
    expect(find(buyer.observations, 'STRONG_SURPLUS_CAPTURE').magnitude).toBeCloseTo((1000 - 600) / 600, 10);
    const efficient = find(buyer.observations, 'EFFICIENT_CLOSE');
    expect(efficient.eventRefs.length).toBe(1);
    expect(efficient.eventRefs[0]).toBeGreaterThan(0);
  });

  it('walk with a standing offer inside the mandate: missed offer + failed ZOPA', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 500, now: START_NOW + 2000 });
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 3000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    expect(types(buyer.observations)).toEqual([
      'STRONG_OPENING_POSITION',
      'LARGE_OPENING', // 500 is exactly RV/2
      'MISSED_STANDING_OFFER',
      'FAILED_POSITIVE_ZOPA',
    ]);
    expect(find(buyer.observations, 'MISSED_STANDING_OFFER').magnitude).toBe(500);
    expect(find(buyer.observations, 'FAILED_POSITIVE_ZOPA').magnitude).toBe(600);
  });

  it('deadlock: thin final gap with 6+ offers, no deal', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 600, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 700, now: START_NOW + 2000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 610, now: START_NOW + 3000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(4), amountTenths: 690, now: START_NOW + 4000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(5), amountTenths: 620, now: START_NOW + 5000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(6), amountTenths: 680, now: START_NOW + 6000 });
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 7000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    const deadlock = find(buyer.observations, 'DEADLOCK');
    expect(deadlock.magnitude).toBe(60);
    expect(deadlock.measurements.zopaTenths).toBe(600);
    expect(deadlock.eventRefs).toHaveLength(3); // last two offers + terminal
  });

  it('timeout fires TIMEOUT plus failed-ZOPA and missed-offer on the timed-out player', () => {
    const config = makeEconomyConfig({ hardDecisionTimeLimitMs: 90_000 }); // pinned 90s limit — the product default moved (DEC-031 #3)
    const match = play(
      (commit, api) => {
        readyBoth(commit);
        commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
        commit({ kind: 'TIMEOUT', playerId: SELLER_ID, now: START_NOW + 91_000 });
      },
      {},
      config,
    );
    const seller = analyzeMatch(match.state, match.events, match.config).players[SELLER_ID]!;
    expect(types(seller.observations)).toContain('TIMEOUT');
    expect(types(seller.observations)).toContain('FAILED_POSITIVE_ZOPA');
    expect(types(seller.observations)).toContain('MISSED_STANDING_OFFER');
    expect(find(seller.observations, 'MISSED_STANDING_OFFER').magnitude).toBe(100);
  });

  it('fast close: crossing then acceptance within 5s', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 1000, now: START_NOW + 1000 });
      const sellerStanding = api.offer(2);
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 400, now: START_NOW + 2000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 4000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    const fast = find(buyer.observations, 'FAST_CLOSE');
    expect(fast.magnitude).toBe(2000);
    expect(types(buyer.observations)).toContain('STRONG_SURPLUS_CAPTURE');
  });

  it('large opening fires at ln(5) distance; silence and pitch observations', () => {
    const large = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 200, now: START_NOW + 1000 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 2000 });
    });
    const largeBuyer = analyzeMatch(large.state, large.events, large.config).players[BUYER_ID]!;
    expect(types(largeBuyer.observations)).toContain('LARGE_OPENING');
    expect(types(largeBuyer.observations)).toContain('STRONG_OPENING_POSITION'); // −0.33: beyond the seller's limit

    // a conservative opening: the seller stands barely above its own limit
    const cautious = play(
      (commit, api) => {
        readyBoth(commit);
        commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(1), amountTenths: 450, now: START_NOW + 1000 });
        commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 2000 });
      },
      { firstPlayerId: SELLER_ID },
    );
    const cautiousSeller = analyzeMatch(cautious.state, cautious.events, cautious.config).players[SELLER_ID]!;
    expect(types(cautiousSeller.observations)).toContain('CONSERVATIVE_OPENING'); // (1000 − 450)/600 = 0.917
    expect(types(cautiousSeller.observations)).not.toContain('STRONG_OPENING_POSITION');

    // a mid-ZOPA opening fires neither (regression: the threshold band)
    const middle = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 600, now: START_NOW + 1000 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 2000 });
    });
    const middleBuyer = analyzeMatch(middle.state, middle.events, middle.config).players[BUYER_ID]!;
    expect(types(middleBuyer.observations)).not.toContain('STRONG_OPENING_POSITION');
    expect(types(middleBuyer.observations)).not.toContain('CONSERVATIVE_OPENING'); // position 0.3333

    const silent = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 700, now: START_NOW + 2000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(4), amountTenths: 690, now: START_NOW + 4000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(5), amountTenths: 600, now: START_NOW + 5000 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 6000 });
    });
    const silentBuyer = analyzeMatch(silent.state, silent.events, silent.config).players[BUYER_ID]!;
    expect(find(silentBuyer.observations, 'SILENT_NEGOTIATION').magnitude).toBe(3);

    const pitched = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'msg-0001', body: 'I can do 500.', now: START_NOW + 800 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1200 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 2200 });
    });
    const pitchedBuyer = analyzeMatch(pitched.state, pitched.events, pitched.config).players[BUYER_ID]!;
    expect(find(pitchedBuyer.observations, 'OFFER_WITH_PITCH').magnitude).toBe(1);
  });

  it('zero-move walk produces exactly FAILED_POSITIVE_ZOPA', () => {
    const match = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    expect(types(buyer.observations)).toEqual(['FAILED_POSITIVE_ZOPA']);
  });

  it('analyzeMatch carries the version pair on the envelope', () => {
    const match = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    const analysis = analyzeMatch(match.state, match.events, match.config);
    expect(analysis.version).toBe('feature-engine-0.1.0');
    expect(analysis.observationVersion).toBe('observation-engine-0.1.0');
    expect(Object.keys(analysis.players).sort()).toEqual([BUYER_ID, SELLER_ID].sort());
  });
});
