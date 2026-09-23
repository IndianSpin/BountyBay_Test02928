/**
 * Shared event-stream → timeline text mapping (replay + game review, IN-2).
 * Pure presentation: numbers are formatted, nothing is interpreted.
 */

import { formatTenthsGrouped } from './format';

export interface TimelineRow {
  sequence: number;
  at: number;
  text: string;
  kind: 'offer' | 'chat' | 'outcome' | 'presence' | 'system';
}

export interface RawEvent {
  sequence: number;
  type: string;
  at: number;
  actorPlayerId: string | null;
  payload: Record<string, unknown>;
}

export function toTimelineRow(event: RawEvent, handles: Record<string, string>): TimelineRow {
  const actor = event.actorPlayerId !== null ? (handles[event.actorPlayerId] ?? 'Player') : null;
  switch (event.type) {
    case 'OFFER_SUBMITTED': {
      const amount = formatTenthsGrouped(event.payload.amountTenths as number);
      const isOpening = event.payload.isOpening === true;
      const cost = event.payload.concessionCostChips as number;
      return {
        sequence: event.sequence,
        at: event.at,
        kind: 'offer',
        text: `${actor} offered ${amount}${isOpening ? ' (opening — free)' : ` (−${cost} chips)`}`,
      };
    }
    case 'MESSAGE_SENT':
      return { sequence: event.sequence, at: event.at, kind: 'chat', text: `${actor}: ${String(event.payload.body)}` };
    case 'OFFER_ACCEPTED':
      return {
        sequence: event.sequence,
        at: event.at,
        kind: 'outcome',
        text: `${actor} accepted — deal at ${formatTenthsGrouped(event.payload.amountTenths as number)}`,
      };
    case 'WALKED_AWAY':
      return { sequence: event.sequence, at: event.at, kind: 'outcome', text: `${actor} walked away — no deal` };
    case 'TIMED_OUT':
      return { sequence: event.sequence, at: event.at, kind: 'outcome', text: `${actor} ran out of decision time — no deal` };
    case 'PLAYER_DISCONNECTED':
      return { sequence: event.sequence, at: event.at, kind: 'presence', text: `${actor} disconnected — clock frozen` };
    case 'PLAYER_RECONNECTED':
      return { sequence: event.sequence, at: event.at, kind: 'presence', text: `${actor} reconnected — clock resumed` };
    case 'MATCH_STARTED':
      return {
        sequence: event.sequence,
        at: event.at,
        kind: 'system',
        text: `Match started (first mover: ${handles[event.payload.firstPlayerId as string] ?? 'Player'})`,
      };
    case 'MATCH_PAUSED':
      return { sequence: event.sequence, at: event.at, kind: 'system', text: 'Match paused' };
    case 'PLAYER_READY':
      return { sequence: event.sequence, at: event.at, kind: 'system', text: `${actor} is ready` };
    default:
      return { sequence: event.sequence, at: event.at, kind: 'system', text: event.type };
  }
}
