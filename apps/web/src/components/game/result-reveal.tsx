'use client';

/**
 * Result reveal (canvas v1, sequences E–F and boards RS-*, DEC-029):
 * DEAL stamp → limits flip → range posts → settlement → coin split →
 * headline → actions. Beats are staged and skippable (tap fast-forwards;
 * motion-spec: rewards never delay play). Reduced motion: the final state
 * renders instantly. Level-1 facts only — the numbers come from the
 * authoritative terminal view (GR-018: both limits are now public).
 */

import { useEffect, useState } from 'react';
import { formatPercent, formatTenthsGrouped } from '../../lib/format';
import ZopaBar from '../../components/zopa-bar';
import type { MatchSnapshot } from '../../components/game/types';

const BEAT_TIMES = [0, 1100, 2000, 2600, 3000, 4000] as const;
const FINAL_BEAT = BEAT_TIMES.length; // actions

function beatNumber(beat: number, index: number): boolean {
  return beat >= index;
}

export default function ResultReveal({
  snapshot,
  userId,
  onRematch,
  matchId,
}: {
  snapshot: MatchSnapshot;
  userId: string;
  onRematch: () => void;
  matchId: string;
}) {
  const view = snapshot.view;
  const me = view.participants.find((p) => p.playerId === userId)!;
  const opponent = view.participants.find((p) => p.playerId !== userId)!;
  const ai = snapshot.aiOpponents[0] ?? null;
  const deal = view.status === 'DEAL';
  const myShare = view.economy
    ? view.myRole === 'BUYER'
      ? view.economy.buyerSurplusShare
      : view.economy.sellerSurplusShare
    : null;
  const myEconomy = view.economy?.players[userId];
  const dealWasPossible = (view.economy?.zopaTenths ?? 0) > 0;

  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setBeat(FINAL_BEAT);
      return;
    }
    const timers = BEAT_TIMES.map((t, i) => setTimeout(() => setBeat((b) => Math.max(b, i + 1)), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  function skip(): void {
    setBeat(FINAL_BEAT);
  }

  const headline = deal
    ? `YOU CAPTURED ${Math.round((myShare ?? 0) * 100)}%`
    : dealWasPossible
      ? 'NO DEAL · A DEAL WAS POSSIBLE'
      : 'NO DEAL';
  const headlineClass = !deal ? 'lm-headline--ink' : (myShare ?? 0) >= 0.65 ? 'lm-headline--brass' : (myShare ?? 0) < 0.35 ? 'lm-headline--ink' : '';

  return (
    <section className="lm-result-overlay" aria-label="result" data-testid="result" onClick={skip}>
      <div className="lm-result-stage">
        {/* beat 0: the stamp */}
        {beatNumber(beat, 0) && (
          <div className={`lm-stamp ${deal ? 'lm-stamp--deal anim-slam' : 'lm-stamp--nodeal anim-slam'}`} data-testid="result-stamp">
            {deal ? 'DEAL' : 'NO DEAL'}
          </div>
        )}

        {/* beat 1: both limits flip (public now — GR-018) */}
        {beatNumber(beat, 1) && (
          <div className="lm-limits" data-testid="result-limits">
            <div className={`lm-limit-flip lm-limit-flip--mine anim-rise d1`}>
              <span className="lm-limit-flip__k">MY LIMIT</span>
              <span className="lm-limit-flip__v num">{formatTenthsGrouped(view.myReservationValueTenths ?? 0)}</span>
            </div>
            <div className={`lm-limit-flip lm-limit-flip--theirs anim-rise d2`}>
              <span className="lm-limit-flip__k">THEIR LIMIT</span>
              <span className="lm-limit-flip__v num">{formatTenthsGrouped(opponent.reservationValueTenths ?? 0)}</span>
            </div>
          </div>
        )}

        {/* beats 2–3: the range and the settlement */}
        {beatNumber(beat, 2) && view.economy && (
          <div className="lm-range anim-fade" data-testid="result-range">
            <ZopaBar view={view} />
            <p className="lm-range__line home-sub">
              ZOPA {formatTenthsGrouped(view.economy.zopaTenths)} · your RV {formatTenthsGrouped(view.myReservationValueTenths ?? 0)} · opponent RV{' '}
              {formatTenthsGrouped(opponent.reservationValueTenths ?? 0)} · {view.economy.ratedEligible ? 'rated' : 'unrated'}
            </p>
          </div>
        )}

        {/* beat 4: the coin split */}
        {beatNumber(beat, 4) && deal && myShare !== null && (
          <div className="lm-split anim-rise" data-testid="result-split" aria-label={`Surplus split: you ${formatPercent(myShare)}`}>
            <div className="lm-split__pile lm-split__pile--mine">
              {Array.from({ length: Math.min(12, Math.max(1, Math.round(myShare * 12))) }).map((_, i) => (
                <span key={i} className="lm-split__coin" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
            <span className="lm-split__label num">
              {formatPercent(myShare)} · them {formatPercent(view.economy ? (view.myRole === 'BUYER' ? view.economy.sellerSurplusShare : view.economy.buyerSurplusShare) ?? 0 : 0)}
            </span>
          </div>
        )}

        {/* beat 5: the headline */}
        {beatNumber(beat, 5) && (
          <h3 className={`lm-headline ${headlineClass} anim-rise`} data-testid="result-headline">
            {headline}
          </h3>
        )}

        {/* beat 6: the ledger and the actions */}
        {beatNumber(beat, FINAL_BEAT) && (
          <div className="lm-ledger anim-rise" data-testid="result-ledger">
            {deal ? (
              <>
                <p className="lm-ledger__line">
                  Deal at <b className="num">{formatTenthsGrouped(view.settlementTenths ?? 0)}</b> · clock multiplier{' '}
                  {formatPercent(myEconomy?.clockMultiplier ?? 1)} · concession cost {myEconomy?.chipsSpent ?? 0} chips · net{' '}
                  <b className="num">{(myEconomy?.netResult ?? 0).toFixed(2)}</b>
                </p>
              </>
            ) : (
              <p className="lm-ledger__line">
                {view.completionReason === 'TIMED_OUT'
                  ? snapshot.timeoutPlayerId === userId
                    ? 'No deal - you ran out of time. Zero bounty for both.'
                    : 'No deal - your opponent ran out of time. Zero bounty for both.'
                  : 'No deal - zero bounty for both. Chips stay spent.'}
              </p>
            )}
            {ai && (
              <p className="practice-tag" data-testid="practice-tag">
                practice match · unrated
              </p>
            )}
            <div className="lm-result-actions">
              <button type="button" className="lm-rematch-seal" data-testid="rematch-button" onClick={onRematch}>
                REMATCH
              </button>
              <a className="lm-result-link" href={`/review/${matchId}`} data-testid="analyze-deal">
                Analyze deal
              </a>
              <a className="lm-result-link" href={`/replay/${matchId}`} data-testid="replay-link">
                Replay
              </a>
              <a className="lm-result-link" href="/play">
                Play again
              </a>
            </div>
          </div>
        )}
      </div>
      {beat < FINAL_BEAT && <p className="lm-skip-hint">Tap to see everything at once</p>}
    </section>
  );
}
