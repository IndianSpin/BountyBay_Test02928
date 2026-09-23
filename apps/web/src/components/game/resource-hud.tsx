'use client';

import { formatPercent } from '../../lib/format';

/**
 * ResourceHUD (canvas v1): the opponent's side gear — clock-multiplier
 * badge and chip count. My side's resources are the dedicated medallion
 * and coin pile; this component renders null for mine.
 */
export default function ResourceHUD({
  side,
  multiplier,
  remainingChips,
  totalChips,
  thinkingMs,
  confidential,
}: {
  side: 'mine' | 'theirs';
  multiplier: number;
  remainingChips: number;
  totalChips: number;
  thinkingMs?: number;
  confidential?: { limitTenths?: number; mandate?: string };
}) {
  if (side === 'mine') return null;
  return (
    <div className="lm-opponent-hud" data-testid="opponent-hud">
      <div className="lm-opponent__clock-mult" title="Their clock multiplier">
        ×{Math.round(multiplier * 100)}%
      </div>
      <span className="lm-opponent__coins num">{remainingChips} coins</span>
    </div>
  );
}
