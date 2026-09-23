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

## STATUS
Awaiting first task start (registered 2026-09-23 by manager).

## BLOCKERS
None known.

## PRODUCT ASSUMPTIONS
None yet — record any before building on them.
