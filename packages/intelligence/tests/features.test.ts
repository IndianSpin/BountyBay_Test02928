/**
 * Feature engine tests on constructed matches with hand-computed expected
 * outputs (docs/19 formulas; DEC-028 §46). Buyer math, seller math, ZOPA,
 * surplus share, opening distances, concession reciprocity, time, chips,
 * agreement, no-deal, timeout, crossed offers, missed standing offers.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import type { DomainEvent } from '@bounty-bay/domain';
import { describe, expect, it } from 'vitest';
import { classifyMoves, computeFeatures } from '../src/features';
import { BUYER_ID, play, readyBoth, SELLER_ID, START_NOW, type ScriptedMatch } from './helpers';

function featuresOf(match: ScriptedMatch, playerId: string) {
  return computeFeatures(match.state, match.events, match.config)[playerId]!;
}

describe('feature engine: buyer math (deal)', () => {
  // buyer 500 → 550, seller 800 → 600, buyer accepts 600.
  const match = play((commit, api) => {
    readyBoth(commit);
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 800, now: START_NOW + 2000 });
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3000 });
    const sellerStanding = api.offer(4);
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 600, now: START_NOW + 4000 });
    commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 5000 });
  });

  const buyer = featuresOf(match, BUYER_ID);
  const seller = featuresOf(match, SELLER_ID);

  it('opening: buyer opened first, correct distance and ZOPA position', () => {
    expect(buyer.openedFirst).toBe(true);
    expect(seller.openedFirst).toBe(false);
    expect(buyer.openingOfferTenths).toBe(500);
    expect(buyer.openingDistanceFromRv).toBeCloseTo(Math.abs(Math.log(500 / 1000)), 10);
    // (500 − 400) / 600
    expect(buyer.openingPositionInZopa).toBeCloseTo(100 / 600, 10);
    expect(buyer.timeToOpeningMs).toBe(1000);
  });

  it('concessions: counts, magnitudes, sizes, costs', () => {
    expect(buyer.offerCount).toBe(2);
    expect(buyer.concessionCount).toBe(1);
    expect(buyer.concessionMagnitudes[0]).toBeCloseTo(Math.log(550 / 500), 10);
    expect(buyer.concessionSizesTenths[0]).toBe(50);
    expect(buyer.concessionChipCosts[0]).toBe(3); // ceil(10 · ln(1.1)^0.6)
    expect(seller.concessionCount).toBe(1);
    expect(seller.concessionSizesTenths[0]).toBe(200);
    expect(seller.concessionChipCosts[0]).toBe(5); // ceil(10 · ln(8/6)^0.6)
    expect(buyer.largestConcessionMagnitude).toBeCloseTo(Math.log(550 / 500), 10);
    expect(buyer.largestConcessionTurn).toBe(2);
    expect(buyer.concessionPattern).toBeNull(); // below 3
    expect(buyer.unreciprocatedConcessionCount).toBe(0);
  });

  it('closing and performance: surplus split, ZOPA, positions', () => {
    expect(buyer.zopaTenths).toBe(600);
    expect(buyer.settlementTenths).toBe(600);
    expect(buyer.surplusShareCaptured).toBeCloseTo((1000 - 600) / 600, 10);
    expect(seller.surplusShareCaptured).toBeCloseTo((600 - 400) / 600, 10);
    expect(buyer.settlementPositionInZopa).toBeCloseTo(buyer.surplusShareCaptured!, 10);
    expect(buyer.acceptedOpponentOffer).toBe(true);
    expect(buyer.ownOfferAccepted).toBe(false);
    expect(buyer.agreementReached).toBe(true);
    expect(buyer.outcome).toBe('DEAL');
    expect(buyer.settlementWithinOwnLimitFraction).toBeCloseTo(400 / 1000, 10);
    expect(buyer.settlementWithinOpponentLimitFraction).toBeCloseTo(200 / 400, 10);
    expect(buyer.crossedOffersExisted).toBe(false); // 550 < 600 until accept
    expect(buyer.timeFromCrossedToSettlementMs).toBeNull();
    expect(buyer.ratedEligible).toBe(true);
    expect(buyer.opponentRating).toBeNull(); // P1-M2 not shipped
  });

  it('time: per-turn active times from event timestamps', () => {
    // buyer: grant START → open at +1000 (1000ms); grant +2000 (seller's offer) → concession at +3000 (1000ms)
    expect(buyer.meanDecisionMs).toBeCloseTo(1000, 5);
    expect(buyer.maxDecisionMs).toBe(1000);
    // seller: grant +1000 → +2000 (1000); grant +3000 → +4000 (1000)
    expect(seller.meanDecisionMs).toBe(1000);
  });
});

describe('feature engine: unreciprocated concessions (synthetic events)', () => {
  // IMPORTANT (docs/20 note): under current strict turn alternation every
  // offer transfers the turn, so a player can never make two consecutive
  // offers in a live match — unreciprocated concessions are unreachable
  // until hold/communication mechanics (DD-M5) or async (M9) exist. The
  // detector math is exercised on a synthetic event stream instead; the
  // domain would reject this script today, which is exactly the point.
  const base = play((commit) => {
    readyBoth(commit);
    commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
  });
  const syntheticEvents = [
    ...base.events.filter((e) => e.type !== 'WALKED_AWAY' && e.type !== 'MATCH_COMPLETED' && e.type !== 'MATCH_PAUSED'),
  ];
  // replay the walk at a later time after synthetic offers
  const events = [
    ...syntheticEvents,
    { sequence: 10, type: 'OFFER_SUBMITTED', at: START_NOW + 1000, actorPlayerId: BUYER_ID, payload: { offerId: 's1', amountTenths: 500, isOpening: true, concessionMagnitude: null, concessionCostChips: 0, remainingConcessionChips: 100, nextActivePlayerId: SELLER_ID } },
    { sequence: 11, type: 'OFFER_SUBMITTED', at: START_NOW + 2000, actorPlayerId: SELLER_ID, payload: { offerId: 's2', amountTenths: 800, isOpening: true, concessionMagnitude: null, concessionCostChips: 0, remainingConcessionChips: 100, nextActivePlayerId: BUYER_ID } },
    { sequence: 12, type: 'OFFER_SUBMITTED', at: START_NOW + 3000, actorPlayerId: BUYER_ID, payload: { offerId: 's3', amountTenths: 550, isOpening: false, concessionMagnitude: 0.0953, concessionCostChips: 3, remainingConcessionChips: 97, nextActivePlayerId: BUYER_ID } },
    { sequence: 13, type: 'OFFER_SUBMITTED', at: START_NOW + 4000, actorPlayerId: BUYER_ID, payload: { offerId: 's4', amountTenths: 600, isOpening: false, concessionMagnitude: 0.087, concessionCostChips: 3, remainingConcessionChips: 94, nextActivePlayerId: BUYER_ID } },
    { sequence: 14, type: 'WALKED_AWAY', at: START_NOW + 5000, actorPlayerId: SELLER_ID, payload: {} },
  ] as const;

  it('classifies the second consecutive concession as unreciprocated', () => {
    const moves = classifyMoves(base.state, events as unknown as DomainEvent[], BUYER_ID);
    expect(moves).toHaveLength(3);
    // 500 → 550: opponent moved (null → 800) since the previous offer → reciprocated
    expect(moves[1]!.unreciprocated).toBe(false);
    // 550 → 600: opponent still at 800 → unreciprocated
    expect(moves[2]!.unreciprocated).toBe(true);
    expect(moves[2]!.activeTimeMs).toBe(1000); // grant at +3000 (previous own offer) → +4000
  });

  it('counts unreciprocated concessions and the unilateral run', () => {
    const features = computeFeatures(base.state, events as unknown as DomainEvent[], base.config)[BUYER_ID]!;
    expect(features.unreciprocatedConcessionCount).toBe(1);
    expect(features.maxConsecutiveUnilateralConcessions).toBe(1);
    expect(features.holdResponseMeanMs).toBe(1000);
  });
});

describe('feature engine: no-deal outcomes', () => {
  it('missed standing offer: buyer walks with a 500 offer standing inside the mandate', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 500, now: START_NOW + 2000 });
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 3000 });
    });
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.outcome).toBe('NO_DEAL_WALKED');
    expect(buyer.agreementReached).toBe(false);
    expect(buyer.foregoneValueTenths).toBe(500); // 1000 − 500
    expect(buyer.zopaExisted).toBe(true);
    expect(buyer.surplusShareCaptured).toBeNull();
    expect(buyer.ratedEligible).toBe(true); // walked ranked match is eligible
  });

  it('deadlock: both sides grind to a thin gap and walk', () => {
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
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.finalGapTenths).toBe(60);
    expect(buyer.finalGapTenths! / buyer.zopaTenths).toBeCloseTo(0.1, 10); // ≤ 0.2 deadlock threshold
  });

  it('timeout: TIMED_OUT completion is classified', () => {
    const config = makeEconomyConfig({ hardDecisionTimeLimitMs: 90_000 }); // pinned 90s limit — the product default moved (DEC-031 #3)
    const match = play(
      (commit, api) => {
        readyBoth(commit);
        commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
        // seller stalls past the 90s hard limit, then the server timeout lands
        commit({ kind: 'TIMEOUT', playerId: SELLER_ID, now: START_NOW + 91_000 });
      },
      {},
      config,
    );
    const seller = featuresOf(match, SELLER_ID);
    const buyer = featuresOf(match, BUYER_ID);
    expect(seller.outcome).toBe('NO_DEAL_TIMED_OUT');
    expect(buyer.outcome).toBe('NO_DEAL_TIMED_OUT');
    expect(match.state.completionReason).toBe('TIMED_OUT');
    // the buyer's 500 stood within the seller's mandate (500 ≥ 400): foregone 100
    expect(seller.foregoneValueTenths).toBe(100);
    // the seller never offered: nothing standing for the buyer
    expect(buyer.foregoneValueTenths).toBeNull();
  });

  it('fast close: crossing then acceptance within 5s', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 1000, now: START_NOW + 1000 });
      const sellerStanding = api.offer(2);
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 400, now: START_NOW + 2000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 4000 });
    });
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.crossedOffersExisted).toBe(true); // 1000 ≥ 400 at +2000
    expect(buyer.timeFromCrossedToSettlementMs).toBe(2000);
    expect(buyer.acceptedOpponentOffer).toBe(true);
  });

  it('large opening: buyer opens at 200 (distance ln 5)', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 200, now: START_NOW + 1000 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 2000 });
    });
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.openingDistanceFromRv).toBeCloseTo(Math.log(5), 10);
    expect(buyer.openingPositionInZopa).toBeCloseTo(-200 / 600, 10); // below the seller's floor
  });
});

describe('feature engine: communication raw features', () => {
  it('pitch proximity and silence', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'msg-0001', body: 'I can do 500.', now: START_NOW + 800 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1200 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 700, now: START_NOW + 2200 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3200 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(4), amountTenths: 690, now: START_NOW + 4200 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(5), amountTenths: 600, now: START_NOW + 5200 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 6200 });
    });
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.messagesSent).toBe(1);
    expect(buyer.messagesSentBeforeOpening).toBe(1);
    expect(buyer.pitchedOffers).toBe(1); // only the 500 offer sits within 10s of the message
    expect(buyer.offerCount).toBe(3);
    expect(buyer.silentOfferRunMax).toBe(3); // 500, 550, 600 with no chat at all
  });
});

describe('feature engine: versioning + determinism', () => {
  it('records the match config versions', () => {
    const match = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.economyConfigVersion).toBe('economy-0.3.0');
    expect(buyer.gameRulesVersion).toBe('game-rules-0.1.0');
    expect(buyer.scenarioVersion).toBe(1);
    expect(buyer.role).toBe('BUYER');
    expect(buyer.firstMover).toBe(true);
    expect(buyer.mode).toBe('RANKED_LIVE');
  });

  it('is deterministic for the same input', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      const sellerStanding = api.offer(2);
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 800, now: START_NOW + 2000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 3000 });
    });
    const first = computeFeatures(match.state, match.events, match.config);
    const second = computeFeatures(match.state, match.events, match.config);
    expect(second).toEqual(first);
  });

  it('handles a zero-move match (walk at the first opportunity)', () => {
    const match = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    const buyer = featuresOf(match, BUYER_ID);
    expect(buyer.offerCount).toBe(0);
    expect(buyer.openingOfferTenths).toBeNull();
    expect(buyer.concessionPattern).toBeNull();
    expect(buyer.finalGapTenths).toBeNull();
    expect(buyer.outcome).toBe('NO_DEAL_WALKED');
  });
});
