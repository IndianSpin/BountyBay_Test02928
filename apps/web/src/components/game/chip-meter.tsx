'use client';

/**
 * Concession chips as the table coin pile (canvas v1). Spent coins stay
 * as ghost outlines; the count is a real number, always.
 */
export default function ChipMeter({ remaining, total }: { remaining: number; total: number }) {
  const show = Math.max(0, Math.min(remaining, 12));
  return (
    <div className="lm-coins" data-testid="chip-meter" aria-label={`${remaining} concession chips remaining of ${total}`}>
      {Array.from({ length: show }).map((_, i) => (
        <span key={i} className="lm-coins__coin" aria-hidden="true" />
      ))}
      <span className="lm-coins__count num">{remaining} coins</span>
    </div>
  );
}
