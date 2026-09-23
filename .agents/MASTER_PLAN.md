# MASTER PLAN — Bounty Bay

Coordination artifact. Canonical product truth lives in `docs/` only.

## CURRENT PRODUCT MILESTONE
P1 (DEC-025): P1-M1 (AI practice) done. Canvas redesign slices (DEC-029)
all three shipped (LIVE MATCH, ACCEPTANCE, RESULT REVEAL) — awaiting
founder checkpoint review.

## CURRENT ENGINEERING MILESTONE
Baseline commit `f1e8c99` on main (all workstreams, tree clean). DD Phase 1
(anti-stalling, DEC-027) complete. IN-1/2 (behavioral intelligence, DEC-028)
in flight. Canvas slices shipped; founder checkpoints pending on all three
workstreams.

## ACTIVE WORKSTREAMS
- **W1 — domain/mechanics (DD track):** `gameplay-depth-anti-stalling`
  session. Acceptance-slice follow-ups + DD Phase 1 founder checkpoint.
- **W2 — frontend/design:** `bounty-bay-p1-roadmap` session. Canvas slices
  1–3 shipped (founder review pending); `design-sandbox`, `globals.css`.
  Hands off `packages/intelligence` (which it authored) to W3.
- **W3 — analytics/coaching/content (IN track):** `jeremydommnich-c7`
  session. Takes over `packages/intelligence` + docs/19–20 from baseline;
  completes IN-2 Game Review V1.

## WORKSTREAM DEPENDENCIES
- IN-2 verified-fact/pitch features wait for DD-M3/M4/M5 (GR-025/GR-028).
- P1-M2 (rating) precedes IN-3/IN-8.
- Canvas slices follow DEC-029 order: LIVE MATCH → ACCEPTANCE → RESULT
  REVEAL.
- Ports/DB: W2 dev servers on 3000/4000; W1 E2E on alt ports 3100/4100 with
  isolated `bounty_bay_e2e` DB (5433). Dev DB (5432) shared read-mostly; any
  migration needs manager review first.

## NEXT INTEGRATION POINT
Cut per-worker branches + worktrees off `f1e8c99` (manager) → W1
acceptance fixes merged → W3 IN-2 founder checkpoint → founder checkpoints
on canvas slices + DD Phase 1. Then DD-M2 / IN-3 / secondary-page founder
decisions.

## MAJOR RISKS
1. Shared single checkout until workers move into worktrees (move is cheap:
   tree is clean at baseline).
2. `globals.css` is a two-owner file (see ownership table in worker files).
3. Baseline was committed uncoordinated; full test verification pending.
4. Negotiation-agent directive (PDR-1) may supersede DEC-025 personas and
   reshape DD-M7 / IN-6 — pending founder decision.
5. Port/dev-server contention between sessions.

## DO NOT BUILD YET
- 7-layer negotiation agent (PDR-1) — pending founder DEC.
- DD-M2..M7 (DEC-026: deferred, founder checkpoint per phase).
- IN-2+ beyond current in-flight work — after IN-1/2 checkpoint.
- Voice pitches (DD Phase 5), analytics platform (P1-M9), payments (never
  in V1), real money (never).
