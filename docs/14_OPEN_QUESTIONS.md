# Open Questions Register

Agents must not silently decide these items. Use provisional defaults only where explicitly allowed.

## OQ-001 — Canonical rating formula

**Status:** Open.

Need a rating that:

- predicts future human performance;
- handles continuous surplus share, not only win/loss;
- penalizes/handles no-deal without making deliberate no-deal an attractive way to protect rating;
- accounts for opponent strength;
- remains understandable enough to build player identity.

V1 architecture must isolate rating behind a versioned service. Do not hardwire Elo math into match settlement.

## OQ-002 — Exact clock curve

Settled: personal, persistent, visible, 30% floor.
Also settled (DD Phase 1, DEC-026): **an eventual hard timeout exists** —
a hard personal decision-time limit, separate from multiplier decay
(GR-023/GR-024; test default 90 s; absent config = no limit).

Open:

- linear vs nonlinear decay;
- cumulative time to floor;
- exact hard decision-time limit;
- 0 vs small per-turn grace.

Use current test defaults only for simulation.

## OQ-003 — Exact concession parameters

Settled: scale-independent, larger total cost, declining marginal cost.

Open:

- whether log-ratio is best normalization;
- K and alpha;
- budget/bounty ratio;
- whether extremely large anchors become too expensive to unwind;
- whether the meta collapses to one large concession.

## OQ-004 — Async time/economy

Open:

- response window (hours/days);
- whether async has clock decay at all;
- timeout/abandonment behavior;
- concurrent async match limit;
- notification channels.

Async remains feature-flagged until resolved.

## OQ-005 — No-deal rating treatment

No-deal bounty outcome is settled at zero. Rating consequence is not.

Must avoid a losing player intentionally forcing no-deal to protect rating.

## OQ-006 — Matchmaking algorithm

Start simple. Need evidence before deciding rating bands, regional latency constraints, rematch suppression, and queue widening.

## OQ-007 — Scenario/RV generation distribution

Need test distributions that create varied ZOPA widths and absolute scales without making roles inferable. Must test 5-unit vs multi-million-unit gaps and first-mover effects.

## OQ-008 — AI opponent strategy

**Status:** Resolved by DEC-025.

Resolved:

- personas: exactly five — The Anchor, The Grinder, The Closer, The Wall, The Mirror;
- strategic decision-making: deterministic numeric strategies; no LLM in the decision path;
- difficulty calibration: deferred — a difficulty ladder ships only after behavioral calibration;
- AI chat: deterministic flavor lines only; the LLM chat adapter stays a stub;
- provider and cost limits: deferred with the LLM chat adapter.

Architecture recommendation stands: deterministic numeric strategy + optional LLM language layer first.

## OQ-009 — Disconnect-abuse policy

Settled: genuine disconnect freezes clock. The hard personal decision-time
budget (GR-023) now bounds freeze-then-think abuse — see docs/10.

Open: how many freezes/seconds before technical forfeit or other consequence.

## OQ-010 — Offer withdrawal

V0.1 does not support true withdrawal. Revisit only if human testing indicates it is strategically necessary.

## OQ-011 — Public profile privacy controls

Default public stats are decided. Need policy on private profiles, blocking, deleted accounts, and minors if ever supported.

## OQ-012 — Monetization order

Working hypotheses include premium analysis, sponsored/paid tournaments later, Real Mode, and B2B. No monetization feature belongs in V1 until retention is demonstrated.

## OQ-013 — Cash/prize legal architecture

Entirely separate future feasibility study by jurisdiction. No V1 implementation.

## OQ-014 — Product positioning

Open deliberately: fun, status/mastery, learning, and money may motivate different segments. Test behavior before locking marketing identity.

## OQ-015 — Time-warning thresholds and UX calibration

DD Phase 1. Test defaults LOW 30 s / CRITICAL 10 s remaining. Open: exact thresholds, warning presentation intensity, whether the opponent sees the active player's tier (currently yes, GR-016).

## OQ-016 — Timeout policy variants

DD Phase 1 ships exactly one policy: `ATTRIBUTED_NO_DEAL` (timeout = failed negotiation attributable to the timed-out player). Open: any future policy variants (e.g. mutual-failure handling), and the exact timeout rating consequence — handled by the versioned rating system, never hardcoded.

## OQ-017 — Exact multiplier-decay and hard-timeout durations

DD Phase 1. Directive test defaults: decay 0–60 s, hard limit 90 s. Both remain provisional config values pending simulation and playtesting.

## OQ-018 — No-ZOPA matches

DD Phase 6. V1 ranked scenario generation currently guarantees positive ZOPA (docs/02 terminology; GR-001/GE-001) — preserved and documented. Open: whether no-ZOPA scenarios are ever generated; if so, they must be persisted and analyzed separately from failed-ZOPA outcomes.

## OQ-019 — Post-match private-fact reveal policy

DD Phases 2/3/6. Open: whether all private scenario facts (both players') are revealed after match completion. Trade-offs: learning value vs scenario replayability and leaked reusable scenario knowledge. Until resolved, implement the data capability but keep unrevealed opponent facts hidden.

## OQ-020 — Dossier depth and verified-reveal cost

DD Phases 2/3. Open: how many private facts each player gets; how many are verifiable; whether a verified reveal has any game cost (chips/time) or is free.

## OQ-021 — Voice-pitch retention and replay

DD Phase 5. Open: voice-pitch retention duration; whether voice pitches appear in permanent replay; storage/privacy architecture. Create the clean interface and mark PRODUCT DECISION REQUIRED rather than inventing policy.

## OQ-022 — Rating pools for voice vs text play

DD Phase 5/7. Open: whether full live Voice Deal and text matches share one canonical rating pool.

## OQ-023 — Benchmark cohort thresholds and minimums

IN-8. Open: exact cohort definitions (rating bands, role, scenario class,
version, mode, time window) and the minimum N below which no percentile is
shown. Config-driven; provisional values only for development.

## OQ-024 — Premium entitlement boundaries

IN-2/IN-6, §34 of docs/18. PRODUCT DECISION REQUIRED: which review/coach/
lesson/drill surfaces are free vs premium. The seam is architectural only;
no payments are implemented until separately instructed.

## OQ-025 — Player style descriptor thresholds

IN-3. Open: exact numeric thresholds for descriptors (AGGRESSIVE OPENER,
PATIENT CLOSER, HARD BARGAINER, …) and how many may apply at once.
Descriptors are gameplay tendencies, not personality diagnoses.

## OQ-026 — Drill pedagogy

IN-6. Open: whether drills frame options as "best practices this skill"
vs a single correct answer; drill difficulty/streak mechanics ship only
after the core drills prove useful.

## OQ-027 — Coaching model provider and composer versioning

IN-5. Open: which model serves the coaching composer; cost limits;
composer/prompt versioning policy. The composer consumes only structured
input and validates structured output.

## OQ-028 — Research data governance

IN-8/§33 of docs/18. Open: consent posture for using player data in
observational research datasets; de-identification and exclusion
workflows. No research publication workflow until separately requested.
