/**
 * @bounty-bay/db — persistence layer (Milestone 2).
 *
 * Prisma 7 client (generated into src/generated), the match command service
 * (06 §6 authoritative transaction, SI-004 idempotency/racing), and the
 * snapshot codec. Game rules live in @bounty-bay/domain — never here.
 */

export { Prisma, PrismaClient } from './generated/prisma/client';
export type { PrismaClient as PrismaClientType } from './generated/prisma/client';
export { createPrismaClient } from './client';
export { MatchCommandService, persistAnalysis } from './command-service';
export type { CommandOutcome, MatchCommand, OfferCommand, AcceptCommand, SimpleCommand, MessageCommand, AbortCommand, StoredAnalysis } from './command-service';
export { UserRepository } from './user-repository';
export type { MeDto, PublicProfileDto } from './user-repository';
export { HANDLE_PATTERN } from './user-repository';
export { decodeSnapshot, encodeSnapshot } from './snapshot';
export type { StoredSnapshot } from './snapshot';
export { AI_BOT_USERS, ensureAiBotUsers, findBotByPersona } from './ai-bots';
