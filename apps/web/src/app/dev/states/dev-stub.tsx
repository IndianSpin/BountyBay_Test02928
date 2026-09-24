'use client';

/**
 * BB-265 G-1: the instrumented placeholder for golden states that
 * have not been rebuilt yet. It arms the golden runtime (goldenReady
 * + __bbTimeline) so golden-check runs against the route and the
 * failure list IS the gap list for G-3/G-4. The real builds replace
 * this file's usage, never this pattern.
 */

import { useEffect } from 'react';
import { bootGoldenTimeline } from '../../../lib/golden-runtime';

export default function DevStub({ state }: { state: string }) {
  useEffect(() => {
    bootGoldenTimeline();
  }, []);
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#101A20',
        color: '#F3EEDD',
        fontFamily: 'system-ui',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: '44ch' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, letterSpacing: '.08em' }}>GOLDEN STATE · {state}</h1>
        <p style={{ margin: 0, color: '#93A6AD', fontSize: 14 }}>
          Not yet rebuilt to the golden reference — the checker gap list drives the rebuild (BB-265 G-3/G-4).
        </p>
      </div>
    </main>
  );
}
