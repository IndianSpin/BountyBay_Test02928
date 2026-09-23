/**
 * Seeded AI opponent users (DEC-025, GR-020). Bots are real User rows with
 * is_bot = true: the schema's UUID-typed FK columns (match participants,
 * events, chat) require real users, and AI matches then replay with zero
 * special cases. Bots can never authenticate (requireAuth rejects is_bot;
 * dev sign-in rejects `bot:` subjects) and their profiles are never
 * publicly served.
 */

import type { PersonaKey } from '@bounty-bay/ai';
import type { PrismaClient } from './generated/prisma/client';

export const AI_BOT_USERS: readonly {
  id: string;
  personaKey: PersonaKey;
  authSubject: string;
  handle: string;
}[] = [
  { id: '00000000-0000-4000-9000-000000000001', personaKey: 'anchor', authSubject: 'bot:anchor', handle: 'TheAnchor' },
  { id: '00000000-0000-4000-9000-000000000002', personaKey: 'grinder', authSubject: 'bot:grinder', handle: 'TheGrinder' },
  { id: '00000000-0000-4000-9000-000000000003', personaKey: 'closer', authSubject: 'bot:closer', handle: 'TheCloser' },
  { id: '00000000-0000-4000-9000-000000000004', personaKey: 'wall', authSubject: 'bot:wall', handle: 'TheWall' },
  { id: '00000000-0000-4000-9000-000000000005', personaKey: 'mirror', authSubject: 'bot:mirror', handle: 'TheMirror' },
];

/** Idempotent upsert of all five persona users. Run on API boot and lazily before AI match creation. */
export async function ensureAiBotUsers(prisma: PrismaClient): Promise<void> {
  for (const bot of AI_BOT_USERS) {
    await prisma.user.upsert({
      where: { authSubject: bot.authSubject },
      create: { id: bot.id, authSubject: bot.authSubject, handle: bot.handle, isBot: true },
      update: { handle: bot.handle, isBot: true, status: 'ACTIVE' },
    });
  }
}

/** The bot user for a persona, verified as a bot; null when the persona is unknown or the row is missing. */
export async function findBotByPersona(
  prisma: PrismaClient,
  personaKey: string,
): Promise<{ id: string; handle: string } | null> {
  const entry = AI_BOT_USERS.find((bot) => bot.personaKey === personaKey);
  if (!entry) return null;
  const user = await prisma.user.findUnique({ where: { authSubject: entry.authSubject } });
  if (!user || !user.isBot) return null;
  return { id: user.id, handle: user.handle };
}
