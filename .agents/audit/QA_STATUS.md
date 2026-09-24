# QA STATUS & KNOWN DEFECTS — BB-264 verification half (QA Agent 5)

Keyed to the journey states (PRODUCT_HEALTH.md) + the CTA audit targets.
QA column evidence from the journey walks (BB-255, base `644ff28`) and the
CTA audit re-verification on current main (post `48d489a`).

## Journey A — human PvP

| State | QA STATUS | KNOWN DEFECTS |
|---|---|---|
| Bay (hub) | G | none functional; dev-build banner/overlay clipping (QA-008 → BB-236) |
| Play / battle selection | G | none |
| Challenge created | G | none |
| Opponent joins (friend) | G | none (QA-001 fixed by BB-215) |
| Role/Dossier reveal | G | none |
| Live Match | G | none (QA-005 fixed by D-28) |
| Result / SH4 reveal | **VISUAL R** | founder G-5: dark fixed overlay over the scene, not the SH4 scene-integrated reveal — CONFIRMED (`reveal.css` scrim + stage); FUNCTIONAL/STATE G |
| Game Review | G | INFO: feature nulls + empty RESULT eventRefs (W3 sanity check before BB-203 timeline wiring) |
| Rematch (letter → accept) | G | none (QA-004 fixed by BB-219b mutual consent) |
| Back to Bay | G | none |

## Journey B — AI practice

| State | QA STATUS | KNOWN DEFECTS |
|---|---|---|
| Practice entry (Bay) | G | none |
| Select AI persona | G | none |
| AI match start | G | none |
| AI table talk | G (BB-257 re-walk, D-80) | none open — deterministic fixture talk verified in the event log |
| AI result | G | none |
| Profile/training update | **R (known, BB-258)** | no post-match IN-3/IN-6 surface; PROFILE page renders but carries no training progress |
| Play Again / back to Bay | G | none |

## RESP coverage notes

- Mobile (390×844) walked GREEN: title, bay, play, persona staging,
  live-match board (composition spec 2/2), chat sheet reachability.
- NOT walked at mobile: Game Review, Rematch, back-to-Bay (matrix N
  cells — next pass duty; BB-249 Phase 7 covers them on the hosted
  stack).

## Cross-cutting defects (open, upstream-impact ordered)

1. **SH4 result-reveal visual deviation** — founder-confirmed; blocks
   visual acceptance of Journey A's result state. Owner: W2 (BB-256
   golden reference makes the target explicit).
2. **Profile/training update missing** — BB-258 (W3).
3. **Dev-build banner/overlay clipping** — QA-008 → BB-236 (W2).
4. **PDR-2** — GR-012 walk-away wording vs turn-gated implementation
   (open with the founder; report-only).
5. Rate-cap hygiene: BB-250's `gameRouteCap` dev caps are merged —
   re-audit suite volume after the next suite-size change (BB-243
   lesson; challenges join route still hard-30 — watch it).

## Suite-gate history (context for the baseline checklist)

- QA-006 signin 30/min self-exhaustion → BB-222 fixed (dev-only 300/min).
- QA-009 ready 30/min self-exhaustion → BB-250 fixed (`gameRouteCap`).
- QA-007 insights fixed-subject pollution → BB-223 fixed.
