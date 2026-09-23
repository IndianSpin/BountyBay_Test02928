/**
 * Auth adapter boundary (DEC-023, 06_ARCHITECTURE.md §2): the API never sees
 * provider specifics — it receives verified auth subjects from an adapter.
 * Clerk is swappable without touching game or route code.
 *
 * The DevAuthAdapter exists so local development and CI run without Clerk
 * keys. It is refused in production (the factory throws instead).
 */

import { verifyToken as verifyClerkToken } from '@clerk/backend';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AuthSubject {
  /** External provider subject — the internal User.authSubject key. */
  subject: string;
}

export interface AuthAdapter {
  name: string;
  /** Returns the verified subject, or null when the token is invalid/expired. */
  verifyToken(token: string): Promise<AuthSubject | null>;
}

// ---------------------------------------------------------------------------
// Clerk (production)
// ---------------------------------------------------------------------------

export function createClerkAuthAdapter(jwtKey: string): AuthAdapter {
  return {
    name: 'clerk',
    async verifyToken(token: string): Promise<AuthSubject | null> {
      try {
        // Networkless JWT verification against the configured public key
        // (DEC-023 / 06_ARCHITECTURE.md §2).
        const payload = await verifyClerkToken(token, { jwtKey });
        return payload ? { subject: payload.sub } : null;
      } catch {
        return null; // invalid, expired, or tampered — never throw to callers
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Dev (local/CI only — never production)
// ---------------------------------------------------------------------------

export interface DevAuthAdapter extends AuthAdapter {
  /** Issues a dev token for a chosen subject (POST /v1/auth/dev/signin). */
  signToken(subject: string): string;
}

export function createDevAuthAdapter(secret: string): DevAuthAdapter {
  const sign = (body: string): string =>
    createHmac('sha256', secret).update(body).digest('base64url');

  return {
    name: 'dev',
    signToken(subject: string): string {
      const payload = Buffer.from(JSON.stringify({ subject })).toString('base64url');
      return `dev.${payload}.${sign(`dev.${payload}`)}`;
    },
    async verifyToken(token: string): Promise<AuthSubject | null> {
      const parts = token.split('.');
      if (parts.length !== 3 || parts[0] !== 'dev') return null;
      const [, payload, signature] = parts;
      const body = `dev.${payload}`;
      const expected = sign(body);
      if (expected.length !== signature!.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature!))) {
        return null;
      }
      try {
        const parsed = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8')) as { subject?: unknown };
        if (typeof parsed.subject !== 'string' || parsed.subject.length === 0) return null;
        return { subject: parsed.subject };
      } catch {
        return null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Selection order: explicit Clerk JWT key → Clerk; otherwise dev mode in
 * non-production environments; otherwise refuse to boot (SI: never run
 * production without real authentication).
 */
export function createAuthAdapter(env: NodeJS.ProcessEnv = process.env): AuthAdapter {
  const jwtKey = env.CLERK_JWT_PUBLIC_KEY;
  if (jwtKey) return createClerkAuthAdapter(jwtKey);

  if (env.NODE_ENV === 'production') {
    throw new Error('auth is not configured: set CLERK_JWT_PUBLIC_KEY in production');
  }
  const secret = env.DEV_AUTH_SECRET ?? 'dev-only-secret-do-not-use-in-production';
  if (!env.DEV_AUTH_SECRET) {
    console.warn('[auth] DEV MODE: using the default dev signing secret. Set DEV_AUTH_SECRET to a random value.');
  }
  return createDevAuthAdapter(secret);
}
