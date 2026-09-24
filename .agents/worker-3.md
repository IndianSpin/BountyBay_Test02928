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

## CURRENT TASK — W3-08 / BB-267: review-envelope nulls + RESULT eventRefs
(contract in ~/projects/bounty-control/inbox/worker-3.md; QA BB-206
INFO, D-86 functionality-first window)

**Plan (before-code contract):**
- Objective: resolve the QA INFO. Investigation (QA wire capture at
  /tmp/qa-discovery.json) shows: (a) the fields QA named —
  surplusShareBp / settled / timeUsedMs — do NOT exist in the
  envelope; the canonical fields surplusShareCaptured /
  settlementTenths / totalActiveMs are FILLED from authoritative match
  state (193 / 0 / 12 in the capture). → Mark intentional-with-reason:
  docs/20 gets the name mapping + fill/nil rules. (b) The RESULT
  moment genuinely has eventRefs: [] — curateReview never receives the
  terminal event. → FIX: optional terminalEventRef parameter threaded
  from the event stream; curation version bumps to
  review-curation-0.2.0.
- Files: EDIT src/curate.ts (terminalEventRef + version bump),
  src/review.ts (buildGameReview passes the terminal event sequence),
  tests/curate.test.ts + review.test.ts (RESULT refs + version),
  docs/20 (name mapping + curation 0.2.0 note — my lane).
- Out of scope: apps/api review route (worker-1's file — the route
  should pass the terminal sequence to curateReview; FLAGGED for the
  manager to route as a one-line follow-up), web review page rendering.
- Tests: valid (RESULT moment carries the terminal event ref when
  provided — deal/walk/timeout variants; absent parameter keeps []
  backward-compatible), invalid (none — parameter is optional data),
  boundary (ABORTED terminal ref), property (determinism preserved).

## NEXT (after BB-267 ACCEPT)
IN-7 improvement tracking (stabilization exit pending).

## STATUS — W3-08 READY FOR REVIEW (2026-09-24)
BB-267 resolved. Evidence: 109/109 intelligence tests (2 new); full
non-db suite 318 passed / 81 db-gated skipped; typecheck clean; lint
clean. NOT starting IN-7 — awaiting ACCEPT.

**FOUNDER CHECKPOINT REPORT — review-envelope nulls (BB-267)**
- Changed files: EDIT src/curate.ts (curateReview gains an optional
  terminalEventRef; the RESULT moment now carries it — curation bumps
  to review-curation-0.2.0), src/review.ts (buildGameReview passes the
  terminal event sequence from the stream), tests/curate.test.ts +
  review.test.ts (RESULT refs for deal/walk/timeout + backward
  compatibility), docs/20 (name mapping + fill/nil rules + 0.2.0 note —
  my lane).
- Behavior: (a) the three "null" fields QA named (surplusShareBp /
  settled / timeUsedMs) do not exist in the envelope — the canonical
  fields surplusShareCaptured / settlementTenths / totalActiveMs are
  filled from the authoritative match state and null only where the
  data genuinely does not exist (no deal → no settlement/surplus);
  documented with the mapping in docs/20. (b) RESULT moment eventRefs
  now point at the terminal event (accept/walk/timeout/abort) when the
  caller supplies it — timeline links can render for the RESULT
  moment too; omitted parameter keeps [] (backward compatible).
- Tests: valid (RESULT refs = terminal seq for every outcome; ref
  exists in the timeline; version const 0.2.0), boundary (parameter
  omitted → []), property (determinism preserved).
- Unresolved / flags: the API review route (apps/api, worker-1's file)
  should pass the terminal sequence into curateReview so the served
  envelope picks the fix up — one-line follow-up, FLAGGED for manager
  routing (the package already enables it).
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
- W3-07 post-match progress (BB-258): ACCEPTED + merged (D-78,
  98404cb); matrix YELLOW pending W2 BB-262 seam.
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

