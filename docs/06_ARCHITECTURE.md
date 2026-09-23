# Architecture

## 1. Architecture goal

Optimize for one founder working with multiple AI coding agents: low conceptual surface area, strong type contracts, deterministic domain logic, easy local setup, straightforward deployment, and clear boundaries between authoritative game rules and UI.

## 2. Recommended stack

### Runtime and language

- Node.js **24 LTS**.
- TypeScript end-to-end with strict mode.
- `pnpm` workspaces.

### Web client

- Next.js **16.x Active LTS**.
- React via Next.js.
- Zod/shared contracts for runtime validation.

### API / realtime server

- Fastify **5.x** for HTTP API.
- Socket.IO for bidirectional realtime events, reconnection, and match rooms.
- API is an always-on service, not serverless functions.

### Database

- PostgreSQL **18.x**.
- Prisma ORM **7.x stable** for V1. Do not adopt Prisma 8 release-candidate APIs before GA without an explicit architecture decision.

### Realtime coordination

- Redis for matchmaking queues, presence, distributed locks where needed, and future Socket.IO Redis adapter.
- V1 may run one API instance, but domain/state architecture must not depend on process memory for authoritative match results.

### Testing

- Vitest for unit/property/domain tests.
- Playwright for end-to-end browser tests.
- Testcontainers or Docker Compose for integration tests with PostgreSQL/Redis.

### Hosting

Recommended first deployment: Railway with separate `web`, `api`, PostgreSQL, and Redis services. Railway supports long-lived WebSockets and documents Socket.IO deployment/reconnection/scaling. Hosting must remain replaceable.

### Authentication

Use **Clerk** for V1 authentication to avoid building security-sensitive auth as a solo founder.

- Web: `@clerk/nextjs`.
- API: verify the frontend session JWT with `@clerk/backend` `authenticateRequest()` / networkless JWT verification using the configured public key.
- Store an internal `User` row keyed by Clerk `sub`; do not make Clerk's user object the domain user model.
- Keep a small `AuthIdentity` adapter so Clerk can be replaced later without changing game/domain code.

Do not couple Socket.IO room authorization to client-provided user IDs; authenticate the socket token/server session and map it to the internal user.

## 3. Monorepo layout

```text
/apps
  /web               # Next.js UI
  /api               # Fastify + Socket.IO authoritative server
/packages
  /domain            # PURE game rules/economy/state transitions
  /contracts         # shared Zod schemas / API event types
  /db                # Prisma schema, migrations, repository adapters
  /config            # typed runtime and balance config
  /testing           # fixtures, factories, shared test helpers
/docs
/agent
```

## 4. Critical architectural invariant: pure domain package

`packages/domain` must contain deterministic functions/state machines with no database, network, UI, system-clock, or AI-provider dependency.

Input example:

```text
applyOffer(state, command, authoritativeNow, balanceConfig)
```

Output example:

```text
{ nextState, emittedDomainEvents }
```

This package owns:

- amount legality;
- hard RV boundary;
- turn legality;
- monotonic concession direction;
- concession magnitude/cost calculation;
- clock elapsed/multiplier calculation from timestamps;
- acceptance legality;
- surplus-share calculation;
- no-deal outcome;
- economy result.

All edge cases are testable without starting the web server.

## 5. Server-authoritative time

Never decrement a canonical clock every second in the database.

Persist:

- cumulative active milliseconds per player;
- active player ID;
- server timestamp when current turn started;
- paused/disconnected timestamp/state.

At any moment derive:

`elapsed = stored_cumulative + (server_now - turn_started_at)`

Clients render a local countdown/projection using server synchronization, but server recalculates on every authoritative action.

This avoids trusting client clocks and reduces write volume.

## 6. Event + snapshot model

Use an immutable `match_events` stream plus a current `match_state` snapshot.

Authoritative command transaction:

1. authorize user;
2. lock/load current match state;
3. validate command in domain package;
4. append domain event(s);
5. update state snapshot;
6. commit database transaction;
7. broadcast committed events/state through Socket.IO;
8. asynchronously emit analytics event.

This gives auditability without requiring full event sourcing everywhere.

## 7. Realtime model

Socket.IO rooms:

- `user:{userId}`
- `match:{matchId}`
- optional matchmaking/status rooms later.

Every mutation still goes through authenticated command handlers. A socket event is not trusted merely because it came from a room member.

On reconnect:

1. authenticate;
2. rejoin user/match rooms;
3. fetch authoritative match snapshot + events after last event sequence;
4. resume/freeze clock according to disconnect rules.

## 8. AI opponent architecture

AI opponent is an adapter, not domain authority.

Recommended V1 design:

1. deterministic strategy module proposes legal numeric intent using bot persona + match state;
2. optional LLM generates conversational text consistent with that intent;
3. all proposed actions pass normal server/domain validation;
4. if LLM fails or times out, deterministic bot can continue;
5. AI never receives hidden information it would not legally possess, except its own role/RV.

This hybrid approach controls cost, legality, and reproducibility while allowing natural chat.

## 9. Async architecture

Reuse the same match/event models. Do not create a second negotiation engine.

Async mode changes turn scheduling/notifications, not core offer/RV/settlement rules. Keep async time-control strategy behind an interface until product rules are settled.

## 10. Security boundaries

- Client gets `myPrivateState` only for authenticated player's RV.
- Opponent/public DTOs have no RV field before result reveal.
- Do not serialize full DB models directly to clients.
- Use explicit response schemas.
- Never log raw auth tokens.
- Store chat moderation metadata separately from public messages.

## 11. Versioning

Every match stores:

- `game_rules_version`;
- `economy_config_version`;
- `rating_version` if rated;
- scenario version.

Never retroactively recalculate historical match results under new balance values unless explicitly running analysis copies.

## 12. Dependency policy

- Pin exact major/minor versions in lockfile.
- Prefer mature libraries with active maintenance.
- Avoid prerelease dependencies in core infrastructure.
- No new dependency without explaining what complexity it removes.
- Do not add a second state-management, validation, ORM, realtime, or logging library for convenience.
