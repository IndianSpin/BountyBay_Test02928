import Link from 'next/link';
import type { ReactNode } from 'react';
import type { GoldenState, TimelineBeat } from './journey-data';

/**
 * GOLDEN FRAME (BB-256): the reference chrome every golden state
 * renders in — journey tag, state number + name, the PRODUCT_HEALTH
 * line, the gallery link, the composition stage, and the timeline
 * readout (the beats, in order — the same data the GATE verifies).
 */

/**
 * Timeline beats become inline animation timings — the single source
 * (journey-data.ts) drives both the page and the gate's expectations.
 * durationMs 0 marks a persistent loop (idle/walk cycles): no CSS
 * animation on the beat element itself.
 */
export function beatProps(beat: TimelineBeat): { className: string; style?: { animationDelay: string; animationDuration: string } } {
  if (beat.durationMs <= 0) return { className: 'gb-beat' };
  return {
    className: `gb-beat gb-fx-${beat.effect}`,
    style: { animationDelay: `${beat.atMs}ms`, animationDuration: `${beat.durationMs}ms` },
  };
}

export default function GoldenFrame({ state, children }: { state: GoldenState; children: ReactNode }) {
  const journeyTag = state.journey === 'A' ? 'JOURNEY A · HUMAN PVP' : 'JOURNEY B · AI PRACTICE';
  return (
    <main className="gb" data-golden="golden-frame" data-state={state.key}>
      <header className="gb__head">
        <span className="gb__tag">{journeyTag}</span>
        <h1 className="gb__title" data-golden="golden-title">
          <span className="gb__ord">{state.order}</span> {state.name}
        </h1>
        <p className="gb__line">{state.line} · golden reference</p>
        <nav className="gb__nav">
          <Link href="/golden" data-golden="golden-gallery-link">
            ‹ gallery
          </Link>
          <span className="gb__vp">1440×900 · 390×844</span>
        </nav>
      </header>
      <div className="gb__stage">{children}</div>
      <footer className="gb__timeline" aria-label="animation timeline">
        {state.timeline.map((beat) => (
          <span key={beat.element} className="gb__beat-note" data-golden-tl={beat.element}>
            <b>{beat.atMs}ms</b> {beat.effect} → {beat.element}
            {beat.durationMs > 0 ? ` (${beat.durationMs}ms)` : ' (loop)'}
          </span>
        ))}
      </footer>
    </main>
  );
}
