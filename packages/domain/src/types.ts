/**
 * Core domain types (docs/07_DATA_MODEL.md, docs/02_GAME_RULES.md).
 *
 * PURITY CONTRACT (06_ARCHITECTURE.md §4): this package is deterministic.
 * No Date.now, no Math.random, no I/O. All time is passed in by the caller
 * as `now` (ms epoch, server-authoritative).
 */

export type PlayerId = string;

export const ROLES = ['BUYER', 'SELLER'] as const;
export type Role = (typeof ROLES)[number];

export const MATCH_MODES = ['RANKED_LIVE', 'FRIEND_LIVE', 'AI', 'ASYNC'] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export const MATCH_STATUSES = ['CREATED', 'READY', 'ACTIVE', 'PAUSED', 'DEAL', 'NO_DEAL', 'ABORTED'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const COMPLETION_REASONS = ['ACCEPTED', 'WALKED_AWAY', 'TIMED_OUT', 'ABORTED'] as const;
export type CompletionReason = (typeof COMPLETION_REASONS)[number];

/**
 * Player-facing error codes (docs/08_API_CONTRACTS.md). `INVALID_MATCH_INPUT`
 * and `MESSAGE_EMPTY` are structural/administrative codes, not player
 * actions. `COMMAND_ALREADY_PROCESSED` is emitted by the persistence layer
 * (SI-004 idempotency), never by `applyCommand` itself.
 */
export type DomainErrorCode =
  | 'MATCH_NOT_ACTIVE'
  | 'NOT_YOUR_TURN'
  | 'INVALID_AMOUNT'
  | 'AMOUNT_OUT_OF_RANGE'
  | 'OUTSIDE_RESERVATION_VALUE'
  | 'NON_MONOTONIC_CONCESSION'
  | 'DUPLICATE_OFFER'
  | 'INSUFFICIENT_CONCESSION_CHIPS'
  | 'OFFER_NOT_CURRENT'
  | 'OFFER_NOT_ACCEPTABLE_BY_RESERVATION'
  | 'TIMED_OUT'
  | 'TIMEOUT_NOT_DUE'
  | 'COMMAND_ALREADY_PROCESSED'
  | 'INVALID_MATCH_INPUT'
  | 'MESSAGE_EMPTY';

/** Event types (docs/07_DATA_MODEL.md MatchEvent — an open list, "include"). */
export type DomainEventType =
  | 'MATCH_STARTED'
  | 'PLAYER_READY'
  | 'OFFER_SUBMITTED'
  | 'MESSAGE_SENT'
  | 'PLAYER_DISCONNECTED'
  | 'PLAYER_RECONNECTED'
  | 'MATCH_PAUSED'
  | 'OFFER_ACCEPTED'
  | 'WALKED_AWAY'
  | 'TIMED_OUT'
  | 'MATCH_COMPLETED'
  | 'MATCH_ABORTED';

export interface DomainEvent {
  /** Strict per-match ordering, starts at 1. */
  sequence: number;
  type: DomainEventType;
  /** Server timestamp, ms epoch. */
  at: number;
  actorPlayerId: PlayerId | null;
  payload: Record<string, unknown>;
}

export interface ParticipantInput {
  playerId: PlayerId;
  role: Role;
  /** Private hard boundary, integer tenths (GR-002/GR-003). */
  reservationValueTenths: number;
}

export interface CreateMatchInput {
  matchId: string;
  mode: MatchMode;
  scenarioId: string;
  scenarioVersion: number;
  gameRulesVersion: string;
  economyConfigVersion: string;
  /** Null for unrated modes (06_ARCHITECTURE.md §11). */
  ratingVersion: string | null;
  buyer: ParticipantInput;
  seller: ParticipantInput;
  /** GR-005: server selects first mover (50/50); the domain records it. */
  firstPlayerId: PlayerId;
  createdAt: number;
}

export interface ParticipantState {
  playerId: PlayerId;
  role: Role;
  /** GR-002: never serialized to the opponent pre-result. */
  reservationValueTenths: number;
  initialChipBudget: number;
  chipsSpent: number;
  /** GR-014/06 §5: cumulative active ms, updated only when a turn freezes. */
  cumulativeActiveMs: number;
  openingOfferTenths: number | null;
  latestOfferTenths: number | null;
  /** Identity of the player's current standing offer (GR: "Standing offer"). */
  standingOfferId: string | null;
  disconnected: boolean;
  ready: boolean;
}

export interface PlayerEconomy {
  playerId: PlayerId;
  clockMultiplier: number;
  grossReward: number;
  netResult: number;
  chipsSpent: number;
  remainingChips: number;
  cumulativeActiveMs: number;
}

export interface MatchEconomy {
  zopaTenths: number;
  settlementTenths: number | null;
  buyerSurplusShare: number | null;
  sellerSurplusShare: number | null;
  /** GR-019: only eligible synchronous human ranked matches are canonical-rated. */
  ratedEligible: boolean;
  players: Record<PlayerId, PlayerEconomy>;
}

export interface MatchState {
  matchId: string;
  mode: MatchMode;
  status: MatchStatus;
  scenarioId: string;
  scenarioVersion: number;
  gameRulesVersion: string;
  economyConfigVersion: string;
  ratingVersion: string | null;
  participants: [ParticipantState, ParticipantState];
  /** GR-005: recorded for analytics (first-mover advantage is an open question). */
  firstPlayerId: PlayerId;
  /** GR-014: exactly one active clock owner while status is ACTIVE. */
  activePlayerId: PlayerId | null;
  /** Server timestamp when the current turn started; null while frozen/paused. */
  turnStartedAt: number | null;
  eventSequence: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  settlementTenths: number | null;
  completionReason: CompletionReason | null;
  economy: MatchEconomy | null;
}

/** Commands — one per authoritative action. `now` is the server timestamp. */
export type DomainCommand =
  | { kind: 'READY'; playerId: PlayerId; now: number }
  | { kind: 'OFFER'; playerId: PlayerId; offerId: string; amountTenths: number; now: number }
  | { kind: 'ACCEPT'; playerId: PlayerId; offerId: string; now: number }
  | { kind: 'WALK_AWAY'; playerId: PlayerId; now: number }
  | { kind: 'MESSAGE'; playerId: PlayerId; messageId: string; body: string; now: number }
  | { kind: 'DISCONNECT'; playerId: PlayerId; now: number }
  | { kind: 'RECONNECT'; playerId: PlayerId; now: number }
  /** Administrative technical termination (GR: "administrative termination"). */
  | { kind: 'ABORT'; now: number }
  /**
   * GR-024: hard decision-time budget exhausted (DD Phase 1). Server-only —
   * submitted by the timeout scheduler, never by a client route. `playerId`
   * must be the active player and the elapsed time must actually have
   * reached the limit (else TIMEOUT_NOT_DUE).
   */
  | { kind: 'TIMEOUT'; playerId: PlayerId; now: number };

export type DomainResult =
  | { ok: true; state: MatchState; events: DomainEvent[] }
  | { ok: false; code: DomainErrorCode; message: string };

export function failure(code: DomainErrorCode, message: string): DomainResult {
  return { ok: false, code, message };
}
