# API and Realtime Contracts

This is a contract-level specification. Exact URL naming may evolve, but semantic behavior and error codes must remain explicit.

## Conventions

- JSON over HTTPS for request/response APIs.
- Socket.IO for realtime committed-event delivery and presence.
- IDs are opaque UUID strings.
- Amounts cross APIs as integer tenths: `473` means `47.3`.
- Client-generated `command_id` UUID is required for idempotent mutations.
- Server timestamps are ISO-8601 UTC.

## GET `/v1/me`

Returns authenticated profile and entitlements.

## GET `/v1/profiles/:handle`

Public fields only:

```json
{
  "handle": "BlackParrot",
  "bountyRating": 1512,
  "ratedGames": 42,
  "agreementRate": 0.79,
  "averageSurplusShare": 0.54
}
```

## POST `/v1/matchmaking/tickets`

Request:

```json
{ "mode": "RANKED_LIVE" }
```

Response contains ticket state. Server rejects if user is already in an incompatible active match/queue.

## DELETE `/v1/matchmaking/tickets/:id`

Cancel waiting ticket.

## POST `/v1/challenges`

Creates an unrated friend challenge and share token.

## POST `/v1/challenges/:token/join`

Joins challenge if valid and available.

## GET `/v1/matches/:matchId`

Returns role-scoped match snapshot.

Critical rule: pre-result response contains `myReservationValueTenths` but never the opponent's reservation value.

Scenario content follows the same role-scoping discipline (DEC-024 follow-up):

```json
"scenario": {
  "id": "uuid",
  "version": 1,
  "title": "The Ruby Compass",
  "description": "A fabled instrument…",
  "sharedContext": "A private sale after the wharf closes…",
  "myNarrative": "You have authority to acquire…",
  "myPrivateContext": "…",
  "myPrivateFacts": [
    { "id": "compass-s1", "text": "…", "category": "URGENCY", "verifiable": false }
  ]
}
```

- `title`, `description` and `sharedContext` are shared context, visible to
  both participants.
- `myNarrative`, `myPrivateContext` and `myPrivateFacts` are the VIEWER'S
  OWN role content only (GR-028 dossier data; number-free by domain
  validation — no RV-equivalent leakage).
- The opponent's role content is NEVER serialized to any participant
  payload, pre- or post-result. It is server-private with the same severity
  as the reservation value (SI-001).
- The pre-join (challenge waiting) response uses the same `scenario` shape.

## POST `/v1/matches/:matchId/ready`

Marks player ready. Match starts only when both ready and server state permits.

## POST `/v1/matches/:matchId/offers`

Request:

```json
{
  "commandId": "uuid",
  "amountTenths": 473
}
```

Possible success response:

```json
{
  "eventSequence": 18,
  "offerId": "uuid",
  "amountTenths": 473,
  "concessionCostChips": 3,
  "remainingConcessionChips": 91,
  "nextActivePlayerId": "uuid",
  "serverTimestamp": "2026-09-21T12:00:00Z"
}
```

Error codes:

- `MATCH_NOT_ACTIVE`
- `NOT_YOUR_TURN`
- `INVALID_AMOUNT`
- `AMOUNT_OUT_OF_RANGE`
- `OUTSIDE_RESERVATION_VALUE`
- `NON_MONOTONIC_CONCESSION`
- `DUPLICATE_OFFER`
- `INSUFFICIENT_CONCESSION_CHIPS`
- `TIMED_OUT` — the active player's hard decision-time budget is exhausted (GR-023); the command is rejected and never commits
- `COMMAND_ALREADY_PROCESSED`

## POST `/v1/matches/:matchId/accept`

Request:

```json
{ "commandId": "uuid", "offerId": "uuid" }
```

Errors:

- `OFFER_NOT_CURRENT`
- `OFFER_NOT_ACCEPTABLE_BY_RESERVATION`
- `MATCH_NOT_ACTIVE`
- `NOT_YOUR_TURN`
- `TIMED_OUT` (GR-023)

Success atomically completes match.

## POST `/v1/matches/:matchId/walk-away`

Ends match as no-deal. Must be idempotent. Errors include `TIMED_OUT`
(GR-023) — after the hard decision-time limit, walk-away is superseded by
the timeout transition.

## POST `/v1/matches/:matchId/messages`

Request:

```json
{ "commandId": "uuid", "body": "I can move, but not much." }
```

Constraints:

- length limit configurable;
- rate limit;
- moderation pipeline;
- does not affect turn/clock.

## GET `/v1/matches/:matchId/result`

Available to participants after completion. Returns full reveal and transparent calculations.

## GET `/v1/matches/:matchId/events?afterSequence=N`

Participant-authorized replay/reconnect endpoint.

## Timeout contract (GR-023/GR-024, DD Phase 1)

- There is **no client route** that triggers the timeout. Timeout is a
  server-only command submitted by the server's scheduler when the active
  player's cumulative decision time reaches `hardDecisionTimeLimitMs`
  (server clock, SI-002/SI-009). `TIMEOUT_NOT_DUE` is a server-internal
  validation error, never producible through a client request.
- The transition is delivered over the existing channels: the `TIMED_OUT`
  and `MATCH_COMPLETED` events ride `match:event`, and the terminal
  `match:state` view carries `completionReason: "TIMED_OUT"`.
- Snapshot and result payloads gain per-participant fields:

```json
"participants": [ { "playerId": "uuid", "decisionTimeRemainingMs": 41000, "timeTier": "LOW_TIME", "…": "…" } ]
```

- `decisionTimeRemainingMs`: `max(0, limit − elapsed)` for the active
  player's running clock, null when the config has no limit or the match is
  terminal. Both participants see it (GR-016).
- `timeTier`: `NORMAL` / `LOW_TIME` / `CRITICAL` / null, derived
  server-side from the config thresholds; clients render it and never
  compute the rule.

## Socket.IO events — server to client

- `match:state`
- `match:event`
- `match:clock-sync`
- `match:opponent-disconnected`
- `match:opponent-reconnected`
- `match:completed`
- `matchmaking:found`

Every `match:event` includes monotonic `eventSequence`.

## Socket.IO commands

Prefer HTTP for critical state mutation in early V1 unless realtime UX requires socket commands. If socket commands are used, they must call the exact same command-service/domain functions and idempotency checks as HTTP.

Never maintain a second implementation of game rules for sockets.

## AI opponent internal interface

```text
OpponentAgent.decide(context) ->
  OfferIntent | AcceptIntent | WalkAwayIntent | MessageIntent[]
```

The context contains only information legally visible to that AI player plus its own private RV. Generated intents pass standard domain validation.

### Concrete AI contract (P1-M1, DEC-025)

```ts
interface AgentContext {
  view: MatchView;   // viewMatchFor(state, aiPlayerId, now, config): role-scoped;
                     // the opponent's RV is structurally absent pre-terminal
  now: number;       // server-authoritative ms epoch (same value as the stamped command)
  rng: () => number; // deterministic per-match entropy (seeded from matchId + persona)
  chatAllowed: boolean; // engine-set: false on the re-decide after a flavor batch — one chat batch per turn max
}

type OfferIntent    = { kind: 'OFFER';     offerId: string; amountTenths: number };
type AcceptIntent   = { kind: 'ACCEPT';    offerId: string };
type WalkAwayIntent = { kind: 'WALK_AWAY' };
type MessageIntent  = { kind: 'MESSAGE';   messageId: string; body: string };

type AgentDecision = OfferIntent | AcceptIntent | WalkAwayIntent | MessageIntent[];
```

Intents carry no `playerId`, `now`, or `commandId` — the turn engine stamps
all three (server-authoritative ids and time), then commits through the
exact same row-locked idempotent command service as human commands. An
illegal intent (a bug) triggers a fallback ladder (legal accept → walk
away) so a live match can never wedge. AI players are seeded bot users
(`users.is_bot`); bots cannot authenticate or sign in, and bot profiles are
never publicly served.

### POST /v1/matches/ai

Creates an unrated practice match against one persona (`mode: AI`,
`ratingVersion: null` — GR-019, DEC-004). Protected; rate limit 20/min.

Request:

```json
{ "commandId": "uuid", "persona": "anchor | grinder | closer | wall | mirror" }
```

201:

```json
{
  "matchId": "uuid",
  "mode": "AI",
  "unrated": true,
  "persona": { "key": "closer", "displayName": "The Closer", "handle": "TheCloser", "blurb": "..." },
  "aiPlayerId": "uuid",
  "role": "BUYER",
  "reservationValueTenths": 621,
  "aiReady": true,
  "scenario": { "id": "uuid", "title": "...", "description": "..." }
}
```

Errors: `INVALID_REQUEST` (bad body), `INVALID_PERSONA`, `NO_SCENARIO_AVAILABLE`, `AI_UNAVAILABLE`.

### Snapshot / result additions

`GET /v1/matches/:matchId` and `GET /v1/matches/:matchId/result` gain:

```json
"aiOpponents": [ { "playerId": "uuid", "personaKey": "closer", "displayName": "The Closer" } ]
```

Empty for human matches. Narrative/RV scoping rules are unchanged (GR-018).

### GET /v1/me/active-match

Resume support: the first of the caller's matches with status
CREATED/READY/ACTIVE/PAUSED, newest first.

```json
{ "activeMatch": { "matchId": "uuid", "mode": "AI", "status": "ACTIVE", "aiPersonaKey": "closer", "opponentHandle": "TheCloser", "inviteToken": null } }
```

`{ "activeMatch": null }` when none.

### GET /v1/matches/:matchId/review (IN-1/IN-2, DEC-028)

Deterministic post-match Game Review data. Participant-only; 409
`MATCH_NOT_ACTIVE` until the match is terminal. Role-scoped: only the
caller's own features and observations are ever serialized (§14 of
docs/18; the opponent's behavior is their private data). The `timeline`
is the shared public event stream — both participants see the same
steps; message content is never loaded.

```json
{
  "matchId": "uuid",
  "version": "game-review-0.1.0",
  "featureVersion": "feature-engine-0.1.0",
  "observationVersion": "observation-engine-0.1.0",
  "curationVersion": "review-curation-0.1.0",
  "outcome": "DEAL",
  "player": {
    "playerId": "uuid",
    "features": { "...": "docs/19 behavior feature definitions" },
    "moments": [
      {
        "kind": "RESULT",
        "headline": "YOU CAPTURED 47%",
        "detail": "Agreement reached at 60 with 31 chips remaining.",
        "eventRefs": [],
        "measurements": { "...": "type-specific objective values" }
      }
    ],
    "observations": [
      {
        "type": "UNRECIPROCATED_CONCESSION",
        "version": "observation-engine-0.1.0",
        "magnitude": 3,
        "measurements": { "...": "type-specific objective values" },
        "eventRefs": [4, 6, 9],
        "confidence": "deterministic",
        "source": "deterministic"
      }
    ]
  },
  "timeline": [
    {
      "seq": 4,
      "at": "iso-time",
      "kind": "OFFER",
      "actorPlayerId": "uuid",
      "role": "BUYER",
      "amountTenths": 6000,
      "isOpening": false,
      "concessionCostChips": 2
    }
  ]
}
```

Claims are Level 1 objective facts only in IN-1; benchmarks (L2) arrive
with IN-8, research (L3) and coaching hypotheses (L4) with IN-4/IN-5.
`eventRefs` are match event sequences for timeline linkage; timeline
kinds and rules are defined in docs/20 (negotiation steps only, no
plumbing events).
