/**
 * QA temporary instrumentation (BB-221, isolated, revert after use):
 * boots the real API but logs every /v1/auth/dev/signin request — ts, status,
 * duration — plus slow requests (>2s) anywhere, so the strict-suite run can
 * prove whether the late-suite play-entry stall is the signin rate limit
 * (429s) or a stalled API (slow/hung requests).
 *
 * Usage (mirror playwright.config.ts webServer env exactly):
 *   cd ~/projects/bay-qa/apps/api
 *   DATABASE_URL=postgresql://bounty:bounty@localhost:5433/bounty_bay_e2e \
 *     API_PORT=4100 DEV_AUTH_SECRET=e2e-secret NODE_ENV=development \
 *     npx tsx ../../.agents/qa/tools/instrumented-api.ts
 * Then run playwright with E2E_REUSE_SERVERS=1 E2E_WEB_PORT=3100 E2E_API_PORT=4100.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true });
dotenv.config({ path: path.resolve(here, '../../../packages/db/.env'), quiet: true });

import { createPrismaClient } from '@bounty-bay/db';
import { buildApp } from '../../../apps/api/src/app';
import { createAuthAdapter } from '../../../apps/api/src/auth/adapters';

async function main(): Promise<void> {
const auth = createAuthAdapter();
const app = await buildApp({
  auth,
  prisma: createPrismaClient(),
  exposeDevAuth: auth.name === 'dev',
});

app.addHook('onRequest', async (request) => {
  (request as unknown as { qaStartedAt?: number }).qaStartedAt = Date.now();
});
app.addHook('onResponse', async (request, reply) => {
  const started = (request as unknown as { qaStartedAt?: number }).qaStartedAt;
  const dur = started ? Date.now() - started : -1;
  if (request.url === '/v1/auth/dev/signin') {
    console.log(`[QA-INSTR] signin ${reply.statusCode} ${dur}ms ${new Date().toISOString()}`);
  } else if (dur > 2000) {
    console.log(`[QA-INSTR] SLOW ${request.method} ${request.url} ${reply.statusCode} ${dur}ms`);
  }
});

const port = Number(process.env.API_PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
console.log(`[QA-INSTR] instrumented API on :${port}`);
}

void main().catch((e) => { console.error(e); process.exit(1); });
