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
