# UI Design Map — Claude Design canvas v1 → implementation (DEC-029)

The canvas (`design-sandbox/bounty-bay-canvas/`) is the canonical UI
source; the domain package is the game-rule authority. This map binds
canvas components to the existing implementation before each slice. The
working game is preserved: every testid and flow survives; only the
visual layer moves.

## 1. Token port

`styles/bb.css` `:root` block ports 1:1 into `apps/web/src/app/globals.css`
as the canonical token set. Old Royale tokens keep working as aliases
(`--bg-0` → `--surface-world-deep`, `--gold` → `--brand-gold`,
`--turquoise` → `--brand-seaglass`, `--rival` → `--opponent`) so
non-sliced pages (profile, replay, review, landing) don't break.

Semantic roles: ember = player (me), violet = opponent, gold = value,
green = deal possible, teal = concession chips, crimson = destructive.

Type: Baloo 2 (world/display), Space Grotesk (numerals), Inter (UI) —
self-hosted via next/font (docs/09).

## 2. Slice 1 — LIVE MATCH component map

| Canvas (board) | Repo component | Verdict |
|---|---|---|
| `.world` + scene-wharf.svg, dim variants, seat lighting (LMR-D-01) | `scene.tsx` MerchantScene SVG | REPLACE — asset `public/game/scene-wharf.svg`, CSS `.light-player/.light-opponent` pools |
| table-fp.svg first-person table | `.stall-counter` interface surface | REPLACE — asset `public/game/table-fp.svg` (desktop) / `table-fp-m.svg` (mobile), no interface "counter" |
| opponent sprite behind table (ch-goldenotter.svg / ai-*.svg per persona) | stallkeeper placeholder art | REPLACE — sprite cell 1 (idle) + thinking/offer cells per turn; AI personas use `ai-{persona}.svg` |
| wooden name plaque (GOLDENOTTER · Seller · …) | `player-identity.tsx` | REPLACE styling; sub-line shows role + handle; rating numbers absent (no rating system yet — deviation) |
| hanging offer plaque: gold frame, violet face, "THEY ASK 78" (LMR-D-01), crossed → green ring (LMR-D-03) | `offer-plate.tsx` | REPLACE styling; keep `opponent-standing` testid; `.offer-plate--crossed` state |
| MY LIMIT · ONLY YOU ember card, rotated (LMR-D-01) | `confidential-position.tsx` | REPLACE styling; keep `my-rv` testid |
| price rail: track, ember/violet flame pins, gap glow, ghost pin while composing (LMR-D-01) | `gap-meter.tsx` | REPLACE; `rail` markup; opponent limit NEVER drawn pre-result (GR-002) |
| composer parchment card: −/+ steppers, value, delta, "costs N chips · M left · can't go back down" (LMR-D-01) | `offer-composer.tsx` | REPLACE styling; keep `offer-input` + `cost-preview` testids |
| SEAL OFFER blob (crimson, seal amount) | `match-actions.tsx` Make Offer | REPLACE styling; keep `make-offer` testid |
| ACCEPT pill → green rising seal on crossing, non-settling (LMR-D-03, seq D) | `match-actions.tsx` Accept | REPLACE; keep `accept-button` testid; press acts only on my turn (domain GR-014; D7 open) |
| turn ribbon YOUR MOVE / OPPONENT THINKING / OFFERS CROSSED · ACCEPT TO CLOSE (LMR-D-01/03) | `turn-banner.tsx` | REPLACE styling; keep `turn-banner` testid + exact 'YOUR MOVE' / 'OPPONENT THINKING' strings (E2E depends) |
| clock medallion: gold ring, ember/violet enamel, countdown + ×multiplier badge (LMR-D-01) | `clock-multiplier.tsx` | REPLACE lantern with medallion; keep FLOOR tag at floor |
| teal coin piles bottom-left (LMR-D-01) | `chip-meter.tsx` | REPLACE bowl with coin pile |
| chat bubble near opponent + chat button (top-right) | `chat-panel.tsx` | REPLACE styling; keep `.chat-send` button (E2E), chat opens as sheet |
| ⋯ menu (walk away lives here only — LMD-07) | `match-actions.tsx` Walk Away | REPLACE placement; keep `walk-button` testid on the menu item |
| scenario object on velvet (asset-compass.svg) | `scenario-display.tsx` | REPLACE styling; asset from scenario→asset mapping (compass default) |
| mobile: stacked composition (LMR-M-01) + keypad sheet (LMM-02) | media queries | REPLACE `.stall-counter` bottom bar with stacked layout + composer sheet |

## 3. Conflicts / deviations (also recorded in DEC-029)

1. Rating numbers on plaques: not available (rating is P1-M2) — sub-line
   shows role + handle/persona only.
2. Vocabulary: repo terms (Reservation value / Clock multiplier /
   Concession chips) replace canvas mockup labels.
3. Walk away only from the ⋯ menu (canvas) — UI change only; the domain
   WALK_AWAY command is untouched.
4. Crossed ACCEPT seal press acts only on my turn (domain rule; D7 open).
5. Sound choreography is specified (motion-spec) but not implemented;
   when implemented it stays optional, mutable, lazy (docs/09).
6. Opponent character: AI personas use the canvas `ai-*` sprites; human
   opponents use `ch-goldenotter.svg` until character selection exists
   (P1-M5).
7. Motion: keyframes ported from `styles/bb.css` v1.3 JUICE PASS with
   `prefers-reduced-motion` kill switch; REWARD-class shakes capped per
   motion-spec (≤2/match).

## 4. Slice order (directive)

1. LIVE MATCH (this map) → checkpoint (tests + URL + screenshots +
   deviations).
2. ACCEPTANCE (seq E + crossed handover) → checkpoint.
3. RESULT REVEAL (seq F beats + RS boards: DEAL stamp → limits flip →
   range → split → headline → rating → rematch; NoDeal variant) →
   checkpoint.

Secondary pages (onboarding, profile, replay, review, landing) are NOT
redesigned until the slices complete.
