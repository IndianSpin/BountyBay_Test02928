'use client';

import { formatTenthsGrouped } from '../../lib/format';

/**
 * Price rail (canvas v1): schematic positions only — the opponent's
 * reservation value is NEVER drawn pre-result (GR-002), so the rail has
 * no absolute scale. The pins close as the gap closes; crossed offers
 * overlap with the green breathing segment. A ghost pin shows the
 * proposed offer while composing.
 */
export default function GapMeter({
  mineTenths,
  theirsTenths,
  crossed,
  proposedTenths,
  myTrail = [],
  theirTrail = [],
}: {
  mineTenths: number | null;
  theirsTenths: number | null;
  crossed: boolean;
  /** The composer's raw value; presence only — the rail is schematic, so the ghost pin rides a fixed offset toward their pin. */
  proposedTenths?: string | null;
  /** PV-Seq: the public offer trails (oldest first) — shown under each rail end, never interpreted. */
  myTrail?: number[];
  theirTrail?: number[];
}) {
  const format = (n: number): string => formatTenthsGrouped(n);
  let minePct = 40;
  let theirsPct = 60;
  let gapOn = false;
  if (mineTenths !== null && theirsTenths !== null) {
    if (crossed) {
      minePct = 50;
      theirsPct = 50;
    } else {
      // the pins close as the gap shrinks (schematic, no absolute scale)
      const span = Math.max(Math.abs(mineTenths - theirsTenths), 1);
      const closeness = Math.min(1, 5000 / span); // saturates around 50 units of gap
      minePct = 50 - 12 * closeness;
      theirsPct = 50 + 12 * closeness;
    }
    gapOn = true;
  }

  const gapStyle = gapOn
    ? crossed
      ? // both pins meet at 50% — the green crossing band stays a visible
        // centered stripe around them (board LMR-D-03)
        { left: '43%', width: '14%' }
      : { left: `${minePct}%`, width: `${theirsPct - minePct}%` }
    : undefined;

  return (
    <div className="lm-rail" data-testid="price-rail" aria-label="offer rail">
      <div className="lm-rail__track" />
      {gapStyle && <div className={crossed ? 'lm-rail__overlap' : 'lm-rail__gap'} style={gapStyle} />}
      {mineTenths !== null && (
        <span className="lm-rail__pin lm-rail__pin--player" style={{ left: `${minePct}%` }} title="your standing offer" />
      )}
      {proposedTenths !== null && proposedTenths !== undefined && proposedTenths.trim() !== '' && !crossed && (
        <span
          className="lm-rail__pin lm-rail__pin--ghost"
          style={{ left: `${Math.min(98, Math.max(2, minePct + 6))}%` }}
          title="proposed offer"
        />
      )}
      {theirsTenths !== null && (
        <span className="lm-rail__pin lm-rail__pin--opponent" style={{ left: `${theirsPct}%` }} title="their standing offer" />
      )}
      {/* PV-Seq: words vs behaviour side by side — the trail is public
          data, displayed without interpretation */}
      {theirTrail.length > 0 && (
        <span className="lm-rail__trail lm-rail__trail--theirs">{theirTrail.map(format).join(' → ')}</span>
      )}
      {myTrail.length > 0 && (
        <span className="lm-rail__trail lm-rail__trail--mine">{myTrail.map(format).join(' → ')}</span>
      )}
    </div>
  );
}
