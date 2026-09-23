/**
 * TimeoutScheduler (GR-023/GR-024, DD Phase 1, DEC-027).
 *
 * Drives the hard personal decision-time budget for every ACTIVE match
 * (human and AI turns alike — uniform rule). Mirrors the AiTurnEngine
 * restart-safety pattern: in-memory timers (single API instance),
 * `bootScan` on API ready, idempotent `refresh` on every state change, and
 * a domain re-check under the row lock before the timeout commits. The
 * domain validates due-ness (`TIMEOUT_NOT_DUE`), so a misfired or early
 * timer can never fabricate a timeout (SI-009); a late fire is still legal
 * (the domain guard has been rejecting gameplay commands in the meantime).
 */

import { effectiveHardDecisionLimitMs } from '@bounty-bay/config';
import { elapsedActiveMs } from '@bounty-bay/domain';
import type { MatchCommandService, PrismaClient } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import type { MatchBroadcaster } from './realtime';
import { matchCompletedFields, tierEntriesFor, type AnalyticsEmitter } from './analytics';

export interface TimeoutSchedulerOptions {
  service: MatchCommandService;
  prisma: PrismaClient;
  broadcast: MatchBroadcaster;
  analytics?: AnalyticsEmitter;
}

export class TimeoutScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly options: TimeoutSchedulerOptions) {}

  /** Called on API ready: any ACTIVE match left mid-turn (e.g. after a restart) re-arms. */
  async bootScan(): Promise<void> {
    const pending = await this.options.prisma.match.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    for (const row of pending) await this.refresh(row.id);
  }

  /** Idempotent: cancels any pending timer and re-arms for the remaining budget. */
  async refresh(matchId: string): Promise<void> {
    const existing = this.timers.get(matchId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(matchId);
    }

    const snapshot = await this.options.service.loadSnapshot(matchId);
    if (!snapshot) return;
    const { state, config } = snapshot;
    if (state.status !== 'ACTIVE' || state.activePlayerId === null) return;
    const limit = effectiveHardDecisionLimitMs(config);
    if (limit === null) return; // legacy config: no hard decision-time budget

    const active = state.participants.find((p) => p.playerId === state.activePlayerId);
    if (!active) return;
    const remaining = Math.max(0, limit - elapsedActiveMs(active, state, Date.now()));
    const timer = setTimeout(() => void this.fireTimeout(matchId, state.activePlayerId!), remaining);
    timer.unref();
    this.timers.set(matchId, timer);
  }

  private async fireTimeout(matchId: string, expectedPlayerId: string): Promise<void> {
    this.timers.delete(matchId);
    try {
      const snapshot = await this.options.service.loadSnapshot(matchId);
      if (!snapshot) return;
      const { state } = snapshot;
      // Re-check under no lock first; the service re-checks under the row
      // lock. Turn may have transferred or the match may have ended since
      // the timer was armed.
      if (state.status !== 'ACTIVE' || state.activePlayerId === null || state.activePlayerId !== expectedPlayerId) return;

      const outcome = await this.options.service.timeout({
        kind: 'TIMEOUT',
        matchId,
        playerId: state.activePlayerId,
        commandId: randomUUID(),
        now: Date.now(),
      });
      if (!outcome.ok) {
        // Fired early (clock skew): the domain says the limit is not reached.
        // Re-arm for the remaining budget — never fabricate a timeout.
        if (outcome.code === 'TIMEOUT_NOT_DUE') await this.refresh(matchId);
        return;
      }

      const after = await this.options.service.loadSnapshot(matchId);
      this.options.broadcast(matchId, outcome.events, after);
      const timedOut = state.participants.find((p) => p.playerId === state.activePlayerId);
      this.options.analytics?.emit('match_timed_out', {
        matchId,
        mode: state.mode,
        playerId: state.activePlayerId,
        cumulativeActiveMs: timedOut?.cumulativeActiveMs ?? null,
      });
      if (after) {
        this.options.analytics?.emit('match_completed', matchCompletedFields(after.state));
        for (const entry of tierEntriesFor(after.state, after.config, Date.now())) {
          this.options.analytics?.emit('time_tier_entered', entry);
        }
      }
    } catch (err) {
      // Never crash the API on a scheduling fault; bootScan / lazy refresh
      // re-arm on the next hook.
      console.error(`[timeout] scheduling fault for match ${matchId}:`, err);
    }
  }
}
