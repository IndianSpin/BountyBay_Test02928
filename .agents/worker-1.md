# Worker 1 — domain / deterministic mechanics (DD track)

Session: `gameplay-depth-anti-stalling` · Branch: `w1-dd-mechanics` ·
Worktree: `~/projects/bay-w1` (one-time `pnpm install`; move there after
EM-01 message — the main checkout goes manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint (CURRENT TASK / STATUS / LATEST COMMIT / FILES / TESTS /
BLOCKERS / PRODUCT ASSUMPTIONS / NEXT STEP). Do not edit canonical
`docs/*` directly — propose doc changes here and the manager applies them
(D-6).

## Ownership
- `packages/domain`, `apps/api` (esp. `timeout-scheduler.ts`), `packages/db`
  prisma schema (changes need manager migration review), DD feature config
  in `packages/config`.
- Web (your slice files only): `use-hold.ts`, `match-actions.tsx`,
  `time-warning.tsx`, `layout.tsx` (fonts), E2E: `hold-accept.spec.ts`,
  `timeout.spec.ts`, `friend-match.spec.ts`, `canvas-checkpoint.spec.ts`.
- `globals.css`: only your `.lm-accept`, `.lm-walk__hold`,
  `.lm-confirm-sheet` sections (+ their reduced-motion entries). W2 owns
  the rest; cross-section needs → flag to manager.
- E2E infra: isolated `bounty_bay_e2e` DB (5433) + alt ports 3100/4100
  (D-4). Do not kill other sessions' dev servers on 3000/4000.

## CURRENT TASK — W1-01: acceptance slice follow-ups
1. `hold-accept.spec.ts` test 1 flake (`accept-button` not found post-
   settle): re-run on a quiet tree (no concurrent HMR) in your worktree;
   find root cause (timing/assertion) — no sleep-based fixes.
2. `timeout.spec.ts` `time-warning` testid missing: confirm whether W2's
   board/result changes removed DD time-tier rendering; GR-023 requires
   tiers visible. If W2's file is involved, flag to manager instead of
   editing it.
3. Remove debug artifacts you find in your files (W2 left debug logs in
   `use-hold.ts`/`match-actions.tsx` — if they're still there, remove
   them and note it).
Then update this file with results.

## NEXT STEP — W1-02: DD Phase 1 founder checkpoint
After W1-01 green: write the §39-style completion report (files, behavior,
tests, unresolved, ambiguities) here for the founder. DD-M2 (private
dossiers) starts only after founder sign-off (DEC-026).

## STATUS (from your last report, 2026-09-23 ~02:30)
ACCEPTANCE slice implemented end-to-end; unit 216 passed; db+api 51
passed; E2E 8/10 (the two items above). No commit of your own — your work
is inside baseline `f1e8c99`.

## BLOCKERS
- Awaiting EM-01 (worktree cut + this assignment).
- Ownership decisions above (W1-01 #2) — manager arbitrates.

## PRODUCT ASSUMPTIONS
None new; hold durations (600 ms accept / 1 s walk-away) from HO-Contracts;
haptics best-effort; time warnings remain required by GR-023 until a
canonical rule change says otherwise.
