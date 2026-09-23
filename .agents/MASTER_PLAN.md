# MASTER PLAN — Bounty Bay

Coordination artifact. Canonical product truth lives in `docs/` only.

## CURRENT PRODUCT MILESTONE
P1 (DEC-025): P1-M1 (AI practice) done. Canvas redesign slices (DEC-029)
all three shipped — status **READY FOR FOUNDER REVIEW** (NOT accepted).
No propagation of the canvas visual language to other screens until the
founder approves.

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

## WORKSTREAM DEPENDENCIES
- IN-2 verified-fact/pitch features wait for DD-M3/M4/M5 (GR-025/GR-028).
- P1-M2 (rating) precedes IN-3/IN-8.
- DEC-030 agent implementation (unscheduled) depends on IN-2 + DD Phase 1
  sign-off; consumes GR-028 dossiers; hooks IN-6/IN-3.
- Ports/DB: W2 dev servers on 3000/4000; W1 E2E on alt ports 3100/4100
  with isolated `bounty_bay_e2e` DB (5433). Dev DB (5432) shared
  read-mostly; any migration needs manager review first.

## DESIGN STATUS (correction 3)
Canvas slices LIVE MATCH / ACCEPTANCE / RESULT REVEAL are **READY FOR
FOUNDER REVIEW** — not accepted. W2 may only: prepare the IN handoff,
clean obvious debug logging, fix regressions, provide screenshots and
testing instructions. **No new UI feature work.** Secondary pages
(onboarding, profile, replay, review, landing) stay untouched.

## MANAGEMENT CADENCE (correction 7)
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
W2 IN handoff commit (hash recorded in worker-2.md) → W3 inspect +
cherry-pick → W1 acceptance fixes (E2E) → founder reviews (canvas slices,
DD Phase 1, IN-2) → CSS structural split (W2-03) before multi-agent UI
work resumes.

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
