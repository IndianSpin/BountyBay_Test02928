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

## CURRENT TASK — W3-05 / BB-237: IN-6 practice system
(contract in ~/projects/bounty-control/inbox/worker-3.md; docs/18 §8;
D-56 founder sign-off → IN-6 unblocked)

**Plan (before-code contract):**
- Objective: deterministic practice system in packages/intelligence —
  drill schema (WHAT WOULD YOU DO?: scenario state, private info,
  options, teaching objective, concept tags, explanation, sources,
  optional benchmark — null until IN-8), with the
  no-universal-answer rule enforced structurally (≥2 options, pairwise
  distinct outcomes; the schema has no correctness field); micro-lessons
  1–5 minutes callable from review observation types; practice
  recommendations mapping all 26 observation types to drills + the five
  DEC-025 personas (canonical: UNRECIPROCATED_CONCESSIONS → PLAY THE
  WALL = persona 'wall'); starter set of 10 drills + 5 micro-lessons,
  every one cited from the founder-REVIEWED knowledge seeds (sources
  validated against KB citation texts).
- Files: NEW src/drills.ts (schema + validation + stores/lookups),
  src/drill-seeds.ts (starter drills + lessons + recommendation table);
  index.ts exports; NEW tests/drills.test.ts + drill-seeds.test.ts;
  docs/20 "Practice system (IN-6)" section (my lane).
- Out of scope: daily/skill drills and streaks (OQ-026 gate), any UI
  (drill UI later), LLM beyond the stub convention, benchmarks (IN-8 —
  the benchmark field exists, always null in the starter set).
- Tests (AGENTS.md): valid (every seed validates; options ≥2 with
  distinct outcomes; minutes 1–5; tags in ontology; sources = real KB
  citations; canonical mapping present; all 26 types covered by
  recommendations), invalid (single-option drill rejected, duplicate
  outcomes rejected, minutes out of range, unknown tag, fabricated
  source, duplicate drill id, lesson >5 min), boundary (unknown
  observation type lookup → fallback drill, empty practice plan),
  property (deterministic lookups, validated set stable across builds).

## NEXT (after IN-6 ACCEPT)
IN-7 improvement tracking — only after ACCEPT; stop at READY FOR
REVIEW.

## STATUS — W3-05 READY FOR REVIEW (2026-09-24)
IN-6 practice system implemented per BB-237 / docs/18 §8. Evidence:
92/92 intelligence tests (11 new); full non-db suite 301 passed / 73
db-gated skipped; typecheck clean; lint clean. No schema/API/domain
changes. NOT starting IN-7 — awaiting ACCEPT.

**FOUNDER CHECKPOINT REPORT — IN-6 practice system**
- Changed files: NEW src/drills.ts (practice-system-0.1.0: drill +
  micro-lesson schemas, structural no-universal-answer rule — ≥2
  options with pairwise distinct outcomes, no correctness field —
  source validation against KB citations, lesson minutes 1–5,
  store with drillsById / lessonsByObservation /
  recommendForObservation / practicePlan, full 26-type recommendation
  coverage enforced, deterministic fallback), src/drill-seeds.ts
  (10 WHAT WOULD YOU DO drills + 5 micro-lessons + 26-row
  recommendation table; canonical UNRECIPROCATED_CONCESSIONS → PLAY
  THE WALL ('wall'); every source resolved via a cite() helper that
  throws on fabricated references), index.ts; NEW tests/drills.test.ts
  + drill-seeds.test.ts; docs/20 "Practice system (IN-6)" section (my
  lane).
- Behavior: drills train isolated decisions with scenario state +
  private info + distinct-outcome options; micro-lessons 1–5 min
  callable from review observation types; recommendations map every
  weakness to drills + the five DEC-025 personas; daily/streaks
  correctly absent (OQ-026 gate); benchmark field present, null until
  IN-8; pure — no I/O, no LLM.
- Tests: valid (store lookups, canonical mapping, full coverage,
  seed integrity incl. schema-shape assertion that options carry only
  id/label/outcome/teachingNote), invalid (single-option drill,
  duplicate outcomes, unknown tag, fabricated source, benchmark
  non-null, bad minutes, unknown drill id, missing fallback, missing
  coverage), boundary (unknown-type fallback, empty plan, duplicate
  collapse), property (deterministic store builds and lookups).
- Unresolved: none blocking. Drill scenarios use Bounty Bay-flavored
  numbers (tenths/chips) as illustrative practice states — playability
  in the eventual drill UI is the later wiring task's concern.
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

