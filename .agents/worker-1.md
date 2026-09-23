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

## CURRENT TASK — BB-211: playwright fail-safe default DB — READY FOR REVIEW

Results (2026-09-23, worktree @ main 2039622):

- `apps/web/playwright.config.ts`: the bare default `E2E_DATABASE_URL`
  fallback changed from the shared dev DB (`bounty_bay`) to the isolated
  `bounty_bay_e2e` (D-20); targeting anything else is now always an
  explicit env choice. No other config behavior changed (reuse mode,
  ports, seed overrides untouched).
- `README.md`: bare `pnpm test:e2e` instructions updated — one-time e2e
  DB creation/migrate/seed (with the short-limit env overrides), explicit
  `E2E_DATABASE_URL` override note, and the 3100/4100 vs
  `E2E_REUSE_SERVERS=1` port guidance.
- `.env.example` carries no E2E defaults — nothing to change.
- Evidence: bare run (no `E2E_DATABASE_URL`; alt ports only) of the
  friend-match deal spec — passed 11.2 s; afterwards exactly 1 match in
  `bounty_bay_e2e` (last 5 min) and 0 in `bounty_bay`. Reuse mode is
  unaffected (no server boot → the default is never consulted; suites
  green earlier under `E2E_REUSE_SERVERS=1` with explicit env).

## NEXT STEP
Awaiting manager verdict on BB-211 (ACCEPT / REWORK / BLOCK). DD-M2
(private dossiers) gated on founder sign-off (DEC-026) — not started.
W1-02 remains in the founder review queue.

## STATUS
BB-211 READY FOR REVIEW (evidence above). W1-01/W1-03 ACCEPTED.
W1-02 in the founder queue.

## PRODUCT ASSUMPTIONS
None new; hold durations (600 ms accept / 1 s walk-away) from HO-Contracts;
haptics best-effort; time warnings remain required by GR-023 until a
canonical rule change says otherwise.

---

## PDR-2 — evidence: GR-012 walk-away doc-vs-behavior (founder to rule)

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
