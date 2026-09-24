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

## CURRENT TASK — W3-06 / BB-254: AI table talk (AI_BEHAVIOR_CONTRACT)
(contract in ~/projects/bounty-control/inbox/worker-3.md;
.agents/CANONICAL_CONTRACTS.md §3; D-70 stabilization)

**Plan (before-code contract):**
- Objective: deterministic AI-turn pipeline in packages/intelligence —
  OBSERVE (legal view only) → UPDATE BELIEFS → legal economic action
  (PASSED IN from the persona layer; the module never invents moves) →
  CHOOSE SOCIAL INTENT (probe / challenge / justify / request
  reciprocity / hold / signal finality / conditional close / pressure /
  disclose / bluff-where-permitted) → GENERATE TABLE TALK (fixture set
  per intent, deterministic selection) → RETURN CONTROL. Graceful
  fallback: generation failure ⇒ deterministic fallback line —
  non-response impossible. No hidden human information anywhere in the
  module (no RV fields exist in its input types; opponent message
  CONTENT never read — presence only).
- Files: NEW src/table-talk.ts (pipeline + beliefs + intent selection
  + fixture set + fallback); index.ts exports; NEW
  tests/table-talk.test.ts; docs/20 "AI table talk (BB-254)" section
  (my lane).
- Out of scope: editing packages/ai (personas are READ-ONLY for me —
  the seam: the ai package calls the persona as today and passes the
  decision + view-derived observations into this module; flagging the
  wiring to the manager), LLM anywhere, bluff fixtures that state false
  verifiable facts (bluff = vague claims about resolve, never fake
  numbers), PRODUCT_HEALTH.md edits (manager flips the row on ACCEPT).
- Tests (AGENTS.md): valid (every intent has ≥3 deterministic
  fixtures; full pipeline run for each intent × persona; beliefs
  update rules; deterministic selection for fixed inputs), invalid
  (fixture generation failure → runAiTurn still returns a line —
  non-response impossible; unknown intent → fallback), boundary
  (empty history beliefs start UNKNOWN; first turn; final turn),
  property (determinism; economicAction passthrough identity — the
  language layer never changes the move; talk never empty).

## NEXT (after BB-254 ACCEPT)
IN-7 improvement tracking (pull-based; founder IN-6 checkpoint +
manager contract) — plus the AI-turn seam wiring (who calls
runAiTurn) needs manager routing like D-11 did.

## STATUS — W3-06 READY FOR REVIEW (2026-09-24)
AI table talk implemented per BB-254 / AI_BEHAVIOR_CONTRACT. Evidence:
100/100 intelligence tests (8 new); full non-db suite 309 passed / 80
db-gated skipped; typecheck clean; lint clean. No changes to
packages/ai (personas read-only, untouched), no schema/API/domain
changes. NOT starting IN-7 — awaiting ACCEPT.

**MANAGER VERDICT: ACCEPT** — merged `05bff7f` (D-74). Gate: tc 0,
unit 309, lint 0. Matrix row corrected by the manager: AI table talk =
YELLOW (engine merged, wiring pending) — goes GREEN after W1's BB-257
(AiTurnEngine is the caller — W1's domain) and QA's re-walk. Standing
by: BB-258 (profile/training update after AI matches) is next, GATED
on BB-257 ACCEPT — contract already in the inbox; not started until
the dependency merges.

**FOUNDER CHECKPOINT REPORT — AI table talk (BB-254)**
- Changed files: NEW src/table-talk.ts (table-talk-0.1.0: the
  six-stage deterministic turn pipeline — OBSERVE legal-view-only
  input, UPDATE BELIEFS three-state judgments, legal economic action
  passed in and returned unchanged, CHOOSE SOCIAL INTENT decision
  table over all 10 contract intents with persona-flavored defaults,
  GENERATE TABLE TALK fixture set 3+ lines per intent selected by
  hash(matchId, roundNumber, intent), RETURN CONTROL envelope), index
  exports; NEW tests/table-talk.test.ts; docs/20 "AI table talk
  (BB-254)" section (my lane).
- Behavior: deterministic-only (no LLM, no RNG); hidden information
  impossible by construction (no RV fields, no message content — the
  test asserts the input surface has none); the language layer cannot
  make or alter moves (economicAction passthrough identity-tested);
  bluff = vague resolve claims, never fake facts; generation failure
  or timeout stub ⇒ deterministic per-intent fallback line —
  non-response impossible (tested with throwing and empty-string
  generators across all personas and rounds).
- Tests: valid (beliefs rules, intent order incl. ACCEPT → conditional
  close / WALK_AWAY → finality, deterministic fixtures, full turn per
  persona × action kind), invalid (unknown intent throws in the
  generator; runAiTurn falls back instead), boundary (initial UNKNOWN
  beliefs, first rounds), property (determinism, passthrough
  identity, talk never empty).
- Unresolved / flags: (a) THE SEAM — who calls runAiTurn (ai package
  turn engine / API) needs manager routing; packages/ai files
  untouched per read-only instruction; (b) PRODUCT_HEALTH.md's
  JOURNEY B "AI table talk" row goes RED → GREEN on ACCEPT — manager's
  file to flip after verification.
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

