'use client';

/**
 * Concession chips (BB-216, D-24): a quiet count with a few coin glyphs
 * — was the 150 px table pile. The count is a real number, always.
 */
export default function ChipMeter({ remaining, total }: { remaining: number; total: number }) {
  const show = Math.max(0, Math.min(remaining, 3));
  return (
    <div className="lm-coins" data-testid="chip-meter" aria-label={`${remaining} concession chips remaining of ${total}`}>
      {Array.from({ length: show }).map((_, i) => (
        <span key={i} className="lm-coins__coin" aria-hidden="true" />
      ))}
      <span className="lm-coins__count num">{remaining} coins</span>
    </div>
  );
}
