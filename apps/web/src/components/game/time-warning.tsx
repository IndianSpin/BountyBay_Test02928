'use client';

import type { TimeTier } from './types';

/** Formats ms as m:ss (e.g. 74_000 -> "1:14"). */
function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Decision-time warning (GR-023/GR-024, docs/09 "Decision-time warnings"):
 * renders the server-derived tier for the active player's running clock.
 * NORMAL renders nothing; LOW TIME is a quiet gold banner; CRITICAL is
 * coral with an assertive live region. Never computes the rule — that is
 * the domain projection's job.
 */
export default function TimeWarning({ tier, remainingMs, who }: { tier: TimeTier | null; remainingMs: number | null; who?: string }) {
  if (tier === null || tier === 'NORMAL') return null;
  const critical = tier === 'CRITICAL';
  return (
    <span
      className={`time-warning${critical ? ' time-warning-critical' : ''}`}
      data-testid="time-warning"
      role="status"
      aria-live={critical ? 'assertive' : 'polite'}
    >
      {who && <b>{who} · </b>}
      {critical ? 'CRITICAL · TIME RUNNING OUT' : 'LOW TIME'}
      {remainingMs !== null && <i className="num"> · {formatClock(remainingMs)}</i>}
    </span>
  );
}
