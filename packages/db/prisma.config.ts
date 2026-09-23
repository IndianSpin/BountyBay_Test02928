// Prisma 7 CLI config. Prisma 7 no longer auto-loads .env files, so load
// packages/db/.env explicitly before resolving the migrate connection URL.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

const databaseUrl = env('DATABASE_URL');
const shadowDatabaseUrl = env('SHADOW_DATABASE_URL');

// HARD GUARD (post-incident, 2026-09-21): the shadow database must never be
// the primary database. `migrate diff --from-migrations` replays history in
// the shadow DB and will happily drop whatever lives there; pointing it at
// the primary wiped development data once.
if (databaseUrl === shadowDatabaseUrl) {
  throw new Error(
    'Refusing to run Prisma migrations: SHADOW_DATABASE_URL equals DATABASE_URL. ' +
      'The shadow database must be a separate, disposable database.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
    // Non-interactive migration diffs replay existing migrations here.
    shadowDatabaseUrl,
  },
});
