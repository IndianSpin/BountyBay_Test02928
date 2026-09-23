'use client';

import { formatPercent } from '../../lib/format';

/**
 * Clock medallion (canvas v1): gold outer ring, ember (mine) / violet
 * (theirs) enamel, countdown, and the clock-multiplier badge. At the 30%
 * floor the badge greys out and carries the FLOOR tag — the timer never
 * implies further loss (GE-008).
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
    <div
      className={`lm-clock ${side === 'theirs' ? 'lm-clock--opponent' : ''}`}
      data-testid="clock-medallion"
      aria-label={`Clock multiplier ${formatPercent(multiplier)}`}
    >
      <div className="lm-clock__face">
        <span className="lm-clock__k">{side === 'mine' ? 'YOUR MOVE' : 'THINKING'}</span>
        {thinkingMs !== undefined && <span className="lm-clock__v">{fmtClock(thinkingMs)}</span>}
      </div>
      <div className={`lm-clock__mult ${atFloor ? 'lm-clock__mult--floor' : ''}`} title="Clock multiplier">
        ×{Math.round(multiplier * 100)}%{atFloor ? ' · FLOOR' : ''}
      </div>
    </div>
  );
}
