'use client';

/**
 * Replay screen (PRD-010): a chronological timeline of offers, chat, clock
 * ownership changes, accept/walk-away, and the result — reconstructed from
 * the immutable event stream, not from any in-memory state. Participants
 * only: the API rejects everyone else.
 */

import { formatPercent, formatTenthsGrouped } from '../../../lib/format';
import ZopaBar from '../../../components/zopa-bar';
import { toTimelineRow } from '../../../lib/replay-rows';
import { useApiToken } from '../../../hooks/use-api-token';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ReplayView {
  status: string;
  settlementTenths: number | null;
  myReservationValueTenths?: number;
  participants: { playerId: string; role: 'BUYER' | 'SELLER'; reservationValueTenths?: number; clockMultiplier: number }[];
  economy: {
    zopaTenths: number;
    settlementTenths: number | null;
    buyerSurplusShare: number | null;
    sellerSurplusShare: number | null;
    ratedEligible: boolean;
  } | null;
}

interface ReplayEvent {
  sequence: number;
  type: string;
  at: number;
  actorPlayerId: string | null;
  payload: Record<string, unknown>;
}

interface ReplayRow {
  sequence: number;
  at: number;
  text: string;
  kind: 'offer' | 'chat' | 'outcome' | 'presence' | 'system';
}

export default function ReplayScreen() {
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId ?? '';
  const { token, ready } = useApiToken();
  const [view, setView] = useState<ReplayView | null>(null);
  const [rows, setRows] = useState<ReplayRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token || !matchId) return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const [resultRes, eventsRes] = await Promise.all([
          fetch(`${API_URL}/v1/matches/${matchId}/result`, { headers: { authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/v1/matches/${matchId}/events`, { headers: { authorization: `Bearer ${token}` } }),
        ]);
        if (resultRes.status === 403) throw new Error('Only participants can view a match.');
        if (!resultRes.ok) throw new Error('This match has no replayable result yet.');
        if (!eventsRes.ok) throw new Error('Could not load the event stream.');

        const resultBody = (await resultRes.json()) as { view: ReplayView; handles: Record<string, string> };
        const eventsBody = (await eventsRes.json()) as { events: ReplayEvent[] };
        if (cancelled) return;
        setView(resultBody.view);
        setRows(eventsBody.events.map((event) => toTimelineRow(event, resultBody.handles)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'unknown error');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, token, matchId]);

  if (error) {
    return (
      <main className="home">
        <div className="panel">
          <h2>Replay unavailable</h2>
          <p className="error-line" role="alert">{error}</p>
          <a className="replay-button" href="/play">Back to play</a>
        </div>
      </main>
    );
  }

  if (!view) return <main className="home"><p>Loading replay…</p></main>;

  const firstMoverText = rows.length > 0 ? 'The match began.' : '';
  return (
    <main className="match-screen">
      <header className="match-header">
        <div>
          <p className="home-kicker">REPLAY</p>
          <h2>{view.status === 'DEAL' ? `Deal at ${formatTenthsGrouped(view.settlementTenths ?? 0)}` : view.status === 'NO_DEAL' ? 'No deal' : 'Aborted match'}</h2>
          <p className="home-sub">{firstMoverText}</p>
        </div>
        <div className="replay-actions">
          <a className="replay-button" href={`/review/${matchId}`} data-testid="to-review">
            Game Review
          </a>
          <a className="replay-button" href="/play" data-testid="back-to-play">
            Play again
          </a>
        </div>
      </header>

      {view.economy && (
        <section className="result" aria-label="result" data-testid="replay-result">
          <p>
            Surplus split: seller {view.economy.sellerSurplusShare != null ? formatPercent(view.economy.sellerSurplusShare) : '—'} · buyer{' '}
            {view.economy.buyerSurplusShare != null ? formatPercent(view.economy.buyerSurplusShare) : '—'}
          </p>
          <p className="home-sub">ZOPA {formatTenthsGrouped(view.economy.zopaTenths)} · {view.economy.ratedEligible ? 'rated' : 'unrated'}</p>
          <ZopaBar view={view} />
        </section>
      )}

      <section className="replay-timeline" aria-label="match replay" data-testid="replay-timeline">
        <h3>Full event timeline</h3>
        <ol>
          {rows.map((row) => (
            <li key={row.sequence} className={`timeline-${row.kind}`}>
              <span className="replay-seq">#{row.sequence}</span> {row.text}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
