/**
 * QA matrix (Agent 5, QA-01/BB-206 — temporary instrumentation, runs on
 * current main): (1) accept-seal state after early release, first-actor
 * tracked; (2) MATCH STATE INTERRUPTION matrix — refresh at each phase;
 * (3) core flow at ~390 px mobile. Evidence screenshots → /tmp/qa-matrix/.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('/tmp/qa-matrix', { recursive: true });

async function createChallenge(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
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
async function hold(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
/** Both players open at their own RV; returns the first actor (turn owner). */
async function crossOffers(pageA: Page, pageB: Page): Promise<Page> {
  const pages = [pageA, pageB];
  const rvs = [await ownRv(pageA), await ownRv(pageB)];
  const offered = [false, false];
  let firstActor: Page | null = null;
  for (let round = 0; round < 6; round++) {
    for (const i of [0, 1]) {
      if (offered[i]) continue;
      const page = pages[i]!;
      if (!(await isMyTurn(page))) continue;
      await page.getByTestId('offer-input').fill(rvs[i]!);
      await page.getByTestId('make-offer').click({ timeout: 5000 });
      offered[i] = true;
      if (firstActor === null) firstActor = page;
    }
    if (offered.every(Boolean)) break;
    await pageA.waitForTimeout(400);
  }
  expect(offered.every(Boolean)).toBe(true);
  expect(firstActor).not.toBeNull();
  return firstActor!;
}

test('accept seal survives early release on the TRUE active page (BB-206 key question)', async ({ browser }) => {
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

  const active = await crossOffers(pageA, pageB);
  const waiting = active === pageA ? pageB : pageA;
  const accept = active.getByTestId('accept-button');
  await expect(accept).toBeVisible({ timeout: 15_000 });

  // The passive page must NOT carry an accept seal at the same moment.
  await expect(waiting.getByTestId('accept-button')).toHaveCount(0);

  // Early release, then wait past the state-settle window and re-check.
  await hold(active, accept, 300);
  await expect(active.getByTestId('match-status')).toContainText('ACTIVE');
  await active.waitForTimeout(2000);
  const sealVisibleAfter = await accept.isVisible().catch(() => false);
  await active.screenshot({ path: '/tmp/qa-matrix/accept-after-early-release.png' });
  expect(sealVisibleAfter, 'accept seal must survive early release while ACTIVE').toBe(true);

  // Full hold still settles the deal.
  await hold(active, accept, 750);
  await expect(active.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(active.getByTestId('result-stamp')).toContainText('DEAL');

  await ctxA.close();
  await ctxB.close();
});

test('MATCH STATE INTERRUPTION matrix: refresh at offer/accept/result/rematch (L-004)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // -- pre-start refresh: B joined+readied; A reloads before readying.
  //    The reloaded creator page must offer a recovery path (resume link),
  //    and clicking it must restore the staging screen with the ready button.
  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await pageA.reload();
  const resumeLink = pageA.getByRole('link', { name: /Continue your game/ });
  await expect(resumeLink).toBeVisible({ timeout: 20_000 });
  await resumeLink.click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // -- joiner (B) refresh immediately after ACTIVE: the join-token URL now
  //    renders "no challenge with that token" (QA-001). Recovery exists via
  //    the resume link while the match is live; keep this step early so the
  //    45s QA time budget cannot expire mid-check.
  await pageB.reload();
  await expect(pageB.getByText('no challenge with that token')).toBeVisible({ timeout: 20_000 });
  await pageB.screenshot({ path: '/tmp/qa-matrix/joiner-refresh-midmatch-error.png' });
  const joinerResume = pageB.getByRole('link', { name: /Continue your game/ });
  await expect(joinerResume).toBeVisible({ timeout: 20_000 });
  await joinerResume.click();
  await expect(pageB.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // -- refresh after MY offer (turn transferred): no duplicate offer, correct banner --
  const active = await crossOffers(pageA, pageB);
  const waiting = active === pageA ? pageB : pageA;
  // active just offered second? crossOffers leaves the turn back on first actor.
  await expect(active.getByTestId('turn-banner')).toHaveText('YOUR MOVE', { timeout: 15_000 });
  const openingText = await active.locator('.lm-offer--mine').innerText().catch(() => '');
  await active.reload();
  await expect(active.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(active.getByTestId('turn-banner')).toHaveText('YOUR MOVE');
  const afterReloadText = await active.locator('.lm-offer--mine').innerText().catch(() => '');
  expect(afterReloadText).toBe(openingText); // refresh must not duplicate the offer

  // -- reload mid-hold: the hold never commits; match stays ACTIVE --
  const accept = active.getByTestId('accept-button');
  await expect(accept).toBeVisible({ timeout: 15_000 });
  const box = await accept.boundingBox();
  await active.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await active.mouse.down();
  await active.waitForTimeout(300);
  await active.reload(); // interruption mid-hold
  await expect(active.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await active.waitForTimeout(1500);
  await expect(active.getByTestId('accept-button')).toBeVisible();

  // -- complete the deal, then refresh on the RESULT screen --
  await hold(active, accept, 750);
  await expect(active.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await active.reload();
  await expect(active.getByTestId('result')).toBeVisible({ timeout: 25_000 });
  await expect(active.getByTestId('result')).toContainText('Deal at');

  // -- rematch CTA exists and responds --
  const rematch = active.getByRole('button', { name: 'Rematch' });
  await expect(rematch).toBeVisible();
  await rematch.click();
  await active.screenshot({ path: '/tmp/qa-matrix/rematch-click.png' });
  const urlAfter = active.url();
  expect(urlAfter).not.toContain('/result'); // navigated somewhere actionable

  await ctxA.close();
  await ctxB.close();
});

test('core flow at 390 px mobile: join, offer, crossed, accept (QA-01 mobile)', async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await desktop.newPage();
  const shareUrl = await createChallenge(pageA);

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pageM = await mobile.newPage();
  await pageM.goto(shareUrl);
  await expect(pageM.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageM.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageM.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // both open at own RV (whoever's turn) — mobile included
  const pages = [pageA, pageM];
  const rvs = [await ownRv(pageA), await ownRv(pageM)];
  const offered = [false, false];
  for (let round = 0; round < 6; round++) {
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

  // mobile layout: composer + input + submit all visible without horizontal scroll
  await expect(pageM.locator('.lm-composer')).toBeVisible();
  await expect(pageM.getByTestId('offer-input')).toBeVisible();
  await expect(pageM.getByTestId('make-offer')).toBeVisible();
  const hScroll = await pageM.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
  expect(hScroll, 'no horizontal page scroll at 390px').toBe(false);
  await pageM.screenshot({ path: '/tmp/qa-matrix/mobile-390-crossed.png' });

  // the accept seal lives on the ACTIVE page only — whichever it is
  let activePage: Page;
  await expect(async () => {
    const mA = await pageA.getByTestId('accept-button').isVisible().catch(() => false);
    const mB = await pageM.getByTestId('accept-button').isVisible().catch(() => false);
    activePage = mA ? pageA : mB ? pageM : null!;
    expect(mA !== mB).toBe(true);
  }).toPass({ timeout: 15_000 });
  const activeMobile = activePage === pageM;
  const box = await activePage.getByTestId('accept-button').boundingBox();
  if (activeMobile) {
    await pageM.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await pageM.mouse.down();
    await pageM.waitForTimeout(750);
    await pageM.mouse.up();
  } else {
    await hold(pageA, pageA.getByTestId('accept-button'), 750);
  }
  await expect(pageM.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await pageM.screenshot({ path: '/tmp/qa-matrix/mobile-390-result.png' });

  await mobile.close();
  await desktop.close();
});
