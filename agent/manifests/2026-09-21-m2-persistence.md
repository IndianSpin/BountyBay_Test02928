# Context Manifest — M2 persistence + command service

## Objective

Milestone 2 of 16_IMPLEMENTATION_SEQUENCE.md: persist matches through the Prisma 7 /
PostgreSQL 18 stack with the event + snapshot model, and expose an idempotent,
row-lock-protected command service. Exit criteria: a domain match survives process
restart and its result reproduces from stored data.

## Relevant rule / requirement IDs

06_ARCHITECTURE.md §2 (Prisma 7.x stable, no Prisma 8 RC), §6 (event + snapshot,
authoritative command transaction), §11 (versioning); 07_DATA_MODEL.md;
08_API_CONTRACTS.md (command_id, error codes); SI-001, SI-003, SI-004;
PRD-009 (reproducible results), PRD-016 (versioned admin config).

## Files expected to change

- packages/db: prisma/schema.prisma, prisma.config.ts, migrations/, seed, src/*
  (client factory, snapshot codec, command service), tests/command-service.test.ts
- packages/domain: PLAYER_READY event (07's event list is open — "include") and
  pure replayMatch (PRD-009); COMMAND_ALREADY_PROCESSED added to the error union
  (08 lists it; the persistence layer emits it, never applyCommand)
- Root: test:db script, CI with a Postgres service, README, docker-compose
  (postgres:18 volume layout + host port 5433 — local Supabase occupies 5432)

## Explicitly out of scope

Auth (M3), Socket.IO/HTTP routes (M4), Redis matchmaking (M6), rating math
(OQ-001), async mode (OQ-004), analytics pipeline (M7).

## Tests required

Valid: full lifecycle persist, restart resume, replay equality, config versioning,
disconnect timestamps. Invalid: unknown config/scenario. SI-004: duplicate
commandId, duplicate accept, concurrent offers (exactly one winner). SI-001:
events never carry RVs. Pure: replay reproduces state and re-emits events.

## Result

- Changed files: as listed above.
- Behavior implemented: transaction = lock (SELECT FOR UPDATE) → commandId dedup →
  snapshot load → pure domain validation → persist events/snapshot/normalized rows;
  snapshot embeds { state, config } for hermetic reproducibility.
- Tests added/run: 9 integration tests (test:db, green) + 4 replay unit tests;
  full chain green: lint, typecheck (7 packages), 124 unit tests, 9 db tests,
  production build.
- Unresolved issues: none blocking. OQ items untouched.
- Spec ambiguities encountered:
  1. Prisma 7 is a breaking-change generation (driver adapters, no schema URLs,
     no unchecked FKs in nested writes) — implementation adjusted, no spec change.
  2. MatchEvent gains a nullable commandId (partial unique) — the data model lists
     fields but not idempotency storage; 08/SI-004 require it.
  3. PlayerProfile.bountyRating default 1200 (provisional; OQ-001).
  4. Match.domainState JSON column holds the 06 §6 snapshot — the data model is
     explicitly conceptual ("Types are conceptual").
- No-spec-change confirmation: no canonical document modified. No decision-log
  updates (implementation details, not product decisions; provisional values
  flagged in code comments).
