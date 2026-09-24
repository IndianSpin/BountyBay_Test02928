/**
 * Client observability (DA-P1-SPEC §4, DEC-028 §41, docs/11):
 * fire-and-forget POSTs to /v1/analytics/event. Failures are silent —
 * observability must never block the game. Every event carries
 * client_environment + client_release; meta carries sanitized text
 * only (never storage contents, request bodies, tokens, or URLs with
 * query strings — docs/10).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ClientEventName = 'review_opened' | 'review_step_viewed' | 'rematch_clicked' | 'play_again_clicked' | 'client_exception';

export interface ClientEventMeta {
  message?: string;
  stack?: string;
  path?: string;
}

const CLIENT_ENVIRONMENT = process.env.NEXT_PUBLIC_BB_ENV ?? 'development';
const CLIENT_RELEASE = process.env.NEXT_PUBLIC_BB_RELEASE ?? 'local';

export function trackEvent(name: ClientEventName, token: string | null, matchId?: string, meta?: ClientEventMeta): void {
  if (!token) return;
  void fetch(`${API_URL}/v1/analytics/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name,
      ...(matchId ? { matchId } : {}),
      ...(meta ? { meta } : {}),
      client_environment: CLIENT_ENVIRONMENT,
      client_release: CLIENT_RELEASE,
    }),
  }).catch(() => {
    /* observability is best-effort */
  });
}
