/**
 * QA BB-218 (Agent 5, temporary instrumentation): reproduce the founder's
 * live-match critique on current main —
 *   1. does the plate present an illegal amount as the enabled hero CTA?
 *   2. what does the UI show when the server refuses?
 *   3. rendering check: "116,500" must be a true 116,500.0 offer, and a
 *      typed 116.5 must render "116.5" (single grouped formatter).
 * Evidence → /tmp/qa-bb218/. Run per .agents/qa/tools/README.md.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('/tmp/qa-bb218', { recursive: true });

const API_URL = process.env.E2E_API_PORT ? `http://localhost:${process.env.E2E_API_PORT}` : 'http://localhost:4000';

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

/** Which participant of the active match has which role (server truth). */
async function myRole(page: Page): Promise<'BUYER' | 'SELLER'> {
  return page.evaluate(async (apiUrl) => {
    const stored = JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}') as { token?: string };
    const headers = { authorization: `Bearer ${stored.token ?? ''}` };
    const active = await fetch(`${apiUrl}/v1/me/active-match`, { headers }).then((r) => r.json()) as {
      activeMatch?: { matchId?: string } | null;
    };
    const matchId = active.activeMatch?.matchId;
    if (!matchId) throw new Error('no active match');
    const snap = await fetch(`${apiUrl}/v1/matches/${matchId}`, { headers }).then((r) => r.json()) as {
      view: { participants: { role: 'BUYER' | 'SELLER'; reservationValueTenths?: number }[] };
    };
    const me = snap.view.participants.find((p) => p.reservationValueTenths !== undefined);
    if (!me) throw new Error('viewer entry not found');
    return me.role;
  }, API_URL);
}

test('BB-218: illegal amount is an ENABLED hero CTA; refusal surfaces a generic alert', async ({ browser }) => {
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

  // identify the buyer (server truth via the API view) and bring the turn to them
  const rvA = await ownRv(pageA);
  const rvB = await ownRv(pageB);
  let buyer: Page; let seller: Page; let rvBuyer: string; let rvSeller: string;
  await expect(async () => {
    const roleA = await myRole(pageA);
    const aIsBuyer = roleA === 'BUYER';
    buyer = aIsBuyer ? pageA : pageB;
    seller = aIsBuyer ? pageB : pageA;
    rvBuyer = aIsBuyer ? rvA : rvB;
    rvSeller = aIsBuyer ? rvB : rvA;
    expect(roleA.length).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });
  buyer = buyer!; seller = seller!; rvBuyer = rvBuyer!; rvSeller = rvSeller!;
  console.log(`BUYER rv=${rvBuyer} seller rv=${rvSeller}`);

  // if the seller is first mover, pass the turn legally (seller opens at own RV)
  if (await isMyTurn(seller)) {
    await seller.getByTestId('offer-input').fill(rvSeller);
    await seller.getByTestId('make-offer').click({ timeout: 5000 });
  }
  await expect(buyer.getByTestId('turn-banner')).toHaveText('YOUR MOVE', { timeout: 15_000 });

  // the buyer composes an ILLEGAL amount: own RV + 31.1 (founder-scale margin)
  const illegal = (Number(rvBuyer) + 31.1).toFixed(1);
  await buyer.getByTestId('offer-input').fill(illegal);

  // 1) the seal CTA is ENABLED and presents the illegal amount as the hero
  const seal = buyer.getByTestId('make-offer');
  await expect(seal).toBeVisible();
  await expect(seal).toBeEnabled();
  const sealText = await seal.innerText();
  console.log(`SEAL TEXT for illegal ${illegal}: "${sealText}"`);
  expect(sealText).toContain('SEAL OFFER');
  expect(sealText).toContain(illegal);

  // 2) the advisory strip warns (self-information, correct) but does not block
  await expect(buyer.getByTestId('cost-preview')).toContainText('does not allow you to offer more than', { timeout: 5_000 });
  await buyer.screenshot({ path: '/tmp/qa-bb218/illegal-composed-cta-enabled.png' });

  // 3) tap SEAL → the server refuses; the UI shows the generic alert
  await seal.click();
  await expect(buyer.locator('.world-error')).toBeVisible({ timeout: 10_000 });
  const alertText = await buyer.locator('.world-error').innerText();
  console.log(`ALERT after refusal: "${alertText}"`);
  expect(alertText).toContain('does not allow you to offer that much');
  await buyer.screenshot({ path: '/tmp/qa-bb218/after-refusal-alert.png' });

  // 4) state integrity after refusal: turn unchanged, match ACTIVE, input holds
  await expect(buyer.getByTestId('match-status')).toContainText('ACTIVE');
  await expect(buyer.getByTestId('turn-banner')).toHaveText('YOUR MOVE');
  await expect(buyer.getByTestId('offer-input')).toHaveValue(illegal);

  // 5) server-authoritative proof: the same amount via direct API → 400
  const direct = await buyer.evaluate(async (arg: { apiUrl: string; amount: string }) => {
    const stored = JSON.parse(localStorage.getItem('bb-dev-auth') ?? '{}') as { token?: string };
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${stored.token ?? ''}` };
    const active = await fetch(`${arg.apiUrl}/v1/me/active-match`, { headers }).then((r) => r.json()) as { activeMatch?: { matchId?: string } | null };
    const res = await fetch(`${arg.apiUrl}/v1/matches/${active.activeMatch?.matchId}/offers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ commandId: crypto.randomUUID(), amountTenths: Math.round(Number(arg.amount) * 10) }),
    });
    return { status: res.status, body: (await res.json()) as { code?: string } };
  }, { apiUrl: API_URL, amount: illegal });
  expect(direct.status).toBe(400);
  expect(direct.body.code).toBe('OUTSIDE_RESERVATION_VALUE');
  console.log(`DIRECT API refusal: ${direct.status} ${direct.body.code}`);

  await ctxA.close();
  await ctxB.close();
});

test('BB-218 rendering: opponent ask 116,500 is a true 116,500.0 offer; 116.5 renders 116.5', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // --- case 1: seller opens at 116500.0 → the buyer's ask plaque shows "116,500" ---
  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  // find the seller (server truth via the API view)
  let sellerPage: Page; let buyerPage: Page;
  await expect(async () => {
    const roleA = await myRole(pageA);
    const aIsSeller = roleA === 'SELLER';
    sellerPage = aIsSeller ? pageA : pageB;
    buyerPage = aIsSeller ? pageB : pageA;
    expect(roleA.length).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });
  sellerPage = sellerPage!; buyerPage = buyerPage!;

  // if the buyer moves first, pass the turn legally (buyer opens at own RV)
  if (await isMyTurn(buyerPage)) {
    await buyerPage.getByTestId('offer-input').fill(await ownRv(buyerPage));
    await buyerPage.getByTestId('make-offer').click({ timeout: 5000 });
  }
  await expect(sellerPage.getByTestId('turn-banner')).toHaveText('YOUR MOVE', { timeout: 15_000 });

  // the seller composes 116500 (a true 116,500.0 — legal opening for a seller)
  await sellerPage.getByTestId('offer-input').fill('116500');
  const sealRaw = await sellerPage.getByTestId('make-offer').innerText();
  console.log(`SEAL raw echo for 116500: "${sealRaw.replace(/\n/g, ' | ')}"`);
  await sellerPage.getByTestId('make-offer').click({ timeout: 5000 });

  // the buyer's opponent-ask plaque renders through the grouped formatter
  await expect(buyerPage.locator('.lm-offer--theirs')).toContainText('116,500', { timeout: 15_000 });
  await buyerPage.screenshot({ path: '/tmp/qa-bb218/render-116500-plaque.png' });
  console.log('BUYER ask plaque shows: 116,500');

  // --- case 2: fresh match, seller opens at 116.5 → plaque must read "116.5" ---
  const share2 = await createChallenge(pageA);
  await pageB.goto(share2);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

  let s2: Page; let b2: Page;
  await expect(async () => {
    const roleA = await myRole(pageA);
    const aIsSeller = roleA === 'SELLER';
    s2 = aIsSeller ? pageA : pageB;
    b2 = aIsSeller ? pageB : pageA;
    expect(roleA.length).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });
  s2 = s2!; b2 = b2!;
  if (await isMyTurn(b2)) {
    await b2.getByTestId('offer-input').fill(await ownRv(b2));
    await b2.getByTestId('make-offer').click({ timeout: 5000 });
  }
  await expect(s2.getByTestId('turn-banner')).toHaveText('YOUR MOVE', { timeout: 15_000 });
  await s2.getByTestId('offer-input').fill('116.5');
  await s2.getByTestId('make-offer').click({ timeout: 5000 });
  await expect(b2.locator('.lm-offer--theirs')).toContainText('116.5', { timeout: 15_000 });
  const plaqueSmall = await b2.locator('.lm-offer--theirs').innerText();
  expect(plaqueSmall).not.toContain('116,500');
  await b2.screenshot({ path: '/tmp/qa-bb218/render-116-5-plaque.png' });
  console.log(`BUYER ask plaque for 116.5: "${plaqueSmall}"`);

  await ctxA.close();
  await ctxB.close();
});
