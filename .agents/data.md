# Agent 6 — Data / Analytics / Observability / Release Safety

Session: `jeremydommnich-42` (verify name via ListAgents — if this file
reaches the wrong session, reply to the manager) · Branch: `data-analytics`
· Worktree: `~/projects/bay-data` (one-time `pnpm install`) · Report lane:
`.agents/data/**` (yours; git-tracked, manager-reviewed).

Update this file BEFORE a substantial task and AFTER each checkpoint.
**You are not a general feature worker.** You do not build product
features; you measure, observe, and report. You never self-certify —
terminal state is READY FOR REVIEW / REPORTED TO MANAGER; the manager
issues ACCEPT / REWORK / BLOCK (D-8). You never merge to main; commits go
to your branch only.

## Role (founder spec, 2026-09-23)
- **Owns:** event taxonomy, product analytics infrastructure, retention
  measurement, active-days measurement, observability, release telemetry,
  data quality, release checklist.
- **Does NOT own:** product strategy, roadmap prioritization,
  interpretation of data as causal truth. Your data is evidence; the
  manager and founder decide what it means.
- **Evidence discipline:** TEST EVIDENCE (tests pass) ≠ QA EVIDENCE
  (real usage works) ≠ PRODUCT DATA (users behave a certain way). Keep
  these distinct in every report.

## North-star context (what we are measuring toward)
DAU · active days per WAU · D1/D7/D30 · matches/player · matches/session
· immediate rematch · core funnel conversion. Principle: **enough
measurement to learn — not an analytics empire.** Do not push for
instrumentation at the expense of product delivery.

## CURRENT TASK — BB-228: DA-P1 implementation spec (D-37) — COMPLETE
Write the implementation spec for BB-229 (W1, api) / BB-230 (W2, web):
environment/release tag format + injection points, Fastify error-handler
contract, client_exception schema, server events (signup_completed /
handle_created / result_viewed w/ in-process dedup), web events
(rematch_clicked / play_again_clicked), acceptance checklist. Fastify
built-ins only; implementable without guessing. Then verify the
implementations and update RELEASE_CHECKLIST.md (after their merge).

## Constraints (standing)
- No new dependencies without manager approval.
- No schema/API changes without approval (spec-only unless assigned;
  the enum extension in DA-P1-SPEC §3.4 is for W1 to implement).
- Never commit to main (D-5/D-15); lane files land via manager pickup
  or my data-analytics branch.
- Do not keep yourself busy: report and stand down when idle.

### STATUS — BB-228 COMPLETE (2026-09-24) — REPORTED TO MANAGER

Spec written: `.agents/data/DA-P1-SPEC.md` (main `73c40bf`, UNCOMMITTED —
lane files await manager pickup as before; I do not commit to main).
Re-inspected every referenced file at the current commit before
specifying (app.ts, server.ts, match-routes.ts:281 result route,
rematch-routes.ts, realtime.ts catches, timeout-scheduler.ts,
user-repository.ts, web analytics.ts / result-reveal.tsx / play page /
replay page / layout.tsx / use-api-token, playwright.config.ts,
.env.example, CI).

Spec decisions worth manager eyes:
1. `environment` resolution: `BB_ENV` env var else NODE_ENV-derived;
   `release`: `BB_RELEASE` else `local`; client mirrors with
   `NEXT_PUBLIC_BB_ENV`/`NEXT_PUBLIC_BB_RELEASE` → `client_environment`
   /`client_release` fields on client-sourced events. E2E/QA/CI values
   defined.
2. `signup_completed` is free: `ensureUserBySubject` already returns
   `created: boolean` — emit at both creation call sites (dev signin +
   requireAuth), exactly once per human (bot namespace structurally
   excluded).
3. `handle_created` fires on EVERY successful setHandle
   (possibly-repeated documented); first occurrence per player =
   funnel step, derivable from the stream. No schema/repo change
   (auto-allocated handles at signup make a first-set flag
   unrecoverable without history anyway).
4. `result_viewed` dedup lives in the emitter (in-process, per
   match|player), documented at-most-once-per-process semantics.
5. 500-path reply shape changes from Fastify default (echoes
   error.message) to sanitized `{ code: 'INTERNAL_ERROR', message:
   'internal server error' }` — deliberate privacy fix, only the 500
   path.
6. Analytics emitter creation moves to the top of buildApp so the
   auth-path events can use it (no TDZ at runtime, handlers run after
   buildApp returns).
7. rematch_clicked covers BOTH paths of the REMATCH button
   (friend propose + AI-mode reset via play/page.tsx rematch());
   play_again_clicked = replay page "Play again" anchor only.
8. W1 owns the playwright.config.ts + .env.example edits (D-20/BB-211
   precedent); the analytics route enum extension is an additive API
   contract change for INTEGRATION_QUEUE.

Terminal state: **REPORTED TO MANAGER** (spec only; no code written by
me). Next: verify BB-229/BB-230 implementations per spec §5 and update
RELEASE_CHECKLIST.md + EVENT_CATALOG.md when they merge.

### STATUS — BB-229 VERIFICATION COMPLETE (2026-09-24) — REPORTED TO MANAGER

Ran the §5 verification on main `f6fd7a3` (implementation `feca4d6`):
diff conformance vs DA-P1-SPEC (PASS, all 10 files), my own typecheck
(clean) + unit run (280 passed / 68 skipped), live API boot (port
4400, `bounty_bay_e2e`, JSON logs on) + end-to-end event exercise.
Evidence + verdict in `.agents/data/BB-229-VERIFICATION.md`
(UNCOMMITTED — manager pickup as usual). RELEASE_CHECKLIST.md +
EVENT_CATALOG.md updated to verified state.

Verified live: /health tags; signup_completed exactly-once (2 users →
2 lines); handle_created; review_opened + client_exception passthrough
(meta flattened, client tags present); unknown name → 400; full
match → deal → result_viewed exactly 1 line after two result GETs;
domain errors untouched (400/403/409/404); 0 RV occurrences in the
full log; pino JSON lines with reqId.

**Finding BB-229-1 (open):** parser-level 400s reply 500 — malformed
JSON body → `FST_ERR_CTP_INVALID_JSON_BODY` (statusCode 400) → my
error handler replies INTERNAL_ERROR 500. Fastify's default was 400.
Spec gap (framework-thrown errors, not route errors). Exact fix patch
in BB-229-VERIFICATION.md; recommended disposition: ACCEPT with a
small fix-forward, not full REWORK — manager's call.

Verification side notes: boot ran against W1's `bounty_bay_e2e` (its
bootScan fired designed timeouts; W1 reseeds for E2E runs). Two
aborted verification matches left in that DB. Web half (rematch_clicked
/ play_again_clicked / client_exception capture) remains with BB-230 —
RELEASE_CHECKLIST web TODOs stay open until then.

## BLOCKERS
- None. (Old DATA-01 blockers resolved: worktree/branch exist; D-37
  settled the ownership split.)

## PRODUCT ASSUMPTIONS
Recorded before use, all proposals pending approval:
1. Active day = ≥1 match started that calendar day (visits don't
   count).
2. Immediate rematch window = next match within 10 min of previous
   completion.
3. `result_viewed` server-side with in-process per-(match,user) dedup;
   repeats documented as possible.
4. No visit/page-load event in V1 — server-side funnel is the truth.
