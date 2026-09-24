/**
 * P1-M1 exit criterion: one browser completes a full practice match against
 * The Closer — the persona that accepts any legal crossing offer. The
 * deterministic play: whenever it is my turn, offer at my own RV (always
 * legal, GR-003 boundary), which crosses the AI's line; the Closer accepts
 * on its next turn. The result must carry the "practice match · unrated"
 * label (GR-020 / docs/09).
 */

import { expect, test } from '@playwright/test';

test('a full practice match vs the Closer ends in a labeled deal', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/);
  await page.getByTestId('bay-play-ranked').click();
  await expect(page).toHaveURL(/\/play/);

  // pick the persona from the practice section
  await page.getByTestId('persona-closer').click();

  // staging shows the persona, clearly labeled practice
  await expect(page.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.staging-card')).toContainText('The Closer');
  await expect(page.locator('.staging-card')).toContainText(/practice/i);

  await page.getByTestId('ready-button').click();

  // the live board renders my confidential RV (e.g. "76.5") — my deterministic offer
  await expect(page.getByTestId('my-rv')).toBeVisible({ timeout: 15_000 });
  const myRv = (await page.getByTestId('my-rv').textContent())!.trim();
  expect(myRv).toMatch(/^\d+(\.\d)?$/);

  const offered = { value: false };
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('result').isVisible()) break;
    const banner = page.getByTestId('turn-banner');
    if ((await banner.textContent())?.includes('YOUR MOVE') && !offered.value) {
      await page.getByTestId('offer-input').fill(myRv);
      await page.getByTestId('make-offer').click();
      offered.value = true;
    }
    await page.waitForTimeout(400);
  }

  await expect(page.getByTestId('result')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('practice-tag')).toContainText('practice match · unrated');
  // BB-265 G-2: the deal fact lives on the table stamp in the scene.
  await expect(page.getByTestId('result-stamp')).toContainText('DEAL');
  await expect(page.getByTestId('replay-link')).toBeVisible();
});
