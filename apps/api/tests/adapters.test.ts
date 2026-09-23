/**
 * Auth adapter unit tests — no database, no network.
 */

import { describe, expect, it } from 'vitest';
import { createAuthAdapter, createClerkAuthAdapter, createDevAuthAdapter } from '../src/auth/adapters';

describe('DevAuthAdapter', () => {
  const adapter = createDevAuthAdapter('test-secret');

  it('round-trips a signed subject', async () => {
    const token = adapter.signToken('dev_user_001');
    expect(token.startsWith('dev.')).toBe(true);
    await expect(adapter.verifyToken(token)).resolves.toEqual({ subject: 'dev_user_001' });
  });

  it('rejects garbage, empty, and non-dev tokens', async () => {
    await expect(adapter.verifyToken('')).resolves.toBeNull();
    await expect(adapter.verifyToken('garbage')).resolves.toBeNull();
    await expect(adapter.verifyToken('dev.abc.def')).resolves.toBeNull();
    await expect(adapter.verifyToken('dev.aGVsbG8.000000')).resolves.toBeNull();
  });

  it('rejects tampered payloads', async () => {
    const token = adapter.signToken('dev_user_001');
    const [prefix, , signature] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ subject: 'dev_admin_999' })).toString('base64url');
    const tampered = `${prefix}.${tamperedPayload}.${signature}`;
    await expect(adapter.verifyToken(tampered)).resolves.toBeNull();
  });

  it('rejects tokens signed with a different secret', async () => {
    const other = createDevAuthAdapter('another-secret');
    const token = other.signToken('dev_user_001');
    await expect(adapter.verifyToken(token)).resolves.toBeNull();
  });

  it('rejects a payload without a subject', async () => {
    const { createHmac } = await import('node:crypto');
    const body = `dev.${Buffer.from(JSON.stringify({ admin: true })).toString('base64url')}`;
    const sig = createHmac('sha256', 'test-secret').update(body).digest('base64url');
    await expect(adapter.verifyToken(`${body}.${sig}`)).resolves.toBeNull();
  });
});

describe('ClerkAuthAdapter', () => {
  const adapter = createClerkAuthAdapter('-----BEGIN PUBLIC KEY-----\nnot-a-real-key\n-----END PUBLIC KEY-----\n');

  it('rejects invalid tokens without throwing', async () => {
    await expect(adapter.verifyToken('not-a-jwt')).resolves.toBeNull();
    await expect(adapter.verifyToken('')).resolves.toBeNull();
  });
});

describe('createAuthAdapter factory', () => {
  it('selects the dev adapter outside production when no Clerk key is set', () => {
    const adapter = createAuthAdapter({ NODE_ENV: 'development', DEV_AUTH_SECRET: 's3cret' });
    expect(adapter.name).toBe('dev');
  });

  it('selects Clerk when a JWT key is configured', () => {
    const adapter = createAuthAdapter({ NODE_ENV: 'production', CLERK_JWT_PUBLIC_KEY: 'pk' });
    expect(adapter.name).toBe('clerk');
  });

  it('refuses to boot production without an auth configuration', () => {
    expect(() => createAuthAdapter({ NODE_ENV: 'production' })).toThrow(/auth is not configured/);
  });
});
