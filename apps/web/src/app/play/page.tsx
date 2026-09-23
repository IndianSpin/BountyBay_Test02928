'use client';

/**
 * Play entry: create a friend challenge, join one from a shared link
 * (?challenge=TOKEN), resume a live match (?resume=MATCH_ID), or pick a
 * practice opponent (DEC-025, docs/08). Then hand off to the live
 * negotiation screen. UF-04: unrated friend challenges; the recipient is
 * encouraged toward ranked matchmaking later (M6).
 */

import { AI_PERSONAS, type PersonaKey } from '@bounty-bay/ai';
import { useEffect, useState } from 'react';
import { useApiToken } from '../../hooks/use-api-token';
import MatchScreen from './match-screen';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type Phase = 'loading' | 'idle' | 'joining' | 'waiting' | 'playing';

interface ChallengeInfo {
  matchId: string;
  token: string;
  shareUrl: string;
  role: 'BUYER' | 'SELLER';
}

interface ActiveMatchInfo {
  matchId: string;
  mode: string;
  aiPersonaKey: string | null;
  opponentHandle: string | null;
  inviteToken: string | null;
}

export default function PlayPage() {
  const { token, userId, ready, error: authError, retry } = useApiToken();
  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatchInfo | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const joinToken = search?.get('challenge') ?? null;
  const resumeMatchId = search?.get('resume') ?? null;

  useEffect(() => {
    if (!ready || !token) return;
    if (joinToken) {
      // precedence: an explicit challenge link wins over resume
      setPhase('joining');
      fetch(`${API_URL}/v1/challenges/${joinToken}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID() }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).message ?? 'join failed');
          const body = (await res.json()) as { matchId: string; role: 'BUYER' | 'SELLER' };
          setChallenge({ matchId: body.matchId, token: joinToken, shareUrl: '', role: body.role });
          setOpponentJoined(true);
          setPhase('playing');
        })
        .catch((err: Error) => {
          void recoverJoinFailure(err);
        });
    } else if (resumeMatchId) {
      // resume (DEC-025): the snapshot decides — live match, or a challenge still waiting
      setPhase('joining');
      // one retry for transient failures: a dropped resume fetch must not
      // strand a returning player on the error panel (QA-001 adjacent)
      const resumeFetch = async (attempt: number): Promise<Response> => {
        const res = await fetch(`${API_URL}/v1/matches/${resumeMatchId}`, { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok && attempt < 2) {
          await new Promise((r) => setTimeout(r, 800));
          return resumeFetch(attempt + 1);
        }
        return res;
      };
      resumeFetch(1)
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).message ?? 'could not resume');
          const body = (await res.json()) as { status: string; role: 'BUYER' | 'SELLER'; inviteToken?: string | null };
          if (body.status === 'WAITING_FOR_OPPONENT') {
            setChallenge({
              matchId: resumeMatchId,
              token: body.inviteToken ?? '',
              shareUrl: `${window.location.origin}/play?challenge=${body.inviteToken ?? ''}`,
              role: body.role,
            });
            setOpponentJoined(false);
            setPhase('waiting');
          } else {
            setChallenge({ matchId: resumeMatchId, token: '', shareUrl: '', role: body.role });
            setOpponentJoined(true);
            setPhase('playing');
          }
        })
        .catch((err: Error) => {
          setError(err.message);
          setPhase('idle');
        });
    } else {
      setPhase('idle');
    }
  }, [ready, token, joinToken, resumeMatchId]);

  /**
   * QA-001: a consumed invite token (CHALLENGE_NOT_FOUND after the first
   * join) or the creator's own link (CANNOT_JOIN_OWN_CHALLENGE) usually
   * means this browser identity is already a participant — recover
   * straight to the live match instead of alarming with
   * "no challenge with that token". The URL becomes the canonical match
   * URL, so a further refresh lands on the board directly.
   */
  async function recoverJoinFailure(err: Error): Promise<void> {
    let active: { activeMatch?: { matchId?: string } | null } | null = null;
    try {
      const res = await fetch(`${API_URL}/v1/me/active-match`, { headers: { authorization: `Bearer ${token}` } });
      if (res.ok) active = (await res.json()) as { activeMatch?: { matchId?: string } | null };
    } catch {
      /* recovery is best-effort; fall through to the join error */
    }
    const activeMatchId = active?.activeMatch?.matchId;
    if (activeMatchId) {
      window.location.replace(`/play?resume=${activeMatchId}`);
      return;
    }
    setError(err.message);
    setPhase('idle');
  }

  // Continue-your-game discovery (item 30 partial, DEC-025).
  useEffect(() => {
    if (!ready || !token || phase !== 'idle') return;
    let cancelled = false;
    fetch(`${API_URL}/v1/me/active-match`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { activeMatch: ActiveMatchInfo | null };
        if (!cancelled) setActiveMatch(body.activeMatch);
      })
      .catch(() => {
        /* discovery is convenience only */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, token, phase]);

  // While waiting for an opponent, poll the pre-join snapshot.
  useEffect(() => {
    if (phase !== 'waiting' || !challenge || !token) return;
    const timer = setInterval(async () => {
      const res = await fetch(`${API_URL}/v1/matches/${challenge.matchId}`, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const body = (await res.json()) as { status?: string };
      if (body.status !== 'WAITING_FOR_OPPONENT') {
        clearInterval(timer);
        setOpponentJoined(true);
        setPhase('playing');
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [phase, challenge, token]);

  async function createChallenge(): Promise<void> {
    if (!token) return;
    setError(null);
    const res = await fetch(`${API_URL}/v1/challenges`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ commandId: crypto.randomUUID() }),
    });
    if (!res.ok) {
      setError((await res.json()).message ?? 'could not create challenge');
      return;
    }
    const body = (await res.json()) as { matchId: string; token: string; role: 'BUYER' | 'SELLER' };
    setChallenge({
      matchId: body.matchId,
      token: body.token,
      shareUrl: `${window.location.origin}/play?challenge=${body.token}`,
      role: body.role,
    });
    setOpponentJoined(false);
    setPhase('waiting');
  }

  function rematch(): void {
    setChallenge(null);
    setOpponentJoined(false);
    setActiveMatch(null);
    setPhase('idle');
  }

  async function createAiMatch(personaKey: PersonaKey): Promise<void> {
    if (!token) return;
    setError(null);
    setAiBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/matches/ai`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID(), persona: personaKey }),
      });
      if (!res.ok) {
        setError((await res.json()).message ?? 'could not open a practice table');
        return;
      }
      const body = (await res.json()) as { matchId: string; role: 'BUYER' | 'SELLER' };
      setChallenge({ matchId: body.matchId, token: '', shareUrl: '', role: body.role });
      setOpponentJoined(true);
      setPhase('playing');
    } finally {
      setAiBusy(false);
    }
  }

  if (!ready) return <main className="home"><p>Loading…</p></main>;
  if (!token)
    return (
      <main className="home">
        <div className="panel">
          <p className="home-kicker">Bounty Bay</p>
          <h2>Can&rsquo;t reach the table</h2>
          <p className="home-sub" role="alert">{authError ?? 'Sign-in could not be verified.'}</p>
          <button type="button" className="play-button" data-testid="auth-retry" onClick={retry}>
            Retry
          </button>
          <p className="home-sub" style={{ marginTop: 12 }}>
            <a href="/">Back to the harbor</a>
          </p>
        </div>
      </main>
    );

  if (phase === 'playing' && challenge) {
    return <MatchScreen matchId={challenge.matchId} token={token} userId={userId!} opponentJoined={opponentJoined} onRematch={rematch} />;
  }

  return (
    <main className="home">
      <div className="panel">
        <p className="home-kicker">Bounty Bay</p>
        <h2>Friend challenge</h2>
        {phase === 'joining' && <p>Joining challenge…</p>}
        {phase === 'waiting' && challenge && (
          <>
            <p className="home-sub">You are the {challenge.role}. Share this link with your opponent:</p>
            <input readOnly value={challenge.shareUrl} className="share-input" onFocus={(e) => e.target.select()} />
            <p className="home-sub">Waiting for them to join…</p>
          </>
        )}
        {phase === 'idle' && (
          <>
            {error && <p className="error-line" role="alert">{error}</p>}
            {activeMatch && (
              <a className="continue-game" href={`/play?resume=${activeMatch.matchId}`} data-testid="continue-game">
                Continue your game vs {activeMatch.opponentHandle ?? 'your opponent'}
              </a>
            )}
            <button type="button" className="play-button" onClick={createChallenge}>
              Create challenge
            </button>
            <section className="practice-section" aria-label="Practice vs AI">
              <h2>Practice vs AI</h2>
              <p className="home-sub">Unrated sparring at the harbor — your rating never moves.</p>
              <div className="persona-grid">
                {AI_PERSONAS.map((persona) => (
                  <button
                    key={persona.key}
                    type="button"
                    className="persona-card"
                    data-testid={`persona-${persona.key}`}
                    onClick={() => createAiMatch(persona.key)}
                    disabled={aiBusy}
                  >
                    <span className="persona-name">{persona.displayName}</span>
                    <span className="persona-blurb">{persona.blurb}</span>
                    <span className="persona-tag">practice · unrated</span>
                  </button>
                ))}
              </div>
              {aiBusy && <p className="home-sub">Setting your table…</p>}
            </section>
            {!clerkEnabled && (
              <p className="home-sub" style={{ marginTop: 12 }}>
                Playing as this browser&rsquo;s dev identity. <a href="/">Change player</a>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
