# Bounty Bay design canvas — export

Exported from the claude.ai Design canvas "Bounty Bay — Product Design v1" (all 27 pages, 184 boards).

> **Status: design reference, NOT canonical.** `AGENTS.md` source-of-truth order still applies: `docs/` wins over anything here. Where this folder and `docs/` disagree, stop and report — do not infer intent. Visual/frontend guidance is governed by `docs/09_UI_DESIGN_SYSTEM.md`.

## What is here

| Path | What it is | Use it for |
|---|---|---|
| `motion-spec.md` | Juice pass as plain text: intensity classes, tokens, all 24 events × 10 dimensions, sequences A–H, full-path storyboard | **Start here** for any animation / feedback / reward work |
| `renders/*.jpg` | Screenshots of the art-direction (A1–A7) and juice (J1–J4) boards | Looking at the target visuals (read an image with `@`) |
| `styles/bb.css` | Tokens + component styles used by the boards, incl. `v1.3 JUICE PASS` keyframes | Porting colours, keyframes, easings |
| `boards/*.dc.html` | Source of every board (HTML + inline styles; `{{…}}`/`<sc-if>` are canvas template syntax) | Exact positions, sizes, copy |
| `assets/` | Character sprite sheets (`ch-*.svg`, 600×900 cells), scenes, hero assets, table foregrounds | Art used by the boards |
| `canvas.json` | Index: pages, boards, positions | Finding which board belongs to which page |

Boards are mockups, not production components. They need the canvas runtime (not included) to evaluate `{{…}}` / `<sc-if>`; opened directly in a browser they show raw template text. Interactive boards (e.g. `JX-Playable`, `PR-CoreLoop`) only play on the canvas itself.

Character sprite sheets: one SVG per character, poses side by side in 600×900 cells, in this order for Route A: idle, thinking, listening, speaking, offer, holding, surprised, pleased, smug, frustrated, accepted, nodeal, disconnected, rematch, seller.

## Known conflicts / checks against `docs/`

- `docs/09_UI_DESIGN_SYSTEM.md` explicitly rejects **"parrot mascots"**; the canvas cast includes **BLACK PARROT** (a street auctioneer). Needs a decision before implementation.
- Colour roles: the canvas uses **ember = me, violet = opponent, gold = value, green = deal possible**; `docs/09` names `--accent` turquoise as the primary accent and `--rival` purple. Confirm the mapping.
- Vocabulary: canvas says *limit* / *bounty multiplier*; binding repo terms are **Reservation value** / **Clock multiplier** / **Concession chips**.
- Fonts: boards load Google Fonts at runtime (mockup only); `docs/09` requires self-hosted fonts via `next/font`.
- All items listed under "Open decisions" in `motion-spec.md` are PRODUCT DECISIONS, not rules.

## Pages and boards

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

### A2 · Character routes (A / B / C)

- `boards/CR-RouteA.dc.html` — B · ROUTE A — Merchant Adventurers · render: `renders/CR-RouteA.jpg`
- `boards/CR-RouteB.dc.html` — B · ROUTE B — Creature Dealmakers · render: `renders/CR-RouteB.jpg`
- `boards/CR-RouteC.dc.html` — B · ROUTE C — Premium Traders · render: `renders/CR-RouteC.jpg`
- `boards/CR-Recommend.dc.html` — C · RECOMMENDATION — tests across A / B / C · render: `renders/CR-Recommend.jpg`

### A3 · Core cast (Route A)

- `boards/CC-Lineup.dc.html` — D · LINEUP + silhouettes — 8 core characters · render: `renders/CC-Lineup.jpg`
- `boards/CC-Bible.dc.html` — D · CAST BIBLE — attributes per character · render: `renders/CC-Bible.jpg`
- `boards/CC-Tests.dc.html` — D · TESTS — face, 64/96 px, differentiation · render: `renders/CC-Tests.jpg`
- `boards/CC-Derivation.dc.html` — D · DERIVATION — full → portrait → bust → avatar → icon · render: `renders/CC-Derivation.jpg`

### A4 · Pose & expression system

- `boards/PE-Matrix.dc.html` — E · MATRIX — 14 states × 8 characters · render: `renders/PE-Matrix.jpg`
- `boards/PE-Rules.dc.html` — E · RULES — triggers, allowed inputs, motion · render: `renders/PE-Rules.jpg`
- `boards/PE-FaceKit.dc.html` — E · FACE KIT — lids, brows, mouths · render: `renders/PE-FaceKit.jpg`

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

