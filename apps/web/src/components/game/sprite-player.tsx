'use client';

/**
 * Manifest-driven character animation player (BB-242): plays the
 * founder's WebP sprite sheets (12 fps, 400×600 grid cells) per the
 * manifest at /game/anim/manifest.json. Loop clips cycle; one-shots
 * (offer/concede/react/accept/nodeal) play once and hold the last
 * frame. The static pose layer stays underneath as the reduced-motion
 * fallback — this layer renders only when motion is allowed.
 *
 * Alignment is viewport-correct: background-size and -position step in
 * percentages, so the clips line up at any render size.
 */

import { useEffect, useRef, useState } from 'react';

export interface ManifestClip {
  src: string;
  frames: number;
  cols: number;
  rows: number;
  loop: boolean;
  holdLast: boolean;
  durationMs: number;
  use: string;
}

export interface Manifest {
  fps: number;
  cell: { w: number; h: number };
  characters: Record<string, Record<string, ManifestClip>>;
}

let manifestCache: Manifest | null = null;
let manifestLoading: Promise<Manifest> | null = null;

function loadManifest(): Promise<Manifest> {
  if (manifestCache) return Promise.resolve(manifestCache);
  if (manifestLoading) return manifestLoading;
  manifestLoading = fetch('/game/anim/manifest.json')
    .then((res) => (res.ok ? (res.json() as Promise<Manifest>) : Promise.reject(new Error('manifest unavailable'))))
    .then((manifest) => {
      manifestCache = manifest;
      return manifest;
    })
    .catch((err) => {
      manifestLoading = null; // allow a later retry
      throw err;
    });
  return manifestLoading;
}

/** The board's key states map onto the manifest's clip names. */
const POSE_CLIPS: Record<string, string> = {
  idle: 'idle',
  thinking: 'think',
  speaking: 'speak',
  offer: 'offer',
  smug: 'react',
  offline: 'idle',
};

export default function AnimatedOpponent({ character, pose }: { character: string; pose: string }) {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : true,
  );
  const layerRef = useRef<HTMLDivElement | null>(null);

  // reduced motion: the static pose is the whole story (BB-242 rule)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const layer = layerRef.current;
    if (!layer) return;
    let cancelled = false;
    let frame = 0;
    let last = 0;
    let raf = 0;

    void loadManifest()
      .then((manifest) => {
        if (cancelled) return;
        const clipName = POSE_CLIPS[pose] ?? 'idle';
        const clip = manifest.characters[character]?.[clipName] ?? manifest.characters.goldenotter?.[clipName];
        if (!clip) return;
        const stepMs = 1000 / manifest.fps;
        layer.style.backgroundImage = `url('/game/anim/${clip.src}')`;
        layer.style.backgroundSize = `${clip.cols * 100}% ${clip.rows * 100}%`;
        layer.style.opacity = '1';
        const paint = () => {
          const x = ((frame % clip.cols) / (clip.cols - 1)) * 100;
          const y = (Math.floor(frame / clip.cols) / (clip.rows - 1)) * 100;
          layer.style.backgroundPosition = `${x}% ${y}%`;
        };
        const tick = (now: number) => {
          if (cancelled) return;
          if (now - last >= stepMs) {
            last = now;
            if (frame < clip.frames - 1) frame += 1;
            else if (clip.loop) frame = 0;
            paint();
          }
          raf = requestAnimationFrame(tick);
        };
        paint();
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        /* animation is garnish — the static pose remains */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reduced, character, pose]);

  if (reduced) return null;
  return <div ref={layerRef} className="lm-opponent__anim" aria-hidden="true" />;
}
