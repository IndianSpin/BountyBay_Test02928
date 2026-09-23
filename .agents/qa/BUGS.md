# BUGS — Bounty Bay QA (Agent 5)

Base SHA for all findings: `92a5e61`. Each finding carries the BB-206
classification: REAL? / REPRODUCIBLE? / MATERIAL? / SEVERITY? /
OWNER-CANDIDATE?

---

## QA-001 — Joiner mid-match refresh lands on "no challenge with that token"

- **REAL:** yes. **REPRODUCIBLE:** yes — observed 3/3 runs (deterministic).
  **MATERIAL:** yes for the joiner's confidence and recovery path.
- **SEVERITY:** MEDIUM (P1-adjacent UX; no data loss, recoverable).
- **AREA:** frontend routing / join-token URL lifecycle.
- **OWNER-CANDIDATE:** worker-2 (frontend) with an API review: the join
  route could redirect participants to `/play?resume=<matchId>`.

**STEPS TO REPRODUCE:**
1. A creates a friend challenge; B opens the share link and readies.
2. A readies — the match goes ACTIVE.
3. B (the joiner) refreshes the browser.
4. B sees the home panel with an alert: **"no challenge with that token"**.

**EXPECTED:** the joiner lands back on the live match board (their browser
identity is still a participant), or at most on a neutral "back to your
game" screen.

**ACTUAL:** an error alert implying the match is gone. Below it, while the
match is live, a "Continue your game vs <opponent>" link to
`/play?resume=<matchId>` recovers the board — but the error is alarming and
the recovery requires understanding that a link labeled "continue" is the
way back from an error screen.

**EVIDENCE:** `.agents/qa/tools/specs/qa-interruption.spec.ts` (test 2
asserts the exact sequence; run per `.agents/qa/tools/README.md`);
screenshot `.agents/qa/evidence/joiner-refresh-midmatch-error.png`.

**LIKELY IMPACT:** a mid-match refresh (mobile tab reload, browser restore,
accidental pull-to-refresh) makes the player believe the match was lost;
some fraction will abandon a winnable deal. The one-time join token is
correctly single-use, but the join URL should be replaced by a match URL at
join time, or the join route should redirect known participants to resume.

**RECOMMENDED ACCEPTANCE TEST:** B reloads mid-match on the share URL →
the live board renders directly (no error alert), turn banner and clock
correct, no duplicate events (refresh must not duplicate actions).

---

## QA-002 — `pnpm typecheck` fails on main (W1-01 regression in spec)

- **REAL:** yes. **REPRODUCIBLE:** yes — deterministic. **MATERIAL:** yes —
  the typecheck gate is the manager's baseline verification step; it now
  fails for every subsequent review.
- **SEVERITY:** HIGH (build-gate broken; not user-facing).
- **AREA:** `apps/web/e2e/friend-match.spec.ts` (test-only file).
- **OWNER-CANDIDATE:** worker-1 (authored the W1-01 diagnostics).

**STEPS TO REPRODUCE:** `pnpm typecheck` at `92a5e61`.

**EXPECTED:** exit 0.

**ACTUAL:**
```
apps/web/e2e/friend-match.spec.ts(249,25): error TS2339:
Property 'code' does not exist on type
'{ code?: string } | { activeStatus: number; active: …; hasToken: boolean }'
```

**CAUSE:** W1-01's diagnostic return branch in the direct-API `evaluate`
introduced a union (`{ code?: string } | { activeStatus, active, hasToken }`)
and line 249 reads `duplicate.body.code` unguarded.

**EVIDENCE:** `/tmp/qa-tc-main.log` (full run log).

**LIKELY IMPACT:** CI/verification gate red; risk of masking future real
type errors. Playwright itself transpiles, so the E2E suite still passes —
which is why the manager's ACCEPT verification (6/6 changed specs) missed
the gate break.

**RECOMMENDED ACCEPTANCE TEST:** `pnpm typecheck` exits 0; the diagnostic
branch narrows the union before `.code` is read (or the assertion tolerates
the diagnostic shape).

---

## (Resolved, not product bugs — for the record)

- **hold-accept "accept seal vanishes after early release"** on baseline
  `c70a448` — root cause: old spec asserted on the second mover's stale
  pre-broadcast page. Fixed by W1-01 (`0aec467`), re-verified on `92a5e61`:
  seal survives early release on the true active page; full hold settles.
- **friend-match GR-007 flake** (one failure on `c70a448`) — duplicate
  direct-API probe raced the active-match lookup (status 0). W1-01 added
  diagnostics; deterministic 400 verified on `92a5e61` (battery + suite).
