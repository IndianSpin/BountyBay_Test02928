import { expect, test, type Page } from '@playwright/test';

/**
 * BB-219b acceptance (PDR-3, QA-004): rematch = mutual consent. After a
 * friend-match result, the proposer's REMATCH becomes a waiting state;
 * the opponent sees an in-session accept prompt; acceptance starts a new
 * ACTIVE match for both. Decline closes the offer cleanly on both sides.
 */

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

async function ownRv(page: Page): Promise<string> {
  const text = await page.getByTestId('my-rv').innerText();
  const match = /([0-9]+(?:\.[0-9])?)\s*$/.exec(text);
  if (!match) throw new Error(`could not parse RV from: ${text}`);
  return match[1]!;
}

async function isMyTurn(page: Page): Promise<boolean> {
  return (await page.getByTestId('turn-banner').innerText().catch(() => '')) === 'YOUR MOVE';
}

/** Plays one side to a deal: opens at RV, then accepts the standing offer. */
async function playToDeal(pages: Page[]): Promise<void> {
  const rvs = [await ownRv(pages[0]!), await ownRv(pages[1]!)];
  const offered = [false, false];
  for (let round = 0; round < 8; round++) {
    for (const i of [0, 1]) {
      const page = pages[i]!;
      if (await page.getByTestId('result').isVisible().catch(() => false)) return;
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
        return;
      }
    }
    await pages[0]!.waitForTimeout(500);
  }
}

test('mutual-consent rematch: propose → accept → both land on a new ACTIVE match', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await playToDeal([pageA, pageB]);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  // tap-to-skip the staged beats so the actions are immediately actionable
  await pageA.getByTestId('result').click();
  await pageB.getByTestId('result').click();

  // A proposes.
  await pageA.getByTestId('rematch-button').click();
  await expect(pageA.getByTestId('rematch-button')).toContainText('REMATCH SENT');
  await expect(pageA.getByTestId('rematch-button')).toBeDisabled();

  // B sees the in-session prompt and accepts.
  const prompt = pageB.getByTestId('rematch-prompt');
  await expect(prompt).toBeVisible({ timeout: 15_000 });
  await expect(prompt).toContainText('wants a rematch');
  await pageB.getByTestId('rematch-accept').click();

  // Both land on the new live match.
  await expect(pageA).toHaveURL(/play\?resume=/, { timeout: 20_000 });
  await expect(pageB).toHaveURL(/play\?resume=/, { timeout: 20_000 });
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(pageB.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  // Same fresh table: both have private limits again.
  await expect(pageA.getByTestId('my-rv')).toBeVisible();
  await expect(pageB.getByTestId('my-rv')).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});

test('decline closes the offer cleanly on both sides', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await playToDeal([pageA, pageB]);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('result').click();
  await pageB.getByTestId('result').click();

  await pageA.getByTestId('rematch-button').click();
  await expect(pageB.getByTestId('rematch-prompt')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('rematch-decline').click();
  await expect(pageB.getByTestId('rematch-prompt')).toBeHidden();
  // The proposer's poll surfaces the closed offer; the button re-enables.
  await expect(pageA.getByTestId('rematch-button')).toBeEnabled({ timeout: 15_000 });
  await expect(pageA.locator('.lm-rematch-status')).toContainText('no longer open');
  // The original match is untouched (still the result screen).
  await expect(pageA.getByTestId('result')).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});
