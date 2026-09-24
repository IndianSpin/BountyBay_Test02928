'use client';

import { useEffect, useState } from 'react';
import HubBar from '../../components/hub/hub-bar';
import { useApiToken } from '../../hooks/use-api-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Dev-mode ME hub: the dev identity's standing with the hub bar. */
export default function DevProfile() {
  const { token, ready } = useApiToken();
  const [me, setMe] = useState<{ handle?: string; games?: number }>({});

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
        /* the card is garnish */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  return (
    <main className="bay" data-testid="dev-profile">
      <HubBar active="me" me={me} />
      <aside className="bay-me" style={{ maxWidth: 880, margin: '36px auto' }}>
        <p className="bay-me__k">YOUR STANDING</p>
        <p className="bay-me__name">{me.handle ?? '…'}</p>
        <p className="bay-me__line">{me.games !== undefined && me.games > 0 ? `${me.games} games played` : 'No deals yet'}</p>
        <p className="bay-me__division" title="The rating division opens with the ranked milestone">
          DIVISION · SOON
        </p>
        <p className="bay-me__line">The full ledger — both multipliers, chips, gross and net reward — lands with the rated milestone.</p>
      </aside>
    </main>
  );
}
