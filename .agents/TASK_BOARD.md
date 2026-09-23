# TASK BOARD — Bounty Bay

Every active task: ID, owner, branch, scope, files, dependencies,
acceptance. No task has two owners. Workers update their worker file at
task start/end; manager updates this board.

**Quality authority:** workers never self-certify. Their terminal state is
READY FOR REVIEW; the manager returns ACCEPT / REWORK / BLOCK with
evidence. Only ACCEPTed work merges to main. Manager gate includes
`pnpm -r run typecheck` on the merged result (L-007).

## IN PROGRESS

| ID | Owner | Task | Deps | Status |
|---|---|---|---|---|
| BB-213 | worker-2 | Dossier wiring (one-line board insertion) | BB-216 merged | Queued — inbox contract |
| BB-215 | worker-2 | Joiner refresh recovery (QA-001) | BB-213 | Queued |
| BB-219b | worker-2 | Rematch UI (PDR-3) | BB-215, BB-219a merged | Queued |

## READY FOR REVIEW
- (none — BB-216 was the last; founder approved.)

## BLOCKED (founder gates)
- DD-M3 (verified reveals): DEC-026 phase gate — needs founder DD-M2 sign-off.
- IN-4 (knowledge system): needs founder IN-3 sign-off.
- DEC-030 negotiation agent: not scheduled (direction only).
- TD-4 assets: v4 pose + rig in-betweens — needs founder asset export.

## ACCEPTED (merged; manager-gate verified)
- W1-01 E2E determinism · W3-01 IN-2 · BB-211 playwright fail-safe ·
  BB-214 hotfix · BB-217 item-10 answers · BB-204 DD-M2 dossiers ·
  BB-219a rematch API · BB-220 Insights API · BB-205 IN-3 profile ·
  BB-206 QA-01 baseline · BB-218 item-10 probe · BB-210 env matrix ·
  BB-212 deps install · BB-216 composition+chat (founder approved,
  `5935792`) · DATA-01 measurement gap · canvas v2 export · baseline
  `f1e8c99` + control plane v1–v3.

## DONE / CLOSED
- P1-M1 · DD Phase 1 (anti-stalling, founder sign-off) · canvas slices
  1–3 (founder approved) · IN-1/IN-2 (IN-2 founder sign-off) · W2-02
  handoff · BB-201 (folded into BB-216) · TD-1 · TD-3.

## BACKLOG
- DEC-030 negotiation agent (unscheduled).
- TD-4 asset deviations (above).
- Lint debt: QA tools (8) → QA next task; W2 components (chat-panel /
  resource-hud / result-reveal) → folded into BB-213 cycle.
- RETRO-001 action: lint-clean per package before READY FOR REVIEW
  (proposed for AGENTS.md).
- Analytics platform (P1-M9), founder tooling UIs, Daily Deal (gated),
  voice (DD-M5 deferred), spectators/replay (DD-M7 deferred), DA-P1
  analytics foundation (Data, unscheduled).
