/**
 * The five practice personas (DEC-025). Pure and deterministic: every
 * decision derives from the role-scoped view plus seeded entropy. Personas
 * never see MatchState, never peek at the opponent's RV, and never propose
 * a move the chip budget cannot pay — their intents must pass the exact
 * same domain validation as human commands.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import { concessionCostChips, concessionMagnitude, type MatchView } from '@bounty-bay/domain';
import type { AgentContext, AgentDecision, OpponentAgent, PersonaConfig } from './types';

/**
 * The Mirror's concession pace: fraction of the gap conceded per move,
 * clamped to [0.04, 0.25]. Mirrors the opponent's cumulative movement
 * |ln(latest/opening)| — a stonewalling opponent earns a slow mirror.
 */
export function mirrorFraction(opponentCumulativeMovement: number): number {
  return Math.min(0.25, Math.max(0.04, opponentCumulativeMovement / 6));
}

export function createPersonaAgent(persona: PersonaConfig, config: EconomyConfig): OpponentAgent {
  const maxAmount = config.maxAmountTenths;
  const { strategy } = persona;

  function meOf(view: MatchView) {
    return view.participants.find((p) => p.playerId === view.myPlayerId)!;
  }
  function oppOf(view: MatchView) {
    return view.participants.find((p) => p.playerId !== view.myPlayerId)!;
  }

  function opponentMovement(opp: { latestOfferTenths: number | null; openingOfferTenths: number | null }): number {
    if (opp.latestOfferTenths === null || opp.openingOfferTenths === null || opp.openingOfferTenths === 0) return 0;
    return Math.abs(Math.log(opp.latestOfferTenths / opp.openingOfferTenths));
  }

  /** Opening offer: buyer at a fraction of own RV, seller at a multiple, clamped to the legal envelope. */
  function openingAmount(rv: number, role: 'BUYER' | 'SELLER'): number {
    const raw = role === 'BUYER' ? rv * strategy.opening.buyerFraction : rv * strategy.opening.sellerMultiplier;
    let amount = Math.round(raw);
    if (amount < 1) amount = 1;
    if (role === 'BUYER') amount = Math.min(amount, rv);
    else amount = Math.max(amount, rv);
    return Math.min(amount, maxAmount);
  }

  /**
   * Concession: move toward the opponent by `fraction` of the remaining gap,
   * clamped strictly monotonic and inside the mandate, shrunk until the
   * chip cost is affordable. Returns null when no legal move exists (at
   * mandate, crossed-unacceptable, or unaffordable).
   */
  function concessionAmount(view: MatchView): number | null {
    const me = meOf(view);
    const opp = oppOf(view);
    const rv = view.myReservationValueTenths!;
    // ParticipantView.remainingChips is always present; view.economy is null until terminal.
    const chips = me.remainingChips;
    const prev = me.latestOfferTenths!;

    const atMandate = me.role === 'BUYER' ? prev >= rv : prev <= rv;
    if (atMandate) return null;

    const gap = me.role === 'BUYER' ? opp.latestOfferTenths! - prev : prev - opp.latestOfferTenths!;
    if (gap <= 0) return null; // crossed already — no move improves our position

    let fraction =
      strategy.concessionFraction === 'reciprocal' ? mirrorFraction(opponentMovement(opp)) : strategy.concessionFraction;

    for (;;) {
      const raw = me.role === 'BUYER' ? prev + fraction * gap : prev - fraction * gap;
      let next = Math.round(raw);
      next = me.role === 'BUYER' ? Math.max(prev + 1, Math.min(next, rv)) : Math.min(prev - 1, Math.max(next, rv));
      const cost = concessionCostChips(concessionMagnitude(prev, next), config);
      if (cost <= chips) return next;
      fraction /= 2;
      if (fraction * Math.abs(gap) < 0.5) return null; // even a one-tenth move is unaffordable
    }
  }

  function decide(ctx: AgentContext): AgentDecision {
    const { view, rng } = ctx;
    const me = meOf(view);
    const opp = oppOf(view);
    const rv = view.myReservationValueTenths!;

    // 1. flavor chat — at most one batch per turn (the engine clears chatAllowed)
    if (ctx.chatAllowed && persona.chatLines.length > 0 && rng() < persona.chatProbability) {
      const line = persona.chatLines[Math.floor(rng() * persona.chatLines.length)]!;
      return [{ kind: 'MESSAGE', messageId: aiId('msg', ctx, rng), body: line }];
    }

    // 2. accept when the standing offer beats our threshold (GR-010)
    if (opp.standingOfferId !== null && opp.latestOfferTenths !== null) {
      const acceptable =
        me.role === 'BUYER'
          ? opp.latestOfferTenths <= rv * strategy.acceptThreshold.buyer
          : opp.latestOfferTenths >= rv * strategy.acceptThreshold.seller;
      if (acceptable) return { kind: 'ACCEPT', offerId: opp.standingOfferId };
    }

    // 3. walk roll
    if (rng() < strategy.walkProbability) return { kind: 'WALK_AWAY' };

    // 4. opening
    if (me.latestOfferTenths === null) {
      return { kind: 'OFFER', offerId: aiId('offer', ctx, rng), amountTenths: openingAmount(rv, me.role) };
    }

    // 5. concession — or the only legal retreat when no move exists
    const amount = concessionAmount(view);
    if (amount === null) return { kind: 'WALK_AWAY' };
    return { kind: 'OFFER', offerId: aiId('offer', ctx, rng), amountTenths: amount };
  }

  return { personaKey: persona.key, decide };
}

/** The engine replaces these with server UUIDs; they only need to be unique within a replay. */
function aiId(prefix: string, ctx: AgentContext, rng: () => number): string {
  return `${prefix}-${ctx.now}-${Math.floor(rng() * 1_000_000)}`;
}
