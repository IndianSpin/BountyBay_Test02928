# INSPECTION REPORT — DA-01 (first assignment, inspection only)

Inspected 2026-09-23 against main `8be2347` (manager checkout, read-only).
No code changed. Sources: AGENTS.md, docs/06/07/08/10/11/16, Prisma
schema, `apps/api/src/*`, `apps/web/src/lib/analytics.ts`, configs, CI.

---

## A. CURRENT MEASUREMENT MAP

### What exists today

**Emitter** — `apps/api/src/analytics.ts` (docs/11, DD Phase 1, DEC-027):
`AnalyticsEmitter` writes one structured JSON line per event to stdout
(`{ analytics_event, ...fields, emitted_at }`). Explicitly the P1-M9 swap
point ("no SDK and no analytics table exist yet"). Dedup: only
`time_tier_entered`, per (match, player, tier), in-process.

**Event names implemented (5):**

| Event | Source | Properties | Notes |
|---|---|---|---|
| `match_timed_out` | `timeout-scheduler.ts` | matchId, mode, playerId, cumulativeActiveMs | once per timeout |
| `time_tier_entered` | scheduler + `match-routes.ts` | matchId, playerId, tier, decisionTimeRemainingMs | per (match,player,tier) |
| `match_completed` | scheduler + `commitAndBroadcast` | matchId, mode, completionReason, per-player cumulativeActiveMs + clockMultiplier | docs/11 extension |
| `review_opened` | web review page → `POST /v1/analytics/event` | playerId (server-added), matchId | authenticated, rate-limited 60/min |
| `review_step_viewed` | same | playerId, matchId | authenticated, rate-limited 60/min |

**Client** — `apps/web/src/lib/analytics.ts`: fire-and-forget POST to
`/v1/analytics/event` with Bearer token; failures silent (by design,
"observability must never block the game"). Only call sites: the review
page (`review_opened`, `review_step_viewed`).

**Sink reality:** stdout only. In local dev that is a terminal; in CI it
is lost. No durable store, no environment tag, no release identifier on
any line. Lines carry no `service`/`environment` fields.

### Authoritative sources available for derivation (server rows)

- `match_events` — immutable per-match stream, 12 domain event types
  (MATCH_STARTED, PLAYER_READY, OFFER_SUBMITTED, MESSAGE_SENT,
  PLAYER_DISCONNECTED, PLAYER_RECONNECTED, MATCH_PAUSED, OFFER_ACCEPTED,
  WALKED_AWAY, TIMED_OUT, MATCH_COMPLETED, MATCH_ABORTED), sequence,
  server `at` timestamps, commandId idempotency (SI-004).
- `matches` — mode (RANKED_LIVE/FRIEND_LIVE/AI/ASYNC), status,
  scenarioId/version, gameRulesVersion, economyConfigVersion, ratingVersion,
  aiPersonaKey/version, createdAt/startedAt/completedAt, completionReason,
  timeoutPlayerId, authoritative `domainState` JSON.
- `offers`, `chat_messages`, `match_results`, `rating_events`,
  `match_features`/`match_observations` (IN-1), `users` (createdAt,
  isBot), `player_profiles`, `game_balance_configs`.

### Measurable TODAY by derivation (no new instrumentation)

- DAU/WAU/MAU and active days per WAU — "user with ≥1 match started that
  day" (matches.startedAt / MATCH_STARTED rows).
- D1/D7/D30 return, matches/user, sessions-equivalent (match sequences
  per user per day), immediate-rematch behavior (next match by same user
  after completion — window needs a definition).
- Completion rate, agreement/deal rate, walk-away vs timeout split
  (completionReason), human vs AI split (aiPersonaKey), offer cadence
  (docs/11 explicitly names MatchEvent rows as the source), match
  duration, chat usage, disconnect/reconnect counts (event rows).
- New users (users.createdAt), activation-to-first-match (users.createdAt
  → first matches.startedAt).

### NOT measurable today

- Visits/page loads (no page-view event; no visitor table).
- `handle_created` timestamp (handle column has no created-at history).
- `result_viewed`, `replay_opened`, `profile_viewed`, `invite_sent`,
  `rematch_clicked` / `play_again_clicked` (buttons exist, no events).
- `play_mode_selected` (AI practice vs friend challenge choice is made on
  the play page but recorded only implicitly via match.mode).
- `match_aborted_technical` (no emission point; ABORTED matches exist in
  schema).
- Client exceptions, websocket connect/disconnect counts and errors, API
  error counts, latency percentiles — nothing emitted or logged
  reliably.
- Tutorial events — tutorial does not exist in the product (no tutorial
  UI found; docs/11 lists tutorial events as future).
- Matchmaking events — no matchmaking exists (challenges only); docs/11
  matchmaking block is future.

### Existing privacy protections (good)

docs/10 Logging: never log tokens/passwords/secrets; RV values only in
protected audit logs if necessary; analytics lines must never carry RV.
Hidden-information audit tests exist in `apps/api/tests/`
(`hidden-information-audit.test.ts`, `ai-hidden-information-audit.test.ts`).
Emitter payloads comply (match/player ids, modes, times, rule data only).

---

## B. EVENT GAPS (vs docs/11 required events)

Implemented: 5 of ~26. Gap classes:

**1. Account/product — full gaps (no data source at all):**
`signup_completed`, `handle_created`, `tutorial_started`,
`tutorial_completed`, `play_mode_selected`. (signup partially derivable
via users.createdAt; handle_created is lost history today.)

**2. Matchmaking — not applicable yet** (no matchmaking in product):
`matchmaking_started/cancelled/found/ready`, `ai_fallback_offered/
selected`. Challenges exist but `friend_challenge_created/joined` are not
emitted (derivable from matches.inviteToken + participants, but invite
viewing/joining as an action is only partially inferable).

**3. Match — mostly a query gap, not an instrumentation gap:**
`match_started`, `offer_submitted`, `offer_rejected_rule`, `message_sent`,
`deal_accepted`, `walked_away`, `disconnect_started`, `disconnect_ended`
all exist as authoritative `match_events` rows and are derivable.
Genuine gaps: no derived emission layer for them (no reports/queries),
and `match_aborted_technical` (schema supports MATCH_ABORTED; no
emission/analytics path).

**4. Economy/result — partial gaps:**
`concession_chips_spent`, `clock_multiplier_changed_bucket` derivable
from rows; `result_viewed` (route exists, no event), `replay_opened`
(route exists, no event), `rating_changed` (not applicable until P1-M2).

**5. Retention — full gaps:**
`rematch_clicked`, `play_again_clicked` (UI exists: REMATCH button in
`result-reveal.tsx`, "Play again" on replay page, `rematch()` in
play/page.tsx — none instrumented), `profile_viewed`, `invite_sent`.

**6. Technical/quality gaps:**
- No `environment`/`service`/release tag on any analytics line (docs/11
  event-properties list has versions for matches; the emitted lines lack
  deployment identification).
- No client exception capture anywhere (grep for error handlers: none in
  app code).
- No analytics smoke test (emitted lines are never asserted in tests;
  CI runs no analytics check).

---

## C. CURRENT RELEASE / OBSERVABILITY MAP

### Logging
- Fastify built with `logger: false` (`app.ts`) — **all app logging is
  off**. Only `console.error` in `timeout-scheduler.ts` (scheduling
  faults) and `console.warn` in auth factory (default dev secret).
- No structured logger (06 §12 forbids adding a second logging library —
  Fastify's built-in pino is the sanctioned path).
- No request ids; no route-level access logging; no log levels.

### Error handling
- No `setErrorHandler` — Fastify defaults (500 with generic body).
- No `unhandledRejection`/`uncaughtException` handlers.
- `realtime.ts`: disconnect-freeze failure → `app.log.error` on a
  disabled logger (**silent**); heartbeat snapshot failures →
  `.catch(() => null)` (**silent**); socket-level errors uncounted.
- Client: `trackEvent` swallows failures by design; no other client error
  capture; Next error boundary presence not verified (none found in
  grep).

### Health / release identification
- `/health` returns `{ ok, service, version: '0.1.0' }` — version is
  hardcoded, no commit SHA, no environment.
- Per-match versioning is good (06 §11): gameRulesVersion,
  economyConfigVersion, ratingVersion, scenarioVersion stored per match.
- No build-time release identifier injected anywhere (no APP_VERSION/
  GIT_SHA env, no CI artifact, no deploy pipeline exists at all).

### CI (.github/workflows/ci.yml)
Solid for its stage: lint → typecheck → unit → db:deploy + seed → db
tests → build → Playwright E2E. Missing vs release-safety bar: analytics
smoke test, env-var check, release identification step, deployment job
(none exists — fine for now, flagged as gap for first public deploy).

### Deployment & environment
- Dev only: docker-compose (postgres 18 + redis 8). No Dockerfiles, no
  prod compose, no deploy scripts/config.
- Env: root `.env.example` (DATABASE_URL, REDIS_URL, Clerk keys, API
  port, DEV_AUTH_SECRET), `packages/db/.env.example` (DATABASE_URL +
  SHADOW_DATABASE_URL). Clerk keys injected by a deployment manager (M3);
  dev auth fails closed in production (`app.ts`, `adapters.ts`).
- Redis: provisioned in compose + env, **no code usage found** (dead
  infra; cleanup candidate).
- DB separation today: `bounty_bay` (dev), `bounty_bay_e2e` (W1 E2E),
  `bounty_bay_qa` (D-14), `bounty_shadow` (migration diffs), CI ephemeral
  postgres. D-4 migration review + `scripts/safe-reset.ts` guard exist.
- Single-instance assumptions: TimeoutScheduler and AiTurnEngine keep
  in-memory timers with bootScan re-arm (restart-safe, not multi-
  instance-safe) — fine for V1, documented risk for scaling.

### Tests
- Unit: vitest workspace (`packages/*/tests`, `apps/*/tests`), node env;
  db tests gated by `RUN_DB_TESTS=1` (`test:db`).
- E2E: Playwright two-context friend-match flow; isolated DB + alt ports
  via `E2E_*` env; strict and reuse modes; seed overrides for short
  timeouts.
- No analytics/telemetry assertions anywhere.

---

## D. TOP RISKS (ranked)

1. **Operational blindness.** Logger disabled + silent realtime catches +
   no client exception capture + no error telemetry → if the product
   fails technically for real players, we cannot see it. "Did the
   product fail technically?" is currently unanswerable in production.
2. **Funnel blindness (activation).** Zero onboarding instrumentation
   beyond users.createdAt: cannot see where users disappear between
   visit, auth, handle choice, first match. handle_created history is
   already lost for existing users.
3. **North-star sequence unmeasured.** docs/11 validation steps 3–4
   ("play again", "return later") hinge on rematch/replay/result events
   and retention derivation — none emitted; rematch is only indirectly
   inferable from match rows.
4. **Analytics sink fragility.** stdout-only lines carry no
   environment/release tag and vanish in CI/deploys; dev/test/prod noise
   cannot be separated; a dashboard built on these lines today would be
   broken data.
5. **No experiment/exposure infrastructure.** docs/11 EXP-001..005 are
   unsupported; Daily Deal "show first" (P1-M9, founder-gated) needs
   exposure recording BEFORE the feature ships or the experiment cannot
   be evaluated. Deliberate deferral, but the trap is retrofitting.
6. **Release identification absent.** No commit SHA/version/environment
   in logs or analytics → a bad deploy cannot be correlated with the
   version a user encountered.
7. **Ownership friction for instrumentation.** apps/api is worker-1's
   (D-2/D-11) and most of apps/web is worker-2's; every Phase 1 event
   needs an ownership ruling or those workers to land changes — risk of
   delay or scope drift if not scheduled explicitly.
8. **Data-quality risks in derived metrics.** match_events.payload is an
   open JSON object (Record<string, unknown>); derivation queries must
   tolerate unknown/missing fields. Immediate-rematch and active-day
   definitions are currently undefined — different ad-hoc definitions
   would produce different numbers.
9. **DB shadow-incident recurrence.** Policy and safe-reset exist; any
   future analytics table migration must go through manager review
   (D-4). Low residual risk, non-zero.
10. **Single-instance timers** (TimeoutScheduler/AiTurnEngine) — V1-fine,
    release-safety note before any multi-instance deployment.
