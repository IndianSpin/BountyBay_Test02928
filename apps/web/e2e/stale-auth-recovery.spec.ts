/**
 * Regression for the founder-reported login dead end: a browser holding a
 * stale bb-dev-auth token (minted before a dev-adapter change, or signed
 * with another DEV_AUTH_SECRET) must self-heal into a fresh dev identity
 * and land on the usable challenge panel — never park on the bare
 * "Sign in to play." screen with no way out.
 */

import { expect, test } from '@playwright/test';

const GARBAGE_TOKEN = 'dev.eyJzdWJqZWN0Ijoic3RhbGUtc3ViamVjdCJ9.deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

test('stale dev token self-heals into a working identity', async ({ page }) => {
  await page.addInitScript(
    (arg: { key: string; value: string }) => {
      localStorage.setItem(arg.key, arg.value);
    },
    { key: 'bb-dev-auth', value: JSON.stringify({ token: GARBAGE_TOKEN, slot: 'auto' }) },
  );

  await page.goto('/play');

  // The dead end must never appear; the page lands on the usable panel.
  await expect(page.getByTestId('auth-retry')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Create challenge' })).toBeVisible({ timeout: 15_000 });

  // And the stored identity was replaced by a freshly minted one.
  const stored = await page.evaluate(() => localStorage.getItem('bb-dev-auth'));
  expect(stored).toBeTruthy();
  expect(stored).not.toContain('deadbeef');
});
