import type { JSX } from 'react';
import { beatProps } from './golden-frame';
import GoldenPose from './golden-pose';
import { REFERENCE, type GoldenState } from './journey-data';

/**
 * GOLDEN STATE COMPOSITIONS (BB-256): one view per journey state —
 * fixed reference data (BOB vs KESTREL, THE RUBY COMPASS, deal at
 * 74.0), real character art, and every animation driven by the
 * state's timeline (journey-data.ts) via beatAttrs. The GATE checks
 * each data-golden element and each beat against these views.
 */

/** Spreads a timeline beat onto its element: data-golden + data-golden-beat + inline timings. */
function beatAttrs(state: GoldenState, id: string, className = ''): Record<string, unknown> {
  const beat = state.timeline.find((b) => b.element === id);
  const props: Record<string, unknown> = {
    'data-golden': id,
    'data-golden-beat': id,
    className: [className, beat ? (beat.durationMs > 0 ? `gb-beat gb-fx-${beat.effect}` : 'gb-beat') : '']
      .filter(Boolean)
      .join(' '),
  };
  if (beat && beat.durationMs > 0) {
    props.style = beatProps(beat).style;
  }
  return props;
}

/** Plain contract element (present but not timeline-driven). */

const { me, opponent, scenario, deal } = REFERENCE;

function Hub({ active }: { active: string }) {
  const tabs = ['THE BAY', 'PLAY', 'ME'];
  return (
    <div className="gb-hub" aria-label="hub">
      {tabs.map((t) => (
        <span key={t} className={`gb-hub__tab${t === active ? ' gb-hub__tab--on' : ''}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

function Pose({ character, pose, size = '' }: { character: string; pose: 'idle' | 'thinking' | 'speaking' | 'offer' | 'smug' | 'offline'; size?: string }) {
  return <GoldenPose character={character} pose={pose} className={size} />;
}

/** The Bay composition for back-to-bay (the return lands on the hub). */
function BayShell({ state }: { state: GoldenState }) {
  return (
    <>
      <Hub active="THE BAY" />
      <div className="gb-bay" {...beatAttrs(state, 'bb-bay', 'gb-bay')}>
        <section className="gb-card gb-bay__table" {...beatAttrs(state, 'bb-table', 'gb-card gb-bay__table')}>
          <div className="gb-bay__cloth" aria-hidden="true">
            ?
          </div>
          <div>
            <p className="gb-k">PLAY · RANKED · A REAL PERSON</p>
            <p className="gb-h">The table is set.</p>
            <p className="gb-sub">Ranked matchmaking opens with the ranked milestone — meanwhile, challenge a friend below.</p>
            <span className="gb-soon">PLAY RANKED · SOON</span>
          </div>
        </section>
        <section className="gb-card gb-bay__letter" {...beatAttrs(state, 'bb-letter', 'gb-card gb-bay__letter')}>
          <span className="gb-bay__wax" aria-hidden="true" />
          <div>
            <p className="gb-k">KESTREL WANTS A REMATCH</p>
            <p className="gb-sub">The Ruby Compass · sealed letter · unrated — ANSWER</p>
          </div>
        </section>
        <div className="gb-bay__slots">
          {['TODAY’S DEAL', 'MONTHLY BOUNTY', 'LIVE TABLES'].map((k) => (
            <section key={k} className="gb-card gb-bay__slot">
              <p className="gb-k">{k}</p>
              <span className="gb-soon">SOON</span>
            </section>
          ))}
        </div>
        <div className="gb-bay__row">
          <section className="gb-card">
            <p className="gb-k">PRACTICE ROOM · AI</p>
            <p className="gb-h">Warm up against a persona.</p>
            <p className="gb-honest">Unrated, not a person.</p>
            <span className="gb-soon">WARM UP</span>
          </section>
          <aside className="gb-card">
            <p className="gb-k">YOUR STANDING</p>
            <p className="gb-h">{me.name}</p>
            <p className="gb-sub">No deals yet</p>
            <span className="gb-soon">DIVISION · SOON</span>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ---------------- Journey A ---------------- */

export function BayView({ state }: { state: GoldenState }) {
  return (
    <>
      <Hub active="THE BAY" />
      <div className="gb-bay">
        <section className="gb-card gb-bay__table" {...beatAttrs(state, 'bay-table', 'gb-card gb-bay__table')}>
          <div className="gb-bay__cloth" aria-hidden="true">
            ?
          </div>
          <div>
            <p className="gb-k">PLAY · RANKED · A REAL PERSON</p>
            <p className="gb-h">The table is set.</p>
            <p className="gb-sub">Ranked matchmaking opens with the ranked milestone — meanwhile, challenge a friend below.</p>
            <span className="gb-soon">PLAY RANKED · SOON</span>
          </div>
        </section>
        <section className="gb-card gb-bay__letter" {...beatAttrs(state, 'bay-letters', 'gb-card gb-bay__letter')}>
          <span className="gb-bay__wax" aria-hidden="true" />
          <div>
            <p className="gb-k">LETTERS · UNFINISHED BUSINESS</p>
            <p className="gb-sub">Challenges, rematch offers and reviews land here as sealed letters.</p>
            <p className="gb-honest">No sealed letters yet — a rematch offer you set aside becomes a letter.</p>
          </div>
        </section>
        <div className="gb-bay__slots" {...beatAttrs(state, 'bay-slots', 'gb-bay__slots')}>
          {['TODAY’S DEAL', 'MONTHLY BOUNTY', 'LIVE TABLES'].map((k) => (
            <section key={k} className="gb-card gb-bay__slot">
              <p className="gb-k">{k}</p>
              <span className="gb-soon">SOON</span>
            </section>
          ))}
        </div>
        <div className="gb-bay__row">
          <section className="gb-card" {...beatAttrs(state, 'bay-practice', 'gb-card')}>
            <p className="gb-k">PRACTICE ROOM · AI</p>
            <p className="gb-h">Warm up against a persona.</p>
            <p className="gb-honest">Unrated, not a person.</p>
            <span className="gb-soon">WARM UP</span>
          </section>
          <aside className="gb-card" {...beatAttrs(state, 'bay-me', 'gb-card')}>
            <p className="gb-k">YOUR STANDING</p>
            <p className="gb-h">{me.name}</p>
            <p className="gb-sub">No deals yet</p>
            <span className="gb-soon">DIVISION · SOON</span>
          </aside>
        </div>
      </div>
    </>
  );
}

export function BattleSelectionView({ state }: { state: GoldenState }) {
  return (
    <>
      <Hub active="PLAY" />
      <div className="gb-bs">
        <header className="gb-bs__heading" {...beatAttrs(state, 'bs-heading', 'gb-bs__heading')}>
          <p className="gb-k">PLAY · BATTLE SELECTION</p>
          <p className="gb-h">PLAY A PERSON</p>
        </header>
        <section className="gb-card gb-bs__card" {...beatAttrs(state, 'bs-challenge', 'gb-card gb-bs__card')}>
          <p className="gb-k">CHALLENGE SOMEONE</p>
          <p className="gb-h">Bring a friend to the table.</p>
          <p className="gb-honest">A sealed challenge link — one tap to join. Unrated, always.</p>
          <span className="gb-bs__cta">CREATE CHALLENGE</span>
        </section>
        <section className="gb-card gb-bs__card" {...beatAttrs(state, 'bs-practice', 'gb-card gb-bs__card')}>
          <p className="gb-k">PRACTICE — NOT A PERSON</p>
          <p className="gb-h">Warm up against a persona.</p>
          <p className="gb-honest">AI, unrated, never a stand-in for a human table.</p>
          <span className="gb-bs__cta gb-bs__cta--ai">PRACTICE VS AI</span>
        </section>
      </div>
    </>
  );
}

export function ChallengeCreatedView({ state }: { state: GoldenState }) {
  return (
    <>
      <Hub active="PLAY" />
      <div className="gb-cc">
        <section className="gb-card gb-cc__seal" {...beatAttrs(state, 'cc-seal', 'gb-card gb-cc__seal')}>
          <span className="gb-bay__wax" aria-hidden="true" />
          <div>
            <p className="gb-k">CHALLENGE SEALED</p>
            <p className="gb-h">Waiting for an opponent.</p>
            <p className="gb-sub">The seal opens when someone answers. Until then, this table is yours alone.</p>
          </div>
        </section>
        <section className="gb-card">
          <p className="gb-k">THE INVITATION</p>
          <div className="gb-cc__share" {...beatAttrs(state, 'cc-share', 'gb-cc__share')}>
            http://localhost:3000/play?join=2f9c…kestrel-awaits
          </div>
          <p className="gb-honest" {...beatAttrs(state, 'cc-wait', 'gb-honest')}>
            Send the link — the opponent slot below stays empty until they answer.
          </p>
        </section>
      </div>
    </>
  );
}

export function OpponentJoinsView({ state }: { state: GoldenState }) {
  return (
    <div className="gb-oj">
      <div className="gb-oj__door" {...beatAttrs(state, 'oj-door', 'gb-oj__door')}>
        THE DOOR
      </div>
      <section className="gb-card gb-oj__found" {...beatAttrs(state, 'oj-kestrel', 'gb-card gb-oj__found')}>
        <Pose character={opponent.character} pose="idle" size="gb-pose--small" />
        <div>
          <p className="gb-k">OPPONENT FOUND</p>
          <p className="gb-h">{opponent.name} is at the door.</p>
          <p className="gb-sub">A real person, here to deal. Ready when you both are.</p>
        </div>
      </section>
      <div {...beatAttrs(state, 'oj-ready', '')}>
        <span className="gb-lm__btn">READY</span>
      </div>
    </div>
  );
}

export function RoleRevealView({ state }: { state: GoldenState }) {
  return (
    <div className="gb-rr">
      <div>
        <section className="gb-card gb-rr__role" {...beatAttrs(state, 'rr-role', 'gb-card gb-rr__role')}>
          <p className="gb-k">YOUR ROLE</p>
          <p className="gb-h">THE BUYER</p>
        </section>
        <section className="gb-card" {...beatAttrs(state, 'rr-rv', 'gb-card')}>
          <p className="gb-k">YOUR RESERVATION VALUE</p>
          <p className="gb-rr__rv gb-num">{deal.myLimit.toFixed(1)}</p>
          <p className="gb-honest">Private — never shared with {opponent.name}.</p>
        </section>
        <details className="gb-card gb-rr__dossier" {...beatAttrs(state, 'rr-dossier', 'gb-card gb-rr__dossier')}>
          <summary className="gb-k">DOSSIER · {scenario.title}</summary>
          <p className="gb-sub">Same deal, same rules — {me.name} and {opponent.name} meet on The Ruby Compass.</p>
        </details>
      </div>
      <div {...beatAttrs(state, 'rr-opponent', '')}>
        <Pose character={opponent.character} pose="thinking" />
      </div>
    </div>
  );
}

function WorldShell({ state, side }: { state: GoldenState; side: React.ReactNode }) {
  return (
    <div className="gb-lm">
      <section className="gb-lm__world" {...beatAttrs(state, 'lm-world', 'gb-lm__world')}>
        <div className="gb-lm__opp" {...beatAttrs(state, 'lm-opponent', 'gb-lm__opp')}>
          <Pose character={opponent.character} pose="offer" size="gb-pose--small" />
        </div>
        <div className="gb-lm__rail" aria-hidden="true" />
        <div className="gb-lm__cross" {...beatAttrs(state, 'lm-cross', 'gb-lm__cross')}>
          A DEAL IS POSSIBLE
        </div>
        <div className="gb-lm__close" {...beatAttrs(state, 'lm-close', 'gb-lm__close')}>
          THE DEAL IS CLOSING
        </div>
        <div className="gb-lm__plaque" {...beatAttrs(state, 'lm-plaque', 'gb-lm__plaque')}>
          74.0
        </div>
      </section>
      <aside className="gb-lm__side">
        <section className="gb-card">
          <p className="gb-k">YOUR MOVE · {scenario.title}</p>
          <p className="gb-h">Offer, accept or walk.</p>
          <div className="gb-lm__composer" {...beatAttrs(state, 'lm-composer', 'gb-lm__composer')}>
            <input className="gb-lm__input" readOnly value="74.0" aria-label="offer amount" />
            <button type="button" className="gb-lm__btn">
              OFFER
            </button>
          </div>
        </section>
        {side}
      </aside>
    </div>
  );
}

export function LiveMatchView({ state }: { state: GoldenState }) {
  return (
    <WorldShell
      state={state}
      side={
        <section className="gb-card">
          <p className="gb-k">THE RAIL</p>
          <p className="gb-h">{opponent.name} opened at {deal.agreement.toFixed(1)}.</p>
          <p className="gb-sub">Crossed offers — a deal is possible.</p>
        </section>
      }
    />
  );
}

function ResultShell({ state, unrated, prefix }: { state: GoldenState; unrated?: boolean; prefix: string }) {
  return (
    <div className="gb-rs">
      <div className="gb-rs__person" {...beatAttrs(state, `${prefix}-person`, 'gb-rs__person')}>
        <Pose character={opponent.character} pose="smug" />
      </div>
      <div className="gb-rs__panel">
        <div className="gb-rs__limits" {...beatAttrs(state, `${prefix}-limits`, 'gb-rs__limits')}>
          <div className="gb-card gb-rs__limit">
            <p className="gb-k">MY LIMIT</p>
            <p className="gb-h gb-num">{deal.myLimit.toFixed(1)}</p>
          </div>
          <div className="gb-card gb-rs__limit">
            <p className="gb-k">THEIR LIMIT</p>
            <p className="gb-h gb-num">{deal.theirLimit.toFixed(1)}</p>
          </div>
        </div>
        {!unrated && (
          <section className="gb-card" {...beatAttrs(state, 'rs-split', 'gb-card')}>
            <p className="gb-k">THE SPLIT</p>
            <p className="gb-h">
              You captured <span className="gb-num">{deal.captured}</span> of the surplus.
            </p>
            <div className="gb-rs__coins" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="gb-rs__coin" />
              ))}
            </div>
          </section>
        )}
        {!unrated && (
          <section className="gb-card" {...beatAttrs(state, 'rs-ledger', 'gb-card')}>
            <p className="gb-k">THE LEDGER</p>
            <p className="gb-sub">
              Agreement at <span className="gb-num">{deal.agreement.toFixed(1)}</span> · {deal.chipsSpent} chips spent ·{' '}
              {deal.offers} offer
            </p>
          </section>
        )}
        {unrated && (
          <section className="gb-card" {...beatAttrs(state, 'ar-tag', 'gb-card')}>
            <p className="gb-k">PRACTICE · UNRATED</p>
            <p className="gb-sub">This match never touches your standing.</p>
          </section>
        )}
      </div>
    </div>
  );
}

export function ResultView({ state }: { state: GoldenState }) {
  return (
    <>
      <ResultShell state={state} prefix="rs" />
      <div className="gb-rs__ring gb-card" {...beatAttrs(state, 'rs-ring', 'gb-rs__ring gb-card')}>
        <span className="gb-rs__ring-disc" aria-hidden="true" />
        <div>
          <p className="gb-k">{opponent.name.toUpperCase()} WANTS A REMATCH</p>
          <p className="gb-sub">Offer stands 0:12 — then it becomes a letter at The Bay.</p>
        </div>
      </div>
      <div className="gb-rs__actions" {...beatAttrs(state, 'rs-actions', 'gb-rs__actions')}>
        <span className="gb-rs__link">REVIEW THE DEAL ›</span>
        <span className="gb-rs__link">FULL REPLAY ›</span>
        <span className="gb-rs__link">BACK TO THE BAY ›</span>
      </div>
    </>
  );
}

export function ReviewView({ state }: { state: GoldenState }) {
  const moments = [
    { id: 'rv-m-result', k: 'RESULT', h: `YOU CAPTURED ${deal.captured}`, s: `Agreement reached at ${deal.agreement.toFixed(1)} with ${deal.chipsSpent} chips remaining.` },
    { id: 'rv-m-opening', k: 'CONSERVATIVE OPENING', h: 'CAUTIOUS OPENING', s: 'You opened at 21.9 — right beside your own limit.' },
    { id: 'rv-m-limit', k: 'DEAL NEAR OPPONENT LIMIT', h: 'DEAL AT THEIR LIMIT', s: `You settled within 0% of their limit (${deal.theirLimit.toFixed(1)}).` },
    { id: 'rv-m-close', k: 'FAST CLOSE', h: 'CLOSED FAST', s: `From crossed offers to agreement: ${deal.closeMs / 1000}s.` },
    { id: 'rv-m-efficient', k: 'EFFICIENT CLOSE', h: 'EFFICIENT CLOSE', s: `${deal.offers} offers, ${deal.chipsSpent} chips spent.` },
  ];
  return (
    <div className="gb-rv">
      <div>
        <header {...beatAttrs(state, 'rv-header', '')}>
          <p className="gb-k">GAME REVIEW</p>
          <p className="gb-h">{scenario.title}</p>
          <p className="gb-sub">Deterministic facts from your match — nothing here is an opinion.</p>
        </header>
        <div className="gb-rv__moments">
          {moments.map((m) => (
            <section key={m.id} className="gb-card" {...beatAttrs(state, m.id, 'gb-card')}>
              <p className="gb-k">{m.k}</p>
              <p className="gb-h">{m.h}</p>
              <p className="gb-sub">{m.s}</p>
            </section>
          ))}
        </div>
      </div>
      <section className="gb-card" {...beatAttrs(state, 'rv-timeline', 'gb-card')}>
        <p className="gb-k">MATCH TIMELINE</p>
        <ol className="gb-rv__timeline">
          {[
            ['#1', `${opponent.name} opened at ${deal.agreement.toFixed(1)}`],
            ['#2', `You crossed at ${deal.agreement.toFixed(1)} — agreement`],
            ['#3', 'The seal stamps: deal at 74.0'],
          ].map(([n, t]) => (
            <li key={n} className="gb-rv__tli">
              <span className="gb-rv__tn">{n}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function RematchView({ state }: { state: GoldenState }) {
  return (
    <div className="gb-rm">
      <section className="gb-card gb-rm__letter" {...beatAttrs(state, 'rm-letter', 'gb-card gb-rm__letter')}>
        <span className="gb-bay__wax" aria-hidden="true" />
        <div>
          <p className="gb-k">{opponent.name.toUpperCase()} WANTS A REMATCH</p>
          <p className="gb-sub">The Ruby Compass · sealed letter · unrated</p>
          <span className="gb-soon">ANSWER</span>
        </div>
      </section>
      <section className="gb-rm__stage" {...beatAttrs(state, 'rm-stage', 'gb-rm__stage')}>
        <div className="gb-rs__ring gb-card" {...beatAttrs(state, 'rm-ring', 'gb-rs__ring gb-card')}>
          <span className="gb-rs__ring-disc" aria-hidden="true" />
          <div>
            <p className="gb-k">THE SEAL OPENS</p>
            <p className="gb-sub">Offer stands 0:12 — answer before it becomes a letter at The Bay.</p>
          </div>
        </div>
        <div {...beatAttrs(state, 'rm-accept', '')}>
          <span className="gb-lm__btn">ACCEPT REMATCH</span>
          <span className="gb-rs__link">NOT NOW</span>
        </div>
      </section>
    </div>
  );
}

export function BackToBayView({ state }: { state: GoldenState }) {
  return <BayShell state={state} />;
}

/* ---------------- Journey B ---------------- */

export function PracticeEntryView({ state }: { state: GoldenState }) {
  return (
    <>
      <Hub active="THE BAY" />
      <div className="gb-bay" {...beatAttrs(state, 'pe-bay', 'gb-bay')}>
        <section className="gb-card gb-bay__table">
          <div className="gb-bay__cloth" aria-hidden="true">
            ?
          </div>
          <div>
            <p className="gb-k">PLAY · RANKED · A REAL PERSON</p>
            <p className="gb-h">The table is set.</p>
            <span className="gb-soon">PLAY RANKED · SOON</span>
          </div>
        </section>
        <section className="gb-card" {...beatAttrs(state, 'pe-practice', 'gb-card')}>
          <p className="gb-k">PRACTICE ROOM · AI</p>
          <p className="gb-h">Warm up against a persona.</p>
          <p className="gb-honest">Unrated, not a person.</p>
          <span className="gb-soon">WARM UP</span>
        </section>
      </div>
    </>
  );
}

export function PersonaSelectView({ state }: { state: GoldenState }) {
  const personas: { id: string; character: string; name: string; epithet: string }[] = [
    { id: 'ps-card-1', character: 'greylot', name: 'THE ANCHOR', epithet: 'opens high, holds' },
    { id: 'ps-card-2', character: 'hogshead', name: 'THE GRINDER', epithet: 'small steps, no stop' },
    { id: 'ps-card-3', character: 'goldenotter', name: 'THE CLOSER', epithet: 'seals it clean' },
    { id: 'ps-card-4', character: 'mossback', name: 'THE WALL', epithet: 'will not budge' },
    { id: 'ps-card-5', character: 'pipquill', name: 'THE MIRROR', epithet: 'follows the numbers' },
  ];
  return (
    <>
      <header {...beatAttrs(state, 'ps-heading', '')}>
        <p className="gb-k">PRACTICE — NOT A PERSON</p>
        <p className="gb-h">PICK YOUR PRACTICE</p>
      </header>
      <div className="gb-ps">
        {personas.map((p) => (
          <section key={p.id} className="gb-card gb-ps__card" {...beatAttrs(state, p.id, 'gb-card gb-ps__card')}>
            <Pose character={p.character} pose="idle" size="gb-pose--tiny" />
            <p className="gb-h">{p.name}</p>
            <p className="gb-ps__epithet">{p.epithet}</p>
          </section>
        ))}
      </div>
    </>
  );
}

export function AiStartView({ state }: { state: GoldenState }) {
  return (
    <div className="gb-oj">
      <section className="gb-card gb-oj__found" {...beatAttrs(state, 'as-card', 'gb-card gb-oj__found')}>
        <Pose character="goldenotter" pose="idle" size="gb-pose--small" />
        <div>
          <p className="gb-k">PRACTICE · NOT A PERSON</p>
          <p className="gb-h">THE CLOSER takes the chair.</p>
          <p className="gb-sub">A deterministic persona — unrated, and never a stand-in for a human table.</p>
          <span className="gb-soon" {...beatAttrs(state, 'as-tag', 'gb-soon')}>
            PRACTICE · UNRATED
          </span>
        </div>
      </section>
      <div {...beatAttrs(state, 'as-ready', '')}>
        <span className="gb-lm__btn">READY</span>
      </div>
    </div>
  );
}

export function AiTalkView({ state }: { state: GoldenState }) {
  const chain: [string, string, string][] = [
    ['at-observe', 'OBSERVE', 'your opening sits at 21.9'],
    ['at-belief', 'BELIEFS', 'a cautious opener — near your own limit'],
    ['at-action', 'ACTION', 'anchor the counter at 34.0'],
    ['at-intent', 'INTENT', 'probe once, hold the line'],
    ['at-talk', 'TALK', '“You opened careful. I’ll meet you there — 34.0.”'],
    ['at-return', 'RETURN', 'the offer lands; the turn passes to you'],
  ];
  return (
    <div className="gb-at">
      <section className="gb-lm__world" {...beatAttrs(state, 'at-world', 'gb-lm__world')}>
        <div className="gb-lm__opp">
          <Pose character="goldenotter" pose="speaking" size="gb-pose--small" />
        </div>
        <div className="gb-lm__rail" aria-hidden="true" />
        <div className="gb-lm__plaque">34.0</div>
      </section>
      <aside className="gb-at__chain">
        {chain.map(([id, k, line]) =>
          id === 'at-talk' ? (
            <p key={id} className="gb-at__talk" {...beatAttrs(state, id, 'gb-at__talk')}>
              {line}
            </p>
          ) : (
            <p key={id} className="gb-at__link" {...beatAttrs(state, id, 'gb-at__link')}>
              <b>{k}</b> {line}
            </p>
          ),
        )}
      </aside>
    </div>
  );
}

export function AiResultView({ state }: { state: GoldenState }) {
  return (
    <>
      <ResultShell state={state} prefix="ar" unrated />
      <div className="gb-rs__actions" {...beatAttrs(state, 'ar-actions', 'gb-rs__actions')}>
        <span className="gb-rs__link">PLAY AGAIN ›</span>
        <span className="gb-rs__link">BACK TO THE BAY ›</span>
      </div>
    </>
  );
}

export function ProfileTrainingView({ state }: { state: GoldenState }) {
  return (
    <div className="gb-pt">
      <section className="gb-card" {...beatAttrs(state, 'pt-card', 'gb-card')}>
        <p className="gb-k">YOUR STANDING</p>
        <p className="gb-h">{me.name}</p>
        <p className="gb-sub">Practice matches never touch your standing — the ledger records only real deals.</p>
        <span className="gb-soon">DIVISION · SOON</span>
      </section>
      <section className="gb-card">
        <p className="gb-k">TRAINING</p>
        <p className="gb-h" {...beatAttrs(state, 'pt-line', 'gb-h')}>
          You settled <span className="gb-num">{deal.agreement.toFixed(1)}</span> — 2 offers, no chips spent.
        </p>
        <div className="gb-pt__meter" {...beatAttrs(state, 'pt-meter', 'gb-pt__meter')} aria-label="progress 42 percent" />
        <p className="gb-honest">Practice progress is local to you — never a public number.</p>
      </section>
    </div>
  );
}

export function PlayAgainView({ state }: { state: GoldenState }) {
  return (
    <div className="gb-rm">
      <section className="gb-rm__stage" {...beatAttrs(state, 'pa-stage', 'gb-rm__stage')}>
        <div className="gb-rs__person">
          <Pose character="goldenotter" pose="smug" size="gb-pose--small" />
        </div>
        <p className="gb-h">Same table, next deal?</p>
      </section>
      <div className="gb-rs__actions">
        <span className="gb-lm__btn" {...beatAttrs(state, 'pa-again', 'gb-lm__btn')}>
          PLAY AGAIN
        </span>
        <span className="gb-rs__link" {...beatAttrs(state, 'pa-bay', 'gb-rs__link')}>
          BACK TO THE BAY ›
        </span>
      </div>
    </div>
  );
}

export const STATE_VIEWS: Record<string, (props: { state: GoldenState }) => JSX.Element> = {
  bay: BayView,
  'battle-selection': BattleSelectionView,
  'challenge-created': ChallengeCreatedView,
  'opponent-joins': OpponentJoinsView,
  'role-reveal': RoleRevealView,
  'live-match': LiveMatchView,
  result: ResultView,
  review: ReviewView,
  rematch: RematchView,
  'back-to-bay': BackToBayView,
  'practice-entry': PracticeEntryView,
  'persona-select': PersonaSelectView,
  'ai-start': AiStartView,
  'ai-talk': AiTalkView,
  'ai-result': AiResultView,
  'profile-training': ProfileTrainingView,
  'play-again': PlayAgainView,
};
