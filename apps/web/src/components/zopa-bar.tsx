'use client';

/**
 * ZOPA reveal visualization (GR-018 / UF-08): seller RV → settlement →
 * buyer RV with each player's captured share. Shares are also carried as
 * data attributes and text so color is never the sole carrier (09).
 */

import { formatPercent, formatTenthsGrouped } from '../lib/format';

interface ZopaBarView {
  participants: { role: 'BUYER' | 'SELLER'; reservationValueTenths?: number }[];
  economy: {
    zopaTenths: number;
    settlementTenths: number | null;
  } | null;
}

export default function ZopaBar({ view }: { view: ZopaBarView }) {
  if (!view.economy || view.economy.settlementTenths === null) {
    return <p className="home-sub">No settlement: the ZOPA stayed unclaimed.</p>;
  }
  const buyerRv = view.participants.find((p) => p.role === 'BUYER')?.reservationValueTenths ?? 0;
  const sellerRv = view.participants.find((p) => p.role === 'SELLER')?.reservationValueTenths ?? 0;
  const zopa = Math.max(1, view.economy.zopaTenths);
  const sellerPercent = ((view.economy.settlementTenths - sellerRv) / zopa) * 100;
  const buyerPercent = 100 - sellerPercent;

  return (
    <div className="zopa" data-testid="zopa-bar">
      <div className="zopa-labels">
        <span>Seller RV {formatTenthsGrouped(sellerRv)}</span>
        <span>Buyer RV {formatTenthsGrouped(buyerRv)}</span>
      </div>
      <div
        className="zopa-track"
        role="img"
        aria-label={`ZOPA from ${formatTenthsGrouped(sellerRv)} to ${formatTenthsGrouped(buyerRv)}, settled at ${formatTenthsGrouped(view.economy.settlementTenths)}`}
      >
        <div className="zopa-seller" style={{ width: `${sellerPercent}%` }} data-share={`seller ${formatPercent(sellerPercent / 100)}`} />
        <div className="zopa-buyer" style={{ width: `${buyerPercent}%` }} data-share={`buyer ${formatPercent(buyerPercent / 100)}`} />
        <span className="zopa-marker" style={{ left: `${sellerPercent}%` }} aria-hidden="true" />
      </div>
      <div className="zopa-labels">
        <span>Seller captured {formatPercent(sellerPercent / 100)}</span>
        <span>Buyer captured {formatPercent(buyerPercent / 100)}</span>
      </div>
    </div>
  );
}
