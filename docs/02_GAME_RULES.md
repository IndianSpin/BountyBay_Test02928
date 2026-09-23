# Game Rules

This document is the highest-authority behavioral specification for Bounty Bay V1.

## Entities and terminology

- **Buyer:** player whose reservation value is a maximum acceptable settlement.
- **Seller:** player whose reservation value is a minimum acceptable settlement.
- **Reservation value (RV):** hard private boundary derived conceptually from the player's BATNA.
- **ZOPA:** `buyer_max - seller_min`; V1 ranked scenarios require `buyer_max > seller_min`.
- **Offer:** a numerical settlement proposed by the active player.
- **Opening offer:** a player's first numerical offer in a match. It is not charged as a concession.
- **Concession:** any later numerical movement by that player toward the opponent.
- **Standing offer:** the most recent valid offer from a player.
- **Deal:** created only by explicit acceptance of the opponent's currently valid standing offer.
- **No deal:** walk-away, timeout/administrative termination under defined rules, or other match end without accepted settlement.

## GR-001 — Roles

Each match contains exactly one buyer and one seller. Roles are randomly assigned unless the scenario explicitly fixes them. Role assignment must be server-authoritative and recorded.

## GR-002 — Hidden reservation values

Each player receives exactly one private reservation value.

- Buyer: maximum permissible accepted/offered amount.
- Seller: minimum permissible accepted/offered amount.

A player's RV must never be included in payloads sent to the opponent before match completion.

## GR-003 — Hard reservation boundary

A player may never make or accept a deal beyond their RV.

Examples:

- Buyer RV 100.0: offer/accept 100.0 valid; 100.1 invalid.
- Seller RV 40.0: offer/accept 40.0 valid; 39.9 invalid.

The UI may explain that the action is outside the player's mandate, but must not reveal anything about the opponent.

## GR-004 — Amount domain

V1 player-visible amount rules:

- minimum: `0.1`
- maximum: `999,999,999.9`
- precision: one decimal place
- zero: invalid
- negative values: invalid
- scientific notation: invalid

The maximum is an engineering boundary, not a gameplay range. Product copy should not present a normal negotiation range.

Internally, monetary-style amounts are stored as integer tenths. Example: `47.3 -> 473`.

## GR-005 — First mover

The server randomly selects the first player with 50/50 probability for testability. The first mover's live clock starts when the negotiation state becomes active.

First-mover status must be recorded for analytics because anchoring advantage is an explicit validation question.

## GR-006 — Opening offer

The first offer must satisfy GR-003 and GR-004. It costs zero concession chips.

A buyer may open at any valid amount `<= buyer RV`.
A seller may open at any valid amount `>= seller RV`.

Extreme anchors are legal.

## GR-007 — Turn transfer

Submitting a new valid numerical offer ends the active player's turn and starts the opponent's turn/clock.

Free-text messages do not transfer the turn or stop the clock.

A duplicate numerical offer is invalid and cannot be used to transfer the turn.

## GR-008 — Unidirectional concessions

After a player's opening offer:

- buyer offers may stay only by not acting or increase numerically; each new offer must be strictly greater than the buyer's prior offer;
- seller offers may stay only by not acting or decrease numerically; each new offer must be strictly less than the seller's prior offer.

Players cannot reclaim a concession through a later numeric offer.

Examples:

Buyer: `20 -> 30 -> 31.5` valid; `30 -> 25` invalid.
Seller: `100 -> 80 -> 72` valid; `80 -> 90` invalid.

## GR-009 — Offer withdrawal/retraction

V0.1 does **not** support deleting or retracting a submitted offer from history. An offer is an immutable event.

A player may communicate verbally that an offer is "final" or "off the table," but the current standing offer remains technically acceptable until that player submits a new valid concession, accepts, walks away, or the match ends.

This is a deliberate simplification. If true withdrawal is later added, it must not allow backwards numerical movement.

## GR-010 — Acceptance

A deal occurs only when the active player explicitly accepts the opponent's current standing offer.

Acceptance is legal only if:

1. a standing opponent offer exists;
2. the amount is within the accepting player's RV;
3. the match is active;
4. the offer has not been superseded by a newer opponent offer.

Acceptance ends the match immediately and atomically.

## GR-011 — Crossed offers

Crossing does not automatically create a deal.

Example:

- Buyer standing offer: 70
- Seller later offers: 65

The buyer must explicitly accept 65 to settle at 65, or take another legal action. The server must never infer settlement from crossing.

## GR-012 — Walk away

Either active player may choose **Walk Away**. Walk-away ends the match as no-deal.

No-deal bounty reward is zero for both players. Concession chips already spent remain spent for match-economy analytics.

## GR-013 — Chat

Players may exchange free-text messages during active negotiation.

- Messages do not switch turns.
- Messages do not stop clocks.
- Messages do not create binding offers.
- Numbers written in chat are not offers unless submitted through the offer action.
- Chat is immutable in match history except moderation redaction.

## GR-014 — Live clock ownership

Exactly one player's live decision clock is active at a time.

- At match start: first mover's clock runs.
- After a valid offer: sender's clock stops; opponent's clock runs.
- On acceptance/walk-away/match end: both stop.
- Chat does not affect clock ownership.

The server is authoritative. Clients display a projection based on server timestamps.

## GR-015 — Disconnect behavior

If the active player loses a verified realtime connection, the server freezes the active clock after a short technical debounce. Reconnection resumes the same player's clock.

The exact grace/debounce and abandonment window are configuration values. Disconnect behavior must be auditable because deliberate disconnect abuse is a known risk.

## GR-016 — Clock visibility

Both players may see both players' current clock status / payout multiplier during live play.

## GR-017 — Concession-chip constraint

Each player receives a fresh concession-chip budget at match start. Opening offers cost zero. Later concessions cost chips according to the game-economy function.

A concession that costs more chips than the player has remaining is invalid.

Acceptance and walk-away never require concession chips.

## GR-018 — Match completion reveal

After completion, both players may see:

- both reservation values;
- ZOPA width;
- full offer history;
- final settlement or no-deal;
- each player's surplus share if deal;
- clock multiplier;
- concession chips spent;
- match-economy result;
- first-mover identity.

## GR-019 — Rated-mode eligibility

Canonical Bounty Rating is affected only by eligible synchronous human PvP ranked matches.

Not canonical-rated in V1:

- AI matches;
- async matches;
- private friend challenges (provisional anti-boosting rule);
- aborted technical matches.

## GR-020 — AI disclosure

When the opponent is AI, the interface must disclose this before the negotiation begins and throughout the match. AI may never use a human-looking identity intended to deceive the player about opponent type.

## GR-021 — Async isolation

Async human play is a distinct experimental mode. It uses the same reservation, offer, concession-direction, acceptance, and settlement rules, but its time-control/economy may differ. It never affects canonical rating in V1.

Do not infer async timing rules from live-mode rules; see `14_OPEN_QUESTIONS.md`.

## GR-022 — Server authority

The server alone validates and commits:

- amount legality;
- reservation boundary;
- concession direction;
- concession cost;
- chip balance;
- turn ownership;
- clock timestamps/multiplier;
- acceptance validity;
- settlement;
- timeout determination;
- rating eligibility.

Client-side calculations are previews only.

## GR-023 — Hard personal decision-time budget

Each player receives a cumulative personal decision-time budget. Only the active player's personal decision clock runs (GR-014).

- The budget is separate from the bounty-multiplier decay (GE-008): the multiplier stops declining at its floor while personal decision time keeps running.
- The budget is a versioned config value (`hardDecisionTimeLimitMs`, test default 90 s; see docs/03 §2). Multiplier decay duration and the hard limit are independent parameters.
- Once the active player's elapsed personal decision time reaches the limit while the match is ACTIVE, gameplay commands (offer, accept, walk away) are rejected with `TIMED_OUT`. Only the server-initiated timeout (GR-024) advances the match.
- There is no grace, extension, or reset. A config without the limit (legacy match) means no timeout — behavior is unchanged.
- Time spent while the clock is frozen (GR-015 pause) does not accrue against the budget.

## GR-024 — Timeout outcome

When the active player's cumulative decision time reaches the hard limit, the player times out. The timeout is a distinct terminal outcome — never recorded or presented as an ordinary walk-away.

- Status `NO_DEAL`, completion reason `TIMED_OUT`, attributable to the timed-out player.
- Both players receive zero match bounty (GE-003). The opponent does **not** receive an economically fictitious settlement.
- The server persists: timed-out player, elapsed personal decision time, current offers, chips, multiplier, scenario, and opponent state (the existing match snapshot plus the timeout attribution).
- Rating consequence is handled by the versioned rating system (OQ-005). No extreme penalty is invented here.
- The UI must warn the active player in stages (NORMAL → LOW TIME → CRITICAL TIME → TIMEOUT); the timeout must not come as a surprise.
- A timeout cannot fire while PAUSED (clock frozen); on reconnect the same player's clock resumes with the remaining budget.
- Timeout is server-determined only: clients can neither trigger nor defer it (SI-009).

## GR-025 — Offer-attached pitches (deferred, Phase 4/5)

A formal offer may optionally carry a short text pitch and/or short voice pitch. The pitch is communication attached to the offer — it never alters the formal amount, the standing offer, or economic legality. Only the structured amount counts. Ordinary chat remains available separately and is never binding (GR-013).

## GR-026 — No-deal result analysis (deferred, Phase 6)

No-deal is economically zero (GE-003) and never carries a fixed penalty. Post-match analysis must deterministically reveal: both limits, whether a bargaining surplus (ZOPA) existed and its size, final formal offers, remaining distance, and foregone available value. Only mathematically true statements are shown; no fabricated emotional copy. No-ZOPA failures are recorded and treated separately from failed-ZOPA outcomes.

## GR-027 — Quick communication and voice clips (deferred, Phase 5)

Quick communication actions (e.g. ASK WHY, WE'RE CLOSE) and short voice clips are non-binding communication under GR-013 semantics: they never count as formal offers, never transfer the turn, and never produce economic effects. Moderation and rate limits apply. Voice pitch availability supersedes the docs/01 "no voice/video negotiation" V1 non-goal when Phase 5 lands.

## GR-028 — Private dossiers and verified information (deferred, Phase 2/3)

Each player receives a private negotiation dossier: role context, private reservation value, and private negotiation facts. Some facts may be configured as verifiable and formally revealed as game-authenticated information (a reveal is a formal game action, distinct from an ordinary chat claim). Unrevealed facts and the opponent's RV follow the same hidden-information discipline as GR-002/SI-001: never serialized to the opponent, spectators, or AI. The negotiated variable remains price only.

## Core invariants

For every valid deal:

- `seller_min <= settlement <= buyer_max`
- `buyer_surplus_share + seller_surplus_share = 1.0` before time/economy adjustments
- buyer offers strictly increase after opening
- seller offers strictly decrease after opening
- hidden RV never appears in opponent-visible pre-result data
- exactly one player owns the live turn while match state is ACTIVE
- once elapsed personal decision time >= hard limit while ACTIVE, no gameplay command may commit (GR-023)
- a TIMEOUT outcome yields zero gross bounty for both players and is never recorded as WALKED_AWAY (GR-024)
