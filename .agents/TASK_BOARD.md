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
| W2-03 (BB-201) | worker-2 | CSS structural split — PAUSED (D-24) | w2-frontend-design | checkpoint uncommitted work; superseded by BB-216 | — | Fold into BB-216's structural discipline |
| BB-216 | worker-2 | Live-match composition redesign | w2-frontend-design | founder feedback file + DESIGN_ACCEPTANCE §live-match; ~5 objects, character-first, one language | none | Founder review gates this one (D-24) |
| W1-03 | worker-1 | API timeline wiring (D-11) | w1-dd-mechanics | serve IN-2 timeline via `apps/api/src/match-routes.ts` | IN-2 ACCEPTed | ACCEPTED + merged (0c45f0c): manager-verified 4/4 API tests on isolated DB; docs/08 updated by manager |
| BB-205 | worker-3 | IN-3 longitudinal profile | w3-intelligence | profile 0.1.0 + coaching-state 0.1.0, pure engine | IN-2 ACCEPTed | ACCEPTED + merged (f26c7f6): 56/56 intel tests, packages typecheck clean; API wiring → BB-220 (W1) |
| BB-206 | qa | QA-01 adversarial baseline + re-verify | qa-adversarial | full matrix + interruption matrix on main `92a5e61` | — | ACCEPTED (merged acf86c0): baseline clean; findings QA-001/002/004 triaged below |
| BB-214 | worker-1 | Typecheck hotfix (QA-002 HIGH) | w1-dd-mechanics | union narrowing in friend-match spec | — | ACCEPTED (in 787aa86): repo-wide typecheck exit 0 |
| BB-217 | worker-1 | Item-10 domain answer + turn-structure check | w1-dd-mechanics | offer-110 legality, formatter path, GR-013/GR-014 | — | ACCEPTED (in 787aa86): answers recorded in D-27 |
| BB-204 | worker-1 | DD-M2 private dossiers (GR-028) | w1-dd-mechanics | schema+migration, validateDossierFacts, role-scoped serialization, seeded dossiers, Dossier component (unwired) | — | ACCEPTED (in 787aa86): 2 REWORK rounds, gate green; W2 wires in BB-213 |
| BB-218 | qa | Item-10 state re-verify (after BB-217) | qa-adversarial | reproduce screenshot state; API-level probe of offer 110; tenths-formatting check | BB-217 | Findings in .agents/qa/BUGS.md; REPORTED TO MANAGER |
| BB-215 | worker-2 | Joiner refresh recovery (QA-001 MEDIUM) | w2-frontend-design | join route → match URL / redirect participants to resume | BB-216 | QA-001 acceptance test: reload on share URL → live board, no alert, no dup events |
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
- TD-3 CLOSED (deal-table.tsx removed by BB-216).
- TD-4 BB-216 deviations: stand-in v4 pose + missing rig in-betweens (future asset work).
- Analytics platform (P1-M9), founder tooling UIs, Daily Deal (gated),
  voice (DD-M5, deferred), spectators/replay (DD-M7, deferred).
