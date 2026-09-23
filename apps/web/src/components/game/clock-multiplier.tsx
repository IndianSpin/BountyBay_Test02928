'use client';

import { formatPercent } from '../../lib/format';

/**
 * Clock chip (BB-216, D-24): the quiet-row countdown + clock-multiplier
 * badge — was the 150 px medallion. The turn label lives on the turn
 * chip (turn-banner) only; duplication was part of the scale inflation.
 * At the 30% floor the badge greys out and carries the FLOOR tag — the
 * timer never implies further loss (GE-008).
 */

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `0:${String(s).padStart(2, '0')}`;
}

export default function ClockMultiplier({
  multiplier,
  thinkingMs,
  side,
  atFloor,
}: {
  multiplier: number;
  thinkingMs?: number;
  side: 'mine' | 'theirs';
  atFloor?: boolean;
}) {
  return (
    <span
      className={`lm-clock ${side === 'theirs' ? 'lm-clock--opponent' : ''}`}
      data-testid="clock-medallion"
      aria-label={`Clock multiplier ${formatPercent(multiplier)}`}
    >
      {thinkingMs !== undefined && <span className="lm-clock__v">{fmtClock(thinkingMs)}</span>}
      <span className={`lm-clock__mult ${atFloor ? 'lm-clock__mult--floor' : ''}`} title="Clock multiplier">
        ×{Math.round(multiplier * 100)}%{atFloor ? ' · FLOOR' : ''}
      </span>
    </span>
  );
}
