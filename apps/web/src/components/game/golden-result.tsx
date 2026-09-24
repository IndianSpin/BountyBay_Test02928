'use client';

/**
 * GOLDEN RESULT (BB-265 G-2): the result rebuilt as a SCENE, not a
 * panel — ported from design-sandbox/golden/states/result.html and
 * driven by the same contract timeline (contracts/result.json,
 * non-pending steps). The deal stays on the table, the person stays
 * in frame, and the reward flies into the counters. Structure, sizes
 * and data-testids follow the golden page; tokens follow the golden
 * palette (golden-result.css). The golden-check CLI measures this
 * component through /dev/states/result?fixture=reference.
 *
 * The component is pure presentation: data in via ResultSceneData,
 * actions out via callbacks. The live adapter (result-reveal.tsx)
 * maps a MatchSnapshot onto it; the dev fixture page maps
 * reference-match.json.
 */

import { useEffect, useRef, useState } from 'react';
import { bootGoldenTimeline, countUp, goldenParams, runGoldenTimeline, type TimelineStep } from '../../lib/golden-runtime';
import AnimatedOpponent from './sprite-player';
import type { CastCharacter } from './character-registry';

export interface ResultSceneData {
  deal: boolean;
  character: CastCharacter;
  opponentHandle: string;
  scenarioTitle: string;
  settlementTenths: number | null;
  myLimitTenths: number | null;
  theirLimitTenths: number | null;
  /** 0..1 */
  myShare: number | null;
  theirShare: number | null;
  myMultiplier: number;
  theirMultiplier: number;
  chipsSpent: number;
  gross: number;
  net: number;
  ratingFrom: number | null;
  ratingTo: number | null;
  rated: boolean;
  ai: boolean;
  completionReason: string | null;
  /** the opponent's in-session rematch proposal (friend mode) */
  incoming: { line: string; windowSec: number } | null;
  rematch:
    | {
        phase: 'idle' | 'proposing' | 'waiting' | 'declined';
        onPropose: () => void;
        onAccept: () => void;
        onDecline: () => void;
        onCancel: () => void;
        waitingFor: string;
      }
    | null;
  /** AI practice: the plain play-again reset path */
  onPlayAgain?: () => void;
  /** BB-262: the post-match progress payload (AI results) — renders the
   *  training surface; absent on the golden fixture page (the checker
   *  measures the base composition). */
  progress?: ResultProgress;
  links: { review: string; replay: string; backToBay: string };
}

/** The BB-258 payload as the result screen consumes it (docs/20). */
export interface ResultProgress {
  trainingHistory: { matchCount: number; confidenceBand: string; bandTransition: string };
  personalRecords: {
    bestSurplusCapture: { value: number; matchId: string } | null;
    fastestCloseMs: { value: number; matchId: string } | null;
    longestHoldMs: { value: number; matchId: string } | null;
    largestConcessionTenths: { value: number; matchId: string } | null;
  };
  skillObservations: { type: string; magnitude: number | null; personaKey: string | null }[];
  activeTrainingGoal: { topicId: string; label: string } | null;
  aiMastery: { overall: { matchCount: number; deals: number; dealRate: number | null; currentDealStreak: number } };
}

const fmt = (v: number, d = 1): string => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (v: number): string => v.toLocaleString('en-US');

function stepsFor(data: ResultSceneData): TimelineStep[] {
  const steps: TimelineStep[] = [
    { id: 'deal-lock', at: 0, action: 'stamp', target: 'result-stamp' },
    { id: 'actions-available', at: 1200, action: 'show', target: 'result-actions' },
    { id: 'limit-mine-turns', at: 1200, action: 'show', target: 'result-limit-mine' },
    { id: 'limit-theirs-turns', at: 2000, action: 'show', target: 'result-limit-theirs' },
  ];
  if (data.deal) {
    steps.push(
      { id: 'zone-fills', at: 2800, action: 'class', target: 'result-range', cls: 'filled' },
      { id: 'headline', at: 3600, action: 'show', target: 'result-headline' },
      { id: 'split', at: 3900, action: 'show', target: 'result-split' },
      { id: 'ledger', at: 4500, action: 'show', target: 'result-ledger' },
      { id: 'bounty-pop', at: 5000, action: 'pop', target: 'result-ledger', text: `+${fmt(data.net)}` },
      { id: 'bounty-fly', at: 5100, action: 'fly', target: 'result-ledger', to: 'reward-bounty-counter', n: 14 },
      { id: 'bounty-count', at: 5500, action: 'count', target: 'bountyV', from: 0, countTo: data.net, dur: 900, decimals: 1 },
    );
    if (data.rated && data.ratingFrom !== null && data.ratingTo !== null) {
      steps.push(
        { id: 'rating-pop', at: 6400, action: 'pop', target: 'rating-counter', text: `+${data.ratingTo - data.ratingFrom}` },
        { id: 'rating-count', at: 6400, action: 'count', target: 'ratingV', from: data.ratingFrom, countTo: data.ratingTo, dur: 900 },
      );
    }
    steps.push(
      { id: 'rematch-offer', at: 9200, action: 'clip', target: 'result-person', character: data.character.key, clip: 'rematch', loop: true },
      { id: 'rematch-card', at: 9300, action: 'show', target: 'rematch-prompt' },
    );
  }
  return steps;
}

export default function GoldenResultScene({ data }: { data: ResultSceneData }) {
  const [personPose, setPersonPose] = useState<string>(data.deal ? 'accept' : 'nodeal');
  const [skipped, setSkipped] = useState(false);
  const steps = useRef<TimelineStep[]>(stepsFor(data)).current;

  useEffect(() => {
    bootGoldenTimeline();
    const params = goldenParams();
    const tid = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

    const impl = (step: TimelineStep, instant: boolean): void => {
      const el = step.target ? tid(step.target) : null;
      switch (step.action) {
        case 'show':
          if (el) {
            el.classList.remove('tl-hidden');
            if (!instant) el.classList.add('tl-show');
          }
          break;
        case 'stamp':
          if (el) {
            el.classList.remove('tl-hidden');
            if (!instant) el.classList.add('enter-stamp');
          }
          break;
        case 'class':
          el?.classList.add(step.cls ?? '');
          break;
        case 'count': {
          const target = tid(step.target ?? '');
          if (target) countUp(target, step.from ?? 0, step.countTo ?? 0, instant ? 0 : step.dur ?? 0, step.decimals ?? 0, params.speed);
          break;
        }
        case 'pop': {
          if (!instant && el) popAt(el, step.text ?? '');
          break;
        }
        case 'fly': {
          if (!instant && el) void flyTo(el, tid(step.to ?? ''), step.n ?? 12, params.speed);
          break;
        }
        case 'clip':
          setPersonPose(step.clip ?? 'idle');
          break;
        case 'hide':
          el?.classList.add('tl-hidden');
          break;
      }
    };

    void runGoldenTimeline(steps, impl, params);
  }, [steps]);

  /** Tap-to-skip (motion-spec: rewards never delay play). */
  function skip(): void {
    if (skipped) return;
    setSkipped(true);
    document.querySelectorAll('.tl-hidden').forEach((el) => el.classList.remove('tl-hidden'));
    document.querySelector('[data-testid="result-range"]')?.classList.add('filled');
    setPersonPose(data.deal ? 'rematch' : 'nodeal');
  }

  const pct = (v: number | null): string => (v === null ? '' : `${Math.round(v * 100)}`);
  const headline = data.deal
    ? { kicker: `DEAL · ${data.scenarioTitle} · ${fmtInt(data.settlementTenths ?? 0)}`, title: `You took ${pct(data.myShare)}% of the deal.` }
    : data.completionReason === 'TIMED_OUT'
      ? { kicker: 'NO DEAL · THE CLOCK HAD ITS SAY', title: 'No deal tonight.' }
      : { kicker: 'NO DEAL', title: 'No deal tonight. The compass will keep.' };

  return (
    <section className="gr-stage" data-testid="market-world" aria-label="result" onClick={skip}>
      <div className="gr-scene-bg dim" aria-hidden="true" />
      {/* the skip affordance carries the result testid (the specs and
          the old overlay contract: visible + click fast-forwards) */}
      <button type="button" className="gr-skip" data-testid="result" aria-label="Skip the reveal" onClick={(e) => { e.stopPropagation(); skip(); }}>
        skip ›
      </button>
      <div className="gr-person" data-testid="result-person" role="img" aria-label={`${data.opponentHandle} stays in frame`}>
        <Person character={data.character} pose={personPose} />
      </div>
      <div className="gr-table-fg" aria-hidden="true" />
      <button type="button" className="gr-menu" aria-label="Match menu" data-testid="match-menu" onClick={(e) => e.stopPropagation()}>
        ⋯
      </button>

      {/* the reward HUD: counters the reward flies into */}
      <div className="gr-hud" data-testid="result-hud">
        <div className="gr-counter" data-testid="reward-bounty-counter">
          <span className="gr-counter__ico" aria-hidden="true">B</span>
          <span>
            <span className="gr-counter__l">BOUNTY THIS DEAL</span>
            <span className="gr-counter__v" data-testid="bountyV">0.0</span>
          </span>
        </div>
        {data.rated && (
          <div className="gr-counter gr-counter--rating" data-testid="rating-counter">
            <span className="gr-counter__ico" aria-hidden="true">★</span>
            <span>
              <span className="gr-counter__l">BOUNTY RATING</span>
              <span className="gr-counter__v" data-testid="ratingV">{fmtInt(data.ratingFrom ?? 0)}</span>
            </span>
          </div>
        )}
      </div>

      {/* the deal on the table */}
      <div className="gr-table" aria-hidden={false}>
        <div data-testid="result-limits">
          <div className="gr-card gr-card--them tl-hidden" data-testid="result-limit-theirs">
            <span className="gr-kicker">HER LIMIT</span>
            <span className="gr-card__num">{data.theirLimitTenths === null ? '—' : fmtInt(data.theirLimitTenths)}</span>
          </div>
          <div className="gr-card gr-card--me tl-hidden" data-testid="result-limit-mine">
            <span className="gr-kicker">YOUR LIMIT</span>
            <span className="gr-card__num">{data.myLimitTenths === null ? '—' : fmtInt(data.myLimitTenths)}</span>
          </div>
        </div>
        <div className="gr-range" data-testid="result-range" role="img" aria-label={`Deal zone ${data.theirLimitTenths ?? '?'} to ${data.myLimitTenths ?? '?'}, settled at ${data.settlementTenths ?? '?'}`}>
          <span className="gr-range__seg gr-range__seg--them" aria-hidden="true" />
          <span className="gr-range__seg gr-range__seg--me" aria-hidden="true" />
        </div>
        <div className="gr-settle" aria-hidden="true">
          <b>{data.settlementTenths === null ? '—' : fmtInt(data.settlementTenths)}</b>
        </div>
        <div className="gr-stamp tl-hidden" data-testid="result-stamp">
          {data.deal ? `DEAL · ${fmtInt(data.settlementTenths ?? 0)}` : 'NO DEAL'}
        </div>
      </div>

      <div className="gr-head tl-hidden" data-testid="result-headline">
        <div className="gr-kicker">{headline.kicker}</div>
        <h1>{headline.title}</h1>
      </div>
      {data.deal && (
        <div className="gr-split tl-hidden" data-testid="result-split">
          <span className="gr-split__me">YOU {pct(data.myShare)}%</span>
          <span className="gr-split__them">{data.opponentHandle.toUpperCase()} {pct(data.theirShare)}%</span>
        </div>
      )}

      <section className="gr-parch gr-ledger tl-hidden" data-testid="result-ledger">
        <h3>The ledger</h3>
        {data.deal ? (
          <>
            <div className="gr-ledger__row">
              <span>Surplus captured</span>
              <b>{pct(data.myShare)}%</b>
            </div>
            <div className="gr-ledger__row">
              <span>Clock multiplier <span className="gr-ledger__small">you · her</span></span>
              <b>×{Math.round(data.myMultiplier * 100)}% · ×{Math.round(data.theirMultiplier * 100)}%</b>
            </div>
            <div className="gr-ledger__row">
              <span>Concession chips spent</span>
              <b>{data.chipsSpent}</b>
            </div>
            <div className="gr-ledger__row">
              <span>Gross bounty <span className="gr-ledger__small">{fmtInt(data.settlementTenths ?? 0)} × {pct(data.myShare)}% × {Math.round(data.myMultiplier * 100)}%</span></span>
              <b>{fmt(data.gross)}</b>
            </div>
            <div className="gr-ledger__row gr-ledger__row--net">
              <span>Net result</span>
              <b>{fmt(data.net)}</b>
            </div>
            {data.rated && (
              <div className="gr-ledger__row gr-ledger__row--opt">
                <span className="gr-ledger__small">Rated · rating change</span>
                <b>+{data.ratingTo !== null && data.ratingFrom !== null ? data.ratingTo - data.ratingFrom : 0}</b>
              </div>
            )}
          </>
        ) : (
          <div className="gr-ledger__row">
            <span>{data.completionReason === 'TIMED_OUT' ? 'No deal — zero bounty for both. Chips stay spent.' : 'No deal — zero bounty for both.'}</span>
            <b>0.0</b>
          </div>
        )}
        {data.ai && (
          <div className="gr-practice" data-testid="practice-tag">
            practice match · unrated
          </div>
        )}
        <a className="gr-ledger__replay" href={data.links.replay} onClick={(e) => e.stopPropagation()}>
          Full replay ›
        </a>
      </section>

      {data.incoming !== null && (
        <section className="gr-parch gr-rematch tl-hidden" data-testid="rematch-prompt">
          <span className="gr-kicker">{data.opponentHandle.toUpperCase()} WANTS THE OTHER SIDE</span>
          <p>“{data.incoming.line}”</p>
          <span className="gr-rematch__ring">
            <i aria-hidden="true" />offer stands 0:12 · then it becomes a letter
          </span>
          {data.rematch !== null && (
            <span className="gr-rematch__row">
              <button type="button" className="gr-btn gr-btn--green" data-testid="rematch-accept" onClick={(e) => { e.stopPropagation(); data.rematch!.onAccept(); }}>
                Accept
              </button>
              <button type="button" className="gr-btn gr-btn--quiet" data-testid="rematch-decline" onClick={(e) => { e.stopPropagation(); data.rematch!.onDecline(); }}>
                Not now
              </button>
            </span>
          )}
        </section>
      )}

      <div className="gr-actions tl-hidden" data-testid="result-actions">
        <a className="gr-btn gr-btn--quiet" href={data.links.review} data-testid="analyze-deal" onClick={(e) => e.stopPropagation()}>
          Review the deal
        </a>
        <button
          type="button"
          className="gr-btn gr-btn--gold"
          data-testid="rematch-button"
          disabled={data.rematch !== null && (data.rematch.phase === 'proposing' || data.rematch.phase === 'waiting')}
          onClick={(e) => {
            e.stopPropagation();
            if (data.rematch !== null) data.rematch.onPropose();
            else data.onPlayAgain?.();
          }}
        >
          <span className="gr-btn__stack">
            {data.rematch !== null && data.rematch.phase === 'waiting'
              ? 'REMATCH SENT'
              : data.ai
                ? 'PLAY AGAIN'
                : 'SWAP SIDES · REMATCH'}
            <span className="gr-btn__sub">{data.ai ? 'same persona · same table' : 'she buys · you sell · same compass'}</span>
          </span>
        </button>
        <a className="gr-btn gr-btn--quiet" href={data.links.backToBay} data-testid="back-to-bay" onClick={(e) => e.stopPropagation()}>
          Back to The Bay
        </a>
        <a className="gr-btn gr-btn--quiet gr-btn--small gr-btn--replay" href={data.links.replay} data-testid="replay-link" onClick={(e) => e.stopPropagation()}>
          Full replay
        </a>
      </div>

      {data.rematch !== null && data.rematch.phase === 'waiting' && (
        <p className="gr-status">
          Rematch proposed — waiting for {data.rematch.waitingFor}.{' '}
          <button type="button" onClick={(e) => { e.stopPropagation(); data.rematch!.onCancel(); }}>Cancel</button>
        </p>
      )}
      {data.rematch !== null && data.rematch.phase === 'declined' && <p className="gr-status">The rematch is no longer open.</p>}
      {data.progress && <ProgressPanel progress={data.progress} matchId={data.links.review.replace('/review/', '')} />}
    </section>
  );
}

/**
 * BB-262: the post-match progress surface (docs/20) — training history,
 * personal records, this match's skill observations, the active goal,
 * and AI mastery. Renders only with a real payload (AI results); the
 * golden fixture page has none, so the checker measures the base
 * composition untouched.
 */
function ProgressPanel({ progress, matchId }: { progress: ResultProgress; matchId: string }) {
  const record = (label: string, value: string, id: string | null, suffix: string) =>
    id !== null ? (
      <div className="gr-prog__row">
        <span>{label}</span>
        <b>
          {value}
          {suffix}
          {id !== matchId && (
            <a className="gr-prog__link" href={`/review/${id}`}>
              record
            </a>
          )}
        </b>
      </div>
    ) : null;
  const obsLabel = (type: string): string =>
    type
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  const transition =
    progress.trainingHistory.bandTransition === 'FIRST_MATCH'
      ? 'First rated mark.'
      : progress.trainingHistory.bandTransition === 'ADVANCED'
        ? 'Confidence band advanced.'
        : 'Same band.';
  const overall = progress.aiMastery.overall;
  return (
    <section className="gr-prog" data-testid="progress-panel" aria-label="Training progress">
      <h3>Training progress</h3>
      <p className="gr-prog__band">
        <span className="gr-kicker">BAND</span> {progress.trainingHistory.confidenceBand} · {progress.trainingHistory.matchCount} matches · {transition}
      </p>
      <div className="gr-prog__records">
        {record('Best surplus', `${Math.round((progress.personalRecords.bestSurplusCapture?.value ?? 0) * 100)}%`, progress.personalRecords.bestSurplusCapture?.matchId ?? null, '')}
        {record('Fastest close', `${((progress.personalRecords.fastestCloseMs?.value ?? 0) / 1000).toFixed(1)}s`, progress.personalRecords.fastestCloseMs?.matchId ?? null, '')}
        {record('Longest hold', `${((progress.personalRecords.longestHoldMs?.value ?? 0) / 1000).toFixed(0)}s`, progress.personalRecords.longestHoldMs?.matchId ?? null, '')}
        {record('Biggest step', `${(progress.personalRecords.largestConcessionTenths?.value ?? 0).toFixed(1)}`, progress.personalRecords.largestConcessionTenths?.matchId ?? null, '')}
      </div>
      {progress.skillObservations.length > 0 && (
        <div className="gr-prog__chips" aria-label="This match taught">
          {progress.skillObservations.slice(0, 4).map((obs, i) => (
            <span key={`${obs.type}-${i}`} className="gr-prog__chip">
              {obsLabel(obs.type)}
              {obs.magnitude !== null && obs.magnitude !== undefined ? ` ×${obs.magnitude}` : ''}
            </span>
          ))}
        </div>
      )}
      {progress.activeTrainingGoal !== null && <p className="gr-prog__goal">Focus: {progress.activeTrainingGoal.label}</p>}
      <p className="gr-prog__mastery">
        <span className="gr-kicker">AI MASTERY</span> {overall.deals} deals of {overall.matchCount}
        {overall.dealRate !== null ? ` · ${Math.round(overall.dealRate * 100)}%` : ''} · streak {overall.currentDealStreak}
      </p>
    </section>
  );
}

/** The person in frame: the static pose crop plus the outcome clip. */
function Person({ character, pose }: { character: CastCharacter; pose: string }) {
  const staticPose = pose === 'accept' ? 'smug' : pose === 'rematch' ? 'idle' : pose === 'nodeal' ? 'idle' : 'idle';
  const cell = pose === 'rematch' ? 13 : (character.cells[staticPose as keyof typeof character.cells] ?? 0);
  return (
    <>
      {character.kind === 'files' ? (
        <img src={`${character.src}-${staticPose}.svg`} alt="" className="gr-person__img" />
      ) : (
        <div className="gr-person__sheet" style={{ backgroundImage: `url('${character.src}')`, backgroundPositionX: `calc(((${cell} + .5) / 15 * 100%))` }} />
      )}
      <AnimatedOpponent character={character.key} pose={pose} />
    </>
  );
}

/* ---- reward-layer primitives (ported from golden.js) ---- */

function popAt(el: HTMLElement, text: string): void {
  const r = el.getBoundingClientRect();
  const p = document.createElement('div');
  p.className = 'gr-pop';
  p.textContent = text;
  p.style.left = `${r.left + r.width / 2}px`;
  p.style.top = `${r.top - 30}px`;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1200);
}

async function flyTo(from: HTMLElement, to: HTMLElement | null, n: number, speed: number): Promise<void> {
  if (to === null) return;
  const r0 = from.getBoundingClientRect();
  const r1 = to.getBoundingClientRect();
  const x0 = r0.left + r0.width / 2;
  const y0 = r0.top + r0.height / 2;
  const x1 = r1.left + r1.width / 2;
  const y1 = r1.top + r1.height / 2;
  for (let k = 0; k < n; k++) {
    const c = document.createElement('div');
    c.className = 'gr-coin';
    document.body.appendChild(c);
    const sx = x0 + (Math.random() - 0.5) * 90;
    const sy = y0 + (Math.random() - 0.5) * 40;
    const mx = (sx + x1) / 2 + (Math.random() - 0.5) * 220;
    const my = Math.min(sy, y1) - 120 - Math.random() * 80;
    const kf = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const d = t * t;
      kf.push({ transform: `translate(${a * sx + b * mx + d * x1 - 13}px, ${a * sy + b * my + d * y1 - 13}px) scale(${1 + 0.35 * Math.sin(Math.PI * t)})` });
    }
    const anim = c.animate(kf, { duration: (620 + k * 35) / speed, easing: 'cubic-bezier(.5,0,.75,.5)', fill: 'forwards' });
    anim.onfinish = () => {
      c.remove();
      to.classList.remove('gr-punch');
      void to.offsetWidth;
      to.classList.add('gr-punch');
    };
    await new Promise((resolve) => setTimeout(resolve, 40 / speed));
  }
}
