/**
 * M4 exit criterion: two browsers complete a live match reliably.
 *
 * Deterministic play regardless of the random role/RV assignment:
 * each player opens at exactly their own reservation value (always legal —
 * GR-003 boundary), which crosses the opponent's line immediately; the
 * active player then accepts, settling at the seller's RV.
 */

import { expect, test, type Page } from '@playwright/test';

// Mirrors playwright.config.ts port logic — the suite may run on alt ports.
const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

async function createChallenge(page: Page): Promise<string> {
  // Dev-mode entry: the root page's PLAY button creates the browser's dev
  // identity and lands on /play (the same path a founder takes manually).
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

async function joinAndReady(page: Page, url: string): Promise<void> {
  await page.goto(url);
  const ready = page.getByTestId('ready-button');
  await expect(ready).toBeVisible({ timeout: 15_000 });
  await ready.click();
}

async function expectActive(page: Page): Promise<void> {
  await expect(page.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
}

/** Reads the player's own RV from the private line (e.g. "62.5"). */
async function ownRv(page: Page): Promise<string> {
  const text = await page.getByTestId('my-rv').innerText();
  const match = /([0-9]+(?:\.[0-9])?)\s*$/.exec(text);
  if (!match) throw new Error(`could not parse RV from: ${text}`);
  return match[1]!;
}

/**
 * Polls one page: if it is this player's turn, acts (offer once, then
 * accept). Returns 'terminal' when the result screen is visible.
 */
async function isMyTurn(page: Page): Promise<boolean> {
  return (await page.getByTestId('turn-banner').innerText().catch(() => '')) === 'YOUR MOVE';
}

async function actIfMyTurn(page: Page, rv: string, state: { offered: boolean }): Promise<'acted' | 'waiting' | 'terminal'> {
  if (await page.getByTestId('result').isVisible().catch(() => false)) return 'terminal';
  if (!(await isMyTurn(page))) return 'waiting';
  const input = page.getByTestId('offer-input');
  // Let the socket state settle: the UI can still show our own turn right
  // after we acted, before the broadcast of our own action arrives.
  await page.waitForTimeout(300);
  if (!(await isMyTurn(page))) return 'waiting';
  if (!state.offered) {
    await input.fill(rv);
    await page.getByTestId('make-offer').click({ timeout: 5000 }).catch(() => null);
    state.offered = true;
    return 'acted';
  }
  const accept = page.getByTestId('accept-button');
  if (await accept.isVisible().catch(() => false)) {
    // ACCEPTANCE slice (LMD-06): press-and-hold commits after 600 ms.
    const box = await accept.boundingBox();
    if (!box) return 'waiting';
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(750); // hold duration + safety margin
    await page.mouse.up();
    return 'acted';
  }
  return 'waiting';
}

test('two browsers complete a friend match (deal, reveal, rematch CTA)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // A creates a challenge; B joins from the shared link and readies.
  const shareUrl = await createChallenge(pageA);
  // Pre-warm the replay route so Next dev compiles it while the match plays
  // (a cold compile would otherwise race the later replay assertions).
  const warmup = await ctxA.newPage();
  await warmup.goto('/replay/00000000-0000-4000-8000-000000000000').catch(() => null);
  await warmup.close();
  await joinAndReady(pageB, shareUrl);

  // A sees the opponent join, readies too, and both sides activate.
  const readyA = pageA.getByTestId('ready-button');
  await expect(readyA).toBeVisible({ timeout: 20_000 });
  await readyA.click();
  await expectActive(pageA);
  await expectActive(pageB);

  const rvA = await ownRv(pageA);
  const rvB = await ownRv(pageB);
  const stateA = { offered: false };
  const stateB = { offered: false };

  // Sequential poll-and-act: each player opens at their own RV (always legal
  // at the GR-003 boundary); the third action is the accept, which is always
  // legal because the crossing offer sits inside the acceptor's RV.
  for (let step = 0; step < 40; step++) {
    const [ra, rb] = await Promise.all([actIfMyTurn(pageA, rvA, stateA), actIfMyTurn(pageB, rvB, stateB)]);
    if (ra === 'terminal' || rb === 'terminal') break;
    if (ra === 'waiting' && rb === 'waiting') await pageA.waitForTimeout(500);
  }

  // Deal: both browsers show the result reveal with the rematch CTA.
  await expect(pageA.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId('result')).toBeVisible({ timeout: 20_000 });
  await expect(pageA.getByTestId('result')).toContainText('Deal at');
  await expect(pageB.getByTestId('result')).toContainText('Deal at');
  await expect(pageA.getByRole('button', { name: 'Rematch' })).toBeVisible();
  await expect(pageB.getByRole('button', { name: 'Rematch' })).toBeVisible();

  // The reveal shows both RVs post-completion (GR-018) and the ZOPA bar.
  await expect(pageA.getByTestId('result')).toContainText('opponent RV');
  await expect(pageA.getByTestId('zopa-bar')).toBeVisible();

  // Replay (PRD-010): the chronological event stream reconstructs the match.
  const replayUrl = await pageA.getByTestId('replay-link').getAttribute('href');
  await pageA.getByTestId('replay-link').click();
  // The replay screen reconstructs from fetched events; tolerate transient
  // first-load failures (dev-server recompilation) by re-navigating.
  await expect(async () => {
    if (!(await pageA.getByTestId('replay-timeline').isVisible().catch(() => false))) {
      if (replayUrl) await pageA.goto(replayUrl).catch(() => null);
      else await pageA.reload();
    }
    await expect(pageA.getByTestId('replay-timeline')).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 90_000 });
  await expect(pageA.getByTestId('replay-timeline')).toContainText('offered');
  await expect(pageA.getByTestId('replay-timeline')).toContainText('accepted');
  await expect(pageA.getByTestId('replay-timeline')).toContainText('is ready');
  await expect(pageA.getByTestId('replay-result')).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});

test('chat does not transfer the turn (GR-013)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await joinAndReady(pageB, shareUrl);
  const readyA = pageA.getByTestId('ready-button');
  await expect(readyA).toBeVisible({ timeout: 20_000 });
  await readyA.click();
  await expectActive(pageA);
  await expectActive(pageB);

  // B chats while waiting; the message lands in A's history.
  const chatInput = pageB.locator('.chat-row input');
  await chatInput.fill('I can move, but not much.');
  await pageB.locator('.chat-send').click();

  await expect(pageA.locator('.chat-panel')).toContainText('I can move, but not much.', { timeout: 15_000 });

  // The game is still live and waiting on the active player.
  const banner = await pageA.getByTestId('turn-banner').innerText();
  const eitherPage = banner === 'YOUR MOVE' ? pageA : pageB;
  await expect(eitherPage.getByTestId('turn-banner')).toHaveText('YOUR MOVE');

  await ctxA.close();
  await ctxB.close();
});

test('repeating the same formal offer is rejected and never switches the turn (GR-007)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const shareUrl = await createChallenge(pageA);
  await joinAndReady(pageB, shareUrl);
  const readyA = pageA.getByTestId('ready-button');
  await expect(readyA).toBeVisible({ timeout: 20_000 });
  await readyA.click();
  await expectActive(pageA);
  await expectActive(pageB);

  // Deterministic play: each player opens at their own RV (legal GR-003
  // boundary), which hands the turn to the opponent. Record the first
  // mover: after both openings the turn returns to them, and the UI
  // assertions below target their page (avoids the transient stale-turn
  // window on the second mover's page).
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
      await expect(page.getByTestId('turn-banner')).toHaveText('OPPONENT THINKING', { timeout: 15_000 });
    }
    if (offered.every(Boolean)) break;
    await pageA.waitForTimeout(400);
  }
  expect(offered.every(Boolean)).toBe(true);
  expect(firstActor).not.toBeNull();

  // Back on the first mover's turn, re-entering the same amount is blocked:
  // the UI disables Make Offer (client mirrors the server rule) and the
  // turn never moves.
  const firstMover = firstActor!;
  const firstMoverIndex = pages.indexOf(firstMover);
  await expect(firstMover.getByTestId('turn-banner')).toHaveText('YOUR MOVE', { timeout: 15_000 });
  await firstMover.getByTestId('offer-input').fill(rvs[firstMoverIndex]!);
  await expect(firstMover.getByTestId('make-offer')).toBeDisabled();
  await expect(firstMover.getByTestId('turn-banner')).toHaveText('YOUR MOVE');

  // The server enforces the same rule (GR-007): a direct resubmission of
  // the identical amount is rejected with DUPLICATE_OFFER and the match
  // stays live on the same player's turn.
  const duplicate = await firstMover.evaluate(async (arg: { apiUrl: string; amount: string }) => {
    // Bounded poll on the active-match lookup (pre-golden-baseline flake
    // fix): in full-file sequence the first read can race the page's dev
    // identity/token settling. Retry with a short inter-attempt pause,
    // bounded attempts, and a failure payload that carries every attempt's
    // last state — never an unbounded or sleep-based wait.
    const MAX_ATTEMPTS = 5;
    let last = { activeStatus: 0, active: null as { activeMatch?: { matchId?: string } | null } | null, hasToken: false };
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const stored = JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}') as { token?: string };
      const headers = { authorization: `Bearer ${stored.token ?? ''}` };
      const activeRes = await fetch(`${arg.apiUrl}/v1/me/active-match`, { headers });
      const active = (await activeRes.json()) as { activeMatch?: { matchId?: string } | null };
      last = { activeStatus: activeRes.status, active, hasToken: Boolean(stored.token) };
      const matchId = active.activeMatch?.matchId;
      if (!matchId) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      const res = await fetch(`${arg.apiUrl}/v1/matches/${matchId}/offers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ commandId: crypto.randomUUID(), amountTenths: Math.round(Number(arg.amount) * 10) }),
      });
      return { status: res.status, body: (await res.json()) as { code?: string } };
    }
    // Diagnostic body: QA-002 — no `.code` here by design; the caller
    // treats this shape as a test-infrastructure failure, not an API one.
    // QA-006 follow-up: carry the token's resolved user id and the page's
    // own match id, so an exhausted poll is attributable to identity
    // divergence vs a genuinely missing match.
    const meRes = await fetch(`${arg.apiUrl}/v1/me`, { headers: last.hasToken ? { authorization: 'Bearer ' + JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}').token } : {} }).catch(() => null);
    const me = meRes && meRes.ok ? ((await meRes.json()) as { id?: string }) : null;
    return { status: 0, body: { ...last, attempts: MAX_ATTEMPTS, tokenUserId: me?.id ?? null, pagePath: window.location.pathname } };
  }, { apiUrl: API_URL, amount: rvs[firstMoverIndex]! });
  expect(duplicate.status, `active-match diagnostic after ${(duplicate.body as { attempts?: number }).attempts ?? '?'} attempts: ${JSON.stringify(duplicate.body)}`).toBe(400);
  // Narrow the diagnostic union: `.code` exists only on the API-response
  // branch (the 400 above already rules out the status-0 branch).
  expect((duplicate.body as { code?: string }).code).toBe('DUPLICATE_OFFER');
  await expect(firstMover.getByTestId('match-status')).toContainText('ACTIVE');
  await expect(firstMover.getByTestId('turn-banner')).toHaveText('YOUR MOVE');

  await ctxA.close();
  await ctxB.close();
});
