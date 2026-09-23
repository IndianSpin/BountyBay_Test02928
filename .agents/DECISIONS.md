# DECISIONS — Bounty Bay (coordination records)

Product decisions requiring the founder are marked **PRODUCT DECISION
REQUIRED**. Canonical records of adopted decisions live in
`docs/12_DECISION_LOG.md`; this file is the manager's working record.

## PDR-1 — RESOLVED: Negotiation-agent architecture approved as direction (DEC-030)

**Founder decision (2026-09-23, correction 6):** the deeper negotiation
agent is approved as future product direction. Recorded as **DEC-030**
(canonical, docs/12) + **docs/22** (canonical design direction). DO NOT
IMPLEMENT until scheduled (not before IN-2 checkpoint + DD Phase 1
sign-off). The five DEC-025 personas are the provisional early
implementation and are treated as such; no persona code is deleted until
the agent work is actually scheduled. OQ-008 note updated in docs/14.
Nothing was changed in code; docs/12, docs/14, docs/22 updated by the
manager (D-6).

## D-1 — Baseline commit accepted provisionally

`f1e8c99` "Initial baseline" (589 files, all workstreams) on main is
accepted as the repository baseline. Audit: only `.env.example` files
committed (no secrets); one temp file slipped in → TD-1. Verification
(manager, 2026-09-23 02:45): per-package typecheck exit 0; unit suite
216 passed / 47 skipped. DB (51) + E2E (8/10) were worker-reported;
E2E follow-ups are W1-01. Result: baseline verified.

## D-2 — Worker mapping (2026-09-23)

- **worker-1** = session `gameplay-depth-anti-stalling` — DD track:
  domain, mechanics, API, acceptance-slice files (ownership table in
  worker-1.md).
- **worker-2** = session `bounty-bay-p1-roadmap` — frontend/design:
  canvas slices, board/result, `globals.css`, `design-sandbox`. Also
  authored IN-1/2 (`packages/intelligence`, DEC-028); that ownership
  transfers to worker-3 at baseline (handoff statement W2-02 owed).
- **worker-3** = session `jeremydommnich-c7` — IN track: analytics,
  coaching, content infrastructure; `packages/intelligence`, docs/19–20.

## D-3 — Sequencing conflict (open with founder)

docs/16 says IN starts after P1-M1 and "the DD track resumes after";
DEC-026 says DD runs after P1-M1 — both claim the same slot. IN-2 absorbs
DD-M7 (no-deal analysis, DEC-028). Current operating order: IN-1/2 (in
flight) → DD-M2..M6 → IN-2+ features needing DD-M3/M4/M5. Not silently
resolved; founder to confirm at next checkpoint.

## D-4 — Ports and database safety

W2 owns dev servers 3000/4000. W1 E2E uses alt ports 3100/4100 with the
isolated `bounty_bay_e2e` DB (5433, seed overrides `E2E_*`). Dev DB (5432)
shared; any Prisma migration or destructive DB action needs manager review
first (shadow-database incident policy). No destructive reset/drop against
non-disposable databases, ever.

## D-5 — Git model (protocol)

Per worker protocol: one branch + worktree per worker. Branches
`w1-dd-mechanics`, `w2-frontend-design`, `w3-intelligence` cut off
`f1e8c99`; worktrees at `~/projects/bay-w1`, `~/projects/bay-w2`,
`~/projects/bay-w3` (each needs its own `pnpm install`). Main receives
reviewed changes only. The original checkout (`~/projects/bay`) stays on
main as the manager/integration checkout.

**Merge order is a proposal, not a permanent rule** (correction 5):
currently W1 → W3 → W2. Re-evaluate whenever contracts/dependencies
change. Every candidate integration in INTEGRATION_QUEUE.md states: what
it depends on; what depends on it; whether it changes schema/API/domain
contracts.

## D-6 — Canonical docs are manager-reviewed

Workers do not edit `docs/*` directly; they propose changes in their
worker file (PRODUCT ASSUMPTIONS / doc-change notes). Manager applies
canonical doc changes and records conflicts in this file. Exceptions:
docs/19–20 are W3's working specification documents — W3 edits them, but
flags any change to a canonical rule in its worker file.

## D-7 — Worktree migration record (correction 4)

Migration executed 2026-09-23 ~02:45. Evidence checked before/after:
main checkout tree was clean (all workers' work committed: W1 acceptance
slice + DD Phase 1 inside baseline `f1e8c99`; W2 slices + IN inside
`f1e8c99`); worktrees cut at `f1e8c99`, then fast-forwarded to `1bb81bf`
(control plane). `git status` clean in main and all three worktrees;
branch logs identical through `1bb81bf`. Nothing lost. Workers were
instructed to run `git status` in both locations before starting work.

## D-8 — Quality authority (correction 8)

Workers' terminal state is READY FOR REVIEW, never "done". Manager
returns exactly ACCEPT / REWORK / BLOCK based on actual diff/tests/design
evidence — never on a worker's self-report. Only ACCEPTed work merges.

## D-9 — Management cadence (correction 7)

Coordination cycle triggers: worker READY FOR REVIEW; worker BLOCKED;
design/current changes; schema/API/domain contract changes; worker scope
expansion proposals. Lightweight status sweep every ~25 min while active
work runs (cron in the manager session): new commits, worker status,
changed-file overlap, stale design version, dependency conflicts, test
failures, scope drift. Healthy work is not interrupted for activity's
sake.

## D-10 — IN takeover vs handoff statement (correction 1 ruling)

Worker-3 verified IN-1 directly against baseline `f1e8c99` (which is
worker-2's committed IN work — the tree was clean at baseline, so no work
was lost) because W2-02 was not yet recorded. Ruling: acceptable interim
— NOT a license to skip the handoff. W2-02 landed 2026-09-23 (commit
`782e1d8`: complete/partial/temporary/untested statement + testing
instructions; scope-compliant, coordination file only). Manager ACCEPTed
the record; worker-3's confirmation-or-rejection review is in progress.
No duplicate IN-1 implementation has occurred.

## D-11 — Timeline API wiring deferred

Worker-3 (correctly) scoped apps/api out of IN-2: the timeline/review
engine ships pure in packages/intelligence; serving the timeline via
apps/api is deferred to W1-03 (worker-1 owns apps/api), scheduled only
after IN-2 is ACCEPTed and W1-01/W1-02 are done. Single-owner rule for
apps/api holds.

## D-12 — W3-01 ACCEPTED and merged (2026-09-23)

Manager verdict ACCEPT with evidence: 44/44 intelligence tests
(manager-run), typecheck clean across all packages (manager-run), diff
in-scope (11 files, +493/−11, packages/intelligence + docs/20 + worker
file only), no schema/API/domain changes. Merged `w3-intelligence` →
main. Merge order re-evaluated: W3 first (no dependencies on W1;
proposal order updated in INTEGRATION_QUEUE). Founder checkpoint for
IN-2 remains open. W2-02 handoff statement still owed (D-10).
