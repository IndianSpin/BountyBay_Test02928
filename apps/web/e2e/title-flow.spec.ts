import { expect, test } from '@playwright/test';

/**
 * BB-224 acceptance (founder OS-* boards): the opening/title screen —
 * Lantern Wharf + GoldenOtter fronting alone, 8-character teaser strip,
 * ONE dominant PLAY NOW. PDR-4 default: returning signed-in players
 * still see the title (SHOW_TITLE_ON_RETURN — one-flag flip pending the
 * founder's ruling). PLAY NOW carries the dev-play-button testid, so
 * every existing entry flow (friend-match, practice) keeps working.
 */

test('the opening screen fronts the game and PLAY NOW enters the flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('opening-screen')).toBeVisible({ timeout: 20_000 });

  // the host fronts alone, with the world's promise
  await expect(page.getByRole('heading', { name: 'Bounty Bay' })).toBeVisible();
  await expect(page.getByText('The world is playful. The numbers are ruthless.')).toBeVisible();
  await expect(page.getByText('Season 3 · Wharf Rotation')).toBeVisible();

  // the cast is a teaser, not a menu: 8 faces, none tappable
  const strip = page.getByTestId('teaser-strip');
  await expect(strip).toBeVisible();
  for (const face of [
    'teaser-goldenotter',
    'teaser-greylot',
    'teaser-hogshead',
    'teaser-pip-quill',
    'teaser-vesperine',
    'teaser-old-mossback',
    'teaser-marigold-fenn',
    'teaser-zippa-ratchet',
  ]) {
    await expect(page.getByTestId(face)).toBeAttached();
  }
  await expect(strip.getByRole('button')).toHaveCount(0);

  // ONE dominant action → the existing play flow (dev identity created,
  // the challenge panel renders)
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/play/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Create challenge' })).toBeVisible({ timeout: 15_000 });
});

test('PDR-4 default SHOW: a returning stored identity still sees the title', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // a stored dev identity marks the visitor as returning (the opening
  // screen checks presence only — no API contact for the routing flag)
  await ctx.addInitScript(
    (arg: { key: string; value: string }) => localStorage.setItem(arg.key, arg.value),
    { key: 'bb-dev-auth', value: JSON.stringify({ token: 'dev.stub', slot: 'auto' }) },
  );
  const page = await ctx.newPage();
  await page.goto('/');
  // SHOW_TITLE_ON_RETURN = true → the title still renders. When the
  // founder rules "skip straight to the Bay", this assertion flips.
  await expect(page.getByTestId('opening-screen')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('dev-play-button')).toBeVisible();
  await ctx.close();
});

test('mobile title keeps PLAY NOW in the thumb zone with no horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByTestId('opening-screen')).toBeVisible({ timeout: 20_000 });
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHScroll).toBe(false);
  await expect(page.getByTestId('dev-play-button')).toBeVisible();
  await expect(page.getByTestId('teaser-strip')).toBeVisible();
  await ctx.close();
});
