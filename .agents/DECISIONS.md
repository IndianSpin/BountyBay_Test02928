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
isolated `bounty_bay_e2e` DB (seed overrides `E2E_*`). QA lane: ports
3200/4200 (+ 4300 for QA's strict-mode tsx API) with `bounty_bay_qa`.
**Single project postgres instance on host 5433** (docker maps
5433→5432; host 5432 is a Supabase stack) with databases: `bounty_bay`
(dev), `bounty_bay_e2e`, `bounty_bay_qa`. Canonical QA-01 DB =
`bounty_bay_qa`; `bounty_bay_qa2`/`bounty_bay_qa_shadow` are disposable
artifacts (shadow = Prisma migration artifact), not canonical — cleanup
only via manager-reviewed drop. Any Prisma migration or destructive DB
action needs manager review first (shadow-database incident policy).
No destructive reset/drop against non-disposable databases, ever.

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
**Verification list (L-007, after QA-002):** every manager ACCEPT
verification runs `pnpm -r run typecheck` on the merged result plus the
affected test suites (vitest transpiles and Playwright runs the built
app — neither typechecks spec files).

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
No duplicate IN-1 implementation has occurred. W3's D-10 review
(commit `c70a448`): **CONFIRMED, no rejections** — one record-accuracy
flag (statement says 28 baseline intelligence tests; W3 verified 34 on
the same commit — green either way). Handoff chain closed.

## D-13 — IN-2 wrap-up rulings (2026-09-23)

- **docs/18 pointer applied:** timeline event kinds (OFFER/MESSAGE/
  ACCEPT/WALK_AWAY/TIMEOUT/ABORTED — negotiation steps only) are defined
  in docs/20 with `buildTimeline` as the implementation; docs/18 §3 now
  points there (manager-applied per D-6, resolving W3's spec-ambiguity
  flag).
- **Migration retro-review:** `20260922222625_intelligence_analysis`
  (shipped in baseline `f1e8c99`, pre-protocol) reviewed — purely
  additive (CREATE TABLE match_features / match_observations, one index,
  CASCADE FKs). No destructive operations. PASS.

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

## D-14 — QA worker slot (adversarial testing & product red team)

Founder added an independent QA/red-team role (spec pasted 2026-09-23
into the manager session). Manager integration decisions:

- QA is a **separate worker slot** (founder choice), not the manager
  session.
- Branch `qa-adversarial` cut from main `430b302`; worktree
  `~/projects/bay-qa` (deps installed 2026-09-23).
- QA findings live in **`.agents/qa/` inside the repo** (founder
  choice) — NOT in `~/projects/bounty-control/` as the pasted spec
  said. Other stale spec paths corrected in `.agents/qa/ROLE.md`
  (design reference is `design-sandbox/bounty-bay-canvas/`; there is
  no `design/current/`).
- Ports **3200/4200** allocated (3000/4000 = W2, 3100/4100 = W1 E2E,
  D-4). Isolated DB **`bounty_bay_qa`** created on host 5433
  (manager-authorized, non-destructive CREATE DATABASE). QA may run
  `db:deploy`/`db:seed` against `bounty_bay_qa` ONLY; the D-4
  shadow-incident policy applies to every other DB.
- QA is read-only in the repo outside `.agents/qa/**` + `.agents/qa.md`.
  It does not self-fix: DISCOVER → REPRODUCE → DOCUMENT → REPORT; the
  manager triages findings into the task board. CRITICAL/HIGH findings
  are notified to the manager immediately.
- QA terminal state is **REPORTED TO MANAGER** — its reports are review
  evidence (INTEGRATION_QUEUE standing rule), never merged code.
- First task **QA-01**: adversarial baseline against main `430b302`
  (two-client E2E, reconnect, acceptance, result accuracy, leakage
  inspection, mobile ~390 px) → baseline artifacts in `.agents/qa/`.

## D-15 — Data agent slot + specialist rules (2026-09-23)

Founder added Agent 6 (analytics / data quality / observability / release
safety). Manager rulings:

- **Registration:** `.agents/data.md` (worker file) + report lane
  `.agents/data/` (git-tracked, like QA's lane). First task **DATA-01**:
  read-only repository inspection + measurement-gap report
  (docs/11 + current emitters vs north-star metrics: DAU, active
  days/WAU, D1/D7/D30, matches/player, matches/session, immediate
  rematch, core funnel) + draft `RELEASE_CHECKLIST.md`. No code or
  instrumentation changes without manager approval. "Enough measurement
  to learn — not an analytics empire."
- **Specialist discipline (both slots):** QA and Data are NOT spare
  coding capacity. Findings do not automatically become backlog
  commitments — manager triages (real? reproducible? material to the
  current milestone? severity? owner?). Idle specialists are acceptable
  and cheaper than noise.
- **Main-commit rule (enforced):** QA's `8be2347` was committed directly
  to main — coordination-only, reviewed, grandfathered once. From now on
  specialists commit to their own branches (`qa-adversarial`,
  `data-analytics`); the manager merges after review. The manager-only
  checkout rule (D-5) applies to everyone except the manager.
- **Acceptance model (founder):** worker evidence + manager code/
  architecture review + QA evidence where relevant — risk-based;
  mandatory independent QA for: match economics, hidden information,
  timers, acceptance, reconnect, auth, DB migrations, AI legality,
  result calculation, major player flows. Review pipeline: ASSIGNED →
  IN PROGRESS → READY FOR REVIEW → TECHNICAL REVIEW → QA WHERE REQUIRED
  → ACCEPT/REWORK/BLOCK → INTEGRATION QUEUE → MERGE → REGRESSION/RELEASE
  CHECK → DONE (proportional rigor).
- **Evidence taxonomy (founder):** TEST EVIDENCE ≠ QA EVIDENCE ≠
  PRODUCT DATA. Reports keep them distinct; no causal claims from
  correlations.
- **Release gate (before meaningful external playtest/release):**
  workers ready · QA: no unresolved CRITICAL game-flow/integrity defects
  · DATA: critical analytics + error reporting functioning · manager:
  integration reviewed · founder: checkpoint where product/design
  decisions materially matter. Known risks documented explicitly; no
  absolute bug-free demanded.

## D-16 — Factory operating model adopted (2026-09-23)

Founder brief "small factory" adopted. Seven registered roles; zero
ambiguity about who may change what:

| Role | Session | Responsibility | Continuous? |
|---|---|---|---|
| Manager (lead) | `jeremydommnich-08` | priorities, architecture, tasking, acceptance, integration | No |
| Worker 1 domain | `gameplay-depth-anti-stalling` | mechanics, authoritative rules | When assigned |
| Worker 2 frontend | `bounty-bay-p1-roadmap` | approved UI implementation | When assigned |
| Worker 3 intelligence | `jeremydommnich-c7` | review/coaching/AI | When assigned |
| QA / red team | `jeremydommnich-95` | break what workers make | No |
| Data / release | `jeremydommnich-42` | measurement, telemetry, release safety | No |
| Sixth specialist | `jeremydommnich-1d` | tooling & environments (D-17) | Only in bounded area |

Adopted mechanics (details in MASTER_PLAN):
- **Task pipeline:** IDEA → SPECIFIED → READY → ASSIGNED → IN PROGRESS →
  READY FOR REVIEW → TECH REVIEW → QA → ACCEPTED → INTEGRATED →
  OBSERVED → DONE. DONE = integrated + independently tested + observable
  behavior (not "Claude says it works").
- **Task contracts** (BB-### with OBJECTIVE / WHY / OWNER / DEPENDENCIES
  / IN SCOPE / OUT OF SCOPE / ACCEPTANCE CRITERIA / REQUIRED EVIDENCE /
  STOP CONDITION) — every assigned task.
- **Pull-based tasking:** inboxes `~/projects/bounty-control/inbox/`;
  workers check at safe checkpoints, never self-assign roadmaps.
- **Integration windows + golden baselines:** batch merges → full
  regression → golden baseline commit; new tasks branch from it.
- **Learning ledger:** `~/projects/bounty-control/LEARNINGS.md`; every
  escaped defect improves a test/standard/checklist/design rule/
  architectural rule. Promotion: observation → pattern → team rule →
  automated check.
- **Design acceptance:** `design-sandbox/DESIGN_ACCEPTANCE.md` (W2 and
  QA both use it).
- **Product hypotheses:** every feature beyond foundational engineering
  states PRODUCT HYPOTHESIS (We believe / For / This should change /
  Primary metric / Guardrail / Reconsider-if) before work.
- **Retrospective** every 5–10 accepted tasks; **quality dashboard** each
  cycle; **stop conditions** and **context refresh** per MASTER_PLAN.

## D-17 — Sixth specialist: tooling & environments (`jeremydommnich-1d`)

Resolves the duplicate-lead conflict (L-005) per the founder's factory
model ("Sixth specialist: whatever role you currently assigned — only in
its bounded area"). Bounded area: dev/QA **environments and tooling** —
DB provisioning and seeds for specialist lanes (non-destructive, D-4),
worktree hygiene, Playwright/CI-adjacent setup, environment-variable
documentation. NOT: product code, control-plane ownership, task
assignment, canonical docs. Reports via
`~/projects/bounty-control/inbox/sixth.md`. Its QA-slot setup (D-14,
8be2347, bounty_bay_qa seed) is adopted as-is and credited.

## D-18 — Canvas verdict: APPROVED (2026-09-23)

Founder: "canvas slide ok" — LIVE MATCH / ACCEPTANCE / RESULT REVEAL
slices are accepted. Unblocks: W2-03 CSS split (BB-201), secondary-page
canvas treatment (BB-202), DESIGN_ACCEPTANCE enforcement. W2's
restriction period is over; it pulls tasks from its inbox.

## D-19 — DATA-01 ACCEPTED (2026-09-23)

Reports reviewed and committed (read-only, evidence-based): north-star
metrics mostly derivable from authoritative rows (gap = queries +
definitions); true gaps = signup/handle/result_viewed/rematch/client_
exception events; biggest gap = technical observability (logger off, no
error handler, no env/release tags). Implementation (DA-P1-*) NOT
scheduled — backlog with ownership rulings pending. `data-analytics`
branch + `~/projects/bay-data` worktree cut for future work.

## PDR-3 — PRODUCT DECISION REQUIRED: friend-mode rematch (QA-004)

QA-004: in friend mode, Rematch exits to home and the opponent gets
nothing. **Status:** awaiting founder ruling on the intended friend-mode
rematch flow (both sides re-challenge? mutual confirmation? or rematch is
ranked-only for V1?). No changes until ruled.

## D-23 — QA-01 (BB-206) ACCEPTED; findings triaged (2026-09-23)

Verdict ACCEPT (merged `acf86c0`): the accept-seal question is resolved
(test-side stale window, fixed by W1-01 — app behavior clean); unit
226, DB+API 56/56, E2E 9/9, adversarial battery 27/27, leak scan clean,
GR-015 + matrix + mobile pass. Triage: QA-002 (HIGH, typecheck gate
broken by W1-01 diagnostics) → BB-214 hotfix, W1, now — and L-007 makes
typecheck mandatory in every manager verification. QA-001 (MEDIUM,
joiner refresh) → BB-215, W2, after BB-213. QA-004 (PRODUCT) → PDR-3.
INFO items (null envelope fields, empty RESULT eventRefs) → noted for
W3 during IN-3.

## D-21 — Founder sign-offs (2026-09-23): DD Phase 1 + IN-2

Founder: DD Phase 1 checkpoint SIGNED OFF → **DD-M2 (private dossiers,
GR-028) unblocked** for W1 (BB-204 in inbox, after BB-211). Founder: IN-2
checkpoint SIGNED OFF → **IN-3 (longitudinal profile) unblocked** for W3
(BB-205 in inbox). Ruling on the DEC-028 dependency line ("P1-M2 rating
stays ahead of IN-3"): IN-3's core behavioral profile has no rating
dependency (docs/18 §9 fields); rating-dependent comparisons and cohorts
stay deferred until P1-M2 — recorded, not silently dropped.

## D-22 — BB-201 proceeds against canvas v1

Founder did not answer whether to hold BB-201 for a v2 export; default:
proceed against v1. If a v2 export lands mid-flight, the stale-design
stop condition applies — W2 finishes or pauses at the next checkpoint and
re-bases; the v2 delta gets classified (COSMETIC/COMPONENT/FLOW/PRODUCT)
and re-sequenced by the manager.

## D-20 — Environment corrections + BB-210 ACCEPTED (2026-09-23)

Sixth specialist's environment matrix (BB-210, `bounty-control/
ENVIRONMENTS.md`) reviewed and ACCEPTED. Corrections adopted:
(1) D-4 rewritten — single postgres on host 5433, DB list, QA canonical
DB; (2) port 4300 recorded as QA's strict-mode API port; (3) playwright
config default DB targets the shared dev DB → **BB-211** queued for W1
after BB-203 (fail-safe default: refuse bare E2E or default to the e2e
DB; until then, all E2E runs must pass `E2E_DATABASE_URL`/seed
overrides); (4) `bounty_bay_qa2`/`bounty_bay_qa_shadow` = disposable
artifacts, not canonical; (5) **BB-212** assigned to sixth: `pnpm
install` in `~/projects/bay-w2` (W2 blocked on BB-201) + verify node_
modules in bay-w1/w3/qa; (6) bay-data without node_modules is fine while
read-only.

## PDR-2 — OPEN: GR-012 walk-away doc-vs-behavior

QA found docs and domain disagree about walk-away turn gating. Founder
asked 2026-09-23: "i dont know" — not resolved, not abandoned. Plan:
W1 (domain owner) writes the doc-vs-behavior comparison + a
recommendation in worker-1.md (evidence task); QA includes its observed
behavior in the BB-206 report; manager presents both to the founder with
a recommendation. **Nothing changes in code or docs until the founder
rules.**

