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

## Longitudinal profile (IN-3)

Version `longitudinal-profile-0.1.0`, pure and deterministic, over a
player's completed non-aborted match analyses in match-end order
(`endedAt` is the ordering key — the profile reports
`lastMatchEndedAt`, never a generated timestamp). ABORTED matches are
excluded: technical termination is not a negotiation. No rating key
anywhere — rating-dependent comparisons and cohorts stay with P1-M2 /
IN-8 (D-21).

**Confidence bands** (configurable): 1–4 INSUFFICIENT DATA · 5–14
EARLY SIGNAL · 15–29 EMERGING PATTERN · 30+ ESTABLISHED.

**Dimensions** (per-window `{count, mean, min, max}`): opening
aggressiveness (`openingPositionInZopa` — lower = more aggressive),
`openingDistanceFromRv`, concession frequency/size/reciprocity
(`concessionCount`, `concessionMeanRelativeSize`,
`concessionEfficiency`, `unreciprocatedConcessions`,
`maxConsecutiveUnilateral`, `fastConcessionsAfterResistance`), decision
speed (`decisionSpeedMs`, `longHolds`), `agreementRate` (per-match 0/1
— the mean IS the rate), `surplusCapture` (deals only), `noDealRate`,
`timeoutRate`, `walkAwayRate`, information use (`messagesSent`,
`pitchedOffers`), time pressure (`timePressureExposure`, `floorTimeMs`),
closing (`timeFromCrossedToSettlementMs` deals only, `finalGapTenths`,
`offerCount`, `chipsSpent`).

**Windows and trends**: lifetime / recent N (default 10) / previous N
(default 10, the N before the recent window) / rolling N (default 5),
all configurable. Trends emit, per dimension, `{metric, recent,
previous, delta, direction}` (UP/DOWN/FLAT with relative flat epsilon
0.001) only where both windows have data — change is reported, never
attributed to a cause. There is no free-text surface.

**Style descriptors** — gameplay tendencies from explicit numeric
thresholds only (OQ-025; thresholds below are **PROVISIONAL until the
founder closes OQ-025**), gate `matchCount ≥ 5`, cap 3 by priority
order, evidence recorded with every descriptor:

| # | Descriptor | Condition (lifetime mean) |
|---|---|---|
| 1 | AGGRESSIVE OPENER | `openingPositionInZopa ≤ 0.35` |
| 2 | CAUTIOUS OPENER | `openingPositionInZopa ≥ 0.65` |
| 3 | HARD BARGAINER | `surplusCapture ≥ 0.60` |
| 4 | FREQUENT CONCEDER | `concessionCount ≥ 3` |
| 5 | SILENT NEGOTIATOR | `messagesSent = 0` and `offerCount ≥ 3` |
| 6 | QUICK DECIDER | `decisionSpeedMs ≤ 8000` |
| 7 | SLOW DECIDER | `decisionSpeedMs ≥ 25000` |
| 8 | PATIENT CLOSER | `timeFromCrossedToSettlementMs ≥ 60000` |
| 9 | QUICK CLOSER | `timeFromCrossedToSettlementMs ≤ 5000` |
| 10 | UNDER TIME PRESSURE | `timePressureExposure ≥ 0.25` |

**Role split**: buyer/seller `matchCount`, `agreementRate`,
`surplusCapture` (deals only) — a split, never a differential judgment.

**Coaching state** (`coaching-state-0.1.0`): structured data only —
`focus`, `topics`, `assignments` (DRILL/LESSON/PERSONA_MATCH with
`assignedAt`/`completedAt`), `beforeAfter` entries, `repeatIssueCounts`
— with pure transitions (assign, complete, set focus, record
before/after, record repeat issue); never LLM chat memory.

## Knowledge base (IN-4)

Version `knowledge-base-0.1.0`, pure in packages/intelligence. The §4
ontology is typed constants (9 categories, structured tag vocabulary —
a tag may span categories, e.g. ANCHORING is both an opening tactic and
a decision bias); records cite tags only from this vocabulary.

**Record schema (§5, enforced by deterministic validation):** id,
title, summary, ontology_tags, claim, practical_implication,
conditions, limitations, evidence_level (A–D), source_type
(OPEN_ACCESS_PAPER / LICENSED_MATERIAL / BIBLIOGRAPHIC_REFERENCE /
CURATED_SUMMARY), authors, year, publication, doi/url, citation_text,
license/access metadata, review_status (DRAFT/REVIEWED/SUPERSEDED),
reviewed_by, created_at (explicit data — no clock reads), version.

**Grade discipline (structural, not advisory):** A/B claim empirical
support, so the source must be OPEN_ACCESS_PAPER or LICENSED_MATERIAL;
C marks established practitioner frameworks; D marks practitioner
heuristics or contested claims. The coaching register phrasing is fixed
per grade: A/B "Research suggests…", C "A widely used negotiation
framework recommends…", D "One practitioner approach is…" — always
with the citation attached.

**Provenance (mandatory):** authors + year + publication +
citation_text on every record; doi/url optional and never invented
(seeds carry DOIs only where confidently known). No indiscriminate book
ingestion — books appear as bibliographic references with curated
summaries only.

**Conflicts preserved:** records sharing a tag with different claims
are kept side by side with their conditions and limitations (exposed as
`conflicts` on the base); the store never merges or resolves them.

**Seeds:** 27 curated records (3 meta-analytic A, 11 empirical B, 12
practitioner-framework C, 1 contested practitioner D), founder-approved
2026-09-24 (D-42): review_status REVIEWED, reviewed_by 'founder'. One
explicit conflict pair is seeded (first-offer anchoring vs "never open
first").

Observation→concept mappings (docs/18 §6) are NOT part of BB-227 scope
(docs/16's IN-4 row lists them; the contract scopes §4–5) — recorded in
worker-3.md for manager routing: mappings ride with IN-5 retrieval.

## Observation→concept mappings (IN-5)

Version `observation-concept-mappings-0.1.0` (D-38: part of IN-5).
Explicit structured mappings FIRST: every one of the 26 observation
types maps to ontology concepts (§4 tags) with a relevance weight in
(0, 1], deterministic conditions, and the mapping-set version. Full
coverage is enforced — a known type without a mapping is a validation
error, never a silent miss. Lookup is weight-ordered (ties by concept
name); RAG will supplement this structure later and can never replace
it. The canonical §6 example holds: UNRECIPROCATED_CONCESSION →
RECIPROCITY / SIGNALING / TIMING; FAILED_POSITIVE_ZOPA → IMPASSE /
FAILED_ZOPA / WALK_AWAY_DECISIONS. Weights are provisional editorial
judgments, versioned with the set.

## Coaching composer (IN-5)

Version `coaching-composer-0.1.0`, deterministic. Structured input
(player observation, review moment, mapping-store concepts, retrieved
research, structured objective) → validated structured output:
`headline` (L1), `observation` (L1), `why_it_matters` (L3 when
research-backed, else L4), `research_context` (L3 register phrase with
conditions, or the L1 §13 fallback), `suggested_action` (L4),
`practice_recommendation` (L4), `citations` (≤3, always from the input
research — never invented), `certainty_language` (STATES /
RESEARCH_SUGGESTS / FRAMEWORK_RECOMMENDS / PRACTITIONER_APPROACH /
ONE_POSSIBILITY — the §5 register names plus the two fallback states).
Claim levels ride on every field so UI/API/data can distinguish L1–L4
(docs/18 §2).

- **Register**: research_context and why_it_matters use IN-4's
  gradeStatement — A/B "Research suggests…", C "A widely used
  negotiation framework recommends…", D "One practitioner approach
  is…" — always with the citation attached.
- **Research selection** is deterministic: records whose tags
  intersect the observation's mapped concepts, best evidence grade
  first, ties by record id, at most 3.
- **Free-form output is REJECTED, never repeated (§7)**: the only LLM
  seam is a provider stub; a non-null (free-form) proposal makes the
  composer throw. Output is identical with or without a provider.
- **Fallbacks (§13)**: no research found → deterministic fallback
  text, empty citations, certainty ONE_POSSIBILITY — no evidence
  invented. Unknown observation type → the objective Game Review facts
  (moment headline/detail when available), certainty STATES.
- The 27 knowledge seeds are founder-REVIEWED (D-42, reviewed_by
  founder, 2026-09-24) and are citable by the composer.

## Practice system (IN-6)

Version `practice-system-0.1.0`, deterministic, pure. Drills train
isolated decisions — WHAT WOULD YOU DO? — with scenario state (role,
reservation value, opponent's standing offer, time remaining, chips,
round), private info, options, teaching objective, concept tags,
explanation, sources, and an optional benchmark (always null until
IN-8 fills it).

**No-universal-answer rule, enforced structurally:** every drill needs
≥ 2 options with pairwise DISTINCT outcomes, and the schema has no
correctness field — no option can be marked "the answer", and
validation rejects anything that smuggles one in.

**Micro-lessons** are 1–5 minutes (validated), structured L1/L3/L4
steps, cited from the knowledge base, and carry `callableFrom` — the
observation types whose Game Review moments may surface them.

**Practice recommendations** map all 26 observation types to at least
one drill and at most one DEC-025 persona (keys as strings —
anchor/grinder/closer/wall/mirror; the intelligence package never
imports packages/ai). The canonical §8 example holds:
UNRECIPROCATED_CONCESSIONS → PLAY THE WALL (`wall`). Unknown types
fall back deterministically to a fallback drill with no persona.

**Starter set:** 10 drills + 5 micro-lessons, every source resolved
against the founder-REVIEWED seed citations (a fabricated reference
fails the build). Daily/skill drills and streaks are OUT until core
drills prove useful (OQ-026); drill UI is later.

## AI table talk (BB-254, AI_BEHAVIOR_CONTRACT)

Version `table-talk-0.1.0`, deterministic, pure. One AI turn runs the
contract's pipeline: OBSERVE (legal view only) → UPDATE BELIEFS →
legal economic action (passed in from the persona layer, returned
unchanged) → CHOOSE SOCIAL INTENT (probe / challenge / justify /
request reciprocity / hold / signal finality / conditional close /
pressure / disclose / bluff-where-permitted) → GENERATE TABLE TALK →
RETURN CONTROL.

- **Hidden information never enters:** the observation input has no
  reservation-value fields and opponent message CONTENT is never read
  (presence only). Fixtures reference only public match facts — both
  players' offers are public within a live match.
- **The language layer never makes or changes a move:** the economic
  action arrives from the persona layer and passes through untouched;
  domain validation stays in packages/domain.
- **Deterministic fixture set:** 3+ fixtures per intent, selected by a
  hash of (matchId, roundNumber, intent) — no RNG, no LLM. Bluff
  fixtures are vague claims about resolve, never fabricated verifiable
  facts.
- **Non-response impossible:** generation failure (throw, timeout
  stub, empty string) is caught and replaced by a deterministic
  fallback line per intent, with a generic line of last resort.
- Beliefs are coarse three-state judgments (opponent flexibility:
  UNKNOWN/FLEXIBLE/HOLDING; time posture: UNKNOWN/PATIENT/PRESSED)
  over legal-view observations only.
- **Seam:** packages/ai personas are read-only for this module — the
  caller passes the persona decision in; wiring who calls runAiTurn is
  a manager-routed seam (flagged in worker-3.md). PRODUCT_HEALTH's
  JOURNEY B "AI table talk" row is flipped by the manager on ACCEPT.
