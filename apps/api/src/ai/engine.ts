/**
 * AiTurnEngine (DEC-025): schedules and commits AI practice turns.
 *
 * The AI plays through the exact same command service as humans — nothing
 * here reimplements game rules. Scheduling is in-memory (single API
 * instance, like the presence maps in realtime.ts) and restart-safe three
 * ways: `bootScan` on API ready, lazy `maybeSchedule` on snapshots /
 * socket joins / committed commands, and a state re-check under the row
 * lock before every move. Decisions are seeded from the match's event
 * sequence, so a re-fired or post-restart turn reproduces the same intent.
 */

import {
  AI_PERSONAS,
  resolveAgent,
  matchSeed,
  mulberry32,
  type AgentContext,
  type AgentDecision,
} from '@bounty-bay/ai';
import { viewMatchFor } from '@bounty-bay/domain';
import type { MatchCommandService, PrismaClient, StoredSnapshot } from '@bounty-bay/db';
import type { DomainEvent } from '@bounty-bay/domain';
import { randomUUID } from 'node:crypto';
import type { MatchBroadcaster } from '../realtime';

export interface AiTurnEngineOptions {
  service: MatchCommandService;
  prisma: PrismaClient;
  broadcast: MatchBroadcaster;
}

type Move = Exclude<AgentDecision, readonly unknown[]>;

export class AiTurnEngine {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private botIds: Set<string> | null = null;

  constructor(private readonly options: AiTurnEngineOptions) {}

  /** Called on API ready: any AI match left mid-turn (e.g. after a restart) resumes. */
  async bootScan(): Promise<void> {
    const botIds = await this.getBotIds();
    if (botIds.size === 0) return;
    const pending = await this.options.prisma.match.findMany({
      where: { status: 'ACTIVE', activePlayerId: { in: [...botIds] } },
      select: { id: true },
    });
    for (const row of pending) await this.maybeSchedule(row.id);
  }

  /** Idempotent: schedules the AI's move when an active AI match is on the AI's turn. */
  async maybeSchedule(matchId: string): Promise<void> {
    if (this.timers.has(matchId)) return;
    const botIds = await this.getBotIds();
    if (botIds.size === 0) return;

    const row = await this.options.prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true, activePlayerId: true, aiPersonaKey: true },
    });
    if (!row || row.status !== 'ACTIVE' || !row.activePlayerId || !botIds.has(row.activePlayerId)) return;
    if (!row.aiPersonaKey) return; // defensive: an active match where a bot plays always carries the key

    const persona = AI_PERSONAS.find((p) => p.key === row.aiPersonaKey);
    if (!persona) return;
    const [min, max] = persona.thinkRangeMs;
    const rng = mulberry32(matchSeed(matchId, persona.key));
    const delay = min + Math.floor(rng() * (max - min + 1));

    const timeout = setTimeout(() => void this.playAiTurn(matchId), delay);
    timeout.unref();
    this.timers.set(matchId, timeout);
  }

  private async getBotIds(): Promise<Set<string>> {
    if (this.botIds) return this.botIds;
    const bots = await this.options.prisma.user.findMany({ where: { isBot: true }, select: { id: true } });
    this.botIds = new Set(bots.map((b) => b.id));
    return this.botIds;
  }

  private async playAiTurn(matchId: string): Promise<void> {
    this.timers.delete(matchId);
    try {
      await this.performAiTurn(matchId);
    } catch (err) {
      // Never crash the API on a scheduling fault; the next lazy hook or
      // restart rescues the turn.
      console.error(`[ai] turn failed for match ${matchId}:`, err);
    }
  }

  private async performAiTurn(matchId: string): Promise<void> {
    const snapshot = await this.options.service.loadSnapshot(matchId);
    if (!snapshot) return;
    const state = snapshot.state;
    const active = state.activePlayerId;
    const botIds = await this.getBotIds();
    if (state.status !== 'ACTIVE' || !active || !botIds.has(active)) return;

    const row = await this.options.prisma.match.findUnique({ where: { id: matchId }, select: { aiPersonaKey: true } });
    if (!row?.aiPersonaKey) return;
    const persona = AI_PERSONAS.find((p) => p.key === row.aiPersonaKey);
    if (!persona) return;
    const agent = resolveAgent(persona.key, snapshot.config);
    // Per-turn deterministic entropy: same match + persona + event sequence ⇒ same decision.
    const rng = mulberry32(matchSeed(`${matchId}:${row.aiPersonaKey}:${state.eventSequence}`, row.aiPersonaKey));
    const now = Date.now();
    const context: AgentContext = { view: viewMatchFor(state, active, now, snapshot.config), now, rng, chatAllowed: true };

    let decision = agent.decide(context);
    if (Array.isArray(decision)) {
      // flavor chat: commit it, then decide again without chat (one batch per turn)
      const committed = await this.commitMessages(matchId, active, decision, now);
      if (!committed) return;
      decision = agent.decide({ ...context, chatAllowed: false });
      if (Array.isArray(decision)) {
        // unreachable by construction (chatAllowed=false never yields chat); never wedge a match
        console.error(`[ai] ${row.aiPersonaKey} chatted twice in one turn (match ${matchId}); walking away`);
        decision = { kind: 'WALK_AWAY' };
      }
    }

    let committed = await this.commitMove(matchId, active, decision as Move, now);
    if (!committed) {
      committed = await this.fallbackMove(matchId, active, snapshot);
    }
    if (!committed) return;

    const after = await this.options.service.loadSnapshot(matchId);
    this.options.broadcast(matchId, committed.events, after);
    await this.maybeSchedule(matchId); // no-op unless the turn is somehow still the AI's
  }

  private async commitMessages(matchId: string, playerId: string, messages: { messageId: string; body: string }[], now: number): Promise<boolean> {
    for (const message of messages) {
      const outcome = await this.options.service.message({
        kind: 'MESSAGE',
        matchId,
        playerId,
        messageId: randomUUID(),
        body: message.body,
        commandId: randomUUID(),
        now,
      });
      if (!outcome.ok) return false;
    }
    return true;
  }

  private async commitMove(
    matchId: string,
    playerId: string,
    decision: Move,
    now: number,
  ): Promise<{ events: DomainEvent[] } | null> {
    let outcome: { ok: boolean; events?: DomainEvent[] } = { ok: false };
    switch (decision.kind) {
      case 'OFFER':
        outcome = await this.options.service.offer({
          kind: 'OFFER',
          matchId,
          playerId,
          offerId: randomUUID(),
          amountTenths: decision.amountTenths,
          commandId: randomUUID(),
          now,
        });
        break;
      case 'ACCEPT':
        outcome = await this.options.service.accept({ kind: 'ACCEPT', matchId, playerId, offerId: decision.offerId, commandId: randomUUID(), now });
        break;
      case 'WALK_AWAY':
        outcome = await this.options.service.walkAway({ kind: 'WALK_AWAY', matchId, playerId, commandId: randomUUID(), now });
        break;
    }
    return outcome.ok ? { events: outcome.events ?? [] } : null;
  }

  /**
   * Safety net (personas must never need it): if an intent was illegal — a
   * bug — accept the standing offer when legal, else walk away. A live
   * match can never wedge on the AI.
   */
  private async fallbackMove(matchId: string, playerId: string, snapshot: StoredSnapshot): Promise<{ events: DomainEvent[] } | null> {
    console.error(`[ai] illegal intent for match ${matchId}; applying fallback ladder`);
    const view = viewMatchFor(snapshot.state, playerId, Date.now(), snapshot.config);
    const me = view.participants.find((p) => p.playerId === playerId)!;
    const opp = view.participants.find((p) => p.playerId !== playerId)!;
    if (opp.standingOfferId !== null && opp.latestOfferTenths !== null) {
      const legal =
        me.role === 'BUYER'
          ? opp.latestOfferTenths <= view.myReservationValueTenths!
          : opp.latestOfferTenths >= view.myReservationValueTenths!;
      if (legal) {
        const outcome = await this.options.service.accept({
          kind: 'ACCEPT',
          matchId,
          playerId,
          offerId: opp.standingOfferId,
          commandId: randomUUID(),
          now: Date.now(),
        });
        if (outcome.ok) return { events: outcome.events };
      }
    }
    const outcome = await this.options.service.walkAway({ kind: 'WALK_AWAY', matchId, playerId, commandId: randomUUID(), now: Date.now() });
    return outcome.ok ? { events: outcome.events ?? [] } : null;
  }
}
