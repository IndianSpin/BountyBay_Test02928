import { expect, test, type Page } from '@playwright/test';

/**
 * BB-230 acceptance (DA-P1-SPEC §4): client telemetry —
 * rematch_clicked (friend + AI), play_again_clicked (replay page),
 * client_exception via the ErrorCatcher with sanitized meta, and the
 * review-page events still sending with client_environment/release.
 * All assertions intercept POST /v1/analytics/event.
 */

interface CapturedEvent {
  name: string;
  matchId?: string;
  meta?: { message?: string; stack?: string; path?: string };
  client_environment?: string;
  client_release?: string;
}

function captureEvents(page: Page): { events: CapturedEvent[] } {
  const events: CapturedEvent[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/v1/analytics/event') && req.method() === 'POST') {
      const body = req.postDataJSON() as CapturedEvent;
      if (body) events.push(body);
    }
  });
  return { events };
}

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

async function playToDeal(pages: Page[]): Promise<void> {
  // single-page callers (AI practice) read only their own RV
  const rvs = pages.map((p) => ownRv(p));
  const resolved = [];
  for (const rv of rvs) resolved.push(await rv);
  const offered = [false, false];
  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]!;
      if (await page.getByTestId('result').isVisible().catch(() => false)) return;
      if (!(await isMyTurn(page))) continue;
      if (!offered[i]) {
        await page.getByTestId('offer-input').fill(resolved[i]!);
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

test('rematch_clicked fires on the friend-mode REMATCH, then play_again_clicked from the replay page', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const captured = captureEvents(pageA);

  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await playToDeal([pageA, pageB]);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('result').click(); // skip the staged beats

  await pageA.getByTestId('rematch-button').click();
  await expect
    .poll(() => captured.events.filter((e) => e.name === 'rematch_clicked').length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
  const rematchEvent = captured.events.find((e) => e.name === 'rematch_clicked')!;
  expect(rematchEvent.matchId).toMatch(/^[0-9a-f-]{36}$/);
  expect(rematchEvent.client_environment).toBeDefined();
  expect(rematchEvent.client_release).toBeDefined();

  // replay page: Play again → play_again_clicked (Game Review sends nothing new)
  await pageA.goto(`/replay/${rematchEvent.matchId}`);
  await expect(pageA.getByTestId('back-to-play')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('back-to-play').click();
  await expect
    .poll(() => captured.events.filter((e) => e.name === 'play_again_clicked').length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
  const playAgain = captured.events.find((e) => e.name === 'play_again_clicked')!;
  expect(playAgain.matchId).toBe(rematchEvent.matchId);

  await ctxA.close();
  await ctxB.close();
});

test('rematch_clicked fires on the AI-mode REMATCH', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const captured = captureEvents(page);

  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/);
  await page.getByTestId('bay-play-ranked').click();
  await expect(page).toHaveURL(/\/play/);
  await page.getByTestId('persona-closer').click();
  await expect(page.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('ready-button').click();
  await expect(page.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  // the Closer crosses and accepts a legal RV opening by itself — offer
  // once, then poll to the result (practice-vs-ai pattern)
  const offered = { value: false };
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('result').isVisible().catch(() => false)) break;
    const banner = await page.getByTestId('turn-banner').innerText().catch(() => '');
    if (banner === 'YOUR MOVE' && !offered.value) {
      await page.getByTestId('offer-input').fill(await ownRv(page));
      await page.getByTestId('make-offer').click({ timeout: 5000 });
      offered.value = true;
    }
    await page.waitForTimeout(400);
  }
  await expect(page.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('result').click();

  await page.getByTestId('rematch-button').click();
  await expect
    .poll(() => captured.events.filter((e) => e.name === 'rematch_clicked').length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
  await ctx.close();
});

test('ErrorCatcher sends client_exception with sanitized meta and no query strings', async ({ page }) => {
  const captured = captureEvents(page);
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/bay/);
  await page.getByTestId('bay-play-ranked').click();
  await expect(page).toHaveURL(/\/play/);
  // force a fake query on the URL to prove the path is the pathname only
  await page.goto(`/play?practice=1&secret=shouldnotappear`);
  // wait until the identity is resolved (the ErrorCatcher skips until
  // ready + token exist — dispatch after, not racing the resolution)
  await expect(page.getByTestId('persona-closer')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('stacktrace') }));
  });
  await expect
    .poll(() => captured.events.filter((e) => e.name === 'client_exception').length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
  const exc = captured.events.find((e) => e.name === 'client_exception')!;
  expect(exc.meta?.message).toBe('boom');
  expect(exc.meta?.stack).toContain('stacktrace');
  expect(exc.meta?.path).toBe('/play');
  expect(JSON.stringify(exc)).not.toContain('shouldnotappear');
  expect(exc.client_environment).toBeDefined();
  expect(exc.client_release).toBeDefined();
});

test('review-page events still send with client_environment/release', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const captured = captureEvents(pageA);

  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  await playToDeal([pageA, pageB]);
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  // navigate via the analyze-deal link's href shape
  const analyze = pageA.getByTestId('analyze-deal');
  await expect(analyze).toBeVisible({ timeout: 10_000 });
  const href = await analyze.getAttribute('href');
  await pageA.goto(href!);
  await expect
    .poll(() => captured.events.filter((e) => e.name === 'review_opened').length, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(1);
  const opened = captured.events.find((e) => e.name === 'review_opened')!;
  expect(opened.client_environment).toBeDefined();
  expect(opened.client_release).toBeDefined();
  await ctxA.close();
  await ctxB.close();
});
