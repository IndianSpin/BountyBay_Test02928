# Worker 1 — domain / deterministic mechanics (DD track)

Session: `gameplay-depth-anti-stalling` · Branch: `w1-dd-mechanics` ·
Worktree: `~/projects/bay-w1` (one-time `pnpm install`; move there after
EM-01 message — the main checkout goes manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint (CURRENT TASK / STATUS / LATEST COMMIT / FILES / TESTS /
BLOCKERS / PRODUCT ASSUMPTIONS / NEXT STEP). Do not edit canonical
`docs/*` directly — propose doc changes here and the manager applies them
(D-6). **You never self-certify "done" — your terminal state is READY
FOR REVIEW; the manager returns ACCEPT / REWORK / BLOCK (D-8).**

## Ownership
- `packages/domain`, `apps/api` (esp. `timeout-scheduler.ts`), `packages/db`
  prisma schema (changes need manager migration review), DD feature config
  in `packages/config`.
- Web (your slice files only): `use-hold.ts`, `match-actions.tsx`,
  `time-warning.tsx`, `layout.tsx` (fonts), E2E: `hold-accept.spec.ts`,
  `timeout.spec.ts`, `friend-match.spec.ts`, `canvas-checkpoint.spec.ts`.
- `globals.css`: only your `.lm-accept`, `.lm-walk__hold`,
  `.lm-confirm-sheet` sections (+ their reduced-motion entries). W2 owns
  the rest; cross-section needs → flag to manager.
- E2E infra: isolated `bounty_bay_e2e` DB (5433) + alt ports 3100/4100
  (D-4). Do not kill other sessions' dev servers on 3000/4000.

## CURRENT TASK — BB-226 (DD-M3 verified information, GR-028) — READY FOR REVIEW

Branch w1-dd-m3 (from golden-baseline-2, per D-36/D-41). Implemented:

- **Domain:** REVEAL command ({playerId, factId}) — ACTIVE-only, turn-
  gated (GR-014), GR-023-subject (added to the gameplay guard), consumes
  the turn (clock transfer like OFFER), free of chip cost (OQ-020
  unresolved — no cost invented). Legal only for facts in the player's
  OWN verifiable set; immutable once made (REVEAL_ALREADY_MADE) — no
  un-reveal exists; event FACT_REVEALED {factId} rides the stream and
  replays through commandForEvent. `ParticipantInput/State` gain
  `verifiableFactIds` (validated at creation: non-empty ≤200-char ids,
  no duplicates → INVALID_MATCH_INPUT) and `revealedFactIds`
  (append-only). Projection: ParticipantView carries `revealedFactIds`
  (shared); `verifiableFactIds` are NEVER serialized into any view
  (SI-001 — hidden-info penetration test pins it on raw JSON).
- **db:** `service.reveal()` (authoritative path like every command);
  `verifiableFactIdsForRole(scenario, role)` helper (verifiable-only
  ids; legacy rows → [] — reveals impossible, never broken);
  joinChallenge + acceptRematch materialize matches with the scenario's
  per-role verifiable ids. **No migration needed** — reveal state rides
  the domain snapshot and the event stream (no new columns/tables);
  manager review note: nothing to review.
- **API:** POST /v1/matches/:id/reveals ({commandId, factId} via
  revealRequestSchema; rate 30/min) through commitAndBroadcast; error
  map REVEAL_NOT_VERIFIABLE 400 / REVEAL_ALREADY_MADE 409; GET
  snapshot + GET result gain `revealedFacts: {[playerId]: DossierFact[]}`
  — content-decorated from the scenario row ONLY for facts the state
  says are revealed. AI matches: the human's verifiable ids pass in at
  creation; bots get [] (the AI plays from the domain view only, so
  unrevealed facts can never reach it — structural).
- **Tests:** domain match.reveal.test.ts (10: valid/turn-transfer/
  not-verifiable/already-made/off-turn/pre-start/terminal/GR-023
  boundary 89_999 vs 90_000/legacy-inert/both-players-boundary/
  projection SI-001/replay determinism/creation validation) + REVEAL in
  the property command pool; API reveal.test.ts (4: raw-payload
  penetration both directions, error mapping, result-route reveal
  carry, AI human-vs-bot verifiable sets); E2E reveal-api.spec.ts (1:
  first-mover-agnostic reveal → opponent raw payload carries exactly
  the revealed fact → repeat refused after the turn cycles back).
- **Evidence:** `pnpm typecheck` — all 9 packages exit 0. `pnpm test` —
  274 passed / 66 skipped. `pnpm test:db` (isolated E2E DB, seeded
  without overrides; restored after) — 14 files, 75 tests passed.
  Strict E2E (3100/4100) — 20 passed / 1 canvas-gated skip (incl.
  reveal-api). `pnpm lint` — exit 0.

### DOC PROPOSALS (D-6, no docs/* edited)
- docs/02 GR-028: reveal = formal turn-gated action, GR-023-subject,
  immutable, transfers the turn, no chip cost until OQ-020 closes.
- docs/07: MatchEvent += FACT_REVEALED; snapshot participant fields
  verifiableFactIds (server-only) / revealedFactIds (shared); no
  schema/migration change.
- docs/08: POST /v1/matches/:id/reveals + response; codes
  REVEAL_NOT_VERIFIABLE/REVEAL_ALREADY_MADE; snapshot/result
  `revealedFacts` shape.
- docs/14 OQ-019: data capability now implements the
  explicit-reveal-only policy (unrevealed facts stay hidden even after
  completion); the "reveal everything at result" branch stays open.

### BB-222 + BB-223 — ACCEPTED and merged (c83d126) on main; this
branch starts from golden-baseline-2 (D-36).

### BB-222 (QA-006) — done, with a second root cause found and fixed
1. Cap raised: dev-signin 30→300/min (app.ts). Production-proof test
   added to routes.test.ts: `hasRoute` false when NODE_ENV=production
   even with exposeDevAuth (the route registration is the structural
   fail-closed gate; the cap is dev-only by construction).
2. **Second root cause (the true GR-007 flake): identity divergence
   from a double sign-in.** Instrumented the GR-007 evaluate diagnostic
   (token user id + page path). Evidence from a failing run: HTTP 200,
   valid token, activeMatch null — the evaluate's token user
   (`dev-37894dce…`) was minted in the SAME millisecond as the match's
   joiner and had zero participant rows, while both offers were
   committed by the real participants. Cause: two concurrent
   `ensureDevIdentity` calls (dev fast-refresh remount racing the first
   sign-in) both observed empty storage, both signed in, and whichever
   `setItem` landed last won localStorage while the page's in-memory
   token state held the other → the page played as one identity while
   the evaluate read a stranger identity. Fix (OWNERSHIP FLAG:
   apps/web/src/lib/dev-auth.ts is outside my listed web slices —
   small dev-only fix, flag for the manager/W2): single-flight
   in-flight dedup in ensureDevIdentity — concurrent callers share one
   sign-in; divergence impossible; also reduces suite signin volume.
   Proof: friend-match file 8/8 green (was ~50% failure); full strict
   suite 2× green (16 passed / 1 canvas-gated skip, 0 signin 429s).

### BB-223 (QA-007) — done
insights-api.spec.ts subjects now unique per run (uuid suffix).
Acceptance: spec green 2× against the deliberately dirty e2e DB
(second run inherits the first run's residue). Audited rematch-api +
dossier-api: all assertions relative to fresh match ids — residue-safe.

### Evidence (this checkpoint)
- `pnpm typecheck` — all 9 packages exit 0.
- `pnpm test` — 251 passed / 62 skipped.
- `TEST_DATABASE_URL=…bounty_bay_e2e pnpm test:db` (E2E DB seeded
  without overrides; restored after) — 13 files, 71 tests passed
  (incl. new production-gate test).
- Strict E2E suite (3100/4100) 2× — 16 passed / 1 skipped each, 0
  signin 429s. friend-match.spec.ts additionally 8/8 across two loops.
- Lint: my files clean; remaining failures are pre-existing
  `.agents/qa/tools/*` (not mine).

### GR-007 flake fix — ACCEPTED and merged (56f9141)

## OLD CURRENT TASK — GR-007 flake fix (manager-routed, pre-golden-baseline) — READY FOR REVIEW

Flake: the direct-API helper in friend-match.spec.ts (GR-007 test)
read `/v1/me/active-match` once with no retry — in full-file sequence
the first read can race the page's dev identity/token settling and
return no matchId while the match is ACTIVE (~50% in sequence, passes
standalone). Fix: bounded poll inside the page.evaluate — up to 5
attempts, 250 ms between attempts, token re-read each attempt, and a
failure payload carrying the last attempt's state + attempt count (no
unbounded waits, no sleeps-as-fixes). Proven: full friend-match spec
file 3× green (deal / chat / GR-007 each time). Same un-retried pattern
exists in canvas-checkpoint.spec.ts:155 — that spec is CAPTURE_CANVAS-
gated (capture utility, not regression baseline); noted, not touched.

## OLD CURRENT TASK — STANDING DOWN (manager: queue empty)

BB-220 ACCEPTED and merged (e508816 + docs a221009, D-30); the
coaching-state call confirmed (no fake empty state; store + endpoints
with IN-5/IN-7). Worker-1 queue is empty. DD-M3 (verified reveals)
remains gated on the founder's DD-M2 checkpoint (DEC-026 phase gate) —
the manager puts it in front of the founder at the next batch. Waiting
for the next assignment; no work in flight.

### BB-220 — ACCEPTED and merged (e508816 + docs a221009; D-30)

### BB-219a — ACCEPTED and merged (49e6a38 + docs 6080ad8); cancel
product assumption ratified; migration review passed.

## OLD CURRENT TASK — BB-219a (friend-rematch API, PDR-3/QA-004) — READY FOR REVIEW

Implemented per the design below (unchanged since task start). Evidence:

- `pnpm typecheck` — all packages exit 0:
  domain/contracts/ai/testing/intelligence/db/web/api typecheck: Done.
- `pnpm test` — 27 passed / 11 skipped; Tests 251 passed / 56 skipped.
- `TEST_DATABASE_URL=postgresql://…:5433/bounty_bay_e2e pnpm test:db` —
  Test Files 12 passed, Tests 65 passed (incl. rematch.test.ts 6/6).
  NOTE: run with the E2E DB seeded WITHOUT overrides (seed upsert restores
  defaults); the command-service replay test compares the stored row
  against DEFAULT_ECONOMY_CONFIG and fails on override-seeded values
  (45000/25000 vs 90000/30000) — pre-existing workflow, not a code bug.
  Re-seeded with E2E overrides again afterwards.
- E2E (E2E_WEB_PORT=3100 E2E_API_PORT=4100): 12 passed, 1 skipped
  (canvas-checkpoint, CAPTURE_CANVAS-gated) — incl. rematch-api.spec.ts 2/2.
- Lint: my files clean. Remaining repo lint failures are NOT mine (flag):
  `.agents/qa/tools/battery.ts` (7), `.agents/qa/tools/specs/qa-interruption.
  spec.ts` (1), W2's `resource-hud.tsx` (4), W2's `result-reveal.tsx` (1).

Design (per PDR-3 "rematch = mutual consent"): a rematch proposal is a
Match row — status CREATED, one participant (the proposer), no invite
token, plus two new nullable columns (`rematchFromMatchId` = source match,
`rematchOpponentUserId` = the only user who may accept). No new table; the
accept path materializes the domain match with FIXED roles (each player
keeps their previous-match role), fresh RVs, `pickFirstPlayer`, then
auto-readies both players inside the same transaction → the new match is
ACTIVE immediately ("on acceptance a new match starts"). Unrated: mode
FRIEND_LIVE, ratingVersion null (GR-019). No domain changes — rematch is
API/service lifecycle orchestration; the new match is an ordinary match.

Endpoints (all participant-scoped, POST bodies are `{commandId}`):
- `POST /v1/matches/:matchId/rematch` — propose; source must be
  FRIEND_LIVE, two-participant, terminal; one open proposal per source
  match (guarded inside the service transaction under the source-row
  lock). 201 `{matchId, role, reservationValueTenths, scenario}`.
- `POST /v1/matches/:matchId/rematch/accept` — fixed opponent only →
  new ACTIVE match; response `{matchId, role, reservationValueTenths,
  status}`; the deadline scheduler is re-armed for the new match.
- `POST /v1/matches/:matchId/rematch/decline` — opponent only; deletes
  the proposal row (no domain state existed; cascade-safe).
- `POST /v1/matches/:matchId/rematch/cancel` — proposer retraction
  (natural completion of mutual consent; PRODUCT ASSUMPTION, flag if the
  manager disagrees).
- `GET /v1/matches/:matchId/rematch` — `{incoming: {matchId,
  createdAt}|null, outgoing: …|null}` for the BB-219b in-session prompt.
- `GET /v1/matches/:id` pre-join branch returns
  `status: 'REMATCH_PENDING'` for proposal rows (never the misleading
  "share the link" panel — PDR-3's guard). `/v1/me/active-match`
  excludes open proposals (a proposal is not a playable match).

New codes: `REMATCH_NOT_FOUND` (404), `REMATCH_NOT_OPEN` (409),
`REMATCH_FORBIDDEN` (403), `REMATCH_ALREADY_PROPOSED` (409),
`REMATCH_NOT_AVAILABLE` (409 — non-friend mode / not terminal).
Service methods in packages/db (`createRematchProposal`,
`acceptRematch`, `deleteRematchProposal`); fixed-role RV assignment via
new `assignFixedRole` in match-assignment.ts. Migration
`20260923022459_pdr3_rematch` — additive nullable columns, created +
applied against the isolated E2E DB only; **manager migration review
required before merge**; dev DB untouched (it still lacks DD-M2 too).

Tests: `apps/api/tests/rematch.test.ts` (RUN_DB_TESTS=1) — propose→
accept→ACTIVE happy path with role/scenario/unrated invariants,
fixed-opponent enforcement, non-participant/non-terminal/mode guards,
duplicate-proposal guard, decline/cancel + re-propose, accept-after-
resolve, rematch-of-a-rematch. E2E `rematch-api.spec.ts` (API-level,
no board — UI is BB-219b for W2).

### BB-204 — ACCEPTED (787aa86); BB-214/BB-217/BB-217b — ACCEPTED

## OLD CURRENT TASK — BB-214 hotfix + BB-217 domain answer + BB-204 (DD-M2 dossiers)

### BB-214 (QA-002 HIGH) — FIXED (uncommitted, rides with BB-204)

`apps/web/e2e/friend-match.spec.ts` diagnostic union read `.code`
unguarded (the status-0 branch has no code field) → `pnpm --filter web
typecheck` failed on main. Fix: narrow the assertion with a cast and
document the two-branch shape in the spec. Web typecheck clean again
(0 errors). Lesson logged by the manager (L-007); my own checkpoints now
always include the web typecheck.

### BB-217 — item-10 domain answer (no UI files touched)

1. **Offer 110 vs RV 78.9: ILLEGAL.** GR-003/GR-006: a buyer may offer
   only amounts ≤ their reservation value (seller mirror: ≥). 110.0 > 78.9
   → the domain rejects with `OUTSIDE_RESERVATION_VALUE`; nothing
   commits, the turn never switches. (Domain proof:
   `packages/domain/src/match.ts` `applyOffer` RV check;
   `match.test.ts` "hard RV boundary".)
2. **"Your mandate does not allow you to offer more than 78.9":** the
   composer's client-side advisory (`offer-composer.tsx:67`) that names
   the viewer's OWN limit while typing — self-information only (the
   viewer already knows their RV; nothing about the opponent is
   revealed). The authoritative server rejection is the generic
   gameLanguage string in `match-screen.tsx` ("that much"/"that
   little"). Same GR-003 rule at two layers: advisory preview vs
   authoritative refusal.
3. **"116,500": NOT a tenths-formatting bug of 116.5.** The single web
   formatter `formatTenthsGrouped` (lib/format.ts) divides by 10 before
   grouping: tenths 1165 → "116.5". "116,500" is the CORRECT output for
   1,165,000 tenths (an 116,500.0 offer). Every display path in
   apps/web routes through this one formatter (verified by grep:
   offer-plate, offer-composer, match-screen, board). If QA observed
   "116,500" attached to a 116.5 offer, that path no longer exists in
   current code — request the repro screen/element if it reappears.

### BB-217b — turn-structure check (D-26, founder feedback #2)

(a) **Implementation matches GR-013 exactly.** Domain `applyMessage`
   emits MESSAGE_SENT only — no turn switch, no clock effect, no offer
   creation; it is legal for EITHER player (not just the active one) any
   number of times. The one nuance beyond GR-013's wording: chat is
   allowed while ACTIVE **and PAUSED** (frozen-clock state is still
   "active negotiation"); it is unavailable pre-start (CREATED/READY)
   and post-terminal (the result screen replaces the board). That is
   implementation detail, not a turn-state violation.
(b) **"Talk multiple times on your turn without changing the number" is
   fully compatible with GR-007.** GR-007 rejects only resubmitting the
   same formal OFFER; MESSAGE commands are not offers (GR-013), cost no
   chips, and never consume the turn. This is exactly the DD directive's
   "hold your number → talk" branch — and it also works past the hard
   decision-time limit (the GR-023 guard exempts MESSAGE), so a player
   can keep communicating right up to the timeout transition.
(c) **No deviation found** — no canonical wording change required. If
   the founder wants the "anytime" nuance pinned, proposed GR-013
   amendment for the manager to apply: "Chat is available to both
   players at any time while the match is ACTIVE or PAUSED; messages
   never consume, transfer, or reset the turn (GR-007 applies to formal
   offers only)."

### BB-204 — DD-M2 private dossiers — READY FOR REVIEW (with BB-214/BB-217)

- **Schema/migration:** `packages/db/prisma/schema.prisma` Scenario +=
  `sharedContext`, `buyerPrivateContext`, `sellerPrivateContext`,
  `buyerPrivateFacts`, `sellerPrivateFacts` (JSON arrays of DossierFact).
  Migration `20260923014012_dd_m2_dossiers` (additive columns only) —
  created against the isolated E2E DB; **manager migration review
  required before merge**; dev DB untouched.
- **Domain:** `packages/domain/src/dossier.ts` —
  `validateDossierFacts(facts, privateContexts)` + category whitelist +
  caps (MAX 8 facts / 200 chars, OQ-020 provisional). Leak discipline:
  private facts and private contexts must be number-free (any digit could
  encode RV-equivalent info — GR-028). Pure; exported from the domain
  index.
- **Seed:** the 3 seeded scenarios now carry shared context, per-role
  private context, and 3 facts each (some verifiable, with reveal
  labels); the seed FAILS FAST via `validateDossierFacts` before any
  upsert.
- **API:** `scenarioForRole(scenario, role)` in match-routes.ts serves
  `sharedContext` + the viewer's OWN `myPrivateContext` /
  `myPrivateFacts` (plus legacy `myNarrative`). Wired into challenge
  create, GET match (both branches), GET result, and the AI-match
  response. The opponent's dossier is never serialized (SI-001-grade).
- **UI component (unwired, for W2's BB-213):**
  `apps/web/src/components/game/dossier.tsx` + `dossier-model.ts` +
  `dossier.module.css` (self-contained CSS module — no globals.css
  touches). Props contract documented in the file header.
- **Tests:** domain dossier validator (valid/invalid/boundary + leak
  invariants); web dossier-model pure tests (apps/web/tests — new
  directory, node vitest); `dossier-isolation.test.ts` (raw-payload
  penetration proof in BOTH directions + legacy scenario-row boundary +
  AI route); E2E `dossier-api.spec.ts` (payload present, role-scoped,
  number-free facts, result route — no board dependency per the amended
  contract). All green: unit 239, dossier API 2/2, dossier E2E 1/1,
  web/api/db typechecks clean.
- **Lint:** 3 leftover unused-import/var errors in my files fixed
  (match-actions, match-screen). Remaining lint failure is the
  pre-existing `apps/web/debug-reveal.tmp.mjs` in the baseline (TD-1) —
  not mine; flagging for the manager.
- **Doc proposals (D-6, no docs/* edited):** docs/07 Scenario table needs
  the five new fields; docs/08 snapshot/result/`POST /v1/challenges`
  scenario shape gains `sharedContext`/`myPrivateContext`/
  `myPrivateFacts` with the role-scoping note.

## NEXT STEP
Await verdict on BB-222/BB-223. Next queue (D-36/inbox): BB-229 (DA-P1
api task per .agents/data/DA-P1-SPEC.md — unblocked by the manager)
then BB-226 (DD-M3 verified information, GR-028 — branches from
golden-baseline-1 once cut).

## PRODUCT ASSUMPTIONS
- Rematch proposals are deleted on decline/cancel — no audit record is
  kept (no domain state existed; either side may then propose again).
- Accept auto-readies both players (PDR-3 "on acceptance a new match
  starts"): no second ready-up screen before the rematch begins.
- Open proposals are excluded from `/v1/me/active-match` and the
  proposer's pre-join view is `REMATCH_PENDING`, never the share-link
  panel (PDR-3's "no misleading rematch affordance").
- Rematch is FRIEND_LIVE only. RANKED_LIVE/AI/ASYNC sources are rejected
  (409 REMATCH_NOT_AVAILABLE) — rated rematch would need rating rules
  (P1-M2), bots cannot consent.
- BB-220: insights is self-only; no coaching state served until it has a
  store (IN-5/IN-7).
- Hold durations (600 ms accept / 1 s walk-away) from HO-Contracts;
  haptics best-effort; time warnings remain required by GR-023 until a
  canonical rule change says otherwise.

## DOC PROPOSALS (D-6, no docs/* edited)
- docs/08_API_CONTRACTS.md: `GET /v1/me/insights` — authenticated,
  self-only; returns `{profile: LongitudinalProfile|null}` (version
  longitudinal-profile-0.1.0, windows lifetime/recent/previous/rolling,
  trends, descriptors with evidence, roleSplit, confidenceBand,
  lastMatchEndedAt); profile null until the player has a non-aborted
  completed match; coaching state deliberately absent until persisted
  (IN-5/IN-7). MatchFeature rows are the source of truth (written at
  match completion, DEC-028); same-version rows only.
- Earlier BB-219a proposals (docs/07 + docs/08 rematch) were applied by
  the manager in 6080ad8 — done.
- Flag: remaining repo lint failures in `.agents/qa/tools/*` (8) and
  W2's `resource-hud.tsx` (4) / `result-reveal.tsx` (1) — not mine.

---

## PDR-2 — RESOLVED by the manager/founder (GR-012 rewritten on main)

My comparison + recommendation (committed d230a6d) recommended keeping
the turn-gated domain behavior and fixing the wording; main now carries
the amended GR-012 ("The player whose turn it is may choose Walk Away…
requires the acting player's turn, is subject to the personal
decision-time budget (GR-023)…"). Evidence section retained below for
the record.

**The discrepancy.** `docs/02_GAME_RULES.md` GR-012: "Either active
player may choose **Walk Away**." The domain gates walk-away to the
player whose turn it is: `applyWalkAway` requires
`state.activePlayerId === player.playerId`, else `NOT_YOUR_TURN`
(GR-014) — pinned by `match.test.ts` "is not available when it is not
your turn". So the doc can be read as "either player while the match is
active" while the behavior is "only the turn-holder". Since DD Phase 1,
a post-limit walk is additionally superseded by the timeout (GR-023
guard rejects WALK_AWAY with `TIMED_OUT`), which GR-012 also does not
mention.

**Evidence for the turn-gated reading (what the system does today):**
- Domain: `packages/domain/src/match.ts` `applyWalkAway` — NOT_YOUR_TURN
  for the non-active player (test-pinned, plus the property suite).
- UI: the ⋯ menu shows Walk away on both players' screens (LMD-07), but
  pressing it on the opponent's turn yields the game-language error — the
  server refuses.
- docs/04 UF-02 step 9: "Active player accepts, concedes, or walks away"
  — consistent with the domain, unlike GR-012's phrasing.

**Recommendation (for the manager to present):** keep the domain
behavior (turn-gated) and, if the founder agrees, amend GR-012 wording to
"The active player — the one whose turn it is — may choose Walk Away,"
plus a cross-ref that after the hard decision-time limit the walk is
superseded by the timeout transition (GR-023/GR-024). Reasons: (1) the
non-active player terminating the match mid-opponent-turn is an
abuse/race vector with no product rationale found in the canvas or
flows; (2) UF-02 and the tests already agree with the domain; (3) the
alternative — allowing either player to walk at any time — is a genuine
game-rule change touching GR-014 semantics, so it needs the same
founder ruling, not a wording fix. **No code or doc change made** (per
the PDR-2 plan).

---

## W1-02 — DD Phase 1 (anti-stalling) founder checkpoint report

§39-style completion report for DD-M2 milestone work (DEC-026/027, docs/17).

**1. Files changed:** docs: `docs/17` (new), `02` (GR-023–GR-028, GR-022,
invariants), `03`, `07`, `08`, `10` (SI-009), `11`, `12` (DEC-026/027),
`14` (OQ-002 closed branch, OQ-015–022), `16` (DD block), `01`, `09`.
Code: `packages/config` (hardDecisionTimeLimitMs/timeoutPolicy/warning
thresholds + effective-helpers + validation), `packages/domain` (TIMED_OUT
reason/event/command, dispatch guard, `applyTimeout`, projection
remaining/tier fields, replay mapping), `packages/contracts` (error codes),
`packages/db` (schema + migration `dd_phase1_timeout`, `timeout()` service
method, `timeoutPlayerId` persistence, `economyConfigFromRow`, seed with
E2E env overrides), `apps/api` (`timeout-scheduler.ts`, `analytics.ts`,
route wiring, realtime `onMatchStateChange` + heartbeat re-projection,
`timeoutPlayerId` in responses), `apps/web` (time-warning tiers, TIMED_OUT
copy, hold UI came later with the canvas slices), `packages/testing`
(simulator pinned no-limit). Plus 3 pre-existing lint fixes.

**2. Behavior implemented:** hard personal decision-time budget (GR-023)
separate from multiplier decay; server-only TIMEOUT command with due-
validation + pre-dispatch guard rejecting OFFER/ACCEPT/WALK_AWAY after the
limit (failed commands never mutate); restart-safe `TimeoutScheduler`
(AiTurnEngine pattern: bootScan/refresh/unref'd timers, TIMEOUT_NOT_DUE
re-arm); GR-024 distinct TIMED_OUT outcome (NO_DEAL, zero bounty,
attribution persisted, distinct from walk-away in UI/records/analytics);
warning tiers computed in the domain projection (clients render only);
repeated-offer prevention confirmed (GR-007 existed; gap-fill tests
added); structured-log analytics (`match_timed_out`, `time_tier_entered`,
extended `match_completed`).

**3. Tests added/run:** domain guard boundary/exemption/legacy-inert
cases; TIMEOUT valid/invalid/PAUSED/replay determinism; projection tier
boundaries; config validation/helpers; db timeout persistence + idempotency;
API 409 TIMED_OUT + no-timeout-route + scheduler deadline fire + bootScan
rescue; E2E timeout flow + duplicate-offer rejection. At checkpoint:
unit 226, db+api 51, E2E 9/9 green.

**4. Unresolved:** warning-threshold calibration (OQ-015), timeout-policy
variants + timeout rating consequence (OQ-016), exact durations (OQ-017),
no-ZOPA matches (OQ-018). Timeout keeps the walk-away `ratedEligible`
bucket pending the versioned rating system — no penalty invented.

**5. Spec ambiguities encountered:** the four directive-vs-docs conflicts
resolved and recorded in DEC-026 (decay default 120 s→60 s; voice non-goal
superseded prospectively; spectator deferred to Phase 7; GR-007 already
existed). Also: HO-Contracts "opponent's bounty hidden" vs GR-016 — kept
GR-016 (domain authority), flagged; docs/16 IN-vs-DD sequencing conflict
(D-3) remains open with the founder.

**6. Decision-log reference:** DEC-026/027. No silent spec changes.
