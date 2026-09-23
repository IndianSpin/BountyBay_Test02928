/**
 * QA browser-surface hidden-info scan (Agent 5, QA-01). Captures everything
 * an adversarial player can see in a REAL browser during live play — page
 * HTML, __NEXT_DATA__, localStorage/sessionStorage, /v1/ response bodies,
 * Socket.IO frames — then, after the reveal, scans all of it for the
 * opponent's reservation value (GR-002/SI-001). Results → /tmp/qa-leak.json.
 */
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

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

test('browser-surface scan: opponent RV must not appear in DOM/storage/network pre-result', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // capture on the WAITING player's browser (the opponent's perspective is
  // the hostile one — what does B see about A?)
  const captured: Record<string, string[]> = { html: [], nextData: [], storage: [], responses: [], wsFrames: [] };
  await pageB.on('response', async (res) => {
    if (res.url().includes('/v1/')) {
      try { captured.responses.push(await res.text()); } catch { /* streaming */ }
    }
  });
  await pageB.on('websocket', (ws) => {
    ws.on('framereceived', (f) => captured.wsFrames.push(typeof f.payload === 'string' ? f.payload : ''));
  });

  const shareUrl = await createChallenge(pageA);
  await pageB.goto(shareUrl);
  await expect(pageB.getByTestId('ready-button')).toBeVisible({ timeout: 15_000 });
  await pageB.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('ready-button')).toBeVisible({ timeout: 20_000 });
  await pageA.getByTestId('ready-button').click();
  await expect(pageA.getByTestId('match-status')).toContainText('ACTIVE', { timeout: 25_000 });

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

  // crossed + still ACTIVE: snapshot the hostile browser's full surface
  await expect(pageA.getByTestId('crossed-ribbon')).toBeVisible({ timeout: 15_000 });
  const surface = await pageB.evaluate(() => {
    const nextData = document.querySelector('#__NEXT_DATA__')?.textContent ?? '';
    const storage: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      storage.push(`${k}=${localStorage.getItem(k)}`);
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      storage.push(`${k}=${sessionStorage.getItem(k)}`);
    }
    return { html: document.documentElement.outerHTML, nextData, storage };
  });
  captured.html.push(surface.html);
  captured.nextData.push(surface.nextData);
  captured.storage.push(...surface.storage);

  // complete the deal to learn the opponent RV from the legitimate reveal.
  // Capture continues after this point, so cut the buffers at the accept:
  // terminal broadcasts legitimately carry both RVs (GR-018).
  const cut = { responses: captured.responses.length, wsFrames: captured.wsFrames.length };
  let active: Page;
  await expect(async () => {
    const a = await pageA.getByTestId('accept-button').isVisible().catch(() => false);
    const b = await pageB.getByTestId('accept-button').isVisible().catch(() => false);
    active = a ? pageA : b ? pageB : null!;
    expect(a !== b).toBe(true);
  }).toPass({ timeout: 15_000 });
  const box = await active.getByTestId('accept-button').boundingBox();
  await active.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await active.mouse.down();
  await active.waitForTimeout(750);
  await active.mouse.up();
  await expect(pageB.getByTestId('result')).toBeVisible({ timeout: 20_000 });

  // opponent RV from B's perspective = A's RV (B learned it only now)
  const resultText = await pageB.getByTestId('result').innerText();
  const rvA = rvs[0]!;
  const opponentRvDecimal = rvA; // e.g. "62.5"
  const opponentRvTenths = String(Math.round(Number(rvA) * 10)); // e.g. "625"

  // The leak-grade assertion is the serialized FIELD form (the same scoping
  // the API audit checks). Decimal-string hits are recorded as observations:
  // a player who opens at their own RV makes their RV inferable from a
  // PUBLIC offer announcement — game-theoretic inference, not a data leak.
  const preCut = { ...captured, responses: captured.responses.slice(0, cut.responses), wsFrames: captured.wsFrames.slice(0, cut.wsFrames) };
  const postCut = { responses: captured.responses.slice(cut.responses), wsFrames: captured.wsFrames.slice(cut.wsFrames) };
  const findings: Record<string, string[]> = {};
  const decimalHits: Record<string, string[]> = {};
  const postCutFieldHits: string[] = [];
  for (const [surfaceName, contents] of Object.entries(preCut)) {
    const fieldHits: string[] = [];
    const decHits: string[] = [];
    for (const content of contents) {
      if (content.includes(`"reservationValueTenths":${opponentRvTenths}`)) {
        fieldHits.push(`FIELD-HIT: reservationValueTenths:${opponentRvTenths}`);
      }
      if (opponentRvDecimal.includes('.') && content.includes(opponentRvDecimal)) {
        decHits.push(content.slice(Math.max(0, content.indexOf(opponentRvDecimal) - 90), content.indexOf(opponentRvDecimal) + 40));
      }
    }
    findings[surfaceName] = fieldHits;
    decimalHits[surfaceName] = decHits;
  }
  for (const content of [...postCut.responses, ...postCut.wsFrames]) {
    if (content.includes(`"reservationValueTenths":${opponentRvTenths}`)) postCutFieldHits.push('post-completion reveal (GR-018 legal)');
  }
  writeFileSync('/tmp/qa-leak.json', JSON.stringify({ opponentRvDecimal, opponentRvTenths, resultText: resultText.slice(0, 200), fieldHits: findings, decimalObservations: decimalHits, postCutFieldHits, surfaceSizes: Object.fromEntries(Object.entries(preCut).map(([k, v]) => [k, v.reduce((n, s) => n + s.length, 0)])), }, null, 2));

  for (const [surfaceName, hits] of Object.entries(findings)) {
    expect(hits, `${surfaceName} must not serialize opponent RV ${opponentRvDecimal}`).toEqual([]);
  }

  await ctxA.close();
  await ctxB.close();
});
