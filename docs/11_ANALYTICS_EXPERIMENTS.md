# Analytics and Experiments

## Purpose

V1 exists to determine whether the core game deserves more investment. Analytics are therefore product-critical, not an afterthought.

## North-star validation sequence

1. People start a match.
2. People finish it.
3. People voluntarily play again.
4. People return later.
5. Human skill/performance persists across games.
6. Players care about rating/results.
7. Some later pay for consequences, insight, or premium competition.

## Required events

Account/product:

- `signup_completed`
- `handle_created`
- `tutorial_started`
- `tutorial_completed`
- `play_mode_selected`

Matchmaking:

- `matchmaking_started`
- `matchmaking_cancelled`
- `match_found`
- `match_ready`
- `ai_fallback_offered`
- `ai_fallback_selected`
- `friend_challenge_created`
- `friend_challenge_joined`

Match:

- `match_started`
- `offer_submitted`
- `offer_rejected_rule`
- `message_sent`
- `deal_accepted`
- `walked_away`
- `disconnect_started`
- `disconnect_ended`
- `match_completed`
- `match_aborted_technical`

Anti-stalling / time (DD Phase 1):

- `match_timed_out` — once per timeout: match_id, mode, timed-out player, cumulative active ms at timeout
- `time_tier_entered` — once per match per player per tier: tier, remaining ms, at-offset
- `match_completed` extension — completion_reason (ACCEPTED / WALKED_AWAY / TIMED_OUT / ABORTED), per-player cumulative_active_ms and clock_multiplier

Economy/result:

- `concession_chips_spent`
- `clock_multiplier_changed_bucket`
- `result_viewed`
- `replay_opened`
- `rating_changed`

Retention:

- `rematch_clicked`
- `play_again_clicked`
- `profile_viewed`
- `invite_sent`

## Event properties

Where relevant capture:

- match_id;
- mode;
- human/AI opponent;
- scenario version;
- game/economy/rating versions;
- buyer/seller role;
- first/second mover;
- offer index;
- amount normalized metrics (avoid raw value in broad analytics if not needed);
- concession magnitude/cost;
- active time;
- final surplus share;
- deal/no-deal;
- rating band.

Do not place private RV in third-party analytics payloads unless explicitly required and privacy-reviewed. Server-side research tables may contain it.

## Primary metrics

### Activation

- signup -> first match start;
- first match completion;
- time to first negotiation.

### Immediate appeal

- **voluntary immediate replay rate**;
- matches in first session;
- friend challenge creation.

### Retention

- D1, D7, D30 return;
- games/user/week;
- % sessions containing human match.

### Liquidity

- median/p95 human matchmaking wait;
- % searches resulting in human match;
- % selecting AI fallback;
- abandonment while waiting.

### Game health

- deal rate;
- median rounds/offers per match;
- median match duration;
- distribution of surplus share;
- clock multiplier distribution;
- concession spend distribution;
- first-mover advantage;
- buyer/seller advantage;
- strategy concentration/extreme-anchor frequency.

### Stonewalling / time health (DD Phase 1)

- timeout rate and walk-away rate (kept distinct — GR-024);
- time at multiplier floor: share of matches where a player reaches
  `cumulative_active_ms >= clock_floor_ms`, and floor dwell time;
- average time between formal offers (from OFFER_SUBMITTED event rows);
- % of matches reaching CRITICAL tier;
- no-deal rate decomposed by completion reason (TIMED_OUT vs WALKED_AWAY).

Implementation note: Phase 1 emits these as structured server log lines
(no SDK/table); the analytics platform and dashboards ship with P1-M9.
Event rows already persisted (MatchEvent) remain the source for
offer-cadence metrics.

### Skill signal

- repeat-player surplus-share consistency;
- predictive power of rating for future performance;
- stronger-rated vs weaker-rated expected outcome;
- learning curve over first N games.

## Early experiment priorities

### EXP-001 — Is consequence necessary?

Compare plain free play vs visible rating/tournament-like stakes (still non-cash) on rematch and retention.

### EXP-002 — Clock intensity

Test different `T_floor` / curve shapes while preserving 30% floor. Measure no-deal, decision time, concession depth, and replay.

### EXP-003 — Concession economy

Test cost curves for micro-concession suppression without causing single-jump convergence.

### EXP-004 — Theme intensity

Compare restrained competitive asset presentation against more playful/fantasy framing. Outcome: signup conversion, rematch, perceived consequence.

### EXP-005 — AI fallback

Measure whether AI keeps cold-start users engaged and whether they later convert to human play.

## Proposed—not industry-standard—early gates

These are internal hypotheses, not external benchmarks:

- immediate replay >= 40%: encouraging;
- immediate replay < 20% after UX stabilization: serious concern;
- D7 >= 15% in recruited competitive niche: encouraging;
- D7 < 7% after onboarding/game fixes: consider major redesign;
- no-deal rate between roughly 10–40%: potentially healthy test range; extremes indicate incentive problems;
- measurable rating-performance relationship after sufficient matches: required before claiming skill ranking.

Do not optimize metrics blindly. A prize campaign that creates signups but zero post-event play is acquisition, not product-market fit.

## Implementation status (IN-2, DEC-028 §41)

Implemented via POST /v1/analytics/event (authenticated, rate-limited,
stdout sink until P1-M9): `review_opened`, `review_step_viewed`.
