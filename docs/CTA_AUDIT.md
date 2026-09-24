# CTA AUDIT — BB-264 verification half (QA Agent 5)

Base: current main (post BB-250/251/253, `48d489a`+). Every CTA_ROUTE_CONTRACT
target verified live on integrated main (QA DB, 3200/4200). Evidence
screenshots: `.agents/qa/evidence/cta-*.png`. Specs: entry-CTA walk +
`qa-cta-audit-2b.spec.ts` (committed) + hold-accept suite + journeys.

## Verdicts

| CTA | Destination | Verdict | Evidence |
|---|---|---|---|
| PLAY RANKED | `/play` (battle selection) | GREEN | `cta-play-ranked.png`; journeys A-02 |
| CREATE CHALLENGE | share panel + join URL | GREEN | `cta-create-copy.png`; journeys A-03 |
| COPY CHALLENGE LINK | readOnly input, select-on-focus; URL joinable | GREEN (clipboard is browser-gated; contract = select-and-copy readiness) | `cta-create-copy.png` |
| JOIN CHALLENGE | share URL → staging → ready | GREEN | `cta-join.png`; journeys A-04 |
| PRACTICE VS AI | `/play?practice=1` → persona staging | GREEN | `cta-practice.png`; journeys B-01/B-02 |
| PROFILE | `/profile` renders the ledger page | GREEN (page); content = known RED BB-258 (no IN-3/IN-6 surface) | `cta-profile.png` |
| TALK | message lands on the opponent's panel (GR-013) | GREEN | `cta-talk.png`; friend-match chat spec |
| MAKE OFFER | commits, transfers the turn | GREEN | `cta-hold-accept.png`; journeys A-06 |
| HOLD (accept seal) | 600ms hold settles the deal | GREEN | `cta-hold-accept.png`; hold-accept suite 2/2 |
| ACCEPT | same as HOLD (the seal IS the accept) | GREEN | as above |
| WALK AWAY | ⋯ menu → confirm sheet → 1s hold → NO DEAL | GREEN | hold-accept suite walk-away spec |
| GAME REVIEW | `/review/:matchId` board with moments | GREEN | `cta-game-review.png`; journeys A-08 |
| PLAY AGAIN | replay page → `/play` | GREEN | `cta-play-again.png` |
| REMATCH | result overlay → REMATCH SENT → opponent prompt → accept → both resume ACTIVE | GREEN | `cta-rematch.png`; rematch-consent suite |
| BACK TO BAY | result overlay → `/bay` | GREEN | `cta-back-to-bay.png`; journeys A-10 |

**No BROKEN CONTRACT found.** Every visible CTA's destination exists and
navigates on integrated main.

## Flags

1. **SH4 visual deviation (founder G-5 finding — CONFIRMED).** The result
   screen is a `position: fixed; inset: 0` overlay with a dark scrim
   (`rgba(10,14,18,.72)`, `reveal.css:74`) over the scene + a dark
   centered stage — not the scene-integrated SH4 reveal. PRODUCT_HEALTH
   "Result / SH4 reveal" VISUAL corrected G → **R** in the matrix
   (see QA_STATUS.md). Side-by-side PNGs against
   `design-sandbox/golden/states/` attach to every UI verdict per D-81
   once `golden-check --target app` is available (W2 BB-256 in
   progress — not runnable from the QA lane at audit time).
2. WALK AWAY is only reachable from the active player's page (the action
   zone is turn-gated/hidden) — consistent with PDR-2's open wording
   question; destination itself verified GREEN.
