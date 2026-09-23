# EVENT CATALOG — Bounty Bay analytics events

Living catalog (role spec: maintain an explicit event catalog; prevent
duplicate synonyms). Status: **IMPLEMENTED** = emitting today (main
`8be2347`); **PLANNED** = Phase 1 proposal awaiting manager/founder
approval (`.agents/data/FOUNDATION_PLANS.md`); everything else in docs/11
stays NOT PLANNED until scheduled.

Privacy classes: PUBLIC / PSEUDONYMOUS / PRIVATE / SENSITIVE GAME STATE.
Rules: never RV values in analytics payloads (docs/10 Logging, docs/11);
match/player ids are PSEUDONYMOUS (stable ids, no handles in analytics
lines); `isBot` distinguishes bots from humans (data quality).

## IMPLEMENTED

### match_timed_out
- Purpose: stonewalling/time health (GR-023/GR-024) — timeout rate.
- When: TimeoutScheduler commits a TIMEOUT (once per timeout).
- Source: server (`apps/api/src/timeout-scheduler.ts`).
- Required: matchId, mode, playerId, cumulativeActiveMs.
- Optional: —. Privacy: PSEUDONYMOUS. Version: DD Phase 1. Owner: worker-1
  area (emitter in apps/api).

### time_tier_entered
- Purpose: % of matches reaching LOW/CRITICAL warning tiers.
- When: tier becomes visible to a player (dedup per match/player/tier).
- Source: server (scheduler + match-routes commitAndBroadcast).
- Required: matchId, playerId, tier, decisionTimeRemainingMs.
- Privacy: PSEUDONYMOUS. Version: DD Phase 1. Owner: worker-1 area.

### match_completed
- Purpose: completion + completion reason + per-player time/multiplier
  (docs/11 extension).
- When: MATCH_COMPLETED committed (deal, walk-away, timeout, abort).
- Source: server (match-routes + scheduler).
- Required: matchId, mode, completionReason, cumulativeActiveMs:{player},
  clockMultiplier:{player}.
- Privacy: PSEUDONYMOUS. Version: DD Phase 1. Owner: worker-1 area.

### review_opened
- Purpose: Game Review usage (IN-2).
- When: review page loads (client), authenticated.
- Source: client → POST /v1/analytics/event.
- Required: playerId (server-added), matchId.
- Privacy: PSEUDONYMOUS. Version: IN-2 (DEC-028 §41). Owner: worker-3
  feature, emitter shared.

### review_step_viewed
- Purpose: review engagement depth.
- When: review step navigation (client).
- Source: client → POST /v1/analytics/event.
- Required: playerId, matchId. Privacy: PSEUDONYMOUS. Version: IN-2.
  Owner: worker-3 feature, emitter shared.

## PLANNED (Phase 1 proposal — pending approval)

All PLANNED server events ride the existing stdout emitter (P1-M9 swap
point) with added common fields (see below). Client events ride the
existing POST /v1/analytics/event.

### handle_created — server, PSEUDONYMOUS
- Purpose: core funnel (AUTH → HANDLE step).
- When: UserRepository.setHandle succeeds the FIRST time (handle set;
  later changes are not handle_created).
- Source: server (apps/api user service call site).
- Required: playerId, eventSequence n/a, createdAt (server now).
- Note: history for existing users is already lost (flag, not fixable).

### signup_completed — server, PSEUDONYMOUS
- Purpose: funnel entry + new-users metric reconciliation.
- When: ensureUserBySubject CREATES the user row (not on re-signin).
- Source: server.
- Required: playerId, authProvider (dev/clerk).

### challenge_created / challenge_joined — server, PSEUDONYMOUS
- Purpose: docs/11 friend_challenge_* events; friend-challenge funnel.
- When: POST /v1/challenges succeeds (201) / POST /v1/challenges/:token/
  join succeeds.
- Source: server (match-routes).
- Required: matchId, role, mode. Optional: hasInvite.

### result_viewed — server, PSEUDONYMOUS
- Purpose: core funnel RESULT VIEWED step + reveal engagement.
- When: GET /v1/matches/:matchId/result succeeds (dedup per
  (match,user) in-process; repeat fetches documented as possible).
- Source: server (match-routes).
- Required: matchId, playerId.

### replay_opened — server, PSEUDONYMOUS
- Purpose: replay usage.
- When: GET /v1/matches/:matchId/events from the replay page — requires
  a client hint (query param) so reconnect fetches are not counted.
- Source: client-triggered, server-validated.
- Required: matchId, playerId.

### rematch_clicked / play_again_clicked — client, PSEUDONYMOUS
- Purpose: immediate appeal metric (north-star step 3).
- When: REMATCH button (`result-reveal.tsx`) / "Play again" (replay page).
- Source: client → POST /v1/analytics/event.
- Required: matchId (rematch), playerId. Note: actual rematch behavior is
  ALSO derived server-side (next match started within window) — the
  click measures intent, the derivation measures behavior.

### play_mode_selected — client or server, PSEUDONYMOUS
- Purpose: AI practice vs friend challenge choice.
- When: play page commits a mode choice. Server-side (challenge creation
  / AI match creation) is authoritative; client event only if a UI-only
  selection exists.
- Source: TBD by implementation review (prefer server).

### client_exception — client, PSEUDONYMOUS
- Purpose: reliability dashboard (uncaught client errors).
- When: window error / unhandled promise rejection in web app.
- Source: client → POST /v1/analytics/event.
- Required: message (truncated/sanitized — no secrets, no PII), stack
  head, url path, appVersion. Optional: matchId if known.

## Proposed common fields (every line, all events — pending approval)

- `environment` (development/e2e/qa/production) — set at boot.
- `release` (commit SHA short + package version) — set at boot.
- `service` (api/web) — implicit per emitter.
- `emitted_at` already present; keep server-now semantics.

## Naming guard (anti-duplication)

One canonical name per concept — reject: match_finished, match_ended,
game_finished, match_complete, deal_closed, agreement_reached, etc. The
catalog is the arbiter; new names come only through this file (proposed
to the manager, applied after approval).
