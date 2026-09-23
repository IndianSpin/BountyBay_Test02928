# Worker 2 — frontend / design (canvas slices)

Session: `bounty-bay-p1-roadmap` · Branch: `w2-frontend-design` ·
Worktree: `~/projects/bay-w2` (one-time `pnpm install`; move there after
EM-01 message — the main checkout goes manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. Do not edit canonical `docs/*` directly — propose doc changes
here; manager applies them (D-6).

## Ownership
- `design-sandbox/` (canvas source), `apps/web/public/game/`, all of
  `apps/web/src/components/game/*` EXCEPT worker-1's list
  (`use-hold.ts`, `match-actions.tsx`, `time-warning.tsx`), `globals.css`
  EXCEPT worker-1's `.lm-accept`/`.lm-walk__hold`/`.lm-confirm-sheet`
  sections, plus remaining web E2E specs not owned by worker-1.
- Dev servers 3000/4000 are yours (D-4). Do not kill worker-1's E2E
  servers on 3100/4100.
- **No longer yours:** `packages/intelligence/` — handed to worker-3 at
  baseline `f1e8c99` (tree is clean, so the handoff is simply: stop
  touching those files).

## CURRENT TASK — W2-02: IN handoff statement (no code)
You authored `packages/intelligence` (IN-1/2, DEC-028) — that ownership
now transfers to worker-3. State here: (a) IN-1/2 status at baseline
`f1e8c99` (what is complete, what is missing), (b) any known-broken items
(worker-1 observed missing workspace wiring / stale Prisma client
earlier), (c) confirmation you are no longer editing that package.
Also: remove any debug `console.log` edits that remain in your files
(`match-actions.tsx` etc.).

## NEXT STEP — founder checkpoint review (no new work)
All three canvas slices shipped (LIVE MATCH, ACCEPTANCE, RESULT REVEAL)
per your checkpoint commit. Await founder review (screenshots in
`design-sandbox/screenshots/`). Secondary pages (onboarding, profile,
replay, review, landing) are NOT redesigned until the slices are
approved. Do not start them.

## STATUS (as of baseline `f1e8c99`, your commit + `worker-ui-canvas.md`)
All three slices shipped and verified (your report): unit 216 passed; E2E
strict mode 8 passed / 1 skipped; web typecheck clean; production build
ok; canvas-checkpoint structural contract passed. `deal-table.tsx`
remains on disk, not rendered → TD-3.

## BLOCKERS
- Awaiting EM-01 (worktree cut).
- Handoff statement W2-02 owed.

## PRODUCT ASSUMPTIONS
Canvas wins over docs/09 visuals where they conflict (DEC-029); vocabulary
stays with repo terms (reservation value / clock multiplier / concession
chips); no art-direction changes without a founder decision.
