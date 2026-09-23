# Context Manifest — M4 live friend match vertical slice

## Objective

Milestone 4 of 16_IMPLEMENTATION_SEQUENCE.md: the playable vertical slice.
Socket.IO rooms with token auth and presence-driven disconnect handling on the
API; the 08_API_CONTRACTS match routes (challenge create/join, ready, offers,
accept, walk-away, chat, snapshot, result, events) driving the M2 command
service; a live negotiation screen in Next.js per 09_UI_DESIGN_SYSTEM; a
Playwright two-browser E2E. Exit criterion: two browsers complete a match
reliably — met (2/2 E2E tests green, repeated runs).

## Relevant rule / requirement IDs

06_ARCHITECTURE.md §7 (realtime model, rooms, reconnect); 08_API_CONTRACTS.md
(challenge routes, match routes, socket events); GR-015 (disconnect debounce),
GR-016 (clock visibility); UF-04 (friend challenge); 09_UI_DESIGN_SYSTEM.md;
SI-001/SI-003 (socket auth never trusts client ids); PRD-006/007/009/010;
DEC-021 (friend challenges unrated).

## Files expected to change

- packages/db: inviteToken column (migration), challenge create/join in the
  command service (challenge = Match row + one participant, no domain state;
  the domain match materializes on join — the domain always models exactly
  two participants, GR-001)
- apps/api: match-assignment (provisional RV distribution, OQ-007),
  match-routes, realtime layer (token auth, presence debounce, heartbeats,
  role-scoped state broadcasts), CORS, tests (routes + sockets)
- apps/web: play page (create/join challenge), negotiation screen (turn
  state, private RV, cost preview via domain functions, accept/walk-away,
  chat, history, result reveal, rematch), API token hook (Clerk or dev),
  proxy.ts (Next 16 renamed the middleware convention), Playwright E2E
- Root: test:e2e script, CI (Playwright install + E2E), .gitignore

## Explicitly out of scope

Matchmaking queue (M6), rating updates (M6), replay UI polish (M5),
moderation (M10), AI opponents (M8), async mode (M9).

## Tests required

Route tests: lifecycle, authorization (403/401), turn order, idempotency,
single-use tokens, walk-away; socket tests: role-scoped broadcasts,
disconnect→pause→resume; E2E: two browsers deal + reveal + rematch CTA, chat
does not transfer the turn. All RV-dependent test play uses the player's own
RV (GR-003 boundary) so random draws never break assertions.

## Result

- Changed files: as listed above.
- Behavior implemented: full playable loop end-to-end (browser → HTTP →
  command service → domain → snapshot/events → Socket.IO → both browsers).
- Tests added/run: 33 DB-gated tests (5 files) + 2 Playwright E2E tests,
  all green; lint/typecheck/build clean across 7 packages.
- Unresolved issues: Clerk keys not provisioned (E2E runs on dev auth);
  presence tracking is in-memory (fine for the single-instance V1, per
  06 §2); provisional RV distribution flagged for OQ-007.
- Spec ambiguities encountered:
  1. Next 16 deprecated middleware.ts → proxy.ts (followed the bundled
     migration guide; clerkMiddleware adapted via a guarded proxy export).
  2. Challenge pre-join state is a DB-level record without a domain match
     (the domain requires both participants at creation, GR-001).
  3. Prisma 7's migrate diff path needs a separate shadow database —
     SHADOW_DATABASE_URL added; the initial misconfiguration (shadow == main)
     briefly wiped main-table data and required a baseline + re-seed
     (recorded so it never recurs).
- No-spec-change confirmation: no canonical document modified. No
  decision-log updates (implementation details only; provisional values
  flagged in code).
