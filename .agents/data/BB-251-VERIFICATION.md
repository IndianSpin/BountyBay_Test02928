# BB-251 VERIFICATION — Data pass on main (2026-09-24, D-70 stabilization)

Verifier: Agent 6 (Data). Target: main `644ff28` (BB-251 merged via
`48d489a`, implementation commit `652423c`, incl. BB-253 socket origin
pinning). Method: diff conformance vs `BB-247-ALPHA-GAP.md`, my own
typecheck + unit run, live API boot (port 4400, `bounty_bay_e2e`,
JSON logs, `BB_ENV=e2e`, `BB_RELEASE=verify-644ff28`) + end-to-end
exercise of every new signal.

## Evidence

**Diff conformance: PASS.** All spec'd emission points present with
exact fields: `challenge_created` (201 path), `challenge_joined` (join
success, `row.mode` — better than my literal 'FRIEND_LIVE'), 
`match_started` in `commitAndBroadcast` (MATCH_STARTED-gated) AND
rematch-routes accept (analytics param added), engine
`match_completed` + `time_tier_entered` beside the broadcast site
(`now` in scope), 6-name client enum, `bay_viewed` accepted by the
API, `feedback_submitted` reserved in `AnalyticsEventName`.

**My runs:** typecheck clean; unit **301 passed / 80 skipped**
(matches manager gate; includes alpha-gap 7/7 + realtime suites).

**Live end-to-end (all counts exact):**
- 2 signup_completed (2 users) — exactly-once holds.
- Friend flow: `challenge_created` (role SELLER) → `challenge_joined`
  (role BUYER) → `match_started` (playerId null, FRIEND_LIVE) → deal
  → `match_completed` (ACCEPTED) → `result_viewed` ×1.
- **AI-practice engine path (the BB-247 headline gap):** create
  (persona closer) → human READY → `match_started` (mode AI) → bot
  countered via engine → human offer accepted by the bot's ENGINE
  command → `match_completed` (mode AI, completionReason ACCEPTED,
  per-player time/multiplier fields). **The previously-invisible
  first-alpha path now emits both funnel signals.**
- `bay_viewed` POST → 200 + correct line (playerId server-added, no
  matchId, client tags optional).
- Tag order on every line: analytics_event → environment → release →
  service → fields → emitted_at; `verify-644ff28` everywhere.
- Privacy: 0 reservationValue occurrences in the full log.

**Counts:** match_started 2, match_completed 2, result_viewed 1,
signup_completed 2 — no duplicates, no missing signals.

## Scope boundaries (stated, not hidden)
- BB-253 (socket origin pinning, same commit): security/realtime —
  manager-gated with its own realtime tests; not re-verified by me.
- Web-side BB-230 call sites (rematch_clicked on the REMATCH button,
  play_again_clicked on the replay anchor, ErrorCatcher firing
  client_exception): merged + manager-gated in `24ef96d`; this pass
  verifies the API accepts all names and shapes. Browser-level
  re-verification of those call sites remains a QA/BB-249-adjacent
  item — the API-side contract they depend on is verified here.
- `feedback_submitted`: name reserved; no emitter until BB-248's
  route ships (correct per contract).

## Verdict
**BB-251 conforms to spec; all alpha funnel signals verified emitting.**
No defects found. Recommend formal ACCEPT.
