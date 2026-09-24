# VISUAL CONSISTENCY MAP (working file — BB-263)

Per-state visual status + styling-family classification, swept from
the repository 2026-09-24. Manager assembles
`docs/VISUAL_CONSISTENCY_MAP.md` (or merges into the registry).

Status legend: APPROVED (renders the approved board design) ·
PARTIAL (approved design with gaps/stopgaps) · LEGACY (pre-illustrated
implementation, no current board) · DEBUG (dev tooling) ·
BROKEN (renders wrong) · UNSTYLED (raw HTML) · MISSING DESIGN (no
designed screen exists for a consumer state).

## Styling families in the repository

| Family | Where | State |
|---|---|---|
| **opening screen** (OS-*) | `opening.css` — warm cream/gold night scene, own palette | APPROVED, live (title) |
| **illustrated Bay** (SH3) | `hub.css` + globals 393+ tokens | APPROVED, live (Bay, hub bar, letters, ME card) |
| **illustrated game world** (PV/SH4) | `live-match.css`, `reveal.css`, `dossier.module.css`, globals 731–1152 (world signage, rails, plaques, staging overlays, mobile) | APPROVED, live (match, result) |
| **golden reference** (BB-256) | `golden.css` | DEBUG/dev-only, WIP-paused |
| **legacy dark SaaS** (M4/M5) | globals 1–392 (`.home/.panel/.play-button/.match-screen/.player-card/.zopa*/.replay-*/.share-input/.accept-button/…`) | ACTIVE for play hub, review, replay — the consistency gap |

## Per-state map

| State | Visual status | Family | Notes |
|---|---|---|---|
| SS-01 Title | APPROVED | opening | founder OS boards; PDR-4 SHOW on return |
| SS-02 Bay | APPROVED | illustrated Bay | SH3; bay.spec cold-visit guard green |
| SS-03 Play hub | **PARTIAL** | **MIXED** — hub bar illustrated + panels legacy dark-SaaS | the battle hierarchy header is SH2; the card/panel chrome is M4 |
| SS-04 Challenge created | **PARTIAL** | legacy (`.share-input` in legacy panel) | no designed sheet; the share input is the surface |
| SS-05 Opponent joins | APPROVED | illustrated (PV `pv-found` staging, globals 1073+) | RESP cell N in the health matrix |
| SS-06 Role/Dossier | APPROVED | illustrated (dossier.module.css) | |
| SS-07 Live Match | APPROVED | illustrated (live-match.css) | PV boards; BB-232 fit fixed |
| SS-08 Result | APPROVED | illustrated (reveal.css) | SH4; BB-239 founder review open |
| SS-09 Review | **LEGACY** | legacy dark-SaaS (M5) — **MISSING DESIGN** in the illustrated family; no CSS module | the biggest Journey A gap |
| SS-10 Replay | **LEGACY** | legacy dark-SaaS (M5 + `.zopa*`) — **MISSING DESIGN**; no CSS module | |
| SS-11 Rematch | APPROVED | illustrated Bay + reveal | SH4 letter/ring |
| SS-12 Back to Bay | APPROVED | illustrated Bay | |
| SS-13 Profile | **PARTIAL** | illustrated Bay stopgap (`dev-profile`) | designed profile = P1-M2, **MISSING DESIGN** (milestone-gated); legacy Clerk profile dead-path |
| SS-14/15 Sign-in/up | **UNSTYLED** (dev) | legacy (raw `home` text) / Clerk when configured — **MISSING DESIGN** | the BB-244 class of surface |
| SS-16 Practice entry | APPROVED | illustrated Bay | |
| SS-17 Persona select | APPROVED | illustrated (character-first cards, BB-225) | |
| SS-18 AI start | APPROVED | illustrated (PV staging card, same as SS-05) | |
| SS-19 AI table talk | **PARTIAL** | legacy chat panel inside illustrated world — behavior RED (W3) | |
| SS-20 AI result | APPROVED | illustrated + practice tag | |
| SS-21 Profile/training | **MISSING** | — | nothing surfaces post-AI progress (RED, W3) |
| SS-22 Play again | APPROVED | illustrated | |
| SS-23 Golden | DEBUG (dev-only) | golden | BB-256 WIP-paused |
| tunnel: loading | **LEGACY** | legacy `Loading…` in `.home` | |
| tunnel: auth-missing | **LEGACY** | legacy panel + RETRY | |
| tunnel: reconnecting/paused/error | APPROVED | illustrated (banner/`.world-error`) | |

## Duplicate / legacy implementations (named)

1. **Profile duplicates:** `profile-client.tsx` (Clerk-era) +
   `dev-profile.tsx` (dev) — same route, two implementations, env
   switch in `page.tsx`.
2. **Orphaned screens:** `dev-landing.tsx` (superseded by
   `opening-screen.tsx`), `auth-status.tsx` (Clerk-era) — zero
   importers, still shipping.
3. **Orphaned component:** `resource-hud.tsx` (canvas-v1 opponent
   gear) — zero importers.
4. **Dead auth routes:** `/sign-in`, `/sign-up` catch-alls render raw
   text in dev.
5. **Legacy CSS family is ACTIVE** for three surfaces only. Exact
   class-token sweep (every `className` in `src`, exact match):
   play hub (`home`, `panel`, `home-kicker`, `home-sub`, `play-button`,
   `share-input`), review (`panel`, `home-kicker`, `home-sub`,
   `replay-button`, `replay-timeline`, `match-header`, `result`,
   `timeline`), replay (`match-screen`, `panel`, `home-sub`) — all
   from globals 1–392.
6. **Orphaned legacy CSS** (M4 selectors with no live consumers):
   `accept-button`, `walk-button`, `amount-row`, `button-row`,
   `preview`, `lower-panel`, `player-card`, `board`, `offer-line`,
   `chat-row`, `home-header`, `chat` — dead weight in globals 1–392.
7. **BB-244-rule violations:** review + replay routes import no CSS
   module (they ride the root layout's globals import) — the rule
   says every `app/` route must import its own module. They render
   fine today only because globals is always bundled.
8. **Family fragmentation:** the illustrated family spans globals
   (393–1435, incl. staging/result overlay sections), `live-match.css`,
   `reveal.css`, `dossier.module.css`, `hub.css` — selector-level
   worker-1/worker-2 ownership split is documented and temporary; the
   map records the fragmentation itself as a finding.

## MISSING DESIGN states (named)

| State | Why |
|---|---|
| SS-09 Game Review | renders M5 legacy; no illustrated board implemented |
| SS-10 Replay | renders M5 legacy (+ ZOPA); no illustrated board |
| SS-14/15 Sign-in / Sign-up | no designed auth surface; raw text in dev |
| SS-13 Profile | stopgap dev-profile; designed profile is P1-M2 |
| SS-21 Profile/training update | nothing exists (RED, W3's lane) |
| SS-04 challenge-created sheet | legacy hub chrome + share input; no illustrated sheet treatment |

## Honest overall judgment

The illustrated game family (PV world, SH4 result, SH3 Bay, OS title)
is coherent and approved; the **play hub, review and replay surfaces
are the legacy islands** — the review/replay pair being the only
Journey A states with no current-board design at all. The repair
sequence after founder review should prioritize: (1) review/replay
redesign to the illustrated family, (2) play-hub chrome de-mixing
(+ challenge sheet), (3) auth-missing/loading tunnel treatments,
(4) sign-in/up auth surfaces — with BB-256's GATE as the regression
harness for each.
