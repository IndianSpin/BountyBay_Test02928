/**
 * IN-2 exit criterion (DEC-028): after a completed match, the result
 * card's ANALYZE DEAL opens the Game Review with deterministic moments and
 * the linked event timeline.
 */

import { expect, test } from '@playwright/test';

test('a completed match reviews into deterministic moments and a linked timeline', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/);
  await page.getByTestId('bay-play-ranked').click();
  await expect(page).toHaveURL(/\/play/);

  // quickest terminal match: the Closer accepts any legal crossing offer
  await page.getByTestId('persona-closer').click();
  await expect(page.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('ready-button').click();
  await expect(page.getByTestId('my-rv')).toBeVisible({ timeout: 15_000 });
  const myRv = (await page.getByTestId('my-rv').textContent())!.trim();

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

  await page.getByTestId('analyze-deal').click();
  await expect(page).toHaveURL(/\/review\//);
  await expect(page.getByTestId('review-board')).toBeVisible({ timeout: 15_000 });

  // the RESULT moment leads, deterministic and objective
  const resultMoment = page.getByTestId('moment-RESULT');
  await expect(resultMoment).toBeVisible();
  await expect(resultMoment).toContainText('YOU CAPTURED');
  await expect(page.getByTestId('review-moments')).toBeVisible();

  // the timeline carries the linked events
  await expect(page.getByTestId('review-timeline')).toBeVisible();
  await expect(page.getByTestId('review-timeline')).toContainText('offered');
});
