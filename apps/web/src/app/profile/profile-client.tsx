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
        if (!cancelled) setMe(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'unknown error');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div>
      <h2>Your profile</h2>
      {error && <p>Could not load profile: {error}</p>}
      {me && (
        <>
          <p className="home-sub">Handle: {me.handle}</p>
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
