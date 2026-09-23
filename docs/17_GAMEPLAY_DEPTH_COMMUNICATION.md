# Gameplay Depth, Communication & Anti-Stalling (DD)

This document records the founder directive adopted as DEC-026. It adds and
refines core mechanics to solve three product risks:

1. **Stonewalling** — a rational player must not benefit indefinitely from
   refusing to move once the bounty multiplier reaches its 30% floor.
2. **Silent number exchange** — matches must not degenerate into silently
   trading numbers until offers cross.
3. **No-deal incentives** — no-deal stays strategically possible, but
   repeated avoidable failure to agree must be meaningfully bad performance.

Core interaction: **OFFER = NUMBER + PITCH + INFORMATION.**

- The number determines the economic outcome.
- The pitch influences the human opponent.
- Private information creates something to reason about, communicate, and
  bluff about; verified information creates credibility decisions.
- The clock creates pressure; concession chips make movement costly; hidden
  limits create uncertainty; no-deal creates genuine risk.

These mechanics extend the underlying negotiation game. They are not
gamification layered on top, and they never change the core economic rule:

> **DEAL:** players receive value based on the negotiated outcome and
> applicable game mechanics. **NO DEAL:** both players receive zero match
> bounty. There is no fixed negative no-deal penalty and no generic
> agreement bonus; the incentive to agree emerges from available bargaining
> surplus, rating/performance consequences, tournament scoring, opportunity
> cost, and visible post-match analysis (GE-003, DEC-009).

## Phase status

Implementation follows the directive's phase order (docs/16, DD-M1..DD-M7).
Each phase completes with the §39-style report and a founder checkpoint.

| Phase | Scope | Status | Rules |
|---|---|---|---|
| 1 | Anti-stalling: hard personal decision-time budget, timeout, repeated-offer prevention, analytics | **Effective** | GR-023, GR-024 |
| 2 | Private negotiation dossiers + scenario schema | Adopted, deferred | GR-028 |
| 3 | Verified information (formal reveal action) | Adopted, deferred | GR-028 |
| 4 | Offer-attached text pitch + quick communication | Adopted, deferred | GR-025, GR-027 |
| 5 | Short voice pitch (push-to-talk clip) | Adopted, deferred | GR-025, GR-027 |
| 6 | No-deal result analysis (ZOPA-aware, foregone value) | Adopted, deferred | GR-026 |
| 7 | AI / spectator / replay integration | Adopted, deferred | GR-026, GR-028 |

## Phase 1 — anti-stalling (effective)

- **Hard personal decision-time budget (GR-023).** Each player has a
  cumulative personal decision-time budget. Only the active player's clock
  runs. Multiplier decay (GE-008) and the hard limit are separate: the
  multiplier stops declining at its 30% floor while personal decision time
  keeps running; at the hard limit the player times out.
- **Timeout outcome (GR-024).** A timeout is a failed negotiation
  attributable to that player, recorded distinctly from walk-away. The
  timed-out player receives no bounty; the opponent receives no
  economically fictitious settlement. The rating consequence is handled by
  the versioned rating system (no penalty is invented here).
- **No formal-offer spam (GR-007, confirmed).** After a player's first
  formal offer, each subsequent formal offer must be a legal concession;
  resubmitting the exact same amount is rejected and illegal/non-moving
  offers never switch the turn. Holding a position is communicated through
  text/voice/quick actions: **hold your number → talk; change your number →
  spend chips; do neither → spend time.**
- **Communication is never rewarded by volume.** No XP for messages, no
  bounty for message volume, no rating bonuses for chatting, no
  communication quotas. Communication becomes valuable because the game
  gives players meaningful information to communicate about (Phases 2–4).

### Parameter mapping

Directive parameter names map to canonical versioned config fields
(`packages/config`, stored per match as a `GameBalanceConfig` row):

| Directive name | Canonical field | Test default |
|---|---|---|
| `multiplier_decay_duration` | `clockFloorMs` | 60,000 ms |
| `multiplier_floor` | `clockFloorMultiplier` | 0.30 (settled) |
| `hard_decision_time_limit` | `hardDecisionTimeLimitMs` | 90,000 ms |
| `timeout_policy` | `timeoutPolicy` | `ATTRIBUTED_NO_DEAL` |
| — (UI warning tiers) | `timeWarningLowMs` / `timeWarningCriticalMs` | 30,000 / 10,000 ms |

Test defaults are provisional. Exact durations and thresholds remain open
(OQ-002, OQ-015, OQ-016). The timeout mechanic is disabled entirely when
the limit is absent from the config (legacy `economy-0.1.0` matches never
time out and replay identically). E2E seeds the active config row with
shortened values via `E2E_HARD_LIMIT_MS` / `E2E_WARN_LOW_MS` /
`E2E_WARN_CRITICAL_MS` seed overrides.

### Phase 1 analytics

`match_timed_out`, `time_tier_entered`, and extended `match_completed`
events (docs/11). Implemented as structured server log lines; the analytics
platform ships with P1-M9.

## Phase 2+ — adopted mechanics (deferred)

Each is adopted as scope with its own rule reference below; details are
implemented phase by phase and must not be silently settled beforehand.
Open product questions from the directive are registered in docs/14
(OQ-015..OQ-022); anything listed there stays configurable or marked
PRODUCT DECISION REQUIRED until resolved.

1. **Private negotiation dossiers (GR-028).** Scenarios extend to:
   shared context, buyer/seller private role context, private reservation
   value, and several private negotiation facts (urgency, alternatives,
   preferences, constraints, credibility, motivations). The negotiated
   variable remains **price only** — never multi-issue bargaining. Private
   facts support argument, inference, bluffing, credibility decisions, and
   selective disclosure; they never leak mathematically equivalent RV
   information (e.g. "Your opponent's minimum is 61" is forbidden).
2. **Verified information (GR-028).** Facts explicitly configured as
   verifiable can be formally revealed as game-authenticated information,
   distinct from an ordinary chat claim. Server-authoritative; reveal is a
   formal game action tied to scenario data; unrevealed facts stay hidden
   from opponent, spectators, and AI; reveals are immutable once made and
   reconstructable in replay.
3. **Offer-attached communication (GR-025, GR-027).** A formal offer may
   carry an optional short text pitch and/or short voice pitch. The pitch
   never alters the formal amount or economic legality; the standing offer
   is always the structured amount alone. Ordinary chat remains separate;
   quick communication actions (ASK WHY, TOO FAR, WE'RE CLOSE, …) are
   non-binding, non-economic, context-sensitive shortcuts.
4. **No-deal performance treatment (GR-026).** No economic punishment
   beyond zero bounty. No-deal is meaningfully represented in stats
   (initiator, ZOPA existence, final gap, chips/time used), Daily Deal
   scoring (0 performance points), tournament scoring, and the versioned
   rating abstraction (outcomes such as DEAL PERFORMANCE, NO DEAL — MUTUAL
   FAILURE, WALK AWAY, TIMEOUT). Raw data is stored so rating can be
   recalculated later.
5. **No-deal result reveal (GR-026).** Post-match analysis shows limits,
   ZOPA existence/size, final offers, remaining distance, and
   deterministically true messaging (MISSED OPPORTUNITY, DEADLOCK, NO ZOPA).
   No-ZOPA failures are persisted and handled separately from failed-ZOPA
   (V1 scenario generation currently guarantees positive ZOPA — that rule
   is preserved, GR-010/GR-001 docs and docs/02 terminology).
6. **Spectators, replay, AI (Phases 2–7).** Live spectators see only
   public/revealed information; unrevealed facts and RVs stay hidden. A
   delayed caster mode with full hidden information is a possible later
   addition and must not compromise competitive integrity. Replay
   reconstructs offers, pitches (retention permitting), chat, verified
   reveals, turn changes, chip spend, clock use, acceptance, walk-away,
   timeout, and result from the authoritative event history. AI opponents
   obey the same information boundaries: own RV + own dossier only; AI
   economic actions pass the same domain validation as human actions.
