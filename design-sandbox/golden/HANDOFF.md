# Golden reference — handoff to the manager

From: founder design session, 2026-09-24. For: the manager agent to schedule. Nothing in `apps/`, `packages/`,
`docs/` or `.agents/` was changed; everything lives in `design-sandbox/golden/`.

## Why

The golden-journey contract (CANONICAL_CONTRACTS §2) points at SH0–SH4 + PV boards + DESIGN_ACCEPTANCE +
screenshots — pictures, many of them, with images the agents cannot open. The implemented result screen is
a dark panel over the scene (the exact failure SH4 was drawn to remove) yet PRODUCT_HEALTH marks it
VISUAL = G. The live match has overlaps and clipping (dossier chip under the table, plaques over the rail,
status pills cut off). The golden reference replaces "interpret this picture" with "match this page, and a
test will tell you if you didn't".

Stabilization mode (D-70) fit: this is tooling that makes the VISUAL column measurable, not a feature. The
reward/juice layers that need decisions stay hidden (`data-pending`) until the founder rules.

## Tasks to schedule

| # | Owner | Task | Done when |
|---|---|---|---|
| G-1 | W2 | **State gallery route** `/dev/states/[state]` (dev-only, 404 in production): renders the real components for `live-match`, `result`, `bay` from `design-sandbox/golden/fixture/reference-match.json` (no match, no network). Supports `?t=end`, sets `document.documentElement.dataset.goldenReady='1'` when ready, pushes `{ id }` for each timeline step to `window.__bbTimeline`. | `golden-check --target app` runs for all three states (failures allowed at this point — they are the gap list). |
| G-1b | W2 | **Ship the painted world + skin**: copy `design-sandbox/golden/img/scene-wharf4.jpg` and `table-fp4.png` to `apps/web/public/game/scene/`; the app's world/counter components render them (cover-cropped, warm grade, vignette) in place of `scene-wharf.svg` / `table-fp.svg`; add the `--lx-*` skin tokens from `golden.css` to `globals.css` next to the canvas block. | The three states render on the painted world; `golden-check --target app` side-by-sides show the same scene. |
| G-1c | W2 | **Sound cues**: an `sfx(name)` hook the timeline calls with the names in `sfx.json`, a mute toggle, haptics on mobile; placeholder sounds until audio is commissioned. | Every timeline step with `sfx` in the contracts fires its cue in the app. |
| G-2 | W2 | **Result screen to golden**: replace the modal panel with the scene composition (`states/result.html`): stamp on the table, limit cards at the rail ends, zone split at 74, headline + split, parchment ledger with the GE-010 minimum, bounty counter and rating counter the reward flies into, her rematch offer next to her, SWAP SIDES · REMATCH primary. Timeline ids as in `contracts/result.json` (non-pending steps only). | `golden-check --target app --states result` passes at desktop and mobile; side-by-side attached. |
| G-3 | W2 | **Live match to golden**: fix composition against `states/live-match.html` (plaques part when close, dossier/limit/chips column, compact chat, decision row, ACCEPT = MAKE OFFER size in the close state, clock top centre / on the seam on mobile). | `--states live-match` passes both viewports. |
| G-4 | W2 | **The Bay to golden**: `states/bay.html` — one gold table, letters, event rail, standing (UF-09 fields), tab bar on mobile. Slots that are not live yet say what they will be (no bare "SOON"). | `--states bay` passes both viewports. |
| G-5 | QA | Add `golden-check --target app` to the Journey A QA pass; attach `check/out/report.md` and the side-by-side PNGs to every UI verdict. | Runs on integrated main. |
| G-6 | Manager | Point CANONICAL_CONTRACTS §2 at `design-sandbox/golden/` for these three states (boards stay as rationale). Add to DESIGN_ACCEPTANCE: *"A UI change to a golden state is DONE only when golden-check passes at both viewports and the side-by-side is attached."* Derive PRODUCT_HEALTH VISUAL for these states from the checker, not from judgement. | Contracts updated. |
| G-7 | Manager | Extend the same pattern to the rest of Journey A (search/found, dossier, rematch letter) — design session supplies the golden pages. | — |

## Decisions the pending layers wait on (founder)

| Layer | Blocked by | What `?pending=1` shows |
|---|---|---|
| Confetti on real milestones (promotion, first deal, personal best, rivalry lead) | docs/09 "No confetti by default" — needs a DEC | Confetti burst at the promotion (result timeline step `confetti`) |
| Persistent treasury counter (bounty accumulates across deals) | docs/03 GE-004 (no persistent balance in V1) | TREASURY counter in the result HUD and the hub, coins fly on into it |
| Divisions and promotion | docs/14 (DEC-031 #6: slots only; Merchant names placeholders) | Division bar + one PROMOTED banner |
| Today's Deal / Monthly Bounty / Live Tables live values | docs/14 (DEC-031 #6), each needs a product hypothesis (D-16) | Timer, 4/5 progress bar, live count on the Bay rail |

## Visual direction v4 — Lantern Luxe, re-composed (2026-09-24)

Same skin family as v3, re-composed after a measured audit. Read `VISUAL-AUDIT.md` first: it lists the 10 visual changes
(focal point, depth planes, type scale, word count, colour roles, area budgets, reading axis, materials, motion, characters)
and the 10 stickiness changes, with where each lives. The contracts now encode the area budgets (`minSize`, `minArea`),
so G-2…G-4 cannot pass with a thin rail or a small reveal.

Canon in v4 (no decision needed): the limit reveal with "left on the table", the band with every round's gap, the bounty
drain under the clock, the rival record, the tell (public step sizes), one-line receipt ledger, the Bay hierarchy,
sound cues. **Pending (need a founder DEC before the app builds them):** the cabinet / collection (GE-004, docs/14),
the daily lantern streak (docs/14, D-16), plus the earlier treasury, divisions, confetti and Bay live values.

Implementation notes for W2:
- `world.js` depth planes: blur and dim the painting, spotlight via `data-focus`; do not blur the table or the person.
- Preload the opponent's `rematch` sheet during the result reveal; it is swapped in at 9.2 s and otherwise flashes empty.
- Flip cards: both faces in the DOM, `backface-visibility: hidden`; `?t=end` / reduced motion shows the turned state.
- Sound: ship the cue names in `sfx.json`; produced audio replaces the placeholder synth. Respect OS mute and the in-game setting.

## Visual direction v3 — “Lantern Luxe” (founder pick, 2026-09-24)

Supersedes v2 “Sunny Bay” (rejected by the founder as childish). The golden pages now sit on the **painted v4
art** — `img/scene-wharf4.jpg` and `img/table-fp4.png` — instead of flat vector shapes. The app still ships the
flat `scene-wharf.svg` / `table-fp.svg`; that swap is the single biggest quality step and is part of G-2…G-4.

Skin rules (all in `golden.css`, tokens `--lx-*`):
- Surfaces are walnut with a fine rim (1–1.5px) and soft shadow. **v4: rims are neutral hairlines; gold = value only.** No thick ink outlines, no text strokes, no glossy candy highlights.
- One brass primary per screen (`.btn-gold`); secondary actions are walnut. Green only for ACCEPT / the deal.
- Ember = you, violet = her, gold = value, green = deal (DESIGN_ACCEPTANCE canvas tokens, unchanged).
- Reward moments get a warm light **bloom**, not spinning burst rays.
- Ambient motion is light only (lantern flicker, CTA glow). Nothing floats or drifts; everything stops under reduced motion.

Fits docs/09 “Dark is the primary theme” and the no-decorative-blobs rule — **no DEC needed for the skin.**

## Findings to note (not tasked here)

- `globals.css` still carries two token systems (canvas block = authority, plus the legacy Royale aliases). Retiring the aliases removes the "two apps" seam.
- The Bay screenshot in `screenshots/current/` predates the BB-244 fix — refresh it.
- `DESIGN_ACCEPTANCE` rule 7 (repo vocabulary) is violated by the shipped live match ("MY MAX"); the contracts forbid that string.
