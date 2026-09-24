# CTA CONTRACTS (working file — BB-263)

Every visible CTA → target route/surface → current verification.
Swept from the repository 2026-09-24. The E2E navigation guard
(`apps/web/e2e/cta-route-map.spec.ts`, committed cf3ed1d) walks
Journey A + B asserting no error surface after every CTA — the
contract below is what it enforces. Manager assembles
`docs/CTA_CONTRACTS.md`.

## Journey A

| # | State | CTA (testid) | Target | Verified by |
|---|---|---|---|---|
| 1 | SS-01 Title | PLAY NOW (`dev-play-button`) | `/bay` | cta-route-map A |
| 2 | SS-02 Bay | PLAY RANKED (`bay-play-ranked`) | `/play` | bay.spec + guard |
| 3 | SS-02 Bay | WARM UP (`bay-practice-go`) | `/play?practice=1` | bay.spec + guard B |
| 4 | SS-02 Bay | LEDGER (`.bay-me__ledger`) | `/profile` | guard A |
| 5 | SS-02 Bay | hub tabs (`hub-bay/hub-play/hub-me`) | `/bay`, `/play`, `/profile` | guard A |
| 6 | SS-02 Bay | ANSWER (`bay-letter`) | `/play?resume=<sourceMatchId>` | SH4-loop E2E |
| 7 | SS-03 Play hub | CREATE CHALLENGE (button name) | POST `/v1/matches` → share input visible | guard A + friend-match specs |
| 8 | SS-03 Play hub | persona card (`persona-<key>`) | `/play?practice=1` staging | guard B + practice specs |
| 9 | SS-03 Play hub | continue (`continue-game`) | `/play?resume=<matchId>` | guard (resume retry path) |
| 10 | SS-03 Play hub | RETRY (`auth-retry`) | dev sign-in self-heal → hub | dev-auth specs |
| 11 | SS-05 Opponent joins | READY (`ready-button`) | role/dossier (both ready → ACTIVE) | guard A (creator-ready step) |
| 12 | SS-07 Live Match | OFFER (`make-offer`) | offer submitted → rail plaque | deal specs |
| 13 | SS-07 Live Match | ACCEPT (hold, `accept-button`) | deal/walk → SS-08 | hold-accept specs (W1) |
| 14 | SS-07 Live Match | WALK AWAY (confirm sheet) | walk result | W1 specs |
| 15 | SS-08 Result | REVIEW THE DEAL (`analyze-deal`) | `/review/[matchId]` | guard A |
| 16 | SS-08 Result | FULL REPLAY (`replay-link`) | `/replay/[matchId]` | guard A |
| 17 | SS-08 Result | BACK TO THE BAY (`back-to-bay`) | `/bay` | guard A |
| 18 | SS-08 Result | ACCEPT REMATCH (`rematch-accept`) | same-roles rematch (PDR-3) | SH4-loop E2E |
| 19 | SS-08 Result | NOT NOW (`rematch-decline`) | dismiss — proposal persists → Bay letter | SH4-loop E2E |
| 20 | SS-09 Review | FULL REPLAY (`back-to-replay`) | `/replay/[matchId]` | guard A |
| 21 | SS-09 Review | See in timeline (moment buttons) | scrolls the timeline | guard A (surface check) |
| 22 | SS-10 Replay | BACK TO PLAY (`back-to-play`) | `/play` | guard A |
| 23 | SS-11 Rematch | ANSWER (bay-letter) | `/play?resume=<source>` → in-session prompt | SH4-loop E2E |
| 24 | SS-13 Profile | hub tabs | `/bay`, `/play` | guard A |

## Journey B

| # | State | CTA (testid) | Target | Verified by |
|---|---|---|---|---|
| 25 | SS-16 Practice entry | WARM UP (`bay-practice-go`) | `/play?practice=1` | guard B |
| 26 | SS-17 Persona select | persona card (`persona-closer` etc.) | AI staging | guard B |
| 27 | SS-18 AI start | READY (`ready-button`) | ACTIVE vs AI | guard B |
| 28 | SS-20 AI result | BACK TO THE BAY (`back-to-bay`) | `/bay` | guard B (partial) |

## Guard rules (CTA_ROUTE_CONTRACT)

1. Every CTA lands on a working surface — no visible CTA may lead to
   an error page. Guard walks both journeys asserting
   `.error-line`, `.world-error`, `.os-dev__error`,
   `.home-sub[role="alert"]` are hidden after every CTA.
2. Both result links live on the result overlay — hrefs are read
   before leaving it (the guard's known trap).
3. The guard found and fixed one real defect: ME/profiles had no hub
   bar in dev (raw auth text) — repaired via `dev-profile.tsx`.
4. Un-verified CTAs (no E2E yet): `auth-retry` happy path is covered
   indirectly by dev-auth specs; `See in timeline` scrolls within the
   review page (surface check only).

## Open CTA gaps (for the repair sequence)

- SS-14/15 sign-in/sign-up render no actionable CTA in dev (raw
  text) — dead surfaces.
- SS-21 (profile/training update) has NO post-AI CTA — RED, W3.
- SS-03's ranked table CTA honesty rule: PLAY RANKED exists and
  routes, but the ranked queue itself is P1-M3 — the CTA copy is
  honest (the table is set / opens with the ranked milestone).
