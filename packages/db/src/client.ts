/**
 * Prisma 7 client factory: the client takes a driver adapter (Prisma 7
 * removed schema-file connection URLs). Callers may pass an explicit URL;
 * the default reads DATABASE_URL from the environment.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export function createPrismaClient(url: string = process.env.DATABASE_URL ?? ''): PrismaClient {
  if (!url) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}
