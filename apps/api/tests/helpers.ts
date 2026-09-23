/**
 * Shared DB cleanup for API integration tests: removes everything owned by
 * dev-signin users (matches cascade their children via FK; profiles and
 * users are direct). Never truncates globally — test files share the DB.
 */

import type { PrismaClient } from '@bounty-bay/db';

export async function cleanupDevUsers(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DELETE FROM matches WHERE id IN (
      SELECT m.id FROM matches m
      JOIN match_participants mp ON mp.match_id = m.id
      JOIN users u ON u.id = mp.user_id
      WHERE u.auth_subject LIKE 'dev_%'
    )`);
  await prisma.$executeRawUnsafe(`DELETE FROM player_profiles WHERE user_id IN (SELECT id FROM users WHERE auth_subject LIKE 'dev_%')`);
  await prisma.$executeRawUnsafe(`DELETE FROM users WHERE auth_subject LIKE 'dev_%'`);
}
