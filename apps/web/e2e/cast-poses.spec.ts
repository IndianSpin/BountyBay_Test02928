import { expect, test, type Page } from '@playwright/test';

/**
 * BB-225 acceptance (CAST-* boards): every opponent gets the
 * character-first presentation. AI personas resolve through the cast
 * registry — closer = GoldenOtter (v4 pose files), grinder = HOGSHEAD
 * (15-cell sheet), anchor = GREYLOT (single portrait until the v3 pose
 * set is exported), wall = OLD MOSSBACK, mirror = PIP QUILL. Humans
 * stay GoldenOtter until character selection exists.
 */

async function startPractice(page: Page, persona: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('dev-play-button').click();
  await expect(page).toHaveURL(/\/play/);
  await page.getByTestId(`persona-${persona}`).click();
  await expect(page.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('ready-button').click();
  await expect(page.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
}

test('AI personas render through the cast character system', async ({ browser }) => {
  // the Closer fronts as the v4 GoldenOtter pose files
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await startPractice(page, 'closer');
    const pose = page.locator('.lm-opponent--files .lm-opponent__pose');
    await expect(pose).toBeVisible({ timeout: 15_000 });
    expect(await pose.getAttribute('src')).toMatch(/otter-[a-z]+\.svg/);
    await ctx.close();
  }
  // the Grinder fronts as the HOGSHEAD sheet with a key-state cell
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await startPractice(page, 'grinder');
    const sheet = page.locator('.lm-opponent--sheet .lm-opponent__sheet');
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    expect(await sheet.getAttribute('style')).toContain('ch-hogshead.svg');
    expect(await sheet.getAttribute('data-pose')).toMatch(/idle|thinking|offer|speaking|smug|offline/);
    await ctx.close();
  }
  // the Anchor fronts as the GREYLOT portrait (v3 pose set pending export)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await startPractice(page, 'anchor');
    const avatar = page.locator('.lm-opponent--avatar .lm-opponent__avatar');
    await expect(avatar).toBeVisible({ timeout: 15_000 });
    expect(await avatar.getAttribute('src')).toContain('ironheron.svg');
    await ctx.close();
  }
});

test('human opponents keep the GoldenOtter file poses', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await pageA.goto('/');
  await pageA.getByTestId('dev-play-button').click();
  await expect(pageA).toHaveURL(/\/play/);
  await pageA.getByRole('button', { name: 'Create challenge' }).click();
  const shareInput = pageA.locator('input.share-input');
  await expect(shareInput).toBeVisible({ timeout: 15_000 });
  await pageB.goto((await shareInput.inputValue()).trim());
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });
  const pose = pageA.locator('.lm-opponent--files .lm-opponent__pose');
  await expect(pose).toBeVisible({ timeout: 15_000 });
  expect(await pose.getAttribute('src')).toMatch(/otter-[a-z]+\.svg/);
  await ctxA.close();
  await ctxB.close();
});
