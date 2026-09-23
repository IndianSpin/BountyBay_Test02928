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

## STATUS — W3-01 CHECKPOINT: takeover verified, IN-2 implemented
(as of 2026-09-23; commit `77bb629` on w3-intelligence)

**Takeover (IN-1 state):** GREEN. 34/34 inherited unit/property tests
pass; typecheck clean for intelligence + domain + config + contracts;
db + api (the two importers) also typecheck. No broken wiring from the
previous owner at baseline. The one defect found: 6 eslint errors
(unused imports/params in `types.ts` and test files) — fixed
in-ownership as takeover lint cleanup. IN-1 is COMPLETE per docs/18 §16:
feature + observation engines versioned `feature-engine-0.1.0` /
`observation-engine-0.1.0`, persisted per match by command-service
(matchFeature/matchObservation rows), served by the review route.

**IN-2 implemented (the two §3 gaps over the inherited curation layer):**
- `src/timeline.ts` — `buildTimeline`: seq-ordered negotiation steps
  (OFFER/MESSAGE/ACCEPT/WALK_AWAY/TIMEOUT/ABORTED) from the persisted
  event stream; message content never loaded; TIMEOUT attributed to the
  timed-out player.
- `src/review.ts` — `buildGameReview`: envelope `game-review-0.1.0`
  { version, curationVersion, featureVersion, observationVersion,
  matchId, playerId, outcome, moments, timeline }; pure over
  (state, events, config, playerId); throws on non-completed match and
  non-participant; no coaching/LLM dependency — works fully when the
  coaching service is unavailable (docs/18 §13 fallback direction).
- docs/20: added "Timeline" and "Game Review envelope" specs.

**Tests added/run:** 44/44 intelligence (10 new: timeline valid/
boundary, review envelope valid ×4 outcomes / invalid ×2 / boundary /
determinism+self-containment, seeded property: determinism, moment
bounds, eventRefs ⊆ timeline seqs for 30 random matches). Full non-db
suite: 226 passed, 47 db-gated skipped. Typecheck clean across
intelligence/domain/config/contracts/db/api. Lint clean.

**FOUNDER CHECKPOINT REPORT — IN-2 Game Review V1**
- Changed files: packages/intelligence (timeline.ts, review.ts new;
  index.ts, types.ts, 4 test files) + docs/20. 11 files, +432/−7.
- Behavior: deterministic post-match review per player — RESULT-first
  1–5 moments + full event timeline; all copy Level 1 facts; timeline
  derivable from stored rows (nothing persisted, no schema change).
- Tests: 44/44 package; 226 non-db suite; property invariants seeded.
- Unresolved: (a) the API review route serves moments only — serving the
  timeline needs a change in `apps/api/src/match-routes.ts` (worker-1's
  area) → routing decision requested; (b) W2-02 handoff statement still
  not received (verified directly against baseline instead).
- Spec ambiguity: docs/18 §3 says "timeline step-through" without
  defining which events belong in it; docs/20 now defines it (working
  spec). If canonical docs/18 should carry the event-kind list, that
  change goes through the manager.
- No canonical spec change made: docs/18 untouched; only docs/20 (W3's
  working spec) extended. No DECISION_LOG update needed.
- NOT continuing to IN-3 — awaiting founder sign-off.

## BLOCKERS
- API timeline wiring: needs manager routing (apps/api = worker-1 per
  D-2). Proposed as part of the IN-2 founder checkpoint.
- W2-02 handoff statement still owed by worker-2 (not blocking).

## PRODUCT ASSUMPTIONS
- Timeline excludes plumbing events (MATCH_STARTED/PLAYER_READY/pause/
  disconnect/reconnect/MATCH_COMPLETED) — negotiation steps only;
  documented in docs/20 (working spec, not a canonical-rule change).
- Review is derived, never persisted: no Prisma schema change rides with
  IN-2 (IQ-3 migration risk does not materialize).
- Envelope version `game-review-0.1.0`; any timeline/curation change
  bumps its version.
