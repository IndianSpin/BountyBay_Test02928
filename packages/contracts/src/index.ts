/**
 * Shared Zod schemas for the HTTP/realtime contract (docs/08_API_CONTRACTS.md).
 *
 * Conventions: JSON over HTTPS; opaque UUID ids; amounts as integer tenths;
 * client-generated `commandId` for idempotent mutations; ISO-8601 UTC
 * timestamps. Socket commands, when added, must reuse these exact schemas —
 * never a second implementation of game rules.
 */

import { z } from 'zod';
import { DEFAULT_ECONOMY_CONFIG } from '@bounty-bay/config';

export const commandIdSchema = z.string().uuid();

export const amountTenthsSchema = z
  .number()
  .int()
  .min(1, 'GR-004: minimum amount is 0.1')
  .max(DEFAULT_ECONOMY_CONFIG.maxAmountTenths, 'GR-004: maximum amount is 999,999,999.9');

/** Strict string form — server normalizes to tenths before domain validation. */
export const amountStringSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d)?$/, 'GR-004: positive number, one decimal place, no scientific notation');

export const offerRequestSchema = z.object({
  commandId: commandIdSchema,
  amountTenths: amountTenthsSchema,
});
export type OfferRequest = z.infer<typeof offerRequestSchema>;

export const acceptRequestSchema = z.object({
  commandId: commandIdSchema,
  offerId: z.string().uuid(),
});
export type AcceptRequest = z.infer<typeof acceptRequestSchema>;

export const walkAwayRequestSchema = z.object({
  commandId: commandIdSchema,
});
export type WalkAwayRequest = z.infer<typeof walkAwayRequestSchema>;

export const messageRequestSchema = z.object({
  commandId: commandIdSchema,
  body: z.string().trim().min(1).max(500),
});
export type MessageRequest = z.infer<typeof messageRequestSchema>;

/** AI practice personas (DEC-025; registry lives in @bounty-bay/ai). */
export const personaKeySchema = z.enum(['anchor', 'grinder', 'closer', 'wall', 'mirror']);

export const createAiMatchRequestSchema = z.object({
  commandId: commandIdSchema,
  persona: personaKeySchema,
});
export type CreateAiMatchRequest = z.infer<typeof createAiMatchRequestSchema>;

/** Player-facing error codes (docs/08_API_CONTRACTS.md). */
export const API_ERROR_CODES = [
  'MATCH_NOT_ACTIVE',
  'NOT_YOUR_TURN',
  'INVALID_AMOUNT',
  'AMOUNT_OUT_OF_RANGE',
  'OUTSIDE_RESERVATION_VALUE',
  'NON_MONOTONIC_CONCESSION',
  'DUPLICATE_OFFER',
  'INSUFFICIENT_CONCESSION_CHIPS',
  'OFFER_NOT_CURRENT',
  'OFFER_NOT_ACCEPTABLE_BY_RESERVATION',
  'TIMED_OUT',
  'TIMEOUT_NOT_DUE',
  'COMMAND_ALREADY_PROCESSED',
  // PDR-3 (QA-004): friend-rematch lifecycle codes.
  'REMATCH_NOT_FOUND',
  'REMATCH_NOT_OPEN',
  'REMATCH_FORBIDDEN',
  'REMATCH_ALREADY_PROPOSED',
  'REMATCH_NOT_AVAILABLE',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

/** Socket.IO event names — server to client (docs/08_API_CONTRACTS.md). */
export const SOCKET_EVENTS = [
  'match:state',
  'match:event',
  'match:clock-sync',
  'match:opponent-disconnected',
  'match:opponent-reconnected',
  'match:completed',
  'matchmaking:found',
] as const;
export type SocketEventName = (typeof SOCKET_EVENTS)[number];

/** Public profile DTO (docs/08_API_CONTRACTS.md GET /v1/profiles/:handle). */
export const publicProfileSchema = z.object({
  handle: z.string().min(1),
  bountyRating: z.number().int(),
  ratedGames: z.number().int().nonnegative(),
  agreementRate: z.number().min(0).max(1),
  averageSurplusShare: z.number().min(0).max(1),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;
