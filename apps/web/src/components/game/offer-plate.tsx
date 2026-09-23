'use client';

import { formatTenthsGrouped } from '../../lib/format';

/**
 * Offer plaque (BB-216, D-24): THE one hanging plaque for their ask
 * (gold frame, violet face, display-size number — the only display
 * number on screen). My standing offer renders through the same
 * component but is styled as a quiet readout (no frame, UI size) —
 * one plaque, not two. Crossed offers gain the green ring.
 */
export default function OfferPlate({
  kind,
  who,
  amountTenths,
  tag,
  active,
  crossed,
  testId,
}: {
  kind: 'mine' | 'theirs';
  who: string;
  amountTenths: number | null;
  tag?: string;
  active?: boolean;
  crossed?: boolean;
  testId: string;
}) {
  return (
    <div
      className={`lm-offer ${kind === 'mine' ? 'lm-offer--mine' : 'lm-offer--theirs'} ${crossed ? 'lm-offer--crossed anim-pop' : ''}`}
      data-testid={testId}
    >
      <div className="lm-offer__face">
        <div className="lm-offer__k">{who}</div>
        <div className="lm-offer__v">{amountTenths === null ? '—' : formatTenthsGrouped(amountTenths)}</div>
      </div>
      {tag && (kind === 'mine' ? <span className="lm-offer__tag">{tag}</span> : <span className="sr-only">{tag}</span>)}
      {active && <span className="sr-only">standing</span>}
    </div>
  );
}
