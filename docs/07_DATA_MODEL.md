# Data Model

Types are conceptual. Implementation uses PostgreSQL + Prisma 7.x. Amounts are integer tenths unless noted.

## User

| Field | Type | Notes |
|---|---|---|
| id | UUID | Internal ID |
| auth_subject | text unique | External auth provider subject |
| handle | text unique | Public anonymous handle |
| status | enum | ACTIVE / SUSPENDED / DELETED |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## PlayerProfile

| Field | Type | Notes |
|---|---|---|
| user_id | UUID FK | |
| bounty_rating | integer | Canonical display rating |
| rating_version | text | Algorithm version |
| rated_games | integer | |
| rated_deals | integer | |
| rated_no_deals | integer | |
| agreement_rate | numeric | Derived/cacheable |
| avg_surplus_share | numeric | Completed eligible deals only |
| updated_at | timestamptz | |

## Scenario

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| version | integer | Immutable published version |
| title | text | Fantasy asset/context |
| description | text | Shared context |
| shared_context | text nullable | Shared negotiation context (GR-028, DD-M2) |
| buyer_batna_narrative | text | Private role narrative template |
| seller_batna_narrative | text | Private role narrative template |
| buyer_private_context | text nullable | Buyer-private role context (GR-028) |
| seller_private_context | text nullable | Seller-private role context (GR-028) |
| buyer_private_facts | jsonb nullable | Buyer-private facts (GR-028; number-free by domain validation, category whitelist, caps) |
| seller_private_facts | jsonb nullable | Seller-private facts (same rules) |
| status | enum | DRAFT/PUBLISHED/RETIRED |

Private dossier fields are role-scoped at serialization (SI-001); the
opponent's dossier is never served.

Reservation values may be generated per match rather than embedded in scenario.

## GameBalanceConfig

| Field | Type | Notes |
|---|---|---|
| version | text PK | e.g. `economy-0.2.0` |
| match_bounty_chips | int | |
| concession_budget_chips | int | |
| concession_k | numeric | |
| concession_alpha | numeric | |
| clock_floor_multiplier | numeric | V1 fixed decision 0.30 |
| clock_floor_ms | bigint | Provisional; directive test default 60 s (DEC-026) |
| turn_grace_ms | int | Provisional |
| hard_decision_time_limit_ms | bigint nullable | GR-023; null/absent = no limit (legacy configs) |
| timeout_policy | text nullable | GR-024; `ATTRIBUTED_NO_DEAL` only |
| time_warning_low_ms | int nullable | UI threshold; provisional |
| time_warning_critical_ms | int nullable | UI threshold; provisional |
| max_amount_tenths | bigint | 9,999,999,999 for 999,999,999.9 |
| created_at | timestamptz | |
| active_for_new_matches | boolean | |

Configs are immutable after use by a match.

## Match

| Field | Type | Visibility |
|---|---|---|
| id | UUID | participants/admin |
| mode | enum | RANKED_LIVE / FRIEND_LIVE / AI / ASYNC |
| status | enum | CREATED / READY / ACTIVE / PAUSED / DEAL / NO_DEAL / ABORTED |
| scenario_id | UUID | shared |
| scenario_version | int | shared |
| game_rules_version | text | shared/debug |
| economy_config_version | text | shared/debug |
| rating_version | text nullable | shared/debug |
| first_player_id | UUID | shared after start |
| active_player_id | UUID nullable | shared |
| settlement_amount_tenths | bigint nullable | result only |
| completion_reason | enum nullable | ACCEPTED / WALKED_AWAY / TIMED_OUT / ABORTED; result |
| timeout_player_id | UUID nullable | set when completion_reason = TIMED_OUT (GR-024) |
| event_sequence | bigint | server |
| created_at | timestamptz | shared |
| started_at | timestamptz nullable | shared |
| completed_at | timestamptz nullable | shared |

## MatchParticipant

| Field | Type | Pre-result visibility |
|---|---|---|
| match_id | UUID | participant |
| user_id | UUID | shared handle via join |
| role | enum BUYER/SELLER | shared |
| reservation_value_tenths | bigint | **self + server only** |
| initial_chip_budget | int | self/shared depending UI |
| chips_spent | int | shared if UI shows |
| cumulative_active_ms | bigint | shared |
| current_clock_multiplier | numeric/cache | shared |
| opening_offer_tenths | bigint nullable | shared after submitted |
| latest_offer_tenths | bigint nullable | shared |
| disconnected_at | timestamptz nullable | server + status indicator |

After match completion RV is revealable to both participants.

## Offer

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| match_id | UUID | |
| event_sequence | bigint | strict match ordering |
| player_id | UUID | |
| amount_tenths | bigint | |
| is_opening | boolean | |
| concession_magnitude | numeric nullable | opening null |
| concession_cost_chips | int | opening 0 |
| created_at | timestamptz | server timestamp |

Immutable.

## ChatMessage

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| match_id | UUID | |
| player_id | UUID | |
| event_sequence | bigint | chronological replay |
| body | text | length limited |
| moderation_status | enum | VISIBLE / REDACTED / FLAGGED |
| created_at | timestamptz | |

## MatchEvent

Generic immutable audit event:

- id
- match_id
- sequence
- type
- actor_user_id nullable
- payload_json
- created_at

Event types include MATCH_STARTED, OFFER_SUBMITTED, MESSAGE_SENT, PLAYER_DISCONNECTED, PLAYER_RECONNECTED, MATCH_PAUSED, OFFER_ACCEPTED, WALKED_AWAY, TIMED_OUT, MATCH_COMPLETED, MATCH_ABORTED.

## MatchResult

| Field | Type | Notes |
|---|---|---|
| match_id | UUID unique | |
| zopa_tenths | bigint | |
| buyer_surplus_share | numeric nullable | null no-deal |
| seller_surplus_share | numeric nullable | null no-deal |
| buyer_clock_multiplier | numeric | |
| seller_clock_multiplier | numeric | |
| buyer_gross_reward | numeric | |
| seller_gross_reward | numeric | |
| buyer_net_result | numeric | |
| seller_net_result | numeric | |
| rated_eligible | boolean | |
| calculated_at | timestamptz | |

Unchanged by Phase 1 (DD). The no-deal analysis extension (zopa_exists,
zopa_size, foregone value — GR-026) adds nullable columns in Phase 6.

## RatingEvent

- id
- match_id
- user_id
- rating_version
- rating_before
- rating_after
- opponent_rating_before
- performance_input
- created_at

Immutable; profile rating is a projection of rating events.

## MatchmakingTicket

Redis-backed ephemeral record with optional durable audit:

- user_id
- mode
- rating
- created_at
- widening_stage
- region/latency bucket if later required

## Key constraints

- `(match_id, event_sequence)` unique.
- One BUYER and one SELLER per match.
- Reservation amount >0.
- Ranked scenario ZOPA >0.
- Settlement exists only for DEAL.
- RatingEvent only when match rated eligible.
- Public API DTOs must never serialize `reservation_value_tenths` to opponent pre-result.

## MatchFeature (DEC-028, IN-1)

Immutable computed row: the deterministic behavior feature set for one
participant of a completed match (docs/19), computed at match completion
in the same transaction as the terminal state.

- `match_id` + `player_id` (composite PK; playerId is deliberately not an FK — the analysis is a projection of the match)
- `feature_engine_version` (e.g. `feature-engine-0.1.0`)
- `features` JSON (the docs/19 feature set)

## MatchObservation (DEC-028, IN-1)

Immutable computed rows: the deterministic observation set for one
participant (docs/20), ordered by `ordinal`.

- `match_id`, `player_id`, `observation_engine_version`, `ordinal`, `type`
- `magnitude` (nullable decimal), `measurements` JSON, `event_refs` JSON
  (event sequence numbers for timeline linkage, IN-2)
- source/confidence are always `deterministic` until IN-5 adds
  statistical/model-inferred classes

Key constraints: analysis rows exist only for terminal matches; they are
never rewritten for a given engine version; the review API returns only
the caller's own rows (role-scoping).
