# BB-247 — ALPHA ANALYTICS VERIFICATION + GAP SPEC (D-64)

Author: Agent 6 (Data). Target: main `acf1cc1` (2026-09-24). Verified
against current code: BB-229 (api telemetry) + BB-233 (parser-400 fix)
+ BB-230 (web telemetry, merged `24ef96d`) are all in.

## 1. Alpha signal coverage table

| # | Alpha signal (D-64) | Measured today? | Smallest addition |
|---|---|---|---|
| 1 | signup completed | ✅ `signup_completed` (BB-229, §5-verified, Clerk + dev paths) | — |
| 2 | Bay viewed | ❌ | `bay_viewed` — client event on play-page mount (§2.1) |
| 3 | challenge created | ❌ | `challenge_created` — server, challenge 201 path (§2.2) |
| 4 | challenge joined | ❌ | `challenge_joined` — server, join success path (§2.3) |
| 5 | match started | ❌ | `match_started` — server, MATCH_STARTED commit paths (§2.4) |
| 6 | match completed | ⚠️ PARTIAL — fires on HTTP commands + timeouts; **AI-practice completions (engine-driven) emit nothing** (engine/ai-routes have 0 analytics references) | `match_completed` in AiTurnEngine commit path (§2.5) — the likely first-alpha path |
| 7 | result viewed | ✅ `result_viewed` (BB-229, §5-verified, dedup) | — |
| 8 | rematch requested | ✅ `rematch_clicked` (BB-230, merged) — client best-effort; server truth derivable from `rematchFromMatchId` rows | — |
| 9 | second match started | ✅ derivable — count `match_started` per user ≥ 2 (also from `matches.startedAt`) | derivation query only (§3) |

Plus: `feedback_submitted` event contract for BB-248 (§2.6).

## 2. Event schemas (W1 implements; exact fields + places)

All ride the existing stdout emitter with the BB-229 common fields
(environment / release / service). Privacy: PSEUDONYMOUS, no RV, no
free text in analytics lines.

### 2.1 `bay_viewed` — client (authenticated)
- PURPOSE: "enters The Bay" — the Bay hub mount (SH-BayIA,
  `apps/web/src/app/bay/page.tsx`). Landing title screen is NOT
  counted (signup is the first observable landing step; landing views
  remain deliberately unmeasured in V1).
- **SURFACE RULING (post-D-66):** W2 implemented on the Bay hub
  (`bay/page.tsx:63`), not `play/page.tsx` as this spec originally
  wrote. Agent 6 confirmed 2026-09-24: the Bay hub is the faithful
  mapping of the directive's "enters The Bay" (post-account hub with
  the gold table); the play page is the match-flow screen. No
  reconciliation needed — spec file reference superseded by the hub.
- WEB (`apps/web/src/lib/analytics.ts`): add to `ClientEventName`.
- WEB (`apps/web/src/app/play/page.tsx`): in the existing
  `useApiToken` consumer, add
  `useEffect(() => { if (ready && token) trackEvent('bay_viewed', token); }, [ready, token]);`
  Semantics: once per token resolution (a new tester identity fires
  again — documented possibly-repeated).
- API (`apps/api/src/app.ts`): add `'bay_viewed'` to the
  `analyticsEventSchema` name enum (6th name).
- FIELDS: `playerId` (server-added), `client_environment`,
  `client_release` (auto) — no matchId.

### 2.2 `challenge_created` — server, PSEUDONYMOUS
- PURPOSE: friend-challenge funnel (docs/11 friend_challenge_created).
- WHEN: `POST /v1/challenges` success — emit immediately before
  `return reply.code(201).send({...})` (`apps/api/src/match-routes.ts`
  ~line 209).
- FIELDS: `matchId` (created.matchId), `playerId` (request.userId),
  `mode` ('FRIEND_LIVE'), `role` (assignment.role).

### 2.3 `challenge_joined` — server, PSEUDONYMOUS
- PURPOSE: docs/11 friend_challenge_joined.
- WHEN: `POST /v1/challenges/:token/join` success — emit immediately
  before the success `return {` (match-routes ~line 240).
- FIELDS: `matchId` (row.id), `playerId` (request.userId), `mode`,
  `role` (assignment.role).

### 2.4 `match_started` — server, PSEUDONYMOUS
- PURPOSE: core funnel FIRST/SECOND MATCH START; matches/day.
- WHEN: wherever a MATCH_STARTED domain event is committed.
  - Site A — `apps/api/src/match-routes.ts` `commitAndBroadcast`:
    after the snapshot loads, beside the existing match_completed
    emission:
    `if (outcome.events.some((e) => e.type === 'MATCH_STARTED')) options.analytics?.emit('match_started', { matchId, playerId: null, mode: snapshot.state.mode });`
    This covers friend READY×2 AND AI-practice human READY (same route).
    playerId: null — it is a match-level event, not per-player (the two
    participants are derivable; keep lines lean).
  - Site B — `apps/api/src/rematch-routes.ts` accept success: pass
    `analytics` into `RematchRoutesOptions` (app.ts registration call)
    and after `accepted.ok` emit
    `analytics?.emit('match_started', { matchId, playerId: null, mode: 'FRIEND_LIVE' });`
    (acceptRematch's stream opens with MATCH_STARTED — command-service
    comment confirms).
- FIELDS: `matchId`, `mode`, `playerId` (null for match-level).

### 2.5 `match_completed` for AI-engine completions — server
- GAP: `apps/api/src/ai/engine.ts` has no analytics (grep: 0 refs).
  AI-practice matches complete via engine accept/walk-away with
  broadcast only → no match_completed line. Volunteer testers' first
  match will almost certainly be AI practice.
- CHANGE: add optional `analytics?: AnalyticsEmitter` to
  `AiTurnEngineOptions`; in the engine's commit/broadcast site (~line
  132, `this.options.broadcast(matchId, committed.events, after)`), add:
  `if (committed.events.some((e) => e.type === 'MATCH_COMPLETED') && after) this.options.analytics?.emit('match_completed', matchCompletedFields(after.state));`
  (import from './analytics' — same module as match-routes uses; no new
  deps). Also emit `time_tier_entered` entries there for parity with
  commitAndBroadcast (optional — recommended for consistency).
- `apps/api/src/app.ts`: construct the engine with
  `analytics` (line ~215 `new AiTurnEngine({ service, prisma, broadcast })` → add `analytics`).
- No change for AI match_started: the human READY already goes through
  commitAndBroadcast (site A).

### 2.6 `feedback_submitted` — contract for BB-248 (server, PSEUDONYMOUS)
- PURPOSE: alpha feedback capture observability (BB-248 = W1 api + W2
  ui; this is the analytics contract the route should emit).
- WHEN: BB-248's feedback endpoint stores a feedback row successfully.
- FIELDS: `playerId`, `source` ('home' | 'result' | 'review' | 'other'
  — from the request), `characterCount` (length bucket only: number).
- PRIVACY RULE: the feedback TEXT goes to BB-248's storage row, NEVER
  into analytics lines or logs (docs/10: no free-text dumping). The
  event carries counts and ids only.

## 3. Derivation queries (alpha observability; authoritative rows)

No dashboards, no platform. Paste-run SQL against the hosted Postgres
(BB-246 runbook owns access; `BB_ENV=production` tagging applies to
the emitted lines, which Railway log capture retains). Rows are the
truth; analytics lines are the stream.

```sql
-- DAU (active day = >=1 match started that calendar day; approved definition)
SELECT date_trunc('day', started_at) AS day, count(DISTINCT p.user_id) AS dau
FROM matches m JOIN match_participants p ON p.match_id = m.id
WHERE m.started_at IS NOT NULL
GROUP BY 1 ORDER BY 1;

-- Unique testers (any account ever)
SELECT count(*) AS unique_testers, count(*) FILTER (WHERE is_bot = false) AS humans
FROM users;

-- Matches per tester
SELECT p.user_id, count(DISTINCT m.id) AS matches
FROM match_participants p JOIN matches m ON m.id = p.match_id
WHERE m.started_at IS NOT NULL
GROUP BY 1 ORDER BY 2 DESC;

-- Match completion (started → terminal)
SELECT count(*) FILTER (WHERE m.started_at IS NOT NULL) AS started,
       count(*) FILTER (WHERE m.completed_at IS NOT NULL) AS completed,
       round(100.0 * count(*) FILTER (WHERE m.completed_at IS NOT NULL)
             / NULLIF(count(*) FILTER (WHERE m.started_at IS NOT NULL), 0), 1) AS completion_pct,
       mode
FROM matches m GROUP BY mode;

-- Immediate rematch rate (approved window: next match started within
-- 10 min of the user's previous completed match)
WITH user_matches AS (
  SELECT p.user_id, m.id, m.started_at, m.completed_at
  FROM match_participants p
  JOIN matches m ON m.id = p.match_id
  WHERE m.started_at IS NOT NULL
),
ordered AS (
  SELECT *, lag(completed_at) OVER (PARTITION BY user_id ORDER BY started_at) AS prev_completed
  FROM user_matches
)
SELECT
  count(*) FILTER (WHERE prev_completed IS NOT NULL
                    AND started_at - prev_completed <= interval '10 minutes') AS immediate_rematches,
  count(*) FILTER (WHERE prev_completed IS NOT NULL) AS total_replays,
  round(100.0 * count(*) FILTER (WHERE prev_completed IS NOT NULL
                    AND started_at - prev_completed <= interval '10 minutes')
        / NULLIF(count(*) FILTER (WHERE prev_completed IS NOT NULL), 0), 1) AS immediate_rematch_pct
FROM ordered;

-- Second-match conversion (funnel tail)
SELECT count(DISTINCT p.user_id) AS started_first,
       count(DISTINCT p.user_id) FILTER (WHERE m2.matches >= 2) AS started_second
FROM match_participants p
JOIN (SELECT p2.user_id, count(*) AS matches
      FROM match_participants p2 JOIN matches mm ON mm.id = p2.match_id AND mm.started_at IS NOT NULL
      GROUP BY 1) m2 ON m2.user_id = p.user_id;
```

(SQL is indicative of semantics — W1 lands the exact `alpha-report`
script; I verify outputs against emitted lines.)

## 4. W1 implementation notes

- All additions are in files W1 already owns (`match-routes.ts`,
  `rematch-routes.ts`, `ai/engine.ts`, `app.ts` schema enum) — no new
  files except optionally `packages/db/scripts/alpha-report.ts` for §3.
- No new dependencies. No schema change. The `bay_viewed` name in the
  web lib is W2's file — one-line enum addition; route per D-64
  (BB-247 scope says W1 implements the server side; the web `bay_viewed`
  call site is one line for W2 or W1-under-W2-approval — flag to
  manager if ownership friction).
- EVENT_CATALOG.md: add all five names with the above fields/privacy
  classes.

## 5. Acceptance checklist (W1)
- [ ] `challenge_created`/`challenge_joined`/`match_started`/
      `match_completed`(engine) emit with exact fields (unit tests:
      capture sink).
- [ ] AI practice full match (create → ready → engine accept) produces
      match_started + match_completed lines (integration test with
      mocked engine commit or da-p1 style).
- [ ] Rematch accept produces match_started.
- [ ] `bay_viewed` accepted by the API (6-name enum) and 400 on
      unknown names still holds.
- [ ] Privacy: no new line carries RV/text (hidden-information audit
      extended).
- [ ] Alpha-report script returns sane numbers on the e2e/dev DB.
- [ ] Typecheck/lint/unit green.

## 6. Alpha observation path (note for BB-246 runbook)
Emitted lines go to Railway log capture (stdout). For ALPHA-1 the
observability loop is: Railway logs (stream) + the §3 queries against
hosted Postgres + BB-248 feedback rows. `BB_ENV=production`,
`BB_RELEASE=<sha>` must be set by the deploy (release identification
for "which version did the tester meet").
