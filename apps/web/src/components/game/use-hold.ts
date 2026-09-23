'use client';

/**
 * Hold-to-commit gesture (canvas v1, HO-Contracts: accept after 600 ms
 * hold, walk-away after confirm + 1 s hold; boards LMD-06 / LMM-07).
 *
 * Sequence E staging: press (squash) → 90 ms shockwave beat → hold fills →
 * commit. Releasing early, losing pointer capture, or blurring cancels.
 * Keyboard: Space/Enter down starts the hold, key-up commits (docs/09 a11y
 * binding — no hold-only interaction without a keyboard path).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type HoldPhase = 'idle' | 'pressing' | 'holding' | 'stamping';

export interface HoldGesture {
  phase: HoldPhase;
  /** 0..1 fill of the hold duration. */
  progress: number;
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
    onBlur: () => void;
  };
}

/** Optional haptic on press-down (motion-spec §E); no-op where unsupported. */
function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* vibration is optional garnish */
  }
}

export function useHold(holdMs: number, onComplete: () => void, disabled = false): HoldGesture {
  const [phase, setPhase] = useState<HoldPhase>('idle');
  const [progress, setProgress] = useState(0);
  const pressedAt = useRef<number>(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    if (commitTimer.current !== null) clearTimeout(commitTimer.current);
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    holdTimer.current = null;
    commitTimer.current = null;
    raf.current = null;
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setProgress(0);
  }, [clearTimers]);

  const start = useCallback(
    (e?: { preventDefault?: () => void }) => {
      if (disabled || phase !== 'idle') return;
      e?.preventDefault?.();
      pressedAt.current = performance.now();
      setPhase('pressing');
      setProgress(0);
      vibrate(10); // heavy haptic on press-down, not on release (§E)
      // 90 ms shockwave beat, then the hold fill begins (sequence E).
      holdTimer.current = setTimeout(() => {
        setPhase('holding');
        const tick = (): void => {
          const elapsed = performance.now() - pressedAt.current;
          const next = Math.min(1, (elapsed - 90) / (holdMs - 90));
          setProgress(next);
          if (next >= 1) {
            setPhase('stamping');
            vibrate(20);
            onComplete();
            commitTimer.current = setTimeout(reset, 560); // stamp settles, then idle
            return;
          }
          raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      }, 90);
    },
    [disabled, phase, holdMs, onComplete, reset],
  );

  const finish = useCallback(() => {
    if (phase === 'idle' || phase === 'stamping') return;
    // Release before the fill completes cancels the gesture.
    if (phase === 'pressing' || phase === 'holding') reset();
  }, [phase, reset]);

  // Never leave a stale timer mounted.
  useEffect(() => clearTimers, [clearTimers]);

  return {
    phase,
    progress,
    handlers: {
      onPointerDown: (e) => {
        start(e);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerUp: finish,
      onPointerCancel: reset,
      onPointerLeave: () => {
        if (phase === 'pressing' || phase === 'holding') reset();
      },
      onKeyDown: (e) => {
        if (e.key === ' ' || e.key === 'Enter') start(e);
      },
      onKeyUp: finish,
      onBlur: reset,
    },
  };
}
