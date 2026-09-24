/**
 * Post-match progress payload tests (BB-258, D-76): training history +
 * band transitions, personal records, skill observations, active
 * training goal, AI mastery — valid / invalid / boundary / property per
 * the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeMatch,
  assignPractice,
  buildPostMatchProgress,
  emptyCoachingState,
  POST_MATCH_PROGRESS_VERSION,
  setFocus,
  type MatchRecordWithPersona,
  type PostMatchProgressInput,
} from '../src';
import { BUYER_ID, play, readyBoth, SELLER_ID, START_NOW } from './helpers';

/** Deal where the buyer opens at buyerOpening and settles at settlement (buyer RV 1000, seller RV 400). */
function deal(kind: 'deal' | 'walk' = 'deal', buyerOpening = 500, settlement = 600) {
  const match = play((commit, api) => {
    readyBoth(commit);
    if (kind === 'walk') {
      commit({ kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1000 });
      return;
    }
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: buyerOpening, now: START_NOW + 1000 });
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: api.offer(2), amountTenths: settlement + 200, now: START_NOW + 2000 });
    commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(3), amountTenths: settlement - 50, now: START_NOW + 3000 });
    const finalStanding = api.offer(4);
    commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: finalStanding, amountTenths: settlement, now: START_NOW + 4000 });
    commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: finalStanding, now: START_NOW + 5000 });
  });
  const player = analyzeMatch(match.state, match.events, match.config).players[BUYER_ID]!;
  return { match, features: player.features, observations: player.observations };
}

function recordOf(endedAt: number, personaKey: 'anchor' | 'grinder' | 'closer' | 'wall' | 'mirror' | null, kind: 'deal' | 'walk' = 'deal'): MatchRecordWithPersona {
  const { match, features } = deal(kind);
  return { matchId: match.state.matchId, endedAt, features, personaKey };
}

function progressOf(overrides: Partial<PostMatchProgressInput> = {}): ReturnType<typeof buildPostMatchProgress> {
  const { match, features, observations } = deal();
  const current = {
    matchId: match.state.matchId,
    endedAt: START_NOW + 40_000,
    features,
    observations,
    personaKey: 'wall' as const,
  };
  const history: MatchRecordWithPersona[] = [
    recordOf(START_NOW + 10_000, 'wall', 'deal'),
    recordOf(START_NOW + 20_000, 'wall', 'walk'),
    recordOf(START_NOW + 30_000, 'anchor', 'deal'),
  ];
  const input: PostMatchProgressInput = {
    playerId: BUYER_ID,
    currentMatch: current,
    history,
    coachingState: emptyCoachingState(),
    ...overrides,
  };
  return buildPostMatchProgress(input);
}

describe('post-match progress (BB-258)', () => {
  it('computes the full payload per the contract', () => {
    const progress = progressOf();
    expect(progress.version).toBe(POST_MATCH_PROGRESS_VERSION);
    expect(progress.playerId).toBe(BUYER_ID);
    expect(progress.endedAt).toBe(START_NOW + 40_000);

    // training history: 4 playable matches (3 history + current)
    expect(progress.trainingHistory.matchCount).toBe(4);
    expect(progress.trainingHistory.confidenceBand).toBe('INSUFFICIENT_DATA');
    expect(progress.trainingHistory.bandTransition).toBe('SAME');

    // profile recomputed including the current match
    expect(progress.profile.matchCount).toBe(4);
    expect(progress.profile.lastMatchEndedAt).toBe(START_NOW + 40_000);

    // personal records exist and carry match ids
    expect(progress.personalRecords.bestSurplusCapture).not.toBeNull();
    expect(progress.personalRecords.bestSurplusCapture!.value).toBeCloseTo(2 / 3, 6);

    // skill observations map through the practice store
    const strongOpening = progress.skillObservations.find((o) => o.type === 'STRONG_OPENING_POSITION');
    expect(strongOpening).toBeDefined();
    expect(strongOpening!.drillIds).toContain('drill-anchor');
    expect(strongOpening!.personaKey).toBe('anchor');
    expect(strongOpening!.lessonIds).toContain('lesson-anchoring');

    // AI mastery: wall 3 matches (current deal + 1 deal + 1 walk), anchor 1 deal
    const wall = progress.aiMastery.byPersona.wall;
    expect(wall.matchCount).toBe(3);
    expect(wall.deals).toBe(2);
    expect(wall.dealRate).toBeCloseTo(2 / 3, 6);
    const anchor = progress.aiMastery.byPersona.anchor;
    expect(anchor.matchCount).toBe(1);
    expect(anchor.deals).toBe(1);
    expect(progress.aiMastery.overall.matchCount).toBe(4);
  });

  it('reports band transitions: FIRST_MATCH, ADVANCED, SAME', () => {
    expect(progressOf({ history: [] }).trainingHistory.bandTransition).toBe('FIRST_MATCH');
    expect(progressOf({ history: [] }).trainingHistory.matchCount).toBe(1);

    // 4 history matches (INSUFFICIENT) + current = 5 → EARLY_SIGNAL
    const fourDeals: MatchRecordWithPersona[] = [
      recordOf(START_NOW + 10_000, 'wall'),
      recordOf(START_NOW + 20_000, 'wall'),
      recordOf(START_NOW + 30_000, 'wall'),
      recordOf(START_NOW + 40_000, 'wall'),
    ];
    const advanced = progressOf({ history: fourDeals });
    expect(advanced.trainingHistory.bandTransition).toBe('ADVANCED');
    expect(advanced.trainingHistory.confidenceBand).toBe('EARLY_SIGNAL');
  });

  it('tracks personal records with the match that set them', () => {
    // history: surplus 0.667 deals; current: walk — records must come from history
    const { features, observations } = deal('walk');
    const walkCurrent = {
      matchId: 'current-walk',
      endedAt: START_NOW + 60_000,
      features,
      observations,
      personaKey: null as null,
    };
    const progress = buildPostMatchProgress({
      playerId: BUYER_ID,
      currentMatch: walkCurrent,
      history: [
        recordOf(START_NOW + 10_000, 'wall', 'deal'),
        recordOf(START_NOW + 20_000, 'wall', 'deal'),
      ],
      coachingState: emptyCoachingState(),
    });
    expect(progress.personalRecords.bestSurplusCapture!.value).toBeCloseTo(2 / 3, 6);
    expect(progress.personalRecords.longestHoldMs).not.toBeNull();
    expect(progress.personalRecords.largestConcessionTenths).not.toBeNull();
  });

  it('surfaces the active training goal from structured coaching state', () => {
    let coachingState = emptyCoachingState();
    coachingState = { ...coachingState, topics: [{ id: 'concessions', label: 'Concession discipline' }] };
    coachingState = assignPractice(coachingState, { id: 'd1', kind: 'DRILL', refId: 'drill-unreciprocated', assignedAt: 1000, completedAt: null });
    coachingState = setFocus(coachingState, 'concessions');

    const progress = progressOf({ coachingState });
    expect(progress.activeTrainingGoal).toEqual({ topicId: 'concessions', label: 'Concession discipline' });

    // no focus → no goal
    expect(progressOf().activeTrainingGoal).toBeNull();
  });

  it('rejects invalid inputs', () => {
    const { features, observations } = deal('walk');
    // aborted current match → rejected
    const aborted = play((commit) => {
      readyBoth(commit);
      commit({ kind: 'ABORT', now: START_NOW + 1000 });
    });
    const abortedPlayer = analyzeMatch(aborted.state, aborted.events, aborted.config).players[BUYER_ID]!;
    expect(() =>
      buildPostMatchProgress({
        playerId: BUYER_ID,
        currentMatch: { matchId: 'm-aborted', endedAt: START_NOW + 5000, features: abortedPlayer.features, observations: abortedPlayer.observations, personaKey: null },
        history: [],
        coachingState: emptyCoachingState(),
      }),
    ).toThrow(/non-aborted/);

    // non-finite endedAt
    expect(() =>
      buildPostMatchProgress({
        playerId: BUYER_ID,
        currentMatch: { matchId: 'm-nan', endedAt: Number.NaN, features, observations, personaKey: null },
        history: [],
        coachingState: emptyCoachingState(),
      }),
    ).toThrow(/non-finite endedAt/);

    // duplicate match id between current and history
    expect(() =>
      buildPostMatchProgress({
        playerId: BUYER_ID,
        currentMatch: { matchId: 'dup', endedAt: START_NOW + 50_000, features, observations, personaKey: null },
        history: [{ matchId: 'dup', endedAt: START_NOW + 10_000, features, personaKey: null }],
        coachingState: emptyCoachingState(),
      }),
    ).toThrow(/duplicate match dup/);
  });

  it('handles human-PvP matches and empty histories (boundary)', () => {
    const { features, observations } = deal();
    const progress = buildPostMatchProgress({
      playerId: BUYER_ID,
      currentMatch: { matchId: 'pvp-1', endedAt: START_NOW + 5000, features, observations, personaKey: null },
      history: [],
      coachingState: emptyCoachingState(),
    });
    expect(progress.aiMastery.overall.matchCount).toBe(0);
    expect(progress.aiMastery.overall.dealRate).toBeNull();
    expect(progress.trainingHistory.bandTransition).toBe('FIRST_MATCH');
    expect(progress.skillObservations.length).toBeGreaterThan(0);
  });

  it('is deterministic and clock-free', () => {
    const { match, features, observations } = deal();
    const input: PostMatchProgressInput = {
      playerId: BUYER_ID,
      currentMatch: { matchId: match.state.matchId, endedAt: START_NOW + 40_000, features, observations, personaKey: 'wall' },
      history: [recordOf(START_NOW + 10_000, 'wall', 'deal')],
      coachingState: emptyCoachingState(),
    };
    const first = buildPostMatchProgress(input);
    const second = buildPostMatchProgress(input);
    expect(second).toEqual(first);
    // every timestamp in the payload is input data — no generated clocks
    const text = JSON.stringify(first);
    expect(text).not.toContain('generatedAt');
    expect(text).not.toContain('Date.now');
  });
});
