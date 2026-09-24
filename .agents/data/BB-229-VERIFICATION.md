# BB-229 VERIFICATION — Data §5 check on main (2026-09-24)

Verifier: Agent 6 (Data). Target: main `f6fd7a3` (BB-229 merged via
`264f708`, implementation commit `feca4d6`). Method: diff conformance
vs `DA-P1-SPEC.md`, my own typecheck + full unit run, live API boot
(port 4400, `bounty_bay_e2e` DB, `ENABLE_JSON_LOGS=1`, `BB_ENV=e2e`,
`BB_RELEASE=verify-f6fd7a3`) and end-to-end event exercise.

## Evidence

**Diff conformance vs spec: PASS.** All 10 changed files match the spec
call sites, fields, and shapes: analytics.ts (tag stamping order
`analytics_event → environment → release → service → fields →
emitted_at`, result_viewed dedup set), app.ts (resolveEnvironment,
emitter moved to top, setErrorHandler, /health tags, signup_completed
created-gated at both call sites, handle_created at both setHandle
paths, event-route enum + meta + client tags), match-routes.ts
(result_viewed success-path), realtime.ts (both catch-fixes exact),
server.ts (logger flag + process handlers), playwright.config.ts
(BB_ENV/NEXT_PUBLIC_BB_ENV=e2e), .env.example (4 names).

**My runs:** typecheck clean (all packages); unit **280 passed / 68
skipped** (includes analytics.test.ts + da-p1.test.ts).

**Live API (verified end-to-end):**
- `/health` → `environment: e2e, release: verify-f6fd7a3` ✓
- pino JSON logs at boot ✓ (level 30; reqId present in error lines)
- `signup_completed` exactly once per human (2 users, multiple
  sign-ins → 2 lines; bot namespace structurally excluded) ✓
- `handle_created` on successful setHandle ✓
- `review_opened` passthrough ✓; `client_exception` passthrough with
  flattened meta (message/stack/path) + `client_environment` /
  `client_release` ✓; unknown name → 400 ✓
- Full match (challenge → join → ready×2 → offer → accept): deal
  completed; two `GET /result` (200, 200) → exactly **1**
  `result_viewed` line (in-process dedup works) ✓
- Domain errors untouched: 400 OUTSIDE_RESERVATION_VALUE, 403
  NOT_A_MATCH_PARTICIPANT, 409 MATCH_NOT_ACTIVE, 404 unknown route ✓
- Privacy: **0** reservation-value occurrences across the full log ✓
- bootScan on boot emitted tagged `match_timed_out` /
  `match_completed` lines for leftover ACTIVE e2e matches ✓

## FINDING — BB-229-1 (open): parser-level 400s become 500s

Fastify framework errors with a 4xx `statusCode` reach the new
`setErrorHandler` and are replied as 500. Repro (deterministic):
`POST /v1/auth/dev/signin` with body `not-json` (content-type json) →
`{"code":"INTERNAL_ERROR","message":"internal server error"}` HTTP
500. The pino line shows the underlying FastifyError
(`FST_ERR_CTP_INVALID_JSON_BODY`, `statusCode: 400`). Pre-BB-229
Fastify default replied 400. Same class: wrong content-type, empty
JSON body.

Impact: client-caused errors misreported as server errors → pollutes
the reliability signal (§ release gate) and changes the API contract
for malformed requests. The spec's "4xx untouched" intent covered
route-replied errors; framework-thrown parser errors were not
accounted for — spec gap, implementation is faithful to the letter.

Fix (small, exact, W1's file):
```ts
app.setErrorHandler((error, request, reply) => {
  const status =
    typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 500;
  request.log[status === 500 ? 'error' : 'warn'](
    { err: error, userId: request.userId ?? undefined,
      matchId: (request.params as { matchId?: string } | undefined)?.matchId ?? undefined,
      environment: deployment.environment, release: deployment.release },
    status === 500 ? 'unhandled request error' : 'invalid request',
  );
  void reply.code(status).send(
    status === 500
      ? { code: 'INTERNAL_ERROR', message: 'internal server error' }
      : { code: 'INVALID_REQUEST', message: 'invalid request body' },
  );
});
```
Recommended disposition: small BB-229 fix-forward (not REWORK of the
whole task) — everything else verifies clean. Manager's call.

## Side notes
- Verification boot used W1's `bounty_bay_e2e` DB (bootScan timeouts
  on leftover ACTIVE matches are the designed behavior; W1 reseeds for
  E2E runs). Two aborted verification matches left in that DB — W1's
  normal reseed clears them.
- Web half (`rematch_clicked` / `play_again_clicked` /
  `client_exception` capture, §4) is BB-230 (W2) — NOT part of this
  verification. RELEASE_CHECKLIST.md web TODOs stay open until then.

## Verdict
**Spec-conformant with one defect (BB-229-1).** Formal ACCEPT is the
manager's call; my recommendation: ACCEPT with the fix-forward
scheduled (small, exact patch above).
