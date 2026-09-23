# Context Manifest — verification pass (playable core audit)

## Objective

A no-redesign verification pass over the playable core (user request, 9 areas):
hidden-information audit from a network inspector's perspective, client/server
authority, crossed-offer behavior, chip exhaustion, clock floor, chat/clock
interaction + rate limits, database safety, persistence authority, full suite.
Rule: no product-rule changes; technical/security/data-safety fixes only.

## Findings (see session report for the full detail)

- SI-005 DEFECT FIXED: chat had NO rate limit (rate-limit global:false means
  only explicitly-configured routes are limited). Per-route limits added:
  messages 30/min, offers 60/min, accept/walk/ready 30/min, challenges
  20/min, joins 30/min.
- DB SAFETY ADDED: prisma.config.ts refuses to run when
  SHADOW_DATABASE_URL === DATABASE_URL (the exact configuration that caused
  the 2026-09-21 data-loss incident); a guarded `db:reset` script requires
  the retyped database name and refuses in production. All refusal paths
  verified; the destructive path was deliberately not executed.
- NEW PERMANENT TEST: apps/api/tests/hidden-information-audit.test.ts —
  captures every HTTP body + Socket.IO payload a participant observes across
  a full live match and scans for the opponent's RV (field-scoped string +
  structural key-absence), exempting terminal-status reveals (GR-018).
- DESIGN OBSERVATIONS REPORTED (unchanged): crossed-state monotonic
  consequence; chip-exhausted players retain only accept/walk/chat (15_ §4,
  OQ-003); no hard timeout + turn-gated walk-away means a stalling active
  player can hold a match indefinitely (OQ-002/OQ-009); clock keeps
  accumulating below the 30% floor (cosmetic).

## Tests

Full chain green: lint, typecheck (7 packages), 149 unit tests, 34 DB-gated
tests (incl. the new wire audit), production build, 2 Playwright E2E (replay
assertion retry budget widened for dev-server recompilation after builds).

## No-spec-change confirmation

No canonical document modified; no decision-log updates — all fixes are
technical (rate limits, DB guards, test coverage).
