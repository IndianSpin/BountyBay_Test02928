# Decision Log

Decisions are append-only. If reversed, create a new decision referencing the old one.

## DEC-001 — Initial user

**Decision:** V1 targets competitive individuals. Students/EdTech and B2B are later extensions.

**Reason:** Consumer game appeal must be tested before professional wrappers distort the product.

## DEC-002 — Initial negotiation construct

**Decision:** Start with 1v1 single-issue distributive bargaining.

**Reason:** Clear measurable surplus and bounded core loop. Multi-issue remains future expansion.

## DEC-003 — Human PvP is canonical

**Decision:** Synchronous human PvP is the canonical competitive mode.

**Reason:** Human interaction and opponent reading are central to the product thesis.

## DEC-004 — AI and async rating isolation

**Decision:** AI and async games do not affect canonical Bounty Rating.

**Reason:** Preserve meaning of human synchronous competitive rating.

## DEC-005 — Public identity

**Decision:** Anonymous handles by default. Public profiles show rating, games, agreement rate, average surplus captured.

## DEC-006 — Hard reservation boundary

**Decision:** Players cannot offer or accept beyond their own RV.

**Reason:** Preserves 100% bargaining-surplus allocation and prevents deals worse than BATNA inside the game.

## DEC-007 — Offer number domain

**Decision:** Positive only, zero forbidden, one decimal place, user-facing unrestricted feel with technical maximum.

## DEC-008 — Crossed offers

**Decision:** Crossed offers do not auto-settle. Explicit acceptance required.

## DEC-009 — No deal

**Decision:** No deal earns zero bounty for both players. Spent concession chips remain spent in match-economy accounting.

## DEC-010 — Concession direction

**Decision:** Concessions are irreversible and unidirectional: buyers only increase after opening; sellers only decrease.

## DEC-011 — Concession pricing principle

**Decision:** Larger concessions cost more total but less per unit; cost must be scale-independent.

## DEC-012 — Per-match chip budget

**Decision:** During initial product testing, each player receives a fresh concession-chip budget per match.

**Reason:** Test strategic movement costs without persistent or real-money economy complexity.

## DEC-013 — Personal chess clock

**Decision:** One player's decision clock runs at a time and switches after valid numerical offers. Opponent can see it.

## DEC-014 — Clock floor

**Decision:** Payout multiplier floor is 30%.

Exact decay shape and time to floor remain tunable.

## DEC-015 — Disconnect clock

**Decision:** Verified disconnect freezes active clock. Abuse mitigation remains a security experiment.

## DEC-016 — Chat

**Decision:** Free-text messages are allowed and do not switch the clock/turn.

## DEC-017 — No aspiration target

**Decision:** Fantasy V1 gives the player's RV and BATNA narrative but no software-provided aspiration/target number.

**Reason:** Player should form their own anchor/strategy.

## DEC-018 — Freemium direction

**Decision:** Core play should be free enough to build network liquidity. Monetization should sit around the network rather than buy competitive strength.

## DEC-019 — V1 no real money

**Decision:** Initial V1 validates game appeal with abstract chips. Cash/prize architecture is a later gated workstream.

## DEC-020 — Architecture

**Decision:** TypeScript monorepo; pure deterministic domain package; Next.js web; Fastify + Socket.IO authoritative API; PostgreSQL; Redis; server-authoritative time and state.

**Reason:** Optimize AI-assisted development, type sharing, realtime needs, and deterministic testing.

## DEC-021 — Friend challenge rating (provisional safeguard)

**Decision:** Private friend challenges are unrated in v0.1.

**Reason:** Avoid trivial rating boosting. Revisit if trusted competitive challenge formats are needed.

## DEC-022 — Async included but experimental

**Decision:** Async is part of the first product scope but remains unrated and feature-flagged until its time-control rules are finalized.

## DEC-023 — V1 authentication provider

**Decision:** Use Clerk for V1 authentication, isolated behind an internal auth adapter.

**Reason:** Authentication is security-sensitive and not a differentiating product capability. Managed auth reduces founder/agent implementation risk while preserving migration ability through an internal user model.

## DEC-024 — Bounty Bay Royale art direction

**Decision:** The frontend visual and experiential direction changes to
**Bounty Bay Royale**: a highly polished, playful, competitive presentation
("The world is playful. The numbers are ruthless.") with vivid dark
palettes, gradients and glows, high-but-disciplined motion, tactile game
controls, dramatic reveal sequences, an interactive onboarding tutorial,
and a game-first landing page.

**Supersedes:** the previous restrained, understated, trading-terminal-like
visual guidance in the original docs/09_UI_DESIGN_SYSTEM.md. That document
has been rewritten; this decision is the authoritative record of the change.

**Does NOT supersede:** game rules (02), economy (03), PRD (05), architecture
(06), data model (07), API contracts (08), security/integrity (10), analytics
(11), or the domain package. Backend behavior, contracts, tests, and E2E
flows must remain intact; frontend integration defects are fixed, never
papered over with backend changes.

**Reason:** The current frontend is a functional shell that proved the game
works end-to-end; consumer validation requires the product to feel like a
competitive game from the first screen. Playful world, ruthless scoring:
presentation may be theatrical, but outcomes remain objectively and
consequentially scored. Manipulative gambling patterns are explicitly
excluded.

## DEC-025 — P1 phase adopted: a real competitive product

**Decision:** The founder's P1 spec is adopted as the next phase. P1 begins
now (the M0–M5 vertical slice is playable), the remaining Royale redesign
phases (4–7: result reveal, onboarding, supporting surfaces, coherence) are
folded into P1 milestones where they overlap, and the first build slice is
**AI practice opponents** — pulled ahead of ranked matchmaking. Tooling
policy: versioned-config infrastructure ships early; founder-tooling UIs
(scenario editor, balance console, inspectors, analytics, experiments)
ship at the end of P1.

**P1 milestone order:** AI practice (P1-M1) → bounty rating (P1-M2) →
ranked matchmaking (P1-M3) → retention/analysis (P1-M4) → social + game
feel (P1-M5) → content + usability (P1-M6) → moderation (P1-M7) →
Benchmark Match (P1-M8) → founder tooling UIs (P1-M9). Daily Deal remains
gated on repeat appeal in analytics and may never attach persistent rewards
(GE-004). Benchmark Match comes at the end of P1, per the spec.

**Resolves OQ-008** (AI opponent strategy): exactly five personas —
The Anchor (aggressive openings), The Grinder (small concessions),
The Closer (values agreement), The Wall (very stubborn), The Mirror
(reciprocates movement). Decision-making is deterministic numeric
strategies only; no LLM in the decision path; AI chat is deterministic
flavor lines only. The difficulty ladder (Easy/Competitive/Expert) is
deferred until behavioral calibration; the LLM chat adapter remains a stub
until provider/cost questions are settled.

**AI representation:** AI players are seeded bot users
(`users.is_bot = true`, fixed UUIDs, `bot:<persona>` auth subjects). Bots
cannot authenticate or sign in (dev sign-in rejects `bot:` subjects;
`requireAuth` rejects bot users), and bot profiles are never publicly
served. AI matches are `mode: AI`, unrated, with `ratingVersion: null`
(GR-019, DEC-004); AI games never touch human rating or profile counters.

**Versioning:** persona behavior is config-driven and versioned
(`ai-personas-0.1.0`), recorded per match. Persona parameters live in code
for M1; moving them to versioned DB rows (mirroring `GameBalanceConfig`)
is a deferred tuning story.

**Reason:** Solo practice is the fastest path to playable content,
controlled strategy testing, and a labeled AI opponent that can later serve
as the matchmaking fallback — without polluting human rating. The rating
remains provisional (OQ-001) until it empirically predicts outcomes.

**Does NOT supersede:** game rules (02), economy (03), PRD (05),
architecture (06), data model (07), security/integrity (10), analytics
(11), or the domain package. AI intents pass the exact same domain
validation as human commands; the domain package stays pure.

## DEC-026 — Gameplay depth, communication & anti-stalling directive adopted

**Decision:** The founder directive "BOUNTY BAY — GAMEPLAY DEPTH,
COMMUNICATION & ANTI-STALLING" is adopted as canonical scope, recorded in
docs/17. Its seven phases (anti-stalling; private dossiers; verified
information; offer communication; voice pitch; no-deal analysis; AI /
spectator / replay integration) run as a new milestone group **DD-M1..DD-M7
immediately after P1-M1 (AI practice)** and before P1-M2. Phase 1 is
effective now; Phases 2–7 are adopted but deferred and implement in
directive order, checking in after each phase. Items the directive leaves
open (§37) are registered in docs/14 and stay configurable or PRODUCT
DECISION REQUIRED — no permanent answers are invented during
implementation.

**Explicit supersede notes (recorded here because canonical docs
conflicted with the directive):**

- docs/03's provisional "cumulative time to floor" test default changes
  120 s → 60 s (the directive's example decay window). Still provisional.
- docs/01's V1 non-goal "No voice/video negotiation" is superseded when
  Phase 5 lands (short offer-attached voice clips; full live Voice Deal
  remains a planned mode). The non-goal stands until then.
- docs/01 lists "Spectator mode | Later"; the directive's Phase 7 adds
  spectator support with hidden-information rules. No spectator code ships
  before Phase 7.
- The directive's "Claude Design visual system" reference (§32) resolves to
  this repo's approved design system, docs/09 Bounty Bay Royale (DEC-024).
  No art-direction change.

**Does NOT supersede:** the core economic rule (no-deal = zero bounty, no
fixed penalty — GE-003, DEC-009), game rules 02 except the GR-023..GR-028
additions this directive defines, economy 03, PRD 05, architecture 06, data
model 07, API contracts 08, security 10, analytics 11 (extended, not
replaced), or the domain package.

**Reason:** The three product risks (stonewalling, silent number exchange,
no-deal incentive pathology) block the core interaction the product needs:
offer = number + pitch + information, with numbers authoritative and price
the only negotiated issue.

## DEC-027 — Phase 1 anti-stalling design

**Decision:** Phase 1 (DD-M2 in docs/16; GR-023/GR-024) is
implemented as follows:

- **Timeout mechanism:** a server-only domain command `TIMEOUT` (modeled on
  walk-away: NO_DEAL + completion reason TIMED_OUT + zero bounty) plus a
  pre-dispatch domain guard rejecting OFFER/ACCEPT/WALK_AWAY with
  `TIMED_OUT` once the active player's elapsed time reaches the limit while
  ACTIVE. Failed commands never mutate state; replay stays single-path.
- **Scheduler:** `apps/api/src/timeout-scheduler.ts` mirrors the
  AiTurnEngine restart-safety pattern (boot scan of ACTIVE matches,
  idempotent refresh, unref'd timers, re-check under lock; `TIMEOUT_NOT_DUE`
  → re-arm remaining). Runs for all ACTIVE matches including AI turns.
- **Config:** new `economy-0.2.0` active row (test defaults: floor at 60 s,
  hard limit 90 s, warnings 30/10 s, timeoutPolicy ATTRIBUTED_NO_DEAL);
  new fields are optional — absent limit = no timeout, so legacy
  `economy-0.1.0` snapshots replay identically. The 0.1.0 row's values are
  never edited; only its active flag is cleared.
- **Warning tiers** are config-driven and computed in the domain
  projection (`decisionTimeRemainingMs`, `timeTier`); clients render only.
- **Analytics:** structured server log lines (`match_timed_out`,
  `time_tier_entered`, extended `match_completed`) per docs/11; the
  platform ships with P1-M9.
- **E2E:** the seed honors `E2E_HARD_LIMIT_MS` / `E2E_WARN_LOW_MS` /
  `E2E_WARN_CRITICAL_MS` overrides for the active row; the timeout spec
  uses expect-polling, no sleep-based fixes.

**Deferred explicitly (not invented here):** the timeout rating
consequence (versioned rating system, OQ-005); exact durations and
warning thresholds (OQ-002/OQ-015); timeout-policy variants beyond
ATTRIBUTED_NO_DEAL (OQ-016).

**Reason:** Deterministic, replay-safe, server-authoritative anti-stalling
that closes the timer race and survives scheduler restarts, without
touching the economy math or legacy-match semantics.

## DEC-028 — Negotiation Intelligence directive adopted

**Decision:** The founder directive "BOUNTY BAY — NEGOTIATION INTELLIGENCE,
GAME REVIEW & COACHING SYSTEM" is adopted as canonical scope, recorded in
docs/18 (architecture), docs/19 (behavior feature definitions) and docs/20
(observation definitions). It runs as the milestone group **IN-1..IN-8,
starting immediately after P1-M1 (AI practice)** and before P1-M2 (bounty
rating); the DD track (DEC-026) resumes after. Phase 1 (behavioral
foundation) is effective now; Phases 2–8 implement in directive order,
each with a founder checkpoint — do not auto-continue.

**Core constraints adopted:**

- **Layered architecture, LLM last:** match data → deterministic feature
  engine → deterministic observations → longitudinal profile → benchmarks →
  structured knowledge base → retrieval → coaching composer → practice →
  improvement tracking. The LLM explains and synthesizes; it is never the
  authority for what happened, the economics, or the statistics.
- **Four claim levels** are canonical and must be distinguishable in
  UI/API/data: L1 objective match fact (computed), L2 empirical Bounty Bay
  benchmark (cohort + N + version + minimum threshold), L3
  research-supported principle (attributed, evidence-graded A–D), L4
  interpretive coaching hypothesis (cautious, never presented as proven
  psychology).
- **No negotiation Stockfish:** moves are never labeled best/blunder/
  mistake/inaccuracy. Language is descriptive (aggressive, costly,
  unreciprocated, unusually large, fast, delayed) and separates WHAT WE
  KNOW from WHAT WE INFER.
- **Deterministic first:** Phase 1 ships a pure, versioned feature +
  observation engine over (MatchState, DomainEvent[], EconomyConfig) with
  no RAG and no LLM. Game Review works fully when the coaching service is
  unavailable.
- **Evidence quality grades** (A strong empirical / B empirical with
  limitations / C practitioner framework / D expert heuristic) gate the
  coaching register ("Research suggests…" vs "One practitioner approach
  is…"). No citation theater: every displayed citation maps to a stored
  knowledge record.
- **Thresholds before claims:** longitudinal insights follow the
  configurable bands INSUFFICIENT DATA (1–4) / EARLY SIGNAL (5–14) /
  EMERGING PATTERN (15–29) / ESTABLISHED (30+); benchmarks carry cohort,
  N, version and minimum-sample safeguards; descriptors derive from
  explicit thresholds and are gameplay tendencies, never personality
  diagnoses.
- **Privacy and scope:** reviews are role-scoped to the caller's own
  behavior; opponent-private information follows the normal post-match
  disclosure policy (GR-018). Verified-fact and pitch features wait for
  DD-M3/M4/M5 (GR-025/GR-028) — items that cannot be defined rigorously
  today are marked NEEDS DEFINITION, never implemented with naive
  heuristics. Free/premium entitlement boundaries are PRODUCT DECISION
  REQUIRED (OQ-024); no payments without separate instruction.
- **Versioning:** every feature calculation and observation rule is
  versioned (`feature-engine-0.1.0` / `observation-engine-0.1.0`),
  recorded per match, so historical analyses stay reproducible.

**Track interactions:** IN-2 (Game Review V1) absorbs P1-M4's
"deterministic post-match analysis" and DD-M7 (no-deal analysis); IN-8
(benchmark engine) absorbs P1-M8 (Benchmark Match). P1-M2 (rating) is a
dependency of IN-3/IN-8 and stays ahead of them. DEC-026's DD track is not
superseded.

**Reason:** Turn the game into a product that can observe how a person
negotiates, explain it with credible research, prescribe targeted
practice, and measure change — while the game remains the primary product
and every claim stays provably grounded in structured data.

## DEC-029 — Claude Design canvas v1 adopted as the canonical UI source

**Decision:** The founder's Claude Design export (canvas "Bounty Bay —
Product Design v1", in `design-sandbox/bounty-bay-canvas/`) is adopted as
the canonical source for layout, information hierarchy, component
appearance, responsive behavior, game-state presentation, character
placement, art direction, motion intent, and interaction states. Its
tokens (ember = player, violet = opponent, gold = value, green = deal),
type system, component styles (`styles/bb.css`), and event choreography
(`motion-spec.md`, sequences A–H) supersede the visual guidance in
docs/09 wherever they conflict. docs/09 retains authority for
accessibility bindings (WCAG, reduced-motion, focus), component
discipline, and self-hosted fonts; docs/20 and the domain package retain
authority for all game rules, calculations and copy-of-record.

**Resolved conflicts:** (1) docs/09 rejected "parrot mascots" — the canvas
cast includes BLACK PARROT; the canvas wins (art direction is now the
canvas's authority). (2) docs/09's turquoise primary accent yields to the
canvas's ember/violet/gold/green roles. (3) Vocabulary stays with the
binding repo terms: Reservation value / Clock multiplier / Concession
chips (the canvas's "limit / bounty multiplier / chips" are mockup
labels). (4) Fonts: Baloo 2 (world), Space Grotesk (numerals), Inter (UI)
via self-hosted next/font.

**Open (do not implement as rules):** D7 accept availability on the
opponent's turn (domain requires your turn — UI shows the crossed seal
but pressing acts only on your turn); "in reach" private hint signalling
(the canvas pulses my limit card green when their standing offer is
inside my mandate — private-to-me, allowed); expression triggers read
public data only; performance tiers and motion-spec DECISION items stay
tunable placeholders.

**Slices (directive order):** LIVE MATCH → ACCEPTANCE → RESULT REVEAL,
one vertical slice at a time, each with tests + localhost URL +
screenshots + deviation list. The implementation map is docs/21.
Secondary pages (onboarding, profile, replay, review, landing) are NOT
redesigned until the slices complete.

**Reason:** A professionally art-directed canvas is a stronger and more
specific visual authority than prose guidance; implementing it
slice-by-slice preserves the working game (testids, flows, E2E) while the
visual layer converges on the target.

## DEC-030 — Negotiation agent architecture adopted as future direction (deferred)

**Decision:** The founder directive "Bounty Negotiation Agent"
(2026-09-23) is adopted as canonical design direction, recorded in
docs/22. The AI opponent architecture evolves from five fixed personas to
a seven-layer negotiation agent: (1) private mandate & utility model, (2)
belief state, (3) strategy, (4) tactic selection, (5) economic action, (6)
communication, (7) personality. The strategic engine (layers 1–5) is
deterministic and measurable; the LLM is an actor producing language,
persuasion, personality and conversational continuity — never the
decision-maker. Difficulty = depth of reasoning (Beginner/Intermediate/
Expert), not concession sizes; Expert never sees hidden information — it
is only better at inference. The same engine powers casual AI opponents,
practice partners, targeted coaching drills, Real World Mode, and expert
simulations.

**Status:** DESIGN DIRECTION ONLY — DO NOT IMPLEMENT until it is
scheduled (not before the IN-2 checkpoint and DD Phase 1 sign-off).
DEC-025's five personas (Anchor, Grinder, Closer, Wall, Mirror) remain the
provisional early implementation and stay in place; no persona code is
deleted until the deeper agent work is actually scheduled.

**Supersedes (as long-term direction only):** DEC-025's resolution of
OQ-008 — the five personas are reclassified from "the AI opponent
strategy" to "provisional early implementation". DEC-025's surviving
constraints remain in force: AI economic actions pass the same domain
validation as human commands; AI matches stay mode AI, unrated, bot-scoped
(GR-019, DEC-004); no LLM in the decision path.

**Interactions:** the agent consumes DD-M2/M3 dossier and verified-fact
data (GR-028; price remains the only negotiated issue); adversarial
coaching hooks IN-6 (practice personas); persistent adaptation reuses
IN-3's longitudinal profile and confidence bands — never the opponent's
current-match hidden information; DD-M7 (AI/spectator/replay) implements
the agent's information boundaries. Versioning seam: the existing
`ai-personas-0.1.0` config row already records per-match behavior; a
future `ai-agent-<version>` row will do the same. Replay requires
LLM-generated text persisted as match events (retention permitting).
AGENTS.md guardrails hold: opponents never appear human; LLM output is
data, never executable/system instructions.

**Reason:** Solo play is the strategic entry point (DEC-025), and fixed
concession-curve bots are too shallow for a sticky negotiation-practice
product. The deeper agent — deterministic strategic engine + opponent
modelling + tactical repertoire + LLM actor — is core IP, and keeping the
decision layer deterministic keeps strategy measurable, testable, and
domain-validated.
