/**
 * Client observability (DEC-028 §41, docs/11): fire-and-forget POSTs to
 * /v1/analytics/event. Failures are silent — observability must never
 * block the game.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ClientEventName = 'review_opened' | 'review_step_viewed';

export function trackEvent(name: ClientEventName, token: string | null, matchId?: string): void {
  if (!token) return;
  void fetch(`${API_URL}/v1/analytics/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, ...(matchId ? { matchId } : {}) }),
  }).catch(() => {
    /* observability is best-effort */
  });
}
