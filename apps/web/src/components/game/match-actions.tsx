'use client';

import { useState } from 'react';
import { formatTenthsGrouped } from '../../lib/format';
import { useHold } from './use-hold';

/**
 * MatchActions (canvas v1): the crimson SEAL OFFER blob, the green ACCEPT
 * seal — which grows into the breathing crossed seal when offers cross
 * (non-settling: nothing closes until the hold completes) — and the ⋯ menu
 * where Walk away lives behind a confirm sheet (board LMD-07).
 *
 * ACCEPTANCE slice (sequence E): press → 90 ms shockwave → 600 ms hold
 * fill → stamp + commit. Releasing early cancels. Pressing accept acts
 * only on my turn (domain GR-014); D7 stays open.
 */

const ACCEPT_HOLD_MS = 600;
const WALK_HOLD_MS = 1000;

export default function MatchActions({
  canOffer,
  canAccept,
  acceptAmountTenths,
  pending,
  onOffer,
  onAccept,
  onWalkAway,
  sealAmount,
  crossed,
}: {
  canOffer: boolean;
  canAccept: boolean;
  acceptAmountTenths: number | null;
  pending: boolean;
  onOffer: () => void;
  onAccept: () => void;
  onWalkAway: () => void;
  sealAmount?: string | null;
  crossed?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button type="button" className="lm-seal" data-testid="make-offer" onClick={onOffer} disabled={pending || !canOffer}>
        <span className="lm-seal__k">SEAL OFFER</span>
        {sealAmount && <span className="lm-seal__v">{sealAmount}</span>}
      </button>
      {canAccept && acceptAmountTenths !== null && (
        <AcceptSeal
          acceptAmountTenths={acceptAmountTenths}
          crossed={crossed === true}
          pending={pending}
          onAccept={onAccept}
        />
      )}
      <button
        type="button"
        className="lm-round-btn lm-round-btn--menu"
        data-testid="menu-button"
        aria-label="Match menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        ⋯
      </button>
      {menuOpen && !confirming && (
        <div className="lm-menu-sheet" data-testid="match-menu">
          <button type="button" className="lm-walk" data-testid="walk-button" onClick={() => setConfirming(true)} disabled={pending}>
            Walk away
          </button>
          <button type="button" onClick={() => setMenuOpen(false)}>
            Keep negotiating
          </button>
        </div>
      )}
      {menuOpen && confirming && (
        <div className="lm-menu-sheet lm-confirm-sheet" data-testid="walk-confirm-sheet" role="dialog" aria-modal="true">
          <p className="lm-confirm__copy">Walk away? The match ends with zero bounty for both players.</p>
          <WalkAwayHold
            pending={pending}
            onConfirm={() => {
              setConfirming(false);
              setMenuOpen(false);
              onWalkAway();
            }}
          />
          <button type="button" onClick={() => setConfirming(false)}>
            Keep negotiating
          </button>
        </div>
      )}
    </>
  );
}

/** The green accept seal — hold 600 ms to commit (sequence E, LMD-06/LMM-07). */
function AcceptSeal({
  acceptAmountTenths,
  crossed,
  pending,
  onAccept,
}: {
  acceptAmountTenths: number;
  crossed: boolean;
  pending: boolean;
  onAccept: () => void;
}) {
  const hold = useHold(ACCEPT_HOLD_MS, onAccept, pending);
  const { phase } = hold;
  const shocked = phase === 'holding' || phase === 'stamping';
  const pressed = phase === 'pressing' || phase === 'holding';

  return (
    <>
      {shocked && <span key={phase === 'stamping' ? 'stamp' : 'hold'} className="lm-shockwave" aria-hidden="true" />}
      <button
        type="button"
        className={`lm-accept ${crossed ? 'lm-accept--crossed' : ''} ${pressed ? 'lm-accept--pressed' : ''} ${phase === 'stamping' ? 'lm-accept--stamping' : ''}`}
        data-testid="accept-button"
        aria-describedby="accept-hold-hint"
        disabled={pending}
        {...hold.handlers}
      >
        {crossed ? (
          <span className="lm-accept__face">
            <span className="lm-accept__k">ACCEPT</span>
            {formatTenthsGrouped(acceptAmountTenths)}
          </span>
        ) : (
          `Accept ${formatTenthsGrouped(acceptAmountTenths)}`
        )}
        {(pressed || phase === 'stamping') && (
          <span className="lm-accept__fill" style={{ width: `${Math.round(hold.progress * 100)}%` }} aria-hidden="true" />
        )}
        <span id="accept-hold-hint" className="sr-only">
          Hold to accept the standing offer.
        </span>
      </button>
    </>
  );
}

/** Walk-away confirm: hold 1 s after the sheet's confirmation (HO-Contracts). */
function WalkAwayHold({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  const hold = useHold(WALK_HOLD_MS, onConfirm, pending);
  const active = hold.phase !== 'idle';
  return (
    <button
      type="button"
      className={`lm-walk lm-walk--hold ${active ? 'lm-walk--holding' : ''}`}
      data-testid="walk-confirm"
      disabled={pending}
      {...hold.handlers}
    >
      Hold to walk away
      {active && (
        <span className="lm-walk__fill" style={{ width: `${Math.round(hold.progress * 100)}%` }} aria-hidden="true" />
      )}
    </button>
  );
}
