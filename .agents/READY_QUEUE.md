# READY QUEUE — dependency-aware

Manager asks: what can run in parallel without creating rework — NOT how
to keep every terminal busy. Workers pull from their inbox
(`~/projects/bounty-control/inbox/<role>.md`); this file is the
manager's dependency planning. Every row: task, owner, dependencies,
why-ready. 1–2 pre-specified READY tasks per worker target.

## READY now

| Task | Owner | Dependencies | Note |
|---|---|---|---|
| BB-201 CSS structural split (W2-03) | worker-2 | Canvas verdict APPROVED (D-18) | `globals.css` → per-area modules before multi-agent UI work |
| BB-202 Secondary-page canvas treatment (onboarding, profile, replay, review, landing) | worker-2 | BB-201, DESIGN_ACCEPTANCE.md | After founder canvas verdict; slice-order per DEC-029 |
| BB-203 Timeline API wiring (W1-03) | worker-1 | none (IN-2 ACCEPTed) | IN PROGRESS |
| BB-211 Playwright fail-safe default DB | worker-1 | after BB-203 | Bare E2E must refuse or default to the e2e DB — never the dev DB (D-20) |
| BB-212 node_modules install bay-w2 + verify others | sixth | none | W2 blocked on BB-201 until done (D-20) |
| BB-204 DD-M2 private dossiers | worker-1 | Founder DD Phase 1 sign-off | Contract needed (PDR list) |
| BB-205 IN-3 longitudinal profile | worker-3 | Founder IN-2 sign-off | docs/18 §9 |
| BB-206 QA-01 completion + MATCH STATE INTERRUPTION matrix | qa | current main | In progress |
| BB-207 DA-P1 analytics foundation (env/release tags, error handler) | data | Manager scheduling + ownership rulings | From FOUNDATION_PLANS.md — NOT scheduled |

## Sequenced behind (examples — not commitments)
- BB-208 QA regression pass: after BB-203 + BB-201 integrated.
- Experiment/product work: only with a PRODUCT HYPOTHESIS (founder
  directive §13) — none approved yet.

## Integration window plan
Current window: BB-203 + BB-201 → manager review → QA if required →
integration batch → full regression → GOLDEN BASELINE. Workers then
rebase onto the golden baseline (D-16).
