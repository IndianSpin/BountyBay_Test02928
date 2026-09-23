import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, viewMatchFor } from '../src';
import { BUYER_ID, SELLER_ID, START_NOW, apply, create, mustOk, offerId, startedMatch } from './helpers';

const config = makeEconomyConfig();

describe('hidden RV isolation — SI-001 / GR-002', () => {
  it('pre-result views contain the viewer’s RV but no opponent RV field at all', () => {
    // Seller RV 37.3 (373) — chosen so the value appears nowhere else in state.
    let state = create({ seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 373 } });
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config);

    const buyerView = viewMatchFor(state, BUYER_ID, START_NOW + 1000, config);
    const [buyerParticipant, sellerParticipant] = buyerView.participants;

    expect(buyerParticipant!.reservationValueTenths).toBe(1000);
    expect('reservationValueTenths' in sellerParticipant!).toBe(false);

    // Penetration test: the serialized view must not contain the opponent RV anywhere.
    const serialized = JSON.stringify(buyerView);
    expect(serialized).not.toContain('373');
  });

  it('myReservationValueTenths follows the viewer’s identity', () => {
    const { state } = startedMatch();
    expect(viewMatchFor(state, BUYER_ID, START_NOW, config).myReservationValueTenths).toBe(1000);
    expect(viewMatchFor(state, SELLER_ID, START_NOW, config).myReservationValueTenths).toBe(400);
  });

  it('after completion both players may see both RVs (GR-018)', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 700, now: START_NOW }, config);
    state = apply(state, { kind: 'ACCEPT', playerId: SELLER_ID, offerId: offerId(1), now: START_NOW }, config);

    const view = viewMatchFor(state, SELLER_ID, START_NOW, config);
    const buyerParticipant = view.participants.find((p) => p.playerId === BUYER_ID)!;
    expect(buyerParticipant.reservationValueTenths).toBe(1000);
    expect(view.economy).not.toBeNull();
    expect(view.settlementTenths).toBe(700);
  });
});

describe('view shape — GR-016', () => {
  it('exposes both players’ clock status and payout multipliers', () => {
    const { state } = startedMatch();
    const view = viewMatchFor(state, SELLER_ID, START_NOW + 30_000, config);
    const buyer = view.participants.find((p) => p.playerId === BUYER_ID)!;
    const seller = view.participants.find((p) => p.playerId === SELLER_ID)!;
    // Buyer has been thinking for 30s; seller is idle at 0.
    expect(buyer.clockMultiplier).toBeCloseTo(1 - 0.7 * (30_000 / config.clockFloorMs), 12);
    expect(seller.clockMultiplier).toBe(1);
    expect(view.myTurn).toBe(false);
  });

  it('myTurn is true only for the active owner while ACTIVE', () => {
    const { state } = startedMatch();
    expect(viewMatchFor(state, BUYER_ID, START_NOW, config).myTurn).toBe(true);
    expect(viewMatchFor(state, SELLER_ID, START_NOW, config).myTurn).toBe(false);

    const paused = mustOk(applyCommand(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW }, config)).state;
    expect(viewMatchFor(paused, BUYER_ID, START_NOW, config).myTurn).toBe(false);
  });
});

describe('decision-time budget projection — GR-023 (DD Phase 1)', () => {
  const limitConfig = makeEconomyConfig({ hardDecisionTimeLimitMs: 90_000, timeWarningLowMs: 30_000, timeWarningCriticalMs: 10_000 });

  it('derives remaining time and tier boundaries (NORMAL / LOW_TIME / CRITICAL)', () => {
    const { state } = startedMatch({}, limitConfig);
    // Buyer is active from START_NOW with 90 s budget.
    const at = (elapsedMs: number) => viewMatchFor(state, SELLER_ID, START_NOW + elapsedMs, limitConfig).participants.find((p) => p.playerId === BUYER_ID)!;

    expect(at(0).decisionTimeRemainingMs).toBe(90_000);
    expect(at(0).timeTier).toBe('NORMAL');
    // Boundary: LOW_TIME at exactly 30 s remaining (60 s elapsed), NORMAL above.
    expect(at(60_000).timeTier).toBe('LOW_TIME');
    expect(at(59_999).timeTier).toBe('NORMAL');
    // Boundary: CRITICAL at exactly 10 s remaining (80 s elapsed).
    expect(at(80_000).timeTier).toBe('CRITICAL');
    expect(at(79_999).timeTier).toBe('LOW_TIME');
    // Past the limit (match not yet transitioned): remaining clamps at 0, CRITICAL.
    expect(at(100_000).decisionTimeRemainingMs).toBe(0);
    expect(at(100_000).timeTier).toBe('CRITICAL');
  });

  it('both players see the active player’s budget (GR-016 shared visibility)', () => {
    const { state } = startedMatch({}, limitConfig);
    for (const viewer of [BUYER_ID, SELLER_ID]) {
      const view = viewMatchFor(state, viewer, START_NOW + 40_000, limitConfig);
      expect(view.participants.find((p) => p.playerId === BUYER_ID)!.decisionTimeRemainingMs).toBe(50_000);
    }
  });

  it('returns null remaining/tier when the config has no limit or the match is terminal', () => {
    const legacy = makeEconomyConfig({ hardDecisionTimeLimitMs: undefined });
    const { state } = startedMatch({}, legacy);
    const noLimit = viewMatchFor(state, SELLER_ID, START_NOW, legacy);
    expect(noLimit.participants.every((p) => p.decisionTimeRemainingMs === null && p.timeTier === null)).toBe(true);

    // Terminal: after a walk-away, remaining/tier are null even with a limit.
    const walkAway = mustOk(applyCommand(state, { kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW + 1_000 }, legacy)).state;
    const terminal = viewMatchFor(walkAway, SELLER_ID, START_NOW + 1_000, legacy);
    expect(terminal.participants.every((p) => p.decisionTimeRemainingMs === null && p.timeTier === null)).toBe(true);
  });
});
