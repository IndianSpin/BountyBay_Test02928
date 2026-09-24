import { expect, test } from '@playwright/test';

/**
 * BB-241 acceptance (SH-BayIA, SH-Battle, SH-Nav): The Bay — one gold
 * table, then who is waiting on me. Future-feature slots (Today's
 * Deal, Monthly Bounty, Live Tables, the division) are VISIBLE
 * LABELED PLACEHOLDERS only (OQ-030 / DEC-031 #6) — never functional.
 * The practice room is real; the gold table routes to battle selection.
 */

test('The Bay renders the SH3 hub: gold table, labelled slots, practice route', async ({ page }) => {
  await page.goto('/bay');
  await expect(page.getByTestId('bay')).toBeVisible({ timeout: 20_000 });

  // BB-244 guard: the route's CSS module is bundled on a COLD visit —
  // the world background paints and no link renders the browser default.
  const styled = await page.evaluate(() => {
    const bay = document.querySelector('.bay');
    const links = Array.from(document.querySelectorAll('a'));
    return {
      bayPainted: bay !== null && getComputedStyle(bay).backgroundImage !== 'none',
      defaultLinks: links.filter((a) => getComputedStyle(a).color === 'rgb(0, 0, 238)').length,
    };
  });
  expect(styled.bayPainted).toBe(true);
  expect(styled.defaultLinks).toBe(0);

  // the hub bar: three places, one active
  await expect(page.getByTestId('hub-bar')).toBeVisible();
  await expect(page.getByTestId('hub-bay')).toBeVisible();
  await expect(page.getByTestId('hub-play')).toBeVisible();
  await expect(page.getByTestId('hub-me')).toBeVisible();

  // SLOT 1 · the set table — always present, honest about ranked
  await expect(page.getByTestId('bay-table')).toBeVisible();
  await expect(page.getByTestId('bay-table')).toContainText('PLAY · RANKED · A REAL PERSON');
  await expect(page.getByTestId('bay-table')).toContainText('The table is set.');

  // SLOT 2 · letters — unfinished business, honest empty state
  await expect(page.getByTestId('bay-letters')).toContainText('LETTERS · UNFINISHED BUSINESS');

  // SLOTS 3–5 · labelled placeholders ONLY — no action, no fake data
  for (const slot of ['bay-today', 'bay-bounty', 'bay-live']) {
    await expect(page.getByTestId(slot)).toBeVisible();
    await expect(page.getByTestId(slot)).toContainText('SOON');
    await expect(page.getByTestId(slot).getByRole('button')).toHaveCount(0);
    await expect(page.getByTestId(slot).getByRole('link')).toHaveCount(0);
  }

  // SLOT 6 · the practice room is real and labelled AI
  await expect(page.getByTestId('bay-practice')).toContainText('PRACTICE ROOM');
  await page.getByTestId('bay-practice-go').click();
  await expect(page).toHaveURL(/\/play\?practice=1/);
  await expect(page.getByTestId('persona-greylot').or(page.getByTestId('persona-closer'))).toBeVisible({ timeout: 15_000 });

  // back to The Bay → the gold table routes to battle selection
  await page.goto('/bay');
  await page.getByTestId('bay-play-ranked').click();
  await expect(page).toHaveURL(/\/play/);
  await expect(page.getByRole('button', { name: 'Create challenge' })).toBeVisible({ timeout: 15_000 });
});

test('mobile Bay: bottom tab bar and stacked slots, no horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/bay');
  await expect(page.getByTestId('bay')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('hub-bar')).toBeVisible();
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHScroll).toBe(false);
  await expect(page.getByTestId('bay-table')).toBeVisible();
  await expect(page.getByTestId('bay-practice')).toBeVisible();
  await ctx.close();
});
