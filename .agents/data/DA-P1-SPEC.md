# DA-P1-SPEC — implementation spec for BB-229 (W1, api) and BB-230 (W2, web)

Author: Agent 6 (Data). Reference: main `73c40bf` (2026-09-24). Per D-37:
no new dependencies — Fastify built-ins only. Implementers follow this
spec exactly; deviations need manager ruling. Every event name here is
the canonical name (EVENT_CATALOG.md) — no synonyms.

Scope split: **BB-229 = W1** (apps/api, packages/db if needed,
playwright env block, .env.example) · **BB-230 = W2** (apps/web).

---

## 1. Deployment tags: `environment` + `release` + `service`

### 1.1 Format (exact)

| Field | Allowed values / resolution | Set by |
|---|---|---|
| `environment` | `BB_ENV` if set (values: `development`, `e2e`, `qa`, `production`, `ci`); else `production` when `NODE_ENV === 'production'`; else `development` | api boot; Playwright sets `e2e`; QA sets `qa`; CI sets `ci` |
| `release` | `BB_RELEASE` if set (short commit SHA + version, e.g. `73c40bf@0.1.0`); else `local` | api boot / deploy injects |
| `service` | always `api` on API-emitted lines | constant |

Client-sourced events ADDITIONALLY carry (sent by the browser, validated
by the API, emitted as `client_environment` / `client_release` fields):

| Field | Resolution |
|---|---|
| `client_environment` | `NEXT_PUBLIC_BB_ENV` else `development` |
| `client_release` | `NEXT_PUBLIC_BB_RELEASE` else `local` |

### 1.2 API injection points (W1)

- `apps/api/src/analytics.ts`:
  - `export interface DeploymentTags { environment: string; release: string }`
  - `createAnalyticsEmitter(sink = default, tags: DeploymentTags = { environment: 'development', release: 'local' })`
  - every `emit` adds `environment: tags.environment`, `release: tags.release`, `service: 'api'` to the JSON line (after `analytics_event`, before `emitted_at`).
- `apps/api/src/app.ts`:
  - `BuildAppOptions` gains `deployment?: DeploymentTags` and `logger?: boolean` (default false).
  - Resolve tags at buildApp top: `const deployment = options.deployment ?? { environment: resolveEnvironment(), release: process.env.BB_RELEASE ?? 'local' }` where `resolveEnvironment()` = `process.env.BB_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development')`.
  - **Move** `const analytics = createAnalyticsEmitter();` from its current line (~216) up next to `const auth` (~line 57), as `const analytics = createAnalyticsEmitter(undefined, deployment);` — the dev-signin route and `requireAuth` (defined below it) close over it; no TDZ issue since handlers run after buildApp returns.
  - `Fastify({ logger: false })` → `Fastify({ logger: options.logger === true })` (built-in pino; its default serializers log no headers — no token leakage).
  - `/health` (line ~72): `{ ok: true, service: 'bounty-bay-api', version: '0.1.0', environment: deployment.environment, release: deployment.release }`.
- `apps/api/src/server.ts`:
  - pass `logger: process.env.NODE_ENV === 'production' || process.env.ENABLE_JSON_LOGS === '1'` and `deployment` (omit — buildApp resolves from env) into buildApp.
  - after `buildApp`, before `app.listen`:
    ```ts
    process.on('unhandledRejection', (reason) => { app.log.error({ err: reason }, 'unhandledRejection'); process.exit(1); });
    process.on('uncaughtException', (err) => { app.log.error({ err }, 'uncaughtException'); process.exit(1); });
    ```
- `apps/web/playwright.config.ts` (W1 owns it per D-20/BB-211):
  - api webServer env block: add `BB_ENV: 'e2e'`.
  - web webServer env block: add `NEXT_PUBLIC_BB_ENV: 'e2e'`.
  - `BB_RELEASE` stays unset → `local`.
- `.env.example` (root, W1): append names-only:
  ```
  # Data/observability (DA-P1): environment tag + release identifier
  BB_ENV=development
  BB_RELEASE=local
  # Web-facing (baked into the Next.js client bundle)
  NEXT_PUBLIC_BB_ENV=development
  NEXT_PUBLIC_BB_RELEASE=local
  ```

---

## 2. Fastify error-handler contract (W1, apps/api/src/app.ts)

Add after route registration (any place after `app` exists; recommended
right after the cors block):

```ts
app.setErrorHandler((error, request, reply) => {
  request.log.error(
    {
      err: error,
      userId: request.userId ?? undefined,
      matchId: (request.params as { matchId?: string } | undefined)?.matchId ?? undefined,
      environment: deployment.environment,
      release: deployment.release,
    },
    'unhandled request error',
  );
  void reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'internal server error' });
});
```

Behavior notes (exact contract):
- Applies ONLY to unhandled route errors. Zod 400s, domain 4xx/409s, 404s
  are unchanged (routes reply directly; Fastify's default notFound is
  untouched).
- Reply body changes on the 500 path from Fastify's default (which echoes
  `error.message`) to `{ code: 'INTERNAL_ERROR', message: 'internal server
  error' }` — deliberate: no internal message leakage (docs/10).
- `request.log` requires the logger to be on to produce output; in dev
  (logger off) the handler still returns the sanitized 500. Never log
  tokens, RV values, or request bodies here.
- `request.id` (Fastify genReqId) appears automatically in pino output.

Related catch-fixes (same task, W1):
- `apps/api/src/realtime.ts` line ~148 (disconnect-freeze): replace
  `.catch((err) => app.log.error(err))` with
  `.catch((err) => app.log.error({ err, matchId, userId }, 'disconnect freeze failed'))`
  (`matchId`/`userId` are in scope from `splitKey`).
- `apps/api/src/realtime.ts` line ~195 (heartbeat): replace
  `.catch(() => null)` with
  `.catch((err) => app.log.warn({ err, matchId }, 'heartbeat snapshot load failed'))`.
- `apps/api/src/timeout-scheduler.ts` `console.error` — UNCHANGED
  (stdout is captured with the process; already carries matchId).

---

## 3. Server-side events (W1)

### 3.1 `signup_completed` — PSEUDONYMOUS
Fires exactly once per human user, when `ensureUserBySubject` creates the
row (it already returns `created: boolean` — no packages/db change
needed). Bots can never fire it (repo throws for `bot:` subjects).
- Call site A — `apps/api/src/app.ts` dev-signin route (~line 104), after
  `const ensured = await users.ensureUserBySubject(subject);`:
  `if (ensured.created) analytics.emit('signup_completed', { playerId: ensured.userId, authProvider: auth.name });`
- Call site B — `app.ts` `requireAuth` (~line 125), after the successful
  `ensureUserBySubject` (inside the try): same emit
  (`authProvider: auth.name`; values `dev` | `clerk`).
  Note: with dev auth, call site A fires first (dev signin creates);
  with Clerk (no dev signin), call site B fires on the first protected
  request. Both paths covered — no double fire: `created` is true only
  once per subject.
- Required fields: `playerId`, `authProvider` (+ auto tags §1).

### 3.2 `handle_created` — PSEUDONYMOUS
Fires on EVERY successful `setHandle`. Semantics documented as
possibly-repeated; the funnel step "handle created" = first occurrence
per playerId, derivable from the event stream (no schema change, no
repo change — `setHandle` stays as is).
- Call site A — `app.ts` `POST /v1/me/handle` (~line 155), after
  `if (!result.ok) ...` rejection: `analytics.emit('handle_created', { playerId: request.userId! });`
- Call site B — `app.ts` dev-signin route (~line 105), after
  `if (!set.ok) ...` rejection: same emit.
- Required fields: `playerId` (+ tags).

### 3.3 `result_viewed` — PSEUDONYMOUS, in-process dedup
- `apps/api/src/analytics.ts`: extend `AnalyticsEventName` with
  `'result_viewed'`; in `createAnalyticsEmitter` add a second dedup set
  `seenResults` keyed `` `${matchId}|${playerId}` `` (same pattern as
  `seenTiers`) — subsequent identical emissions within the process are
  dropped. Documented semantics: at-most-once per (match, player) per
  process; a repeat AFTER a process restart can fire again (acceptable;
  the dedup set is in-memory and bounded by distinct result views).
- `apps/api/src/match-routes.ts` GET `/v1/matches/:matchId/result`
  (~line 281): emit immediately before the final `return {` of the
  route: `options.analytics?.emit('result_viewed', { matchId, playerId: request.userId! });`
  Only the success path emits (409/403 paths do not).
- Required fields: `matchId`, `playerId` (+ tags).

### 3.4 Event-route enum + meta (shared with §4)
`apps/api/src/app.ts` `analyticsEventSchema` → exactly:
```ts
const analyticsEventSchema = z.object({
  name: z.enum(['review_opened', 'review_step_viewed', 'rematch_clicked', 'play_again_clicked', 'client_exception']),
  matchId: z.string().uuid().optional(),
  meta: z.object({
    message: z.string().max(500).optional(),
    stack: z.string().max(2000).optional(),
    path: z.string().max(200).optional(),
  }).optional(),
  client_environment: z.string().max(40).optional(),
  client_release: z.string().max(40).optional(),
});
```
Emit call becomes: `analytics.emit(parsed.data.name, { playerId: request.userId!, ...(parsed.data.matchId ? { matchId: parsed.data.matchId } : {}), ...(parsed.data.meta ?? {}), ...(parsed.data.client_environment ? { client_environment: parsed.data.client_environment } : {}), ...(parsed.data.client_release ? { client_release: parsed.data.client_release } : {}) });`
Rate limit unchanged (60/min). Additive API change — INTEGRATION_QUEUE
contract note. AnalyticsFields already allows string fields.

---

## 4. Web events (W2)

### 4.1 lib change — `apps/web/src/lib/analytics.ts`
Exact new shape:
```ts
export type ClientEventName = 'review_opened' | 'review_step_viewed' | 'rematch_clicked' | 'play_again_clicked' | 'client_exception';
export interface ClientEventMeta { message?: string; stack?: string; path?: string; }

const CLIENT_ENVIRONMENT = process.env.NEXT_PUBLIC_BB_ENV ?? 'development';
const CLIENT_RELEASE = process.env.NEXT_PUBLIC_BB_RELEASE ?? 'local';

export function trackEvent(name: ClientEventName, token: string | null, matchId?: string, meta?: ClientEventMeta): void {
  if (!token) return;
  void fetch(`${API_URL}/v1/analytics/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name,
      ...(matchId ? { matchId } : {}),
      ...(meta ? { meta } : {}),
      client_environment: CLIENT_ENVIRONMENT,
      client_release: CLIENT_RELEASE,
    }),
  }).catch(() => { /* observability is best-effort */ });
}
```

### 4.2 `rematch_clicked` — PSEUDONYMOUS
- `apps/web/src/components/game/result-reveal.tsx`: at the TOP of
  `proposeRematch` (after its `if (!friendMode || rematchPhase !== 'idle')
  return;` guard, ~line 116): `trackEvent('rematch_clicked', token,
  matchId);` (import trackEvent; `token` and `matchId` are already props).
- `apps/web/src/app/play/page.tsx` `rematch()` (~line 192 — the AI-mode
  path, `onClick={friendMode ? proposeRematch : onRematch}`):
  `trackEvent('rematch_clicked', token, activeMatch?.matchId ?? challenge?.matchId);`
  (token already in scope; matchId optional when unavailable).
- Required fields: `matchId` (when known), `playerId` (server-added).

### 4.3 `play_again_clicked` — PSEUDONYMOUS
- `apps/web/src/app/replay/[matchId]/page.tsx`, the "Play again" anchor
  (`data-testid="back-to-play"`): add
  `onClick={() => trackEvent('play_again_clicked', token, matchId)}`
  (use the page's existing token variable; navigation via href is
  unchanged). Do NOT instrument the "Game Review" anchor.

### 4.4 `client_exception` — PSEUDONYMOUS (new ErrorCatcher component)
- New file `apps/web/src/components/error-catcher.tsx`, `'use client'`:
  - `const { token, ready } = useApiToken();`
  - `useEffect` (once) registers `window.addEventListener('error', handler)` and `window.addEventListener('unhandledrejection', handler2)`.
  - handler contract (must never throw; wrap in try/catch):
    - `message`: `(event.message ?? 'unknown').slice(0, 500)`
    - `stack`: `(event.error?.stack ?? '').slice(0, 2000)` (rejections:
      stringify the reason to ≤500, no stack)
    - `path`: `window.location.pathname.slice(0, 200)` — pathname ONLY,
      never query strings, never hashes.
    - skip when `!ready || !token`.
    - `trackEvent('client_exception', token, undefined, { message, stack, path })`.
  - Never include: localStorage contents, request bodies, tokens, URLs
    with query params (docs/10).
- `apps/web/src/app/layout.tsx`: import ErrorCatcher and render inside
  BOTH branches (it needs the Clerk context when enabled):
  `{clerkEnabled ? <ClerkProvider><ErrorCatcher />{children}</ClerkProvider> : <><ErrorCatcher />{children}</>}`
- Required fields: `message`, `stack`, `path` (meta → flattened),
  `playerId` (server-added), `client_environment`, `client_release`.

---

## 5. Acceptance checklist (per implementer)

### BB-229 (W1) — api
- [ ] Every emitted line carries `environment`, `release`, `service: 'api'` (unit test: capture the sink).
- [ ] `signup_completed` fires for a brand-new dev subject, exactly once, with `authProvider: 'dev'`; NOT on second sign-in; never for `bot:` subjects.
- [ ] `handle_created` fires on every successful setHandle (both call sites); 409/400 paths don't emit.
- [ ] `result_viewed` fires once for two consecutive GETs of the same result (dedup); fires again for a different user/match.
- [ ] Event route accepts all five names + meta; rejects unknown names with 400; unknown fields stripped by zod.
- [ ] Error handler: a route that throws returns 500 `{ code: 'INTERNAL_ERROR', message: 'internal server error' }` (no error.message echo); normal 4xx/409/404 paths byte-identical to today.
- [ ] `/health` includes `environment` and `release`.
- [ ] `NODE_ENV=production` + logger on: JSON log lines appear (pino) with reqId; no headers/tokens in logs (grep the captured output).
- [ ] Playwright boots with `BB_ENV=e2e`; E2E suite green (existing specs unchanged).
- [ ] Privacy: extend `apps/api/tests/hidden-information-audit.test.ts` (or a sibling test) — assert no emitted analytics line contains reservation-value keys/values.
- [ ] Typecheck + lint + full test suite green (RETRO-001 lint discipline).

### BB-230 (W2) — web
- [ ] REMATCH button click (friend mode) sends `rematch_clicked` (E2E: intercept POST /v1/analytics/event via the existing friend-match spec or a new small spec).
- [ ] AI-mode REMATCH → `rematch_clicked` (same assertion path).
- [ ] Replay "Play again" → `play_again_clicked`; "Game Review" anchor sends nothing new.
- [ ] ErrorCatcher: triggering `window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('stacktrace') }))` sends `client_exception` with sanitized meta ≤ limits (unit test with mocked fetch; web-side vitest if `apps/web/tests` exists, else Playwright page.evaluate).
- [ ] No query string appears in the sent `path` (privacy assertion).
- [ ] Review page events (`review_opened`/`review_step_viewed`) still send and now include `client_environment`/`client_release`.
- [ ] Typecheck + build green; no new dependencies.

### Verification (Agent 6, after BB-229/230 merge — not part of their tasks)
- Re-run typecheck/tests; boot API with `ENABLE_JSON_LOGS=1`, emit one of
  each event, inspect lines for tags/fields/privacy; confirm E2E green.
- Update `RELEASE_CHECKLIST.md`: flip the §3 analytics TODOs that become
  executable; mark `EVENT_CATALOG.md` PLANNED entries IMPLEMENTED.
- Report verification verdict to the manager.

## 6. Explicit non-goals (do NOT implement here)
- No analytics table / migration (P1-M9; D-4 review if ever needed).
- No third-party SDKs, no log aggregation, no dashboards.
- No tutorial/matchmaking/rating events (features don't exist).
- No experiment exposure fields (watch item — designed with the first
  experiment, not now).
- No change to match domain events, contracts package, or client
  replays of hidden state.
