/**
 * Minimal Phase 1 analytics emitter (docs/11, DD Phase 1, DEC-027).
 *
 * No SDK and no analytics table exist yet — the platform ships with P1-M9.
 * This emitter writes one structured JSON line per event to stdout so the
 * required anti-stalling events (match_timed_out, time_tier_entered,
 * extended match_completed) are captured from day one without building the
 * pipeline. The sink parameter is the future swap point: P1-M9 replaces it
 * with a real ingestion path without touching call sites.
 *
 * Privacy: fields are match ids, player ids, modes, times, and rule data.
 * Never add reservation values (docs/10 Logging).
 */

import { viewMatchFor } from '@bounty-bay/domain';
import type { MatchState } from '@bounty-bay/domain';
import type { EconomyConfig } from '@bounty-bay/config';

export type AnalyticsEventName = 'match_timed_out' | 'time_tier_entered' | 'match_completed' | 'review_opened' | 'review_step_viewed';

export type AnalyticsFields = Record<string, string | number | boolean | null>;

export interface AnalyticsEmitter {
  emit(event: AnalyticsEventName, fields: AnalyticsFields): void;
}

/** docs/11 "match_completed extension": completion reason + per-player time/multiplier. */
export function matchCompletedFields(state: MatchState): AnalyticsFields {
  const economy = state.economy;
  const fields: AnalyticsFields = {
    matchId: state.matchId,
    mode: state.mode,
    completionReason: state.completionReason,
  };
  if (!economy) return fields;
  for (const [playerId, player] of Object.entries(economy.players)) {
    fields[`cumulativeActiveMs:${playerId}`] = player.cumulativeActiveMs;
    fields[`clockMultiplier:${playerId}`] = player.clockMultiplier;
  }
  return fields;
}

/**
 * Current tier entries for a match state: one per participant with a
 * non-null tier. The emitter dedupes per (match, player, tier).
 */
export function tierEntriesFor(state: MatchState, config: EconomyConfig, now: number): AnalyticsFields[] {
  const entries: AnalyticsFields[] = [];
  for (const participant of state.participants) {
    const view = viewMatchFor(state, participant.playerId, now, config);
    const pv = view.participants.find((p) => p.playerId === participant.playerId);
    if (!pv || pv.timeTier === null) continue;
    entries.push({
      matchId: state.matchId,
      playerId: participant.playerId,
      tier: pv.timeTier,
      decisionTimeRemainingMs: pv.decisionTimeRemainingMs,
    });
  }
  return entries;
}

export function createAnalyticsEmitter(sink: (line: string) => void = (line) => process.stdout.write(`${line}\n`)): AnalyticsEmitter {
  // time_tier_entered fires at most once per (match, player, tier).
  const seenTiers = new Set<string>();

  return {
    emit(event, fields) {
      if (event === 'time_tier_entered') {
        const key = `${fields.matchId ?? ''}|${fields.playerId ?? ''}|${fields.tier ?? ''}`;
        if (seenTiers.has(key)) return;
        seenTiers.add(key);
      }
      sink(JSON.stringify({ analytics_event: event, ...fields, emitted_at: Date.now() }));
    },
  };
}
