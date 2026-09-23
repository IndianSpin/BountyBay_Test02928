/**
 * Review curation tests (IN-2, DEC-028): deterministic selection of 1–5
 * moments, priority order, the hard cap, and objective Level-1 copy built
 * from measurements — no interpretation anywhere.
 */

import { describe, expect, it } from 'vitest';
import { analyzeMatch, curateReview, MOMENT_CAP, REVIEW_CURATION_VERSION, type MatchObservation, type ObservationType } from '../src';
import { BUYER_ID, play, readyBoth, START_NOW } from './helpers';

describe('review curation', () => {
  it('always leads with the RESULT moment and caps at 5', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: 'seller-0001', offerId: api.offer(2), amountTenths: 800, now: START_NOW + 2000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3000 });
      const sellerStanding = api.offer(4);
      commit({ kind: 'OFFER', playerId: 'seller-0001', offerId: sellerStanding, amountTenths: 600, now: START_NOW + 4000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 5000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    const moments = curateReview(buyer.features, buyer.observations);

    expect(moments.length).toBeLessThanOrEqual(MOMENT_CAP);
    expect(moments[0]!.kind).toBe('RESULT');
    expect(moments[0]!.headline).toBe(`YOU CAPTURED ${Math.round((buyer.features.surplusShareCaptured ?? 0) * 100)}%`);
    expect(moments[0]!.detail).toContain('chips remaining');
    // deterministic
    expect(curateReview(buyer.features, buyer.observations)).toEqual(moments);
  });

  it('honors the priority order and the cap with many observations', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: 'seller-0001', offerId: api.offer(2), amountTenths: 500, now: START_NOW + 2000 });
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 3000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    const moments = curateReview(buyer.features, buyer.observations);
    const kinds = moments.map((m) => m.kind);
    // the RESULT detail already states the standing offer → no duplicate moment
    expect(kinds).not.toContain('MISSED_STANDING_OFFER');
    expect(kinds).toContain('FAILED_POSITIVE_ZOPA');
    expect(moments[0]!.detail).toContain('standing offer');
    // every non-RESULT moment carries timeline refs
    for (const moment of moments.slice(1)) {
      expect(moment.eventRefs.length).toBeGreaterThan(0);
    }
  });

  it('produces only objective copy (no interpretive language)', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: 'seller-0001', offerId: api.offer(2), amountTenths: 500, now: START_NOW + 2000 });
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 3000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    const text = JSON.stringify(curateReview(buyer.features, buyer.observations));
    // banned interpretive vocabulary (docs/18 §2, "no negotiation Stockfish")
    for (const banned of ['blunder', 'mistake', 'best move', 'should have', 'psychology', 'always', 'never']) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
  });

  it('no-deal and timeout RESULT moments differ by outcome', () => {
    const walked = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    const walkedBuyer = analyzeMatch(walked.state, walked.events, walked.config).players[BUYER_ID]!;
    const walkedMoments = curateReview(walkedBuyer.features, walkedBuyer.observations);
    expect(walkedMoments[0]!.headline).toBe('NO DEAL — ZERO BOUNTY');

    const timed = play(
      (commit, api) => {
        readyBoth(commit);
        commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
        commit({ kind: 'TIMEOUT', playerId: 'seller-0001', now: START_NOW + 91_000 });
      },
    );
    const timedSeller = analyzeMatch(timed.state, timed.events, timed.config).players['seller-0001']!;
    const timedMoments = curateReview(timedSeller.features, timedSeller.observations);
    expect(timedMoments[0]!.headline).toBe('TIME RAN OUT');
    expect(timedMoments.some((m) => m.kind === 'TIMEOUT')).toBe(false); // RESULT already covers it
  });

  it('exports its version constant', () => {
    expect(REVIEW_CURATION_VERSION).toBe('review-curation-0.1.0');
  });

  it('types are all ObservationType and RESULT', () => {
    const match = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    const buyer = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
    const valid: (ObservationType | 'RESULT')[] = [
      'RESULT', 'MISSED_STANDING_OFFER', 'DEADLOCK', 'TIMEOUT', 'FAILED_POSITIVE_ZOPA',
      'UNRECIPROCATED_CONCESSION', 'CONSECUTIVE_UNILATERAL_CONCESSIONS', 'LATE_LARGE_CONCESSION',
      'FAST_CONCESSION_AFTER_RESISTANCE', 'STRONG_OPENING_POSITION', 'LARGE_OPENING', 'CONSERVATIVE_OPENING',
      'LARGEST_CONCESSION', 'STRONG_SURPLUS_CAPTURE', 'LOW_SURPLUS_CAPTURE', 'DEAL_NEAR_OWN_LIMIT',
      'DEAL_NEAR_OPPONENT_LIMIT', 'FAST_CLOSE', 'EFFICIENT_CLOSE', 'DECLINING_CONCESSIONS',
      'INCREASING_CONCESSIONS', 'LONG_HOLD', 'TIME_PRESSURE_EXPOSURE', 'HIGH_CHIP_SPEND',
      'LOW_CHIP_SPEND', 'SILENT_NEGOTIATION', 'OFFER_WITH_PITCH',
    ];
    for (const moment of curateReview(buyer.features, buyer.observations)) {
      expect(valid).toContain(moment.kind);
    }
  });
});
