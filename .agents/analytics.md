# Worker 4 — data / analytics / observability / release

Session: founder-launched Claude session (this one) · Branch: none yet
(awaiting manager integration) · Worktree: none yet. Inspection performed
read-only in the manager checkout `~/projects/bay` (main `8be2347`); no
code changed, nothing committed.

Role: measurement and operational truth of Bounty Bay — product
analytics, experiment infrastructure, observability, release safety, data
quality. NOT a feature developer. I answer: WHAT IS HAPPENING AT SCALE?
Full role spec: `.agents/data/ROLE.md` (read it at task start).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. **I never self-certify "done" — terminal state is READY FOR
REVIEW; the manager returns ACCEPT / REWORK / BLOCK (D-8).**

## Boundaries
- READ-ONLY in the repo outside `.agents/data/**` and this file until the
  manager assigns implementation (first-assignment rule: wait for
  assignment before broad implementation).
- I do not change product priorities. I report evidence to the manager.
- All files in `.agents/data/` + this file are UNCOMMITTED in the manager
  checkout — awaiting manager integration (like the QA lane in `8be2347`).
- The pasted spec's `~/projects/bounty-control/` control plane does not
  exist; corrected paths are recorded in `.agents/data/ROLE.md`. I did
  NOT create it — the control plane stays unified in `.agents/`.

## Ownership (proposed, for manager ruling)
- Telemetry/observability/release infrastructure across `apps/api`,
  `apps/web` (instrumentation call sites only), CI, and analytics docs.
  NOTE: `apps/api` is worker-1's (D-2) and most of `apps/web` is
  worker-2's — every Phase 1 change lands via their owners or an explicit
  manager ownership ruling. I do not implement in their files without
  assignment.
- Analytics working docs: `docs/11` is canonical (manager applies changes,
  D-6); I propose doc changes here and keep the living event catalog in
  `.agents/data/EVENT_CATALOG.md`.
- Relationship to QA: QA answers DOES THIS WORK; I answer WHAT IS
  HAPPENING AT SCALE. QA findings → I check whether telemetry can measure
  prevalence; analytics anomalies → QA investigates causes.

## CURRENT TASK — DA-01: first assignment (inspection) — COMPLETE, READY FOR REVIEW
Per the role spec's FIRST ASSIGNMENT, inspection only, nothing
implemented:
1. inspected repository (monorepo structure, packages, apps, git state);
2. inspected existing analytics/logging (`apps/api/src/analytics.ts`,
   `apps/web/src/lib/analytics.ts`, emission points, sinks);
3. inspected DB/event model (Prisma schema, `match_events` stream,
   `docs/07`);
4. inspected environment/deployment config (`.env.example`, compose, CI,
   auth adapters, ports/DB separation);
5. inspected test setup (vitest workspace, Playwright E2E, db tests);
6. inspected feature flags (none exist);
7. inspected telemetry dependencies (none — no SDK/logger beyond Fastify).

Deliverables in `.agents/data/`:
- `ROLE.md` — corrected role spec (stale paths fixed)
- `INSPECTION_REPORT.md` — A. current measurement map, B. event gaps,
  C. release/observability map, D. top risks
- `EVENT_CATALOG.md` — living catalog: implemented + Phase 1 proposals
- `FOUNDATION_PLANS.md` — E. minimal analytics foundation plan,
  F. minimal release-safety plan, bounded Phase 1 proposal

Terminal state: **READY FOR REVIEW** — manager verdicts ACCEPT / REWORK /
BLOCK on the inspection and Phase 1 proposal.

## BLOCKERS (for future implementation, not for this inspection)
- `apps/api` single-owner rule (D-2, D-11): Phase 1 server events touch
  `app.ts` / `match-routes.ts` — needs manager ownership ruling or
  worker-1 to land the changes.
- No worker slot/branch/worktree for me yet — needed before any code.
- Definitions awaiting product approval (see PRODUCT ASSUMPTIONS).

## PRODUCT ASSUMPTIONS (proposals, not adopted)
1. Active day = calendar day on which the user started at least one match
   (MATCH_STARTED / matches.startedAt). Visit-only days do not count.
2. Immediate rematch = the same user creates/starts another match within
   10 minutes of their previous match completing. Window is provisional.
3. `result_viewed` is emitted server-side on the result-route GET with
   per-(match,user) dedup in-process (repeats documented as possible).
4. DAU/WAU/MAU and the core funnel are derived from authoritative rows
   (users, matches, match_events) — no client page-view event in V1.
All four need founder/manager approval before they become implemented
semantics (docs/14-style provisional rules, not silent adoption).
