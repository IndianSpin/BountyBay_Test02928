# PRODUCT HEALTH MATRIX — stabilization dashboard (D-70)

Primary dashboard during stabilization. Per state:
FUNCTIONAL · STATE CORRECTNESS · VISUAL · RESPONSIVE · CTA/NAVIGATION · QA.
G=GREEN Y=YELLOW R=RED N=NOT TESTED. Work proceeds in journey order.
QA executes journeys; manager maintains this file from QA reports +
own inspection. Initial statuses are conservative (N until QA walks
them on integrated main).

## JOURNEY A — HUMAN PvP
Bay → Play → Challenge → Opponent joins → Role/Dossier → Live Match →
Result → Game Review → Rematch → Bay

| State | FUNC | STATE | VISUAL | RESP | CTA/NAV | QA |
|---|---|---|---|---|---|---|
| Bay (hub) | G | N | G | G | G | N |
| Play / battle selection | G | N | G | G | G | N |
| Challenge created | G | N | G | G | G | N |
| Opponent joins (friend) | G | N | N | N | Y | N |
| Role/Dossier reveal | G | N | G | G | G | N |
| Live Match | G | N | G | G | G | N |
| Result / SH4 reveal | G | N | G | G | G | N |
| Game Review | G | N | G | N | G | N |
| Rematch (letter → accept) | G | N | G | G | G | N |
| Back to Bay | G | N | G | G | G | N |

## JOURNEY B — AI PRACTICE
Bay → Practice → Select AI → Match → Meaningful table talk → Result →
Profile/training update → Play Again/Bay

| State | FUNC | STATE | VISUAL | RESP | CTA/NAV | QA |
|---|---|---|---|---|---|---|
| Practice entry (Bay) | G | N | G | G | G | N |
| Select AI persona | G | N | G | G | G | N |
| AI match start | G | N | G | G | G | N |
| AI table talk (per AI_BEHAVIOR_CONTRACT) | R | N | R | N | N | N |
| AI result | G | N | G | G | G | N |
| Profile/training update | R | N | N | N | N | N |
| Play Again / back to Bay | G | N | G | G | G | N |

## Current RED items (upstream-first repair order)
1. **AI table talk** — current = static flavor lines; the founder's AI
   acceptance standard requires OBSERVE→BELIEFS→ACTION→INTENT→TALK→
   RETURN with a deterministic fixture set + fallback → BB-254 (W3).
2. **Profile/training update after AI match** — nothing surfaces the
   IN-3/IN-6 progress post-match → repair task after BB-254 (W3).
3. Journey QA passes on integrated main (QA duty) — all N cells until
   then.
