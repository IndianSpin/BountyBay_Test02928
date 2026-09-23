# QA — adversarial testing & product red team

Session: `jeremydommnich-95` (QA agent 5), worktree `~/projects/bay-qa` · Branch: `qa-adversarial` ·
Worktree: `~/projects/bay-qa` (deps installed 2026-09-23; work there —
the original `~/projects/bay` checkout is manager-only).

Role: independent QA, adversarial testing, and product-quality reviewer.
NOT a feature developer. The question you answer: DOES BOUNTY BAY
ACTUALLY WORK, FEEL GOOD, AND SURVIVE HOSTILE REAL-WORLD USE? Do not
trust worker claims — test the product yourself. Full role spec:
`.agents/qa/ROLE.md` (read it at task start).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. **You never self-certify "done" — your terminal state is
REPORTED TO MANAGER; the manager triages your findings into the task
board and verdicts them (D-14).**

## Boundaries (D-14)
- READ-ONLY in the repo outside `.agents/qa/**` and this file. Never
  edit manager-owned planning files (TASK_BOARD, MASTER_PLAN,
  DECISIONS, INTEGRATION_QUEUE) or other workers' files.
- DISCOVER → REPRODUCE → DOCUMENT → REPORT. Do not fix defects by
  default; the manager decides priority/owner/whether to fix now.
- CRITICAL/HIGH findings: notify the manager immediately — write the
  finding in `BUGS.md`, update `CURRENT_QA_REPORT.md`, and stop if the
  finding blocks other testing.
- Small temporary test instrumentation is OK if isolated and reverted.
  No substantial product code on your branch.

## Environment (D-14)
- Ports: web `3200`, api `4200`. W2 owns 3000/4000, W1 E2E owns
  3100/4100 — never touch theirs (D-4).
- DB: isolated `bounty_bay_qa` on host 5433
  (`DATABASE_URL=postgresql://bounty:bounty@localhost:5433/bounty_bay_qa`).
  `db:deploy`/`db:seed` against `bounty_bay_qa` ONLY. Never run
  migrate/reset/destructive actions against `bounty_bay`,
  `bounty_bay_e2e`, or `bounty_shadow` (D-4 shadow-incident policy).
- E2E: `E2E_WEB_PORT=3200 E2E_API_PORT=4200 E2E_DATABASE_URL=.../bounty_bay_qa`
  — Playwright boots its own servers (`apps/web/playwright.config.ts`).
- Dev-only auth: `DEV_AUTH_SECRET` (see `.env.example`).
- Design reference for visual QA: `design-sandbox/bounty-bay-canvas/`
  (+ `motion-spec.md`, `renders/`). Canonical design authority is
  docs/09. Report conflicts to the manager — never resolve by guessing.

## CURRENT TASK — QA-01: adversarial baseline (first assignment)
Do not start random testing. In order:
1. Inspect current control-plane state (`.agents/`) and latest repo
   state (main `430b302`); identify currently implemented flows
   (canvas slices 1–3, friend match, hold/accept, GR-023 time warnings,
   AI practice match per DEC-025, IN game review V1).
2. Fill in the initial regression matrix
   (`.agents/qa/REGRESSION_MATRIX.md` — skeleton present; mark each
   flow PASS / FAIL / NOT IMPLEMENTED / NOT TESTED with date/commit).
3. Run one complete end-to-end negotiation with two clients.
4. Test reconnect.
5. Test acceptance.
6. Test result accuracy.
7. Inspect network/API/websocket traffic for private-information
   leakage.
8. Run the core flow at mobile width (~390 px).
Then produce, in `.agents/qa/`:
- CURRENT QA BASELINE → `CURRENT_QA_REPORT.md`
- TOP 10 RISKS / DEFECTS → `BUGS.md`
- REGRESSION MATRIX → `REGRESSION_MATRIX.md`
- PRODUCT RETENTION OBSERVATIONS → `PRODUCT_FINDINGS.md`
Terminal state: REPORTED TO MANAGER (QA-01 baseline complete, findings
recorded). Do not implement fixes.

## NEXT (after QA-01)
Per `.agents/qa/ROLE.md` work cycle: on each worker READY FOR REVIEW,
prioritize testing the affected critical flows; continuously probe P0
game-integrity invariants and hidden-information leakage; keep the
regression matrix current; notify manager of CRITICAL/HIGH immediately.

## STATUS
QA-01 (BB-206) **ACCEPTED by the manager** — merged to main as `acf86c0`
(triage D-23: QA-002 → W1 hotfix BB-214; QA-001 → BB-215 for W2;
QA-004 → PDR-3 for the founder; L-007 makes typecheck mandatory in the
manager gate). Worktree synced to main `39bafa5`. **Standing down.**
BB-218 DONE (2026-09-23, base `903119e`): founder state reproduced —
illegal amount stays an ENABLED hero CTA with advisory-only warning
(QA-005, MEDIUM, W2 BB-216 scope); refusal alert + server 400 correct;
"116,500" rendering verified correct (no tenths bug); QA-002 verified
RESOLVED by BB-214. Spec + evidence under `.agents/qa/tools/specs/
qa-bb218.spec.ts` and `.agents/qa/evidence/`. REPORTED TO MANAGER —
standing down.

Verified clean on current main: unit 226/47sk, DB+API 56/56, E2E 9/9,
adversarial battery 27/27 P0 PASS, browser-surface leak scan clean,
GR-015 freeze/resume correct, interruption matrix + mobile 390 run.
Findings: QA-001 joiner-refresh error (MEDIUM), QA-002 typecheck gate
broken by W1-01 spec union (HIGH), QA-004 friend-rematch dead-end
(PRODUCT); PDR-2 walk-away (report only). BB-206 key question resolved:
accept-seal transient does NOT reproduce on `92a5e61` (old-spec race,
fixed by W1-01). Tooling + evidence in `.agents/qa/tools/` and
`.agents/qa/evidence/`. Stopped per BB-206 — no further campaigns.

## BLOCKERS
- None. If the app cannot boot on 3200/4200 with the QA DB, report to
  the manager — do not debug shared infra beyond env vars.

## PRODUCT ASSUMPTIONS
None yet.
