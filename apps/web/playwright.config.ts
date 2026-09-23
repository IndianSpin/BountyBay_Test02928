import { defineConfig } from '@playwright/test';
import path from 'node:path';

const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://bounty:bounty@localhost:5433/bounty_bay';
// Alternate ports let the suite run alongside a live dev session
// (E2E_WEB_PORT=3100 E2E_API_PORT=4100) instead of requiring it to stop.
// Note: Next refuses a second dev server per project while one runs, so
// testing against a live session also needs E2E_REUSE_SERVERS=1, which
// targets the existing 3000/4000 stack instead of booting anything.
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3000);
const API_PORT = Number(process.env.E2E_API_PORT ?? 4000);
const API_URL = `http://localhost:${API_PORT}`;
const REUSE_SERVERS = process.env.E2E_REUSE_SERVERS === '1';

/**
 * E2E: boots the API and the web app, then drives two browser contexts
 * through a complete friend match (M4 exit criterion).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  use: {
    headless: true,
    baseURL: `http://localhost:${WEB_PORT}`,
  },
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: path.resolve(__dirname, '..', 'api'),
      port: API_PORT,
      reuseExistingServer: REUSE_SERVERS,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DATABASE_URL,
        DEV_AUTH_SECRET: 'e2e-secret',
        API_PORT: String(API_PORT),
      },
    },
    {
      command: 'pnpm dev',
      cwd: __dirname,
      port: WEB_PORT,
      reuseExistingServer: REUSE_SERVERS,
      env: {
        ...process.env,
        PORT: String(WEB_PORT),
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
