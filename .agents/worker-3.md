# Worker 3 — analytics / coaching / content infrastructure (IN track)

Session: `jeremydommnich-c7` · Branch: `w3-knowledge-base` (cut from
`golden-baseline-1` per manager instruction) · Worktree: `~/projects/bay-w3`
(one-time `pnpm install`; work there — the original `~/projects/bay`
checkout is manager-only). Prior branch `w3-intelligence` carries
W3-01/W3-02 (both ACCEPTED + merged) and the verdict-record commit
`b50a74e`.

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

## CURRENT TASK — W3-03 / BB-227: IN-4 negotiation knowledge base
(contract in ~/projects/bounty-control/inbox/worker-3.md; docs/18 §4–5;
founder signed off IN-3 → IN-4 unblocked)

**Plan (before-code contract):**
- Objective: pure, versioned knowledge base in packages/intelligence —
  the §4 ontology as typed constants; the §5 record schema (id, title,
  summary, ontology_tags, claim, practical_implication, conditions,
  limitations, evidence_level A–D, source_type, authors, year,
  publication, doi/url, citation_text, license/access metadata,
  review_status, reviewed_by, created_at, version); deterministic
  validation enforcing the grade rules (A/B require empirical source
  types) and provenance rules (authors + year + publication +
  citation_text on every record); fixed per-grade register phrases
  (§5: A/B "Research suggests…", C "A widely used negotiation framework
  recommends…", D "One practitioner approach is…"); a pure store
  (byId/byTag/byGrade, conflicting claims preserved with conditions);
  ~24 curated seed records — real scholarship only, open-access papers /
  bibliographic references / curated summaries, no invented DOIs,
  review_status DRAFT with reviewed_by null pending IN-5 use.
- Files: NEW src/ontology.ts, src/knowledge.ts, src/knowledge-seeds.ts;
  index.ts exports; NEW tests/knowledge.test.ts + knowledge-seeds.test.ts;
  docs/20 "Knowledge base (IN-4)" section (my lane).
- Out of scope: retrieval/RAG and coaching composer (IN-5), benchmarks
  (IN-8), any LLM call, DB migration (seeds are in-code; flag if a
  table is wanted later), §6 observation→concept mappings — docs/16's
  IN-4 row lists mappings but BB-227 does not; FLAGGED below for the
  manager (contract vs canonical row).
- Tests (AGENTS.md): valid (every seed passes validation + grade rules;
  register phrases per grade), invalid (missing fields, unknown tag,
  bad grade/source pairing, empty authors, non-finite created_at, bad
  version), boundary (empty store; duplicate id rejected; conflicting
  records for the same tag preserved side by side), property
  (determinism, pure lookup semantics).

## NEXT (after IN-4 ACCEPT)
IN-5 retrieval + coach — only after ACCEPT; stop at READY FOR REVIEW.

## STATUS — W3-03 READY FOR REVIEW (2026-09-24)
IN-4 knowledge base implemented per BB-227 / docs/18 §4–5. Evidence:
69/69 intelligence tests (13 new); full non-db suite 264 passed / 61
db-gated skipped; typecheck clean; lint clean. No schema/API/domain
changes, no LLM calls. NOT starting IN-5 — awaiting ACCEPT.

**FOUNDER CHECKPOINT REPORT — IN-4 negotiation knowledge base**
- Changed files: NEW src/ontology.ts (§4 taxonomy: 9 categories,
  structured tag vocabulary, multi-category tags), src/knowledge.ts
  (knowledge-base-0.1.0: §5 schema, deterministic validation with
  structural grade rules — A/B require empirical source types — and
  provenance rules, fixed per-grade register phrasing, pure store with
  byId/byTag/byGrade and a conflicts map that preserves opposing claims
  side by side), src/knowledge-seeds.ts (27 curated records: 3 A
  meta-analytic, 11 B empirical, 12 C frameworks, 1 D contested), index
  exports; NEW tests/knowledge.test.ts + knowledge-seeds.test.ts;
  docs/20 "Knowledge base (IN-4)" section (my lane).
- Behavior: every record carries the full §5 schema with provenance
  (authors + year + publication + citation always; DOIs only where
  confidently known — 4 records); all seeds ship DRAFT / reviewed_by
  null (human review required before IN-5 cites them); one seeded
  conflict pair (first-offer anchoring vs "never open first") preserved
  with conditions on both sides; no LLM, no I/O, no clock reads.
- Tests: valid (typed lookups, register phrasing per grade, conflicts
  map, coverage), invalid (13 schema/grade violations incl. grade-A
  book source), boundary (empty base, duplicate ids), property
  (determinism); seeds: 20–30 count, provenance on all, all 9 §4
  categories covered, conflict pair present, doi_url shape.
- Unresolved / flags: (a) docs/16's IN-4 row includes §6
  observation→concept mappings but BB-227 scopes §4–5 — mappings NOT
  implemented; propose they ride IN-5 retrieval (flag for manager
  routing); (b) seed review (DRAFT → REVIEWED) needs a human/founder
  pass before IN-5.
- No canonical spec change beyond docs/20 (W3's working spec).

## BLOCKERS
- None. Flag (not blocker): §6 mappings routing — IN-4 (per docs/16
  row) vs IN-5 (per BB-227 scope); awaiting manager ruling.

## BLOCKERS
- None. Flag (not blocker): docs/16 IN-4 row says "ontology, ~20–30
  records, observation→concept mappings" while BB-227 scopes §4–5
  (ontology + records + grades) — mappings (§6) not implemented;
  confirm with manager whether they ride IN-4 or IN-5.

## PRODUCT ASSUMPTIONS (record before building)
- All seeds ship review_status DRAFT, reviewed_by null — human/founder
  review is a pre-requisite before IN-5 retrieval can cite them.
- Grade discipline is enforced structurally: A/B ⇒ source_type in
  {OPEN_ACCESS_PAPER, LICENSED_MATERIAL}; C/D allow bibliographic
  references and curated summaries; D marks contested/practitioner-only
  claims. Conflicting research is preserved (both records kept with
  their conditions), never merged.
- Provenance rule: authors (non-empty) + year + publication +
  citation_text required; doi/url optional but never invented —
  DOIs included only where confident; omitted otherwise.
- created_at values are explicit data in the seeds (no clock reads —
  purity rule as in profile/coaching-state).

## COMPLETED — W3-01 / W3-02 (record)
- W3-01 IN-2 Game Review V1: ACCEPTED + merged (D-12); timeline +
  review envelope; D-10 handoff CONFIRMED; timeline API wiring done by
  W1-03 (D-11); docs/18 §3 → docs/20 pointer (D-13).
- W3-02 IN-3 longitudinal profile: ACCEPTED + merged (D-25, f26c7f6);
  profile 0.1.0 + coaching-state 0.1.0; manager-verified 56/56; flags
  ruled: Insights API → BB-220 (W1), OQ-025 thresholds provisional →
  founder close-out batch.
