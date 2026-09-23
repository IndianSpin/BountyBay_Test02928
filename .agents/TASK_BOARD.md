# TASK BOARD — Bounty Bay

Every active task: ID, owner, branch, scope, files, dependencies, acceptance.
No task has two owners. Workers update their own worker file at task
start/end; manager updates this board.

## IN PROGRESS

| ID | Owner | Task | Branch | Scope / files | Deps | Acceptance |
|---|---|---|---|---|---|---|
| EM-01 | manager | Baseline verification + worktree setup | main | audit `f1e8c99` (done: no secrets; 1 tmp file TD-1), full typecheck+unit+E2E smoke, cut `w1-*`/`w2-*`/`w3-*` branches + worktrees | — | Tests green on baseline; workers moved |
| W1-01 | worker-1 | Acceptance slice follow-ups | w1-dd-mechanics | `use-hold.ts`, `match-actions.tsx`, `time-warning.tsx`, `layout.tsx`, `hold-accept.spec.ts`, `timeout.spec.ts`, `friend-match.spec.ts`, `canvas-checkpoint.spec.ts` | EM-01 | 10/10 E2E incl. time-warning; flake fixed w/ quiet re-run; GR-023 tiers visible |
| W1-02 | worker-1 | DD Phase 1 founder checkpoint report | w1-dd-mechanics | report only | W1-01 | Founder sign-off to proceed to DD-M2 |
| W2-02 | worker-2 | IN handoff to worker-3 | (no code) | `packages/intelligence` (W2 authored it) state = baseline `f1e8c99`, tree clean | EM-01 | W3 confirms takeover; W2 stops touching `packages/intelligence`; debug logs removed |
| W3-01 | worker-3 | IN-1 verify + complete IN-2 Game Review V1 | w3-intelligence | `packages/intelligence`, docs/19, docs/20 | EM-01; W2-02 | IN-1 green; IN-2 per docs/18 §3 (deterministic review w/o LLM); founder checkpoint report |

## READY
- EM-02: draft DEC-030 + docs/22 for PDR-1 (negotiation agent) — manager, docs-only, after founder confirms.
- DD-M2 private dossiers (worker-1) — gated on W1-02 founder checkpoint.
- P1-M2 bounty rating — after IN checkpoint per docs/16 sequencing.

## BLOCKED
- DD-M2..M7: DEC-026 phase gates.
- IN-2+ extra scope: founder checkpoint after IN-2.
- PDR-1 implementation: founder decision (DECISIONS.md).

## IN REVIEW
- `f1e8c99` baseline (EM-01): audit done; test verification running.

## READY TO MERGE
- (none yet — merge order: W1 → W3 → W2)

## DONE
- P1-M1 AI practice (DEC-025).
- DD Phase 1 anti-stalling (DEC-027).
- Canvas slices 1–3: LIVE MATCH, ACCEPTANCE, RESULT REVEAL (W2; awaiting
  founder checkpoint review — screenshots in `design-sandbox/screenshots/`).

## BACKLOG
- Negotiation agent architecture (PDR-1).
- TD-1 remove `apps/web/debug-reveal.tmp.mjs` from repo.
- TD-2 `worker-dommnich.md` superseded by `worker-1.md` (delete).
- TD-3 `deal-table.tsx` dead component on disk, not rendered (W2) — remove
  or wire in, founder-visible only after slice checkpoint.
- Analytics platform (P1-M9), founder tooling UIs, Daily Deal (gated), voice
  (DD-M5, deferred), spectators/replay (DD-M7, deferred).
