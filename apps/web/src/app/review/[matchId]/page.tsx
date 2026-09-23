'use client';

/**
 * Game Review screen (IN-2, DEC-028, docs/20): the 1–5 important moments of
 * a completed match, deterministically curated from the stored feature and
 * observation rows, each linked into the full event timeline. Level 1
 * objective facts only — no coaching yet (that is IN-5). Works fully when
 * no AI service exists, by construction.
 */

import { useApiToken } from '../../../hooks/use-api-token';
import { trackEvent } from '../../../lib/analytics';
import { toTimelineRow, type TimelineRow } from '../../../lib/replay-rows';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ReviewMomentView {
  kind: string;
  headline: string;
  detail: string | null;
  eventRefs: number[];
}

interface ReviewBody {
  matchId: string;
  curationVersion: string;
  player: {
    playerId: string;
    moments: ReviewMomentView[];
    features: Record<string, unknown>;
  };
}

interface SnapshotBody {
  scenario: { title: string } | null;
  view: { status: string };
}

function kindLabel(kind: string): string {
  return kind.toLowerCase().replace(/_/g, ' ');
}

export default function ReviewScreen() {
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId ?? '';
  const { token, ready } = useApiToken();
  const [review, setReview] = useState<ReviewBody | null>(null);
  const [title, setTitle] = useState('Game Review');
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [activeRefs, setActiveRefs] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token || !matchId) return;
    let cancelled = false;
    trackEvent('review_opened', token, matchId);

    async function load(): Promise<void> {
      try {
        const [reviewRes, snapshotRes, eventsRes] = await Promise.all([
          fetch(`${API_URL}/v1/matches/${matchId}/review`, { headers: { authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/v1/matches/${matchId}`, { headers: { authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/v1/matches/${matchId}/events`, { headers: { authorization: `Bearer ${token}` } }),
        ]);
        if (reviewRes.status === 403) throw new Error('Only participants can review a match.');
        if (reviewRes.status === 409) throw new Error('This match has not completed — no review yet.');
        if (!reviewRes.ok) throw new Error('Could not load the game review.');
        if (!eventsRes.ok) throw new Error('Could not load the event stream.');

        const reviewBody = (await reviewRes.json()) as ReviewBody;
        const snapshotBody = (await snapshotRes.json()) as SnapshotBody & { handles: Record<string, string> };
        const eventsBody = (await eventsRes.json()) as { events: { sequence: number; type: string; at: number; actorPlayerId: string | null; payload: Record<string, unknown> }[] };
        if (cancelled) return;
        setReview(reviewBody);
        setTitle(snapshotBody.scenario?.title ?? 'Game Review');
        setRows(eventsBody.events.map((event) => toTimelineRow(event, snapshotBody.handles)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'unknown error');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, token, matchId]);

  function focusMoment(moment: ReviewMomentView): void {
    if (moment.eventRefs.length > 0) {
      setActiveRefs(new Set(moment.eventRefs));
      const target = document.getElementById(`evt-${moment.eventRefs[0]}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      trackEvent('review_step_viewed', token, matchId);
    }
  }

  if (error) {
    return (
      <main className="home">
        <div className="panel">
          <h2>Review unavailable</h2>
          <p className="error-line" role="alert">{error}</p>
          <a className="replay-button" href="/play">Back to play</a>
        </div>
      </main>
    );
  }

  if (!review) return <main className="home"><p>Loading review…</p></main>;

  const moments = review.player.moments;

  return (
    <main className="review-board" data-testid="review-board">
      <header className="match-header">
        <div>
          <p className="home-kicker">GAME REVIEW</p>
          <h2>{title}</h2>
          <p className="home-sub">Deterministic facts from your match — nothing here is an opinion.</p>
        </div>
        <a className="replay-button" href={`/replay/${matchId}`} data-testid="back-to-replay">
          Full replay
        </a>
      </header>

      <section className="review-moments" aria-label="important moments" data-testid="review-moments">
        {moments.map((moment, index) => (
          <article
            key={`${moment.kind}-${index}`}
            className={`moment-card ${moment.kind === 'RESULT' ? 'moment-result' : ''}`}
            data-testid={`moment-${moment.kind}`}
          >
            <p className="moment-eyebrow">{kindLabel(moment.kind)}</p>
            <h3 className="moment-headline">{moment.headline}</h3>
            {moment.detail && <p className="moment-detail">{moment.detail}</p>}
            {moment.eventRefs.length > 0 && (
              <button type="button" className="moment-link" onClick={() => focusMoment(moment)}>
                See in timeline
              </button>
            )}
          </article>
        ))}
      </section>

      <section className="replay-timeline" aria-label="match timeline" data-testid="review-timeline">
        <h3>Timeline</h3>
        <ol>
          {rows.map((row) => (
            <li
              key={row.sequence}
              id={`evt-${row.sequence}`}
              className={`timeline-${row.kind} ${activeRefs.has(row.sequence) ? 'highlighted' : ''}`}
            >
              <span className="replay-seq">#{row.sequence}</span> {row.text}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
