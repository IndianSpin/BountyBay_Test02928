/**
 * Game Review envelope tests (IN-2, DEC-028, docs/18 §3 + docs/20):
 * one self-contained deterministic call per player — 1–5 curated moments
 * plus the event timeline — computable with no coaching service in the
 * path. Valid / invalid / boundary cases per the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  buildGameReview,
  FEATURE_ENGINE_VERSION,
  GAME_REVIEW_VERSION,
  MOMENT_CAP,
  OBSERVATION_ENGINE_VERSION,
  REVIEW_CURATION_VERSION,
  type GameReview,
} from '../src';
import { BUYER_ID, play, readyBoth, SELLER_ID, START_NOW, type ScriptedMatch } from './helpers';

function dealMatch(): ScriptedMatch {
  return play((commit, api) => {
    readyBoth(commit);
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
    const sellerStanding = api.offer(2);
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 800, now: START_NOW + 2000 });
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3000 });
    const finalStanding = api.offer(4);
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: finalStanding, amountTenths: 600, now: START_NOW + 4000 });
    commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: finalStanding, now: START_NOW + 5000 });
  });
}

function reviewOf(match: ScriptedMatch, playerId: string): GameReview {
  return buildGameReview(match.state, match.events, match.config, playerId);
}

describe('game review (IN-2)', () => {
  it('builds a versioned envelope with moments and timeline for a deal', () => {
    const match = dealMatch();
    const review = reviewOf(match, BUYER_ID);

    expect(review.version).toBe(GAME_REVIEW_VERSION);
    expect(review.curationVersion).toBe(REVIEW_CURATION_VERSION);
    expect(review.featureVersion).toBe(FEATURE_ENGINE_VERSION);
    expect(review.observationVersion).toBe(OBSERVATION_ENGINE_VERSION);
    expect(review.matchId).toBe(match.state.matchId);
    expect(review.playerId).toBe(BUYER_ID);
    expect(review.outcome).toBe('DEAL');

    expect(review.moments.length).toBeGreaterThanOrEqual(1);
    expect(review.moments.length).toBeLessThanOrEqual(MOMENT_CAP);
    expect(review.moments[0]!.kind).toBe('RESULT');
    expect(review.timeline.length).toBeGreaterThanOrEqual(1);
  });

  it('builds for every outcome', () => {
    const walked = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
    });
    expect(reviewOf(walked, BUYER_ID).outcome).toBe('NO_DEAL_WALKED');

    const timed = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'TIMEOUT', playerId: SELLER_ID, now: START_NOW + 91_000 });
    });
    expect(reviewOf(timed, SELLER_ID).outcome).toBe('NO_DEAL_TIMED_OUT');
    expect(reviewOf(timed, SELLER_ID).moments[0]!.headline).toBe('TIME RAN OUT');

    const aborted = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'ABORT', now: START_NOW + 1000 });
    });
    const abortReview = reviewOf(aborted, BUYER_ID);
    expect(abortReview.outcome).toBe('ABORTED');
    expect(abortReview.moments[0]!.headline).toBe('MATCH ABORTED');
    expect(abortReview.timeline.at(-1)!.kind).toBe('ABORTED');
  });

  it('rejects a match that is not complete', () => {
    const active = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
    });
    expect(active.state.status).toBe('ACTIVE');
    expect(() => reviewOf(active, BUYER_ID)).toThrow(/completed match/);
  });

  it('rejects a non-participant', () => {
    const match = dealMatch();
    expect(() => reviewOf(match, 'intruder-0001')).toThrow(/not a participant/);
  });

  it('every non-RESULT moment references timeline events', () => {
    const match = dealMatch();
    const review = reviewOf(match, BUYER_ID);
    const timelineSeqs = new Set(review.timeline.map((e) => e.seq));
    const eventSeqs = new Set(match.events.map((e) => e.sequence));
    for (const moment of review.moments.slice(1)) {
      expect(moment.eventRefs.length).toBeGreaterThan(0);
      for (const ref of moment.eventRefs) {
        expect(timelineSeqs.has(ref)).toBe(true);
        expect(eventSeqs.has(ref)).toBe(true);
      }
    }
  });

  it('is a pure deterministic function of its inputs (works with no service)', () => {
    const match = dealMatch();
    const first = reviewOf(match, BUYER_ID);
    const second = reviewOf(match, BUYER_ID);
    expect(second).toEqual(first);

    // the envelope carries only the deterministic review contract — no
    // coaching fields, no interpretation surface (docs/18 §3, §13)
    expect(Object.keys(first).sort()).toEqual([
      'curationVersion',
      'featureVersion',
      'matchId',
      'moments',
      'observationVersion',
      'outcome',
      'playerId',
      'timeline',
      'version',
    ]);
  });
});
