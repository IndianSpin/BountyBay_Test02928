import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('/tmp/qa-cta', { recursive: true });
const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

async function shot(page: Page, name: string): Promise<void> { await page.screenshot({ path: `/tmp/qa-cta/${name}.png` }); }
async function ownRv(page: Page): Promise<string> {
  const text = await page.getByTestId('my-rv').innerText();
  const m = /([0-9]+(?:\.[0-9])?)\s*$/.exec(text);
  if (!m) throw new Error('no rv');
  return m[1]!;
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
async function enterBay(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('opening-screen').waitFor({ timeout: 20_000 });
  await page.getByTestId('dev-play-button').click();
  await page.waitForURL(/\/bay/, { timeout: 15_000 });
}
async function matchIdOf(page: Page): Promise<string> {
  return page.evaluate(async (apiUrl) => {
    const stored = JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}') as { token?: string };
    const res = await fetch(`${apiUrl}/v1/me/active-match`, { headers: { authorization: `Bearer ${stored.token ?? ''}` } });
    const body = (await res.json()) as { activeMatch?: { matchId?: string } | null };
    return body.activeMatch?.matchId ?? '';
  }, API_URL);
}

test('CTA audit 2b: HOLD/ACCEPT → GAME REVIEW → PLAY AGAIN → REMATCH → BACK TO BAY', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await enterBay(pageA);
  await pageA.getByTestId('bay-play-ranked').click();
  await pageA.waitForURL(/\/play/, { timeout: 15_000 });
  await pageA.getByRole('button', { name: 'Create challenge' }).click();
  const shareUrl = (await pageA.locator('input.share-input').inputValue()).trim();
  await pageB.goto(shareUrl);
  await pageB.getByTestId('ready-button').click();
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  // capture the match id while ACTIVE (active-match excludes terminal matches)
  const finishedId = await matchIdOf(pageA);
  expect(finishedId.length).toBeGreaterThan(0);

  // first-actor tracking (W1-01): after both openings the turn returns to
  // the first mover — the accept seal is asserted on THAT page only
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
  expect(firstActor).not.toBeNull();
  const active = firstActor!;
  await expect(active.getByTestId('accept-button')).toBeVisible({ timeout: 15_000 });
  await hold(active, active.getByTestId('accept-button'), 750);
  await active.getByTestId('result').waitFor({ timeout: 20_000 });
  await active.getByTestId('result').click().catch(() => null);
  await shot(active, 'cta-hold-accept');

  await active.getByTestId('analyze-deal').click();
  await active.waitForURL(/\/review\//, { timeout: 15_000 });
  await active.getByTestId('review-board').waitFor({ timeout: 15_000 });
  await shot(active, 'cta-game-review');

  await active.goto(`/replay/${finishedId}`);
  await active.getByTestId('back-to-play').waitFor({ timeout: 20_000 });
  await active.getByTestId('back-to-play').click();
  await active.waitForURL(/\/play/, { timeout: 15_000 });
  await shot(active, 'cta-play-again');

  await active.goto(`/play?resume=${finishedId}`);
  await active.getByTestId('result').waitFor({ timeout: 20_000 });
  await active.getByTestId('result').click().catch(() => null);
  await active.getByTestId('rematch-button').click();
  await expect(active.getByTestId('rematch-button')).toContainText('REMATCH SENT', { timeout: 10_000 });
  await shot(active, 'cta-rematch');
  await active.getByTestId('back-to-bay').click();
  await active.waitForURL(/\/bay/, { timeout: 15_000 });
  await shot(active, 'cta-back-to-bay');

  await ctxA.close();
  await ctxB.close();
});
