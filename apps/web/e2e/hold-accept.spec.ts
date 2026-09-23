/**
 * ACCEPTANCE slice (canvas v1, sequence E, board LMD-06): the green accept
 * seal commits only after a 600 ms hold. Releasing early cancels; a full
 * hold settles the deal. Walk away lives behind the ⋯ menu confirm sheet
 * (LMD-07) and requires its own 1 s hold.
 */

import { expect, test, type Page } from '@playwright/test';

async function createChallenge(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
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

async function ownRv(page: Page): Promise<string> {
  const text = await page.getByTestId('my-rv').innerText();
  const match = /([0-9]+(?:\.[0-9])?)\s*$/.exec(text);
  if (!match) throw new Error(`could not parse RV from: ${text}`);
  return match[1]!;
}

async function isMyTurn(page: Page): Promise<boolean> {
  return (await page.getByTestId('turn-banner').innerText().catch(() => '')) === 'YOUR MOVE';
}

async function hold(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('hold target has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** The stable turn owner: same page must hold YOUR MOVE across two checks. */
async function settledActive(pageA: Page, pageB: Page): Promise<Page> {
  let last: Page | null = null;
  await expect(async () => {
    const a = await pageA.getByTestId('turn-banner').innerText().catch(() => '');
    const b = await pageB.getByTestId('turn-banner').innerText().catch(() => '');
    const winner = a === 'YOUR MOVE' ? pageA : b === 'YOUR MOVE' ? pageB : null;
    expect(winner).not.toBeNull();
    if (last !== null && winner !== last) throw new Error('turn flipped — retry');
    last = winner;
  }).toPass({ timeout: 15_000 });
  return last!;
}

test('hold-to-accept: early release cancels, full hold settles the deal', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await joinAndReady(pageB, shareUrl);
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // Both open at their own RV → offers cross → the crossed seal appears.
  const pages = [pageA, pageB];
  const rvs = [await ownRv(pageA), await ownRv(pageB)];
  const offered = [false, false];
  for (let round = 0; round < 4; round++) {
    for (const i of [0, 1]) {
      if (offered[i]) continue;
      const page = pages[i]!;
      if (!(await isMyTurn(page))) continue;
      await page.getByTestId('offer-input').fill(rvs[i]!);
      await page.getByTestId('make-offer').click({ timeout: 5000 });
      offered[i] = true;
    }
    if (offered.every(Boolean)) break;
    await pageA.waitForTimeout(400);
  }
  expect(offered.every(Boolean)).toBe(true);

  // The first mover owns the accept; wait for it to render on exactly one
  // page (the accept exists only on the active player's page — D7/GR-014).
  const acceptA = pageA.getByTestId('accept-button');
  const acceptB = pageB.getByTestId('accept-button');
  await expect(async () => {
    const a = await acceptA.isVisible().catch(() => false);
    const b = await acceptB.isVisible().catch(() => false);
    expect(a !== b).toBe(true);
  }).toPass({ timeout: 15_000 });
  const active = (await acceptA.isVisible().catch(() => false)) ? pageA : pageB;
  const accept = active === pageA ? acceptA : acceptB;
  await expect(accept).toBeVisible();

  // Early release (300 ms < 600 ms) cancels: the match stays live.
  await hold(active, accept, 300);
  await expect(active.getByTestId('match-status')).toContainText('ACTIVE');
  await expect(accept).toBeVisible();

  // Full hold commits: the deal settles.
  await hold(active, accept, 750);
  await expect(active.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(active.getByTestId('result-stamp')).toContainText('DEAL');

  await ctxA.close();
  await ctxB.close();
});

test('walk away lives in the ⋯ menu behind a confirm hold (LMD-07)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await joinAndReady(pageB, shareUrl);
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // The active player opens the menu and finds Walk away → confirm sheet.
  const active = await settledActive(pageA, pageB);
  await active.getByTestId('menu-button').click();
  await active.getByTestId('walk-button').click();
  await expect(active.getByTestId('walk-confirm-sheet')).toBeVisible();
  await expect(active.getByTestId('walk-confirm-sheet')).toContainText('zero bounty');

  // Confirm hold (1 s) ends the match as no-deal; no native dialogs involved.
  await hold(active, active.getByTestId('walk-confirm'), 1100);
  await expect(active.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(active.getByTestId('result-stamp')).toContainText('NO DEAL');

  await ctxA.close();
  await ctxB.close();
});
