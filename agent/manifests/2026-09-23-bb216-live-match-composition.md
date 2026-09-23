# Context Manifest — BB-216 live-match composition redesign

Filled in per AGENTS.md before any task changes code.

## Objective

Reconstruct the live-match screen around ~5 visual objects per the
founder's D-24 critique + D-26 chat feedback: opponent (largest,
reactive, character-first) → their offer plaque → one negotiation
surface (rail + my limit/offer band + composer) → one action → quiet
chips/time row; chat becomes 3-level (ambient bubble next to the
character that fades in ~6 s / compact composer ~48–56 × 320–420 px /
history drawer), mobile gets a 35–50 % bottom sheet. Structural CSS
discipline: per-area modules (BB-201 split carries over).

## Relevant rule / requirement IDs

- `design-sandbox/DESIGN_ACCEPTANCE.md` §Live-match composition (rules
  1–8) + §Chat & communication (rules 1–7) + non-negotiable 1–10 —
  binding.
- D-24 + D-26 control-plane commits (`98e9b26`, `39bafa5`); founder
  feedback files in `~/projects/bounty-control/`.
- DEC-029 (canvas authority) / docs/09 (a11y bindings: focus states,
  reduced-motion, WCAG) / docs/21 §4 (screenshot + deviation pattern).
- GR-002 (opponent RV never drawn pre-result — rail stays schematic);
  GR-016 (both multipliers visible); GR-023/024 (time tiers — W1's
  TimeWarning untouched, repositioned only).
- Item 10 (illegal state / canOffer predicate) = BB-217/218, NOT this
  task; visual neutralization only (seal hides amount when the composed
  value is outside my mandate — board-level, no domain/state change).

## Files expected to change

- `apps/web/src/components/game/live-match.css` — composition rewrite
  (zones, 3-level type scale, semantic color budget, pose map, land/
  fade animations, mobile).
- `apps/web/src/components/game/{negotiation-board,chat-panel,
  offer-plate,clock-multiplier,turn-banner,gap-meter,
  confidential-position,chip-meter,player-identity}.tsx` — DOM/
  presentation restructure; all existing testids preserved.
- `apps/web/src/app/play/match-screen.tsx` — `sendChat(override?)`
  param for quick prompts (no state-predicate changes).
- `apps/web/e2e/canvas-checkpoint.spec.ts` — structural contract
  updated to the new composition (my spec; DEC-029 pattern).
- `agent/manifests/2026-09-23-bb216-live-match-composition.md` (this).

## Explicitly out of scope

- Acceptance / result-reveal screens (approved as-is) and their CSS
  (`reveal.css`, worker-1's `.lm-accept`/`.lm-walk__hold`/
  `.lm-confirm-sheet` sections in globals.css).
- Worker-1's files: `use-hold.ts`, `match-actions.tsx`,
  `time-warning.tsx`, `layout.tsx`, their E2E specs + testids
  (turn-banner text, offer-input, make-offer, accept-button,
  time-warning, walk-*, menu-button, ready-button, result*, replay*,
  zopa-bar, crossed-ribbon, my-rv, match-status, chat-panel — all
  preserved; coordinate before any rename).
- Domain/state: no command, legality, or turn changes; chat stays
  non-command (GR-013); canOffer predicate unchanged (BB-217).
- New characters/assets; voice (later); tutorial copy (moved only as a
  subtle composer hint, per D-26); secondary pages; packages/*
  (intelligence is worker-3's).

## Tests required

- Unit: `pnpm test` green (226 expected).
- Typecheck: only known red = QA-002 (worker-1's spec, BB-214).
- E2E reuse mode: `friend-match`, `hold-accept`, `timeout`,
  `canvas-checkpoint` (updated structural contract) green.
- Screenshots: before (current composition, `design-sandbox/
  screenshots/`) vs after (new captures) — founder review gate.
- Visual QA: no clipping/collisions at 390 px + 1440×900; protected
  zones; reduced-motion paths; focus states.

## Result

**Changed:** live-match.css (composition rewrite + v2 pose system),
negotiation-board.tsx (zones, pose map, seal gates), chat-panel.tsx
(3-level), offer-plate / clock-multiplier / chip-meter (quiet forms),
match-screen.tsx (sendChat override + D-28 mandate-gated canOffer),
canvas-checkpoint.spec.ts (BB-216 structural contract), 7 pose assets
in public/game/, this manifest.

**Behavior:** opponent dominates and reacts (key-pose swap), one
display plaque, one negotiation surface, one action, quiet row;
compact chat with 6 s bubble fade + quick prompts + mobile bottom
sheet; illegal amounts disable the seal (D-28) with grouped labels.

**Tests:** typecheck 0 · unit 251 passed · E2E 10 passed (strict seed)
· canvas-checkpoint green (11 captures) · QA bb-218 repro flips at its
pin.

**Deviations:** v2 boards keep the v1 UI frame (character-only pass) —
composition follows the binding DESIGN_ACCEPTANCE rules; v4 idle pose
not exported (old-otter stand-in); rig in-betweens out of reach from
static exports (key poses only); seal ember over board's crimson
(rule 6); clock medallion → quiet chip (rule 3). Full list in the
inbox READY FOR REVIEW.

**Unresolved:** v4 neutral/idle export from the founder/design pass;
W3-side quick-prompt response generation for AI opponents (routing
note); BB-213/BB-215 requeue after acceptance.
