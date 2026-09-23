'use client';

/**
 * Development build landing (DEC-024 testing flow). Rendered ONLY by the
 * server component when Clerk keys are absent AND the build is not a
 * production build, so the dev surface is structurally absent outside
 * development. Temporary; the Royale landing replaces it in Phase 6.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEV_SLOTS, ensureDevIdentity, signInAsDevSlot } from '../lib/dev-auth';

export default function DevLanding() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function play(): Promise<void> {
    setBusy('play');
    setError(null);
    try {
      await ensureDevIdentity();
      router.push('/play');
    } catch {
      setError('Dev sign-in is unavailable. Is the API running on port 4000?');
      setBusy(null);
    }
  }

  async function openAs(slot: (typeof DEV_SLOTS)[number]): Promise<void> {
    setBusy(slot.id);
    setError(null);
    try {
      await signInAsDevSlot(slot);
      router.push('/play');
    } catch {
      setError('Dev sign-in is unavailable. Is the API running on port 4000?');
      setBusy(null);
    }
  }

  async function practice(): Promise<void> {
    setBusy('practice');
    setError(null);
    try {
      await ensureDevIdentity();
      router.push('/play?practice=1');
    } catch {
      setError('Dev sign-in is unavailable. Is the API running on port 4000?');
      setBusy(null);
    }
  }

  return (
    <div className="dev-landing" data-testid="dev-landing">
      <p className="home-sub">
        DEVELOPMENT BUILD · no sign-up needed. Each browser gets its own identity automatically, or pick a named test player.
      </p>
      <div className="dev-actions">
        <button type="button" className="play-button" data-testid="dev-play-button" onClick={play} disabled={busy !== null}>
          {busy === 'play' ? 'Entering…' : 'PLAY'}
        </button>
        <button type="button" className="play-button secondary" data-testid="dev-practice-button" onClick={practice} disabled={busy !== null}>
          {busy === 'practice' ? 'Entering…' : 'Practice vs AI'}
        </button>
        {DEV_SLOTS.map((slot) => (
          <button
            key={slot.id}
            type="button"
            className="play-button"
            data-testid={`dev-slot-${slot.id}`}
            onClick={() => openAs(slot)}
            disabled={busy !== null}
          >
            Open as {slot.label}
          </button>
        ))}
      </div>
      {error && <p className="error-line" role="alert">{error}</p>}
    </div>
  );
}
