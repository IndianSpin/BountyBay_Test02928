/**
 * mode: 'AI' coverage (DEC-025, P1-M1). The domain treats AI intents as
 * ordinary commands — this file pins the mode's lifecycle with zero domain
 * code changes: AI matches are legal, unrated, and role-scoped.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch } from '../src/match';
import { viewMatchFor } from '../src/projection';
import { BUYER_ID, makeInput, mustFail, mustOk, offerId, SELLER_ID, START_NOW, startedMatch } from './helpers';

describe('mode: AI', () => {
  const aiInput = () =>
    makeInput({
      mode: 'AI',
      ratingVersion: null,
      scenarioId: 'scenario-ai-1',
    });

  it('creates unrated with ratingVersion null', () => {
    const { state } = startedMatch(aiInput());
    expect(state.mode).toBe('AI');
    expect(state.ratingVersion).toBeNull();
  });

  it('plays a full legal deal through the same command path as humans, ratedEligible false', () => {
    const { state: created, config } = startedMatch(aiInput());

    // buyer opens at own RV (100.0), which crosses the seller's line immediately
    let state = mustOk(
      applyCommand(created, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 1000, now: START_NOW + 1000 }, config),
    ).state;

    // seller stands at own RV (40.0) — crossed; no auto-settlement (GR-011)
    state = mustOk(
      applyCommand(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 400, now: START_NOW + 2000 }, config),
    ).state;
    expect(state.status).toBe('ACTIVE');

    // buyer accepts the seller's standing offer (GR-010)
    state = mustOk(
      applyCommand(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(2), now: START_NOW + 3000 }, config),
    ).state;
    expect(state.status).toBe('DEAL');
    expect(state.economy!.settlementTenths).toBe(400);
    expect(state.economy!.ratedEligible).toBe(false);
  });

  it('never exposes the opponent RV pre-result and reveals it post-terminal (GR-018)', () => {
    const { state, config } = startedMatch(aiInput());

    const sellerView = viewMatchFor(state, SELLER_ID, START_NOW + 500, config);
    const buyerEntry = sellerView.participants.find((p) => p.playerId === BUYER_ID)!;
    expect(buyerEntry.reservationValueTenths).toBeUndefined();
    expect(sellerView.myReservationValueTenths).toBe(400);

    const walked = mustOk(
      applyCommand(state, { kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 2000 }, config),
    ).state;
    expect(walked.status).toBe('NO_DEAL');

    const terminalView = viewMatchFor(walked, SELLER_ID, START_NOW + 3000, config);
    const terminalBuyer = terminalView.participants.find((p) => p.playerId === BUYER_ID)!;
    expect(terminalBuyer.reservationValueTenths).toBe(1000);
  });

  it('enforces positive ZOPA for ranked only; AI stays permissive', () => {
    const config = makeEconomyConfig();
    const negativeZopa = {
      buyer: { playerId: BUYER_ID, role: 'BUYER' as const, reservationValueTenths: 100 },
      seller: { playerId: SELLER_ID, role: 'SELLER' as const, reservationValueTenths: 900 },
    };
    const ranked = createMatch(makeInput({ mode: 'RANKED_LIVE', ...negativeZopa }), config);
    expect(mustFail(ranked).code).toBeTruthy();

    const ai = createMatch(makeInput({ mode: 'AI', ratingVersion: null, ...negativeZopa }), config);
    expect(mustOk(ai).state.mode).toBe('AI');
  });
});
