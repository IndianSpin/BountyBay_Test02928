# INTEGRATION QUEUE — Bounty Bay

Every candidate merge: task, branch, commit, dependencies, test status,
conflict risk, doc changes, migration, recommended order. Order follows
dependencies, never completion time.

## Standing rules
- Main receives reviewed changes only. Manager verifies (does not take a
  worker's word for green tests).
- DB migrations: manager review before merge; no destructive actions
  against non-disposable DBs (D-4).
- Canonical doc changes ride with their code or via manager (D-6).

## IQ-1 — Baseline `f1e8c99` (already on main)
- **Status:** accepted provisionally (D-1); audit done; verification =
  EM-01 (in progress).
- **Known issue:** `apps/web/debug-reveal.tmp.mjs` committed → TD-1,
  removed in the first reviewed cleanup commit.

## IQ-2 — W1 acceptance fixes (branch `w1-dd-mechanics`)
- Depends on: EM-01 (worktree ready).
- Tests: full web E2E suite incl. `hold-accept` (flake-free re-run) and
  `timeout` (time-warning visible, GR-023).
- Conflict risk: `globals.css` shared with W2 (W1 limited to its own
  `.lm-*` sections); `match-actions.tsx` — if W2 touches it, flag
  immediately.
- Doc changes: none expected (GR-023/GR-024 already canonical).
- Migration: none.
- **Recommended merge order: 1** (smallest, stabilizes E2E).

## IQ-3 — W3 IN-2 Game Review V1 (branch `w3-intelligence`)
- Depends on: W2-02 handoff, EM-01, founder checkpoint after IN-2.
- Tests: packages/intelligence unit + property tests; db+api suite if
  touched; typecheck of consumers.
- Conflict risk: packages/db prisma models if IN-2 persists review data
  (schema change → manager review).
- Doc changes: docs/18 already canonical for IN-2; deviations recorded.
- Migration: possible (review data) — manager review required.
- **Recommended merge order: 2.**

## IQ-4 — W2 RESULT REVEAL slice (branch `w2-frontend-design`)
- Depends on: EM-01, W2-01 done.
- Tests: slice E2E + screenshots + deviation list per DEC-029; existing
  E2E must stay green (testids preserved).
- Conflict risk: `globals.css` (W2 owns; W1 sections untouched);
  result-reveal components vs W1 acceptance components — separate files.
- Doc changes: docs/21 implementation map update (manager applies).
- Migration: none.
- **Recommended merge order: 3.**

## Later (unsequenced)
- DD-M2 dossiers (W1) — after founder checkpoint (W1-02).
- P1-M2 rating — after IN checkpoint.
- PDR-1 negotiation agent — pending founder decision.
