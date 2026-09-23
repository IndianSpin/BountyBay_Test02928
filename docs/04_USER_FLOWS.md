# User Flows

## UF-01 — First-time user

1. Land on Bounty Bay.
2. See short proposition and `Play` CTA.
3. Authenticate/create account.
4. Choose anonymous public handle.
5. Receive a minimal tutorial explaining: private limit, legal offer direction, accept, walk away, chips, personal clock.
6. Choose `Live Human`, `Practice vs AI`, `Challenge Friend`, or `Async`.
7. Enter first match.
8. Complete match.
9. See reveal/result.
10. Primary CTA: `Rematch / Play Again`.

Target: a motivated user should be able to enter their first playable negotiation with minimal reading.

## UF-02 — Ranked live human

1. User selects `Ranked Human`.
2. Server enters matchmaking queue.
3. Match found; both players confirm/readiness.
4. Server selects scenario, roles, private RVs, first mover, balance-config version.
5. Role reveal screen shows asset/context, role, RV, short BATNA narrative, rules summary.
6. Both acknowledge ready.
7. Match activates; first mover clock begins.
8. Players alternate valid numerical offers; chat may occur anytime.
9. Active player accepts, concedes, or walks away.
10. Match ends.
11. Result/reveal + rating update.
12. `Play Again` / profile / replay.

## UF-03 — No human immediately available

1. User enters human matchmaking.
2. Search runs for configurable period.
3. Do not trap user on a dead loading screen.
4. Offer options:
   - continue waiting / notify when match found;
   - play AI now;
   - create friend challenge;
   - browse async matches.
5. AI transition must explicitly state opponent is AI and match is unrated.

Exact search duration is a product config, not a domain rule.

## UF-04 — Friend challenge

1. User creates challenge link.
2. Scenario may be random in V1.
3. Recipient opens link, authenticates/chooses handle.
4. Both ready.
5. Live human match follows standard game rules.
6. V0.1 friend challenges are unranked to prevent rating boosting.
7. End screen encourages recipient to enter ranked matchmaking.

## UF-05 — AI practice

1. User chooses AI opponent or accepts AI fallback.
2. User chooses difficulty/style if enabled; otherwise default bot.
3. Match rules identical to live core rules where applicable.
4. AI identity is explicit.
5. No canonical Bounty Rating change.
6. Result still reveals RV/ZOPA and economy metrics.

AI numeric actions must pass the same server validation as human actions.

## UF-06 — Async experimental

1. User opts into correspondence/async mode.
2. Match is created with same role/RV/offer rules.
3. Players receive turn notifications.
4. Async match is unrated.
5. Exact response deadlines and clock/economy behavior remain unresolved and must be defined before implementation is enabled.

## UF-07 — Live disconnect

1. Server detects active socket disconnect.
2. UI marks opponent/player disconnected.
3. Active live clock freezes after technical debounce.
4. Reconnect restores room and authoritative match state.
5. Active player's clock resumes if still their turn.
6. If reconnect window expires, apply configured technical-abandonment policy.
7. Technical aborts do not affect canonical rating unless explicit abuse rules later say otherwise.

## UF-08 — Result screen

Deal result shows:

- settlement;
- both RVs;
- ZOPA;
- each player's surplus share;
- each clock multiplier and active time;
- concession chips spent;
- gross reward;
- net match result;
- rated/unrated status;
- rating change if eligible.

No-deal result shows:

- both RVs and ZOPA;
- offer path;
- zero bounty earned;
- concession spend;
- rated handling according to rating spec;
- rematch CTA.

## UF-09 — Public profile

Public profile shows:

- handle;
- canonical Bounty Rating;
- rated games played;
- agreement rate;
- average surplus captured in completed rated deals.

Do not show private identity, email, individual hidden RV history, or moderation/security signals.
