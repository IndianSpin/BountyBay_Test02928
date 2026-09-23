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
- `packages/intelligence/**` — via handoff from worker-2 (below), not via
  re-creation.
- docs/19, docs/20. Proposed edits to docs/18 go through the manager.
- Typecheck/lint of the intelligence package and any package it consumes
  (domain, config, contracts) — flag breakage in others' files, don't fix
  them silently.

## CURRENT TASK — W3-01: IN takeover (founder correction 1)
**Do not recreate IN-1 from baseline if worker-2 already has valid
work.** Process:
1. Wait for worker-2's handoff: exact commit hash + complete/partial/
   temporary/untested list, recorded in worker-2.md (W2-02).
2. `git status` in both `~/projects/bay` (manager-only) and your
   worktree, then inspect that commit (`git show <hash>`, read the
   intelligence src + tests).
3. Either **branch from / cherry-pick that exact work**, or **explicitly
   reject parts of it with reasons** — record your decision in this file.
4. Run the intelligence unit/property tests + typecheck on the taken-over
   state; report green/broken here (including any broken wiring inherited
   from the previous owner: missing workspace wiring, unregenerated
   Prisma client, db typecheck/lint failures).
5. Finish IN-1 only where tests show gaps. Do not rewrite what is green.
6. Implement IN-2: Game Review V1 per docs/18 §3 — deterministic, 1–5
   meaningful moments, references actual events, works fully without the
   coaching service.
7. Terminal state: READY FOR REVIEW with a founder checkpoint report in
   this file. Do not auto-continue to IN-3.

## NEXT (after IN-2 founder checkpoint)
IN-3 longitudinal profile. Note: DEC-030's "persistent adaptation"
reuses your longitudinal profile — but DEC-030 implementation is
unscheduled; do not build toward it (direction only).

## STATUS (manager-merged from worker-3's own report, 2026-09-23)
- W3-01 takeover VERIFIED GREEN: pnpm install done; intelligence
  unit/property tests 34/34 pass; typecheck clean for intelligence +
  domain + config + contracts. No broken wiring at baseline. 6 eslint
  errors found in packages/intelligence (unused imports/params — 3
  src/test imports, 3 unused callback args) — fixing as in-ownership
  lint.
- IN-2 STARTED: baseline already ships IN-1 complete (versioned engines,
  persisted per match via command-service, review route serves moments).
  Gaps vs docs/18 §3: no timeline step-through, no self-contained review
  envelope.
- IN-2 plan (docs/18 §3; DEC-028; AGENTS.md testing rule):
  - NEW `timeline.ts` — buildTimeline(state, events): OFFER/MESSAGE/
    ACCEPT/WALK_AWAY/TIMEOUT/ABORTED entries, seq-ordered, no message
    content (privacy, no NLP), actor per terminal-action semantics.
  - NEW `review.ts` — buildGameReview(state, events, config, playerId,
    thresholds?): envelope game-review-0.1.0 { matchId, playerId,
    outcome, moments (curateReview), timeline }; throws on non-terminal
    state / non-participant; pure — no coaching/LLM dependency.
  - index.ts exports; lint fixes in types.ts + tests.
  - NEW tests: timeline.test.ts, review.test.ts (valid x4 outcomes,
    invalid non-terminal + non-participant, boundary cap/min, determinism
    property, moment eventRefs ⊆ timeline seqs).
  - docs/20: add Timeline + Game Review envelope spec (mine; feature
    formulas unchanged → docs/19 untouched).
- OUT OF SCOPE (correct): serving the timeline via apps/api
  match-routes.ts (worker-1 owns apps/api); any schema change (review is
  derived, not persisted — no migration); IN-3+; PDR-1/DEC-030.

## BLOCKERS
- W2-02 handoff statement not yet received — takeover was verified against
  the baseline commit (which IS worker-2's committed work, tree clean);
  acceptable interim per manager (D-10), but you must review W2's
  statement when it lands and confirm or reject specifics here.
- API timeline wiring: manager ruling — deferred to W1-03 (worker-1 owns
  apps/api), scheduled only after IN-2 is ACCEPTed. Not yours.

## PRODUCT ASSUMPTIONS
None yet. Record any here before building on them.
