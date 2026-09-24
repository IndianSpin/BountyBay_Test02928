import { expect, test, type Page } from '@playwright/test';

/**
 * CTA_ROUTE_CONTRACT (D-70): every visible CTA maps to a working
 * route — no visible CTA may lead to an error page. This guard walks
 * the Golden Journey v1 route map (Journey A + B states) and fails on
 * any CTA whose target renders an error surface.
 */

const ERROR_SURFACES = ['.error-line', '.world-error', '.os-dev__error', '.home-sub[role="alert"]'];

async function assertNoErrorSurface(page: Page): Promise<void> {
  for (const sel of ERROR_SURFACES) {
    await expect(page.locator(sel)).toBeHidden();
  }
}

test('Journey A route map: every visible CTA lands on a working surface', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // Title → Bay → Play
  await pageA.goto('/');
  await pageA.getByTestId('dev-play-button').click();
  await expect(pageA).toHaveURL(/\/bay/);
  await assertNoErrorSurface(pageA);

  // hub tabs: ME → profile; PLAY → battle selection; THE BAY back
  await pageA.getByTestId('hub-me').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/profile/);
  await assertNoErrorSurface(pageA);
  await pageA.getByTestId('hub-play').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/play/);
  await assertNoErrorSurface(pageA);
  await pageA.getByTestId('hub-bay').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/bay/);
  await assertNoErrorSurface(pageA);

  // Bay CTAs: the gold table → Play; the practice room → practice;
  // the ME ledger → profile
  await pageA.getByTestId('bay-play-ranked').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/play/);
  await assertNoErrorSurface(pageA);
  await pageA.goto('/bay');
  await pageA.getByTestId('bay-practice-go').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/play\?practice=1/);
  await assertNoErrorSurface(pageA);
  await pageA.goto('/bay');
  await pageA.locator('.bay-me__ledger').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/profile/);
  await assertNoErrorSurface(pageA);

  // battle selection: create a challenge; the joiner's CTA (READY)
  await pageA.goto('/play');
  await pageA.getByRole('button', { name: 'Create challenge' }).click();
  const shareInput = pageA.locator('input.share-input');
  await expect(shareInput).toBeVisible({ timeout: 15_000 });
  await assertNoErrorSurface(pageA);
  await pageB.goto((await shareInput.inputValue()).trim());
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await assertNoErrorSurface(pageB);
  await pageB.getByTestId('ready-button').click();
  const readyA = pageA.getByTestId('ready-button');
  await expect(readyA).toBeVisible({ timeout: 20_000 });
  await readyA.click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await assertNoErrorSurface(pageA);

  // play to a deal, then every result CTA
  const rvs = [await ownRv(pageA), await ownRv(pageB)];
  const offered = [false, false];
  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < 2; i++) {
      const page = i === 0 ? pageA : pageB;
      if (await page.getByTestId('result').isVisible().catch(() => false)) break;
      if (!(await isMyTurn(page))) continue;
      if (!offered[i]) {
        await page.getByTestId('offer-input').fill(rvs[i]!);
        await page.getByTestId('make-offer').click({ timeout: 5000 });
        offered[i] = true;
        await page.waitForTimeout(400);
        continue;
      }
      const accept = page.getByTestId('accept-button');
      if (await accept.isVisible().catch(() => false)) {
        const box = await accept.boundingBox();
        if (!box) continue;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(750);
        await page.mouse.up();
      }
    }
    await pageA.waitForTimeout(500);
  }
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 25_000 });
  await pageA.getByTestId('result').click();

  // Review the deal → /review; Replay → /replay; Back to The Bay → /bay.
  // Both links live on the result overlay — read them before leaving it.
  const reviewHref = await pageA.getByTestId('analyze-deal').getAttribute('href');
  const replayHref = await pageA.getByTestId('replay-link').getAttribute('href');
  await pageA.goto(reviewHref!);
  await assertNoErrorSurface(pageA);
  await pageA.goto(replayHref!);
  await assertNoErrorSurface(pageA);
  await pageA.getByTestId('back-to-play').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/play/);
  await assertNoErrorSurface(pageA);

  // the result's BACK TO THE BAY
  const matchId = replayHref!.split('/').pop()!;
  await pageA.goto(`/play?resume=${matchId}`);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('result').click();
  await pageA.getByTestId('back-to-bay').click({ timeout: 8000 });
  await expect(pageA).toHaveURL(/\/bay/);
  await assertNoErrorSurface(pageA);

  await ctxA.close();
  await ctxB.close();
});

test('Journey B route map: practice CTAs land on working surfaces', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/);
  await page.getByTestId('bay-practice-go').click({ timeout: 8000 });
  await expect(page).toHaveURL(/\/play\?practice=1/);
  await assertNoErrorSurface(page);
  await page.getByTestId('persona-closer').click();
  await expect(page.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await assertNoErrorSurface(page);
  await page.getByTestId('ready-button').click();
  await expect(page.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await assertNoErrorSurface(page);
});

async function ownRv(page: Page): Promise<string> {
  const text = await page.getByTestId('my-rv').innerText();
  const match = /([0-9]+(?:\.[0-9])?)\s*$/.exec(text);
  if (!match) throw new Error(`could not parse RV from: ${text}`);
  return match[1]!;
}

async function isMyTurn(page: Page): Promise<boolean> {
  return (await page.getByTestId('turn-banner').innerText().catch(() => '')) === 'YOUR MOVE';
}
