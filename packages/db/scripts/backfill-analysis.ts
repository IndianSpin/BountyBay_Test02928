/**
 * IN-1 backfill (DEC-028): computes behavior-analysis rows for completed
 * matches that predate the feature engine. Idempotent — matches that
 * already carry rows are skipped; re-runs are no-ops.
 *
 * Usage: pnpm --filter @bounty-bay/db exec tsx scripts/backfill-analysis.ts
 */

import 'dotenv/config';
import { createPrismaClient, decodeSnapshot, persistAnalysis } from '../src/index';

const prisma = createPrismaClient();

async function main(): Promise<void> {
  const candidates = await prisma.match.findMany({
    where: { status: { in: ['DEAL', 'NO_DEAL', 'ABORTED'] }, features: { none: {} } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  let done = 0;
  for (const { id } of candidates) {
    const row = await prisma.match.findUniqueOrThrow({ where: { id }, select: { domainState: true } });
    const snapshot = decodeSnapshot(row.domainState);
    if (!snapshot) {
      console.warn(`[backfill] no snapshot for ${id}; skipping`);
      continue;
    }
    await persistAnalysis(prisma, id, snapshot.state, snapshot.config);
    done += 1;
  }

  console.log(`[backfill] computed analysis for ${done} of ${candidates.length} eligible matches`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
