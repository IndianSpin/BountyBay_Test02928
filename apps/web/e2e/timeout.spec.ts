/**
 * DD Phase 1 (GR-023/GR-024): the hard personal decision-time budget.
 *
 * The E2E database is seeded with a 45 s hard limit and 25 s / 10 s warning
 * thresholds (E2E_HARD_LIMIT_MS / E2E_WARN_LOW_MS / E2E_WARN_CRITICAL_MS
 * seed overrides, DEC-027). Neither player moves: the active player's
 * budget exhausts, the warning tiers progress, and the timeout result must
 * read as a timeout — never a walk-away. No fixed sleeps: every step polls
 * for the authoritative state.
 */

import { expect, test, type Page } from '@playwright/test';

async function createChallenge(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/);
  await page.getByTestId('bay-play-ranked').click();
  await expect(page).toHaveURL(/\/play/);
  await page.getByRole('button', { name: 'Create challenge' }).click();
  const shareInput = page.locator('input.share-input');
  await expect(shareInput).toBeVisible({ timeout: 15_000 });
  return (await shareInput.inputValue()).trim();
}

async function joinAndReady(page: Page, url: string): Promise<void> {
  await page.goto(url);
  const ready = page.getByTestId('ready-button');
  await expect(ready).toBeVisible({ timeout: 15_000 });
  await ready.click();
}

test('a stalled match warns through LOW TIME and CRITICAL, then times out distinctly', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // A creates a challenge; B joins; both ready; the match activates and
  // nobody offers — the first mover's budget runs out.
  const shareUrl = await createChallenge(pageA);
  await joinAndReady(pageB, shareUrl);
  const readyA = pageA.getByTestId('ready-button');
  await expect(readyA).toBeVisible({ timeout: 20_000 });
  await readyA.click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // Warning tiers: LOW TIME appears once ~20 s of budget remain, then
  // CRITICAL once ~10 s remain. Both players see the active player's tier
  // (GR-016) — assert on one page.
  await expect(pageA.getByTestId('time-warning')).toContainText('LOW TIME', { timeout: 30_000 });
  await expect(pageA.getByTestId('time-warning')).toContainText('CRITICAL', { timeout: 30_000 });

  // Timeout: the result reads as a timeout on both browsers, never a
  // walk-away (GR-024 distinct copy), with the full reveal still shown.
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 30_000 });
  await expect(pageB.getByTestId('result')).toBeVisible({ timeout: 30_000 });
  await expect(pageA.getByTestId('result')).toContainText('ran out of time');
  await expect(pageB.getByTestId('result')).toContainText('ran out of time');
  await expect(pageA.getByTestId('result')).not.toContainText('walked away');
  await expect(pageA.getByTestId('result')).toContainText('opponent RV'); // GR-018 reveal still applies

  await ctxA.close();
  await ctxB.close();
});
