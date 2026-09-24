# Worker 3 — analytics / coaching / content infrastructure (IN track)

Session: `jeremydommnich-c7` · Branch: `w3-retrieval-coach` (cut from
`golden-baseline-2` per manager instruction) · Worktree: `~/projects/bay-w3`
(one-time `pnpm install`; work there — the original `~/projects/bay`
checkout is manager-only). Prior branches: `w3-intelligence` (W3-01/02),
`w3-knowledge-base` (W3-03) — all merged.

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

## CURRENT TASK — W3-04 / BB-231: IN-5 retrieval + coaching composer
(contract in ~/projects/bounty-control/inbox/worker-3.md; docs/18 §5–7;
D-42 founder approvals)

**Plan (before-code contract):**
- Objective: (a) mark the 27 knowledge seeds REVIEWED — founder-approved
  2026-09-24, reviewed_by 'founder'; (b) §6 observation→concept
  mappings: explicit structured store for all 26 observation types
  (concept = ontology tag, relevance weight, conditions, version),
  validated, deterministic lookup — structured mappings first, RAG
  supplements later (no RAG now); (c) coaching composer: structured
  input → validated structured output (headline, observation,
  why_it_matters, research_context, suggested_action,
  practice_recommendation, citations, certainty_language) with fixed
  L1–L4 claim levels per field, evidence-grade register phrasing from
  IN-4's gradeStatement, deterministic templates; unsupported free-form
  output REJECTED (throws); LLM is a stub seam (NOOP provider; any
  free-form suggestion rejected, never repeated); §13 fallbacks — no
  research found → no invented citations + deterministic fallback text;
  unknown observation type → fall back to the deterministic Game Review
  facts.
- Files: NEW src/mappings.ts, src/coach.ts; EDIT src/knowledge-seeds.ts
  (REVIEWED/founder), index.ts; NEW tests/mappings.test.ts,
  tests/coach.test.ts; EDIT tests/knowledge-seeds.test.ts (review
  status assertions); docs/20 additions (my lane).
- Out of scope: RAG infrastructure, LLM integration beyond the stub
  seam, IN-6 practice system, benchmarks, schema/API/web changes.
- Tests (AGENTS.md): valid (lookup ordering, full coverage, template
  output, register phrasing, determinism), invalid (unknown concept,
  weight out of range, duplicate concept, missing coverage, free-form
  rejection, output validator rejects tampered citations),
  boundary (empty research → fallback, empty concepts), property
  (deterministic output for fixed input; LLM stub cannot change
  output).

## NEXT (after IN-5 ACCEPT)
IN-6 practice system — only after ACCEPT; stop at READY FOR REVIEW.

## STATUS — W3-04 READY FOR REVIEW (2026-09-24)
IN-5 retrieval + coaching composer implemented per BB-231 / docs/18
§5–7. Evidence: 81/81 intelligence tests (12 new); full non-db suite
276 passed / 62 db-gated skipped; typecheck clean; lint clean. No
schema/API/domain changes; the only LLM surface is a stub seam that is
rejected when it proposes anything. NOT starting IN-6 — awaiting ACCEPT.

**MANAGER VERDICT: ACCEPT** — merged `5f1d894` (D-47). Gate: tc 0,
unit 276, lint 0. Flag ruled: mapping relevance weights are provisional
editorial judgments (versioned) → founder close-out batch, same class
as OQ-025. **FOUNDER CHECKPOINT: SIGNED OFF** (founder "accept",
2026-09-24, relayed in-session; D-47 records the gate). IN-6
unblocking goes through the manager (pull-based tasking — I do not
self-assign). STANDING DOWN until the IN-6 contract lands in the inbox.

**FOUNDER CHECKPOINT REPORT — IN-5 retrieval + coaching composer**
- Changed files: NEW src/mappings.ts (observation-concept-mappings
  0.1.0: all 26 observation types mapped to ontology concepts with
  weights/conditions/version; coverage enforced; deterministic
  weight-ordered lookup; moat audit helpers), src/coach.ts
  (coaching-composer-0.1.0: structured input → validated structured
  output; L1–L4 levels on every field; grade-register phrasing via
  IN-4's gradeStatement; deterministic research selection ≤3; free-form
  LLM output REJECTED — stub seam only; §13 fallbacks for no-research
  and unknown-type), EDIT src/knowledge-seeds.ts (all 27 seeds
  founder-REVIEWED per D-42), src/types.ts (OBSERVATION_TYPES runtime
  list), src/ontology.ts (ALL_ONTOLOGY_TAGS deduped), index.ts; NEW
  tests/mappings.test.ts + coach.test.ts; EDIT
  tests/knowledge-seeds.test.ts; docs/20 sections (my lane).
- Behavior: deterministic output for a fixed input (property-tested);
  certainty language = §5 register names + STATES/ONE_POSSIBILITY;
  citations always from input research; unknown observation types fall
  back to objective Game Review facts; no evidence ever invented.
- Tests: valid (coverage, ordering, register phrasing A/B/C, moment
  facts override, selection rules), invalid (unknown concept, weight
  range, duplicate concept/type, version, missing coverage, tampered
  citations, wrong claim levels, unknown certainty, free-form
  rejection), boundary (empty research, empty concepts, citation cap),
  property (determinism, NOOP stub invariance).
- Unresolved: none blocking. Note: mapping weights are provisional
  editorial judgments (versioned with the set) — same OQ-class
  provenance as IN-3 descriptor thresholds; flagged for the founder
  close-out batch if one exists for IN-5.
- No canonical spec change beyond docs/20 (W3's working spec).

## BLOCKERS
- None.

## PRODUCT ASSUMPTIONS (record before building)
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

## COMPLETED (record)
- W3-01 IN-2 Game Review V1: ACCEPTED + merged (D-12); timeline API
  wiring by W1-03 (D-11).
- W3-02 IN-3 longitudinal profile: ACCEPTED + merged (D-25, f26c7f6);
  flags → BB-220 / founder close-out.
- W3-03 IN-4 knowledge base: ACCEPTED + merged (D-38, 28007b8);
  27 curated seeds (3 A / 11 B / 12 C / 1 D); §6 mappings ruled OUT of
  IN-4 → ride IN-5 (this task); seeds now founder-REVIEWED (D-42).
