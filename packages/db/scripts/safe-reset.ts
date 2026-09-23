/**
 * Guarded destructive database reset (dev only).
 *
 * Usage: pnpm --filter @bounty-bay/db db:reset -- bounty_bay
 *
 * Two mechanical safeguards before any destructive command runs:
 *  1. NODE_ENV=production refuses outright;
 *  2. the caller must retype the target database NAME as an argument —
 *     the classic confirmation barrier against fat-fingering a reset.
 *
 * Production schema changes must use `prisma migrate deploy` (db:deploy),
 * which never drops data. Least-privilege DB credentials (SI) are the
 * deployment-manager-level backstop this script cannot provide.
 */

import 'dotenv/config';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(here, '..');

// pnpm passes its own "--" separator through; drop it before parsing.
const confirmName = process.argv.slice(2).filter((arg) => arg !== '--')[0];

if (process.env.NODE_ENV === 'production') {
  console.error('REFUSED: db:reset may not run with NODE_ENV=production. Use migrate deploy for schema changes.');
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? '';
const dbName = new URL(url).pathname.replace(/^\//, '');

if (!confirmName) {
  console.error(`This command DROPS the database "${dbName}". Re-run with the database name as an argument to confirm:`);
  console.error(`  pnpm --filter @bounty-bay/db db:reset -- ${dbName}`);
  process.exit(1);
}

if (confirmName !== dbName) {
  console.error(`REFUSED: confirmation "${confirmName}" does not match the target database "${dbName}".`);
  process.exit(1);
}

console.log(`Resetting database "${dbName}"…`);
execSync('npx prisma migrate reset --force', { cwd: packageDir, stdio: 'inherit' });
console.log('Reset complete. Re-seed with: pnpm --filter @bounty-bay/db db:seed');
