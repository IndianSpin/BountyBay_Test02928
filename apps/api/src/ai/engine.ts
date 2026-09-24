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
  type PersonaKey,
} from '@bounty-bay/ai';
import { viewMatchFor, type DomainEvent, type MatchState, type PlayerId } from '@bounty-bay/domain';
import {
  initialBeliefs,
  runAiTurn,
  type AiBeliefs,
  type AiEconomicAction,
  type AiObservationInput,
} from '@bounty-bay/intelligence';
import type { MatchCommandService, PrismaClient, StoredSnapshot } from '@bounty-bay/db';
import { randomUUID } from 'node:crypto';
import type { MatchBroadcaster } from '../realtime';
import { matchCompletedFields, tierEntriesFor, type AnalyticsEmitter } from '../analytics';

export interface AiTurnEngineOptions {
  service: MatchCommandService;
  prisma: PrismaClient;
  broadcast: MatchBroadcaster;
  /** BB-251 (BB-247 §2.5): AI-practice completions must be visible in the stream. */
  analytics?: AnalyticsEmitter;
}

type Move = Exclude<AgentDecision, readonly unknown[]>;

export class AiTurnEngine {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private botIds: Set<string> | null = null;
  /** BB-257 (table talk): per-match belief state, reset per process restart. */
  private readonly beliefs = new Map<string, AiBeliefs>();

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

    // BB-257 (AI_BEHAVIOR_CONTRACT §3): the persona layer supplies the
    // legal economic action only; the table-talk pipeline (packages/
    // intelligence runAiTurn) supplies the talk + intent. The pipeline
    // receives legal-view observations only — never reservation values,
    // never opponent message content.
    let decision = agent.decide({ ...context, chatAllowed: false });
    if (Array.isArray(decision)) {
      // chatAllowed=false never yields chat by construction; never wedge a match
      console.error(`[ai] ${row.aiPersonaKey} returned chat without permission (match ${matchId}); walking away`);
      decision = { kind: 'WALK_AWAY' };
    }

    const events = await this.options.service.listEvents(matchId);
    const talkResult = runAiTurn(
      observeAiTurn(matchId, state, active, decision as Move, events, persona.key),
      this.beliefs.get(matchId) ?? initialBeliefs(),
    );
    this.beliefs.set(matchId, talkResult.beliefs);

    const talked = await this.commitMessages(matchId, active, [{ messageId: randomUUID(), body: talkResult.talk }], now);
    if (!talked) return; // the lazy hook rescues the turn

    let committed = await this.commitMove(matchId, active, decision as Move, now);
    if (!committed) {
      committed = await this.fallbackMove(matchId, active, snapshot);
    }
    if (!committed) return;

    // BB-257: intent observability — pseudonymous, one line per AI turn.
    this.options.analytics?.emit('ai_turn_intent', {
      matchId,
      playerId: active,
      personaKey: row.aiPersonaKey,
      intent: talkResult.intent,
      roundNumber: state.eventSequence + 1,
    });

    const after = await this.options.service.loadSnapshot(matchId);
    this.options.broadcast(matchId, committed.events, after);
    // BB-251 (BB-247 §2.5): engine-driven completions (bot accept/walk-away)
    // emit the same match_completed + tier entries as the HTTP path — the
    // first-alpha path (AI practice) would otherwise be invisible.
    if (after && committed.events.some((e) => e.type === 'MATCH_COMPLETED')) {
      this.options.analytics?.emit('match_completed', matchCompletedFields(after.state));
    }
    if (after) {
      for (const entry of tierEntriesFor(after.state, after.config, now)) {
        this.options.analytics?.emit('time_tier_entered', entry);
      }
    }
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

// ---------------------------------------------------------------------------
// BB-257 (AI_BEHAVIOR_CONTRACT §3): legal-view observations
// ---------------------------------------------------------------------------

/**
 * Observations for one AI turn, built from the legal view only: the
 * bot's own offer, the opponent's public offers, event-stream presence
 * and timing. No reservation values, no message content — both players
 * can see everything read here (docs/18 hidden-information discipline).
 */
function observeAiTurn(
  matchId: string,
  state: MatchState,
  botId: PlayerId,
  decision: Move,
  events: DomainEvent[],
  personaKey: PersonaKey,
): AiObservationInput {
  const bot = state.participants.find((p) => p.playerId === botId)!;
  const opponent = state.participants.find((p) => p.playerId !== botId)!;

  const opponentOffers = events.filter((e) => e.type === 'OFFER_SUBMITTED' && e.actorPlayerId === opponent.playerId);
  const latestOpponentOffer = opponentOffers[opponentOffers.length - 1];
  const previousOpponentOffer = opponentOffers[opponentOffers.length - 2];

  // Consecutive opponent concessions toward the bot (strict improvement).
  let concessionRun = 0;
  for (let i = opponentOffers.length - 1; i > 0; i -= 1) {
    const current = opponentOffers[i]!.payload.amountTenths as number;
    const prior = opponentOffers[i - 1]!.payload.amountTenths as number;
    const improvesForBot = bot.role === 'BUYER' ? current < prior : current > prior;
    if (!improvesForBot) break;
    concessionRun += 1;
  }

  // The opponent's last decision window: their latest offer minus the
  // event immediately before it in the stream.
  let opponentLastDecisionMs: number | null = null;
  if (latestOpponentOffer) {
    const eventIndex = events.indexOf(latestOpponentOffer);
    const previous = events[eventIndex - 1];
    if (previous) opponentLastDecisionMs = latestOpponentOffer.at - previous.at;
  }

  const crossedOffers =
    bot.latestOfferTenths !== null &&
    opponent.latestOfferTenths !== null &&
    (bot.role === 'BUYER'
      ? bot.latestOfferTenths >= opponent.latestOfferTenths
      : opponent.latestOfferTenths >= bot.latestOfferTenths);

  const economicAction: AiEconomicAction =
    decision.kind === 'OFFER' ? { kind: 'OFFER', amountTenths: decision.amountTenths } : { kind: decision.kind };

  return {
    matchId,
    roundNumber: state.eventSequence + 1,
    role: bot.role,
    myLatestOfferTenths: bot.latestOfferTenths,
    opponentLatestOfferTenths: opponent.latestOfferTenths,
    opponentConcessionRun: concessionRun,
    opponentLastDecisionMs,
    opponentMessageCount: events.filter((e) => e.type === 'MESSAGE_SENT' && e.actorPlayerId === opponent.playerId).length,
    opponentHeldLastTurn:
      previousOpponentOffer !== undefined &&
      latestOpponentOffer !== undefined &&
      previousOpponentOffer.payload.amountTenths === latestOpponentOffer.payload.amountTenths,
    crossedOffers,
    economicAction,
    personaKey,
  };
}
