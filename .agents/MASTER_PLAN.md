# MASTER PLAN — Bounty Bay

Coordination artifact. Canonical product truth lives in `docs/` only.

## CURRENT PRODUCT MILESTONE
P1 (DEC-025): P1-M1 (AI practice) done. **Canvas slices APPROVED by the
founder** ("canvas slide ok", D-18). Next UI work: CSS structural split
(BB-201) then secondary pages (BB-202) under DESIGN_ACCEPTANCE rules.

## CURRENT ENGINEERING MILESTONE
Baseline `f1e8c99` verified (typecheck clean, 216 unit passed; DB/E2E
worker-reported, E2E fixes = W1-01). DD Phase 1 (DEC-027) complete.
IN-1/2 (DEC-028) in flight, handoff W2 → W3 under way. DEC-030
(negotiation agent) adopted as future direction, deferred.

## ACTIVE WORKSTREAMS
- **W1 — domain/mechanics (DD track):** `gameplay-depth-anti-stalling`
  session. Acceptance-slice E2E fixes + DD Phase 1 founder checkpoint.
- **W2 — frontend/design:** `bounty-bay-p1-roadmap` session. Restricted
  scope until founder review (see below): IN handoff statement + debug-log
  cleanup + regression fixes + screenshots/testing instructions only.
  `design-sandbox`, `globals.css` (shared file — split planned, W2-03).
- **W3 — analytics/coaching/content (IN track):** `jeremydommnich-c7`
  session. Takes over `packages/intelligence` from W2's handoff commit
  (inspect → branch/cherry-pick or reject with reasons; never duplicate
  IN-1). Completes IN-2 Game Review V1.
- **QA — adversarial/red team (D-14):** independent tester, NOT a
  developer. Branch `qa-adversarial` (current base = main `045049a`);
  worktree `~/projects/bay-qa`; read-only outside `.agents/qa/**` + its
  worker file. Ports 3200/4200 (+4300 strict-mode API), isolated DB
  `bounty_bay_qa` (host 5433). Findings → `.agents/qa/`; manager triages
  into the task board. Current task: BB-206 (QA-01 re-verify + MATCH
  STATE INTERRUPTION matrix).

## WORKSTREAM DEPENDENCIES
- IN-2 verified-fact/pitch features wait for DD-M3/M4/M5 (GR-025/GR-028).
- P1-M2 (rating) precedes IN-3/IN-8.
- DEC-030 agent implementation (unscheduled) depends on IN-2 + DD Phase 1
  sign-off; consumes GR-028 dossiers; hooks IN-6/IN-3.
- Ports/DB (D-4, corrected): single postgres on host 5433 (docker
  5433→5432; Supabase holds 5432) with DBs bounty_bay / bounty_bay_e2e /
  bounty_bay_qa; W2 dev servers 3000/4000; W1 E2E 3100/4100; QA
  3200/4200+4300. Any migration needs manager review first.

## DESIGN STATUS (D-18: canvas APPROVED)
Canvas slices LIVE MATCH / ACCEPTANCE / RESULT REVEAL are founder-
approved. All further UI follows `design-sandbox/DESIGN_ACCEPTANCE.md`
(W2 builds against it, QA tests against it). W2 is unblocked: pulls
tasks from its inbox (BB-201 CSS split first).

## TASK PIPELINE (D-16)
IDEA → SPECIFIED → READY → ASSIGNED → IN PROGRESS → READY FOR REVIEW →
TECH REVIEW → QA → ACCEPTED → INTEGRATED → OBSERVED → DONE. DONE =
integrated + independently tested + observable behavior. Every assigned
task is a contract (BB-###: OBJECTIVE / WHY / OWNER / DEPENDENCIES /
IN SCOPE / OUT OF SCOPE / ACCEPTANCE CRITERIA / REQUIRED EVIDENCE /
STOP CONDITION). Workers pull from
`~/projects/bounty-control/inbox/<role>.md` — never self-assign.

## STOP CONDITIONS (automatic)
Workers stop and report when: acceptance criteria met · a product
decision is encountered · changes would enter another agent's ownership
· design version is stale · API/schema assumption differs from the
baseline · X files beyond expected scope are changing · tests expose an
unrelated systemic failure.

## INTEGRATION & GOLDEN BASELINE
Integration windows: worker checkpoint → manager review → QA if required
→ ACCEPT → integration batch → full regression → **golden baseline**
commit (tests, E2E, known defects, design version, schema state
recorded). New tasks branch from the golden baseline. Current golden
candidate: main after W1-03 + BB-201 integrate and QA-01 completes —
until then, tasks branch from main HEAD with a recorded base SHA.

## QUALITY DASHBOARD (each cycle, Markdown table)
Delivery (accepted/attempted) · Rework rate (% REWORK) · QA
critical/high defects · Test pass/flaky · Collisions (overlapping files/
contracts) · Scope (tasks expanded) · Debt (new vs resolved) · Design
(export version) · Product (current hypothesis) · Data (measurable now).
Signal: high rework rate → task specs or worker quality are off; zero
rework → manager not reviewing hard enough.

## MANAGEMENT CADENCE (correction 7 + D-9)
Run a coordination cycle whenever:
- a worker becomes READY FOR REVIEW;
- a worker reports BLOCKED;
- design/current state changes;
- a schema/API/domain contract changes;
- a worker proposes scope expansion.
Plus a lightweight status sweep every ~25 minutes while active work runs
(automated in this session). Each cycle checks: new commits, worker
status, changed-file overlap, stale design version, dependency conflicts,
test failures, scope drift. Do not interrupt healthy work just to create
activity.

## QUALITY AUTHORITY (correction 8)
Workers do not self-certify completion. Their terminal state is **READY
FOR REVIEW**. The manager returns exactly one of: **ACCEPT** / **REWORK**
/ **BLOCK**, based on actual diff/tests/design evidence. Only ACCEPTed
work merges to main.

## NEXT INTEGRATION POINT
W2 IN handoff commit (`782e1d8`, ACCEPTED) → W3 inspect + cherry-pick
(done, D-10 CONFIRMED) → W1 acceptance fixes (E2E) → QA-01 adversarial
baseline → founder reviews (canvas slices, DD Phase 1, IN-2) → CSS
structural split (W2-03) before multi-agent UI work resumes.

## MAJOR RISKS
1. `globals.css` shared-file ownership until W2-03 split (temporary,
   selector-level boundaries in worker files).
2. IN-1 duplication risk if W3 rebuilds instead of taking W2's handoff
   commit (correction 1 — process now explicit).
3. Canvas visual language leaking beyond the three slices before founder
   approval.
4. Port/dev-server contention between sessions.
5. DEC-030 scope creep: no worker may start agent work before it is
   scheduled.

## DO NOT BUILD YET
- Negotiation agent (DEC-030): design direction adopted, implementation
  NOT scheduled. Persona code stays.
- DD-M2..M7 (DEC-026: deferred, founder checkpoint per phase).
- IN-3+ before the IN-2 founder checkpoint.
- Secondary pages before founder approves the canvas slices.
- Voice pitches (DD Phase 5), analytics platform (P1-M9), payments (never
  in V1), real money (never).
