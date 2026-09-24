# Worker 1 — domain / deterministic mechanics (DD track)

Session: `gameplay-depth-anti-stalling` · Branch: `w1-dd-mechanics` ·
Worktree: `~/projects/bay-w1` (one-time `pnpm install`; move there after
EM-01 message — the main checkout goes manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint (CURRENT TASK / STATUS / LATEST COMMIT / FILES / TESTS /
BLOCKERS / PRODUCT ASSUMPTIONS / NEXT STEP). Do not edit canonical
`docs/*` directly — propose doc changes here and the manager applies them
(D-6). **You never self-certify "done" — your terminal state is READY
FOR REVIEW; the manager returns ACCEPT / REWORK / BLOCK (D-8).**

## Ownership
- `packages/domain`, `apps/api` (esp. `timeout-scheduler.ts`), `packages/db`
  prisma schema (changes need manager migration review), DD feature config
  in `packages/config`.
- Web (your slice files only): `use-hold.ts`, `match-actions.tsx`,
  `time-warning.tsx`, `layout.tsx` (fonts), E2E: `hold-accept.spec.ts`,
  `timeout.spec.ts`, `friend-match.spec.ts`, `canvas-checkpoint.spec.ts`.
- `globals.css`: only your `.lm-accept`, `.lm-walk__hold`,
  `.lm-confirm-sheet` sections (+ their reduced-motion entries). W2 owns
  the rest; cross-section needs → flag to manager.
- E2E infra: isolated `bounty_bay_e2e` DB (5433) + alt ports 3100/4100
  (D-4). Do not kill other sessions' dev servers on 3000/4000.

## CURRENT TASK — BB-257 (table-talk wiring, AI_BEHAVIOR_CONTRACT §3) — READY FOR REVIEW

Wired the merged BB-254 pipeline (packages/intelligence runAiTurn,
table-talk-0.1.0) into AiTurnEngine.performAiTurn: the persona layer
now decides the legal economic action ONLY (decide with chatAllowed
false; an unexpected chat array → logged + WALK_AWAY, never wedged);
runAiTurn receives legal-view observations (own + opponent public
offers, concession run, opponent decision window, message PRESENCE
only — never message content, never RVs), updates per-match beliefs
(in-memory map, restart-safe since the talk hash derives from
matchId/round/eventSequence), and returns the talk + intent. The talk
commits as a MESSAGE before the economic move (same ordering as the
old flavor-chat path); the pipeline's fallback makes non-response
impossible. Intent observability: new `ai_turn_intent` analytics line
per turn {matchId, playerId(bot), personaKey, intent, roundNumber}
(pseudonymous; EVENT_CATALOG proposal in the doc list).
observeAiTurn builds the observations from the event stream (decision
window = latest opponent offer minus the prior event).

Evidence: `pnpm typecheck` — 9/9 exit 0. `pnpm test` — 309 passed /
81 skipped. `pnpm test:db` (isolated E2E DB, seeded without overrides;
restored after) — 17 files, 94 tests passed (ai-match-routes 4/4,
alpha-gap 4/4 incl. the engine-completion flow with talk in the
stream). Strict E2E (3100/4100) — 28 passed / 1 canvas-gated skip
(practice-vs-ai chat assertions still green with the new talk source).
`pnpm lint` — exit 0.

DOC PROPOSAL: EVENT_CATALOG += ai_turn_intent (BB-257).

### BB-245 — READY FOR REVIEW as committed (054d683; awaiting verdict).

## OLD CURRENT TASK — BB-245 (Clerk integration, D-64 external alpha) — READY FOR REVIEW

Completed against the founder's 10 requirements + the manager's
remaining-scope list:

1. **Proxy auth.protect()** — apps/web/src/proxy.ts: with Clerk keys
   enabled, /play, /profile, /replay, /review, /bay call
   `auth.protect()` (routes are public by default per the CLI note);
   the title/landing + /sign-in + /sign-up stay public (the
   unauthenticated entry path). Without keys the pass-through is
   unchanged (dev/E2E unaffected).
2. **Verified identity only** — the adapter's Clerk path
   (verifyClerkToken, networkless, jwtKey) was already the identity
   source; audited every API route + socket path: no client-supplied
   ids trusted anywhere (the socket's user:register claimed id is
   validated against the verified subject). Garbage-token rejection
   covered by adapters.test.ts.
3. **Socket.IO Clerk handshake** — verification is adapter-driven; new
   realtime test: an app built with the Clerk adapter refuses a
   dev-minted token at the handshake (connect_error) — no second trust
   path.
4. **One Player record + handle choice** — ensureUserBySubject maps the
   Clerk sub to exactly one row (existing); profile-client.tsx now has
   a handle form posting /v1/me/handle (format/uniqueness enforced
   server-side; assignment never client-trusted). OWNERSHIP NOTE: the
   profile page is a shared web file — small additive UI, flag if you
   want it routed to W2.
5. **Dev-auth production lockout** — existing hasRoute test (route
   unregistered in production) + adapter factory refuses to boot in
   production without CLERK_JWT_PUBLIC_KEY. Playwright webServer env
   now pins NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='' + CLERK_SECRET_KEY=''
   so the E2E stack stays dev-mode even if a local .env.local appears.
6. **Secrets audit** — the only NEXT_PUBLIC_ vars in code are the
   publishable key, the API URL, and BB_ENV/BB_RELEASE tags; the
   secret key is server-side only. Nothing committed (keys are
   gitignored .env.local, never printed).

Deployment env checklist (preview/Vercel+Railway, per
DEPLOY_RUNBOOK_ALPHA1.md): web needs NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
+ CLERK_SECRET_KEY (proxy); API needs CLERK_JWT_PUBLIC_KEY (refuses to
boot in production without it) + CORS_ORIGIN/SOCKET_CORS_ORIGINS =
the Vercel origin.

Evidence: `pnpm typecheck` — 9/9 exit 0. `pnpm test` — 301 passed /
81 skipped. `pnpm test:db` (isolated E2E DB, seeded without overrides;
restored after) — 17 files, 94 tests passed. Strict E2E 2× (3100/4100)
— 28 passed / 1 canvas-gated skip each. `pnpm lint` — exit 0.

### BB-250/251/253 — ACCEPTED and merged (48d489a); QA-009 closed.

## OLD CURRENT TASK — BB-251 + BB-253 — READY FOR REVIEW; then BB-245 (Clerk, alpha)

### BB-251 (BB-247 alpha gaps) — done
Server-side funnel signals per .agents/data/BB-247-ALPHA-GAP.md:
challenge_created (challenge 201 path), challenge_joined (join success
path), match_started (commitAndBroadcast on MATCH_STARTED — covers
friend READY×2 + AI human READY; plus rematch accept via a new
analytics param on RematchRoutesOptions), and the headline fix:
AiTurnEngine gains analytics? and emits match_completed +
time_tier_entered beside its broadcast site (AI-practice completions
were invisible). bay_viewed added to the client event enum (the two
web lines are W2's per D-66). feedback_submitted added to
AnalyticsEventName as the BB-248 contract (server-emitted only — the
client enum deliberately rejects it; tested).
Tests: apps/api/tests/alpha-gap.test.ts (4): friend funnel lines with
fields, rematch-accept match_started, engine-driven AI completion
(closer-accept flow, polled myTurn first — first mover is random),
bay_viewed passthrough + feedback_submitted client rejection.

### BB-253 (FF-1, D-67) — done
realtime.ts: env-pinned socket origins (SOCKET_CORS_ORIGINS ?? CORS_ORIGIN;
unset = dev-permissive, never '*'). DEVIATION from the runbook's 2-line
snippet, flagged: the cors option alone only withholds headers, which
non-browser clients ignore — added an allowRequest hook that actively
refuses disallowed browser origins (no-Origin requests stay allowed for
non-browser clients). Test: non-allowlisted origin → connect_error,
allowlisted origin → connected (real socket.io client).

### Evidence
- `pnpm typecheck` — all 9 packages exit 0.
- `pnpm test` — 301 passed / 80 skipped.
- `pnpm test:db` (isolated E2E DB, seeded without overrides; restored
  after) — 17 files, 93 tests passed (alpha-gap 4/4, realtime 4/4,
  rematch 7/7, da-p1 6/6, routes 13/13 incl. the cap pins).
- Strict E2E suite 2× (3100/4100) — 28 passed / 1 canvas-gated skip
  each, 0 command 429s (BB-250 acceptance holds; the late-suite
  failures are gone).
- `pnpm lint` — exit 0.

### BB-250 — ACCEPTED? (awaiting verdict; committed 48826e4)

### BB-245 — next (alpha-critical, D-64): manager's remaining-scope
list received (auth.protect() on game/player routes; Clerk verify path;
Socket.IO Clerk handshake; Clerk user → one Player + handle flow;
dev-auth production lockout test). .env.local has the dev Clerk keys
(gitignored — never print/commit).

## OLD CURRENT TASK — BB-250 (QA-009 rate caps) then BB-245 (Clerk, alpha)

### BB-250 (first, small)
The strict E2E suite makes ~35 ready calls vs the 30/min production
cap → late-suite 429s. BB-222 pattern: development caps are 10× the
production caps on ready/offers/accept/walk-away/messages/challenges;
production values unchanged and pinned by a test (hasRoute config
assertion under NODE_ENV=production). Per-endpoint cap audit folded
into the golden-baseline checklist (note for the manager).

### BB-245 (after; alpha-critical, D-64)
Complete the existing Clerk integration per the founder's 10
requirements (contract in the inbox): local + Vercel; unauthenticated
→ landing/sign-in; protected routes; ONE authoritative Player record;
unique handle choice/assignment; identity from verified auth only;
Socket.IO server-side verification; dev identity impossible in
production; Next 16 proxy.ts; no secrets in NEXT_PUBLIC_*.

## OLD CURRENT TASK — STANDING DOWN (manager: queue empty)

BB-238 ACCEPTED and merged (40b1eca, D-62): economy-0.3.0 live — 7:00
hard decision-time limit + 120s decay window per DEC-031 #3. The
strict-suite entry-flow flag was triaged to QA as BB-243
(BB-221-pattern instrumentation); QA names the poisoning spec, fix
owner follows (not me yet). No work in flight; awaiting the next
assignment.

### BB-238 — ACCEPTED and merged (40b1eca, D-62).

### BB-226 — ACCEPTED and merged (3ff2766).

## OLD CURRENT TASK — BB-238 (clock ruling DEC-031 #3) — READY FOR REVIEW

economy-0.3.0: hardDecisionTimeLimitMs 420,000 (7:00) + clockFloorMs
120,000 (scaled decay window — players don't sit at the 30% floor for
six minutes). Provisional (OQ-015..017). Changes: DEFAULT_ECONOMY_CONFIG
→ 0.3.0 (packages/config); seed upserts the default version and now
deactivates EVERY other row (previously only economy-0.1.0 — 0.2.0
would have stayed active after the bump); E2E override seeds unchanged
(overrides apply to the active row, which is now 0.3.0 — verified
45s/25s/10s land on it). No UI, no timeout-policy changes. Tests
updated to stop depending on the 90s/60s defaults: config default
assertions → 420s/120s/0.3.0; match.test economyConfigVersion
assertion; intelligence play-helper + features/observations pin
explicit 90s (curate inherits via the helper); command-service
CONFIG_VERSION follows DEFAULT_ECONOMY_CONFIG.version; reveal GR-023
test pins its own 90s; clock test comment only. Evidence: typecheck
9/9; unit 301/73 skipped; test:db 86/86 (E2E DB seeded without
overrides; restored after — the 0.3.0 row carries the E2E overrides);
lint 0.

⚠ FLAG (coordination, per your BB-241 note — helpers NOT re-edited):
the full strict suite has late-suite failures in the shared entry flow
(post-BB-241). Two consecutive runs failed 3 and 5 browser specs — all
LATE positions (19–26), all at `match-status` never appearing within
25s, and Playwright's error-context artifacts show the page sitting on
the TITLE screen (the "Auth not configured — running without Clerk"
dev notice) mid-match. Affected: friend-match GR-013/GR-007,
rematch-consent decline, telemetry ×2, timeout — including W2's own
specs. Standalone: my friend-match/hold-accept/timeout specs passed 6/6
after the sync. My BB-238 diff (config values + seed + tests) cannot
cause page navigation; the suite grew to 26 tests with W2's title/bay
entry flow — the flake lives in that shared surface. Flagging, not
fixing, per instruction.

### BB-226 — ACCEPTED and merged (3ff2766).

## OLD CURRENT TASK — BB-226 (DD-M3 verified information, GR-028) — READY FOR REVIEW

Branch w1-dd-m3 (from golden-baseline-2, per D-36/D-41). Implemented:

- **Domain:** REVEAL command ({playerId, factId}) — ACTIVE-only, turn-
  gated (GR-014), GR-023-subject (added to the gameplay guard), consumes
  the turn (clock transfer like OFFER), free of chip cost (OQ-020
  unresolved — no cost invented). Legal only for facts in the player's
  OWN verifiable set; immutable once made (REVEAL_ALREADY_MADE) — no
  un-reveal exists; event FACT_REVEALED {factId} rides the stream and
  replays through commandForEvent. `ParticipantInput/State` gain
  `verifiableFactIds` (validated at creation: non-empty ≤200-char ids,
  no duplicates → INVALID_MATCH_INPUT) and `revealedFactIds`
  (append-only). Projection: ParticipantView carries `revealedFactIds`
  (shared); `verifiableFactIds` are NEVER serialized into any view
  (SI-001 — hidden-info penetration test pins it on raw JSON).
- **db:** `service.reveal()` (authoritative path like every command);
  `verifiableFactIdsForRole(scenario, role)` helper (verifiable-only
  ids; legacy rows → [] — reveals impossible, never broken);
  joinChallenge + acceptRematch materialize matches with the scenario's
  per-role verifiable ids. **No migration needed** — reveal state rides
  the domain snapshot and the event stream (no new columns/tables);
  manager review note: nothing to review.
- **API:** POST /v1/matches/:id/reveals ({commandId, factId} via
  revealRequestSchema; rate 30/min) through commitAndBroadcast; error
  map REVEAL_NOT_VERIFIABLE 400 / REVEAL_ALREADY_MADE 409; GET
  snapshot + GET result gain `revealedFacts: {[playerId]: DossierFact[]}`
  — content-decorated from the scenario row ONLY for facts the state
  says are revealed. AI matches: the human's verifiable ids pass in at
  creation; bots get [] (the AI plays from the domain view only, so
  unrevealed facts can never reach it — structural).
- **Tests:** domain match.reveal.test.ts (10: valid/turn-transfer/
  not-verifiable/already-made/off-turn/pre-start/terminal/GR-023
  boundary 89_999 vs 90_000/legacy-inert/both-players-boundary/
  projection SI-001/replay determinism/creation validation) + REVEAL in
  the property command pool; API reveal.test.ts (4: raw-payload
  penetration both directions, error mapping, result-route reveal
  carry, AI human-vs-bot verifiable sets); E2E reveal-api.spec.ts (1:
  first-mover-agnostic reveal → opponent raw payload carries exactly
  the revealed fact → repeat refused after the turn cycles back).
- **Evidence:** `pnpm typecheck` — all 9 packages exit 0. `pnpm test` —
  274 passed / 66 skipped. `pnpm test:db` (isolated E2E DB, seeded
  without overrides; restored after) — 14 files, 75 tests passed.
  Strict E2E (3100/4100) — 20 passed / 1 canvas-gated skip (incl.
  reveal-api). `pnpm lint` — exit 0.

### DOC PROPOSALS (D-6, no docs/* edited)
- docs/02 GR-028: reveal = formal turn-gated action, GR-023-subject,
  immutable, transfers the turn, no chip cost until OQ-020 closes.
- docs/07: MatchEvent += FACT_REVEALED; snapshot participant fields
  verifiableFactIds (server-only) / revealedFactIds (shared); no
  schema/migration change.
- docs/08: POST /v1/matches/:id/reveals + response; codes
  REVEAL_NOT_VERIFIABLE/REVEAL_ALREADY_MADE; snapshot/result
  `revealedFacts` shape.
- docs/14 OQ-019: data capability now implements the
  explicit-reveal-only policy (unrevealed facts stay hidden even after
  completion); the "reveal everything at result" branch stays open.

### BB-222 + BB-223 — ACCEPTED and merged (c83d126) on main; this
branch starts from golden-baseline-2 (D-36).

### BB-233 — ACCEPTED and merged (2797283); historical.

Malformed JSON bodies hit the DA-P1 error handler as framework errors
(FST_ERR_CTP_INVALID_JSON_BODY, statusCode 400) and were replied 500 —
client errors misreported as server errors. Applied the exact patch
from .agents/data/BB-229-VERIFICATION.md: the handler maps
error.statusCode 400-499 → that status with a sanitized
`{code: 'INVALID_REQUEST', message: 'invalid request body'}` body at
warn level; 500+ keeps the INTERNAL_ERROR body at error level. New
da-p1.test.ts case: `POST /v1/auth/dev/signin` body `not-json` → 400
INVALID_REQUEST (previously 500). Evidence: typecheck 9/9; unit 280/69
skipped; test:db 82/82 (E2E DB seeded without overrides, restored
after — the one failure before reseeding was the known replay-vs-
DEFAULT seed artifact); lint exit 0. Existing da-p1/analytics tests
still green (11/11).

### BB-229 — formally ACCEPTED (D-49) with this fix-forward; Data's §5
verification otherwise clean.

### BB-222/BB-223 — ACCEPTED and merged (c83d126); dev-auth.ts fix
grandfathered, file stays W2-owned going forward (D-41). Golden
baseline re-cut: golden-baseline-2 (tag). BB-226 (DD-M3) branches from
golden-baseline-2 after BB-233.

### BB-229 — implementation detail (merged feca4d6; historical)

Implemented per the spec exactly (§4 is W2's, untouched):
- §1 tags: analytics.ts `DeploymentTags` + `createAnalyticsEmitter(sink?,
  tags?)` stamps environment/release/service after analytics_event,
  before emitted_at (defaults development/local); app.ts
  `BuildAppOptions.deployment?/logger?` + `resolveEnvironment()`
  (BB_ENV → NODE_ENV production → development) + emitter moved up next
  to `const auth` (single instance, closed over by all routes);
  `/health` += environment/release; server.ts logger flag
  (production or ENABLE_JSON_LOGS=1) + unhandledRejection/
  uncaughtException handlers; playwright.config.ts webServer envs
  BB_ENV=e2e / NEXT_PUBLIC_BB_ENV=e2e; root .env.example += 4 names.
- §2 error contract: `setErrorHandler` — unhandled route errors only
  (Zod 400s/domain 4xx/404 untouched); logs err + userId + matchId +
  tags; sanitized 500 body `{code: 'INTERNAL_ERROR', message: 'internal
  server error'}` (no error.message echo, docs/10). The two realtime.ts
  catch-fixes applied verbatim (disconnect-freeze, heartbeat).
  timeout-scheduler console.error unchanged per spec.
- §3 events: signup_completed (dev-signin route + requireAuth,
  `created`-gated — exactly once per human, bots impossible);
  handle_created (POST /v1/me/handle + dev-signin setHandle paths);
  result_viewed (analytics.ts second dedup set seenResults on
  matchId|playerId; match-routes GET result success path only);
  analyticsEventSchema enum += rematch_clicked/play_again_clicked/
  client_exception + meta + client_environment/client_release, emit
  spreads all through. AnalyticsEventName union extended accordingly.

Tests: `analytics.test.ts` (pure: tag order/defaults, result_viewed
dedup, tier dedup) + `da-p1.test.ts` (DB: /health tags; sanitized 500 +
404 untouched; signup exactly-once incl. both call sites; handle_created
×2; result_viewed dedup over two GETs; client event passthrough + enum
rejection). stdout captured via vi.spyOn per test.

Evidence:
- `pnpm typecheck` — all 9 packages exit 0.
- `pnpm test` — 268 passed / 68 skipped.
- `TEST_DATABASE_URL=…bounty_bay_e2e pnpm test:db` (seeded without
  overrides; restored after) — 15 files, 81 tests passed (incl. da-p1
  6/6, analytics 4/4).
- Strict E2E suite (3100/4100) — 19 passed / 1 canvas-gated skip.
- `pnpm lint` — exit 0, repo-wide.

### BB-222/BB-223 — ACCEPTED and merged (c83d126); dev-auth.ts fix
grandfathered, file stays W2-owned going forward (D-41). Golden
baseline re-cut: golden-baseline-2 (tag). BB-226 (DD-M3) branches from
golden-baseline-2 after BB-229.

### GR-007 flake fix — ACCEPTED and merged (56f9141)

## OLD CURRENT TASK — GR-007 flake fix (manager-routed, pre-golden-baseline) — READY FOR REVIEW

Flake: the direct-API helper in friend-match.spec.ts (GR-007 test)
read `/v1/me/active-match` once with no retry — in full-file sequence
the first read can race the page's dev identity/token settling and
return no matchId while the match is ACTIVE (~50% in sequence, passes
standalone). Fix: bounded poll inside the page.evaluate — up to 5
attempts, 250 ms between attempts, token re-read each attempt, and a
failure payload carrying the last attempt's state + attempt count (no
unbounded waits, no sleeps-as-fixes). Proven: full friend-match spec
file 3× green (deal / chat / GR-007 each time). Same un-retried pattern
exists in canvas-checkpoint.spec.ts:155 — that spec is CAPTURE_CANVAS-
gated (capture utility, not regression baseline); noted, not touched.

## OLD CURRENT TASK — STANDING DOWN (manager: queue empty)

BB-220 ACCEPTED and merged (e508816 + docs a221009, D-30); the
coaching-state call confirmed (no fake empty state; store + endpoints
with IN-5/IN-7). Worker-1 queue is empty. DD-M3 (verified reveals)
remains gated on the founder's DD-M2 checkpoint (DEC-026 phase gate) —
the manager puts it in front of the founder at the next batch. Waiting
for the next assignment; no work in flight.

### BB-220 — ACCEPTED and merged (e508816 + docs a221009; D-30)

### BB-219a — ACCEPTED and merged (49e6a38 + docs 6080ad8); cancel
product assumption ratified; migration review passed.

## OLD CURRENT TASK — BB-219a (friend-rematch API, PDR-3/QA-004) — READY FOR REVIEW

Implemented per the design below (unchanged since task start). Evidence:

- `pnpm typecheck` — all packages exit 0:
  domain/contracts/ai/testing/intelligence/db/web/api typecheck: Done.
- `pnpm test` — 27 passed / 11 skipped; Tests 251 passed / 56 skipped.
- `TEST_DATABASE_URL=postgresql://…:5433/bounty_bay_e2e pnpm test:db` —
  Test Files 12 passed, Tests 65 passed (incl. rematch.test.ts 6/6).
  NOTE: run with the E2E DB seeded WITHOUT overrides (seed upsert restores
  defaults); the command-service replay test compares the stored row
  against DEFAULT_ECONOMY_CONFIG and fails on override-seeded values
  (45000/25000 vs 90000/30000) — pre-existing workflow, not a code bug.
  Re-seeded with E2E overrides again afterwards.
- E2E (E2E_WEB_PORT=3100 E2E_API_PORT=4100): 12 passed, 1 skipped
  (canvas-checkpoint, CAPTURE_CANVAS-gated) — incl. rematch-api.spec.ts 2/2.
- Lint: my files clean. Remaining repo lint failures are NOT mine (flag):
  `.agents/qa/tools/battery.ts` (7), `.agents/qa/tools/specs/qa-interruption.
  spec.ts` (1), W2's `resource-hud.tsx` (4), W2's `result-reveal.tsx` (1).

Design (per PDR-3 "rematch = mutual consent"): a rematch proposal is a
Match row — status CREATED, one participant (the proposer), no invite
token, plus two new nullable columns (`rematchFromMatchId` = source match,
`rematchOpponentUserId` = the only user who may accept). No new table; the
accept path materializes the domain match with FIXED roles (each player
keeps their previous-match role), fresh RVs, `pickFirstPlayer`, then
auto-readies both players inside the same transaction → the new match is
ACTIVE immediately ("on acceptance a new match starts"). Unrated: mode
FRIEND_LIVE, ratingVersion null (GR-019). No domain changes — rematch is
API/service lifecycle orchestration; the new match is an ordinary match.

Endpoints (all participant-scoped, POST bodies are `{commandId}`):
- `POST /v1/matches/:matchId/rematch` — propose; source must be
  FRIEND_LIVE, two-participant, terminal; one open proposal per source
  match (guarded inside the service transaction under the source-row
  lock). 201 `{matchId, role, reservationValueTenths, scenario}`.
- `POST /v1/matches/:matchId/rematch/accept` — fixed opponent only →
  new ACTIVE match; response `{matchId, role, reservationValueTenths,
  status}`; the deadline scheduler is re-armed for the new match.
- `POST /v1/matches/:matchId/rematch/decline` — opponent only; deletes
  the proposal row (no domain state existed; cascade-safe).
- `POST /v1/matches/:matchId/rematch/cancel` — proposer retraction
  (natural completion of mutual consent; PRODUCT ASSUMPTION, flag if the
  manager disagrees).
- `GET /v1/matches/:matchId/rematch` — `{incoming: {matchId,
  createdAt}|null, outgoing: …|null}` for the BB-219b in-session prompt.
- `GET /v1/matches/:id` pre-join branch returns
  `status: 'REMATCH_PENDING'` for proposal rows (never the misleading
  "share the link" panel — PDR-3's guard). `/v1/me/active-match`
  excludes open proposals (a proposal is not a playable match).

New codes: `REMATCH_NOT_FOUND` (404), `REMATCH_NOT_OPEN` (409),
`REMATCH_FORBIDDEN` (403), `REMATCH_ALREADY_PROPOSED` (409),
`REMATCH_NOT_AVAILABLE` (409 — non-friend mode / not terminal).
Service methods in packages/db (`createRematchProposal`,
`acceptRematch`, `deleteRematchProposal`); fixed-role RV assignment via
new `assignFixedRole` in match-assignment.ts. Migration
`20260923022459_pdr3_rematch` — additive nullable columns, created +
applied against the isolated E2E DB only; **manager migration review
required before merge**; dev DB untouched (it still lacks DD-M2 too).

Tests: `apps/api/tests/rematch.test.ts` (RUN_DB_TESTS=1) — propose→
accept→ACTIVE happy path with role/scenario/unrated invariants,
fixed-opponent enforcement, non-participant/non-terminal/mode guards,
duplicate-proposal guard, decline/cancel + re-propose, accept-after-
resolve, rematch-of-a-rematch. E2E `rematch-api.spec.ts` (API-level,
no board — UI is BB-219b for W2).

### BB-204 — ACCEPTED (787aa86); BB-214/BB-217/BB-217b — ACCEPTED

## OLD CURRENT TASK — BB-214 hotfix + BB-217 domain answer + BB-204 (DD-M2 dossiers)

### BB-214 (QA-002 HIGH) — FIXED (uncommitted, rides with BB-204)

`apps/web/e2e/friend-match.spec.ts` diagnostic union read `.code`
unguarded (the status-0 branch has no code field) → `pnpm --filter web
typecheck` failed on main. Fix: narrow the assertion with a cast and
document the two-branch shape in the spec. Web typecheck clean again
(0 errors). Lesson logged by the manager (L-007); my own checkpoints now
always include the web typecheck.

### BB-217 — item-10 domain answer (no UI files touched)

1. **Offer 110 vs RV 78.9: ILLEGAL.** GR-003/GR-006: a buyer may offer
   only amounts ≤ their reservation value (seller mirror: ≥). 110.0 > 78.9
   → the domain rejects with `OUTSIDE_RESERVATION_VALUE`; nothing
   commits, the turn never switches. (Domain proof:
   `packages/domain/src/match.ts` `applyOffer` RV check;
   `match.test.ts` "hard RV boundary".)
2. **"Your mandate does not allow you to offer more than 78.9":** the
   composer's client-side advisory (`offer-composer.tsx:67`) that names
   the viewer's OWN limit while typing — self-information only (the
   viewer already knows their RV; nothing about the opponent is
   revealed). The authoritative server rejection is the generic
   gameLanguage string in `match-screen.tsx` ("that much"/"that
   little"). Same GR-003 rule at two layers: advisory preview vs
   authoritative refusal.
3. **"116,500": NOT a tenths-formatting bug of 116.5.** The single web
   formatter `formatTenthsGrouped` (lib/format.ts) divides by 10 before
   grouping: tenths 1165 → "116.5". "116,500" is the CORRECT output for
   1,165,000 tenths (an 116,500.0 offer). Every display path in
   apps/web routes through this one formatter (verified by grep:
   offer-plate, offer-composer, match-screen, board). If QA observed
   "116,500" attached to a 116.5 offer, that path no longer exists in
   current code — request the repro screen/element if it reappears.

### BB-217b — turn-structure check (D-26, founder feedback #2)

(a) **Implementation matches GR-013 exactly.** Domain `applyMessage`
   emits MESSAGE_SENT only — no turn switch, no clock effect, no offer
   creation; it is legal for EITHER player (not just the active one) any
   number of times. The one nuance beyond GR-013's wording: chat is
   allowed while ACTIVE **and PAUSED** (frozen-clock state is still
   "active negotiation"); it is unavailable pre-start (CREATED/READY)
   and post-terminal (the result screen replaces the board). That is
   implementation detail, not a turn-state violation.
(b) **"Talk multiple times on your turn without changing the number" is
   fully compatible with GR-007.** GR-007 rejects only resubmitting the
   same formal OFFER; MESSAGE commands are not offers (GR-013), cost no
   chips, and never consume the turn. This is exactly the DD directive's
   "hold your number → talk" branch — and it also works past the hard
   decision-time limit (the GR-023 guard exempts MESSAGE), so a player
   can keep communicating right up to the timeout transition.
(c) **No deviation found** — no canonical wording change required. If
   the founder wants the "anytime" nuance pinned, proposed GR-013
   amendment for the manager to apply: "Chat is available to both
   players at any time while the match is ACTIVE or PAUSED; messages
   never consume, transfer, or reset the turn (GR-007 applies to formal
   offers only)."

### BB-204 — DD-M2 private dossiers — READY FOR REVIEW (with BB-214/BB-217)

- **Schema/migration:** `packages/db/prisma/schema.prisma` Scenario +=
  `sharedContext`, `buyerPrivateContext`, `sellerPrivateContext`,
  `buyerPrivateFacts`, `sellerPrivateFacts` (JSON arrays of DossierFact).
  Migration `20260923014012_dd_m2_dossiers` (additive columns only) —
  created against the isolated E2E DB; **manager migration review
  required before merge**; dev DB untouched.
- **Domain:** `packages/domain/src/dossier.ts` —
  `validateDossierFacts(facts, privateContexts)` + category whitelist +
  caps (MAX 8 facts / 200 chars, OQ-020 provisional). Leak discipline:
  private facts and private contexts must be number-free (any digit could
  encode RV-equivalent info — GR-028). Pure; exported from the domain
  index.
- **Seed:** the 3 seeded scenarios now carry shared context, per-role
  private context, and 3 facts each (some verifiable, with reveal
  labels); the seed FAILS FAST via `validateDossierFacts` before any
  upsert.
- **API:** `scenarioForRole(scenario, role)` in match-routes.ts serves
  `sharedContext` + the viewer's OWN `myPrivateContext` /
  `myPrivateFacts` (plus legacy `myNarrative`). Wired into challenge
  create, GET match (both branches), GET result, and the AI-match
  response. The opponent's dossier is never serialized (SI-001-grade).
- **UI component (unwired, for W2's BB-213):**
  `apps/web/src/components/game/dossier.tsx` + `dossier-model.ts` +
  `dossier.module.css` (self-contained CSS module — no globals.css
  touches). Props contract documented in the file header.
- **Tests:** domain dossier validator (valid/invalid/boundary + leak
  invariants); web dossier-model pure tests (apps/web/tests — new
  directory, node vitest); `dossier-isolation.test.ts` (raw-payload
  penetration proof in BOTH directions + legacy scenario-row boundary +
  AI route); E2E `dossier-api.spec.ts` (payload present, role-scoped,
  number-free facts, result route — no board dependency per the amended
  contract). All green: unit 239, dossier API 2/2, dossier E2E 1/1,
  web/api/db typechecks clean.
- **Lint:** 3 leftover unused-import/var errors in my files fixed
  (match-actions, match-screen). Remaining lint failure is the
  pre-existing `apps/web/debug-reveal.tmp.mjs` in the baseline (TD-1) —
  not mine; flagging for the manager.
- **Doc proposals (D-6, no docs/* edited):** docs/07 Scenario table needs
  the five new fields; docs/08 snapshot/result/`POST /v1/challenges`
  scenario shape gains `sharedContext`/`myPrivateContext`/
  `myPrivateFacts` with the role-scoping note.

## NEXT STEP
Await the next manager assignment (queue empty). The strict-suite
entry-flow flake is QA's BB-243; if the fix lands on me, the shared E2E
helpers stay W2-owned — coordinate any helper edits through the
manager.

## PRODUCT ASSUMPTIONS
- Rematch proposals are deleted on decline/cancel — no audit record is
  kept (no domain state existed; either side may then propose again).
- Accept auto-readies both players (PDR-3 "on acceptance a new match
  starts"): no second ready-up screen before the rematch begins.
- Open proposals are excluded from `/v1/me/active-match` and the
  proposer's pre-join view is `REMATCH_PENDING`, never the share-link
  panel (PDR-3's "no misleading rematch affordance").
- Rematch is FRIEND_LIVE only. RANKED_LIVE/AI/ASYNC sources are rejected
  (409 REMATCH_NOT_AVAILABLE) — rated rematch would need rating rules
  (P1-M2), bots cannot consent.
- BB-220: insights is self-only; no coaching state served until it has a
  store (IN-5/IN-7).
- Hold durations (600 ms accept / 1 s walk-away) from HO-Contracts;
  haptics best-effort; time warnings remain required by GR-023 until a
  canonical rule change says otherwise.

## DOC PROPOSALS (D-6, no docs/* edited)
- docs/08_API_CONTRACTS.md: `GET /v1/me/insights` — authenticated,
  self-only; returns `{profile: LongitudinalProfile|null}` (version
  longitudinal-profile-0.1.0, windows lifetime/recent/previous/rolling,
  trends, descriptors with evidence, roleSplit, confidenceBand,
  lastMatchEndedAt); profile null until the player has a non-aborted
  completed match; coaching state deliberately absent until persisted
  (IN-5/IN-7). MatchFeature rows are the source of truth (written at
  match completion, DEC-028); same-version rows only.
- Earlier BB-219a proposals (docs/07 + docs/08 rematch) were applied by
  the manager in 6080ad8 — done.
- Flag: remaining repo lint failures in `.agents/qa/tools/*` (8) and
  W2's `resource-hud.tsx` (4) / `result-reveal.tsx` (1) — not mine.

---

## PDR-2 — RESOLVED by the manager/founder (GR-012 rewritten on main)

My comparison + recommendation (committed d230a6d) recommended keeping
the turn-gated domain behavior and fixing the wording; main now carries
the amended GR-012 ("The player whose turn it is may choose Walk Away…
requires the acting player's turn, is subject to the personal
decision-time budget (GR-023)…"). Evidence section retained below for
the record.

**The discrepancy.** `docs/02_GAME_RULES.md` GR-012: "Either active
player may choose **Walk Away**." The domain gates walk-away to the
player whose turn it is: `applyWalkAway` requires
`state.activePlayerId === player.playerId`, else `NOT_YOUR_TURN`
(GR-014) — pinned by `match.test.ts` "is not available when it is not
your turn". So the doc can be read as "either player while the match is
active" while the behavior is "only the turn-holder". Since DD Phase 1,
a post-limit walk is additionally superseded by the timeout (GR-023
guard rejects WALK_AWAY with `TIMED_OUT`), which GR-012 also does not
mention.

**Evidence for the turn-gated reading (what the system does today):**
- Domain: `packages/domain/src/match.ts` `applyWalkAway` — NOT_YOUR_TURN
  for the non-active player (test-pinned, plus the property suite).
- UI: the ⋯ menu shows Walk away on both players' screens (LMD-07), but
  pressing it on the opponent's turn yields the game-language error — the
  server refuses.
- docs/04 UF-02 step 9: "Active player accepts, concedes, or walks away"
  — consistent with the domain, unlike GR-012's phrasing.

**Recommendation (for the manager to present):** keep the domain
behavior (turn-gated) and, if the founder agrees, amend GR-012 wording to
"The active player — the one whose turn it is — may choose Walk Away,"
plus a cross-ref that after the hard decision-time limit the walk is
superseded by the timeout transition (GR-023/GR-024). Reasons: (1) the
non-active player terminating the match mid-opponent-turn is an
abuse/race vector with no product rationale found in the canvas or
flows; (2) UF-02 and the tests already agree with the domain; (3) the
alternative — allowing either player to walk at any time — is a genuine
game-rule change touching GR-014 semantics, so it needs the same
founder ruling, not a wording fix. **No code or doc change made** (per
the PDR-2 plan).

---

## W1-02 — DD Phase 1 (anti-stalling) founder checkpoint report

§39-style completion report for DD-M2 milestone work (DEC-026/027, docs/17).

**1. Files changed:** docs: `docs/17` (new), `02` (GR-023–GR-028, GR-022,
invariants), `03`, `07`, `08`, `10` (SI-009), `11`, `12` (DEC-026/027),
`14` (OQ-002 closed branch, OQ-015–022), `16` (DD block), `01`, `09`.
Code: `packages/config` (hardDecisionTimeLimitMs/timeoutPolicy/warning
thresholds + effective-helpers + validation), `packages/domain` (TIMED_OUT
reason/event/command, dispatch guard, `applyTimeout`, projection
remaining/tier fields, replay mapping), `packages/contracts` (error codes),
`packages/db` (schema + migration `dd_phase1_timeout`, `timeout()` service
method, `timeoutPlayerId` persistence, `economyConfigFromRow`, seed with
E2E env overrides), `apps/api` (`timeout-scheduler.ts`, `analytics.ts`,
route wiring, realtime `onMatchStateChange` + heartbeat re-projection,
`timeoutPlayerId` in responses), `apps/web` (time-warning tiers, TIMED_OUT
copy, hold UI came later with the canvas slices), `packages/testing`
(simulator pinned no-limit). Plus 3 pre-existing lint fixes.

**2. Behavior implemented:** hard personal decision-time budget (GR-023)
separate from multiplier decay; server-only TIMEOUT command with due-
validation + pre-dispatch guard rejecting OFFER/ACCEPT/WALK_AWAY after the
limit (failed commands never mutate); restart-safe `TimeoutScheduler`
(AiTurnEngine pattern: bootScan/refresh/unref'd timers, TIMEOUT_NOT_DUE
re-arm); GR-024 distinct TIMED_OUT outcome (NO_DEAL, zero bounty,
attribution persisted, distinct from walk-away in UI/records/analytics);
warning tiers computed in the domain projection (clients render only);
repeated-offer prevention confirmed (GR-007 existed; gap-fill tests
added); structured-log analytics (`match_timed_out`, `time_tier_entered`,
extended `match_completed`).

**3. Tests added/run:** domain guard boundary/exemption/legacy-inert
cases; TIMEOUT valid/invalid/PAUSED/replay determinism; projection tier
boundaries; config validation/helpers; db timeout persistence + idempotency;
API 409 TIMED_OUT + no-timeout-route + scheduler deadline fire + bootScan
rescue; E2E timeout flow + duplicate-offer rejection. At checkpoint:
unit 226, db+api 51, E2E 9/9 green.

**4. Unresolved:** warning-threshold calibration (OQ-015), timeout-policy
variants + timeout rating consequence (OQ-016), exact durations (OQ-017),
no-ZOPA matches (OQ-018). Timeout keeps the walk-away `ratedEligible`
bucket pending the versioned rating system — no penalty invented.

**5. Spec ambiguities encountered:** the four directive-vs-docs conflicts
resolved and recorded in DEC-026 (decay default 120 s→60 s; voice non-goal
superseded prospectively; spectator deferred to Phase 7; GR-007 already
existed). Also: HO-Contracts "opponent's bounty hidden" vs GR-016 — kept
GR-016 (domain authority), flagged; docs/16 IN-vs-DD sequencing conflict
(D-3) remains open with the founder.

**6. Decision-log reference:** DEC-026/027. No silent spec changes.
