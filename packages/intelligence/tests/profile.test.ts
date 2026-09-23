/**
 * Longitudinal profile tests (IN-3, BB-205, docs/18 §9): aggregates over
 * completed-match analyses, confidence bands, windowed trends, style
 * descriptors, role split — valid / invalid / boundary / property per the
 * AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  buildProfile,
  confidenceBandOf,
  DEFAULT_DESCRIPTOR_THRESHOLDS,
  DEFAULT_PROFILE_OPTIONS,
  PROFILE_ENGINE_VERSION,
  type MatchProfileInput,
} from '../src';
import { computeFeatures } from '../src';
import { BUYER_ID, play, readyBoth, SELLER_ID, START_NOW, type ScriptedMatch } from './helpers';

/** Deal script: buyer opens at 500 (aggressive position 0.167), settles 600. */
function deal(kind: 'deal' | 'silent' | 'walk' = 'deal'): ScriptedMatch {
  return play((commit, api) => {
    readyBoth(commit);
    if (kind === 'silent') {
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: 800, now: START_NOW + 2000 });
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: 550, now: START_NOW + 3000 });
      const standing = api.offer(4);
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: standing, amountTenths: 600, now: START_NOW + 4000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: standing, now: START_NOW + 5000 });
      return;
    }
    if (kind === 'walk') {
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
      return;
    }
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
    const standing = api.offer(2);
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: standing, amountTenths: 600, now: START_NOW + 2000 });
    commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: standing, now: START_NOW + 3000 });
  });
}

function inputOf(match: ScriptedMatch, playerId: string, endedAt: number): MatchProfileInput {
  return {
    matchId: match.state.matchId,
    endedAt,
    features: computeFeatures(match.state, match.events, match.config)[playerId]!,
  };
}

function history(n: number, kind: 'deal' | 'silent' | 'walk' = 'deal', endedAtStart = START_NOW): MatchProfileInput[] {
  return Array.from({ length: n }, (_, i) => inputOf(deal(kind), BUYER_ID, endedAtStart + i * 1000));
}

describe('longitudinal profile (IN-3)', () => {
  it('builds a versioned profile from a single match (INSUFFICIENT DATA)', () => {
    const profile = buildProfile(history(1), BUYER_ID);
    expect(profile.version).toBe(PROFILE_ENGINE_VERSION);
    expect(profile.playerId).toBe(BUYER_ID);
    expect(profile.matchCount).toBe(1);
    expect(profile.confidenceBand).toBe('INSUFFICIENT_DATA');
    expect(profile.descriptors).toEqual([]); // below minMatches gate
    expect(profile.lifetime.dimensions.agreementRate.mean).toBe(1);
    expect(profile.roleSplit.buyer.matchCount).toBe(1);
    expect(profile.roleSplit.seller.matchCount).toBe(0);
  });

  it('windows the history into lifetime / recent / previous / rolling', () => {
    // 25 matches, recentN 10 → previous = matches 6..15, recent = 16..25, rolling = 21..25
    const profile = buildProfile(history(25), BUYER_ID);
    expect(profile.matchCount).toBe(25);
    expect(profile.lifetime.matchCount).toBe(25);
    expect(profile.recent.matchCount).toBe(10);
    expect(profile.previous.matchCount).toBe(10);
    expect(profile.rolling.matchCount).toBe(5);
    expect(profile.lastMatchEndedAt).toBe(START_NOW + 24 * 1000);
    // fewer than 2N matches: previous window shrinks, never negative
    const small = buildProfile(history(12), BUYER_ID);
    expect(small.recent.matchCount).toBe(10);
    expect(small.previous.matchCount).toBe(2);
  });

  it('reports trend direction and delta with no causal text', () => {
    // first 15 matches: 2 messages each; last 10: none
    const noisy = Array.from({ length: 15 }, (_, i) =>
      inputOf(
        play((commit, api) => {
          readyBoth(commit);
          commit({ kind: 'MESSAGE', playerId: BUYER_ID, messageId: `m-a-${i}`, body: 'a', now: START_NOW + 500 });
          commit({ kind: 'MESSAGE', playerId: BUYER_ID, messageId: `m-b-${i}`, body: 'b', now: START_NOW + 700 });
          const standing = api.offer(1);
          commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(2), amountTenths: 500, now: START_NOW + 1000 });
          commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: standing, amountTenths: 600, now: START_NOW + 2000 });
          commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: standing, now: START_NOW + 3000 });
        }),
        BUYER_ID,
        START_NOW + i * 1000,
      ),
    );
    const quiet = history(10, 'silent', START_NOW + 15 * 1000);
    const profile = buildProfile([...noisy, ...quiet], BUYER_ID);
    const trend = profile.trends.find((t) => t.metric === 'messagesSent');
    expect(trend).toBeDefined();
    expect(trend!.recent).toBe(0);
    expect(trend!.previous).toBe(2);
    expect(trend!.direction).toBe('DOWN');
    expect(trend!.delta).toBe(-2);

    // identical windows → FLAT
    const flat = buildProfile(history(25), BUYER_ID);
    for (const t of flat.trends) expect(t.direction).toBe('FLAT');

    // no interpretive language anywhere in the output
    const text = JSON.stringify(profile);
    for (const banned of ['because', 'due to', 'caused', 'explains', 'likely', 'personality']) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
  });

  it('derives style descriptors only from explicit thresholds, capped and gated', () => {
    // silent-deal script: aggressive opening (0.167 ≤ 0.35), surplus 0.667
    // (≥ 0.60), ~1s decisions (≤ 8000 ms) — the first three matching rules.
    const profile = buildProfile(history(5, 'silent'), BUYER_ID);
    expect(profile.confidenceBand).toBe('EARLY_SIGNAL');
    const ids = profile.descriptors.map((d) => d.id);
    expect(ids).toEqual(['AGGRESSIVE_OPENER', 'HARD_BARGAINER', 'QUICK_DECIDER']);
    expect(profile.descriptors.length).toBeLessThanOrEqual(DEFAULT_DESCRIPTOR_THRESHOLDS.maxDescriptors);
    for (const descriptor of profile.descriptors) {
      expect(descriptor.label.length).toBeGreaterThan(0);
      for (const item of descriptor.evidence) {
        expect(Number.isFinite(item.value)).toBe(true);
      }
    }

    // below the gate: no descriptors
    expect(buildProfile(history(4, 'silent'), BUYER_ID).descriptors).toEqual([]);
    // walk-only history: no opening/concession/closing data — only the
    // decision-speed rule has evidence (1s walks)
    expect(buildProfile(history(30, 'walk'), BUYER_ID).descriptors.map((d) => d.id)).toEqual(['QUICK_DECIDER']);
  });

  it('excludes ABORTED matches and splits roles without rating', () => {
    const abortedFor = (playerId: string) =>
      inputOf(
        play((commit) => {
          readyBoth(commit);
          commit({ kind: 'ABORT', now: START_NOW + 1000 });
        }),
        playerId,
        START_NOW + 5 * 1000,
      );
    const inputs = [...history(5, 'deal'), abortedFor(BUYER_ID), abortedFor(SELLER_ID)];
    const profile = buildProfile(inputs, BUYER_ID);
    expect(profile.matchCount).toBe(5);
    expect(profile.confidenceBand).toBe('EARLY_SIGNAL');
    expect(profile.roleSplit.buyer.matchCount).toBe(5);
    expect(profile.roleSplit.seller.matchCount).toBe(0);
  });

  it('rejects invalid inputs', () => {
    expect(() => buildProfile([], BUYER_ID)).toThrow(/at least one non-aborted/);
    const allAborted = Array.from({ length: 3 }, (_, i) =>
      inputOf(
        play((commit) => {
          readyBoth(commit);
          commit({ kind: 'ABORT', now: START_NOW + 1000 });
        }),
        BUYER_ID,
        START_NOW + i * 1000,
      ),
    );
    expect(() => buildProfile(allAborted, BUYER_ID)).toThrow(/at least one non-aborted/);

    const one = history(1);
    const duplicate = [...one, { ...one[0]!, endedAt: one[0]!.endedAt + 1 }];
    expect(() => buildProfile(duplicate, BUYER_ID)).toThrow(/duplicate match/);

    const badTime = history(1);
    expect(() => buildProfile([{ ...badTime[0]!, endedAt: Number.NaN }], BUYER_ID)).toThrow(/non-finite endedAt/);

    expect(() => confidenceBandOf(0)).toThrow(/at least 1 match/);
  });

  it('confidence band boundaries are exact', () => {
    expect(confidenceBandOf(1)).toBe('INSUFFICIENT_DATA');
    expect(confidenceBandOf(4)).toBe('INSUFFICIENT_DATA');
    expect(confidenceBandOf(5)).toBe('EARLY_SIGNAL');
    expect(confidenceBandOf(14)).toBe('EARLY_SIGNAL');
    expect(confidenceBandOf(15)).toBe('EMERGING_PATTERN');
    expect(confidenceBandOf(29)).toBe('EMERGING_PATTERN');
    expect(confidenceBandOf(30)).toBe('ESTABLISHED');
    expect(confidenceBandOf(500)).toBe('ESTABLISHED');
  });

  it('is deterministic and independent of input order', () => {
    const inputs = history(25, 'deal');
    const shuffled = [...inputs].sort(() => 0.5 - Math.random());
    const first = buildProfile(inputs, BUYER_ID, DEFAULT_PROFILE_OPTIONS);
    const second = buildProfile(shuffled, BUYER_ID, DEFAULT_PROFILE_OPTIONS);
    expect(second).toEqual(first);
    expect(buildProfile(inputs, BUYER_ID)).toEqual(first);
  });
});
