'use client';

/**
 * PlayerIdentity as the wooden name plaque above the opponent's seat
 * (canvas v1). First-person composition: only the opponent carries a
 * plaque — my identity is my seat light and limit card. Rating numbers
 * are omitted until the rating system ships (P1-M2; DEC-029 deviation).
 */
export interface PlayerStats {
  rating?: number;
  games?: number;
}

export default function PlayerIdentity({
  handle,
  role,
  stats,
  side,
}: {
  handle: string;
  role: 'BUYER' | 'SELLER';
  stats?: PlayerStats;
  side: 'mine' | 'theirs';
}) {
  const sub = [role === 'BUYER' ? 'Buyer' : 'Seller', stats?.games !== undefined && stats.games > 0 ? `${stats.games} games` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={`lm-plaque lm-plaque--${side}`} data-testid={`seat-${side}`}>
      <span className="lm-plaque__name">{handle}</span>
      {sub && <span className="lm-plaque__sub">{sub}</span>}
    </div>
  );
}
