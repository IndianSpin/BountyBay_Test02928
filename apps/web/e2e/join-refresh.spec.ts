import { expect, test, type Page } from '@playwright/test';

/**
 * BB-215 acceptance (QA-001): a participant refreshing the share URL
 * mid-match must land back on the live board — the consumed-token join
 * error must never surface, and the board must not accumulate duplicate
 * events. The recovery redirects to the canonical /play?resume=<id> URL,
 * so a further refresh lands on the board directly.
 */

async function createChallenge(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/play/);
  await page.getByRole('button', { name: 'Create challenge' }).click();
  const shareInput = page.locator('input.share-input');
  await expect(shareInput).toBeVisible({ timeout: 15_000 });
  return (await shareInput.inputValue()).trim();
}

test('mid-match refresh on the share URL recovers to the live board (QA-001)', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  const readyA = pageA.getByTestId('ready-button');
  await expect(readyA).toBeVisible({ timeout: 20_000 });
  await readyA.click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(pageB.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // 1) The JOINER refreshes on the share URL mid-match.
  await pageB.reload();
  // Recovery: the URL becomes the canonical match URL and the live board
  // renders — never the "no challenge with that token" alert.
  await expect(pageB).toHaveURL(/play\?resume=/, { timeout: 20_000 });
  await expect(pageB.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(pageB.locator('.error-line')).toBeHidden();
  // No duplicate events: one opponent plaque, one turn chip, still ACTIVE.
  await expect(pageB.locator('.lm-offer--theirs')).toHaveCount(1);
  const turn = await pageB.getByTestId('turn-banner').innerText();
  expect(['YOUR MOVE', 'OPPONENT THINKING']).toContain(turn);
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE');

  // 2) The CREATOR refreshing their own share URL recovers the same way
  //    (CANNOT_JOIN_OWN_CHALLENGE → resume, not an alert).
  await pageA.goto(shareUrl);
  await expect(pageA).toHaveURL(/play\?resume=/, { timeout: 20_000 });
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(pageA.locator('.error-line')).toBeHidden();

  await ctxA.close();
  await ctxB.close();
});
