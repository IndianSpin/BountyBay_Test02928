# QA tools (Agent 5)

Temporary, isolated instrumentation — run manually, never part of the
default suites. Kept here (not in `apps/web/e2e/`) so the product E2E
suite and typecheck never pick them up, and so the manager can re-run
them on demand. Delete or update when their pinned behaviors change.

## 1. Adversarial API battery — `battery.ts`

27 P0 probes against the wire: GR-003/004/006/007/008/010/011/013/015/
017-relevant boundaries, accept races, idempotency, non-participant
access, disconnect freeze/resume. Needs the API running against the
isolated QA DB:

```sh
cd ~/projects/bay-qa/apps/api
DATABASE_URL="postgresql://bounty:bounty@localhost:5433/bounty_bay_qa" \
  API_PORT=4300 DEV_AUTH_SECRET=qa-secret NODE_ENV=development \
  npx tsx src/server.ts &
cd ~/projects/bay-qa
pnpm --filter @bounty-bay/db exec tsx \
  /Users/jeremydommnich/projects/bay-qa/.agents/qa/tools/battery.ts
```

Results append to `.agents/qa/evidence/battery-results.jsonl`.
One INFO line (GR-012 walk-away) is expected — PDR-2, report only.

## 2. Playwright matrix specs — `specs/`

- `qa-interruption.spec.ts` — accept-seal-after-early-release
  re-verification; MATCH STATE INTERRUPTION matrix (L-004); mobile 390
  flow. **Test 2 pins QA-001's current behavior** (asserts the joiner
  refresh error + resume recovery) — update it when QA-001 is fixed.
- `qa-browser-leak.spec.ts` — browser-surface hidden-info scan
  (DOM / `__NEXT_DATA__` / storage / `/v1` bodies / WS frames,
  pre-result). Writes `/tmp/qa-leak.json`.

To run (copy into the testDir first, remove after):

```sh
cp .agents/qa/tools/specs/qa-*.spec.ts apps/web/e2e/
E2E_DATABASE_URL="postgresql://bounty:bounty@localhost:5433/bounty_bay_qa" \
  E2E_WEB_PORT=3200 E2E_API_PORT=4200 \
  pnpm --filter web exec playwright test e2e/qa-interruption.spec.ts e2e/qa-browser-leak.spec.ts
rm apps/web/e2e/qa-*.spec.ts
```

## 3. Instrumentation notes

- Playwright's `page.on('websocket')` attaches to the FIRST websocket a
  page opens — in dev that is the Next.js HMR socket, not Socket.IO.
  Filter by `ws.url().includes('/socket.io')`; and prefer the DB event
  log (`match_events` rows) over wire capture for talk/event evidence —
  it is authoritative, timing-independent, and immune to the HMR mask
  (BB-257 lesson).
