# Bounty Bay — Starter Documentation v0.1

This repository pack is the source-of-truth starter set for building the first testable version of Bounty Bay with Codex, Claude, and other coding agents.

## Working product thesis

Bounty Bay is a free, competitive 1v1 bargaining game built around hidden reservation values, consequential offers, irreversible concessions, individual chess-style time pressure, and objective post-match surplus measurement.

The first product is designed for competitive individuals. It tests whether repeated human-versus-human single-issue bargaining is intrinsically compelling enough to support a networked game. Education, B2B, real assets, and cash-prize competition are later extensions, not V1 dependencies.

## Canonical source order

If documents conflict, use this priority and report the conflict before implementing:

1. `docs/02_GAME_RULES.md`
2. `docs/03_GAME_ECONOMY.md`
3. `docs/05_PRD.md`
4. `docs/06_ARCHITECTURE.md`
5. `docs/07_DATA_MODEL.md`
6. `docs/08_API_CONTRACTS.md`
7. `docs/01_PRODUCT_SCOPE.md`
8. `docs/00_PRODUCT_NORTH_STAR.md`
9. `docs/12_DECISION_LOG.md`

`docs/14_OPEN_QUESTIONS.md` explicitly identifies decisions that are not yet settled. An agent must not silently resolve them in implementation.

## Recommended reading by task

- Product/design work: `00`, `01`, `04`, `05`, `09`, `11`, `13`, `14`.
- Core game logic: `02`, `03`, `07`, `13`, `15`.
- Backend/realtime: `02`, `03`, `06`, `07`, `08`, `10`.
- Frontend: `02`, `04`, `08`, `09`, `13`.
- AI opponent: `02`, `03`, `06`, `08`, `10`, `14`.
- Analytics/validation: `03`, `05`, `11`, `15`.

## Development principle

Conversation history is not authoritative. Once a decision is accepted, record it in the canonical documents and the decision log. Coding agents work from repository documentation and tests, not remembered chat context.

## Current stage

This pack is **v0.1**. It is complete enough to bootstrap the repository and implement a deterministic vertical slice, but several balance coefficients and rating details are intentionally provisional. See `docs/14_OPEN_QUESTIONS.md` before implementing those areas.
