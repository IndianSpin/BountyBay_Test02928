/**
 * QA BB-255 (Agent 5): walk BOTH Golden Journeys on integrated main and
 * capture per-state evidence for .agents/PRODUCT_HEALTH.md —
 * FUNCTIONAL / STATE CORRECTNESS / VISUAL / RESPONSIVE / CTA-NAVIGATION.
 * Known REDs (AI table talk, profile update — BB-254) are observed only,
 * not re-litigated. Evidence → /tmp/qa-journeys/. Run per tools/README.md.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('/tmp/qa-journeys', { recursive: true });

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `/tmp/qa-journeys/${name}.png` });
}

async function enterBay(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('opening-screen')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/, { timeout: 15_000 });
  await expect(page.getByTestId('bay')).toBeVisible({ timeout: 15_000 });
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
async function noHScroll(page: Page, label: string): Promise<void> {
  const h = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
  expect(h, `${label}: no horizontal scroll`).toBe(false);
}

test('JOURNEY A — Bay → Challenge → Live Match → Result → Review → Rematch → Bay', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // [Bay hub] title → bay; ranked table + letters + practice slots present
  await enterBay(pageA);
  await expect(pageA.getByTestId('bay-table')).toBeVisible();
  await expect(pageA.getByTestId('bay-letters')).toBeVisible();
  await expect(pageA.getByTestId('bay-practice')).toBeVisible();
  await noHScroll(pageA, 'bay');
  await shot(pageA, 'A-01-bay');

  // [Play / battle selection]
  await pageA.getByTestId('bay-play-ranked').click();
  await expect(pageA).toHaveURL(/\/play/, { timeout: 15_000 });
  await expect(pageA.getByRole('button', { name: 'Create challenge' })).toBeVisible({ timeout: 15_000 });
  await shot(pageA, 'A-02-play');

  // [Challenge created]
  await pageA.getByRole('button', { name: 'Create challenge' }).click();
  const shareInput = pageA.locator('input.share-input');
  await expect(shareInput).toBeVisible({ timeout: 15_000 });
  const shareUrl = (await shareInput.inputValue()).trim();
  await shot(pageA, 'A-03-challenge');

  // [Opponent joins (friend)]
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  // capture the matchId while ACTIVE (active-match only lists live matches)
  const finishedId = await currentMatchId(pageA);
  expect(finishedId.length).toBeGreaterThan(0);
  await shot(pageB, 'A-04-joined');

  // [Role/Dossier reveal] role card + private dossier disclosure
  await expect(pageA.locator('.lm-limit')).toBeVisible();
  const details = pageA.locator('details.lm-dossier');
  await expect(details).toBeVisible();
  await details.locator('summary').click();
  await expect(pageA.getByTestId('dossier')).toBeVisible();
  await expect(pageA.getByTestId('dossier-facts')).toBeVisible();
  await shot(pageA, 'A-05-dossier');
  await details.locator('summary').click();

  // [Live Match] offer → crossed → accept
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
  await shot(crossActive, 'A-06-live-crossed');
  await hold(crossActive, crossActive.getByTestId('accept-button'), 750);

  // [Result / SH4 reveal]
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageA.getByTestId('result-stamp')).toContainText('DEAL');
  await expect(pageA.getByTestId('result-limits')).toBeVisible();
  await expect(pageA.getByTestId('result-split')).toBeVisible();
  await pageA.getByTestId('result').click(); // skip staged beats
  await shot(pageA, 'A-07-result');

  // [Game Review]
  await pageA.getByTestId('analyze-deal').click();
  await expect(pageA).toHaveURL(/\/review\//, { timeout: 15_000 });
  await expect(pageA.getByTestId('review-board')).toBeVisible({ timeout: 15_000 });
  await expect(pageA.getByTestId('moment-RESULT')).toBeVisible();
  await shot(pageA, 'A-08-review');

  // [Rematch — letter → accept] resume the terminal match (id captured
  // while ACTIVE): the play page re-renders the result overlay
  await pageA.goto(`/play?resume=${finishedId}`);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('result').click().catch(() => null);
  const rematchA = pageA.getByTestId('rematch-button');
  await expect(rematchA).toBeVisible({ timeout: 15_000 });
  await rematchA.click();
  await expect(pageA.getByTestId('rematch-button')).toContainText('REMATCH SENT');
  await expect(pageB.getByTestId('rematch-prompt')).toBeVisible({ timeout: 15_000 });
  await expect(pageB.getByTestId('rematch-prompt')).toContainText('wants a rematch');
  await shot(pageB, 'A-09-rematch-letter');
  await pageB.getByTestId('rematch-accept').click();
  await expect(pageA).toHaveURL(/play\?resume=/, { timeout: 20_000 });
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(pageB.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // [Back to Bay] the result overlay's back-to-bay on the live board…
  // the rematch acceptance already landed both on the NEW live match, so
  // walk the CTA from the terminal result before it disappears:
  await pageB.goto(`/play?resume=${finishedId}`);
  await expect(pageB.getByTestId('back-to-bay')).toBeVisible({ timeout: 20_000 });
  await pageB.getByTestId('back-to-bay').click();
  await expect(pageB).toHaveURL(/\/bay/, { timeout: 15_000 });
  await expect(pageB.getByTestId('bay')).toBeVisible({ timeout: 15_000 });
  await shot(pageB, 'A-10-back-to-bay');

  await ctxA.close();
  await ctxB.close();

  async function currentMatchId(page: Page): Promise<string> {
    return page.evaluate(async () => {
      const stored = JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}') as { token?: string };
      const res = await fetch('http://localhost:4200/v1/me/active-match', { headers: { authorization: `Bearer ${stored.token ?? ''}` } });
      const body = (await res.json()) as { activeMatch?: { matchId?: string } | null };
      return body.activeMatch?.matchId ?? '';
    });
  }
});

test('JOURNEY B — Bay → Practice → Select AI → Match → Result → Play Again/Bay', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // [Bay → Practice entry]
  await enterBay(page);
  await expect(page.getByTestId('bay-practice')).toBeVisible();
  await page.getByTestId('bay-practice-go').click();
  await expect(page).toHaveURL(/practice=1/, { timeout: 15_000 });
  await shot(page, 'B-01-practice-entry');

  // [Select AI persona]
  await expect(page.getByTestId('persona-closer')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('persona-closer').click();
  await expect(page.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.staging-card')).toContainText('The Closer');
  await expect(page.locator('.staging-card')).toContainText(/practice/i);
  await shot(page, 'B-02-persona');

  // [AI match start]
  await page.getByTestId('ready-button').click();
  await expect(page.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await expect(page.getByTestId('my-rv')).toBeVisible({ timeout: 15_000 });
  await shot(page, 'B-03-ai-match');

  // [AI table talk] KNOWN RED (BB-254): observe only, do not re-litigate.
  // Current behavior: static flavor line (no OBSERVE→BELIEFS→…→RETURN).
  const talk = await page.locator('.lm-chat-panel, .chat-panel').innerText().catch(() => '');
  console.log('AI table talk (known RED, observed):', JSON.stringify(talk.slice(0, 120)));
  await shot(page, 'B-04-ai-talk-known-red');

  // [AI result] the Closer crosses + accepts an RV opening
  const rv = await ownRv(page);
  const offered = { value: false };
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('result').isVisible().catch(() => false)) break;
    const banner = await page.getByTestId('turn-banner').innerText().catch(() => '');
    if (banner === 'YOUR MOVE' && !offered.value) {
      await page.getByTestId('offer-input').fill(rv);
      await page.getByTestId('make-offer').click({ timeout: 5000 });
      offered.value = true;
    }
    await page.waitForTimeout(400);
  }
  await expect(page.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('practice-tag')).toContainText('practice match · unrated');
  await page.getByTestId('result').click().catch(() => null);
  await shot(page, 'B-05-ai-result');

  // [Profile/training update] KNOWN RED (BB-254 follow-up): observe only —
  // no profile surface is rendered post-match in this build.
  await shot(page, 'B-06-profile-known-red');

  // [Play Again / back to Bay]
  const backToBay = page.getByTestId('back-to-bay');
  await expect(backToBay).toBeVisible();
  await backToBay.click();
  await expect(page).toHaveURL(/\/bay/, { timeout: 15_000 });
  await shot(page, 'B-07-back-to-bay');

  await ctx.close();
});
