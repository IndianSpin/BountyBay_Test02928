# Bounty Bay design canvas — export

Exported from the claude.ai Design canvas "Bounty Bay — Product Design v2" (refreshed 2026-09-24: 48 pages, 317 boards on the canvas; 296 current boards here — superseded ones moved out, see below).

> **Status: design reference, NOT canonical.** `AGENTS.md` source-of-truth order still applies: `docs/` wins over anything here. Where this folder and `docs/` disagree, stop and report — do not infer intent. Visual/frontend guidance is governed by `docs/09_UI_DESIGN_SYSTEM.md`.

## START HERE — the current design, in priority order

| # | Pages / boards | What it is | Target visuals |
|---|---|---|---|
| 0 | **SH0–SH4** (`SH-*`) — **awaiting founder review** | Game shell / player journey proposal: The Bay → choose battle → matchmaking → intro → live table with chess clock → result → rematch → back to The Bay, one player (BOB) and one match (THE RUBY COMPASS vs KESTREL) throughout. Includes Bay IA, battle-selection hierarchy, navigation model, chess-clock spec and 20 PRODUCT DECISIONS REQUIRED. **Not approved — do not implement yet.** | `renders/SH-*.jpg` |
| 0b | **RW0–RW2** (`RW-*`) — **awaiting founder review** | Reward choreography: 25 events, each as ANTICIPATION → ACTION → IMPACT → REVEAL → REWARD → PERSISTENCE → NEXT OPEN LOOP, with volume (PV3 ladder), length, proposed trigger event, reduced-motion fallback and rule refs; the deal-at-74 timeline; the loss mirror. Spec for one sequencer — supersedes the event list in `motion-spec.md` where they differ. | `renders/RW-*.jpg` |
| 1 | **PV0–PV4** (`PV-*`) | PvP product vision (founder direction, D-48): thesis, loop, information boundary, attention per state, communication, live sequence, showdown, juice ladder, swap sides, rivalry. Experience/flow direction — **not new game rules**. | `renders/PV-*.jpg` |
| 2 | **OS** (`OS-*`) | Opening / title screen. | `renders/OS-*.jpg` |
| 3 | **C2** (`GO2-*`) | GoldenOtter v4 — the approved character quality benchmark. | `renders/GO2-*.jpg` |
| 4 | **CAST** (`CAST-*`) | The other 7 characters (GREYLOT heron, HOGSHEAD, PIP QUILL, VESPERINE, OLD MOSSBACK, MARIGOLD FENN, ZIPPA RATCHET) at the v4 standard. | `renders/CAST-*-{FullBody,Expressions,Gestures}.jpg` |
| 5 | **A6** (`LMR-*`), **A1/A5/A7**, **J1–J4** | Live-match composition authority; art direction; juice system (`motion-spec.md`). | existing `renders/` |
| 6 | **Pages 00–19** | Flow and state coverage for every screen. Drawn in the **pre-v4 art style**: use them for states, content and copy — **not** for character art or visual style. Where they overlap with rows 1–5, rows 1–5 win. | — |

## Character art for the app (v4 export, drop-in)

`apps/web/public/game/` (and a copy in `assets/`) now holds the v4 art in the **same file names and formats** the app already loads, so no code change is needed:

| File | Format | Used by |
|---|---|---|
| `otter-{idle,thinking,speaking,offer,smug,offline,rematch}.svg` | 520×560, one pose each | GoldenOtter (`kind: 'files'`), opening screen |
| `ch-{hogshead,pipquill,vesperine,mossback,marigold,zippa}.svg` | 9000×900 sheet, 15 cells of 600×900 | `kind: 'sheet'` characters |
| `ironheron.svg` | 120×120 portrait | GREYLOT (`kind: 'avatar'`) |
| `ch-greylot.svg` | 9000×900 sheet | **new, not yet wired**: flip GREYLOT to `kind: 'sheet'` in `character-registry.ts` to use its poses |
| `ch-goldenotter.svg` | 9000×900 sheet | not used by the app today (GoldenOtter uses the `otter-*` files) |

Sheet cell order (unchanged): idle, thinking, listening, speaking, offer, holding, surprised, pleased, smug, frustrated, accepted, nodeal, disconnected, rematch, seller.

## Character animation (rig motion, all 8 characters)

`apps/web/public/game/anim/<character>/<clip>.webp` + `anim/manifest.json` — real frame-by-frame motion rendered from the same rig as the static art (eyelids, brows, mouth, head tilt, lean, wrist targets interpolated between keyframes). Answers TD-4.

- Characters: `goldenotter`, `greylot`, `hogshead`, `pipquill`, `vesperine`, `mossback`, `marigold`, `zippa`.
- Clips: `idle` (breathing + blink, loop), `listen` (loop), `think` (own clock running, loop), `speak` (chat / quick line / pitch, loop), `offer`, `concede`, `accept`, `nodeal` (one-shots: hold the last frame), `react` (**AI personas only** — a human avatar never shows a reaction the human did not make, PV0), `rematch` (loop).
- Format: 12 fps, grid sheets of 400×600 cells, frame i at `((i % cols)·400, floor(i / cols)·600)`; transparent; same framing and ground line as the `ch-*.svg` cells, so existing crops/positions carry over (mind the pre-existing px-offset assumption in `live-match.css`). ~32 MB total, ~400 KB per clip — load per character on match start.
- Reference player: `design-sandbox/bounty-bay-canvas/anim-player.html` (serve the repo root, open it; it reads the manifest).
- Nothing is wired in the app; triggers map 1:1 to domain events (offer sent, concession, accept, walk-away/timeout, chat line, active clock).

## Superseded — never implement from these

Moved to `design-sandbox/_superseded/` (kept for history only): C1 `GO-*` (replaced by C2 `GO2-*`), A2 `CR-*` character routes (decided: Route A), A3 `CC-*` old cast lineup and A4 `PE-*` old pose/expression matrix (replaced by `GO2-*` + `CAST-*` and PV0's rule that a human's avatar only performs what the human did), the pre-canvas concept pages (`concepts/`, `arena.html`, `deal-table.html`, `comparison.html`), their screenshots, and rejected character art (routes B/C, BLACK PARROT → replaced by the GREYLOT heron).

## What is here

| Path | What it is | Use it for |
|---|---|---|
| `motion-spec.md` | Juice pass as plain text: intensity classes, tokens, all 24 events × 10 dimensions, sequences A–H, full-path storyboard | Animation / feedback / reward work (PV3 · Juice refines the intensity ladder) |
| `renders/*.jpg` | Screenshots of the current boards (PV, OS, GO2, CAST, art direction, juice, revised live match) | Looking at the target visuals (read an image with `@`) |
| `styles/bb.css` | Tokens + component styles used by the boards, incl. `v1.3 JUICE PASS` keyframes | Porting colours, keyframes, easings |
| `boards/*.dc.html` | Source of every current board (HTML + inline styles; `{{…}}`/`<sc-if>` are canvas template syntax; images are `/_blob/…` canvas URLs — use `renders/` to see them) | Exact positions, sizes, copy |
| `assets/` | v4 character exports (see above), scenes, hero assets, table foregrounds, v0 avatars used by pages 00–19 | Art |
| `canvas.json` | Index of the live canvas: pages, boards, positions (still lists the superseded boards; their files are in `_superseded/`) | Finding which board belongs to which page |

Boards are mockups, not production components. They need the canvas runtime (not included) to evaluate `{{…}}` / `<sc-if>`; opened directly in a browser they show raw template text. Interactive boards (e.g. `JX-Playable`, `PR-CoreLoop`) only play on the canvas itself.

## Known conflicts / checks against `docs/`

- Resolved: `docs/09` rejects "parrot mascots" — BLACK PARROT was replaced by **GREYLOT**, a heron auctioneer (CAST pages; persona mapping D-45).
- Colour roles: the canvas uses **ember = me, violet = opponent, gold = value, green = deal possible**; `docs/09` names `--accent` turquoise as the primary accent and `--rival` purple. Confirm the mapping.
- Vocabulary: canvas says *limit* / *bounty multiplier*; binding repo terms are **Reservation value** / **Clock multiplier** / **Concession chips**.
- Fonts: boards load Google Fonts at runtime (mockup only); `docs/09` requires self-hosted fonts via `next/font`.
- All items listed under "Open decisions" in `motion-spec.md` are PRODUCT DECISIONS, not rules.

## Pages and boards

### RW0 · Reward choreography: vocabulary, index, open loops

- `boards/RW-Vocabulary.dc.html` — RW0 · The seven beats + nine rules · render: `renders/RW-Vocabulary.jpg`
- `boards/RW-Index.dc.html` — RW0 · Event index (25) · render: `renders/RW-Index.jpg`
- `boards/RW-Loops.dc.html` — RW0 · The chain of open loops · render: `renders/RW-Loops.jpg`

### RW1 · Reward choreography: intro and the table (01–17)

- `boards/RW-Intro.dc.html` — RW1 · 01–06 · render: `renders/RW-Intro.jpg`
- `boards/RW-Table.dc.html` — RW1 · 07–12 · render: `renders/RW-Table.jpg`
- `boards/RW-End.dc.html` — RW1 · 13–17 · render: `renders/RW-End.jpg`

### RW2 · Reward choreography: reveal, reward, return (18–25)

- `boards/RW-Reveal.dc.html` — RW2 · 18–21 · render: `renders/RW-Reveal.jpg`
- `boards/RW-After.dc.html` — RW2 · 22–25 · render: `renders/RW-After.jpg`
- `boards/RW-Deal74.dc.html` — RW2 · The deal at 74, beat by beat · render: `renders/RW-Deal74.jpg`
- `boards/RW-Mirror.dc.html` — RW2 · The loss mirror · render: `renders/RW-Mirror.jpg`

### SH0 · Game shell: journey, rules check, decisions

- `boards/SH-Journey.dc.html` — SH0 · Journey at a glance · render: `renders/SH-Journey.jpg`
- `boards/SH-RulesCheck.dc.html` — SH0 · Rules check — brief vs docs · render: `renders/SH-RulesCheck.jpg`
- `boards/SH-Decisions.dc.html` — SH0 · 10 — Product decisions required (20) · render: `renders/SH-Decisions.jpg`

### SH1 · Desktop journey storyboard

- `boards/SH-Desk-1.dc.html` — SH1 · 1 — Desktop 01–09 · render: `renders/SH-Desk-1.jpg`
- `boards/SH-Desk-2.dc.html` — SH1 · 1 — Desktop 10–16 · render: `renders/SH-Desk-2.jpg`

### SH2 · Mobile journey storyboard

- `boards/SH-Mob-1.dc.html` — SH2 · 2 — Mobile 01–08 · render: `renders/SH-Mob-1.jpg`
- `boards/SH-Mob-2.dc.html` — SH2 · 2 — Mobile 09–16 · render: `renders/SH-Mob-2.jpg`

### SH3 · The Bay IA, battle selection, navigation

- `boards/SH-BayIA.dc.html` — SH3 · 3 — Information architecture of The Bay · render: `renders/SH-BayIA.jpg`
- `boards/SH-Battle.dc.html` — SH3 · 4 — Battle-selection hierarchy · render: `renders/SH-Battle.jpg`
- `boards/SH-Nav.dc.html` — SH3 · 9 — Navigation model · render: `renders/SH-Nav.jpg`

### SH4 · Intro, chess clock, attention, result → rematch

- `boards/SH-Intro.dc.html` — SH4 · 5 — Match-intro choreography · render: `renders/SH-Intro.jpg`
- `boards/SH-Clock.dc.html` — SH4 · 6 — Chess-clock interaction · render: `renders/SH-Clock.jpg`
- `boards/SH-Attention.dc.html` — SH4 · 7 — Live-match attention hierarchy · render: `renders/SH-Attention.jpg`
- `boards/SH-Result.dc.html` — SH4 · 8 — Result and rematch transition · render: `renders/SH-Result.jpg`

### PV0 · PvP thesis, rules check, decisions

- `boards/PV-Thesis.dc.html` — PV0 · A — Product experience thesis · render: `renders/PV-Thesis.jpg`
- `boards/PV-RulesCheck.dc.html` — PV0 · Rules check — brief vs docs/02, docs/17 · render: `renders/PV-RulesCheck.jpg`
- `boards/PV-Decisions.dc.html` — PV0 · N — Product decisions required (19) · render: `renders/PV-Decisions.jpg`

### PV1 · Core loop, information, attention, communication

- `boards/PV-Loop.dc.html` — PV1 · B — Core PvP loop · render: `renders/PV-Loop.jpg`
- `boards/PV-Info.dc.html` — PV1 · C — Information model · render: `renders/PV-Info.jpg`
- `boards/PV-Attention.dc.html` — PV1 · D — Attention model · render: `renders/PV-Attention.jpg`
- `boards/PV-Comms.dc.html` — PV1 · E — Communication model · render: `renders/PV-Comms.jpg`

### PV2 · Live sequence + credibility stories

- `boards/PV-Seq-1.dc.html` — PV2 · 1 — “The other buyer” 01–06 · render: `renders/PV-Seq-1.jpg`
- `boards/PV-Seq-2.dc.html` — PV2 · 2 — “The other buyer” 07–12 · render: `renders/PV-Seq-2.jpg`
- `boards/PV-Cred-Wall.dc.html` — PV2 · 3 — “The wall” · render: `renders/PV-Cred-Wall.jpg`
- `boards/PV-Cred-Verified.dc.html` — PV2 · 4 — “The appraisal” · render: `renders/PV-Cred-Verified.jpg`
- `boards/PV-Mobile.dc.html` — PV2 · M — Mobile: the same story on a phone · render: `renders/PV-Mobile.jpg`

### PV3 · Showdown + game juice

- `boards/PV-Showdown.dc.html` — PV3 · J — Showdown, frame by frame · render: `renders/PV-Showdown.jpg`
- `boards/PV-Juice.dc.html` — PV3 · K — Game-juice intensity system · render: `renders/PV-Juice.jpg`

### PV4 · Swap sides + rivalry

- `boards/PV-Swap.dc.html` — PV4 · G — SWAP SIDES. PROVE IT. · render: `renders/PV-Swap.jpg`
- `boards/PV-Rivalry.dc.html` — PV4 · H — Rivalry: first, fifth, tied · render: `renders/PV-Rivalry.jpg`

### OS · Opening screen

- `boards/OS-TitleD.dc.html` — OS · 1 — TITLE SCREEN (desktop) · render: `renders/OS-TitleD.jpg`
- `boards/OS-TitleM.dc.html` — OS · 2 — TITLE SCREEN (mobile) · render: `renders/OS-TitleM.jpg`
- `boards/OS-Rationale.dc.html` — OS · 3 — DESIGN RATIONALE · render: `renders/OS-Rationale.jpg`

### C2 · GoldenOtter refinement

- `boards/GO2-FullBody.dc.html` — C2 · 1 — REFINED FULL-BODY SHEET · render: `renders/GO2-FullBody.jpg`
- `boards/GO2-LiveMatch.dc.html` — C2 · 2 — LIVE MATCH close crop: repainted wharf + lit GoldenOtter (your move) · render: `renders/GO2-LiveMatch.jpg`
- `boards/GO2-Expressions.dc.html` — C2 · 3 — FACIAL EXPRESSION SHEET (8 targets + 4 support) · render: `renders/GO2-Expressions.jpg`
- `boards/GO2-Gestures.dc.html` — C2 · 4 — NEGOTIATION GESTURE SHEET (8) · render: `renders/GO2-Gestures.jpg`
- `boards/GO2-Construction.dc.html` — C2 · 5 — BODY CONSTRUCTION / PROPORTION PASS · render: `renders/GO2-Construction.jpg`
- `boards/GO2-Materials.dc.html` — C2 · 6 — MATERIALS / RENDERING PASS (fur · wool · silk · metal · paper · leather) · render: `renders/GO2-Materials.jpg`
- `boards/GO2-Environment.dc.html` — C2 · 7 — ENVIRONMENT STYLE-MATCHED PASS (Lantern Wharf v4) · render: `renders/GO2-Environment.jpg`
- `boards/GO2-Animation.dc.html` — C2 · 8 — ANIMATION KEY-POSE SHEET (10 states) · render: `renders/GO2-Animation.jpg`
- `boards/GO2-BeforeAfter.dc.html` — C2 · 9 — BEFORE / AFTER · render: `renders/GO2-BeforeAfter.jpg`
- `boards/GO2-Rationale.dc.html` — C2 · 10 — RATIONALE · render: `renders/GO2-Rationale.jpg`

### CAST · The 7 new characters (GREYLOT → ZIPPA)

- `boards/CAST-HERON-Animation.dc.html` — GREYLOT · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-HERON-BeforeAfter.dc.html` — GREYLOT · 9 — BEFORE / AFTER
- `boards/CAST-HERON-Construction.dc.html` — GREYLOT · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-HERON-Environment.dc.html` — GREYLOT · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-HERON-Expressions.dc.html` — GREYLOT · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-HERON-Expressions.jpg`
- `boards/CAST-HERON-FullBody.dc.html` — GREYLOT · 1 — FULL-BODY SHEET · render: `renders/CAST-HERON-FullBody.jpg`
- `boards/CAST-HERON-Gestures.dc.html` — GREYLOT · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-HERON-Gestures.jpg`
- `boards/CAST-HERON-LiveMatch.dc.html` — GREYLOT · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-HERON-Materials.dc.html` — GREYLOT · 6 — MATERIALS PASS
- `boards/CAST-HERON-Rationale.dc.html` — GREYLOT · 10 — DESIGN RATIONALE
- `boards/CAST-HOGSHEAD-Animation.dc.html` — HOGSHEAD · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-HOGSHEAD-BeforeAfter.dc.html` — HOGSHEAD · 9 — BEFORE / AFTER
- `boards/CAST-HOGSHEAD-Construction.dc.html` — HOGSHEAD · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-HOGSHEAD-Environment.dc.html` — HOGSHEAD · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-HOGSHEAD-Expressions.dc.html` — HOGSHEAD · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-HOGSHEAD-Expressions.jpg`
- `boards/CAST-HOGSHEAD-FullBody.dc.html` — HOGSHEAD · 1 — FULL-BODY SHEET · render: `renders/CAST-HOGSHEAD-FullBody.jpg`
- `boards/CAST-HOGSHEAD-Gestures.dc.html` — HOGSHEAD · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-HOGSHEAD-Gestures.jpg`
- `boards/CAST-HOGSHEAD-LiveMatch.dc.html` — HOGSHEAD · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-HOGSHEAD-Materials.dc.html` — HOGSHEAD · 6 — MATERIALS PASS
- `boards/CAST-HOGSHEAD-Rationale.dc.html` — HOGSHEAD · 10 — DESIGN RATIONALE
- `boards/CAST-MARIGOLD-Animation.dc.html` — MARIGOLD FENN · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-MARIGOLD-BeforeAfter.dc.html` — MARIGOLD FENN · 9 — BEFORE / AFTER
- `boards/CAST-MARIGOLD-Construction.dc.html` — MARIGOLD FENN · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-MARIGOLD-Environment.dc.html` — MARIGOLD FENN · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-MARIGOLD-Expressions.dc.html` — MARIGOLD FENN · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-MARIGOLD-Expressions.jpg`
- `boards/CAST-MARIGOLD-FullBody.dc.html` — MARIGOLD FENN · 1 — FULL-BODY SHEET · render: `renders/CAST-MARIGOLD-FullBody.jpg`
- `boards/CAST-MARIGOLD-Gestures.dc.html` — MARIGOLD FENN · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-MARIGOLD-Gestures.jpg`
- `boards/CAST-MARIGOLD-LiveMatch.dc.html` — MARIGOLD FENN · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-MARIGOLD-Materials.dc.html` — MARIGOLD FENN · 6 — MATERIALS PASS
- `boards/CAST-MARIGOLD-Rationale.dc.html` — MARIGOLD FENN · 10 — DESIGN RATIONALE
- `boards/CAST-MOSSBACK-Animation.dc.html` — OLD MOSSBACK · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-MOSSBACK-BeforeAfter.dc.html` — OLD MOSSBACK · 9 — BEFORE / AFTER
- `boards/CAST-MOSSBACK-Construction.dc.html` — OLD MOSSBACK · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-MOSSBACK-Environment.dc.html` — OLD MOSSBACK · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-MOSSBACK-Expressions.dc.html` — OLD MOSSBACK · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-MOSSBACK-Expressions.jpg`
- `boards/CAST-MOSSBACK-FullBody.dc.html` — OLD MOSSBACK · 1 — FULL-BODY SHEET · render: `renders/CAST-MOSSBACK-FullBody.jpg`
- `boards/CAST-MOSSBACK-Gestures.dc.html` — OLD MOSSBACK · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-MOSSBACK-Gestures.jpg`
- `boards/CAST-MOSSBACK-LiveMatch.dc.html` — OLD MOSSBACK · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-MOSSBACK-Materials.dc.html` — OLD MOSSBACK · 6 — MATERIALS PASS
- `boards/CAST-MOSSBACK-Rationale.dc.html` — OLD MOSSBACK · 10 — DESIGN RATIONALE
- `boards/CAST-PIPQUILL-Animation.dc.html` — PIP QUILL · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-PIPQUILL-BeforeAfter.dc.html` — PIP QUILL · 9 — BEFORE / AFTER
- `boards/CAST-PIPQUILL-Construction.dc.html` — PIP QUILL · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-PIPQUILL-Environment.dc.html` — PIP QUILL · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-PIPQUILL-Expressions.dc.html` — PIP QUILL · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-PIPQUILL-Expressions.jpg`
- `boards/CAST-PIPQUILL-FullBody.dc.html` — PIP QUILL · 1 — FULL-BODY SHEET · render: `renders/CAST-PIPQUILL-FullBody.jpg`
- `boards/CAST-PIPQUILL-Gestures.dc.html` — PIP QUILL · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-PIPQUILL-Gestures.jpg`
- `boards/CAST-PIPQUILL-LiveMatch.dc.html` — PIP QUILL · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-PIPQUILL-Materials.dc.html` — PIP QUILL · 6 — MATERIALS PASS
- `boards/CAST-PIPQUILL-Rationale.dc.html` — PIP QUILL · 10 — DESIGN RATIONALE
- `boards/CAST-VESPERINE-Animation.dc.html` — VESPERINE · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-VESPERINE-BeforeAfter.dc.html` — VESPERINE · 9 — BEFORE / AFTER
- `boards/CAST-VESPERINE-Construction.dc.html` — VESPERINE · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-VESPERINE-Environment.dc.html` — VESPERINE · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-VESPERINE-Expressions.dc.html` — VESPERINE · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-VESPERINE-Expressions.jpg`
- `boards/CAST-VESPERINE-FullBody.dc.html` — VESPERINE · 1 — FULL-BODY SHEET · render: `renders/CAST-VESPERINE-FullBody.jpg`
- `boards/CAST-VESPERINE-Gestures.dc.html` — VESPERINE · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-VESPERINE-Gestures.jpg`
- `boards/CAST-VESPERINE-LiveMatch.dc.html` — VESPERINE · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-VESPERINE-Materials.dc.html` — VESPERINE · 6 — MATERIALS PASS
- `boards/CAST-VESPERINE-Rationale.dc.html` — VESPERINE · 10 — DESIGN RATIONALE
- `boards/CAST-ZIPPA-Animation.dc.html` — ZIPPA RATCHET · 8 — ANIMATION KEY-POSE SHEET
- `boards/CAST-ZIPPA-BeforeAfter.dc.html` — ZIPPA RATCHET · 9 — BEFORE / AFTER
- `boards/CAST-ZIPPA-Construction.dc.html` — ZIPPA RATCHET · 5 — CONSTRUCTION / PROPORTION PASS
- `boards/CAST-ZIPPA-Environment.dc.html` — ZIPPA RATCHET · 7 — ENVIRONMENT / SCENE INTEGRATION
- `boards/CAST-ZIPPA-Expressions.dc.html` — ZIPPA RATCHET · 3 — EXPRESSION SHEET (8 targets) · render: `renders/CAST-ZIPPA-Expressions.jpg`
- `boards/CAST-ZIPPA-FullBody.dc.html` — ZIPPA RATCHET · 1 — FULL-BODY SHEET · render: `renders/CAST-ZIPPA-FullBody.jpg`
- `boards/CAST-ZIPPA-Gestures.dc.html` — ZIPPA RATCHET · 4 — GESTURE SHEET (8 signature gestures) · render: `renders/CAST-ZIPPA-Gestures.jpg`
- `boards/CAST-ZIPPA-LiveMatch.dc.html` — ZIPPA RATCHET · 2 — LIVE-MATCH crop, lit to match the shared negotiation table
- `boards/CAST-ZIPPA-Materials.dc.html` — ZIPPA RATCHET · 6 — MATERIALS PASS
- `boards/CAST-ZIPPA-Rationale.dc.html` — ZIPPA RATCHET · 10 — DESIGN RATIONALE


### J1 · Juice system: rules & tokens

- `boards/JX-Principles.dc.html` — J1 · PRINCIPLES — intensity classes, budgets, the scene graph · render: `renders/JX-Principles.jpg`
- `boards/JX-Tokens.dc.html` — J1 · TOKENS — curves, sound, haptics, light · render: `renders/JX-Tokens.jpg`

### J2 · Event choreography (24 events)

- `boards/JX-Events-Negotiation.dc.html` — J2 · EVENTS — negotiation · render: `renders/JX-Events-Negotiation.jpg`
- `boards/JX-Events-Close.dc.html` — J2 · EVENTS — closing · render: `renders/JX-Events-Close.jpg`
- `boards/JX-Events-Result.dc.html` — J2 · EVENTS — result & progression · render: `renders/JX-Events-Result.jpg`

### J3 · Signature sequences A–H

- `boards/JX-A-OfferLanding.dc.html` — J3 · A — Offer landing · render: `renders/JX-A-OfferLanding.jpg`
- `boards/JX-B-ConcessionSpend.dc.html` — J3 · B — Concession spend · render: `renders/JX-B-ConcessionSpend.jpg`
- `boards/JX-C-DealHeat.dc.html` — J3 · C — Deal heat · render: `renders/JX-C-DealHeat.jpg`
- `boards/JX-D-DealPossible.dc.html` — J3 · D — Deal possible (offers crossed) · render: `renders/JX-D-DealPossible.jpg`
- `boards/JX-E-Acceptance.dc.html` — J3 · E — Acceptance · render: `renders/JX-E-Acceptance.jpg`
- `boards/JX-F-ResultReveal.dc.html` — J3 · F — Result reveal · render: `renders/JX-F-ResultReveal.jpg`
- `boards/JX-G-Performance.dc.html` — J3 · G — High-performance celebration · render: `renders/JX-G-Performance.jpg`
- `boards/JX-H-Promotion.dc.html` — J3 · H — Rank promotion · render: `renders/JX-H-Promotion.jpg`

### J4 · Full-path storyboard

- `boards/JX-Storyboard-Silent.dc.html` — J4 · SILENT STORYBOARD — 16 frames, no captions · render: `renders/JX-Storyboard-Silent.jpg`
- `boards/JX-Storyboard.dc.html` — J4 · STORYBOARD — beats, classes, durations, notes · render: `renders/JX-Storyboard.jpg`
- `boards/JX-FeelCurve.dc.html` — J4 · FEEL CURVE — why it satisfies without text · render: `renders/JX-FeelCurve.jpg`
- `boards/JX-Playable.dc.html` — J4 · PLAYABLE — the full path with real timing (Play / step / reduced motion) · render: `renders/JX-Playable.jpg`

### A1 · World & art direction

- `boards/AD-World.dc.html` — A · WORLD — pillars, districts, what we are not · render: `renders/AD-World.jpg`
- `boards/AD-Palette.dc.html` — A · COLOUR — semantic vs world palette, six moods · render: `renders/AD-Palette.jpg`
- `boards/AD-Materials.dc.html` — A · MATERIALS — plaque, wax card, limit card, chips, clock, stamp, notice · render: `renders/AD-Materials.jpg`

### A2 · A3 · A4 — moved to `design-sandbox/_superseded/` (see above)

### A5 · Asset art & environments

- `boards/AS-Hero.dc.html` — F · HERO ASSETS — compass, engine, codex + value cues · render: `renders/AS-Hero.jpg`
- `boards/EN-Wharf.dc.html` — G · LANTERN WHARF — night navigation stall · Goldenotter · Ruby Compass · render: `renders/EN-Wharf.jpg`
- `boards/EN-Gearside.dc.html` — G · GEARSIDE DOCKS — sunny workshop · Zippa · Comet Twin · render: `renders/EN-Gearside.jpg`
- `boards/EN-Stacks.dc.html` — G · THE STACKS — rainy archive · Old Mossback · Vellum Codex · render: `renders/EN-Stacks.jpg`
- `boards/EN-Layers.dc.html` — G · LAYERS — depth rules for every scene · render: `renders/EN-Layers.jpg`

### A6 · Live match — revised (first person)

- `boards/LMR-D-01-YourMove.dc.html` — H · DESKTOP · Your move — composing an offer · render: `renders/LMR-D-01-YourMove.jpg`
- `boards/LMR-D-02-TheirMove.dc.html` — H · DESKTOP · Their move — Goldenotter thinking · render: `renders/LMR-D-02-TheirMove.jpg`
- `boards/LMR-D-03-Crossed.dc.html` — H · DESKTOP · Offers crossed — accept to close · render: `renders/LMR-D-03-Crossed.jpg`
- `boards/LMR-M-01-YourMove.dc.html` — I · MOBILE · Your move · render: `renders/LMR-M-01-YourMove.jpg`
- `boards/LMR-M-02-TheirMove.dc.html` — I · MOBILE · Their move · render: `renders/LMR-M-02-TheirMove.jpg`
- `boards/LMR-M-03-Crossed.dc.html` — I · MOBILE · Offers crossed · render: `renders/LMR-M-03-Crossed.jpg`
- `boards/LMR-Compare.dc.html` — J · COMPARISON — current LMD-02 vs revised · render: `renders/LMR-Compare.jpg`
- `boards/LMR-BlurTest.dc.html` — H/I · BLUR TEST — revised desktop + mobile · render: `renders/LMR-BlurTest.jpg`
- `boards/LMR-Acceptance.dc.html` — ACCEPTANCE — the brief’s nine checks, honestly scored · render: `renders/LMR-Acceptance.jpg`

### A7 · Art & character design system

- `boards/SY-Style.dc.html` — K · STYLE SPEC — 13 rules · render: `renders/SY-Style.jpg`
- `boards/SY-Audit.dc.html` — K · AUDIT — current vs revised · render: `renders/SY-Audit.jpg`
- `boards/SY-Rejects.dc.html` — K · REJECTED SHORTCUTS · render: `renders/SY-Rejects.jpg`
- `boards/SY-Production.dc.html` — K · PRODUCTION — rig, sheets, scenes, animation, new characters · render: `renders/SY-Production.jpg`

### 00 · Start here

- `boards/Cover.dc.html` — Cover · how to read this canvas
- `boards/IA-Map.dc.html` — A · IA v2 — Bay / PLAY / Me
- `boards/IA-Modes.dc.html` — A · Progressive unlock map (replaces equal mode list)
- `boards/IA-StateModel.dc.html` — A · Match lifecycle

### 01 · Flow maps

- `boards/FL-Core.dc.html` — B · Flow maps — core
- `boards/FL-Extended.dc.html` — B · Flow maps — voice, events, spectator

### 02 · Live match — desktop

- `boards/LMD-01-YourTurn.dc.html` — LMD-01 · Your turn (idle: raise or accept)
- `boards/LMD-02-Composing.dc.html` — LMD-02 · Composing: chips appear only now
- `boards/LMD-03-OppThinking.dc.html` — LMD-03 · Offer committed → they think
- `boards/LMD-04-OfferArrives.dc.html` — LMD-04 · Their offer arrives — plaque slides toward yours
- `boards/LMD-05-DealPossible.dc.html` — LMD-05 · Offers crossed — the counter lights up
- `boards/LMD-06-AcceptHold.dc.html` — LMD-06 · Accept — press & hold
- `boards/LMD-07-WalkAway.dc.html` — LMD-07 · Walk away (from ⋯ menu only)
- `boards/LMD-08-NoChips.dc.html` — LMD-08 · Not enough chips
- `boards/LMD-09-Floor.dc.html` — LMD-09 · Bounty at its 30% floor
- `boards/LMD-10-OppOffline.dc.html` — LMD-10 · Opponent disconnected
- `boards/LMD-11-Reconnecting.dc.html` — LMD-11 · You are reconnecting
- `boards/LMD-12-Paused.dc.html` — LMD-12 · Match paused
- `boards/LMD-13-DealClosed.dc.html` — LMD-13 · DEAL! → result
- `boards/LMD-00-BlurTest.dc.html` — BLUR TEST · six questions answered without text

### 03 · Live match — mobile

- `boards/LMM-01-YourTurn.dc.html` — LMM-01 · Your turn
- `boards/LMM-02-Keypad.dc.html` — LMM-02 · Composing (chips appear)
- `boards/LMM-03-OppThinking.dc.html` — LMM-03 · They’re thinking
- `boards/LMM-04-OfferArrived.dc.html` — LMM-04 · Offer arrives (close)
- `boards/LMM-05-DealPossible.dc.html` — LMM-05 · Crossed: deal possible
- `boards/LMM-06-Chat.dc.html` — LMM-06 · Chat sheet — plaques + limit stay visible
- `boards/LMM-07-AcceptHold.dc.html` — LMM-07 · Hold to accept
- `boards/LMM-08-WalkAway.dc.html` — LMM-08 · Walk away sheet
- `boards/LMM-09-NoChips.dc.html` — LMM-09 · Not enough chips
- `boards/LMM-10-Floor.dc.html` — LMM-10 · Bounty floor
- `boards/LMM-11-OppOffline.dc.html` — LMM-11 · Opponent offline
- `boards/LMM-12-Reconnecting.dc.html` — LMM-12 · Reconnecting
- `boards/LMM-14-AboveLimit.dc.html` — LMM-14 · Proposed offer above your limit
- `boards/LMM-13-Menu.dc.html` — LMM-13 · ⋯ Match menu (the only way to walk away)
- `boards/LMM-15-DealClosed.dc.html` — LMM-15 · DEAL!

### 04 · Voice deal (P1)

- `boards/VO-D-Live.dc.html` — VO-D · Voice deal: GOLDENOTTER speaking (their portrait talks)
- `boards/VO-D-Poor.dc.html` — VO-D · You muted · their connection choppy
- `boards/VO-M-Live.dc.html` — VO-M · Voice deal (mobile)
- `boards/VO-M-Setup.dc.html` — VO-M · Microphone setup
- `boards/VO-M-Denied.dc.html` — VO-M · Microphone denied
- `boards/VO-M-Fallback.dc.html` — VO-M · Device dropped → text fallback

### 05 · Result reveal

- `boards/RS-M-1-Deal.dc.html` — Beat 1 · DEAL 74 (1.2 s)
- `boards/RS-M-2-Captured.dc.html` — Beat 2 · YOU CAPTURED 63% (the central result)
- `boards/RS-M-3-Next.dc.html` — Beat 3 · +18 · one insight · REMATCH
- `boards/RS-D-Final.dc.html` — RS-D · Result (resting beat 3)
- `boards/RS-M-Details.dc.html` — RS-M · Details (one level deeper)
- `boards/RS-D-Details.dc.html` — RS-D · Full breakdown (one level deeper: ZOPA, chips, multiplier)
- `boards/RS-D-NoDeal.dc.html` — RS-D · NO DEAL — a deal was possible
- `boards/RS-M-NoDeal.dc.html` — RS-M · NO DEAL — none was possible
- `boards/RS-D-Rematch.dc.html` — RS-D · Rematch requested — waiting
- `boards/RS-D-RematchGo.dc.html` — RS-D · Rematch accepted → new deal (1.2 s)
- `boards/RS-M-Rematch.dc.html` — RS-M · Rematch declined → NEW OPPONENT

### 06 · Onboarding & tutorial

- `boards/OB-D-Landing.dc.html` — OB-D · Landing (desktop)
- `boards/OB-M-Landing.dc.html` — OB-M · Landing (mobile, scrolls)
- `boards/OB-M-SignIn.dc.html` — OB-M · Create account / sign in
- `boards/OB-M-Handle.dc.html` — OB-M · Handle + avatar (one screen)
- `boards/OB-M-Returning.dc.html` — OB-M · Returning player (graceful re-entry)
- `boards/OB-M-T1-Limit.dc.html` — T1 · Secret limit
- `boards/OB-M-T2-Counter.dc.html` — T2 · They ask 90 → your opening offer
- `boards/OB-M-T3-NoTakeBacks.dc.html` — T3 · Irreversible concession (explained after acting)
- `boards/OB-M-T4-Chips.dc.html` — T4 · Chips + cost preview (only while composing)
- `boards/OB-M-T5-Clock.dc.html` — T5 · Clock + bounty token
- `boards/OB-M-T6-Deal.dc.html` — T6 · Accept
- `boards/OB-M-T7-Reveal.dc.html` — T7 · Reveal: YOU CAPTURED 55%
- `boards/OB-M-ReadyReal.dc.html` — OB-M · READY FOR A REAL OPPONENT?
- `boards/OB-M-FirstHuman.dc.html` — OB-M · First human match (placement 1/5)
- `boards/OB-D-Tutorial.dc.html` — OB-D · Tutorial on desktop (lesson 4 keyframe)

### 07 · The Bay & play entry

- `boards/HM-D-Bay.dc.html` — HM-D · The Bay (returning player)
- `boards/HM-M-Bay.dc.html` — HM-M · The Bay (mobile)
- `boards/HM-M-BayNew.dc.html` — HM-M · New player: placement is the one objective
- `boards/PL-M-PlayMenu.dc.html` — PL-M · Play for a NEW player: 3 choices
- `boards/PL-M-PlayVeteran.dc.html` — PL-M · Play for a veteran: context unlocks only
- `boards/PL-D-PlayMenu.dc.html` — PL-D · Play (desktop): same 3 + “right now”
- `boards/MO-D-Rotating.dc.html` — MO-D · Rotating mode: rules before entry

### 08 · Matchmaking & deal reveal

- `boards/MM-D-Searching.dc.html` — MM-D · Searching
- `boards/MM-D-LongWait.dc.html` — MM-D · Longer than expected → alternatives
- `boards/MM-D-Found.dc.html` — MM-D · Match found (opponent reveal)
- `boards/MM-D-FailedConfirm.dc.html` — MM-D · Opponent failed to confirm
- `boards/MM-M-Searching.dc.html` — MM-M · Searching
- `boards/MM-M-Found.dc.html` — MM-M · Match found
- `boards/MM-States.dc.html` — MM · All matchmaking states
- `boards/SC-D-Reveal.dc.html` — SC-D · Deal reveal
- `boards/SC-M-Reveal.dc.html` — SC-M · Deal reveal
- `boards/SC-M-RevealSeller.dc.html` — SC-M · Deal reveal as SELLER (minimum)

### 09 · Analysis, replay, highlights

- `boards/AN-D-Analysis.dc.html` — AN-D · Deal analysis
- `boards/AN-M-Analysis.dc.html` — AN-M · Deal analysis (mobile)
- `boards/RP-D-Replay.dc.html` — RP-D · Replay (step through offers, chat, clock, chips)
- `boards/HL-Highlights.dc.html` — HL · Highlight system

### 10 · Profile, rating, rivalry

- `boards/PF-D-Profile.dc.html` — PF-D · Profile
- `boards/PF-M-Profile.dc.html` — PF-M · Profile (mobile)
- `boards/PF-M-Empty.dc.html` — PF-M · Profile with no history (empty state)
- `boards/RT-Rating.dc.html` — RT · Rating, placement, promotion, demotion
- `boards/RV-M-Rivalry.dc.html` — RV-M · Rivalry (emerges after 3+ deals)
- `boards/PF-D-History.dc.html` — PF-D · Match history → result / replay

### 11 · Daily Deal & leaderboards

- `boards/DD-D-Daily.dc.html` — DD-D · Daily Deal pre-play
- `boards/DD-D-Played.dc.html` — DD-D · Daily Deal played: benchmark + board
- `boards/DD-M-Daily.dc.html` — DD-M · Daily Deal pre-play
- `boards/DD-M-Played.dc.html` — DD-M · Played: YOU CAPTURED 67% · TOP 14%
- `boards/DD-M-EarlyCohort.dc.html` — DD-M · Insufficient cohort (no false precision)
- `boards/LB-D-Leaderboard.dc.html` — LB-D · Global leaderboard + your neighbourhood
- `boards/LB-M-Leaderboard.dc.html` — LB-M · Leaderboard (mobile)
- `boards/LB-M-NotRanked.dc.html` — LB-M · Not ranked yet

### 12 · Friends, sharing, Deal Night

- `boards/FR-D-Create.dc.html` — FR-D · Create challenge
- `boards/FR-D-Share.dc.html` — FR-D · Share link / code, waiting room
- `boards/FR-M-Recipient.dc.html` — FR-M · Recipient landing
- `boards/SH-D-Card.dc.html` — SH · Share card (1200×630, link preview)
- `boards/SH-M-Share.dc.html` — SH-M · Share preview + privacy controls
- `boards/RM-D-Room.dc.html` — RM-D · Deal Night room
- `boards/RM-M-Room.dc.html` — RM-M · Deal Night (mobile)

### 13 · AI practice

- `boards/PA-D-Practice.dc.html` — PA-D · Practice mode selection
- `boards/PA-M-Practice.dc.html` — PA-M · Practice (mobile)
- `boards/PA-M-InMatch.dc.html` — PA-M · AI opponent in match (named + AI label on every frame)

### 14 · Spectate & tournaments

- `boards/SP-D-Public.dc.html` — SP-D · Public spectator (no hidden info)
- `boards/SP-D-Caster.dc.html` — SP-D · Caster / observer view (hidden info + delay)
- `boards/SP-M-Public.dc.html` — SP-M · Spectator (mobile)
- `boards/TN-D-Discover.dc.html` — TN-D · Discover / register
- `boards/TN-D-Bracket.dc.html` — TN-D · Bracket + next opponent
- `boards/TN-M-Round.dc.html` — TN-M · Round result: advance / eliminated
- `boards/TN-M-Champion.dc.html` — TN-M · Final result

### 15 · Settings & safety

- `boards/ST-D-Settings.dc.html` — ST-D · Settings
- `boards/ST-M-Settings.dc.html` — ST-M · Settings (mobile)
- `boards/RB-M-Report.dc.html` — RB-M · Report (from match menu or chat flag)
- `boards/RB-M-Blocked.dc.html` — RB-M · Block confirmation + list
- `boards/RB-M-RateLimit.dc.html` — Chat rate-limit feedback

### 16 · Edge, error, empty, loading

- `boards/ED-Errors.dc.html` — ED · Error / edge / empty states (18)
- `boards/ED-Loading.dc.html` — ED · Loading & waiting states (contextual)

### 17 · Components & v1.1 amendment

- `boards/CP-Amendment.dc.html` — CP · DS v1.1 amendment (palette + rules)
- `boards/CP-Silhouettes.dc.html` — CP · Game-object silhouettes (v1.1)
- `boards/CP-States.dc.html` — CP · Component states (brief §58)

### 18 · Motion & playable prototype

- `boards/PR-CoreLoop.dc.html` — PROTOTYPE · Core loop — rival found → deal → negotiate → DEAL! → 3-beat result → rematch
- `boards/MO-Storyboard.dc.html` — MO · 13 transitions: numbers as physical events

### 19 · Copy & implementation handoff

- `boards/HO-Copy.dc.html` — H · Copy system
- `boards/HO-Responsive.dc.html` — I · Responsive notes
- `boards/HO-Contracts.dc.html` — J · Data, visibility, server vs visual
- `boards/HO-A11y-Decisions.dc.html` — J · Accessibility + PRODUCT DECISIONS REQUIRED

