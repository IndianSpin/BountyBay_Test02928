# Implementation Sequence

Each step should be a bounded agent task with tests and a context manifest.

## Milestone 0 — Repository bootstrap

- pnpm workspace
- apps/web
- apps/api
- packages/domain/contracts/db/config/testing
- lint/typecheck/test scripts
- Docker Compose PostgreSQL + Redis
- CI

Exit: one command starts development services; CI passes empty baseline.

## Milestone 1 — Pure game domain

Implement without web/database:

- amount type/fixed-point helpers;
- match state;
- RV validation;
- offer/concession direction;
- log-ratio concession magnitude;
- configurable concession cost;
- clock calculation from timestamps;
- accept/walk-away;
- settlement/surplus/economy result;
- property/unit tests.

Exit: simulation can run a full match entirely in memory.

## Milestone 2 — Persistence and command service

- Prisma schema/migrations;
- match/event repository;
- idempotent command service;
- transaction locking/versioning;
- config versioning.

Exit: domain match survives process restart and result reproduces from stored data.

## Milestone 3 — Auth + profiles

- managed auth adapter;
- internal User/Profile;
- handle selection;
- protected/public routes.

## Milestone 4 — Live friend match vertical slice

- Socket.IO connection/auth;
- create/join match;
- ready/start;
- realtime offers;
- chat;
- clocks;
- accept/walk-away;
- result reveal;
- reconnect.

Exit: two browsers can complete a match reliably.

## Milestone 5 — UX polish and replay

- responsive negotiation screen;
- transparent cost preview;
- event timeline/replay;
- accessibility.

## Milestone 6 — Ranked matchmaking + rating shell

- Redis queue;
- human match creation;
- rating service interface/versioning;
- provisional algorithm behind config;
- public stats.

Do not claim rating validity until tested.

## Milestone 7 — Analytics

Implement validation event schema and dashboard/export queries before broad user testing.

## Milestone 8 — AI practice

- deterministic bot strategies;
- optional LLM chat adapter;
- clear AI labeling;
- unrated result flow.

## Milestone 9 — Async experimental

Only after OQ-004 is decided.

## Milestone 10 — External alpha

- moderation/reporting;
- operational dashboards;
- error tracking;
- seeded scenarios;
- test cohort onboarding.

## Phase 1 (P1) — A real competitive product

P1 begins once the M0–M5 vertical slice is playable (DEC-025). It
supersedes the M6–M10 ordering above in one way: **P1-M1 (AI practice
opponents) is pulled ahead of ranked matchmaking**, because solo practice is
the fastest path to playable content and controlled strategy testing. M6,
M7, M8, and M10 are reached through the P1 sequence below; M9 (async) is
unaffected.

| P1 milestone | Scope |
|---|---|
| P1-M1 — AI practice opponents | five deterministic personas (Anchor/Grinder/Closer/Wall/Mirror), unrated, restart-safe turn engine — expands M8, per DEC-025 and docs/08 |
| P1-M2 — Bounty rating | provisional versioned rating service + RatingEvent writes + profile upgrade + match history + leaderboard (M6 rating half; resolves OQ-001/OQ-005 with founder approval) |
| P1-M3 — Ranked matchmaking | Redis ticket queue, band widening, match-found reveal, AI fallback from queue, active-match resume discovery (M6 matchmaking half) |
| P1-M4 — Retention | personal performance dashboard, REMATCH/NEW OPPONENT/ANALYZE result CTAs, share result — **the deterministic post-match analysis moves to IN-2 (DEC-028)** |
| P1-M5 — Social + game feel | friend-challenge polish, sound (optional/mutable), haptics, coherent static avatar set |
| P1-M6 — Content + usability | scenario expansion (20–30, quality bar from docs/09 stands), crossed-offer "A DEAL IS POSSIBLE" informational treatment, chip-exhaustion and clock-floor states, contextual explanations |
| P1-M7 — Moderation | report/block, anti-farming + bot signals (record only, per SI-008) |
| P1-M8 — Benchmark Match | same scenario/RV structure across players, percentile results — **moves to IN-8 (DEC-028)** |
| P1-M9 — Founder tooling UIs | scenario editor, balance console (PRD-016), match/player inspectors, analytics dashboard (M7), experiment config |
| Daily Deal | **gated**: only after repeat appeal appears in analytics (docs/11); no persistent rewards (GE-004) |

Ordering rules: rating (P1-M2) precedes matchmaking (P1-M3) because queue
bands need it; retention (P1-M4) precedes Benchmark (P1-M8) because
percentiles need played volume. Tooling UIs come last; the versioned-config
infrastructure they ride is wired during P1-M1.

Each P1 milestone follows the standard discipline: DEC/doc updates first,
tests per task, completion report, and a founder checkpoint for UI work.

## DD — Gameplay depth, communication & anti-stalling (DEC-026)

The founder directive in docs/17 runs as its own milestone group
**immediately after P1-M1 (AI practice)** and before P1-M2. Phases
implement strictly in directive order; if an earlier phase exposes a core
design or architecture problem, stop and report rather than proceeding.

| DD milestone | Directive phase | Scope |
|---|---|---|
| DD-M1 | — (pre) | Canonical docs integration: docs/17, GR-023..GR-028, economy/data-model/API/security/analytics updates, DEC-026/027, OQ updates |
| DD-M2 | 1 | Anti-stalling: hard personal decision-time budget, warnings, timeout, repeated-offer prevention, analytics |
| DD-M3 | 2 | Private dossiers: scenario schema, private facts, serialization/security, scenario tooling |
| DD-M4 | 3 | Verified information: verifiable facts, formal reveal action, event history, replay |
| DD-M5 | 4 | Offer communication: attached text pitch, quick communication, chat integration |
| DD-M6 | 5 | Voice pitch: push-to-talk clip, permissions, playback, privacy architecture |
| DD-M7 | 6 | No-deal analysis: ZOPA-aware result analysis, foregone available value, timeout/no-deal distinctions |
| DD-M8 | 7 | AI / spectator / replay integration: information boundaries, AI support, spectator rules, replay reconstruction |

Each DD milestone follows the same discipline: DEC/doc updates first,
tests per task, §39 completion report, founder checkpoint for UI work.
Phases 5/6/7 items marked PRODUCT DECISION REQUIRED in docs/14 must not be
silently settled during implementation.

## Rule for parallel AI agents

Parallelize only across modules with stable contracts. Do not have multiple agents simultaneously redesign `packages/domain` or the same API contract. One task owns a bounded file set and must merge against current main before completion.

## IN — Negotiation intelligence, game review & coaching (DEC-028)

The founder directive in docs/18 runs as its own milestone group
**starting immediately after P1-M1 (AI practice)** and before P1-M2;
the DD track resumes after. Phases implement strictly in directive order
(§43 of docs/18), each with a founder checkpoint — do not auto-continue.

| IN milestone | Directive phase | Scope |
|---|---|---|
| IN-1 | 1 | Behavioral foundation: pure versioned feature engine + observation engine, persistence at match completion, unit/property tests, Game Review API contract — **done** |
| IN-2 | 2 | Game Review V1: 1–5 important moments, timeline linkage, objective explanations (absorbs P1-M4's deterministic post-match analysis and DD-M7 no-deal analysis) — **done** |
| IN-3 | 3 | Longitudinal player profile: aggregates, trends, threshold bands, Insights API, style descriptors |
| IN-4 | 4 | Negotiation knowledge system: ontology, ~20–30 structured knowledge records with sources and evidence grades, observation→concept mappings |
| IN-5 | 5 | Retrieval + coach: structured retrieval, RAG supplement, coaching composer with validated structured output, citations, provenance, fallbacks |
| IN-6 | 6 | Practice system: drills, micro-lessons, practice recommendations, AI-persona practice links, Practice This flow |
| IN-7 | 7 | Improvement tracking: intervention history, before/after behavior, trends, coaching memory |
| IN-8 | 8 | Benchmark engine: comparable cohorts, percentiles, minimum-sample safeguards (absorbs P1-M8 Benchmark Match) |

Ordering rules: P1-M2 (rating) precedes IN-3/IN-8 (cohorts and
benchmarks need ratings); IN-2 precedes IN-7 (interventions are measured
against review observations). Each IN milestone follows the standard
discipline: DEC/doc updates first, tests per task, completion report,
founder checkpoint.
