#!/usr/bin/env node
/**
 * GOLDEN CHECK — can say "no" to a screen that does not match the design.
 *
 * For every state contract in ../contracts/*.json and every viewport it lists, it opens
 *   - the golden reference page  (design-sandbox/golden/states/<state>.html), and/or
 *   - the app's state route      (<base><contract.appRoute>?fixture=reference&t=end)
 * and asserts the contract: required elements present and fully on screen, inside their zone, big enough,
 * not covered by anything (hit-testing), not overlapping each other, forbidden copy absent, no horizontal
 * scroll, the opponent the largest element. Then it checks the timeline order (golden: always; app: when it
 * pushes events to window.__bbTimeline). It writes screenshots and, for app runs, side-by-side images.
 *
 * Usage (from the repo root):
 *   node design-sandbox/golden/check/golden-check.mjs                       # golden self-check (must pass)
 *   node design-sandbox/golden/check/golden-check.mjs --target app --base http://localhost:3000
 *   node design-sandbox/golden/check/golden-check.mjs --target both --base http://localhost:3000 --states result
 * Options: --states a,b  --out <dir>  --pending (also check layers that wait on a product decision)
 * Exit code 1 if any hard check fails. Report: <out>/report.json + report.md
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.resolve(HERE, '..');
const REPO = path.resolve(GOLDEN, '..', '..');

// ------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const TARGET = arg('target', 'golden');
const BASE = arg('base', 'http://localhost:3000');
const OUT = path.resolve(arg('out', path.join(REPO, 'design-sandbox', 'golden', 'check', 'out')));
const PENDING = !!arg('pending', false);
const ONLY = arg('states', '') ? String(arg('states')).split(',') : null;

// ------------------------------------------------------------------ playwright (the app's dev dependency)
async function loadChromium() {
  for (const from of [path.join(REPO, 'apps/web/package.json'), path.join(REPO, 'package.json')]) {
    try { return createRequire(from)('@playwright/test').chromium; } catch {}
    try { return createRequire(from)('playwright').chromium; } catch {}
  }
  try { return (await import('playwright')).chromium; } catch {}
  throw new Error('Playwright not found — run `pnpm install` (apps/web has @playwright/test) and `pnpm --filter web exec playwright install chromium`.');
}

// ------------------------------------------------------------------ static server for the golden pages (repo root)
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
function serveRepo() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(REPO, decodeURIComponent((req.url || '/').split('?')[0]));
      if (!p.startsWith(REPO)) { res.writeHead(403); return res.end(); }
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data);
      });
    });
    srv.listen(0, () => resolve({ port: srv.address().port, close: () => srv.close() }));
  });
}

// ------------------------------------------------------------------ in-page contract evaluation
function evaluateContract({ contract, vp, pending }) {
  const W = innerWidth, H = innerHeight, out = [];
  const add = (ok, id, rule, detail) => out.push({ ok, id, rule, detail });
  const q = (id) => document.querySelector(`[data-testid="${id}"]`);
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const visible = (el) => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && r.width > 1 && r.height > 1; };
  const inside = (a, el) => a && (a === el || el.contains(a));
  const items = contract.required.filter((it) => (pending || !it.pending) && (!it.viewports || it.viewports.includes(vp)));

  for (const it of items) {
    const el = q(it.id);
    if (!visible(el)) { add(false, it.id, 'present', 'missing or not visible'); continue; }
    add(true, it.id, 'present', '');
    const R = rect(el);
    if (it.id !== 'market-world') {
      const onScreen = R.x >= -1 && R.y >= -1 && R.r <= W + 1 && R.b <= H + 1;
      add(onScreen, it.id, 'fully on screen', onScreen ? '' : `rect ${Math.round(R.x)},${Math.round(R.y)} ${Math.round(R.w)}×${Math.round(R.h)} in ${W}×${H}`);
    }
    const z = it.zone && it.zone[vp];
    if (z) { const cx = (R.x + R.w / 2) / W, cy = (R.y + R.h / 2) / H;
      const ok = cx >= z[0] && cx <= z[2] && cy >= z[1] && cy <= z[3];
      add(ok, it.id, 'in zone', ok ? '' : `centre ${cx.toFixed(2)},${cy.toFixed(2)} outside [${z.join(', ')}]`); }
    const mn = it.minSize && it.minSize[vp];
    if (mn) { const ok = R.w >= mn[0] - 1 && R.h >= mn[1] - 1; add(ok, it.id, 'min size', ok ? '' : `${Math.round(R.w)}×${Math.round(R.h)} < ${mn[0]}×${mn[1]}`); }
    const mx = it.maxSize && it.maxSize[vp];
    if (mx) { const ok = R.w <= mx[0] + 1 && R.h <= mx[1] + 1; add(ok, it.id, 'max size', ok ? '' : `${Math.round(R.w)}×${Math.round(R.h)} > ${mx[0]}×${mx[1]}`); }
    const ma = it.minArea && it.minArea[vp];
    if (ma) { const a = (R.w * R.h) / (W * H); add(a >= ma, it.id, 'min area', a >= ma ? '' : `${(a * 100).toFixed(1)}% < ${ma * 100}% of the screen`); }
    if (it.text) { const ok = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').includes(it.text); add(ok, it.id, 'text', ok ? '' : `expected “${it.text}”`); }
    if (it.unoccluded) {
      const h = it.unoccluded === 'top-half' ? 0.5 : 1;
      const pts = [[.5, .5 * h], [.25, .35 * h], [.75, .35 * h], [.5, .15 * h], [.5, .85 * h]];
      const bad = pts.filter(([fx, fy]) => { const px = R.x + R.w * fx, py = R.y + R.h * fy;
        if (px < 0 || py < 0 || px >= W || py >= H) return false; return !inside(document.elementFromPoint(px, py), el); });
      // sprites are transparent images — for the character, accept hits on the stage behind it only when nothing else sits there
      const ok = bad.length <= (it.id === 'opponent-character' ? 1 : 0);
      add(ok, it.id, 'not covered', ok ? '' : `${bad.length} of ${pts.length} probe points hit other elements`);
    }
    if (it.near) { const o = q(it.near); if (visible(o)) { const O = rect(o);
      const d = Math.hypot((R.x + R.w / 2) - (O.x + O.w / 2), (R.y + R.h / 2) - (O.y + O.h / 2)) / Math.hypot(W, H);
      add(d < 0.45, it.id, `near ${it.near}`, d < 0.45 ? '' : `distance ${(d * 100).toFixed(0)}% of the screen diagonal`); } }
  }
  // the person is the largest thing on screen
  const L = items.find((i) => i.largest);
  if (L && visible(q(L.id))) {
    const a = (id) => { const r = rect(q(id)); return r.w * r.h; };
    const big = items.filter((i) => i.id !== L.id && i.id !== 'market-world' && !i.container && visible(q(i.id))).filter((i) => a(i.id) > a(L.id));
    add(big.length === 0, L.id, 'largest element', big.length ? `bigger: ${big.map((i) => i.id).join(', ')}` : '');
  }
  for (const [a, b] of contract.noOverlap || []) {
    const A = q(a), B = q(b); if (!visible(A) || !visible(B)) continue;
    const r1 = rect(A), r2 = rect(B);
    const ix = Math.max(0, Math.min(r1.r, r2.r) - Math.max(r1.x, r2.x)), iy = Math.max(0, Math.min(r1.b, r2.b) - Math.max(r1.y, r2.y));
    add(ix * iy <= 4, `${a} × ${b}`, 'no overlap', ix * iy <= 4 ? '' : `${Math.round(ix)}×${Math.round(iy)} px overlap`);
  }
  const txt = document.body.innerText;
  for (const f of (contract.forbidden && contract.forbidden.text) || []) add(!txt.includes(f), 'page', `forbidden text “${f}”`, txt.includes(f) ? 'found' : '');
  for (const sel of (contract.forbidden && contract.forbidden.selectors) || []) { const n = document.querySelectorAll(sel).length; add(n === 0, 'page', `forbidden ${sel}`, n ? `${n} found` : ''); }
  const hs = document.documentElement.scrollWidth <= W + 1; add(hs, 'page', 'no horizontal scroll', hs ? '' : `${document.documentElement.scrollWidth}px wide`);
  return out;
}

// ------------------------------------------------------------------ run
const contracts = fs.readdirSync(path.join(GOLDEN, 'contracts')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(GOLDEN, 'contracts', f), 'utf8'))).filter((c) => !ONLY || ONLY.includes(c.state));
fs.mkdirSync(OUT, { recursive: true });
const chromium = await loadChromium();
const server = await serveRepo();
const browser = await chromium.launch();
const report = { target: TARGET, base: BASE, pending: PENDING, at: new Date().toISOString(), runs: [] };
const targets = TARGET === 'both' ? ['golden', 'app'] : [TARGET];

async function open(target, c, vp, query = 't=end') {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const q = `${query}${PENDING ? '&pending=1' : ''}`;
  const url = target === 'golden' ? `http://localhost:${server.port}/design-sandbox/golden/states/${c.state}.html?${q}`
    : `${BASE}${c.appRoute}?fixture=reference&${q}`;
  const resp = await page.goto(url, { waitUntil: 'load' }).catch((e) => ({ status: () => 0, err: e }));
  await page.waitForSelector('[data-golden-ready="1"]', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return { page, url, status: resp && resp.status ? resp.status() : 0 };
}

for (const c of contracts) {
  for (const vp of c.viewports) {
    for (const target of targets) {
      const { page, url, status } = await open(target, c, vp);
      const shot = path.join(OUT, `${c.state}-${vp.name}-${target}.png`);
      let checks;
      if (status >= 400 || status === 0) checks = [{ ok: false, id: 'page', rule: 'route exists', detail: `${url} → HTTP ${status}` }];
      else { await page.screenshot({ path: shot }); checks = await page.evaluate(evaluateContract, { contract: c, vp: vp.name, pending: PENDING }); }
      await page.close();
      // timeline order (played fast)
      let tl = { checked: false };
      if (status > 0 && status < 400 && (c.timeline || []).length) {
        const { page: p2 } = await open(target, c, vp, 't=0&speed=6');
        const last = Math.max(...c.timeline.map((s) => s.at));
        await p2.waitForTimeout(last / 6 + 1500);
        const ev = await p2.evaluate(() => (window.__golden && window.__golden.events) || window.__bbTimeline || null);
        await p2.close();
        if (!ev) tl = { checked: false, note: 'not instrumented (push {id} events to window.__bbTimeline)' };
        else {
          const want = [...c.timeline].sort((a, b) => a.at - b.at).filter((s) => PENDING || !s.pending).map((s) => s.id);
          const got = ev.map((e) => e.id).filter((id) => want.includes(id));
          const ok = JSON.stringify(got) === JSON.stringify(want);
          tl = { checked: true, ok, want, got };
          checks.push({ ok, id: 'timeline', rule: 'event order', detail: ok ? '' : `got ${got.join(' → ')}` });
        }
      }
      const failed = checks.filter((x) => !x.ok);
      report.runs.push({ state: c.state, viewport: vp.name, target, url, screenshot: path.relative(OUT, shot), pass: failed.length === 0, failed, checks: checks.length, timeline: tl });
      console.log(`${failed.length ? '✗' : '✓'} ${c.state} · ${vp.name} · ${target}  (${checks.length - failed.length}/${checks.length})`);
      for (const f of failed) console.log(`    ✗ ${f.id} — ${f.rule}${f.detail ? ': ' + f.detail : ''}`);
    }
    // side by side: golden | app
    if (targets.includes('app')) {
      const g = path.join(OUT, `${c.state}-${vp.name}-golden.png`), a = path.join(OUT, `${c.state}-${vp.name}-app.png`);
      if (!fs.existsSync(g)) { const { page } = await open('golden', c, vp); await page.screenshot({ path: g }); await page.close(); }
      if (fs.existsSync(a)) {
        const page = await browser.newPage({ viewport: { width: vp.w * 2 + 30, height: vp.h + 40 } });
        const img = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
        await page.setContent(`<body style="margin:0;background:#222;color:#fff;font:700 14px system-ui;display:flex;gap:30px">
          <div><div style="height:40px;line-height:40px">GOLDEN · ${c.state} · ${vp.name}</div><img src="${img(g)}"></div>
          <div><div style="height:40px;line-height:40px">APP</div><img src="${img(a)}"></div></body>`);
        await page.screenshot({ path: path.join(OUT, `${c.state}-${vp.name}-side-by-side.png`) }); await page.close();
      }
    }
  }
}
await browser.close(); server.close();

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const md = ['# Golden check', '', `target: ${TARGET} · ${report.at}${PENDING ? ' · incl. pending layers' : ''}`, '',
  '| State | Viewport | Target | Result | Failed checks |', '|---|---|---|---|---|',
  ...report.runs.map((r) => `| ${r.state} | ${r.viewport} | ${r.target} | ${r.pass ? 'PASS' : '**FAIL**'} | ${r.failed.map((f) => `${f.id}: ${f.rule}${f.detail ? ' (' + f.detail + ')' : ''}`).join('<br>') || '—'} |`)];
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n');
const bad = report.runs.filter((r) => !r.pass).length;
console.log(`\n${bad ? bad + ' run(s) failed' : 'all runs passed'} — report: ${path.relative(process.cwd(), path.join(OUT, 'report.md'))}`);
process.exit(bad ? 1 : 0);
