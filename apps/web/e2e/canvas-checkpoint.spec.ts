/**
 * Slice checkpoint tool (DEC-029, docs/21 §4): captures the live-match
 * screen next to the Claude Design boards and asserts the structural
 * contract (objects present, positions from the .lm-* composition).
 *
 * Only runs when CAPTURE_CANVAS=1 — it writes screenshots, it is not part
 * of the CI-critical path. Usage:
 *   CAPTURE_CANVAS=1 E2E_DATABASE_URL=… E2E_WEB_PORT=3100 E2E_API_PORT=4100 \
 *     pnpm --filter web exec playwright test e2e/canvas-checkpoint.spec.ts
 */

import { expect, test, type Page } from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const CAPTURE = process.env.CAPTURE_CANVAS === '1';
const OUT_DIR = path.resolve(__dirname, '..', 'test-results', 'canvas');
const CANVAS_ROOT = path.resolve(__dirname, '..', '..', '..', 'design-sandbox', 'bounty-bay-canvas');

/** Serves the design canvas statically so its boards render with assets. */
function startCanvasServer(): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]!);
      const file = path.join(CANVAS_ROOT, urlPath === '/' ? 'boards/LMR-D-01-YourMove.dc.html' : urlPath);
      try {
        const data = readFileSync(file);
        const type = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream';
        res.writeHead(200, { 'content-type': type });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ port, close: () => server.close() });
    });
  });
}

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

test('canvas checkpoint: live-match screen vs design boards', async ({ browser }) => {
  test.skip(!CAPTURE, 'capture tool — set CAPTURE_CANVAS=1');
  const canvasServer = await startCanvasServer();
  try {
    mkdirSync(OUT_DIR, { recursive: true });

    // -- design boards: screenshot at the canvas's own 1440×900 -------------
    const boardPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await boardPage.goto(`http://localhost:${canvasServer.port}/boards/LMR-D-01-YourMove.dc.html`);
    await boardPage.screenshot({ path: path.join(OUT_DIR, 'board-LMR-D-01-YourMove.png') });
    await boardPage.goto(`http://localhost:${canvasServer.port}/boards/LMR-D-02-TheirMove.dc.html`);
    await boardPage.screenshot({ path: path.join(OUT_DIR, 'board-LMR-D-02-TheirMove.png') });
    await boardPage.goto(`http://localhost:${canvasServer.port}/boards/LMR-D-03-Crossed.dc.html`);
    await boardPage.screenshot({ path: path.join(OUT_DIR, 'board-LMR-D-03-Crossed.png') });
    await boardPage.close();

    // -- the real match -------------------------------------------------------
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

    // Structural contract (board LMR-D-01): diegetic objects present.
    const structural = [
      { name: 'opponent sprite', locator: '.lm-opponent__sprite' },
      { name: 'name plaque', locator: '.lm-plaque' },
      { name: 'their ask plaque', locator: '.lm-offer--theirs' },
      { name: 'my offer plaque', locator: '.lm-offer--mine' },
      { name: 'my limit card', locator: '.lm-limit' },
      { name: 'price rail', locator: '.lm-rail' },
      { name: 'composer slip', locator: '.lm-composer' },
      { name: 'seal offer blob', locator: '.lm-seal' },
      { name: 'clock medallion', locator: '.lm-clock' },
      { name: 'coin pile', locator: '.lm-coins' },
      { name: 'asset on table', locator: '.lm-asset' },
      { name: 'menu round button', locator: '.lm-round-btn--menu' },
      { name: 'chat round button', locator: '.lm-round-btn--chat' },
    ];
    for (const item of structural) {
      await expect(pageA.locator(item.locator), `${item.name} should exist`).toBeAttached({ timeout: 10_000 });
    }
    // Canvas type contract: world face + numerals actually loaded.
    // only RENDERED weights load (font-display swap): the screen uses
    // Baloo 2 700/800 and Space Grotesk 700 — probe exactly those
    await expect
      .poll(
        async () =>
          pageA.evaluate(
            () =>
              document.fonts.check('700 16px "Baloo 2"') &&
              document.fonts.check('800 16px "Baloo 2"') &&
              document.fonts.check('700 16px "Space Grotesk"'),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    // Turn ribbon carries the exact contract strings.
    const ribbonText = await pageA.getByTestId('turn-banner').innerText();
    expect(['YOUR MOVE', 'OPPONENT THINKING']).toContain(ribbonText);

    // My-turn capture (whichever page is active, capture that one first).
    const activePage = (await pageA.getByTestId('turn-banner').innerText()) === 'YOUR MOVE' ? pageA : pageB;
    const waitingPage = activePage === pageA ? pageB : pageA;
    await activePage.screenshot({ path: path.join(OUT_DIR, 'live-match-desktop-mine.png') });
    await waitingPage.screenshot({ path: path.join(OUT_DIR, 'live-match-desktop-theirs.png') });

    // Openings at own RV (always legal) → crossed state; then capture.
    const rvActive = await ownRv(activePage);
    await activePage.getByTestId('offer-input').fill(rvActive);
    await activePage.getByTestId('make-offer').click({ timeout: 5000 });
    await expect(waitingPage.getByTestId('turn-banner')).toHaveText('YOUR MOVE', { timeout: 15_000 });
    const rvWaiting = await ownRv(waitingPage);
    await waitingPage.getByTestId('offer-input').fill(rvWaiting);
    await waitingPage.getByTestId('make-offer').click({ timeout: 5000 });
    await expect(activePage.getByTestId('crossed-ribbon')).toBeVisible({ timeout: 15_000 });
    await activePage.screenshot({ path: path.join(OUT_DIR, 'live-match-desktop-crossed.png') });
    await expect(activePage.locator('.lm-rail__overlap')).toBeVisible();
    await expect(activePage.getByTestId('accept-button')).toBeVisible();

    // Mobile capture (390×844, LMR-M-01 composition): same dev identity as
    // the active player (bb-dev-auth) + the active-match deep link.
    const apiUrl = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';
    const storedAuth = await activePage.evaluate(() => localStorage.getItem('bb-dev-auth'));
    const matchId = await activePage.evaluate(async (url) => {
      const stored = JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}') as { token?: string };
      const res = await fetch(`${url}/v1/me/active-match`, { headers: { authorization: `Bearer ${stored.token ?? ''}` } });
      const body = (await res.json()) as { activeMatch?: { matchId?: string } | null };
      return body.activeMatch?.matchId ?? null;
    }, apiUrl);
    expect(matchId).not.toBeNull();
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobileCtx.addInitScript(
      (arg: { key: string; value: string }) => localStorage.setItem(arg.key, arg.value),
      { key: 'bb-dev-auth', value: storedAuth ?? '' },
    );
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(`/play?resume=${matchId}`);
    await expect(mobilePage.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
    await expect(mobilePage.locator('.lm-composer')).toBeVisible();
    await mobilePage.screenshot({ path: path.join(OUT_DIR, 'live-match-mobile.png') });
    await mobileCtx.close();

    // ACCEPTANCE slice (sequence E, LMD-06): mid-hold capture; early release
    // cancels; a full 600 ms hold commits the deal.
    const acceptBtn = activePage.getByTestId('accept-button');
    const abox = await acceptBtn.boundingBox();
    expect(abox).not.toBeNull();
    await activePage.mouse.move(abox!.x + abox!.width / 2, abox!.y + abox!.height / 2);
    await activePage.mouse.down();
    await activePage.waitForTimeout(300);
    await activePage.screenshot({ path: path.join(OUT_DIR, 'live-match-desktop-accept-hold.png') });
    await activePage.mouse.up(); // released early → cancels, match stays live
    await expect(activePage.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 10_000 });

    await activePage.mouse.down();
    await activePage.waitForTimeout(650); // 600 ms hold commits; stamp is mid-flight
    await activePage.screenshot({ path: path.join(OUT_DIR, 'live-match-desktop-accept-stamp.png') });
    await activePage.mouse.up();
    await expect(activePage.getByTestId('result')).toBeVisible({ timeout: 15_000 });

    await ctxA.close();
    await ctxB.close();
    console.log(`[canvas-checkpoint] screenshots written to ${OUT_DIR}`);
  } finally {
    canvasServer.close();
  }
});
