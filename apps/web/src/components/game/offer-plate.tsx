'use client';

import { formatTenthsGrouped } from '../../lib/format';

/**
 * Hanging offer plaque (canvas v1: gold frame, violet face for their ask,
 * ember face for my offer). Crossed offers gain the green ring.
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
      {tag && <span className="sr-only">{tag}</span>}
      {active && <span className="sr-only">standing</span>}
    </div>
  );
}
