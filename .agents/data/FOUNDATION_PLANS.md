# FOUNDATION PLANS — E (analytics) + F (release safety) + Phase 1 proposal

Proposal only. Nothing implemented (first-assignment rule). Presented to
the manager/founder for approval; implementation waits for assignment.

---

## E. MINIMAL ANALYTICS FOUNDATION PLAN

Constraint: this is an early product; the platform ships with P1-M9.
Phase 1 is the minimum needed to measure, with trust:

- activation (signup → handle → first match);
- first match;
- second match;
- matches/user;
- immediate rematch;
- DAU/WAU/MAU;
- active days per WAU;
- critical technical errors.

### E1. Server-owned events (authoritative, no new table)
Extend the existing emitter call sites in apps/api (worker-1's area —
ownership ruling needed): `signup_completed`, `handle_created`,
`challenge_created`, `challenge_joined`, `result_viewed`, `replay_opened`
(catalog entries above). All fire on committed server actions — exactly
once per action; refetches documented.

### E2. Client events (UI-only knowledge)
Extend the existing `POST /v1/analytics/event` enum:
`rematch_clicked`, `play_again_clicked`, `play_mode_selected` (if
UI-only), `client_exception`. Keep fire-and-forget; rate limits already
exist (60/min — verify rematch/replay burst headroom).

### E3. Common fields
`environment` + `release` + `service` on every line (see catalog).
This single change makes the existing stdout lines trustworthy and
enables "which version did the user encounter".

### E4. Metrics derivation (read-only, no new platform)
A small read-only SQL/report script (scripts dir or packages/db
scripts) over authoritative rows computing:
- DAU/WAU/MAU, active days per WAU (mean/median/distribution) per the
  approved active-day definition;
- D1/D7/D30 cohort returns;
- funnel: new users → handle → first match start → first match complete
  → result view → second match start;
- matches/user/day, completion rate by reason, human-vs-AI split,
  immediate rematch rate (per approved window), agreement rate.
Output: plain tables/JSON — inspectable, no warehouse, no dashboards
yet (dashboards = P1-M9).

### E5. Event quality tests
Unit tests assert emitted line schemas (names, required fields, no RV
keys — extend the hidden-information audit pattern); an analytics smoke
test in CI parses a line and checks tags.

### E6. Explicitly NOT in Phase 1
No analytics table/migration (D-4 review if ever needed); no analytics
SDK/platform/dashboards (P1-M9); no matchmaking events (no matchmaking);
no rating events (no rating); no experiment platform (flags only when
the first experiment is scheduled — E7 watch-item); no tutorial events
(tutorial not in product).

### E7. Watch item — exposure before experiments
When Daily Deal (founder-gated) or any experiment nears implementation,
exposure recording (experiment_id/variant/assignment) must be designed
BEFORE the feature ships. Flag early; retrofits are unreliable.

### Definitions requiring product approval (no silent adoption)
1. Active day = day with ≥1 match started (proposed).
2. Immediate rematch window = next match within 10 min of previous
   completion (proposed).
3. result_viewed dedup semantics (proposed in-process per match/user).
4. Success thresholds: none invented — docs/11 gates are hypotheses
   only.

---

## F. MINIMAL RELEASE-SAFETY PLAN

### F1. Release checklist (this lane, then proposed into docs via manager)
`.agents/data/RELEASE_CHECKLIST.md` to be created on first use:
- typecheck; unit tests; integration/db tests; E2E critical path;
- QA critical-defect check (`.agents/qa/BUGS.md` — CRITICAL/HIGH must
  be triaged, not necessarily all fixed);
- migration review (D-4 — any migration needs manager review);
- environment-variable check (Clerk keys present in prod, DEV_AUTH_SECRET
  absent in prod, CORS_ORIGIN pinned, NODE_ENV=production, no default
  dev auth secret warning);
- build; smoke test (health + one playable match on the target
  environment);
- analytics smoke test (emit + parse + tags present + no RV fields);
- rollback plan (previous commit SHA recorded; deploy mechanism is TBD —
  first deploy needs one).

### F2. Structured logging (smallest compliant change)
Enable Fastify's built-in logger with a JSON formatter in production
(no new dependency — 06 §12 compliant), keep it off in dev to preserve
current behavior; request ids via Fastify's built-in genReqId; log
fields only: request_id, user_id, match_id, error_code, service,
environment, release. Never tokens/RV (docs/10).

### F3. Error paths
- Fastify `setErrorHandler`: log error code + request id, keep client
  bodies as today.
- `unhandledRejection`/`uncaughtException`: log + exit (crash-restart
  semantics; bootScan re-arms timers — documented restart safety
  exists).
- realtime catches: log with matchId context (currently silent).
- Client: `client_exception` capture (E2).

### F4. Release identification
Inject at boot: `release` = short commit SHA + version, `environment` =
NODE_ENV/deploy tag. Include in analytics lines (E3), logs (F2),
`/health` (replace hardcoded '0.1.0'). CI can stamp the SHA into the
build artifact when a deploy pipeline exists.

### F5. Database safety
- Keep D-4 as the authority; add DB separation + migration-review steps
  to the checklist (F1).
- Confirm `packages/db/.env` (local) remains untracked at every release
  (secrets check step).
- No Phase 1 analytics table → no Phase 1 migration. If founder wants
  durable client events before P1-M9, that becomes a manager-reviewed
  migration — explicitly a product decision.

### F6. Explicitly NOT in Phase 1
No deploy pipeline construction (no deployment target exists yet); no
Sentry/Datadog/APM SDKs (06 §12 dependency policy; re-evaluate if
production shows the need); no metrics endpoint; no alerting system
beyond the checklist gates.

---

## BOUNDED PHASE 1 PROPOSAL (for manager scheduling)

**DA-P1-1 — Event instrumentation (E1+E2+E3).**
- apps/api: new server events + common fields + enum extension
  (worker-1 area → ownership ruling; possibly landed by worker-1 under
  my spec).
- apps/web: rematch/play-again/mode call sites + client_exception
  (worker-2 area → same ruling).
- Tests: event schema assertions + hidden-information extension.

**DA-P1-2 — Observability + release identification (F2+F3+F4).**
- apps/api: logger on in prod, request ids, error handler, process
  handlers, realtime catch logging, /health fields.

**DA-P1-3 — Metrics derivation script (E4) + definitions.**
- Read-only report script; active-day/rematch definitions approved and
  documented (proposed into docs/11 via manager, D-6).

**DA-P1-4 — CI gates (E5+F1).**
- Analytics smoke test + release checklist doc + env-check step.

Sequencing note: DA-P1-1 and DA-P1-2 both touch apps/api → coordinate
with worker-1 (single-owner, D-2). DA-P1-3 has no code conflicts
(read-only queries). DA-P1-4 is CI-only. No schema/API/domain contract
changes in Phase 1 (the /v1/analytics/event enum extension is additive —
flagged as an API contract change for INTEGRATION_QUEUE).

Out of scope for Phase 1 (by design): analytics platform/dashboards
(P1-M9), matchmaking/rating events, experiment platform, Daily Deal
instrumentation (watch-item E7), any new analytics table.
