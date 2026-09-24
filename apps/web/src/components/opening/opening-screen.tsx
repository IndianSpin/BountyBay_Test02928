'use client';

/**
 * Opening/title screen (BB-224, founder OS-* boards, canvas v3):
 * the Lantern Wharf scene with the v4 GoldenOtter fronting alone —
 * the same place as the live match, not a marketing wrapper.
 *
 * OS-Rationale contract:
 *   - host, not lineup: GoldenOtter fronts; the cast is a promise, not
 *     a character-select (opponents are matched, never picked)
 *   - teaser, not menu: none of the seven faces are tappable
 *   - ONE dominant action: PLAY NOW is the only gold button
 *   - scene over chrome: wharf + otter continuity (C2·2)
 *   - mobile: wharf art as a top band, CTA stack on a solid panel in
 *     the thumb zone
 *
 * PDR-4: returning-player routing reads SHOW_TITLE_ON_RETURN only.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEV_SLOTS, clearDevIdentity, ensureDevIdentity, signInAsDevSlot, storedDevToken } from '../../lib/dev-auth';
import { SHOW_TITLE_ON_RETURN } from '../../lib/title-routing';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const devMode = !clerkEnabled && process.env.NODE_ENV !== 'production';

/** The teaser strip (OS-TitleD): name + epithet per the boards. Faces are
 *  the best available file assets — see the BB-224 deviation list. */
const CAST: { name: string; epithet: string; face: string; kind: 'pose' | 'sheet' | 'avatar' }[] = [
  { name: 'GOLDENOTTER', epithet: 'The Closer', face: '/game/otter-smug.svg', kind: 'pose' },
  { name: 'GREYLOT', epithet: 'The Auctioneer', face: '/game/ch-greylot.svg', kind: 'sheet' },
  { name: 'HOGSHEAD', epithet: 'The Wholesaler', face: '/game/ch-hogshead.svg', kind: 'sheet' },
  { name: 'PIP QUILL', epithet: 'The Accountant', face: '/game/ch-pipquill.svg', kind: 'sheet' },
  { name: 'VESPERINE', epithet: 'The Curio Dealer', face: '/game/ch-vesperine.svg', kind: 'sheet' },
  { name: 'OLD MOSSBACK', epithet: 'The Collector', face: '/game/ch-mossback.svg', kind: 'sheet' },
  { name: 'MARIGOLD FENN', epithet: 'The Patron', face: '/game/ch-marigold.svg', kind: 'sheet' },
  { name: 'ZIPPA RATCHET', epithet: 'The Inventor-Trader', face: '/game/ch-zippa.svg', kind: 'sheet' },
];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '-');
}

export default function OpeningScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returning = typeof window !== 'undefined' && storedDevToken() !== null;

  // PDR-4: when the founder rules "skip straight to the Bay", flip
  // SHOW_TITLE_ON_RETURN in lib/title-routing.ts — nothing else changes.
  useEffect(() => {
    if (SHOW_TITLE_ON_RETURN || !returning) return;
    router.replace('/play');
  }, [returning, router]);

  async function playNow(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (devMode) await ensureDevIdentity();
      // SH-Journey: the title lands on The Bay — the set table is the
      // only gold object there.
      router.push('/bay');
    } catch {
      setError('Dev sign-in is unavailable. Is the API running on port 4000?');
      setBusy(false);
    }
  }

  async function openAs(slot: (typeof DEV_SLOTS)[number]): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await signInAsDevSlot(slot);
      router.push('/play');
    } catch {
      setError('Dev sign-in is unavailable. Is the API running on port 4000?');
      setBusy(false);
    }
  }

  return (
    <main className="os" data-testid="opening-screen">
      <div className="os-scene" aria-hidden="true" />
      <img className="os-otter" src="/game/otter-smug.svg" alt="" aria-hidden="true" />

      {/* top row: social-proof pill + season tag (board: no live number
          is fabricated — the pill renders only when a real count exists) */}
      <header className="os-top">
        <div className="os-pills">
          <span className="os-pill os-pill--ghost">Season 3 · Wharf Rotation</span>
        </div>
        <div className="os-auth">
          {devMode ? (
            <button
              type="button"
              className="os-auth-signin os-auth-dev"
              onClick={() => {
                clearDevIdentity();
                window.location.reload();
              }}
            >
              Dev build — change player
            </button>
          ) : (
            <>
              <a className="os-auth-signin" href="/sign-in">
                Sign in
              </a>
              <a className="os-auth-cta" href="/sign-in">
                Create account
              </a>
            </>
          )}
        </div>
      </header>

      {/* the one decision: PLAY NOW */}
      <section className="os-hero">
        <div className="os-heading">
          <h1 className="os-wordmark">Bounty Bay</h1>
          <p className="os-tagline">The world is playful. The numbers are ruthless.</p>
        </div>
        <div className="os-features" aria-label="What this game is">
          <span className="os-pill os-pill--ghost">1v1 negotiation</span>
          <span className="os-pill os-pill--ghost">No luck, no cards — just nerve and numbers</span>
          <span className="os-pill os-pill--ghost">Rated · ranked · rematch-able</span>
        </div>
        <div className="os-cta">
          <button type="button" className="os-play" data-testid="dev-play-button" onClick={playNow} disabled={busy}>
            {busy ? 'Entering…' : 'PLAY NOW'}
          </button>
          {/* spectator mode is not in this build; the control stays visually
              secondary per the board, inert until the feature exists */}
          <button type="button" className="os-watch" disabled title="Spectator mode is not in this build yet">
            Watch a match
          </button>
        </div>
        <p className="os-blurb">New here? A 90-second guided deal teaches the whole game by doing — no reading, no rules screen.</p>

        {devMode && (
          <div className="os-dev">
            <button type="button" className="os-dev__link" data-testid="dev-practice-button" onClick={() => router.push('/play?practice=1')} disabled={busy}>
              Practice vs AI
            </button>
            {DEV_SLOTS.map((slot) => (
              <button key={slot.id} type="button" className="os-dev__link" data-testid={`dev-slot-${slot.id}`} onClick={() => openAs(slot)} disabled={busy}>
                Open as {slot.label}
              </button>
            ))}
            {error && <span className="os-dev__error" role="alert">{error}</span>}
          </div>
        )}
      </section>

      {/* the cast is a promise, not a menu (OS-Rationale) */}
      <section className="os-strip" aria-label="Who you'll be dealing with" data-testid="teaser-strip">
        <h2 className="os-strip__k">Who you&rsquo;ll be dealing with</h2>
        <div className="os-strip__row">
          {CAST.map((member) => (
            <div key={member.name} className="os-face" data-testid={`teaser-${slug(member.name)}`}>
              <div className="os-face__ring">
                {member.kind === 'sheet' ? (
                  /* 15-cell sprite sheet: cell 0 (the idle portrait) cropped to the face */
                  <img src={member.face} alt="" aria-hidden="true" className="os-face__sheet" />
                ) : (
                  <img src={member.face} alt="" aria-hidden="true" className="os-face__img" />
                )}
              </div>
              <span className="os-face__name">{member.name}</span>
              <span className="os-face__epithet">{member.epithet}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
