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

## CURRENT TASK — BB-214 hotfix + BB-217 domain answer + BB-204 (DD-M2 dossiers)

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
Awaiting manager verdict on BB-214/BB-217/BB-204 (single checkpoint).
DD-M3 (verified reveals) gated on manager/founder per DEC-026 phase
order.

## PRODUCT ASSUMPTIONS
None new; hold durations (600 ms accept / 1 s walk-away) from HO-Contracts;
haptics best-effort; time warnings remain required by GR-023 until a
canonical rule change says otherwise.

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
