# Worker 3 — analytics / coaching / content infrastructure (IN track)

Session: `jeremydommnich-c7` · Branch: `w3-intelligence` · Worktree:
`~/projects/bay-w3` (one-time `pnpm install`; work there — the original
`~/projects/bay` checkout is manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. You own docs/19 and docs/20 as working specs; any change to a
canonical rule elsewhere must be proposed here, not applied (D-6).
**You never self-certify "done" — your terminal state is READY FOR
REVIEW; the manager returns ACCEPT / REWORK / BLOCK (D-8).**

## Ownership
- `packages/intelligence/**` — via handoff from worker-2 (below), not via
  re-creation.
- docs/19, docs/20. Proposed edits to docs/18 go through the manager.
- Typecheck/lint of the intelligence package and any package it consumes
  (domain, config, contracts) — flag breakage in others' files, don't fix
  them silently.

## CURRENT TASK — W3-01: IN takeover (founder correction 1)
**Do not recreate IN-1 from baseline if worker-2 already has valid
work.** Process:
1. Wait for worker-2's handoff: exact commit hash + complete/partial/
   temporary/untested list, recorded in worker-2.md (W2-02).
2. `git status` in both `~/projects/bay` (manager-only) and your
   worktree, then inspect that commit (`git show <hash>`, read the
   intelligence src + tests).
3. Either **branch from / cherry-pick that exact work**, or **explicitly
   reject parts of it with reasons** — record your decision in this file.
4. Run the intelligence unit/property tests + typecheck on the taken-over
   state; report green/broken here (including any broken wiring inherited
   from the previous owner: missing workspace wiring, unregenerated
   Prisma client, db typecheck/lint failures).
5. Finish IN-1 only where tests show gaps. Do not rewrite what is green.
6. Implement IN-2: Game Review V1 per docs/18 §3 — deterministic, 1–5
   meaningful moments, references actual events, works fully without the
   coaching service.
7. Terminal state: READY FOR REVIEW with a founder checkpoint report in
   this file. Do not auto-continue to IN-3.

## NEXT (after IN-2 founder checkpoint)
IN-3 longitudinal profile. Note: DEC-030's "persistent adaptation"
reuses your longitudinal profile — but DEC-030 implementation is
unscheduled; do not build toward it (direction only).

## STATUS
Idle; waiting on worker-2's handoff hash (as of 2026-09-23 02:55).

## BLOCKERS
- W2-02 handoff commit not yet recorded.

## PRODUCT ASSUMPTIONS
None yet. Record any here before building on them.
