/**
 * Game Review timeline (IN-2, DEC-028, docs/20 "Timeline"). Pure and
 * deterministic: derived from the persisted event stream, strictly
 * sequence-ordered, negotiation-relevant actions only. Message entries
 * carry presence and timing only — content is never loaded into the
 * timeline (docs/18 §14; no NLP anywhere in this package).
 */

import type { DomainEvent, MatchState, PlayerId, Role } from '@bounty-bay/domain';

export type TimelineEntryKind = 'OFFER' | 'MESSAGE' | 'ACCEPT' | 'WALK_AWAY' | 'TIMEOUT' | 'ABORTED';

export interface ReviewTimelineEntry {
  seq: number;
  /** Server timestamp, ms epoch. */
  at: number;
  kind: TimelineEntryKind;
  actorPlayerId: PlayerId | null;
  role: Role | null;
  /** OFFER only. */
  amountTenths?: number;
  /** OFFER only. */
  isOpening?: boolean;
  /** OFFER only — authoritative domain-computed cost. */
  concessionCostChips?: number;
}

export function buildTimeline(state: MatchState, events: DomainEvent[]): ReviewTimelineEntry[] {
  const roleOf = (playerId: PlayerId | null): Role | null =>
    playerId !== null ? state.participants.find((p) => p.playerId === playerId)?.role ?? null : null;

  const entries: ReviewTimelineEntry[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'OFFER_SUBMITTED': {
        const amountTenths = typeof event.payload.amountTenths === 'number' ? event.payload.amountTenths : undefined;
        const concessionCostChips =
          typeof event.payload.concessionCostChips === 'number' ? event.payload.concessionCostChips : undefined;
        entries.push({
          seq: event.sequence,
          at: event.at,
          kind: 'OFFER',
          actorPlayerId: event.actorPlayerId,
          role: roleOf(event.actorPlayerId),
          ...(amountTenths !== undefined ? { amountTenths } : {}),
          ...(event.payload.isOpening === true ? { isOpening: true } : {}),
          ...(concessionCostChips !== undefined ? { concessionCostChips } : {}),
        });
        break;
      }
      case 'MESSAGE_SENT':
        entries.push({
          seq: event.sequence,
          at: event.at,
          kind: 'MESSAGE',
          actorPlayerId: event.actorPlayerId,
          role: roleOf(event.actorPlayerId),
        });
        break;
      case 'OFFER_ACCEPTED':
        entries.push({
          seq: event.sequence,
          at: event.at,
          kind: 'ACCEPT',
          actorPlayerId: event.actorPlayerId,
          role: roleOf(event.actorPlayerId),
        });
        break;
      case 'WALKED_AWAY':
        entries.push({
          seq: event.sequence,
          at: event.at,
          kind: 'WALK_AWAY',
          actorPlayerId: event.actorPlayerId,
          role: roleOf(event.actorPlayerId),
        });
        break;
      case 'TIMED_OUT': {
        // TIMED_OUT carries the timed-out player in the payload; the domain
        // timeout scheduler (not a player action) raises the event.
        const timedOut = typeof event.payload.timedOutPlayerId === 'string' ? (event.payload.timedOutPlayerId as PlayerId) : null;
        entries.push({ seq: event.sequence, at: event.at, kind: 'TIMEOUT', actorPlayerId: timedOut, role: roleOf(timedOut) });
        break;
      }
      case 'MATCH_ABORTED':
        entries.push({ seq: event.sequence, at: event.at, kind: 'ABORTED', actorPlayerId: null, role: null });
        break;
      default:
        // MATCH_STARTED / PLAYER_READY / disconnect / reconnect / pause /
        // MATCH_COMPLETED are plumbing, not negotiation steps.
        break;
    }
  }
  return entries;
}
