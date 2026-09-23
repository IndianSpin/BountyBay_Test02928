# Bounty Bay

A free, competitive 1v1 bargaining game: two players receive private reservation values, bargain over one numerical settlement, and are objectively scored on how much of the available bargaining surplus they capture — under irreversible concessions, a per-match chip economy, and individual chess-style clocks.

**Status:** Milestones 0–5 complete: repository bootstrap, the pure game domain + headless simulator, persistence (Prisma 7 + PostgreSQL 18), auth + profiles (Clerk behind an adapter, dev-mode fallback), the live vertical slice (realtime layer, match routes, negotiation screen, Playwright two-browser E2E), and UX polish + the replay screen (ZOPA visualization, ARIA live announcements, accessibility, event timeline). **The game is playable end-to-end in friend-challenge mode, with full replays.** `docs/16_IMPLEMENTATION_SEQUENCE.md` defines the remaining milestones.

## Source of truth

`AGENTS.md` is the mandatory operating contract for coding agents; `CLAUDE.md` marks the architectural boundary. Canonical spec documents live in `docs/` with this priority order:

1. `docs/02_GAME_RULES.md` — highest-authority behavioral spec
2. `docs/03_GAME_ECONOMY.md`
3. `docs/05_PRD.md`
4. `docs/06_ARCHITECTURE.md`
5. `docs/07_DATA_MODEL.md`
6. `docs/08_API_CONTRACTS.md`
7. `docs/01_PRODUCT_SCOPE.md`
8. `docs/00_PRODUCT_NORTH_STAR.md`
9. `docs/12_DECISION_LOG.md`

If documents conflict: stop and report the conflict. Items in `docs/14_OPEN_QUESTIONS.md` are deliberately unresolved — never silently settle them.

## Layout

```
apps/
  web        Next.js 16 UI
  api        Fastify 5 + Socket.IO authoritative server (M2+)
packages/
  domain     PURE deterministic game rules — the architectural boundary
  contracts  shared Zod schemas / API event types
  db         Prisma schema + repositories (Milestone 2)
  config     typed runtime and balance config (versioned, server-side)
  testing    fixtures, factories, seeded RNG, headless simulator
docs/        canonical specifications
agent/       agent operating contract + task manifests
```

## Quickstart

Requires Node ≥ 24 and pnpm 10; Docker for the dev database.

```sh
pnpm install
pnpm db:up          # PostgreSQL 18 + Redis (docker compose)
pnpm --filter @bounty-bay/db db:deploy   # apply migrations
pnpm --filter @bounty-bay/db db:seed     # economy-0.1.0 config + scenarios
pnpm test           # domain, contract, property, and simulator tests
pnpm test:db        # PostgreSQL integration tests (command service, routes, sockets)
pnpm test:e2e       # Playwright: two browsers complete a live match
pnpm typecheck      # strict TS across the workspace
pnpm lint
pnpm build          # includes the Next.js production build
pnpm dev            # runs web (3000) + api (4000) — then open /play
```

Run a seeded simulation batch:

```sh
pnpm --filter @bounty-bay/testing simulate --matches 100
```

## What's implemented (M1)

- **Amounts** (GR-004): integer tenths, strict parsing, 0.1 – 999,999,999.9, no floats on player offers.
- **Match state machine** (GR-001…GR-022): roles, hidden RVs, hard boundaries, opening offers, unidirectional concessions, duplicates, crossed offers, explicit acceptance, walk-away, chat, disconnect/reconnect clock freezing, technical abort.
- **Economy** (GE-001…GE-010): ZOPA, surplus shares, scale-independent log-ratio concession costs (`K·m^α`, config-driven), never-recovering clock multiplier with the settled 30% floor, gross/net results.
- **Server-authoritative time** (06 §5): cumulative active ms + turn timestamps; no decrementing clock.
- **Role-scoped projection**: opponent RV is structurally absent pre-result (SI-001, penetration-tested).
- **Simulator** (15_SIMULATION_VALIDATION_PLAN): 4 of 10 planned strategy agents, full in-memory matches, deterministic by seed.
- **Tests**: 124 unit/property/simulator tests + 9 PostgreSQL integration tests — idempotency, race serialization, restart survival, and stored-data replay reproducibility.

## What's implemented (M2)

- **Prisma 7 schema** (07_DATA_MODEL): users, profiles, scenarios, versioned `GameBalanceConfig`, matches with a `domainState` snapshot column (06 §6), participants, offers, chat, the immutable `MatchEvent` stream with a `(match_id, command_id)` idempotency key (SI-004), results, rating events.
- **Match command service** (06 §6 transaction): row lock → commandId dedup → snapshot load → pure domain validation → events + snapshot + normalized rows, atomically.
- **Event replay** (`replayMatch`): stored rows + events + config reproduce the exact final state and re-emit the exact event stream (PRD-009).
- **Seeds**: `economy-0.1.0` balance config + placeholder scenarios.

## Explicitly not yet implemented

Auth (M3), the live vertical slice (M4), UX polish/replay UI (M5), matchmaking/rating (M6, OQ-001 open), analytics (M7), AI opponents (M8, OQ-008 open), async mode (M9, OQ-004 open), moderation/external alpha (M10). V1 has no real money, ever, in this codebase.
