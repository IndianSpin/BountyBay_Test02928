'use client';

/**
 * GOLDEN RUNTIME (BB-265): the app-side half of the founder's
 * golden.js — the same ?t / ?speed / ?pending parameters, the same
 * timeline semantics, and the same instrumentation the checker reads
 * (documentElement[data-golden-ready] + window.__bbTimeline events).
 *
 * Contract steps carry ids from design-sandbox/golden/contracts/
 * <state>.json (non-pending only). ?t=end and prefers-reduced-motion
 * apply every step instantly; ?speed divides every wait.
 */

export interface TimelineStep {
  id: string;
  at: number;
  action: 'show' | 'hide' | 'stamp' | 'class' | 'count' | 'fill' | 'pop' | 'fly' | 'clip';
  target?: string;
  cls?: string;
  text?: string;
  to?: string;
  from?: number;
  countTo?: number;
  dur?: number;
  decimals?: number;
  n?: number;
  character?: string;
  clip?: string;
  loop?: boolean;
  pending?: boolean;
}

export type StepImpl = (step: TimelineStep, instant: boolean) => Promise<void> | void;

export interface GoldenParams {
  t: number | 'end';
  speed: number;
  pending: boolean;
  reduced: boolean;
}

export function goldenParams(): GoldenParams {
  if (typeof window === 'undefined') return { t: 'end', speed: 1, pending: false, reduced: true };
  const Q = new URLSearchParams(window.location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tRaw = Q.get('t');
  return {
    t: tRaw === 'end' || reduced ? 'end' : tRaw !== null ? Number(tRaw) : 0,
    speed: Number(Q.get('speed') || 1),
    pending: Q.get('pending') === '1',
    reduced,
  };
}

let booted = false;
let timelineRan = false;

/** One call per golden page: arm the instrumentation the checker waits on. */
export function bootGoldenTimeline(): void {
  if (booted || typeof window === 'undefined') return;
  booted = true;
  (window as unknown as { __bbTimeline?: { id: string }[] }).__bbTimeline = [];
  document.documentElement.setAttribute('data-golden-ready', '1');
}

export function pushTimelineEvent(id: string): void {
  const w = window as unknown as { __bbTimeline?: { id: string }[] };
  if (w.__bbTimeline) w.__bbTimeline.push({ id });
}

function sleep(ms: number, speed: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms / speed));
}

/** Runs the contract timeline: instant past steps, scheduled future ones, in order. */
export async function runGoldenTimeline(steps: TimelineStep[], impl: StepImpl, params: GoldenParams): Promise<void> {
  // StrictMode double-mounts effects in dev — the first run owns the
  // timeline; a second run would double every __bbTimeline event.
  if (timelineRan) return;
  timelineRan = true;
  const sorted = [...steps].sort((a, b) => a.at - b.at);
  const t0 = performance.now();
  for (const step of sorted) {
    if (step.pending && !params.pending) continue;
    const instant = params.t === 'end' || step.at <= params.t;
    if (instant) {
      await impl(step, true);
      pushTimelineEvent(step.id);
      continue;
    }
    const wait = step.at - Math.max(params.t === 'end' ? 0 : params.t, 0) - (performance.now() - t0) * params.speed;
    if (wait > 0) await sleep(wait, params.speed);
    await impl(step, false);
    pushTimelineEvent(step.id);
  }
}

/** Count-up text (reward counters): the golden.js easing, speed-aware. */
export function countUp(el: HTMLElement, from: number, to: number, ms: number, decimals = 0, speed = 1): void {
  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (!ms) {
    el.textContent = fmt(to);
    return;
  }
  const dur = ms / speed;
  const t0 = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
