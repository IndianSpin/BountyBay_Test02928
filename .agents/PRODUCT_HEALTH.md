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
| Bay (hub) | G | G | G | G | G | G |
| Play / battle selection | G | G | G | G | G | G |
| Challenge created | G | G | G | G | G | G |
| Opponent joins (friend) | G | G | G | G | G | G |
| Role/Dossier reveal | G | G | G | G | G | G |
| Live Match | G | G | G | G | G | G |
| Result / SH4 reveal | G | G | G | G | G | G |
| Game Review | G | G | G | N | G | G |
| Rematch (letter → accept) | G | G | G | N | G | G |
| Back to Bay | G | G | G | N | G | G |

## JOURNEY B — AI PRACTICE
Bay → Practice → Select AI → Match → Meaningful table talk → Result →
Profile/training update → Play Again/Bay

| State | FUNC | STATE | VISUAL | RESP | CTA/NAV | QA |
|---|---|---|---|---|---|---|
| Practice entry (Bay) | G | G | G | G | G | G |
| Select AI persona | G | G | G | G | G | G |
| AI match start | G | G | G | G | G | G |
| AI table talk (per AI_BEHAVIOR_CONTRACT) | G | G | G | G | G | G (BB-257 re-walk) |
| AI result | G | G | G | G | G | G |
| Profile/training update | Y | Y | R | N | N | Y (engine merged BB-258; result-screen seam = BB-262 W2) |
| Play Again / back to Bay | G | G | G | G | G | G |

## QA walk evidence (2026-09-24, base `644ff28`+; spec `.agents/qa/tools/specs/qa-journeys.spec.ts` 2/2 PASS + mobile entry probe PASS)

- Both journeys walked end-to-end on integrated main (QA DB, ports
  3200/4200). Screenshots: `.agents/qa/evidence/journeys/` (A-01…A-10,
  B-01…B-07, mobile-*).
- STATE CORRECTNESS verified at every walked state: URL transitions
  (title→bay→play→resume), both pages in sync through join/ready/ACTIVE,
  crossed state, single acceptance, terminal result, rematch letter →
  accept → BOTH land on a new ACTIVE match with fresh private limits.
- RESP N cells are states not walked at mobile width this pass (Game
  Review, Rematch, back-to-Bay on 390px) — no failure observed, just no
  mobile evidence yet; flagged for the next pass.
- AI table talk: observed = static quick prompts only ("Why?"/"Too
  far."/…), no persona talk per AI_BEHAVIOR_CONTRACT — the known BB-254
  RED, observed not re-litigated. Profile/training update: no
  post-match profile surface renders in this build — known RED
  (BB-254 follow-up), observed not re-litigated.

## Current RED items (upstream-first repair order)
1. **Profile/training update after AI match** — nothing surfaces the
   IN-3/IN-6 progress post-match → BB-258 (W3, after BB-257).
2. ~~AI table talk WIRING~~ — RESOLVED: BB-257 merged, QA re-walked
   (2026-09-24): live match vs The Wall persisted one talk line
   ("Before I answer, tell me: is that your best position?" — an exact
   TALK_FIXTURES.PROBE fixture) as a MESSAGE_SENT event; economic
   action stayed persona-owned; the deal completed legally. Row
   flipped GREEN.
3. **Golden reference system** — the founder's per-state reference
   pages + data contracts + gallery + gate → BB-256 (W2). Makes the
   VISUAL column honestly verifiable.
4. Mobile N cells (Game Review / Rematch / back-to-Bay at 390px) —
   next QA pass.
