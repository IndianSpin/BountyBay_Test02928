# Agent 6 — Data / Analytics / Observability / Release Safety

Session: `jeremydommnich-42` (verify name via ListAgents — if this file
reaches the wrong session, reply to the manager) · Branch: `data-analytics`
· Worktree: `~/projects/bay-data` (one-time `pnpm install`) · Report lane:
`.agents/data/**` (yours; git-tracked, manager-reviewed).

Update this file BEFORE a substantial task and AFTER each checkpoint.
**You are not a general feature worker.** You do not build product
features; you measure, observe, and report. You never self-certify —
terminal state is READY FOR REVIEW / REPORTED TO MANAGER; the manager
issues ACCEPT / REWORK / BLOCK (D-8). You never merge to main; commits go
to your branch only.

## Role (founder spec, 2026-09-23)
- **Owns:** event taxonomy, product analytics infrastructure, retention
  measurement, active-days measurement, observability, release telemetry,
  data quality, release checklist.
- **Does NOT own:** product strategy, roadmap prioritization,
  interpretation of data as causal truth. Your data is evidence; the
  manager and founder decide what it means.
- **Evidence discipline:** TEST EVIDENCE (tests pass) ≠ QA EVIDENCE
  (real usage works) ≠ PRODUCT DATA (users behave a certain way). Keep
  these distinct in every report.

## North-star context (what we are measuring toward)
DAU · active days per WAU · D1/D7/D30 · matches/player · matches/session
· immediate rematch · core funnel conversion. Principle: **enough
measurement to learn — not an analytics empire.** Do not push for
instrumentation at the expense of product delivery.

## CURRENT TASK — DATA-01: repository inspection + measurement-gap report
Read-only. No code or instrumentation changes without explicit manager
approval.
1. Inspect the repo: docs/11 (analytics/experiments), the API analytics
   emitter (`POST /v1/analytics/event`, stdout sink), structured-log
   emitters (`match_completed`, `match_timed_out`, `time_tier_entered`),
   docs/18 §15 observability, the Prisma schema for anything
   analytics-shaped.
2. Produce `.agents/data/MEASUREMENT_GAP.md`: current event taxonomy vs
   the north-star metrics above — table of metric → measured today? →
   what is missing to measure it (smallest sufficient addition). Do NOT
   design a platform; P1-M9 (analytics platform) is deferred.
3. Produce `.agents/data/RELEASE_CHECKLIST.md` (draft): what must be
   true before a meaningful external playtest/release — analytics +
   error reporting functioning, per the founder's release gate.
4. Report findings in this file (STATUS section) with evidence, not
   opinions. Terminal state: REPORTED TO MANAGER.

## Constraints
- No new dependencies without manager approval.
- No schema/API changes in this task (read-only).
- Do not keep yourself busy: if the foundation is sufficient, say so —
  idle is acceptable and cheaper than noise.

## STATUS — DATA-01 COMPLETE (2026-09-23, ~03:20) — REPORTED TO MANAGER

Session identity verified via ListAgents: this session **is**
`jeremydommnich-42` (D-15 routing correct).

Inspection performed read-only against main `8be2347`: docs/06/07/10/
11/18 §15, Prisma schema, `apps/api/src/analytics.ts` + emission points
(timeout-scheduler, match-routes, POST /v1/analytics/event),
`apps/web/src/lib/analytics.ts` + call sites, configs, CI, auth
adapters, feature-flag search (none exist), telemetry deps (none
beyond Fastify built-ins).

Deliverables in `.agents/data/` (all UNCOMMITTED in the manager
checkout — no `data-analytics` branch and no `~/projects/bay-data`
worktree exist yet, so I could not commit per the D-15 main-commit
rule; awaiting manager pickup or worktree cut):
- `MEASUREMENT_GAP.md` — 12-row metric → measured today → smallest
  sufficient addition table (north-star set incl. critical errors).
- `RELEASE_CHECKLIST.md` — DRAFT gate per D-15 (TODO-marked items =
  infrastructure not built yet).
- `INSPECTION_REPORT.md` — A measurement map, B event gaps vs docs/11,
  C release/observability map, D top-10 risks (evidence-basis detail
  for the two deliverables above).
- `EVENT_CATALOG.md` — living catalog: 5 IMPLEMENTED events, PLANNED
  Phase 1 proposals with privacy classes, anti-duplication guard.
- `FOUNDATION_PLANS.md` — E minimal analytics foundation, F minimal
  release-safety, bounded Phase 1 (DA-P1-1..4) with ownership notes.
- `ROLE.md` — corrected role spec (stale `~/projects/bounty-control/`
  path replaced with `.agents/` control plane; QA/manager
  relationships; D-4/D-5/D-8 honored).

Also: `.agents/analytics.md` (my early self-registration file, now
committed by the manager in `02f7399`) is superseded by this file —
manager may delete it to avoid two worker files.

Key findings (evidence, not opinion):
1. Core north-star metrics (DAU, active days/WAU, D1/D7/D30,
   matches/player, funnel to second match, completion/agreement/
   human-vs-AI) are DERIVABLE from authoritative rows — the gap is
   queries + definitions, not instrumentation.
2. True instrumentation gaps: `signup_completed`/`handle_created`
   (handle history already lost), `result_viewed`,
   `rematch_clicked`/`play_again_clicked`, `client_exception` — all
   small additions on existing paths (see EVENT_CATALOG PLANNED).
3. Biggest gap is TECHNICAL: Fastify logger disabled, no error
   handler, no client exception capture, silent realtime catches, no
   `environment`/`release` tags anywhere, stdout-only sink. "Did the
   product fail technically?" is unanswerable today.
4. Matchmaking/rating/tutorial events: not applicable — features
   don't exist yet. Experiment exposure: watch item for when the first
   experiment/Daily Deal is scheduled (must be designed BEFORE the
   feature ships).

Terminal state: **REPORTED TO MANAGER** (read-only task; nothing
implemented, no code touched). Awaiting ACCEPT/REWORK/BLOCK on the
reports and Phase 1 scheduling.

## BLOCKERS
- None for DATA-01. For future implementation: no worktree/branch yet;
  apps/api and apps/web ownership rulings needed (D-2 single-owner);
  four metric definitions need product approval (see PRODUCT
  ASSUMPTIONS).

## PRODUCT ASSUMPTIONS
Recorded before use, all proposals pending approval:
1. Active day = ≥1 match started that calendar day (visits don't
   count).
2. Immediate rematch window = next match within 10 min of previous
   completion.
3. `result_viewed` server-side with in-process per-(match,user) dedup;
   repeats documented as possible.
4. No visit/page-load event in V1 — server-side funnel is the truth.

## BLOCKERS
None known.

## PRODUCT ASSUMPTIONS
None yet — record any before building on them.
