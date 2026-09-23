/**
 * Event replay (PRD-009: "Results must be reproducible from stored event
 * history + config version"; 06_ARCHITECTURE.md §6 auditability).
 *
 * Persisted domain events are mapped back onto their originating commands
 * and re-applied through the same `applyCommand` path. Because the domain is
 * deterministic, replay reproduces the exact final state and re-emits the
 * exact same events — derived events (MATCH_STARTED, MATCH_PAUSED,
 * MATCH_COMPLETED) re-emerge from the commands that caused them and are
 * therefore skipped when reading the stored stream.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import { applyCommand, createMatch } from './match';
import type { CreateMatchInput, DomainCommand, DomainEvent, MatchState, PlayerId } from './types';

export interface ReplayResult {
  state: MatchState;
  replayedEvents: DomainEvent[];
}

export function replayMatch(input: CreateMatchInput, config: EconomyConfig, events: DomainEvent[]): ReplayResult {
  const created = createMatch(input, config);
  if (!created.ok) throw new Error(`replay: createMatch failed (${created.code}: ${created.message})`);

  let state = created.state;
  const replayedEvents: DomainEvent[] = [];

  for (const event of events) {
    const command = commandForEvent(event);
    if (command === null) continue; // derived event — re-emitted by its cause
    const result = applyCommand(state, command, config);
    if (!result.ok) {
      throw new Error(`replay: ${event.type} at sequence ${event.sequence} failed (${result.code}: ${result.message})`);
    }
    state = result.state;
    replayedEvents.push(...result.events);
  }

  return { state, replayedEvents };
}

function commandForEvent(event: DomainEvent): DomainCommand | null {
  const payload = event.payload;
  switch (event.type) {
    case 'PLAYER_READY':
      return { kind: 'READY', playerId: playerIdOf(payload.playerId, event), now: event.at };
    case 'OFFER_SUBMITTED':
      return {
        kind: 'OFFER',
        playerId: actorOf(event),
        offerId: payload.offerId as string,
        amountTenths: payload.amountTenths as number,
        now: event.at,
      };
    case 'OFFER_ACCEPTED':
      return { kind: 'ACCEPT', playerId: actorOf(event), offerId: payload.offerId as string, now: event.at };
    case 'WALKED_AWAY':
      return { kind: 'WALK_AWAY', playerId: actorOf(event), now: event.at };
    case 'MESSAGE_SENT':
      return {
        kind: 'MESSAGE',
        playerId: actorOf(event),
        messageId: payload.messageId as string,
        body: payload.body as string,
        now: event.at,
      };
    case 'PLAYER_DISCONNECTED':
      return { kind: 'DISCONNECT', playerId: actorOf(event), now: event.at };
    case 'PLAYER_RECONNECTED':
      return { kind: 'RECONNECT', playerId: actorOf(event), now: event.at };
    case 'TIMED_OUT':
      return { kind: 'TIMEOUT', playerId: actorOf(event), now: event.at };
    case 'MATCH_ABORTED':
      return { kind: 'ABORT', now: event.at };
    case 'MATCH_STARTED':
    case 'MATCH_PAUSED':
    case 'MATCH_COMPLETED':
      return null;
  }
}

function actorOf(event: DomainEvent): PlayerId {
  if (event.actorPlayerId === null) throw new Error(`replay: ${event.type} has no actor`);
  return event.actorPlayerId;
}

function playerIdOf(value: unknown, event: DomainEvent): PlayerId {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`replay: ${event.type} has no playerId`);
  return value;
}
