/**
 * Property/invariant tests (docs/15_SIMULATION_VALIDATION_PLAN.md §5).
 *
 * Random legal-ish command sequences over random scenarios; after every
 * command (successful or not) the hard invariants must hold:
 *
 * - settlement inside both RVs;
 * - surplus shares sum to 1 within fixed-point tolerance;
 * - buyer offer sequence strictly increases / seller strictly decreases;
 * - multiplier in [0.30, 1.00];
 * - concession budget never negative;
 * - no-deal gross bounty = 0;
 * - event sequence strictly monotonic;
 * - failed commands mutate nothing.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, viewMatchFor } from '../src';
import type { DomainCommand, MatchState, ParticipantState } from '../src/types';
import { BUYER_ID, SELLER_ID, apply, byId, create, mulberry32, offerId } from './helpers';

const config = makeEconomyConfig();

interface Seed {
  buyerRv: number;
  sellerRv: number;
  firstPlayerId: string;
}

function makeSeed(rng: () => number): Seed {
  const buyerRv = 100 + Math.floor(rng() * 9900); // 10.0 .. 1000.0
  const zopa = 1 + Math.floor(rng() * buyerRv); // ensure buyer > seller
  return {
    buyerRv,
    sellerRv: buyerRv - zopa,
    firstPlayerId: rng() < 0.5 ? BUYER_ID : SELLER_ID,
  };
}

/** Picks a mostly-legal command for the given state; illegal ones are fine too. */
function randomCommand(state: MatchState, rng: () => number, seq: number): DomainCommand {
  const now = state.startedAt ?? 0;
  const owner = state.activePlayerId ?? BUYER_ID;
  const other = state.participants.find((p) => p.playerId !== owner)!;
  const ownerState = byId(state, owner);

  const roll = rng();
  const nowOffset = Math.floor(rng() * 120_000);

  if (other.latestOfferTenths !== null && roll < 0.2) {
    // Sometimes accept the standing offer, sometimes a stale id on purpose.
    const offerIdToUse = rng() < 0.9 ? (other.standingOfferId ?? offerId(seq)) : offerId(900 + seq);
    return { kind: 'ACCEPT', playerId: owner, offerId: offerIdToUse, now: now + nowOffset };
  }
  if (roll < 0.24) {
    return { kind: 'WALK_AWAY', playerId: owner, now: now + nowOffset };
  }
  if (roll < 0.3) {
    return { kind: 'MESSAGE', playerId: owner, messageId: `msg-${seq}`, body: 'hello', now: now + nowOffset };
  }
  // DD Phase 1 (GR-024): occasionally issue a TIMEOUT — often not yet due
  // (rejected without mutation), occasionally due (terminal transition).
  if (roll < 0.34) {
    return { kind: 'TIMEOUT', playerId: owner, now: now + nowOffset };
  }

  // Offer: stay within RV and (mostly) monotonic; occasionally illegal on purpose.
  const rv = ownerState.reservationValueTenths;
  let amount: number;
  if (ownerState.role === 'BUYER') {
    const base = ownerState.latestOfferTenths ?? 1 + Math.floor(rng() * rv);
    amount = base + Math.floor(rng() * Math.max(1, rv - base) * 0.6);
    if (rng() < 0.1) amount = base; // occasional duplicate
  } else {
    const base = ownerState.latestOfferTenths ?? rv + Math.floor(rng() * (9_999_999_999 - rv));
    amount = base - Math.floor(rng() * Math.max(1, base - rv) * 0.6);
    if (rng() < 0.1) amount = base; // occasional duplicate
  }
  amount = Math.max(1, Math.min(9_999_999_999, amount));
  return { kind: 'OFFER', playerId: owner, offerId: offerId(seq), amountTenths: amount, now: now + nowOffset };
}

function checkInvariants(state: MatchState): void {
  const [buyer, seller]: [ParticipantState, ParticipantState] =
    state.participants[0]!.role === 'BUYER'
      ? [state.participants[0]!, state.participants[1]!]
      : [state.participants[1]!, state.participants[0]!];

  // Budgets never negative.
  expect(buyer.chipsSpent).toBeGreaterThanOrEqual(0);
  expect(buyer.chipsSpent).toBeLessThanOrEqual(buyer.initialChipBudget);
  expect(seller.chipsSpent).toBeGreaterThanOrEqual(0);
  expect(seller.chipsSpent).toBeLessThanOrEqual(seller.initialChipBudget);

  // Offers within RV, strictly monotonic per role.
  if (buyer.latestOfferTenths !== null) {
    expect(buyer.latestOfferTenths).toBeLessThanOrEqual(buyer.reservationValueTenths);
    if (buyer.openingOfferTenths !== null && buyer.latestOfferTenths !== buyer.openingOfferTenths) {
      expect(buyer.latestOfferTenths).toBeGreaterThan(buyer.openingOfferTenths);
    }
  }
  if (seller.latestOfferTenths !== null) {
    expect(seller.latestOfferTenths).toBeGreaterThanOrEqual(seller.reservationValueTenths);
    if (seller.openingOfferTenths !== null && seller.latestOfferTenths !== seller.openingOfferTenths) {
      expect(seller.latestOfferTenths).toBeLessThan(seller.openingOfferTenths);
    }
  }

  if (state.economy) {
    for (const p of Object.values(state.economy.players)) {
      expect(p.clockMultiplier).toBeGreaterThanOrEqual(0.3 - 1e-12);
      expect(p.clockMultiplier).toBeLessThanOrEqual(1 + 1e-12);
      expect(p.remainingChips).toBeGreaterThanOrEqual(0);
    }
    // GR-024: a timeout is always a NO_DEAL with zero gross for both.
    if (state.completionReason === 'TIMED_OUT') {
      expect(state.status).toBe('NO_DEAL');
      expect(state.economy).not.toBeNull();
      expect(state.activePlayerId).toBeNull();
      expect(state.turnStartedAt).toBeNull();
    }
    if (state.status === 'DEAL') {
      const s = state.economy.settlementTenths!;
      expect(s).toBeGreaterThanOrEqual(seller.reservationValueTenths);
      expect(s).toBeLessThanOrEqual(buyer.reservationValueTenths);
      const sum = state.economy.buyerSurplusShare! + state.economy.sellerSurplusShare!;
      expect(sum).toBeCloseTo(1, 9);
    } else {
      for (const p of Object.values(state.economy.players)) {
        expect(p.grossReward).toBe(0);
      }
    }
  }
}

describe('property: random legal-ish play never breaks invariants', () => {
  it('holds across 300 seeded matches with random scenarios and commands', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed);
      const s = makeSeed(rng);

      let state = create({
        buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: s.buyerRv },
        seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: s.sellerRv },
        firstPlayerId: s.firstPlayerId,
      });
      state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: state.createdAt }, config);
      state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: state.createdAt }, config);

      let lastSequence = 0;
      for (let step = 0; step < 80 && state.status === 'ACTIVE'; step++) {
        const before = JSON.stringify(state);
        const result = applyCommand(state, randomCommand(state, rng, step + 1), config);

        if (!result.ok) {
          // Failed commands must not mutate state; the failure type itself
          // carries no events by construction.
          expect(JSON.stringify(state)).toBe(before);
          continue;
        }

        for (const event of result.events) {
          expect(event.sequence).toBeGreaterThan(lastSequence);
          lastSequence = event.sequence;
        }
        state = result.state;
        checkInvariants(state);
      }
      checkInvariants(state);
    }
  });

  it('views never leak the opponent RV at any point pre-result', () => {
    const rng = mulberry32(42);
    const s = makeSeed(rng);
    let state = create({
      buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: s.buyerRv },
      seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: s.sellerRv },
      firstPlayerId: s.firstPlayerId,
    });
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: state.createdAt }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: state.createdAt }, config);

    let steps = 0;
    while (state.status === 'ACTIVE' && steps < 500) {
      steps += 1;
      const result = applyCommand(state, randomCommand(state, rng, steps), config);
      if (!result.ok) continue;
      state = result.state;
      if (state.status === 'ACTIVE' || state.status === 'PAUSED') {
        for (const viewerId of [BUYER_ID, SELLER_ID]) {
          const view = viewMatchFor(state, viewerId, state.turnStartedAt ?? state.startedAt ?? 0, config);
          const serialized = JSON.stringify(view);
          const opponentRv = viewerId === BUYER_ID ? s.sellerRv : s.buyerRv;
          expect(serialized).not.toContain(String(opponentRv));
        }
      }
    }
  });
});
