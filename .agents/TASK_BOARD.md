# TASK BOARD — Bounty Bay

Every active task: ID, owner, branch, scope, files, dependencies,
acceptance. No task has two owners. Workers update their worker file at
task start/end; manager updates this board.

**Quality authority:** workers never self-certify. Their terminal state is
READY FOR REVIEW; the manager returns ACCEPT / REWORK / BLOCK with
evidence. Only ACCEPTed work merges to main.

## IN PROGRESS

| ID | Owner | Task | Branch | Scope / files | Deps | Acceptance |
|---|---|---|---|---|---|---|
| W1-01 | worker-1 | Acceptance slice follow-ups | w1-dd-mechanics | `use-hold.ts`, `match-actions.tsx`, `time-warning.tsx`, `layout.tsx`, `hold-accept.spec.ts`, `timeout.spec.ts`, `friend-match.spec.ts`, `canvas-checkpoint.spec.ts` | — | ACCEPTED + merged (bbf318e): manager-verified unit green, 6/6 changed E2E specs; deterministic first-actor fix, no sleeps |
| W2-02 | worker-2 | IN handoff checkpoint (no code) | w2-frontend-design | statement + testing instructions in worker-2.md | — | CLOSED: ACCEPTed (782e1d8), W3 CONFIRMED no rejections (c70a448, merged 430b302) |
| W2-03 | worker-2 | Structural CSS split (planned, NOT started) | w2-frontend-design | split `globals.css` into per-area modules at next safe checkpoint | Founder approves canvas slices | Selector-level shared ownership eliminated before multi-agent UI work resumes |
| W1-03 | worker-1 | API timeline wiring (D-11) | w1-dd-mechanics | serve IN-2 timeline via `apps/api/src/match-routes.ts` | IN-2 ACCEPTed | ACCEPTED + merged (0c45f0c): manager-verified 4/4 API tests on isolated DB; docs/08 updated by manager |
| W3-01 | worker-3 | IN takeover + IN-2 Game Review V1 | w3-intelligence | inspect + verify IN-1 (baseline), implement timeline + review envelope, checkpoint report | W2-02 (interim D-10) | ACCEPTED and merged — 44/44 tests, typecheck clean, no contract changes |
| QA-01 | qa | Adversarial baseline (D-14) | qa-adversarial | role spec `.agents/qa/ROLE.md`: two-client E2E, reconnect, acceptance, result accuracy, leakage inspection, mobile ~390 px | main `8be2347` | Baseline artifacts in `.agents/qa/` (CURRENT_QA_REPORT, BUGS top-10, REGRESSION_MATRIX, PRODUCT_FINDINGS); CRITICAL/HIGH notified immediately; terminal state REPORTED TO MANAGER |
| DATA-01 | data | Measurement-gap + release checklist (D-15) | data-analytics | read-only inspection; docs/11 vs north-star metrics; emit `.agents/data/MEASUREMENT_GAP.md` + `RELEASE_CHECKLIST.md` | — | Gap table (metric → measured → smallest sufficient addition); release gate draft; REPORTED TO MANAGER; no code/instrumentation changes |

## READY FOR REVIEW

| ID | Owner | Task | Notes |
|---|---|---|---|
| CANVAS-REVIEW | founder | Canvas slices 1–3 (LIVE MATCH, ACCEPTANCE, RESULT REVEAL) | W2 restricted to handoff/cleanup/regressions/screenshots until verdict. Screenshots in `design-sandbox/screenshots/`; testing instructions owed from W2 |
| W1-02 | worker-1 | DD Phase 1 founder checkpoint report | after W1-01 ACCEPT |
| IN-2-REVIEW | worker-3 | IN-2 Game Review V1 checkpoint report | after W3-01 |

## BLOCKED
- DD-M2..M7: DEC-026 phase gates.
- IN-3+: founder checkpoint after IN-2.
- DEC-030 implementation: not scheduled (direction only).
- W2-03 CSS split: founder slice approval first.

## ACCEPTED (merged to main or manager-verified)
- `f1e8c99` baseline (verified: typecheck clean, 216 unit passed; audit
  clean except TD-1).
- Control plane commits (`1bb81bf`, `f0d8b7e`).
- DEC-030 + docs/22 + docs/14 OQ-008 note (canonical direction record,
  no implementation).
- **W3-01 IN-2 Game Review V1** — ACCEPT, merged to main (IN-2 review
  pending founder checkpoint; timeline API wiring deferred to W1-03).

## DONE (manager-verified, pre-protocol)
- P1-M1 AI practice (DEC-025).
- DD Phase 1 anti-stalling (DEC-027).
- Canvas slices 1–3 shipped by W2 — now READY FOR FOUNDER REVIEW (not
  accepted).

## BACKLOG
- DEC-030 negotiation agent implementation (unscheduled).
- TD-1 remove `apps/web/debug-reveal.tmp.mjs`.
- TD-3 `deal-table.tsx` dead component on disk, not rendered (W2).
- Analytics platform (P1-M9), founder tooling UIs, Daily Deal (gated),
  voice (DD-M5, deferred), spectators/replay (DD-M7, deferred).
