'use client';

/**
 * The Bay (SH-BayIA, SH-Desk-1): the hub that answers "what can I play
 * now?" — one gold table, then who is waiting on me. Priority, top to
 * bottom: PRIMARY ranked human play → SOCIAL (letters, live tables) →
 * DAILY → COMPETITION → PRACTICE → PERSONAL. Physical objects carry
 * the meaning, and every object also has a plain label.
 *
 * Future-feature slots (OQ-030 / DEC-031 #6) are VISIBLE LABELED
 * PLACEHOLDERS only — rating division, rival challenges, Today's
 * Deal, Monthly Bounty, Live Tables. Never functional, never
 * fabricated data.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import HubBar from '../../components/hub/hub-bar';
import { useApiToken } from '../../hooks/use-api-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface MeInfo {
  handle?: string;
  games?: number;
}

export default function BayPage() {
  const { token, ready } = useApiToken();
  const [me, setMe] = useState<MeInfo>({});

  useEffect(() => {
    if (!ready || !token) return;
    let cancelled = false;
    fetch(`${API_URL}/v1/me`, { headers: { authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? (res.json() as Promise<{ handle?: string; profile?: { ratedGames?: number } }>) : null))
      .then((body) => {
        if (!body || cancelled) return;
        setMe({ handle: body.handle, games: body.profile?.ratedGames ?? 0 });
      })
      .catch(() => {
        /* the chip is garnish */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  return (
    <main className="bay" data-testid="bay">
      <HubBar active="bay" me={me} />

      {/* SLOT 1 · the table — PRIMARY, always present, the ONLY gold object */}
      <section className="bay-table" aria-label="Play ranked" data-testid="bay-table">
        <div className="bay-table__cloth" aria-hidden="true">
          <span className="bay-table__asset">?</span>
        </div>
        <div className="bay-table__copy">
          <p className="bay-table__k">PLAY · RANKED · A REAL PERSON</p>
          <p className="bay-table__line">The table is set.</p>
          <p className="bay-table__honest">
            Ranked matchmaking opens with the ranked milestone — meanwhile, challenge a friend below.
          </p>
          <Link className="bay-table__play" href="/play" data-testid="bay-play-ranked">
            PLAY RANKED
          </Link>
        </div>
      </section>

      {/* SLOT 2 · letters — unfinished business (social) */}
      <section className="bay-slot bay-letters" aria-label="Unfinished business" data-testid="bay-letters">
        <div className="bay-slot__icon bay-slot__icon--letter" aria-hidden="true" />
        <div className="bay-slot__copy">
          <p className="bay-slot__k">LETTERS · UNFINISHED BUSINESS</p>
          <p className="bay-slot__line">
            Challenges, rematch offers and reviews land here as sealed letters.
          </p>
          <p className="bay-slot__honest">No sealed letters — rematch offers live on the result screen until the letter post opens.</p>
        </div>
      </section>

      {/* SLOT 3–5 · today, this month, watch — labelled placeholders only */}
      <div className="bay-row">
        <section className="bay-slot bay-slot--soon" aria-label="Today's Deal" data-testid="bay-today">
          <div className="bay-slot__icon bay-slot__icon--crate" aria-hidden="true" />
          <div className="bay-slot__copy">
            <p className="bay-slot__k">TODAY&rsquo;S DEAL</p>
            <p className="bay-slot__line">One deal for everyone, one attempt, countdown.</p>
            <p className="bay-slot__soon">SOON</p>
          </div>
        </section>
        <section className="bay-slot bay-slot--soon" aria-label="Monthly Bounty" data-testid="bay-bounty">
          <div className="bay-slot__icon bay-slot__icon--board" aria-hidden="true" />
          <div className="bay-slot__copy">
            <p className="bay-slot__k">MONTHLY BOUNTY</p>
            <p className="bay-slot__line">Progress to qualify, days left — ranked deals count.</p>
            <p className="bay-slot__soon">SOON</p>
          </div>
        </section>
        <section className="bay-slot bay-slot--soon" aria-label="Live Tables" data-testid="bay-live">
          <div className="bay-slot__icon bay-slot__icon--lantern" aria-hidden="true" />
          <div className="bay-slot__copy">
            <p className="bay-slot__k">LIVE TABLES</p>
            <p className="bay-slot__line">Watch real people — public information only.</p>
            <p className="bay-slot__soon">SOON</p>
          </div>
        </section>
      </div>

      {/* SLOT 6 · the practice room — functional, below the line */}
      <section className="bay-slot bay-practice" aria-label="Practice room" data-testid="bay-practice">
        <div className="bay-slot__icon bay-slot__icon--room" aria-hidden="true" />
        <div className="bay-slot__copy">
          <p className="bay-slot__k">
            PRACTICE ROOM <span className="bay-slot__ai">AI</span>
          </p>
          <p className="bay-slot__line">Warm up against a persona — unrated, not a person.</p>
          <Link className="bay-slot__go" href="/play?practice=1" data-testid="bay-practice-go">
            WARM UP
          </Link>
        </div>
      </section>

      {/* PERSONAL · the ME card */}
      <aside className="bay-me" aria-label="Your ledger" data-testid="bay-me">
        <p className="bay-me__k">YOUR STANDING</p>
        <p className="bay-me__name">{me.handle ?? '…'}</p>
        <p className="bay-me__line">{me.games !== undefined && me.games > 0 ? `${me.games} games played` : 'No deals yet'}</p>
        <p className="bay-me__division" title="The rating division opens with the ranked milestone">
          DIVISION · SOON
        </p>
        <Link className="bay-me__ledger" href="/profile">
          LEDGER ›
        </Link>
      </aside>
    </main>
  );
}
