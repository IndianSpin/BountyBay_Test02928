# BUGS — Bounty Bay QA (Agent 5)

Base SHA for all findings: `92a5e61`. Each finding carries the BB-206
classification: REAL? / REPRODUCIBLE? / MATERIAL? / SEVERITY? /
OWNER-CANDIDATE?

---

## QA-001 — Joiner mid-match refresh lands on "no challenge with that token"

- **STATUS UPDATE (2026-09-23):** fix implemented by W2 as BB-215
  (commit `04a4919`, branch `w2-frontend-design`) — consumed-token
  joiners and creators now recover to `/play?resume=<matchId>` via
  `recoverJoinFailure` instead of the alert. **QA pre-verified the
  acceptance behavior against that commit** (updated pin in
  `.agents/qa/tools/specs/qa-interruption.spec.ts` test 2: redirect, no
  alert, ACTIVE board, single PLAYER_READY — PASS). **Not yet merged to
  main** (main `3059635` still shows the old behavior); this entry
  becomes RESOLVED when the manager merges BB-215.

- **REAL:** yes. **REPRODUCIBLE:** yes — observed 3/3 runs (deterministic).
  **MATERIAL:** yes for the joiner's confidence and recovery path.
- **SEVERITY:** MEDIUM (P1-adjacent UX; no data loss, recoverable).
- **AREA:** frontend routing / join-token URL lifecycle.
- **OWNER-CANDIDATE:** worker-2 (frontend) with an API review: the join
  route could redirect participants to `/play?resume=<matchId>`.

**STEPS TO REPRODUCE:**
1. A creates a friend challenge; B opens the share link and readies.
2. A readies — the match goes ACTIVE.
3. B (the joiner) refreshes the browser.
4. B sees the home panel with an alert: **"no challenge with that token"**.

**EXPECTED:** the joiner lands back on the live match board (their browser
identity is still a participant), or at most on a neutral "back to your
game" screen.

**ACTUAL:** an error alert implying the match is gone. Below it, while the
match is live, a "Continue your game vs <opponent>" link to
`/play?resume=<matchId>` recovers the board — but the error is alarming and
the recovery requires understanding that a link labeled "continue" is the
way back from an error screen.

**EVIDENCE:** `.agents/qa/tools/specs/qa-interruption.spec.ts` (test 2
asserts the exact sequence; run per `.agents/qa/tools/README.md`);
screenshot `.agents/qa/evidence/joiner-refresh-midmatch-error.png`.

**LIKELY IMPACT:** a mid-match refresh (mobile tab reload, browser restore,
accidental pull-to-refresh) makes the player believe the match was lost;
some fraction will abandon a winnable deal. The one-time join token is
correctly single-use, but the join URL should be replaced by a match URL at
join time, or the join route should redirect known participants to resume.

**RECOMMENDED ACCEPTANCE TEST:** B reloads mid-match on the share URL →
the live board renders directly (no error alert), turn banner and clock
correct, no duplicate events (refresh must not duplicate actions).

---

## QA-002 — `pnpm typecheck` fails on main (W1-01 regression in spec)

- **REAL:** yes. **REPRODUCIBLE:** yes — deterministic. **MATERIAL:** yes —
  the typecheck gate is the manager's baseline verification step; it now
  fails for every subsequent review.
- **SEVERITY:** HIGH (build-gate broken; not user-facing).
- **AREA:** `apps/web/e2e/friend-match.spec.ts` (test-only file).
- **OWNER-CANDIDATE:** worker-1 (authored the W1-01 diagnostics).

**STEPS TO REPRODUCE:** `pnpm typecheck` at `92a5e61`.

**EXPECTED:** exit 0.

**ACTUAL:**
```
apps/web/e2e/friend-match.spec.ts(249,25): error TS2339:
Property 'code' does not exist on type
'{ code?: string } | { activeStatus: number; active: …; hasToken: boolean }'
```

**CAUSE:** W1-01's diagnostic return branch in the direct-API `evaluate`
introduced a union (`{ code?: string } | { activeStatus, active, hasToken }`)
and line 249 reads `duplicate.body.code` unguarded.

**EVIDENCE:** `/tmp/qa-tc-main.log` (full run log).

**LIKELY IMPACT:** CI/verification gate red; risk of masking future real
type errors. Playwright itself transpiles, so the E2E suite still passes —
which is why the manager's ACCEPT verification (6/6 changed specs) missed
the gate break.

**RECOMMENDED ACCEPTANCE TEST:** `pnpm typecheck` exits 0; the diagnostic
branch narrows the union before `.code` is read (or the assertion tolerates
the diagnostic shape).

---

## QA-005 (BB-218) — Illegal amount is presented as the ENABLED hero CTA; refusal only after tap

- **STATUS UPDATE (2026-09-24): RESOLVED — verified live.** D-28/BB-216
  (commit `fa6ad69`, merged in the BB-216 batch) neutralizes the CTA:
  the seal is DISABLED while a beyond-mandate amount is composed and
  re-enables for legal amounts; the advisory strip remains. The spec was
  re-pinned to the new behavior (`.agents/qa/tools/specs/qa-bb218.spec.ts`
  test 1: seal disabled + advisory + re-enable on legal + direct-API
  400 OUTSIDE_RESERVATION_VALUE — 2/2 PASS on current main). Evidence:
  `illegal-composed-cta-disabled.png`.

- **REAL:** yes (founder-reported; reproduced on current main). **REPRODUCIBLE:**
  yes — deterministic (buyer composes any amount above their RV).
  **MATERIAL:** yes — the primary action presents a guaranteed-to-fail offer.
- **SEVERITY:** MEDIUM (P1-adjacent UX; no integrity risk — the server is
  authoritative and refuses correctly; the turn never switches).
- **AREA:** live-match composer/actions (BB-216 redesign scope).
- **OWNER-CANDIDATE:** worker-2 (BB-216). The neutralization (disable or
  auto-correct the CTA when the typed amount is beyond the viewer's own
  mandate, mirroring the existing duplicate handling) belongs in the
  redesign scope per the manager.

**STEPS TO REPRODUCE (current main, base `903119e`):**
1. Friend match → ACTIVE; bring the turn to the buyer (RV e.g. 92.1).
2. Buyer types 123.2 (above their RV).
3. The cost strip shows the advisory "Your mandate does not allow you to
   offer more than 92.1." — but the seal CTA stays **enabled** and reads
   **SEAL OFFER 123.2**.
4. Tap SEAL → server returns `400 OUTSIDE_RESERVATION_VALUE`; the UI shows
   the generic alert "Your mandate does not allow you to offer that much.";
   turn unchanged, match ACTIVE, the illegal amount stays in the input.

**EXPECTED:** the hero CTA must never present an action the player's own
mandate forbids — disable it (like duplicate amounts) or refuse at the
composer with the advisory elevated, so the player cannot "seal" a
guaranteed failure.

**EVIDENCE:** `.agents/qa/tools/specs/qa-bb218.spec.ts` (test 1 — asserts
the enabled CTA, the advisory, the refusal alert, state integrity, and the
direct-API `400 OUTSIDE_RESERVATION_VALUE`); screenshots
`illegal-composed-cta-enabled.png`, `after-refusal-alert.png`.
Code path: `match-screen.tsx` `canOffer` checks turn/parse/direction/chips
but never the RV boundary; the composer's `beyondLimit` warning is
advisory-only.

**WHAT IS CORRECT (per BB-217, verified live):** the advisory names the
viewer's OWN limit (self-information, no opponent data); the refusal alert
copy is generic; nothing commits server-side; `116,500` in the founder's
screenshot is the CORRECT grouped rendering of a true 116,500.0 ask (see
INFO below).

**RECOMMENDED ACCEPTANCE TEST:** with a buyer beyond-limit amount typed,
`SEAL OFFER` is disabled (or the composer rejects the amount); no fetch is
possible; the advisory remains visible. Seller mirror: below-limit amounts.

## INFO — BB-218 rendering observations (not defects)

- Opponent ask `116,500` (from a 116,500.0 offer) is correct grouped
  formatting (`formatTenthsGrouped`), verified live on the ask plaque; a
  116.5 offer renders `116.5` — no tenths bug exists on current main.
  Evidence: `render-116500-plaque.png`, `render-116-5-plaque.png`.
- The seal CTA echoes the RAW input string ungrouped (`SEAL OFFER 116500`
  vs the plaque's `116,500`) — minor display inconsistency; fold into the
  BB-216 composer pass if convenient.

---

## RESOLVED — QA-002 (typecheck gate) fixed by BB-214, verified by QA

`pnpm typecheck` exits 0 on current main (`903119e`). The W1-01 diagnostic
union in `friend-match.spec.ts` was narrowed by the BB-214 hotfix (merged
in `787aa86`). Verified 2026-09-23 by QA on the BB-218 run. L-007 keeps
typecheck in the manager gate.

---

## QA-006 (BB-221) — Strict-mode late-suite stall: the dev-signin 30/min rate limit exhausts itself (HIGH, test infra)

- **REAL:** yes — reproduced twice on `golden-baseline-1` (`927c0e1`).
  **REPRODUCIBLE:** deterministic — same three tests fail at positions
  15–17 in every full strict run (rematch-consent decline,
  friend-match chat, friend-match GR-007), all at dev-play-button → /play
  with the landing page showing "Dev sign-in is unavailable".
  **MATERIAL:** yes — the golden-baseline E2E gate is permanently red.
- **SEVERITY:** HIGH (test infrastructure; no product defect).
- **AREA:** dev auth rate limiting vs the E2E suite's request volume.
- **OWNER-CANDIDATE:** worker-1 (apps/api config, or the spec helpers).

**ROOT CAUSE (proven with instrumentation):** `POST /v1/auth/dev/signin`
is rate-limited to 30/minute (`apps/api/src/app.ts:94`). A full strict
suite makes **~49 signin calls** (measured: 30×200 + 19×204, every one
counting against the window). Requests #31+ return **429**. With the
suite's stable size and timing, the wall lands exactly in the last three
tests; each needs two pages, one page 429s, the test fails at the
`toHaveURL(/play/)` assertion. This also explains every observed
property: standalone/partial runs pass (<30 signins), positions are
stable across runs, all three fail at the same wall-clock moment
(measured 429 timestamps: 15:24:18.213, 15:24:18.939, 15:24:24.453Z
— one per failing test).

**EVIDENCE:** `.agents/qa/tools/instrumented-api.ts` (QA-lane temporary
API wrapper logging every signin with status/duration/timestamp); runs
`/tmp/qa-strict-run.log`, `/tmp/qa-strict-instr-run.log`,
`/tmp/qa-instr-api.log`. Repro recipe (L-010): e2e DB seeded with
overrides → full suite on 3100/4100 (or REUSE_SERVERS against the
instrumented stack) → observe 4 failed/12 passed.

**PROPOSED FIX (choose one; QA recommends #1):**
1. Dev-mode rate limit: the dev-signin route exists only behind
   `exposeDevAuth` (dev adapters only — never production). Bump or
   disable the cap in development (e.g., `max: 1000` when
   `NODE_ENV !== 'production'`, or env-driven `DEV_SIGNIN_RATE_LIMIT`).
   One-line change in `apps/api/src/app.ts`; production behavior
   unchanged. Owner: worker-1.
2. Spec-side identity reuse: sign in once per test FILE and inject
   `bb-dev-auth` via `addInitScript` instead of clicking dev-play-button
   per page (cuts ~49 signins to ~12). More churn; adds within-file
   active-match coupling risk (tests in one file run sequentially, so a
   leftover ACTIVE match could leak across tests in the same file).
   Owner: worker-1 (spec helpers).

**RECOMMENDED ACCEPTANCE TEST:** full strict suite ×2 consecutive runs
→ 0 rate-limit failures; signin 429 count = 0 (instrumented run).

---

## QA-007 (BB-221 follow-up) — insights-api spec fails on fixed-subject pollution (LOW, spec hygiene)

- **REAL:** yes. **REPRODUCIBLE:** intermittent — fails whenever a prior
  run left a completed match for the fixed subjects. **MATERIAL:** yes
  for the golden-baseline gate (flaky leg). **SEVERITY:** LOW.
- **AREA:** `apps/web/e2e/insights-api.spec.ts`.
- **OWNER-CANDIDATE:** worker-1.

**ROOT CAUSE:** the spec signs in as fixed subjects
`e2e_insights_buyer`/`e2e_insights_seller` and asserts
`GET /v1/me/insights` returns `{ profile: null }` before its match.
Completed matches persist in the e2e DB across runs, so on any non-clean
DB the pre-state already carries a profile (measured failure at 93 ms:
deep-equality on the polluted profile, `lastMatchEndedAt` from a prior
run). Unrelated to the rate limit (position 5, no 429s at that time).

**PROPOSED FIX:** unique subjects per run (e.g.,
`e2e_insights_buyer_${Date.now()}`) — one-line change. Owner: worker-1.

**RECOMMENDED ACCEPTANCE TEST:** run the spec twice back-to-back
against the same DB → both green.

---

---

## QA-008 (BB-232 re-check) — Dev-build-only overlay/banner clipping; production composition verified clean (LOW)

- **REAL:** yes, dev builds only. **REPRODUCIBLE:** deterministic in the
  dev environment. **MATERIAL:** low for production; material for the
  founder's dev-build screenshot reviews. **SEVERITY:** LOW.
- **AREA:** dev-auth banner layout; Next.js dev indicator overlay.
- **OWNER-CANDIDATE:** W2 (composition) / W1 (play-page dev banner).

**FINDINGS (measured, base `7da2480` + BB-232 `51a228c`):**
1. The dev-auth banner ("Auth not configured…", 32px, in-flow) pushes the
   live-match world 32px down: the desktop chat button's bottom edge sits
   at 908 vs the 900 viewport (8px clipped by default), and the LOW TIME
   warning row renders entirely below the fold (y 929–937) until the user
   scrolls. The world itself is exactly 900px tall — **production
   geometry fits the 1440×900 reference frame exactly** (BB-232's gate is
   correct for production).
2. The Next.js dev stale-version indicator overlay is fixed at the
   bottom-left and intercepts pointer events over the mobile chat button
   (390×844) — clicking it retries against the overlay. Dev artifact;
   production has no overlay.
3. INFO: transient Turbopack build error
   (`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`)
   after repeated dev-server boots — cleared by removing
   `apps/web/.next`. Environment flake, not a code defect.

**RECOMMENDATION:** render the dev-auth banner out-of-flow (fixed
overlay) so dev-build screenshots match the production frame; consider
dismissing/hiding the Next dev indicator for E2E runs.

**VERIFIED CLEAN (the BB-232 re-check contract):** `.agents/qa/tools/
specs/qa-composition.spec.ts` (2/2 PASS): every interaction control
(composer input, steppers, SEAL, menu, chat button, standing plaque)
within the production frame on both viewports; no horizontal scroll;
dossier disclosure expands (context + facts rendered) and collapses;
state-adaptive sheet — action zone disabled on the desktop waiting page,
CSS-hidden on the mobile waiting page; crossed state + hold-accept + full
deal complete on both viewports. Screenshots in
`.agents/qa/evidence/*-turn.png`, `*-dossier-expanded.png`,
`*-crossed.png`, `measure-*.png`.

---

## (Resolved, not product bugs — for the record)

- **hold-accept "accept seal vanishes after early release"** on baseline
  `c70a448` — root cause: old spec asserted on the second mover's stale
  pre-broadcast page. Fixed by W1-01 (`0aec467`), re-verified on `92a5e61`:
  seal survives early release on the true active page; full hold settles.
- **friend-match GR-007 flake** (one failure on `c70a448`) — duplicate
  direct-API probe raced the active-match lookup (status 0). W1-01 added
  diagnostics; deterministic 400 verified on `92a5e61` (battery + suite).
