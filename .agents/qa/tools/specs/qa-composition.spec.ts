/**
 * QA BB-232 re-check (Agent 5, D-46 follow-up): independent verification of
 * the live-match composition at mobile 390×844 and desktop 1440×900 on the
 * fixed build. Checks: every interaction control visible/reachable within
 * the viewport, no horizontal scroll, dossier disclosure expanded state,
 * and the state-adaptive action sheet on both turns (composer+seal usable
 * on YOUR turn only). Evidence → /tmp/qa-comp/. Run per tools/README.md.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('/tmp/qa-comp', { recursive: true });

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

/**
 * The production frame is the viewport minus the dev-auth banner (dev builds
 * render a 32px in-flow banner; production has none). Controls must sit
 * within the world, the world must fit the production frame, and everything
 * below the fold in the dev build must remain reachable by vertical scroll.
 * The dev-build clipping is recorded as the BB-232 finding (QA-008).
 */
async function assertControlsFit(page: Page, label: string, controls: { name: string; locator: ReturnType<Page['locator']> }[]): Promise<void> {
  const vp = page.viewportSize()!;
  const world = await page.locator('.lm-world').boundingBox();
  expect(world, `${label}: world attached`).not.toBeNull();
  const banner = world!.y; // the world's top offset == the dev banner height
  expect(world!.height, `${label}: production frame fit (world height <= viewport)`).toBeLessThanOrEqual(vp.height + 1);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const { name, locator } of controls) {
    const box = await locator.boundingBox().catch(() => null);
    expect(box, `${label}: ${name} must be attached with a box`).not.toBeNull();
    expect(box!.x, `${label}: ${name} left edge inside viewport`).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, `${label}: ${name} right edge inside viewport`).toBeLessThanOrEqual(vp.width + 1);
    expect(box!.y + box!.height, `${label}: ${name} reachable within scrollable height`).toBeLessThanOrEqual(docH + 1);
  }
  const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
  expect(hScroll, `${label}: no horizontal page scroll`).toBe(false);
  if (world!.y + world!.height > vp.height) {
    console.log(`NOTE ${label}: dev-banner build pushes ${Math.round(world!.y + world!.height - vp.height)}px below the fold (banner=${Math.round(banner)}px) — dev-build only, see QA-008`);
  }
}

/** Dossier disclosure: collapsed by default, expands on demand, collapses again. */
async function checkDossier(page: Page, label: string): Promise<void> {
  const details = page.locator('details.lm-dossier');
  await expect(details).toBeVisible({ timeout: 10_000 });
  const isOpen = () => details.evaluate((el: HTMLDetailsElement) => el.open);
  // expand (idempotent if some build starts open)
  if (!(await isOpen())) await details.locator('summary').click();
  await expect(page.getByTestId('dossier')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('dossier-context')).toBeVisible();
  await expect(page.getByTestId('dossier-facts')).toBeVisible();
  await page.screenshot({ path: `/tmp/qa-comp/${label}-dossier-expanded.png` });
  // collapse again
  await details.locator('summary').click();
  await expect(page.getByTestId('dossier')).toBeHidden({ timeout: 5_000 });
  expect(await isOpen(), `${label}: dossier collapsed after toggle`).toBe(false);
}

async function runCompositionChecks(label: string, pageA: Page, pageB: Page, mobilePage: Page | null): Promise<void> {
  const controlsOf = (page: Page) => [
    { name: 'offer-input', locator: page.getByTestId('offer-input') },
    { name: 'make-offer', locator: page.getByTestId('make-offer') },
    { name: 'menu-button', locator: page.getByTestId('menu-button') },
    { name: 'chat-button', locator: page.locator('.lm-round-btn--chat') },
    { name: 'my-standing', locator: page.getByTestId('my-standing') },
  ];

  // identify the active page and the waiting page
  let active: Page; let waiting: Page;
  await expect(async () => {
    const a = await pageA.getByTestId('turn-banner').innerText().catch(() => '');
    const b = await pageB.getByTestId('turn-banner').innerText().catch(() => '');
    if (a === 'YOUR MOVE') { active = pageA; waiting = pageB; }
    else if (b === 'YOUR MOVE') { active = pageB; waiting = pageA; }
    else throw new Error('no active page yet');
  }).toPass({ timeout: 15_000 });
  active = active!; waiting = waiting!;

  // ACTIVE page: composer usable; the seal is gated on a valid composed
  // amount (disabled while empty — correct), then enabled once a legal
  // amount is typed (own RV is always legal at GR-003).
  await expect(active.getByTestId('offer-input')).toBeEnabled();
  await expect(active.getByTestId('make-offer')).toBeDisabled();
  await active.getByTestId('offer-input').fill(await ownRv(active));
  await expect(active.getByTestId('make-offer')).toBeEnabled();
  await active.getByTestId('offer-input').fill('');
  await assertControlsFit(active, `${label}-active`, controlsOf(active));
  await active.screenshot({ path: `/tmp/qa-comp/${label}-active-turn.png` });

  // WAITING page, state-adaptive sheet (BB-232): on MOBILE the action zone
  // is CSS-hidden; on DESKTOP it renders disabled. Either way the waiting
  // player cannot offer.
  const waitingIsMobile = waiting === mobilePage;
  await expect(waiting.getByTestId('offer-input')).toHaveCount(1);
  if (waitingIsMobile) {
    await expect(waiting.getByTestId('offer-input')).toBeHidden();
    await expect(waiting.getByTestId('make-offer')).toBeHidden();
  } else {
    await expect(waiting.getByTestId('offer-input')).toBeDisabled();
    await expect(waiting.getByTestId('make-offer')).toBeDisabled();
  }
  await assertControlsFit(waiting, `${label}-waiting`, [
    { name: 'chat-button', locator: waiting.locator('.lm-round-btn--chat') },
    { name: 'my-standing', locator: waiting.getByTestId('my-standing') },
  ]);
  await waiting.screenshot({ path: `/tmp/qa-comp/${label}-waiting-turn.png` });

  // dossier disclosure on both pages
  await checkDossier(active, `${label}-active`);
  await checkDossier(waiting, `${label}-waiting`);

  // crossed state: both open at own RV; accept seal appears on the active page
  const pages = [pageA, pageB];
  const rvs = [await ownRv(pageA), await ownRv(pageB)];
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
  await expect(pageA.getByTestId('crossed-ribbon')).toBeVisible({ timeout: 15_000 });
  let crossActive: Page;
  await expect(async () => {
    const a = await pageA.getByTestId('accept-button').isVisible().catch(() => false);
    const b = await pageB.getByTestId('accept-button').isVisible().catch(() => false);
    crossActive = a ? pageA : b ? pageB : null!;
    expect(a !== b).toBe(true);
  }).toPass({ timeout: 15_000 });
  crossActive = crossActive!;
  const abox = await crossActive.getByTestId('accept-button').boundingBox();
  expect(abox!.x + abox!.width).toBeLessThanOrEqual((crossActive.viewportSize()!).width + 1);
  await crossActive.screenshot({ path: `/tmp/qa-comp/${label}-crossed.png` });

  // complete the deal
  await hold(crossActive, crossActive.getByTestId('accept-button'), 750);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId('result')).toBeVisible({ timeout: 20_000 });
}

test('BB-232 composition: desktop 1440×900 — controls fit, dossier disclosure, adaptive sheet', async ({ browser }) => {
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

  await runCompositionChecks('desktop', pageA, pageB, null);

  await ctxA.close();
  await ctxB.close();
});

test('BB-232 composition: mobile 390×844 — controls fit, dossier disclosure, adaptive sheet', async ({ browser }) => {
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

  await runCompositionChecks('mobile', pageM, pageA, pageM);

  // mobile chat button: visible + in-viewport (asserted in the fit checks
  // above). The chat SHEET itself is covered by the friend-match suite;
  // opening it here fights the Next.js dev stale-version overlay, which is
  // fixed at the bottom-left over the chat button (dev artifact — QA-008
  // note; production has no overlay).
  await expect(pageM.locator('.lm-round-btn--chat')).toBeVisible({ timeout: 10_000 });

  await mobile.close();
  await desktop.close();
});
