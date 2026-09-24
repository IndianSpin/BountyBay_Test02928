# Context Manifest — BB-224 opening/title screen

Filled in per AGENTS.md before any task changes code.

## Objective

Implement the opening/title screen per the founder's OS-* boards
(OS-TitleD / OS-TitleM / OS-Rationale, commit `81db2df`): Lantern Wharf
scene + the v4 GoldenOtter fronting alone, 8-character teaser strip
(not tappable — a promise, not a menu), ONE dominant PLAY NOW, desktop
+ mobile. Routing carries the named PDR-4 switch (show-title-on-return,
default SHOW) so the founder's open ruling is a one-flag flip.

## Relevant rule / requirement IDs

- Founder OS boards (canvas v3 export `ef0ef7f`) + OS-Rationale
  (host-not-lineup, teaser-not-menu, one dominant action, scene-over-
  chrome, live social proof, mobile thumb-zone CTA).
- DESIGN_ACCEPTANCE non-negotiables (no generic dark SaaS, vocabulary,
  tokens, a11y/focus/reduced-motion, mobile 390 first-class).
- PDR-4 (OPEN): returning signed-in behavior — named switch, default
  SHOW (`.agents/DECISIONS.md` D-35).
- D-32/44c39da (golden-baseline-1 tag as the code base).

## Files expected to change

- `apps/web/src/lib/title-routing.ts` — the PDR-4 named switch.
- `apps/web/src/components/opening/opening-screen.tsx` + `opening.css`
  (per-area module; imported from the app route per the BB-201 CSS
  discipline).
- `apps/web/src/app/page.tsx` — renders the opening screen.
- `apps/web/e2e/title-flow.spec.ts` — acceptance spec.
- This manifest.

## Explicitly out of scope

- BB-225 (cast pose-system extension into the live match) — after.
- Live-match screen, acceptance/result screens, play route internals
  (dev-play-button / dev-practice-button / dev-slot-* testids are
  preserved on the new screen).
- Fabricating live-stats: the "Live · N deals" pill renders only when a
  real number exists (none today — hidden, deviation noted).
- GO-CastPlan.dc.html (non-canonical leftover — untouched).
- Character rendering beyond the teaser strip.

## Tests required

- E2E title-flow: signed-out visit shows the title (wordmark, tagline,
  8-face strip, PLAY NOW); PLAY NOW → /play → the existing flow
  (dev identity + create challenge) still works; PDR-4 default: a
  returning stored token still shows the title; mobile 390: no
  horizontal scroll, PLAY NOW visible.
- Regression: friend-match + practice-vs-ai (both enter via
  dev-play-button on '/'), unit, typecheck, lint.

## Result

**Changed:** `lib/title-routing.ts` (PDR-4 switch), `components/
opening/opening-screen.tsx` + `opening.css`, `app/page.tsx`, `e2e/
title-flow.spec.ts`, 7 cast assets copied into `public/game/`.

**Behavior:** the root route is the OS-board title screen — wharf +
v4 GoldenOtter fronting, season pill, wordmark/tagline/feature pills,
PLAY NOW (the only gold action, carries dev-play-button) + inert
Watch-a-match, 8-face teaser strip (not tappable), dev affordances in
a quiet row; mobile stacks the wharf as a top band with the CTA panel
in the thumb zone. PDR-4: returning players see the title (default
SHOW — one-flag flip in title-routing.ts).

**Tests:** typecheck 0 · unit 251 · lint clean · title-flow 3/3 ·
friend-match + practice-vs-ai regression green · screenshots
`design-sandbox/screenshots/bb224-title-{desktop,mobile}.png`.

**Deviations:** live-deals pill hidden (no stats endpoint — no
fabricated numbers); Watch-a-match inert (no spectator mode);
GREYLOT face uses ironheron.svg and the six cast faces use the
v2-era 9000×900 sheets (v3 art exists only as viewer blobs in the
export — flagged for a founder asset export); strip scrolls
horizontally on mobile instead of the board's overflow-hidden clip.

**Unresolved:** PDR-4 founder ruling (switch ready); BB-225 next.
