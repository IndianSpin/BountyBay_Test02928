# Worker 3 — analytics / coaching / content infrastructure (IN track)

Session: `jeremydommnich-c7` · Branch: `w3-table-talk` (cut from main
644ff28 — no golden baseline named; BB-254's contract files live on
main) · Worktree: `~/projects/bay-w3` (one-time `pnpm install`; work
there — the original `~/projects/bay` checkout is manager-only). Prior
branches: `w3-intelligence` (W3-01/02), `w3-knowledge-base` (W3-03),
`w3-retrieval-coach` (W3-04/05) — all merged.

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

## CURRENT TASK — W3-07 / BB-258: post-match progress payload
(contract in ~/projects/bounty-control/inbox/worker-3.md; D-76 BB-257
merged → dependency satisfied)

**Plan (before-code contract):**
- Objective: engine-side computation + payload spec for the second
  Journey B RED — deterministic post-match progress for the result
  screen, built from the existing IN-3 profile + IN-6 practice data:
  training history (profile matchCount + confidence band +
  band transition), personal records (best surplus capture, fastest
  close, longest hold, largest single concession — each with the
  matchId they came from), skill observations (this match's
  observations mapped to drills/persona/lessons via the practice
  store), active training goal (coaching-state focus + label), AI
  mastery (per-persona matches/deals/deal rate/avg surplus capture/
  current deal streak, plus an overall AI row).
- Files: NEW src/post-match-progress.ts (post-match-progress-0.1.0);
  index.ts exports; NEW tests/post-match-progress.test.ts; docs/20
  "Post-match progress (BB-258)" section = the payload spec (my lane).
- Out of scope: the UI seam (W2's, coordinated via the manager),
  persistence (the payload is computed on demand from stored rows —
  no schema change), rating/cohorts (P1-M2/IN-8), any LLM.
- Tests (AGENTS.md): valid (full payload per contract; band
  transitions FIRST_MATCH/ADVANCED/SAME; records carry correct
  matchIds; skill observations map through the practice store; mastery
  rates + streaks; active goal from coaching state), invalid (aborted
  current match, duplicate matchId, non-finite endedAt), boundary
  (first match, human-PvP match, empty coaching state), property
  (determinism; no clock reads — every timestamp is input data).

## NEXT (after BB-258 ACCEPT)
IN-7 improvement tracking (pull-based; founder IN-6 checkpoint +
manager contract).

## STATUS — W3-07 READY FOR REVIEW (2026-09-24)
Post-match progress payload implemented per BB-258. Evidence: 107/107
intelligence tests (7 new); full non-db suite 316 passed / 81 db-gated
skipped; typecheck clean; lint clean. No schema/API/domain changes.
NOT starting IN-7 — awaiting ACCEPT.

**MANAGER VERDICT: ACCEPT** — merged `98404cb` (D-78). Gate: tc 0,
unit 316, lint 0. Matrix ruling: profile row → YELLOW (engine exists,
player sees nothing yet) — the result-screen seam is W2's (BB-262,
queued after its golden-reference work), then QA flips the row. My
part is done. STANDING DOWN — IN-7 waits for the stabilization exit.

**FOUNDER CHECKPOINT REPORT — post-match progress (BB-258)**
- Changed files: NEW src/post-match-progress.ts
  (post-match-progress-0.1.0: buildPostMatchProgress — profile
  recomputed including the current match; trainingHistory with band
  transitions FIRST_MATCH/ADVANCED/SAME; personalRecords with matchIds;
  skillObservations mapped through the practice store; activeTrainingGoal
  from structured coaching state; aiMastery overall + per-persona with
  deal rates, avg surplus capture, streaks), index exports; NEW
  tests/post-match-progress.test.ts; docs/20 "Post-match progress
  (BB-258)" section = the payload spec for the result screen (my lane).
- Behavior: deterministic, clock-free (every timestamp is input data);
  guards reject ABORTED current match, non-finite endedAt, duplicate
  matchIds; human-PvP matches (personaKey null) count toward the
  profile but not AI mastery; nothing persists — computed on demand.
- Tests: valid (full payload, band transitions ×3, records carry the
  right matchIds, skill observations → drills/persona/lessons, mastery
  rates + streaks, active goal from focus), invalid (aborted, NaN,
  duplicate id), boundary (first match, empty history, human-PvP, no
  focus), property (determinism on identical inputs, no clock reads).
- Unresolved / flags: (a) the UI seam is W2's — the payload spec in
  docs/20 is what the result screen should show; surface coordination
  goes through the manager; (b) PRODUCT_HEALTH "Profile/training
  update" row is the manager's to flip on ACCEPT (engine now exists).
- No canonical spec change beyond docs/20 (W3's working spec).

## PRODUCT ASSUMPTIONS (record before building)
- (BB-254) The module never holds hidden information: its input types
  have no reservation-value fields, and opponent message CONTENT is
  never read — only presence (message count). Fixtures may reference
  only public match facts (both players' offers are public within a
  live match).
- (BB-254) Bluff fixtures are vague claims about resolve ("I can hold
  this line") — never fabricated verifiable facts, never fake numbers.
- (BB-254) The economic action is always passed IN from the persona
  layer and returned unchanged — the language layer cannot make or
  alter a move; domain validation stays where it is (packages/domain).
- (BB-254) Deterministic fixture selection: index = hash(matchId,
  roundNumber, intent) mod fixture count — same match + turn + intent
  always yields the same line, with no RNG dependency.
- (BB-254) Beliefs are coarse three-state judgments over legal-view
  observations only; they never imply knowledge of the opponent's RV.
- Seed review metadata change (DRAFT → REVIEWED, reviewed_by founder)
  does not bump record versions — claims and provenance unchanged;
  only the review fields per D-42.
- Mappings require FULL coverage of the 26 observation types (§6
  "structured mappings first"); RAG later only supplements, so a
  missing mapping is a validation error, not a fallback.
- Mapping concept references use the IN-4 ontology tag vocabulary only.
- Composer research selection is deterministic: prefer highest evidence
  grade, tie-break by record id (document order); at most 3 citations.
- certainty_language values are the §5 register names plus STATES (L1
  fact) and ONE_POSSIBILITY (L4 with no research).
- (IN-6) Drill sources must be real KB citation texts — validation
  rejects fabricated references the same way the composer rejects
  invented citations.
- (IN-6) No-universal-answer is structural: ≥2 options, pairwise
  distinct outcomes, and the schema simply has no correctness field —
  no drill can mark an option as "the answer".
- (IN-6) Persona references are DEC-025 persona keys as strings
  (anchor/grinder/closer/wall/mirror); the intelligence package never
  imports packages/ai (purity boundary).
- (IN-6) Recommendation coverage: all 26 observation types map to at
  least one drill + at most one persona; drills may be shared across
  weaknesses (many-to-one is fine, a missing row is a validation
  error).

## COMPLETED (record)
- W3-06 AI table talk: ACCEPTED + merged (D-74, 05bff7f); six-stage
  deterministic pipeline, matrix YELLOW pending BB-257 wiring (now
  wired, D-76).
- W3-01 IN-2 Game Review V1: ACCEPTED + merged (D-12); timeline API
  wiring by W1-03 (D-11).
- W3-02 IN-3 longitudinal profile: ACCEPTED + merged (D-25, f26c7f6);
  flags → BB-220 / founder close-out.
- W3-03 IN-4 knowledge base: ACCEPTED + merged (D-38, 28007b8);
  27 curated seeds (3 A / 11 B / 12 C / 1 D); seeds founder-REVIEWED
  (D-42).
- W3-04 IN-5 retrieval + coach: ACCEPTED + merged (D-47, 5f1d894);
  mappings 26/26 + deterministic composer; founder checkpoint SIGNED
  OFF (D-56).
- W3-05 IN-6 practice system: ACCEPTED + merged (D-59, 2745924);
  drill schema with structural no-universal-answer rule + cite() guard;
  founder IN-6 checkpoint pending.

