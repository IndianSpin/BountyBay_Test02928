/**
 * Game Review V1 (IN-2, DEC-028, docs/18 §3 + docs/20). The complete
 * deterministic post-match review for one player: the 1–5 curated moments
 * plus the sequence-ordered event timeline, in a single versioned
 * envelope.
 *
 * Self-contained by contract: everything here computes from the stored
 * match snapshot + event stream + economy config, so the Game Review
 * works fully when the coaching service is unavailable (docs/18 §13 —
 * the deterministic review is the fallback, never the other way around).
 * No LLM, no retrieval, no I/O — pure and reproducible.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import type { DomainEvent, MatchState, PlayerId } from '@bounty-bay/domain';
import { curateReview, REVIEW_CURATION_VERSION, type ReviewMoment } from './curate';
import { analyzeMatch } from './observations';
import { buildTimeline, type ReviewTimelineEntry } from './timeline';
import { DEFAULT_THRESHOLDS, type MatchOutcome, type ObservationThresholds } from './types';

export const GAME_REVIEW_VERSION = 'game-review-0.1.0';

export interface GameReview {
  version: string;
  curationVersion: string;
  featureVersion: string;
  observationVersion: string;
  matchId: string;
  playerId: PlayerId;
  outcome: MatchOutcome;
  /** 1–5 moments; moment 1 is always RESULT. */
  moments: ReviewMoment[];
  /** The shared match timeline (both participants see the same steps). */
  timeline: ReviewTimelineEntry[];
}

const TERMINAL_STATUSES = new Set(['DEAL', 'NO_DEAL', 'ABORTED']);

export function buildGameReview(
  state: MatchState,
  events: DomainEvent[],
  config: EconomyConfig,
  playerId: PlayerId,
  thresholds: ObservationThresholds = DEFAULT_THRESHOLDS,
): GameReview {
  if (!TERMINAL_STATUSES.has(state.status)) {
    throw new Error(`game review requires a completed match (status: ${state.status})`);
  }
  const analysis = analyzeMatch(state, events, config, thresholds);
  const player = analysis.players[playerId];
  if (!player) {
    throw new Error(`player ${playerId} is not a participant of match ${state.matchId}`);
  }
  // Terminal event sequence for the RESULT moment's timeline linkage (BB-267).
  const terminal = events.find(
    (event) => event.type === 'OFFER_ACCEPTED' || event.type === 'WALKED_AWAY' || event.type === 'TIMED_OUT' || event.type === 'MATCH_ABORTED',
  );
  return {
    version: GAME_REVIEW_VERSION,
    curationVersion: REVIEW_CURATION_VERSION,
    featureVersion: analysis.version,
    observationVersion: analysis.observationVersion,
    matchId: state.matchId,
    playerId,
    outcome: player.features.outcome,
    moments: curateReview(player.features, player.observations, terminal?.sequence ?? null),
    timeline: buildTimeline(state, events),
  };
}
