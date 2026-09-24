'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface MeResponse {
  id: string;
  handle: string;
  profile: {
    bountyRating: number;
    ratedGames: number;
    ratedDeals: number;
    ratedNoDeals: number;
    agreementRate: number;
    averageSurplusShare: number;
  };
}

export default function ProfileClient() {
  const { getToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/v1/me`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const body = (await res.json()) as MeResponse;
        if (!cancelled) {
          setMe(body);
          setHandle(body.handle);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'unknown error');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  // BB-245 (alpha requirement 5): unique public handle choice. The API
  // enforces the format/uniqueness rules (3-16 chars, case-insensitive
  // uniqueness); assignment stays server-side — never client-trusted.
  async function saveHandle(): Promise<void> {
    setSaving(true);
    setHandleError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/me/handle`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ handle }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? 'could not change handle');
      }
      const updated = (await res.json()) as { handle: string };
      setMe((prev) => (prev ? { ...prev, handle: updated.handle } : prev));
      setHandle(updated.handle);
    } catch (err) {
      setHandleError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Your profile</h2>
      {error && <p>Could not load profile: {error}</p>}
      {me && (
        <>
          <p className="home-sub">Handle: {me.handle}</p>
          <div className="handle-form">
            <input
              aria-label="Public handle"
              value={handle}
              maxLength={16}
              onChange={(e) => setHandle(e.target.value)}
              disabled={saving}
            />
            <button type="button" className="counter-btn" onClick={saveHandle} disabled={saving || handle === me.handle}>
              {saving ? 'Saving…' : 'Save handle'}
            </button>
            {handleError && <p className="world-error" role="alert">{handleError}</p>}
          </div>
          <ul>
            <li>Bounty Rating: {me.profile.bountyRating}</li>
            <li>Rated games: {me.profile.ratedGames}</li>
            <li>Agreement rate: {Math.round(me.profile.agreementRate * 100)}%</li>
            <li>Average surplus captured: {Math.round(me.profile.averageSurplusShare * 100)}%</li>
          </ul>
        </>
      )}
      {!me && !error && <p>Loading…</p>}
    </div>
  );
}
