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

## D-25 — IN-3 ACCEPTED (2026-09-23)

BB-205 merged (`f26c7f6`): longitudinal-profile-0.1.0 + coaching-state
0.1.0, pure in packages/intelligence + docs/20. Manager-verified 56/56
intelligence tests; all packages typecheck clean (sole repo-wide red is
the known QA-002, W1's BB-214). Rulings on W3's flags: (1) the docs/16
Insights API wiring for the profile is deferred like D-11 → **BB-220**,
owner W1, after BB-204/BB-219a; (2) OQ-025 (descriptor thresholds)
stays open for the founder close-out batch — all ten thresholds are
provisional, configurable, versioned (recorded in docs/20). W3 stands
down; IN-4 waits for the founder's IN-3 checkpoint.

## D-27 — DD-M2 ACCEPTED (2026-09-23)

BB-214 + BB-217/217b + BB-204 merged (`787aa86`, two REWORK rounds:
api typecheck error; role-blind isolation test — both caught by the
manager gate, L-008/L-009). Manager-verified: full typecheck exit 0
repo-wide, unit 239, dossier-isolation 2/2 ×3 runs, migration additive
(PASS), diff in-scope. Answers recorded: offer 110 vs RV 78.9 is
ILLEGAL (GR-003/GR-006, OUTSIDE_RESERVATION_VALUE — the composer's
advisory names the viewer's own limit; "116,500" is correct rendering
of 1,165,000 tenths via the single formatter — the screenshot showed
an invalid hero CTA, a UI-neutralization item for BB-216, not a data
bug). Turn structure: implementation matches GR-013 exactly; no
deviation; optional GR-013 clarification wording held for founder
pinning. PDR-2 evidence checked against the ruling — consistent.
Docs/07 + docs/08 updated (manager). TD-1 removed. DD-M3 (verified
reveals) gated per DEC-026 phase order. W1 next: BB-219a (rematch API)
then BB-220 (Insights API).

## D-26 — Chat & communication feedback folded in (2026-09-23)

Founder feedback #2 (chat/communication, verbatim in
`bounty-control/FOUNDER_FEEDBACK_2026-09-23_chat-communication.md`)
routed via sixth. Rulings: (1) it is the communication **sub-scope of
BB-216** — W2 implements it inside the composition redesign; rules added
to DESIGN_ACCEPTANCE.md §Chat & communication. (2) Turn-structure
question (TALK without consuming formal turn; social vs offer turn)
folds into W1's BB-217 written answer as a second question — GR-013
already says "messages do not switch turns"; W1 confirms implementation
compatibility and flags any deviation. (3) Quick-prompt → character
dialogue is V1-deterministic (persona line mapping, DEC-025 flavor
lines) — no W3 engine work now; LLM generation would be DEC-030-era.
(4) Voice: NOT scheduled (founder: "later"; DD-M5 deferred). (5) The
permanent "numbers in chat are not offers" sentence is removed in
BB-216; the rule is canonical (GR-025) and moves to the future
tutorial with a subtle composer hint meanwhile.

## D-24 — Live-match composition redesign (founder feedback 2026-09-23)

Founder critique (routed via sixth, verbatim in
`bounty-control/FOUNDER_FEEDBACK_2026-09-23_live-match.md`) supersedes
the canvas v1 live-match composition. Ruling: **BB-201 (CSS split of the
old composition) is PAUSED** — W2's next task is **BB-216** (composition
redesign around ~5 objects; rules added to DESIGN_ACCEPTANCE.md). W2's
uncommitted BB-201 work is checkpointed on its branch (salvageable, not
discarded). BB-213 (dossier wiring) and BB-215 (joiner refresh) re-queue
after BB-216. Acceptance/reveal screens remain approved as-is.
Item 10 (possible illegal state + formatting) split: BB-217 (W1 domain
answer) then BB-218 (QA re-verify).

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

## PDR-2 — RESOLVED by manager (founder delegated, 2026-09-23)

Founder: "i leave those to you to decide." Ruling: **the domain's turn
gating is canonical** — walk-away is a formal gameplay action on the
acting player's turn, subject to GR-023's decision-time budget (same
gate as OFFER/ACCEPT). Rationale: non-active walk-away would break turn
ownership, race the active player's decision, and make timeout
attribution ambiguous; D7 already established the same principle for
accept. docs/02 GR-012 wording corrected accordingly (manager-applied,
D-6). W1's PDR-2 evidence section still lands for the ledger and will
be checked against this ruling when it arrives.

## PDR-3 — RESOLVED by manager (founder delegated, 2026-09-23)

QA-004 friend-mode rematch. Ruling: **rematch = mutual consent.** After
the result, either side may propose a rematch (same scenario, same
roles, unrated); the opponent sees an in-session accept prompt; on
acceptance a new match starts. Until the flow ships, the result screen
must not present a misleading rematch affordance. Tasks: BB-219a (API:
challenge creation with fixed known opponent + rematch flag — W1, after
BB-204) and BB-219b (result-screen rematch UI — W2, after BB-216).

## PDR-1 — RESOLVED: Negotiation-agent architecture approved as direction (DEC-030)


## D-29 — BB-219a ACCEPTED (2026-09-23)

Friend-rematch API merged (`49e6a38`). Gate: typecheck exit 0, unit
251/56sk, rematch db tests 6/6 (manager-run, isolated DB), migration
additive nullable (PASS). Design review: fresh RVs per role on propose
and accept (no RV carried or leaked), proposal = CREATED row with no
domain state until acceptance, one open proposal per source under
source-row lock, unrated (GR-019), decline/cancel delete the proposal
(no audit record — accepted; no domain state existed). Product
assumption ratified: cancel (proposer retraction) is consistent with
PDR-3 mutual consent. Docs/07 + docs/08 updated (manager). UI half =
BB-219b (W2, after BB-216). Lint-debt flagged by W1 (QA tools 8, W2's
resource-hud/result-reveal 5) → folded into the next QA/W2 inbox tasks.

## D-28 — BB-218 ACCEPTED; QA-005 folded into BB-216 (2026-09-23)

QA's founder-state probe confirmed the item-10 diagnosis: the offer
plate lets an illegal beyond-mandate amount be composed with SEAL OFFER
staying ENABLED (advisory-only warning in the cost strip); tap → 400
OUTSIDE_RESERVATION_VALUE → generic alert; turn unchanged; input keeps
the value. Rendering confirmed correct ("116,500" is a true grouped
value — no tenths bug; the seal button echoing raw ungrouped input
"SEAL OFFER 116500" is a minor INFO folded into BB-216). QA-002
verified resolved by BB-214 (typecheck 0 on main). Ruling: QA-005's
fix (CTA neutralization — disable/auto-correct illegal amounts like
the duplicate-offer case + grouped seal label) rides with W2's BB-216
composition redesign; no separate task.

## D-30 — BB-220 ACCEPTED (2026-09-23)

Insights API merged: GET /v1/me/insights serves the caller's own IN-3
profile, null-200 on empty history, self-only. Gate: typecheck 0,
insights 5/5 (manager-run, isolated DB), no schema/domain/contracts
changes. Coaching state correctly excluded (no persistence yet —
IN-5/IN-7; serving emptyCoachingState() would be fake data). docs/08
updated. W1 stands down pending the founder's DD-M2 checkpoint
(DEC-026 phase gate → DD-M3).

## D-31 — BB-216 APPROVED by founder; merged (2026-09-23)

Founder verdict "1" (approve) on the live-match composition + chat
redesign. Merged (`5935792`). Post-merge gate: typecheck exit 0, unit
suite green. Accepted deviations (W2's flags): v4 neutral/idle pose
uses a stand-in asset until the founder exports it; rig in-betweens
(blinks, micro-nods, concession reactions) need real animated assets
later — tech-debt item TD-4, no scheduling. W2's queue now: BB-213
(dossier wiring, one-line board insertion) → BB-215 (joiner refresh
recovery, QA-001) → BB-219b (rematch UI, PDR-3).

## D-32 — W2 queue + W1 flake fix ACCEPTED (2026-09-23)

Merged: BB-213 (dossier wiring), BB-215 (joiner refresh → /play?resume
redirect), BB-219b (mutual-consent rematch UI) — `44c39da`; gate:
typecheck 0, unit 251, lint remaining = QA tool files only. The
join-refresh acceptance spec could not be E2E-verified by the manager
this cycle (harness denied the seed step; environment boot issue) — QA's
pin-update re-run is the independent E2E confirmation before the golden
baseline. Merged: W1's GR-007 flake fix (bounded 5×250 ms retry on the
active-match read, diagnostics preserved) — `56f9141`, conflict resolved
manager-side. Next integration step: after QA's re-run, full regression
→ GOLDEN BASELINE.

## D-33 — Golden baseline regression status (2026-09-23)

Legs green so far (manager-run on main): typecheck exit 0 · unit 251 ·
lint exit 0 (first fully clean tree) · db 70/70 (after L-010 fix: seed
targets dev DB by default — e2e must be seeded with explicit
DATABASE_URL; replay test requires default-seeded e2e). Remaining: E2E
strict leg (blocked on W2's dev servers releasing 3000/4000). Recipe +
lesson in LEARNINGS (L-010). Golden baseline commit cut after the E2E
leg.

## D-35 — Cast v3 export integrated (2026-09-24)

Founder shipped: all 7 remaining cast characters (GREYLOT heron,
HOGSHEAD walrus, PIP QUILL hedgehog, VESPERINE moth, OLD MOSSBACK
tortoise, MARIGOLD FENN patron, ZIPPA RATCHET inventor) at
GoldenOtter-standard 10-board sets + a new opening/title screen
(desktop/mobile, Lantern Wharf scene continuity, 8-character teaser
strip, single PLAY NOW action, rationale board). Committed `ef0ef7f`
(73 files, canvas.json update; canvas now 277 boards/41 pages).
Tasking: BB-224 opening/title screen → W2 (assigned); BB-225 cast pose
system extension (7 characters into the live-match character
presentation) → W2 queue after BB-224. Stale GO-CastPlan.dc.html note
(Black Parrot→heron swap "open") → backlog note, non-canonical.

## PDR-4 — PRODUCT DECISION REQUIRED: title-screen routing

The founder's rationale board flags it: should returning signed-in
players see the opening/title screen, or skip straight to the Bay?
Ruling: implement the screen with a named routing switch
(show title for new visitors; returning-signed-in behavior defaults to
SHOW, one-flag change pending the founder's answer). No behavior is
fixed until the founder rules.

## D-36 — Founder sign-offs #2 (2026-09-24): DD-M2 + IN-3

Founder: "yeh can be signed off" — DD-M2 checkpoint SIGNED OFF →
DD-M3 (verified information, GR-028) assigned to W1 as BB-226 (after
BB-222/BB-223); IN-3 checkpoint SIGNED OFF → IN-4 (knowledge system)
assigned to W3 as BB-227. Both branch from golden-baseline-1.

## D-37 — DA-P1 scheduled (2026-09-24, founder: "implement the recommendations")

Release-critical telemetry scheduled with ownership split (single-owner
rule respected): BB-228 (Data) writes the DA-P1 implementation spec —
exact environment/release tag format + injection points, Fastify
error-handler contract, client_exception event schema, the small
server-side events (signup_completed / handle_created / result_viewed
with in-process dedup) and web events (rematch_clicked /
play_again_clicked), plus the acceptance checklist. BB-229 (W1)
implements the api side per spec; BB-230 (W2) the web side. Data
verifies and updates RELEASE_CHECKLIST.md. No new dependencies beyond
Fastify built-ins.

## D-38 — IN-4 ACCEPTED (2026-09-24)

BB-227 merged: ontology + knowledge-base-0.1.0 (schema, validation,
grade rules A-D, provenance, conflicts map) + 27 curated seed records
(3 A / 11 B / 12 C / 1 D; DOIs only where confidently known). Gate:
typecheck 0, unit 264, lint 0 (manager-run). Flag rulings: (1) §6
observation→concept mappings are OUT of IN-4 scope — they ride IN-5
retrieval (confirmed); (2) the 27 seeds are DRAFT pending human review
— **founder review item** before IN-5 cites them (add to founder
batch). W3 stands down; IN-5 waits for the founder's IN-4 checkpoint.

## D-39 — BB-224 title screen APPROVED (2026-09-24)

Founder: "approve" — opening/title screen merged (`e9a3128`; gate tc
0, unit 264, lint 0). Deviations accepted as flagged (inert Watch-a-
match, hidden live-deals pill, v2-era cast faces until a v3 asset
export, scrolling mobile strip). PDR-4 switch SHOW_TITLE_ON_RETURN
ships default SHOW; founder's routing ruling remains open (one flag).
W2 next: BB-225 cast pose system.

## D-40 — BB-228 spec ACCEPTED; DA-P1 rulings (2026-09-24)

Data's DA-P1-SPEC.md reviewed — all seven decisions ratified: (1)
BB_ENV/BB_RELEASE + NEXT_PUBLIC mirrors → client_environment/
client_release; (2) signup_completed from ensureUserBySubject's
created flag, bot namespace excluded; (3) handle_created on every
setHandle (first-occurrence derivable; no schema change); (4)
result_viewed at-most-once-per-process in-emitter dedup, documented;
(5) 500-path sanitized body — deliberate docs/10 improvement
(INTERNAL_ERROR, no error.message echo); (6) emitter creation at top
of buildApp; (7) /v1/analytics/event enum extension = additive API
contract change → INTEGRATION_QUEUE. BB-229 (W1, api) and BB-230 (W2,
web) proceed per spec; Data verifies post-merge.

## D-41 — BB-222/BB-223 ACCEPTED; golden-baseline-2 (2026-09-24)

Merged (`c83d126`). Manager gate: typecheck 0 · unit 251 · lint 0
post-merge · strict E2E 16/16 (manager-run, override-seeded e2e DB).
Second root cause confirmed valuable: the GR-007 ~50% flake was ALSO a
double-sign-in identity race in dev-auth.ts (fast-refresh remount) —
single-flight fix, 10 lines, dev-only. Ownership ruling: the fix is
grandfathered as flagged; dev-auth.ts remains W2-owned going forward.
BB-223 residue-safe subjects verified 2× against a dirty DB. Known
defects of golden-baseline-1: RESOLVED. Re-cut as **golden-baseline-2**
with a clean full regression. W1 next: BB-229 (DA-P1 api) then BB-226
(DD-M3).

## D-42 — Founder: "all approve and continue" (2026-09-24)

PDR-4 RESOLVED: the shipped default stands — returning signed-in
players SEE the title screen (SHOW_TITLE_ON_RETURN=true stays; no
flip). IN-4 seeds: founder-approved — the 27 knowledge records move
DRAFT → REVIEWED (reviewed_by: founder, 2026-09-24). IN-4 checkpoint
thereby SIGNED OFF → IN-5 (retrieval + coaching composer) unblocked
for W3 as BB-231; the seed REVIEWED marking rides the BB-231 branch.
No other pending founder items.

## D-43 — BB-225 merged; PDR-5 opened (2026-09-24)

Cast pose system merged (all 8 characters render through the BB-216
pose system; AI personas mapped via registry: closer=GOLDENOTTER,
anchor=GREYLOT, grinder=HOGSHEAD, wall=OLD MOSSBACK, mirror=PIP QUILL;
VESPERINE/ZIPPA await personas; humans stay GoldenOtter; registry is
the seam for character selection). Gate: tc 0, unit 264, lint 0.

## PDR-5 — PRODUCT DECISION REQUIRED: persona→character mapping

W2's archetype-reasoned mapping above is a product assumption. Founder
review requested: confirm the mapping (or reassign). One-commit
registry edit either way. Also flagged: asset-export request —
GREYLOT needs the v3 heron pose set (only a v1-era portrait exists);
the six cast sheets are v2-era art, v3 files upgrade in place.

## D-44 — BB-229 merged (formal ACCEPT after Data §5)

DA-P1 api half merged. Manager gate: tc 0 · unit 268 · lint 0 ·
analytics+da-p1 10/10 (manager-run). Data runs §5 verification on main
(emitted-line inspection, privacy check) — formal ACCEPT recorded on
its report.

## D-45 — PDR-5 RESOLVED by founder (2026-09-24)

Founder CONFIRMED W2's persona→character mapping as shipped (anchor=
GREYLOT, grinder=HOGSHEAD, wall=OLD MOSSBACK, mirror=PIP QUILL,
closer=GOLDENOTTER; VESPERINE/ZIPPA await future personas; humans stay
GoldenOtter). No registry edit. Asset-export request stands (GREYLOT v3
heron poses; six cast sheets v3 upgrades — founder-shipped when ready).

## D-46 — BB-216 mobile/desktop overflow defect (sixth's probe)

Sixth measured (live probe, report-only): the approved BB-216
composition overflows both reference viewports — mobile 390x844 is
~46% taller than viewport with ALL action controls below the fold and
clipped by .lm-world overflow:hidden; desktop 1440x900 slices the
bottom strip ~90px. QA's earlier 390px PASS was pre-redesign (stale).
Severity: HIGH (founder-visible; mobile interaction compromised).
Triage: BB-232 for W2 — fix the composition to fit both viewports
(protected-zone rule), BEFORE BB-230; capture-tooling adjustment
(fullPage / taller viewport captures) folded into the same task;
QA mobile re-check after the fix.

## D-47 — IN-5 ACCEPTED (2026-09-24)

BB-231 merged: seeds founder-REVIEWED, observation-concept-mappings
0.1.0 (26/26 coverage, weights/conditions, deterministic lookup),
coaching-composer 0.1.0 (L1-L4 per field, grade register, deterministic
selection, free-form REJECTED, §13 fallbacks). Gate: tc 0, unit 276,
lint 0. W3's flag: mapping relevance weights are provisional editorial
judgments (versioned) — founder close-out batch item, same class as
OQ-025. W3 stands down; IN-6 (practice system) waits for the founder's
IN-5 checkpoint.

## D-48 — Founder PV-* product-vision export (2026-09-24)

16 new boards committed: PV-Thesis ("Outnegotiate real people" —
moves as claims, talk free so it can lie, chips price concessions,
showdown as the reveal moment, swap sides, person-across-the-table as
the largest element, interface shrinks to state, animations amplify
human acts) + PV-Attention/Comms/Cred-*/Decisions/Info/Juice/Loop/
Mobile/Rivalry/RulesCheck/Seq-1/2/Showdown/Swap. Classification:
PRODUCT-level design direction (vision), not new game rules. Routing:
W2 reads PV-Thesis + PV-Mobile + PV-Seq-1/2 + PV-Loop before finalizing
BB-232. PV-Swap (side-swap) and PV-Rivalry are vision items — NO tasks
until the founder schedules them.

## D-49 — BB-229 ACCEPTED (Data §5, 2026-09-24)

Formal ACCEPT: everything spec-conformant and verified (diff exact,
typecheck + 280 unit by Data, live-boot emitted-line inspection: tags,
signup exactly-once, dedup, sanitized 500s, zero RV leakage) EXCEPT
BB-229-1: parser-level 400s (malformed JSON) reply 500 — the handler
missed framework-thrown errors. Disposition: ACCEPT with fix-forward
BB-233 (W1, exact patch in the verification report: map error.statusCode
400-499 through with sanitized INVALID_REQUEST, warn-level logging) —
slots BEFORE BB-226. Web half (BB-230) still pending with W2.

## D-50 — BB-232 merged (founder review pending, 2026-09-24)

Composition fit fix merged (`51a228c`): dossier collapses behind a
disclosure, mobile state-adaptive sheet (composer + seal only on the
player's turn — PV-Thesis "the interface shrinks to what the current
state needs"), world-level fit assertions in canvas-checkpoint at both
viewports, fullPage mobile captures. Measured: mobile 844/844 (was
+368px), desktop 900/900 (was ~90px); dev-auth banner ~32px is the
only page-level scroll in dev builds (absent in production, documented).
Gate: tc 0, unit 280, lint 0, E2E 15/15 (worker-run). Captures:
design-sandbox/screenshots/bb232/. QA mobile re-check + founder review
next.

## D-51 — Design-reference cleanup + PV as build spec (2026-09-24)

Founder feedback ("low quality; don't see the new designs; competing
folders"): (1) ONE review surface —
`design-sandbox/screenshots/current/` with an index README; per-task
capture folders archived; agent-internal evidence stays internal.
(2) The PV-* boards are the ACTIVE build spec for the current screens
— my earlier "vision-only" classification under-delivered; BB-234
(W2): implement the PV live-match direction (PV-Seq-1/2, PV-Mobile,
PV-Attention, PV-Comms, PV-Juice per board intent) as the new
composition target; BB-232's fit remains the floor until it lands.
PV-Swap and PV-Rivalry remain feature-vision (later scheduling).
(3) Quality bar: founder reviews against the PV boards themselves.

## D-52 — BB-226 DD-M3 ACCEPTED (2026-09-24)

Merged. Manager gate: typecheck 0 · unit 290 · lint 0 · reveal 4/4
(manager-run) · no migration (reveal state rides the domain snapshot +
event stream). One integration conflict resolved during merge: the
da-p1 test fixtures needed `verifiableFactIds` under DD-M3's
ParticipantInput — manager-applied 2-line test fix, recorded. Doc
proposals (docs/02 GR-028 wording, docs/07 fields + no-migration note,
docs/08 reveal endpoint + codes + revealedFacts shape, docs/14 OQ-019
branch) queued for manager application with the next docs batch.
Reveal UI is a later W2 task (API-level E2E only).

## D-53 — BB-234 + BB-235 + BB-230 merged (founder review pending)

PV live-match rebuild merged: match-found fronts the opponent card,
plaque trails with public offer history, MY MAX · SEALED vault card,
warm-close from public offers only, viewport-correct pose alignment
(founder's fixed-600px bug), state-adaptive mobile PV sheet, GREYLOT
sheet switch (BB-235), web telemetry (BB-230). Post-merge gate: tc 0,
unit 290, lint 0. Captures in screenshots/current/ (PV set replaces
previous). Deviations recorded for founder: MOVE label lives in W1's
component (SEAL OFFER kept), pitch-on-offer awaits GR-025 API field,
SHOW CARD = DD-M3 UI (later W2 task), emotes = PD-10, voice = OQ-021,
opponent deals count needs profile API extension, signature gestures
approximated by pose swap. Founder review next.

## D-54 — BB-232 QA re-check ACCEPTED (2026-09-24)

QA verified the BB-232 composition clean in both reference viewports
(post-redesign, the stale pre-redesign PASS is superseded) and added a
permanent composition spec (qa-composition.spec.ts). One LOW finding:
QA-008 — dev-build clipping is the documented dev-auth banner
(~32px, absent in production), no action. Merge order note: this
verification ran against pre-BB-234 main; the PV rebuild supersedes
the captured composition — the composition spec will be re-pointed
when QA next verifies.

## D-55 — QA re-check verdict + QA-005/008 (2026-09-24)

Full report merged: composition spec 2/2 PASS (all controls inside the
production frame both viewports; dossier disclosure + adaptive sheet
correct; crossed/deal states complete). QA-005 RESOLVED (seal
neutralization verified live; bb-218 spec re-pinned). QA-008 LOW,
dev-only: the 32px in-flow dev-auth banner pushes dev builds slightly
below the fold — triaged to BB-236 (render the banner as a fixed
overlay so founder screenshot reviews see the production frame; owner
W2, small). Turbopack font flake = environment, no action.

## D-56 — IN-5 founder sign-off (2026-09-24)

Founder typed "accept" for the IN-5 checkpoint (received in W3's
session; code was already merged under D-47). IN-6 (practice system)
unblocked → BB-237 for W3.

## D-57 — Founder SH-* showdown export (2026-09-24)

28 new boards (SH-Intro "from 'found' to her first offer in about 13
seconds" + SH-Battle/Clock/Decisions/Desk-1/2/Journey/Mob-1/2/Nav/
Attention/BayIA…), README + canvas.json updated — committed. The
showdown/result-sequence design set. Classification: design direction
for the result flow (PV-Showdown expanded). NOT yet tasked — queued
behind the founder's PV verdict; W2's reveal-UI and BB-236 remain
first in its queue.

## D-58 — SH journey rulings applied (2026-09-24)

DEC-031 recorded canonically; OQ-029..031 registered; UF-02 updated to
the single TAKE YOUR SEAT confirm (DEC-031 #4). D-45 AMENDED (DEC-031
#5): GoldenOtter remains the DEFAULT human avatar; the SH journey's
Pip Quill portrait for BOB is the drawn example of human portrait
choice — the BB-225 registry is the seam; character-selection UI ships
when the field lands (OQ-031). Clock ruling tasking: BB-238 (W1) —
economy-0.3.0 active row (hardDecisionTimeLimitMs 420,000, clockFloorMs
120,000, provisional per OQ-015..017; E2E overrides unchanged). SH
showdown/result sequence: BB-239 (W2) queued after its current queue.

## D-59 — IN-6 ACCEPTED (2026-09-24)

BB-237 merged: practice-system-0.1.0 — WHAT WOULD YOU DO drill schema
with the no-universal-answer rule enforced structurally (no correctness
field exists), 10 drills + 5 micro-lessons + 26-row recommendation
table over the five personas, cite() helper throwing on fabricated
references, daily/streaks correctly gated (OQ-026). Gate: tc 0, unit
301, lint 0. W3 stands down; IN-7 (improvement tracking) waits for the
founder's IN-6 checkpoint.

## D-60 — BB-241 merged (founder review pending, 2026-09-24)

The Bay per SH3 merged: three hubs + shared bar (tunnel shows no hub
nav), one gold table with honest copy (no fabricated liquidity),
letters slot as honest empty state, SOON placeholders with zero
controls (OQ-030), practice room live, ME card with P1-M2 division
slot. PLAY NOW → The Bay; SH-Battle hierarchy (PLAY A PERSON /
CHALLENGE SOMEONE / PRACTICE). Gate: tc 0, unit 301, lint 0, E2E
22/22 (worker-run). Coordination note routed: W2 updated the shared
createChallenge helpers in W1's spec files (one commit, bodies
untouched) — W1 notified. Captures: screenshots/current/bay-*.png.

## D-61 — BB-242 merged (2026-09-24)

Manifest-driven sprite animation merged: live-match characters animate
at 12 fps (idle/think/speak/offer/react mapped to pose-system key
states; one-shots honor holdLast; viewport-correct stepping;
reduced-motion = static pose; manifest cached once — future clip
updates need zero code). accept/nodeal/rematch/concede staged for
BB-239's result sequence. Gate: tc 0, unit 301, lint 0, E2E 11/11.
TD-4 CLOSED (assets + integration both landed).

## D-62 — BB-238 ACCEPTED (2026-09-24)

economy-0.3.0 merged: hardDecisionTimeLimitMs 420,000 (7:00),
clockFloorMs 120,000 (DEC-031 #3). Seed now deactivates every
non-default row; E2E overrides land on 0.3.0 unchanged. Gate: tc 0,
unit 301, lint 0, db 86 (worker-run). NOTE: W1 flagged late-suite
strict-E2E failures in the shared post-BB-241 entry flow (pages on the
TITLE screen with the dev-auth notice at positions 19-26; standalone
green) — triaged to BB-243 (QA instrumentation), not BB-238.

## D-63 — BB-239 merged (founder review pending, 2026-09-24)

SH4 result sequence + choreography merged: opponent stays in frame with
outcome clips + authored spoken line; SH4 12s offer ring + "then it
becomes a letter" copy; NOT NOW persists the proposal; BACK TO THE BAY
+ Review the deal; minimal read-only seam GET /v1/me/rematch-letters
feeds the Bay letters slot (ANSWER resumes → in-session prompt →
mutual-consent rematch; full SH4 loop E2E'd 4/4). Choreography: offer
pin slam with ring + hit-stop, plaque slide with 8% bounce, crossing
snaps the rail, large concessions play the concede one-shot; reduced
motion cuts to end states. Gate: tc 0, unit 301, lint 0, E2E 17/17.
CROSS-TERRITORY NOTE: W2 authored the rematch-letters seam in
apps/api/src/rematch-routes.ts (W1's file) — grandfathered with flag;
W1 review requested. Deviations recorded: SWAP SIDES = PDR-14 (UI
accepts as-is), rating block absent (P1-M2), 12s window decorative
(proposals persist — window PDR open).

## D-64 — EXTERNAL ALPHA directive (2026-09-24): priority shift

Founder directive: real volunteer testers are available. Milestone
**ALPHA-1**: a real person opens a URL, creates an account, enters
The Bay, plays a complete match, and we can observe it. **No product
scope expansion until this works.** All non-alpha roadmap work
(DD-M4/M5/M6/M7, IN-7/8, P1-M2..M9 extras, PV-Swap/Rivalry, SH slots)
is PAUSED until the alpha release gate passes. Hosted architecture
per directive: Vercel (Next) + Railway (Fastify+Socket.IO, Postgres,
Redis). Auth = complete the EXISTING Clerk integration (no second
provider; 10 requirements in the directive). Release gate per the
directive's list. Tasking: BB-244 (W2, P0 UI regression root-cause +
fix), BB-245 (W1, Clerk integration), BB-246 (sixth, deployment
runbook + env matrix), BB-247 (Data, alpha analytics verification),
BB-248 (feedback capture, W1 api + W2 ui after P0), BB-249 (QA,
hosted realtime matrix + release-gate passes). BB-243 (suite stall)
continues — it feeds release confidence.

## D-65 — BB-243 ACCEPTED; QA-009 → BB-250 (2026-09-24)

Suite stall root-caused: POST /ready rateLimit 30/min vs the
BB-241-era suite's ~35 ready calls → late-suite 429s reject the second
player's ready → matches never start (same six tests, both runs).
BB-222 pattern fix: dev-only generous caps on match-command endpoints,
production unchanged. Challenges (20/min) + offers (60/min) are the
next walls — per-endpoint cap audit folded into the golden-baseline
checklist. Tasking: BB-250 (W1, FIRST — small; unblocks release-gate
suite confidence), then BB-245 (Clerk).

## D-66 — BB-247 ACCEPTED; alpha gaps tasked (2026-09-24)

Data's gap spec merged: signals 1/7/8/9 covered; gaps specced
(bay_viewed, challenge_created/joined, match_started incl.
rematch-accept, feedback_submitted). HEADLINE: AI-practice completions
emit NO match_completed (ai/engine.ts has zero analytics) — the likely
first-alpha path would be invisible; fix specced. Tasking: BB-251
(W1, after BB-250): implement per spec incl. the AI-emit fix;
bay_viewed's two client lines → W2 (fold into BB-244). Deploy note
routed to BB-246: BB_ENV=production + BB_RELEASE=sha must be set by
the deploy; stream = Railway logs, truth = hosted Postgres.

## D-67 — BB-246 ACCEPTED; FF-1 tasked (2026-09-24)

Deploy runbook accepted (DEPLOY_RUNBOOK_ALPHA1.md): Railway service
definitions (REPLICAS=1 mandatory — presence is in-memory), sockets
direct to Railway, LOCAL/TEST-PREVIEW/ALPHA env matrix, secrets rules,
founder walkthrough. BLOCKING: FF-1 — realtime.ts has no CORS option;
env-driven origin pinning (~2 lines, runbook §1) → BB-253 (W1, after
BB-250). Non-blocking: FF-2 Redis unused (single replica), FF-3
tsx-in-production OK for alpha, FF-4 Vercel monorepo fallback.
Founder access + decisions list (§6) surfaced to the founder.

## D-68 — BB-244 P0 FIXED + BB-252 (2026-09-24)

P0 root cause measured: /bay never imported its CSS module — cold
visits bundle no hub.css (2 vs 3 stylesheets), hub bar collapsed to
block, links fell to browser default purple. Fix: bay/page.tsx imports
hub.css; globals styles the panel links; a cold-visit styling guard
spec (world paints, zero default links) prevents silent regression;
all remaining routes audited. BB-252 rode along: bay_viewed fired on
the Bay mount (semantic surface = bay/page.tsx — corrected from the
earlier play-page naming; Data to confirm in its verification). Gate:
tc 0, unit 301, lint 0, E2E 22/22. P0 gate: CLEARED — first alpha
gate passed.

## D-69 — BB-250/251/253 ACCEPTED (2026-09-24)

Merged: dev-only generous gameplay rate caps (production pins
preserved — QA-009 fixed; 2× strict suite 28 passed, 0 command 429s),
alpha funnel signals per BB-247 (challenge_created/joined,
match_started incl. rematch-accept, bay_viewed enum, feedback_submitted
server-only contract, and the headline AI-practice match_completed
fix), Socket origin pinning with the improved deviation over the
runbook snippet (allowRequest actively refuses disallowed browser
origins — non-browser clients without Origin stay allowed). Gate:
tc 0, unit 301, lint 0, alpha-gap+realtime 7/7 (manager-run). W1 next:
BB-245 (Clerk).

## D-70 — STABILIZATION MODE (2026-09-24)

Founder directive: NO NEW FEATURES. Health of two complete journeys
(A: Human PvP, B: AI Practice) is the only objective. Integrated
Product Rule: DONE = impl + manager review + integration + tests + QA
executes the affected Golden Journey + screenshots. Active coding
limit: max 3 agents changing product behavior (W1 game truth/state/
timer, W2 Golden Journey frontend, W3 AI/post-match/profile).
PRODUCT HEALTH MATRIX (.agents/PRODUCT_HEALTH.md) is the primary
dashboard — FUNCTIONAL / STATE CORRECTNESS / VISUAL / RESPONSIVE /
CTA-NAVIGATION / QA × GREEN/YELLOW/RED/NOT TESTED, journey order.
Four canonical contracts created (GAME_STATE_CONTRACT,
GOLDEN_UI_JOURNEY, AI_BEHAVIOR_CONTRACT, CTA_ROUTE_CONTRACT). AI
acceptance standard (OBSERVE → UPDATE BELIEFS → LEGAL ECONOMIC ACTION
→ SOCIAL INTENT → TABLE TALK → RETURN CONTROL; deterministic fixture
set; graceful fallback) → BB-254 (W3). Claude Design FROZEN at the
current approved Golden Journey; no new screens/characters/modes until
exit. Exit = both journeys GREEN + no P0 + 7:00 clock correct +
meaningful table talk + review/rematch/play-again/profile work +
desktop/mobile QA → GOLDEN BASELINE → features resume. Alpha deploy
work continues as infrastructure (not features).

## D-71 — BB-251 formally ACCEPTED (2026-09-24)

Data's live verification: all nine alpha funnel signals emitting with
exact fields and no dupes; the headline AI-practice match_started +
match_completed proven on a real engine-driven match (the
previously-invisible first-alpha path now observable); bay_viewed,
tag order, release id, zero RV leakage confirmed. Release-gate item
"basic analytics confirmed": READY (hosted-truth = Postgres per
BB-246 note). BB-248's feedback_submitted waits on its route, as
designed.

## D-72 — BB-245 ACCEPTED (2026-09-24)

Clerk integration merged: auth.protect() on /play /profile /replay /
review /bay when keys enabled (landing + sign-in/up public); verified
identity everywhere (networkless verifyClerkToken; no client-supplied
ids trusted; socket user:register validated against the verified
subject; factory refuses production boot without the JWT key); socket
handshake refuses dev-minted tokens under Clerk config; one Player row
per Clerk sub + handle-choice form (server-side format/uniqueness;
assignment never client-trusted) — profile-client.tsx touch
grandfathered with flag, W2 review at leisure; dev-auth production
lockout pinned incl. playwright env pinning; secrets audit clean.
Gate: tc 0, unit 301, lint 0, db 94, strict E2E 2× 28. REMAINING for
the auth gate: live Clerk end-to-end verification on the preview/
alpha deploy — needs the deploy keys (founder access item).

## D-73 — Golden Reference system directive (2026-09-24)

Founder answer to the RW-* classification question: RW stays
reference-only; instead, build the GOLDEN REFERENCE system — tooling
that makes the VISUAL column honest (fits D-70): (1) ONE golden
reference in the repo, in code — one page per journey state at
1440×900 + 390×844, built with the app's own colors/fonts, real
character art + animation sheets, fixed reference data (BOB vs
KESTREL, deal at 74), animations on a timeline file — mockup and
prototype at once; (2) a per-state contract as DATA (elements,
positions, no-overlap, min sizes, forbidden, animation timeline); (3)
a dev-only state gallery rendering any state from reference data; (4)
a gate that can say no — opens the golden page AND the app's version
of each state at both sizes: layout-contract hard fail on missing/
overlap/clipped, side-by-side images on every UI change, animation
order/timing check — runs on every frontend change; review rule: no
screen done without its side-by-side image; (5) one source of truth:
the golden-journey contract points at the golden reference only; the
canvas explains why. Tasking: BB-256 (W2). Coin Master reward layer
ships the same way when its time comes.

## D-74 — BB-254 ACCEPTED; BB-255 ACCEPTED (2026-09-24)

Table-talk pipeline merged (six-stage deterministic, fixtures, no
RNG/LLM, non-response impossible, packages/ai untouched); journey
walk merged (both journeys GREEN except the two known REDs, QA
evidence + spec committed). Matrix updated: AI table talk = YELLOW
(engine merged, wiring pending BB-257).

## D-75 — FIRST HOSTED ALPHA DEPLOYMENT (2026-09-24)

Founder milestone: deploy the current integrated main so external
testers can use Bounty Bay. Deployment/stabilization only — no
product features. Ten phases mapped: P1 audit + dependency map →
sixth (BB-259, builds on BB-246's runbook); P2 environment contract
→ sixth (verify actual repo names, no aliases); P3 Vercel → founder
connects GitHub repo (sixth preps settings; preview first); P4
Railway backend → founder creates project (sixth preps; sockets
direct to Railway, CORS pinned, migrations via railway run); P5 Clerk
hosted flow → QA after deploy; P6 public URL contract → W1 (BB-260:
localhost/127.0.0.1 audit + classification + challenge-URL origin);
P7 hosted Golden Journey → QA (BB-249 extended: both users, refresh,
disconnect/reconnect, mobile + desktop); P8 observability → Data
(BB-261: release/env/route/player/match/time/error fields; no
secrets/private info/tokens); P9 analytics → Data (minimum set incl.
review_opened + rematch_started — review_opened exists from IN-1);
P10 release report → manager; STOP for founder review before any
invite; never auto-invite.

## D-76 — BB-257 ACCEPTED (2026-09-24)

Table talk wired: persona decides the legal economic action ONLY
(chatAllowed false; unexpected chat → logged + WALK_AWAY, never
wedged); runAiTurn consumes legal-view observations (own/opponent
offers, concession run, decision window, message PRESENCE only,
held-last-turn, crossed) with the economic action passed through
unchanged; talk commits before the move; restart-safe belief hash;
fallback covers non-response. ai_turn_intent analytics line per turn
(pseudonymous) — EVENT_CATALOG note recorded. Gate: tc 0, unit 309,
lint 0, db 94, strict E2E 28. Matrix: table-talk row flips GREEN on
QA's re-walk (their call).
