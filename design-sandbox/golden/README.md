# Golden reference — executable design for the UI

**What this is.** The design for three journey states, built as runnable pages instead of pictures, plus a
checker that can say *no* to an app screen that does not match. It exists because the implementing agents
have been porting from canvas boards (pictures, dozens of them) and drifting; a page they can read as code
and a test they can fail are harder to drift from.

| State | Golden page | Contract | App route to build (see HANDOFF.md) |
|---|---|---|---|
| Live match — my decision, gap small (her 74, my 72) | `states/live-match.html` | `contracts/live-match.json` | `/dev/states/live-match` |
| Result — deal at 74 | `states/result.html` | `contracts/result.json` | `/dev/states/result` |
| The Bay — after the deal | `states/bay.html` | `contracts/bay.json` | `/dev/states/bay` |

Open `index.html` (served from the repo root, see below) to see all three at desktop and phone size.

## Authority

`docs/` still wins (AGENTS.md). Inside what the docs allow, the golden pages are the design for these
states; the canvas boards (SH, RW, PV) are the *why*. Layers that need a product decision the docs have
not made are marked `data-pending` and are **hidden by default**: add `?pending=1` to see them. Do not build
a pending layer until its decision is recorded in `docs/12_DECISION_LOG.md`.

## Rules for implementing agents

1. **Port from the golden page, not from the canvas.** Read its HTML and CSS; keep its structure, sizes and
   `data-testid` values (they already match the app's existing ids wherever one existed).
2. **One palette.** The tokens at the top of `golden.css` are the canvas block already in
   `apps/web/src/app/globals.css`. No new colours, no dark panels over the scene.
3. **Same data.** Render the state from `fixture/reference-match.json` (the reference match).
4. **Same timeline.** Implement the contract's `timeline` step ids in the same order, push
   `{ id }` to `window.__bbTimeline` as each one fires, support `?t=end` (jump to the final state) and set
   `document.documentElement.dataset.goldenReady = '1'` when the state is ready to measure.
   Every step has a reduced-motion equivalent (the final state, instantly).
5. **Done means the checker passes.** A change to one of these states is done only when
   `golden-check --target app` passes at both viewports and the side-by-side image is attached to the task.
6. **If the contract cannot be met without changing a game rule, stop and report** — never bend a rule for
   a visual.

## Run the checker

From the repo root (uses the app's Playwright; run `pnpm --filter web exec playwright install chromium` once):

```bash
node design-sandbox/golden/check/golden-check.mjs                                   # golden self-check — must pass
node design-sandbox/golden/check/golden-check.mjs --pending                         # also the pending layers
node design-sandbox/golden/check/golden-check.mjs --target app --base http://localhost:3000
node design-sandbox/golden/check/golden-check.mjs --target both --base http://localhost:3000 --states result
```

Output: `check/out/report.md` (+ `report.json`), screenshots per state × viewport × target, and for app runs
`<state>-<viewport>-side-by-side.png` (golden left, app right). Exit code 1 on any failed check.

To look at the pages by hand, serve the repo root with any static server (the pages fetch the manifest and
the fixture), e.g. `npx serve .` then open `/design-sandbox/golden/index.html`. Query parameters:
`?t=end` final state · `?t=<ms>` seek · `?speed=<n>` · `?pending=1` pending layers.

## What the checker enforces (contract schema)

```jsonc
{
  "state": "result", "appRoute": "/dev/states/result",
  "viewports": [{ "name": "desktop", "w": 1440, "h": 900 }, { "name": "mobile", "w": 390, "h": 844 }],
  "required": [{
    "id": "rematch-button",            // data-testid
    "why": "primary: SWAP SIDES · REMATCH",
    "zone":    { "desktop": [x0, y0, x1, y1] },   // element centre must lie inside (fractions of the viewport)
    "minSize": { "desktop": [w, h] }, "maxSize": { … }, "minArea": { "desktop": 0.1 },
    "text": "…",                       // must contain
    "unoccluded": true | "top-half",   // hit-test probes must land on the element itself
    "near": "result-person",           // centre within 45% of the screen diagonal
    "largest": true,                   // bigger than every other required element (containers excluded)
    "viewports": ["desktop"],          // only check on these
    "pending": "PDR-13"                // only checked with --pending
  }],
  "noOverlap": [["a", "b"]],           // bounding boxes may not intersect
  "forbidden": { "text": ["MY MAX"], "selectors": ["[role=dialog][data-testid=result]"] },
  "timeline": [{ "id": "deal-lock", "at": 0, "action": "stamp", "target": "result-stamp" }]
}
```

Also always checked: every required element fully on screen, and no horizontal scroll.

## Files

- `golden.css` — tokens (copied from the app) + shared components: chunky buttons, plaques, chess clock, counters, bars, stamp.
- `golden.js` — runtime: sprite player (same manifest and sheets as `apps/web/.../sprite-player.tsx`), timeline, reward-layer moves (count-up, pop, fly-to-counter, bar fill, confetti), `?t` / `?speed` / `?pending`.
- `fixture/reference-match.json` — the reference match; economy numbers follow economy-0.3.0 (DEC-031).
- `contracts/*.json` — one per state; the checker and the golden page read the same file.
- `check/golden-check.mjs` — the checker.
- `HANDOFF.md` — the tasks and decisions this needs.

## Known limits

- The golden pages load fonts from Google Fonts (reference only); the app self-hosts them.
- No pixel diff: the app will never match pixel for pixel. Structure is enforced; look is judged on the side-by-side image.
- Character sprites are transparent images, so overlap rules never use the character's box — the hit-test (“not covered”) rule protects the face and hands instead.
