# QA — adversarial testing & product red team

Session: founder-launched Claude session in `~/projects/bay-qa` (not yet
named — update this line when launched) · Branch: `qa-adversarial` ·
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
QA-01 assigned by manager 2026-09-23 (D-14). Not started.

## BLOCKERS
- None. If the app cannot boot on 3200/4200 with the QA DB, report to
  the manager — do not debug shared infra beyond env vars.

## PRODUCT ASSUMPTIONS
None yet.
