# Observation Definitions (observation-engine)

Canonical deterministic observation rules (DEC-028, IN-1). Version:
`observation-engine-0.1.0`, stored per observation. Every observation
carries: `type`, `version`, `playerId`, `matchId`, event references
(`eventRefs`: the sequence numbers that triggered it), optional
`magnitude`/`measurements`, `confidence`, and `source: 'deterministic'`
(IN-5 adds `statistical` and `model_inferred`). No moral labels
(GOOD/BAD); language is descriptive (docs/18 §2, L1). Observations are
computed from the feature set + events of the same completed match.

## Implemented in IN-1

| # | Type | Trigger (exact) |
|---|---|---|
| 1 | `STRONG_OPENING_POSITION` | `openingPositionInZopa ≤ 0.30` (ambitious: near — or beyond — the opponent's limit) |
| 2 | `CONSERVATIVE_OPENING` | `openingPositionInZopa ≥ 0.70` (cautious: near the player's own limit) |
| 3 | `LARGE_OPENING` | `openingDistanceFromRv ≥ ln(2)` (opening at least doubles/halves the RV) |
| 4 | `UNRECIPROCATED_CONCESSION` | `unreciprocatedConcessionCount ≥ 1`; magnitude = count |
| 5 | `CONSECUTIVE_UNILATERAL_CONCESSIONS` | `maxConsecutiveUnilateralConcessions ≥ 2`; magnitude = run length |
| 6 | `LARGEST_CONCESSION` | `concessionCount ≥ 1`; measurements = magnitude + turn + tenths |
| 7 | `LATE_LARGE_CONCESSION` | the largest concession occurs in the last third of own offers and `concessionCount ≥ 2` |
| 8 | `DECLINING_CONCESSIONS` | `concessionPattern === 'DECLINING'` |
| 9 | `INCREASING_CONCESSIONS` | `concessionPattern === 'INCREASING'` |
| 10 | `FAST_CONCESSION_AFTER_RESISTANCE` | `fastConcessionAfterResistanceCount ≥ 1`; magnitude = count |
| 11 | `LONG_HOLD` | `longHolds ≥ 1`; magnitude = count |
| 12 | `TIME_PRESSURE_EXPOSURE` | `timePressureExposureFraction ≥ 0.25`; measurements = fraction |
| 13 | `HIGH_CHIP_SPEND` | `chipsSpent ≥ 0.5 × initialChipBudget` |
| 14 | `LOW_CHIP_SPEND` | `chipsSpent ≤ 0.1 × initialChipBudget` and at least one concession |
| 15 | `EFFICIENT_CLOSE` | DEAL, `offerCount ≤ 4`, `chipsSpent ≤ 0.2 × initialChipBudget` |
| 16 | `DEAL_NEAR_OWN_LIMIT` | DEAL, `settlementWithinOwnLimitFraction ≤ 0.10` |
| 17 | `DEAL_NEAR_OPPONENT_LIMIT` | DEAL, `settlementWithinOpponentLimitFraction ≤ 0.10` |
| 18 | `STRONG_SURPLUS_CAPTURE` | DEAL, `surplusShareCaptured ≥ 0.65` |
| 19 | `LOW_SURPLUS_CAPTURE` | DEAL, `surplusShareCaptured ≤ 0.35` |
| 20 | `MISSED_STANDING_OFFER` | walked/timed out while `foregoneValueTenths > 0` (a standing offer within the mandate existed) |
| 21 | `FAILED_POSITIVE_ZOPA` | outcome in {NO_DEAL_WALKED, NO_DEAL_TIMED_OUT} and `zopaExisted` |
| 22 | `DEADLOCK` | no deal, both players offered, `finalGapTenths ≤ 0.2 × zopaTenths`, total offers ≥ 4 |
| 23 | `TIMEOUT` | `outcome === 'NO_DEAL_TIMED_OUT'` |
| 24 | `FAST_CLOSE` | DEAL, `crossedOffersExisted`, `timeFromCrossedToSettlementMs ≤ 5000` |
| 25 | `SILENT_NEGOTIATION` | `offerCount ≥ 3` and `messagesSent === 0` |
| 26 | `OFFER_WITH_PITCH` | `pitchedOffers ≥ 1` — raw temporal proximity of a message to an own offer, never content classification |

Thresholds (0.70/0.30, ln(2), 3000 ms fast-resistance, 30000 ms long-hold,
0.25 pressure, 0.5/0.1 chip fractions, 0.10 limit proximity, 0.65/0.35
surplus, 0.2 deadlock gap, 4-offer caps, 5000 ms fast-close) are
config constants of `observation-engine-0.1.0`; changing any bumps the
version.

## Deferred with explicit reasons (catalog §45)

| # | Type | Verdict |
|---|---|---|
| — | `VERIFIED_INFORMATION_USE` | **NEEDS DEFINITION** until DD-M3/M4 ship dossier facts + the formal reveal action (GR-028) — chat text has no structured facts today |
| — | `AGREEMENT_AFTER_VERIFIED_REVEAL` | **NEEDS DEFINITION** — same dependency |
| — | `BUYER_SELLER_ROLE_DIFFERENTIAL` | **Deferred to IN-3** (longitudinal comparison of role-split performance) |
| — | `REPEAT_BEHAVIORAL_PATTERN` | **Deferred to IN-3** (across-match recurrence needs history + thresholds) |
| — | offer-pitch *quality*, question detection, bluff classification | **NEEDS DEFINITION** — requires model-inferred classification (raw/mark separation per DEC-028); never naive keyword rules |

## Review curation (IN-2)

Deterministic selection of the 1–5 most important moments for the Game
Review UI. Version `review-curation-0.1.0`.

- **Moment 1 is always RESULT** — the outcome, surplus share, chips
  remaining, or the no-deal/timeout statement (docs/18 result hierarchy).
- **Selection order** (highest first; first occurrence per type, at most 5
  moments total): MISSED_STANDING_OFFER, DEADLOCK, TIMEOUT,
  FAILED_POSITIVE_ZOPA, UNRECIPROCATED_CONCESSION,
  CONSECUTIVE_UNILATERAL_CONCESSIONS, LATE_LARGE_CONCESSION,
  FAST_CONCESSION_AFTER_RESISTANCE, STRONG_OPENING_POSITION,
  LARGE_OPENING, CONSERVATIVE_OPENING, LARGEST_CONCESSION,
  STRONG_SURPLUS_CAPTURE, LOW_SURPLUS_CAPTURE, DEAL_NEAR_OWN_LIMIT,
  DEAL_NEAR_OPPONENT_LIMIT, FAST_CLOSE, EFFICIENT_CLOSE,
  DECLINING_CONCESSIONS, INCREASING_CONCESSIONS, LONG_HOLD,
  TIME_PRESSURE_EXPOSURE, HIGH_CHIP_SPEND, LOW_CHIP_SPEND,
  SILENT_NEGOTIATION, OFFER_WITH_PITCH.
- **Dedup:** the RESULT moment already states the surplus share (DEAL),
  the timeout (NO_DEAL_TIMED_OUT), and a walked-away standing offer —
  those observation types are skipped as separate moments in those
  outcomes.
- **Copy is fixed per type** and built from measurements only — Level 1
  objective facts, no interpretation, no banned vocabulary (best move,
  blunder, mistake, should have, psychology).

## Timeline (IN-2)

Deterministic derivation from the persisted event stream, strictly
`sequence`-ordered, negotiation-relevant actions only. Version: carried
by the review envelope (`game-review-0.1.0`).

| Entry kind | Event | Fields |
|---|---|---|
| `OFFER` | `OFFER_SUBMITTED` | `actorPlayerId`, `role`, `amountTenths`, `isOpening`, `concessionCostChips` (authoritative domain value) |
| `MESSAGE` | `MESSAGE_SENT` | `actorPlayerId`, `role` — presence and timing only; **content is never loaded** (docs/18 §14; no NLP in this package) |
| `ACCEPT` | `OFFER_ACCEPTED` | `actorPlayerId`, `role` |
| `WALK_AWAY` | `WALKED_AWAY` | `actorPlayerId`, `role` |
| `TIMEOUT` | `TIMED_OUT` | `actorPlayerId` = `payload.timedOutPlayerId`, `role` — the domain scheduler raises the event, not a player action |
| `ABORTED` | `MATCH_ABORTED` | no actor |

`MATCH_STARTED`, `PLAYER_READY`, disconnect/reconnect, pause and
`MATCH_COMPLETED` are plumbing, not negotiation steps — excluded. Every
entry carries `seq` (links moments to steps) and `at` (server ms).

## Game Review envelope (IN-2)

`buildGameReview(state, events, config, playerId)` is the single
deterministic IN-2 entry point. Version `game-review-0.1.0`; returns

- `version`, `curationVersion`, `featureVersion`, `observationVersion`
  (engine versions at computation time),
- `matchId`, `playerId`, `outcome`,
- `moments` — 1–5 curated moments, moment 1 always RESULT,
- `timeline` — the shared match timeline above (both participants see
  the same steps; moments are player-scoped).

The review is **self-contained by contract** (docs/18 §3, §13): pure
over the stored snapshot + event stream + economy config, with no
coaching, LLM, retrieval or external service in the path — the Game
Review works fully when the coaching service is unavailable, and is the
fallback everything else degrades to, never the other way around.
It throws on a non-completed match (status outside
`DEAL`/`NO_DEAL`/`ABORTED`) and on a non-participant `playerId`. The
timeline is derived, never persisted — no schema change rides with IN-2.
