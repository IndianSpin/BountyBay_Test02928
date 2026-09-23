'use client';

/**
 * API token resolution: Clerk session token when configured, otherwise the
 * dev identity flow (PLAY auto-creates a stable identity per browser; the
 * root page offers named Test Player slots). The internal user id always
 * comes from GET /v1/me — never from local assumptions.
 *
 * Recovery: a stored dev token the API rejects (401/403 — e.g. minted
 * before a dev-adapter change) is cleared and replaced once, automatically.
 * A server that cannot be reached keeps the stored token and surfaces an
 * actionable error instead, with a manual retry path for both cases.
 */

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { ensureDevIdentity, resetDevIdentity, storedDevToken } from '../lib/dev-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const SERVER_UNREACHABLE =
  'Cannot reach the game server. Start it with `pnpm dev` (web + API), then retry.';
const SIGNIN_REJECTED =
  'Sign-in could not be verified. Retry to get a fresh identity, or return to the harbor and change player.';

/** Fetch failure carrying the HTTP status; status 0 means the server was never reached. */
class HttpError extends Error {
  constructor(readonly status: number) {
    super(`request failed with status ${status}`);
  }
}

async function fetchUserId(token: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/me`, { headers: { authorization: `Bearer ${token}` } });
  } catch {
    throw new HttpError(0);
  }
  if (!res.ok) throw new HttpError(res.status);
  const me = (await res.json()) as { id: string };
  return me.id;
}

/**
 * Dev identity with one-shot self-heal: a stored token the API rejects is
 * cleared and replaced by a fresh anonymous identity. The mint is dev-only;
 * production builds have no dev surface at all (SI).
 */
async function resolveDevSession(): Promise<string> {
  const existing = storedDevToken();
  if (existing) {
    try {
      await fetchUserId(existing);
      return existing;
    } catch (err) {
      const rejected = err instanceof HttpError && (err.status === 401 || err.status === 403);
      if (!rejected) throw err;
      return resetDevIdentity();
    }
  }
  return ensureDevIdentity();
}

export interface ApiTokenState {
  token: string | null;
  userId: string | null;
  ready: boolean;
  error: string | null;
  retry: () => void;
}

export function useApiToken(): ApiTokenState {
  const clerk = clerkEnabled ? useAuth() : null;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<ApiTokenState, 'retry'>>({
    token: null,
    userId: null,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function resolve(): Promise<void> {
      try {
        const token = clerk ? await clerk.getToken() : await resolveDevSession();
        if (!token) throw new HttpError(401);
        const userId = await fetchUserId(token);
        if (!cancelled) setState({ token, userId, ready: true, error: null });
      } catch (err) {
        const message = err instanceof HttpError && err.status === 0 ? SERVER_UNREACHABLE : SIGNIN_REJECTED;
        if (!cancelled) setState({ token: null, userId: null, ready: true, error: message });
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [clerk, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
