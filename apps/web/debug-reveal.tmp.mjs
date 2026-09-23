import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });
page.on('response', (r) => { if (r.url().includes('/v1/matches') && r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(-40)); });
await page.goto('http://localhost:3000/');
await page.getByTestId('dev-play-button').click();
await page.getByTestId('persona-closer').click();
await page.getByTestId('ready-button').click();
await page.waitForSelector('[data-testid="my-rv"]', { timeout: 15000 });
const rv = (await page.getByTestId('my-rv').textContent()).trim();
const deadline = Date.now() + 60000;
while (Date.now() < deadline) {
  const banner = await page.getByTestId('turn-banner').textContent().catch(() => '');
  if (banner.includes('YOUR MOVE')) {
    const input = page.getByTestId('offer-input');
    if (await input.isVisible().catch(() => false)) {
      await input.fill(rv);
      await page.getByTestId('make-offer').click();
      console.log('offered', rv);
    }
  }
  const crossed = await page.getByTestId('crossed-ribbon').isVisible().catch(() => false);
  if (crossed && banner.includes('YOUR MOVE')) {
    const accept = page.getByTestId('accept-button');
    console.log('crossed+myTurn — accept visible:', await accept.isVisible().catch(() => false), 'disabled:', await accept.isDisabled().catch(() => null));
    await accept.click();
    console.log('accept clicked');
    break;
  }
  await page.waitForTimeout(400);
}
await page.waitForTimeout(4000);
console.log('status after 4s:', await page.getByTestId('match-status').textContent().catch(() => 'NO match-status'));
console.log('result visible:', await page.getByTestId('result').isVisible().catch(() => false));
await page.screenshot({ path: '/tmp/debug-reveal.png' });
await browser.close();
