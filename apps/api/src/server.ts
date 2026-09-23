/**
 * Bounty Bay API entry point — binds the port only; the app itself is built
 * by buildApp (apps/api/src/app.ts).
 *
 * Local dev: loads the repo-root .env (dotenv never overrides already-set
 * variables, so production secrets from the deployment manager win).
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
// here = apps/api/src → repo root is three levels up.
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true });
dotenv.config({ path: path.resolve(here, '../../../packages/db/.env'), quiet: true });

import { createPrismaClient } from '@bounty-bay/db';
import { buildApp } from './app';
import { createAuthAdapter } from './auth/adapters';

const auth = createAuthAdapter();
const app = await buildApp({
  auth,
  prisma: createPrismaClient(),
  exposeDevAuth: auth.name === 'dev',
});

const port = Number(process.env.API_PORT ?? 4000);
try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
