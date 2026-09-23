# Behavior Feature Definitions (feature-engine)

Canonical, deterministic, versioned feature extraction from completed
matches (DEC-028, IN-1). Version: `feature-engine-0.1.0`. Input is always
`(finalState: MatchState, events: DomainEvent[], config: EconomyConfig)`
— the exact snapshot and event stream the command service persisted, so
computation is reproducible and replayable (PRD-009). All formulas below
are L1 (objective match facts). Features are computed per participant;
the opponent's features are private to them (docs/18 §14).

All time quantities are server-authoritative ms. Chip costs come from the
OFFER_SUBMITTED event payload (`concessionCostChips`), which the domain
computed authoritatively. Amounts are integer tenths.

## A. Per-turn decision time (derived, used by several families)

Turn ownership: `MATCH_STARTED.payload.activePlayerId` sets the active
player; every `OFFER_SUBMITTED` transfers it to
`payload.nextActivePlayerId`. A player's per-turn active time for a move
at event time `t` is `t − t_grant` minus the overlap with that player's
own pause spans (`PLAYER_DISCONNECTED` at `a` … `PLAYER_RECONNECTED` at
`b`, while that player is active), where `t_grant` is the time the turn
was granted (previous transfer, or MATCH_STARTED). The final
`cumulativeActiveMs` in state remains the authoritative total; per-turn
values are a deterministic derivation for distributions.

## B. OPENING

| Feature | Formula |
|---|---|
| `openedFirst` | actor of the first OFFER_SUBMITTED is this player |
| `openingOfferTenths` | own first offer amount; null if never offered |
| `openingDistanceFromRv` | `abs(ln(openingOfferTenths / rv))`; null if no opening |
| `openingPositionInZopa` | role-relative share of the ZOPA the opening claims, measured from the **opponent's limit (0)** toward the **player's own limit (1)**: buyer `(opening − sellerRv) / zopa`; seller `(buyerRv − opening) / zopa`; negative = beyond the opponent's limit (an opening the opponent could never meet); null when `zopa ≤ 0` or no opening |
| `timeToOpeningMs` | wall time MATCH_STARTED → own first offer, minus own pause overlap; null if never offered |

## C. CONCESSIONS

| Feature | Formula |
|---|---|
| `offerCount` | own OFFER_SUBMITTED count |
| `concessionCount` | `offerCount − 1` when an opening exists, else `offerCount` |
| `concessionMagnitudes` | per move `abs(ln(next / prev))` |
| `concessionSizesTenths` | per move `abs(next − prev)` |
| `concessionRelativeSizes` | per move `size / abs(gap before move)` where gap = opponent's latest at that moment − own previous (buyer); null when the opponent had no offer |
| `concessionChipCosts` | per move, from event payload |
| `concessionEfficiency` | `totalMovementTenths / max(1, chipsSpent)` |
| `totalMovementTenths` | `abs(latest − opening)` |
| `largestConcessionMagnitude` | max of magnitudes; null if none |
| `largestConcessionTurn` | 1-based index of own offer carrying the largest concession |
| `finalConcessionMagnitude` | last move's magnitude; null if none |
| `unreciprocatedConcessionCount` | moves where the opponent's latest offer equals their latest at the player's previous move (or both null) |
| `maxConsecutiveUnilateralConcessions` | longest run of consecutive unreciprocated moves |
| `concessionPattern` | `INCREASING` / `DECLINING` when ≥3 magnitudes strictly increase/decrease; `MIXED` otherwise; null below 3 |
| `reciprocalResponseMeanMs` | mean per-turn active time of moves that immediately follow an opponent concession |
| `holdResponseMeanMs` | mean per-turn active time of unreciprocated moves |
| `fastConcessionAfterResistanceCount` | unreciprocated moves (2nd+ in a run) with per-turn active time ≤ `fastResistanceMs` (default 3000) |

## D. TIME

| Feature | Formula |
|---|---|
| `totalActiveMs` | state `cumulativeActiveMs` (authoritative) |
| `meanDecisionMs` / `medianDecisionMs` / `maxDecisionMs` | over the player's per-turn active times (§A) on turns where they acted (offer/accept/walk) |
| `longHolds` | turns with active time ≥ `longHoldMs` (default 30000) |
| `timePressureExposureFraction` | with a hard limit configured: `max(0, totalActiveMs − (limit − timeWarningLowMs)) / totalActiveMs` — share of active time spent inside the LOW_TIME window; null without a limit |
| `floorTimeMs` | `max(0, totalActiveMs − clockFloorMs)` — time spent at the multiplier floor (linear clock, GE-008) |
| `clockMultiplier` | final multiplier from `economy.players[me]` |

## E. INFORMATION / COMMUNICATION (raw observations only)

No NLP classification (DEC-028): message content is never interpreted.

| Feature | Formula |
|---|---|
| `messagesSent` | own MESSAGE_SENT count |
| `messagesSentBeforeOpening` | own messages before own first offer |
| `pitchedOffers` | own offers with an own MESSAGE_SENT in the immediately preceding `pitchWindowMs` (default 10000) — raw proximity, not pitch quality |
| `silentOfferRunMax` | longest run of consecutive own offers with no MESSAGE_SENT between them |

## F. CLOSING

| Feature | Formula |
|---|---|
| `outcome` | `DEAL` / `NO_DEAL_WALKED` / `NO_DEAL_TIMED_OUT` / `ABORTED` from status + completionReason |
| `acceptedOpponentOffer` | the player is the actor of OFFER_ACCEPTED |
| `ownOfferAccepted` | opponent accepted the player's standing offer |
| `zopaTenths` / `zopaExisted` | from economy; `zopaExisted = zopaTenths > 0` |
| `settlementTenths` | null without a deal |
| `settlementPositionInZopa` | role-relative share captured: buyer `(buyerRv − settlement) / zopa`; seller `(settlement − sellerRv) / zopa`; equals the player's surplus share (GE-002) |
| `finalGapTenths` | `abs(myLatest − oppLatest)` at terminal; null if either never offered |
| `foregoneValueTenths` | when the player walked or timed out while the opponent's standing offer sat within their mandate: `abs(standing − ownRv)`; null otherwise |
| `crossedOffersExisted` | running latest values met (buyer ≥ seller) at any point |
| `timeFromCrossedToSettlementMs` | deal only: first crossing event → OFFER_ACCEPTED; null otherwise |
| `settlementWithinOwnLimitFraction` | `abs(settlement − ownRv) / ownRv`; deal only |
| `settlementWithinOpponentLimitFraction` | `abs(settlement − oppRv) / oppRv`; deal only |

## G. PERFORMANCE

| Feature | Formula |
|---|---|
| `surplusShareCaptured` | own share, deal only (GE-002) |
| `opponentSurplusShare` | deal only |
| `grossReward` / `netResult` | `economy.players[me]` (GE-009/GE-010) |
| `chipsSpent` / `chipsRemaining` | state participant fields |
| `agreementReached` | status DEAL |
| `role` / `firstMover` / `mode` / `ratedEligible` | state fields |
| `scenarioVersion` / `economyConfigVersion` / `gameRulesVersion` | state fields (reproducibility) |
| `opponentRating` | **null until P1-M2 ships** (no rating exists yet); the field exists so cohorts can key on it later without a version bump |

## Versioning

`feature-engine-0.1.0` is stored on every computed row. Any formula,
threshold, or derivation change increments the version and ships with
tests; historical rows are never rewritten.
