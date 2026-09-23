# INTEGRATION QUEUE — Bounty Bay

Every candidate merge: task, branch, commit, **depends on**, **depended on
by**, **contract changes** (schema/API/domain — none/which), test status,
conflict risk, doc changes, migration, recommended order. Order follows
dependencies, never completion time. **Merge order is a proposal and is
re-evaluated whenever contracts/dependencies change (D-5).** Only
ACCEPTed work merges (D-8).

## Standing rules
- Main receives reviewed changes only. Manager verifies with actual
  diff/tests/design evidence.
- DB migrations: manager review before merge; no destructive actions
  against non-disposable DBs (D-4).
- Canonical doc changes ride with their code or via manager (D-6).
- QA reports (`.agents/qa/`) are review evidence: the manager reads them
  before ACCEPT/REWORK verdicts on affected flows. QA never merges code
  itself (D-14).

## Current candidates

### IQ-1 — W2 IN handoff commit (branch `w2-frontend-design`, hash TBD)
- **Depends on:** nothing (pure checkpoint of existing work).
- **Depended on by:** W3-01 (takeover), IQ-3.
- **Contract changes:** none intended (no schema/API/domain edits in a
  checkpoint commit — manager verifies in diff).
- **Acceptance:** commit hash recorded in worker-2.md; complete/partial/
  temporary/untested documented; W3 inspects.

### IQ-2 — W1 acceptance fixes (branch `w1-dd-mechanics`) — **MERGED**
- Merged to main (2026-09-23): commit `0aec467` → merge `bbf318e`.
  Manager verdict ACCEPT with evidence: test-only diff (2 E2E specs +
  worker file, no product code), deterministic first-actor fix (no
  sleeps), unit suite green (manager-run), changed E2E specs 6/6
  (manager-run, strict mode + seed overrides).
- Follow-up: W1-03 API timeline wiring (D-11) assigned.

### IQ-3 — W3 IN-2 Game Review V1 (branch `w3-intelligence`) — **MERGED**
- Merged to main (2026-09-23): commits `77bb629` + `9f16b9c`. Manager
  verdict ACCEPT with evidence (44/44 intelligence tests, full typecheck
  clean, diff in-scope, zero schema/API/domain changes). Only conflict:
  `.agents/worker-3.md` (resolved by manager, keeping the merged status).
- **Order re-evaluated (D-5):** W3 merged before W1 because it has no
  dependency on W1's fixes and changed no contracts. Current order: W3
  (done) → W1 → W2.
- Follow-ups: W1-03 API timeline wiring (D-11); founder IN-2 checkpoint.

### IQ-4 — W2 canvas regression fixes / cleanup (branch
`w2-frontend-design`, commit TBD)
- **Depends on:** founder canvas verdict.
- **Depended on by:** W2-03 CSS split.
- **Contract changes:** none (UI only; testids preserved).
- **Migration:** none.
- **Proposed order: 3.**

## Sequenced later
- W2-03 CSS structural split — after founder approves slices; must land
  before multi-agent UI work resumes.
- DD-M2 dossiers (W1) — after founder checkpoint (W1-02).
- P1-M2 rating — after IN checkpoint.
- DEC-030 negotiation agent — unscheduled.
