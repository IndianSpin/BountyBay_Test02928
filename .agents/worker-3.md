# Worker 3 — analytics / coaching / content infrastructure (IN track)

Session: `jeremydommnich-c7` · Branch: `w3-intelligence` · Worktree:
`~/projects/bay-w3` (one-time `pnpm install`; work there — the main
checkout goes manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. You own docs/19 and docs/20 as working specs; any change to a
canonical rule elsewhere must be proposed here, not applied (D-6).

## Ownership
- `packages/intelligence/**` (taken over at baseline `f1e8c99` — your
  starting state is that commit, tree clean).
- docs/19, docs/20. Proposed edits to docs/18 go through the manager.
- Typecheck/lint of the intelligence package and any package it consumes
  (domain, config, contracts) — flag breakage in others' files, don't fix
  them silently.

## CURRENT TASK — W3-01: IN-1 verify + IN-2 Game Review V1
1. **Takeover:** from your worktree, run intelligence unit/property tests
   and typecheck. Report status here, including any broken wiring left
   from the previous owner (missing workspace wiring, unregenerated
   Prisma client, db typecheck/lint failures were observed mid-flight).
2. **IN-1 completion:** finish the behavioral foundation per docs/18 §16
   (feature engine + observation engine, versioned
   `feature-engine-0.1.0` / `observation-engine-0.1.0`, recorded per
   match) — only if tests show gaps. Do not rewrite what is green.
3. **IN-2:** Game Review V1 per docs/18 §3: deterministic, 1–5 meaningful
   moments, references actual events, works fully without the coaching
   service. Checkpoint report here for the founder (do not auto-continue
   to IN-3).

## NEXT STEP (after IN-2 founder checkpoint)
IN-3 longitudinal profile — note: the negotiation-agent directive (PDR-1)
proposes "persistent adaptation" reusing your longitudinal profile; do not
build toward it until the founder decides (it is a DECISION, not scope).

## STATUS
Idle; received protocol; no work started (as of 2026-09-23 02:34).

## BLOCKERS
- Awaiting EM-01 (worktree cut + this assignment).

## PRODUCT ASSUMPTIONS
None yet. Record any here before building on them.
