# Worker 3 — analytics / coaching / content infrastructure (IN track)

Session: `jeremydommnich-c7` · Branch: `w3-intelligence` · Worktree:
`~/projects/bay-w3` (one-time `pnpm install`; work there — the original
`~/projects/bay` checkout is manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. You own docs/19 and docs/20 as working specs; any change to a
canonical rule elsewhere must be proposed here, not applied (D-6).
**You never self-certify "done" — your terminal state is READY FOR
REVIEW; the manager returns ACCEPT / REWORK / BLOCK (D-8).**

## Ownership
- `packages/intelligence/**` — via handoff from worker-2 (D-10
  CONFIRMED), not via re-creation.
- docs/19, docs/20. Proposed edits to docs/18 go through the manager.
- Typecheck/lint of the intelligence package and any package it consumes
  (domain, config, contracts) — flag breakage in others' files, don't fix
  them silently.

## CURRENT TASK — W3-02 / BB-205: IN-3 longitudinal profile
(contract in ~/projects/bounty-control/inbox/worker-3.md; founder
sign-off D-21; docs/18 §9; docs/16 IN-3 row)

**Plan (before-code contract):**
- Objective: versioned pure profile engine over gameplay tendencies
  (opening aggressiveness, concession frequency/size/reciprocity,
  decision speed, agreement rate, surplus capture, no-deal tendency,
  information use, closing behavior, time-pressure performance,
  buyer/seller split); confidence bands; windowed trends; threshold-only
  style descriptors; structured coaching state. Never personality
  claims, never causal attribution.
- Files: NEW packages/intelligence/src/profile.ts (engine),
  src/coaching-state.ts (structured state + pure reducers), index.ts
  exports; NEW tests/profile.test.ts, tests/coaching-state.test.ts;
  docs/20 gets a "Longitudinal profile (IN-3)" section (my lane).
- Out of scope: rating cohorts/benchmarks (P1-M2, D-21), IN-4..IN-8,
  personality claims, DEC-030, any schema change, apps/api + apps/web
  wiring (the docs/16 "Insights API" is a cross-package need — FLAGGED
  here for manager routing, like the timeline was).
- Tests (AGENTS.md): valid (multi-match aggregate, windows, trends,
  descriptors, coaching reducers), invalid (empty history, duplicate
  matchId, band/descriptor misuse), boundary (band edges 1/4/5/14/15/
  29/30; recent/previous window edges; descriptor cap), property
  (determinism, input-order independence, no causal language in any
  output).

## NEXT (after IN-3 ACCEPT)
IN-4 knowledge system (ontology + 20–30 records + mappings) — only after
ACCEPT; stop at READY FOR REVIEW, do not auto-continue.

## STATUS — W3-02 READY FOR REVIEW (2026-09-23)
IN-3 engine implemented per BB-205 / docs/18 §9 / docs/16 IN-3 row.
Evidence: 56/56 intelligence tests (12 new); full non-db suite 238
passed / 48 db-gated skipped; typecheck clean across the package +
domain/config/contracts; lint clean. No schema, no API/web, no domain
changes. NOT starting IN-4 — awaiting ACCEPT.

**FOUNDER CHECKPOINT REPORT — IN-3 longitudinal profile**
- Changed files: NEW packages/intelligence/src/profile.ts
  (longitudinal-profile-0.1.0: confidence bands, 23 dimensions,
  lifetime/recent/previous/rolling windows, delta+direction trends,
  threshold-only style descriptors with evidence, role split) +
  src/coaching-state.ts (coaching-state-0.1.0: focus/topics/
  assignments/completions/before-after/repeat-issues, pure transitions)
  + index.ts + tests/profile.test.ts + tests/coaching-state.test.ts +
  docs/20 "Longitudinal profile (IN-3)" section (my lane).
- Behavior: versioned profile over gameplay tendencies; band edges
  1/4/5/14/15/29/30 exact; trends report metric+windows+delta+direction
  only — no causal text anywhere; descriptors fire only on numeric
  thresholds (gate 5 matches, cap 3, priority order), each with numeric
  evidence; ABORTED matches excluded; role split buyer/seller; no
  rating key (D-21); no clock reads — deterministic and input-order
  independent.
- Tests: valid (single-match, windows, trends DOWN delta −2, descriptors
  priority+cap+gate, role split, coaching lifecycle immutability),
  invalid (empty history, all-aborted, duplicate matchId, non-finite
  endedAt, band(0), duplicate/unknown/double/early completion,
  non-finite timestamps, unknown focus), boundary (band edges, window
  shrink, empty-state coaching ops), property (determinism +
  order-independence, no interpretive vocabulary in output).
- Unresolved: (a) docs/16 names an "Insights API" for IN-3 — serving
  the profile needs apps/api wiring (cross-package) → FLAGGED for
  manager routing (like D-11); (b) OQ-025 descriptor thresholds remain
  OPEN — all 10 defaults are PROVISIONAL, configurable, versioned;
  founder close-out would make them canonical.
- Spec ambiguity: none blocking; docs/18 §9 gave tendencies + bands,
  the exact dimension list is derived 1:1 from BehaviorFeatures in
  docs/19 and recorded in docs/20.
- No canonical spec change beyond docs/20 (W3's working spec).

## BLOCKERS
- None. (Insights API wiring flagged as cross-package need, not a
  blocker: manager routes it like D-11 did.)

## PRODUCT ASSUMPTIONS (record before building)
- OQ-025 is OPEN on descriptor thresholds — all descriptor defaults
  below are PROVISIONAL, configurable, versioned; not canonical until
  the founder closes OQ-025. Proposed defaults: AGGRESSIVE_OPENER
  (mean openingPositionInZopa ≤ 0.35), CAUTIOUS_OPENER (≥ 0.65),
  HARD_BARGAINER (mean surplus capture ≥ 0.60), FREQUENT_CONCEDER
  (mean concessionCount ≥ 3), SILENT_NEGOTIATOR (mean messagesSent = 0
  and mean offerCount ≥ 3), QUICK_DECIDER (mean decision ≤ 8000 ms),
  SLOW_DECIDER (≥ 25000 ms), PATIENT_CLOSER (mean crossing→settlement
  ≥ 60000 ms), QUICK_CLOSER (≤ 5000 ms), TIME_PRESSURED (mean pressure
  exposure ≥ 0.25). Gate: matchCount ≥ 5 (EARLY SIGNAL); cap: 3
  descriptors by priority order.
- ABORTED matches are excluded from the profile entirely (technical
  termination is not a negotiation; counts would poison aggregates).
  Recorded in docs/20.
- Window defaults: recent N = 10, previous N = 10, rolling N = 5 —
  configurable; all windows derive from the same endedAt-sorted history.
- Trend direction uses a relative flat epsilon (default 0.001): change
  is reported as UP/DOWN/FLAT with delta only — no text, no cause.
- Profile carries NO generated timestamp (pure/deterministic); ordering
  is from input `endedAt`, the profile reports `lastMatchEndedAt`.

## COMPLETED — W3-01 (record)
IN takeover + IN-2 Game Review V1: ACCEPTED and merged (D-12). 44/44
tests, typecheck clean, no contract changes; buildTimeline +
buildGameReview in packages/intelligence; docs/20 Timeline + envelope
specs; D-10 handoff review CONFIRMED (c70a448); timeline API wiring
done by W1-03 (D-11); docs/18 §3 now points to docs/20 for timeline
event kinds (D-13).
