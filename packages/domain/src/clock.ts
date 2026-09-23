/**
 * Server-authoritative time (GR-014, GR-016, GE-008; 06_ARCHITECTURE.md §5).
 *
 * The canonical clock is never decremented second-by-second: cumulative
 * active ms is persisted per player, and elapsed time is derived as
 * `stored_cumulative + (server_now - turn_started_at)` at any moment.
 * Clients only project from server timestamps.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import type { MatchState, ParticipantState } from './types';

/** Derived live elapsed active ms for a participant at `now`. */
export function elapsedActiveMs(participant: ParticipantState, state: MatchState, now: number): number {
  if (state.activePlayerId !== participant.playerId || state.turnStartedAt === null) {
    return participant.cumulativeActiveMs;
  }
  return participant.cumulativeActiveMs + Math.max(0, now - state.turnStartedAt);
}

/**
 * GE-008: `multiplier(t) = max(floor, 1 - (1 - floor) * min(t / T_floor, 1))`
 * with the per-turn grace subtracted first. Never recovers (monotonic in t).
 * v0.1 floor is the settled 0.30 product decision.
 */
export function clockMultiplier(elapsedMs: number, config: EconomyConfig): number {
  if (elapsedMs <= config.turnGraceMs) return 1;
  const effective = elapsedMs - config.turnGraceMs;
  const fraction = Math.min(effective / config.clockFloorMs, 1);
  const decay = (1 - config.clockFloorMultiplier) * fraction;
  return Math.max(config.clockFloorMultiplier, 1 - decay);
}
