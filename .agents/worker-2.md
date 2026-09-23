# Worker 2 — frontend / design (canvas slices)

Session: `bounty-bay-p1-roadmap` · Branch: `w2-frontend-design` ·
Worktree: `~/projects/bay-w2` (one-time `pnpm install`; work there — the
original `~/projects/bay` checkout is manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. Do not edit canonical `docs/*` directly — propose doc changes
here; manager applies them (D-6). **You never self-certify "done" — your
terminal state is READY FOR REVIEW; the manager returns ACCEPT / REWORK /
BLOCK (D-8).**

## Founder scope restriction (correction 3) — in force until canvas
## verdict
Your canvas slices are **READY FOR FOUNDER REVIEW — NOT accepted.** Do
not propagate the visual language to additional screens. You may only:
1. prepare the IN handoff (below);
2. clean obvious debug logging;
3. fix regressions;
4. provide screenshots and testing instructions.
**No new UI feature work.** Secondary pages stay untouched.

## Ownership
- `design-sandbox/` (canvas source), `apps/web/public/game/`, all of
  `apps/web/src/components/game/*` EXCEPT worker-1's list
  (`use-hold.ts`, `match-actions.tsx`, `time-warning.tsx`), `globals.css`
  EXCEPT worker-1's `.lm-accept`/`.lm-walk__hold`/`.lm-confirm-sheet`
  sections (selector-level split is temporary — structural CSS split is
  planned as W2-03 at the next safe checkpoint; see TASK_BOARD).
- Dev servers 3000/4000 are yours (D-4). Do not kill worker-1's E2E
  servers on 3100/4100.
- **No longer yours:** `packages/intelligence/` — handing to worker-3.

## CURRENT TASK — W2-02: IN handoff checkpoint (founder correction 1)
Do NOT let worker-3 rebuild IN-1 if your work is valid. Execute:
1. `git status` in both `~/projects/bay` (should be clean, manager-only)
   and your worktree; commit any of your own uncommitted
   `packages/intelligence` work to your branch as a clean handoff
   checkpoint.
2. Record in this file: (a) **exact commit hash** of the handoff; (b)
   what is complete, partial, temporary, and untested; (c) list of
   relevant files and tests.
3. Confirm here that you are no longer editing that package.
Also: remove leftover debug `console.log` edits in your files; provide
screenshots + testing instructions for the founder canvas review
(screenshots already in `design-sandbox/screenshots/` — document how to
run the E2E strict/reuse modes).

## NEXT (after founder canvas verdict)
- W2-03: structural CSS split (`globals.css` → per-area modules) at the
  next safe checkpoint — do not start before the verdict and do not do a
  large refactor that risks the checkpoint.

## STATUS (as of baseline `f1e8c99`, your report)
All three slices shipped: unit 216 passed; E2E strict mode 8 passed / 1
skipped; web typecheck clean; production build ok; canvas-checkpoint
structural contract passed. `deal-table.tsx` remains on disk, not
rendered → TD-3.

## BLOCKERS
- None that block the handoff; canvas verdict is the founder's.

## PRODUCT ASSUMPTIONS
Canvas is design authority (founder directive); domain stays game-rule
authority; no rules changed for visuals. Repo vocabulary (Reservation
value / Clock multiplier / Concession chips) replaces canvas mockup
labels. Rating numbers omitted (no rating system — P1-M2); unrated tag
used.

## W2-02 — IN HANDOFF STATEMENT (packages/intelligence → worker-3)

Authored by me at baseline `f1e8c99`; already committed and merged
forward into this branch — **no new commit is needed from me for the
handoff itself**; this statement is the record. I confirm I am no longer
editing `packages/intelligence/`; ownership transfers to worker-3.

**Complete (authored, tested green at baseline):**
- `packages/intelligence/src/types.ts` — versioned types (`feature-engine-0.1.0`, `observation-engine-0.1.0`), `BehaviorFeatures` (~60 features), `MatchObservation`, `ObservationThresholds` + defaults.
- `src/features.ts` — pure deterministic feature engine over (MatchState, DomainEvent[], EconomyConfig): `classifyMoves` (per-move classification: magnitudes, per-turn active time with pause-span subtraction, unreciprocated flags, pitch proximity), `computeFeatures`, `finalDecisionMs`, `ownDisconnectSpans`.
- `src/observations.ts` — 26 deterministic observation rules (docs/20) with measurements + eventRefs.
- `src/curate.ts` — `curateReview`: RESULT-first, priority order, cap 5, outcome-aware dedup, fixed L1-only copy (`review-curation-0.1.0`).
- Persistence: migration `intelligence_analysis` (`match_features`, `match_observations`), `persistAnalysis` computed atomically in the terminal command's transaction (`command-service.ts`), `loadAnalysis`, `scripts/backfill-analysis.ts` (idempotent).
- API: `GET /v1/matches/:matchId/review` (participant-only, terminal-only, caller-scoped; `moments` + `curationVersion`), `POST /v1/analytics/event` (`review_opened`/`review_step_viewed`, stdout sink).
- Web: `/review/[matchId]` page (moments + linked timeline), ANALYZE DEAL on the result card, `review-flow.spec.ts`.
- Docs: `docs/18_NEGOTIATION_INTELLIGENCE.md`, `docs/19_BEHAVIOR_FEATURE_DEFINITIONS.md`, `docs/20_OBSERVATION_DEFINITIONS.md`, DEC-028, review contract in docs/08, IN track in docs/16.
- Tests: `packages/intelligence/tests/{helpers,features,observations,features.property,curate}.test.ts` (28 at baseline) + DB/API additions (56 DB+API tests green at baseline).

**Partial / deferred by design (not defects):**
- IN-3..IN-8 (longitudinal, knowledge base, RAG/coach, practice, improvement tracking, benchmarks) — not started, per the phase gate.
- `opponentRating` is always null (no rating system — P1-M2).
- `VERIFIED_INFORMATION_USE` / `AGREEMENT_AFTER_VERIFIED_REVEAL` marked NEEDS DEFINITION (depend on GR-028 dossiers, DD-M3/M4).
- Unreciprocated-concession family is structurally unreachable under current strict turn alternation; detectors are rigorous and synthetic-tested, documented in docs/20 (fires when hold/communication or async mechanics ship).

**Temporary:**
- Feature/observation/curation thresholds are code constants with version strings; a DB-row tuning story is recorded (docs/16/18) — no DB config table yet.
- `scripts/backfill-analysis.ts` is a one-shot idempotent tool, not a scheduled job.

**Known-broken / environment notes at baseline (all transient, resolved):**
- Stale Prisma client after the schema change was fixed with `prisma generate` (the client is not auto-regenerated by `migrate dev` in this setup).
- `timeout.spec.ts` requires strict-mode seed overrides (see below).
- Review page mobile polish deferred to the IN-2 UI checkpoint.

## FOUNDER CANVAS REVIEW — testing instructions

Screenshots: `design-sandbox/screenshots/` (`board-LMR-*` authority + `live-match-desktop-{mine,theirs,crossed}`, `live-match-mobile`, `acceptance-crossed-seal`, `reveal-final-{deal,nodeal}`, plus `in2-*` review shots).

Run the app (ports 3000/4000 are worker-2's; do not touch worker-1's 3100/4100):
```
pnpm install                      # one-time, from ~/projects/bay-w2
pnpm dev                          # web:3000 + api:4000
```
Play: http://localhost:3000/ → PLAY → pick a persona → Ready → negotiate.

E2E — reuse mode (against the running dev stack):
```
cd apps/web && E2E_REUSE_SERVERS=1 npx playwright test
```
E2E — strict mode (self-booted servers; seed the short timeout overrides first, stop any dev servers on 3000/4000):
```
E2E_HARD_LIMIT_MS=45000 E2E_WARN_LOW_MS=30000 E2E_WARN_CRITICAL_MS=10000 pnpm --filter @bounty-bay/db db:seed
cd apps/web && E2E_HARD_LIMIT_MS=45000 E2E_WARN_LOW_MS=30000 E2E_WARN_CRITICAL_MS=10000 npx playwright test
pnpm --filter @bounty-bay/db db:seed   # afterwards: restore default 90s limits
```
Canvas structural checkpoint (captures boards + live screen to `test-results/canvas/`):
```
cd apps/web && CAPTURE_CANVAS=1 E2E_REUSE_SERVERS=1 npx playwright test e2e/canvas-checkpoint.spec.ts
```
Unit/typecheck/build: `npx vitest run` · `pnpm typecheck` · `npx next build` (web).

## STATUS (W2-02 done)
Handoff statement above; debug `console.log` instrumentation confirmed removed (grep clean across `apps/web/src/components/game/*` and `apps/web/src/app/play/*`). No new UI work until the founder checkpoint verdict.
