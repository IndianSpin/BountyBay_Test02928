/**
 * Development identities (DEC-024 testing flow).
 *
 * Provides the self-explanatory local-testing path: PLAY auto-creates a
 * stable anonymous dev identity per browser; the explicit slots give two
 * named players (Test Player 1 / Test Player 2) for side-by-side testing.
 *
 * Security: the API refuses dev sign-in outside development (the route is
 * structurally unregistered when NODE_ENV is production, and the web dev
 * surface is not rendered by production builds). These helpers are only
 * reachable when the API's dev route exists.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface DevSlot {
  id: string;
  handle: string;
  label: string;
}

export const DEV_SLOTS: DevSlot[] = [
  { id: 'dev-player-1', handle: 'TestPlayer1', label: 'Test Player 1' },
  { id: 'dev-player-2', handle: 'TestPlayer2', label: 'Test Player 2' },
];

const STORAGE_KEY = 'bb-dev-auth';

interface StoredDevAuth {
  token: string;
  slot: string;
}

export function storedDevToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDevAuth>;
    return typeof parsed.token === 'string' ? parsed.token : null;
  } catch {
    return null;
  }
}

async function signIn(subject: string, handle?: string): Promise<string> {
  const res = await fetch(`${API_URL}/v1/auth/dev/signin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject, ...(handle ? { handle } : {}) }),
  });
  if (!res.ok) throw new Error('dev sign-in unavailable in this environment');
  const body = (await res.json()) as { token: string };
  return body.token;
}

/** Signs in as one of the two named test players (stable identity). */
export async function signInAsDevSlot(slot: DevSlot): Promise<void> {
  const token = await signIn(slot.id, slot.handle);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, slot: slot.id }));
}

/**
 * Ensures SOME dev identity exists, without naming it: each browser gets its
 * own anonymous identity, so two sessions are automatically two players.
 */
export async function ensureDevIdentity(): Promise<string> {
  const existing = storedDevToken();
  if (existing) return existing;
  const token = await signIn(`dev-${crypto.randomUUID()}`);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, slot: 'auto' }));
  return token;
}

export function clearDevIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clears the stored identity and mints a fresh anonymous one. Used by the
 * token hook when the API rejects a stored token (e.g. minted before a
 * dev-adapter change): the player silently gets a new browser identity
 * instead of being stuck on the sign-in dead end. Dev-only by design —
 * the API still refuses dev sign-in outside development (SI).
 */
export async function resetDevIdentity(): Promise<string> {
  clearDevIdentity();
  return ensureDevIdentity();
}
