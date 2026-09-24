# SCREEN-STATE REGISTRY (working file — BB-263)

Swept from the actual repository (apps/web) on 2026-09-24, branch
`w2-pv-livematch` @ c78e0d2. Every consumer state, field-complete per
the founder's directive. QA status left blank for QA. The manager
assembles `docs/SCREEN_STATE_REGISTRY.md` from this file.

Legend — implementation status: LIVE (renders today) · DEAD-PATH (code
exists, unreachable in the current flow) · ORPHAN (no importers) ·
WIP-PAUSED (BB-256 golden, D-79). Visual status lives in
`visual-consistency-map.md`; CTAs in `cta-contracts.md`.

---

## JOURNEY A — HUMAN PVP

### SS-01 · Title / opening
- **ID:** SS-01 · **Area:** SHELL · **Route:** `/`
- **Entry:** any unauthenticated visit (dev auth self-heals)
- **Authoritative data:** none (static); dev identity minted on demand
  (`POST /v1/auth/dev/signin`)
- **Background/environment:** night-scene boards (OS-*), otter at the
  table; own warm palette (`opening.css` — distinct from the game world)
- **Character:** GoldenOtter idle
- **Attention target:** the PLAY NOW pill
- **Always:** game name, one-line promise, PLAY NOW
- **Contextual:** dev-auth error line (`.os-dev__error`)
- **Collapsed:** none
- **Primary CTA:** PLAY NOW → `/bay`
- **Secondary:** none (sign-in is dev-invisible)
- **Exit states:** → `/bay`; error stays on-screen
- **Loading/error/disconnect:** error → `.os-dev__error` role=alert
- **Design refs:** OS-* boards; `design-sandbox/screenshots/current/`
- **Implementation:** `components/opening/opening-screen.tsx` +
  `opening.css`; `app/page.tsx`; `lib/title-routing.ts`
  (`SHOW_TITLE_ON_RETURN = true`, PDR-4)
- **Status:** LIVE · **QA:** · **Defects:** none known

### SS-02 · The Bay (hub)
- **ID:** SS-02 · **Area:** HUB · **Route:** `/bay`
- **Entry:** title PLAY NOW; hub THE BAY tab; result BACK TO THE BAY
- **Authoritative data:** `GET /v1/me` (handle, ratedGames) +
  `GET /v1/me/rematch-letters`; emits `bay_viewed`
- **Background/environment:** the hub — one gold table, then who waits
  on me (SH3)
- **Character:** none (the table is the object)
- **Attention target:** the gold table (the ONLY gold object)
- **Always:** table (PLAY · RANKED · A REAL PERSON, honest copy),
  letters slot, hub bar (THE BAY · PLAY · ME), ME card
- **Contextual:** sealed letter cards (`.bay-letter`, ANSWER) when a
  rematch proposal is open
- **Collapsed:** Today's Deal / Monthly Bounty / Live Tables as
  VISIBLE LABELED PLACEHOLDERS (SOON, zero controls)
- **Primary CTA:** PLAY RANKED → `/play`
- **Secondary:** WARM UP → `/play?practice=1`; LEDGER → `/profile`;
  hub tabs; ANSWER → `/play?resume=<sourceMatchId>`
- **Exit states:** `/play`, `/play?practice=1`, `/profile`
- **Loading/error/disconnect:** letters + ME fail silently
  (best-effort garnish); no error surface
- **Design refs:** SH3 boards; bay-{desktop,mobile}.png
- **Implementation:** `app/bay/page.tsx`; `components/hub/hub-bar.tsx`
  + `hub.css`; `apps/api/src/rematch-routes.ts` (letters endpoint)
- **Status:** LIVE · **QA:** · **Defects:** none known (BB-244 cold
  render fixed; bay.spec guards it)

### SS-03 · Play hub / battle selection
- **ID:** SS-03 · **Area:** HUB · **Route:** `/play`
- **Entry:** Bay PLAY RANKED; hub PLAY tab; replay BACK TO PLAY
- **Authoritative data:** `GET /v1/me/active-match` (continue-game);
  dev auth self-heal on 401/403 from `/v1/me`
- **Background/environment:** battle-selection hierarchy (SH2):
  PLAY A PERSON · CHALLENGE SOMEONE · PRACTICE — NOT A PERSON
- **Character:** none
- **Attention target:** CHALLENGE SOMEONE (primary), PRACTICE
  (secondary, AI-labeled)
- **Always:** hub bar, challenge card, practice panel, persona cards
- **Contextual:** continue-game link when an active match exists;
  auth-missing panel with RETRY (`auth-retry`)
- **Collapsed:** practice personas behind the PRACTICE panel
- **Primary CTA:** CREATE CHALLENGE → POST `/v1/matches` → share
  input (SS-04)
- **Secondary:** persona-* → `/play?practice=1&persona=…`;
  continue-game → `/play?resume=`
- **Exit states:** SS-04; practice tunnel (SS-16/17); resume tunnel
- **Loading/error/disconnect:** loading state (`Loading…`);
  auth-missing state (RETRY → dev sign-in); resume one-retry then hub
- **Design refs:** SH2 boards
- **Implementation:** `app/play/page.tsx` (hub half); hub.css +
  LEGACY globals `.home/.panel/.play-button`
- **Status:** LIVE · **QA:** · **Defects:** MIXED styling family
  (hub bar illustrated + legacy dark-SaaS panels) — see visual map

### SS-04 · Challenge created
- **ID:** SS-04 · **Area:** HUB (match tunnel entry) · **Route:**
  `/play` with share input visible
- **Entry:** CREATE CHALLENGE accepted (POST `/v1/matches` →
  `{matchId, inviteToken}`)
- **Authoritative data:** `inviteToken` → `shareUrl`
  `/play?challenge=<inviteToken>` (server-authored)
- **Background/environment:** the hub, challenge form replaced by the
  share input
- **Character:** none
- **Attention target:** the share input (`.share-input`, select-on-focus)
- **Always:** share input + "send the link" copy; the joiner slot is
  empty (no fabricated state)
- **Primary CTA:** copy the link (input is the whole invitation)
- **Secondary:** hub tabs (navigating away does not cancel the
  challenge — the active-match link carries it)
- **Exit states:** opponent joins (SS-05 via the joiner's link);
  resume via continue-game
- **Loading/error/disconnect:** create failure → error line, hub stays
- **Design refs:** SH2 (challenge is the hub sheet state — no separate
  board)
- **Implementation:** `app/play/page.tsx`
- **Status:** LIVE · **QA:** · **Defects:** legacy share-input
  styling within the legacy panel (family mixture)

### SS-05 · Opponent joins (friend)
- **ID:** SS-05 · **Area:** MATCH · **Route:** `/play?challenge=<token>`
- **Entry:** the joiner opens the challenge link
- **Authoritative data:** `GET /v1/matches/:id` snapshot; Socket.IO
  `user:registered`/`match:join`/`match:state`/`match:event`/
  `match:clock-sync`
- **Background/environment:** staging — the door, the found opponent
  (PV: one hero per state)
- **Character:** opponent character card (`pv-found` staging card) —
  GoldenOtter for humans
- **Attention target:** the READY counter button
- **Always:** opponent found card, READY, match tunnel (no hub nav)
- **Contextual:** "waiting for opponent to ready" line before both
  ready
- **Primary CTA:** READY (counter button) → role/dossier (SS-06)
- **Secondary:** none (tunnel)
- **Exit states:** SS-06; resume-replace recovery on join failure
  (QA-001)
- **Loading/error/disconnect:** join failure → QA-001 recovery
  (`recoverJoinFailure` → `/play?resume=`); `.world-error` role=alert
- **Design refs:** SH2 staging frames; PV staging
- **Implementation:** `app/play/match-screen.tsx` (staging branch)
- **Status:** LIVE · **QA:** · **Defects:** RESP cell N in the health matrix

### SS-06 · Role/Dossier reveal
- **ID:** SS-06 · **Area:** MATCH · **Route:** `/play` ACTIVE, before
  the first move
- **Entry:** both players READY → ACTIVE (creator sees the board;
  first mover sees role + RV)
- **Authoritative data:** snapshot `view` (role, `myReservationValueTenths`)
- **Background/environment:** the market world (illustrated family)
- **Character:** opponent in frame (pose: thinking)
- **Attention target:** YOUR RESERVATION VALUE (the private reveal)
- **Always:** role card (YOU ARE THE BUYER/SELLER), RV, dossier
  `<details class="lm-dossier">`, opponent card
- **Primary CTA:** first offer (the composer is the reveal's exit)
- **Secondary:** open the dossier
- **Exit states:** SS-07 (first move made)
- **Loading/error/disconnect:** snapshot failures → reconnecting
  state; error → `.world-error`
- **Design refs:** SH2 role/dossier frames
- **Implementation:** `app/play/match-screen.tsx` (ACTIVE) +
  `negotiation-board.tsx` + `dossier.tsx`/`dossier.module.css`
- **Status:** LIVE · **QA:** · **Defects:** none known

### SS-07 · Live Match
- **ID:** SS-07 · **Area:** MATCH · **Route:** `/play` ACTIVE
- **Entry:** role/dossier; resume
- **Authoritative data:** Socket.IO snapshot + events +
  clock-sync (server-owned `packages/domain` legality)
- **Background/environment:** the market world — rail, offer plaques,
  crossed-offers ribbon, warm-close (PV composition)
- **Character:** opponent dominates and reacts (pose per state +
  12 fps WebP clips via `sprite-player`)
- **Attention target:** the opponent (PV-Attention); the rail on
  offers
- **Always:** rail, opponent, composer (offer input, make-offer,
  hold-to-accept), turn banner, chess clock, chip meter
- **Contextual:** crossed ribbon (A DEAL IS POSSIBLE), offer trails
  on the rail, quick-line chat poses, concession one-shot,
  time-warning tiers, dossier in the action zone
- **Collapsed:** chat panel (quiet row) — mobile PV sheet packs
  myband+action+quiet as one panel
- **Primary CTA:** OFFER (make-offer) when my turn
- **Secondary:** hold ACCEPT, walk away (confirm sheet), chat line
- **Exit states:** SS-08 (terminal); walk → result
- **Loading/error/disconnect:** reconnecting state (banner + frozen
  clock); disconnect/reconnect timeline events; `.world-error`;
  paused state on opponent disconnect
- **Design refs:** PV boards (founder-approved); motion-spec
  sequences A–H (BB-239)
- **Implementation:** `app/play/match-screen.tsx` + `negotiation-
  board.tsx` + game/* components + `live-match.css`; worker-1 owns
  `use-hold/match-actions/time-warning`
- **Status:** LIVE · **QA:** · **Defects:** none known (BB-232
  overflow fixed; BB-230 telemetry in)

### SS-08 · Result / SH4 reveal
- **ID:** SS-08 · **Area:** RESULT · **Route:** `/play` result overlay
- **Entry:** terminal state (deal/walk); resume of a finished match
- **Authoritative data:** snapshot `view` (limits, split, ledger,
  outcome) + rematch proposal state
- **Background/environment:** the stage — opponent STAYS IN FRAME
  (SH4), outcome clip + authored line
- **Character:** opponent (accept/nodeal/rematch clips)
- **Attention target:** the settlement (limits flip → split → ledger)
- **Always:** limits flip, split, ledger, review/replay/back actions,
  rematch prompt (12 s ring)
- **Contextual:** "practice · unrated" tag (AI); NOT NOW dismisses
  without deleting (proposal → Bay letter)
- **Primary CTA:** REVIEW THE DEAL → `/review/:id`
- **Secondary:** FULL REPLAY → `/replay/:id`; BACK TO THE BAY → `/bay`;
  rematch ACCEPT / NOT NOW
- **Exit states:** SS-09, SS-10, SS-12, SS-11 (rematch)
- **Loading/error/disconnect:** none (snapshot is already local)
- **Design refs:** SH4 frames 1–16; sh4-*.png captures
- **Implementation:** `result-reveal.tsx` + `reveal.css`
- **Status:** LIVE · **QA:** · **Defects:** BB-239 founder review
  still open (choreography scope)

### SS-09 · Game Review
- **ID:** SS-09 · **Area:** REVIEW · **Route:** `/review/[matchId]`
- **Entry:** result REVIEW THE DEAL
- **Authoritative data:** `GET /v1/matches/:id/review` (deterministic
  analysis) + `GET /v1/matches/:id` + `GET /v1/matches/:id/events`
- **Background/environment:** the M5 review board — **LEGACY dark-SaaS
  family, never redesigned** (no board exists for it in the current
  illustrated system)
- **Character:** none
- **Attention target:** the result moment
- **Always:** GAME REVIEW header, scenario title, moments region,
  match timeline, Full replay link
- **Contextual:** moment-by-moment "See in timeline" buttons
- **Primary CTA:** FULL REPLAY → `/replay/:id`
- **Secondary:** See in timeline (scrolls the timeline)
- **Exit states:** SS-10
- **Loading/error/disconnect:** fetch failure → legacy error line
- **Design refs:** M5 boards only (LEGACY); **MISSING DESIGN** in the
  illustrated family
- **Implementation:** `app/review/[matchId]/page.tsx` (globals.css
  legacy classes; **no CSS module import** — BB-244-rule violation)
- **Status:** LIVE · **QA:** · **Defects:** legacy family; no module;
  RESP cell N

### SS-10 · Replay
- **ID:** SS-10 · **Area:** REVIEW · **Route:** `/replay/[matchId]`
- **Entry:** review FULL REPLAY; result FULL REPLAY
- **Authoritative data:** `GET /v1/matches/:id/result` +
  `GET /v1/matches/:id/events`
- **Background/environment:** the M5 replay board — **LEGACY family**
  (`.match-screen`, ZOPA bar)
- **Character:** none
- **Attention target:** the ZOPA visualization (text labels carry
  shares — color is secondary)
- **Always:** replay sequence, ZOPA bar, BACK TO PLAY
- **Primary CTA:** BACK TO PLAY → `/play`
- **Exit states:** SS-03
- **Loading/error/disconnect:** fetch failure → legacy error line
- **Design refs:** M5 boards only (LEGACY); **MISSING DESIGN**
- **Implementation:** `app/replay/[matchId]/page.tsx` +
  `components/zopa-bar.tsx` (legacy classes; **no CSS module**)
- **Status:** LIVE · **QA:** · **Defects:** legacy family; no module

### SS-11 · Rematch (letter → accept)
- **ID:** SS-11 · **Area:** SOCIAL/RESULT · **Route:** `/bay` letters
  slot → `/play?resume=<sourceMatchId>` → in-session prompt
- **Entry:** a rematch proposal was set aside (NOT NOW) or answered
  from the Bay letter
- **Authoritative data:** `GET /v1/me/rematch-letters` (proposal +
  handle + scenario title); resume snapshot
- **Background/environment:** Bay letter card → the result stage with
  the offer ring
- **Character:** opponent (rematch clip)
- **Attention target:** the offer ring (0:12 decorative — proposals
  persist until answered)
- **Always:** letter card (ANSWER), ring, ACCEPT / NOT NOW
- **Primary CTA:** ACCEPT REMATCH (proposal accept → same-roles
  rematch, PDR-3)
- **Secondary:** NOT NOW (letter persists)
- **Exit states:** new live match; SS-02
- **Design refs:** SH4 frames (letter, ring)
- **Implementation:** bay letters slot (SS-02) + `result-reveal.tsx`
  prompt; SH4-loop E2E covers it
- **Status:** LIVE · **QA:** · **Defects:** SWAP SIDES = PDR-14 open
  (roles stay — domain same-roles rematch); offer-window PDR open

### SS-12 · Back to Bay
- **ID:** SS-12 · **Area:** SHELL · **Route:** `/bay`
- **Entry:** result BACK TO THE BAY
- **Authoritative data:** SS-02's (the settled hub + any new letters)
- **Implementation:** SS-02's surface — the return lands on the hub,
  never a dead end
- **Status:** LIVE · **QA:** · **Defects:** none known

### SS-13 · Profile / ME
- **ID:** SS-13 · **Area:** PROFILE · **Route:** `/profile`
- **Entry:** hub ME tab; Bay LEDGER
- **Authoritative data:** `GET /v1/me` (handle, ratedGames)
- **Background/environment:** dev builds render the ME hub —
  HubBar + `.bay-me` standing card (CTA_ROUTE_CONTRACT repair)
- **Character:** none
- **Attention target:** the standing card
- **Always:** hub bar (ME active), standing card (handle, games,
  DIVISION · SOON)
- **Primary CTA:** hub tabs
- **Design refs:** none — stopgap; the designed profile is P1-M2
  (MISSING DESIGN, milestone-gated)
- **Implementation:** `app/profile/page.tsx` (dev branch →
  `dev-profile.tsx` + hub.css); `profile-client.tsx` = Clerk-era
  LEGACY path (DEAD-PATH in dev)
- **Status:** LIVE (dev) · **QA:** · **Defects:** duplicate profile
  implementations; no designed profile surface

### SS-14 / SS-15 · Sign-in / Sign-up
- **ID:** SS-14/15 · **Area:** AUTH · **Routes:** `/sign-in`,
  `/sign-up` (catch-all)
- **Entry:** Clerk middleware when Clerk is configured — **never in
  dev** (dev auth self-heals instead)
- **Authoritative data:** Clerk (configured only) or nothing
- **Rendering:** configured → Clerk `<SignIn/>`; unconfigured → raw
  `<main class="home"><p>Authentication is not configured…</p></main>`
  — **UNSTYLED in dev, MISSING DESIGN** (no designed auth surface)
- **Implementation:** `app/sign-in/[[...sign-in]]/page.tsx`,
  `app/sign-up/[[...sign-up]]/page.tsx` (Clerk-era)
- **Status:** DEAD-PATH (dev) · **QA:** · **Defects:** raw text
  render; the BB-244 class of unstyled surface

---

## JOURNEY B — AI PRACTICE

### SS-16 · Practice entry
- **ID:** SS-16 · **Area:** HUB · **Route:** `/bay` practice slot →
  `/play?practice=1`
- **Entry:** Bay WARM UP
- **Authoritative data:** none (entry)
- **Rendering:** the Bay practice room card (AI-labeled)
- **Status:** LIVE · **QA:** · **Defects:** none known

### SS-17 · Select AI persona
- **ID:** SS-17 · **Area:** HUB · **Route:** `/play?practice=1`
- **Entry:** SS-16
- **Authoritative data:** persona registry (config, versioned —
  `packages/ai`)
- **Rendering:** persona cards (`persona-<key>`) — character-first
  (BB-225), AI-labeled, unrated
- **Primary CTA:** persona card → AI match create → staging (SS-18)
- **Implementation:** `app/play/page.tsx` practice panel
- **Status:** LIVE · **QA:** · **Defects:** none known

### SS-18 · AI match start
- **ID:** SS-18 · **Area:** MATCH · **Route:** `/play?practice=1`
  staging
- **Entry:** persona selected (AI READY committed immediately; AI may
  be first mover)
- **Rendering:** staging card with the persona character + READY
- **Status:** LIVE · **QA:** · **Defects:** none known (PV staging)

### SS-19 · AI table talk
- **ID:** SS-19 · **Area:** MATCH · **Route:** `/play` ACTIVE vs AI
- **Entry:** AI's turn
- **Authoritative data:** AI flavor lines via chat panel (deterministic
  personas) — **current = static flavor lines**
- **Rendering:** chat panel lines in the live match
- **Status:** LIVE but **RED against AI_BEHAVIOR_CONTRACT** (founder's
  standard: OBSERVE→BELIEFS→ACTION→INTENT→TALK→RETURN with a
  deterministic fixture set) → BB-254 (W3)
- **Defects:** behavior gap (W3's lane); visual family of the chat
  panel is legacy

### SS-20 · AI result
- **ID:** SS-20 · **Area:** RESULT · **Route:** `/play` result overlay
  (practice)
- **Entry:** terminal vs AI
- **Rendering:** SS-08's stage + "practice · unrated" tag; stats skip
  (AI never touches standing)
- **Status:** LIVE · **QA:** · **Defects:** none known

### SS-21 · Profile/training update
- **ID:** SS-21 · **Area:** PROFILE · **Route:** `/profile` (expected
  post-AI surface)
- **Entry:** after an AI match
- **Rendering:** **NOTHING surfaces the IN-3/IN-6 training progress
  post-match** — RED; repair after BB-254 (W3)
- **Status:** MISSING (RED) · **QA:** · **Defects:** no implementation

### SS-22 · Play again / back to Bay
- **ID:** SS-22 · **Area:** RESULT · **Route:** `/play` result overlay
  (practice)
- **Entry:** AI result
- **Rendering:** result CTAs (back to Bay; play-again via rematch
  prompt on AI)
- **Status:** LIVE · **QA:** · **Defects:** none known

---

## SHARED TUNNEL SUB-STATES (any MATCH state)

| Sub-state | Trigger | Rendering | Family |
|---|---|---|---|
| loading | no snapshot yet | `Loading…` text | legacy `.home` |
| auth-missing | 401/403 from `/v1/me` | panel + RETRY (`auth-retry` → dev sign-in) | legacy `.home` |
| reconnecting | socket down | banner + frozen clock; timeline events | live-match |
| paused | opponent disconnect | paused status | live-match |
| error | join/create failure | `.world-error` role=alert | live-match |

---

## DEV / REFERENCE STATES

### SS-23 · Golden gallery + state pages
- **ID:** SS-23 · **Area:** DEV · **Routes:** `/golden`,
  `/golden/[state]` (17 states)
- **Entry:** dev only (404 in production builds)
- **Rendering:** golden reference pages — journey data + timelines,
  contract DATA, real art; the GATE re-enters post-audit
- **Status:** WIP-PAUSED (BB-256, D-79) · **Defects:** none (gate not
  yet built)

---

## ORPHAN / DEAD-PATH INVENTORY (named for the audit)

| File | State |
|---|---|
| `app/dev-landing.tsx` | ORPHAN — superseded by `opening-screen.tsx` (zero importers) |
| `app/auth-status.tsx` | ORPHAN — Clerk-era (zero importers; renders nothing in dev) |
| `app/profile/profile-client.tsx` | DEAD-PATH in dev (Clerk env only); duplicate of dev-profile |
| `components/game/resource-hud.tsx` | ORPHAN — canvas-v1 opponent gear (zero importers) |
| `app/sign-in`, `app/sign-up` (catch-alls) | DEAD-PATH in dev; raw text render |
| `globals.css` lines 1–392 (M4/M5 legacy family) | ACTIVE for play hub + review + replay (see visual map) |
