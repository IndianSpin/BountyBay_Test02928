import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch } from '../src/match';
import type { DomainCommand, MatchState } from '../src/types';
import {
  BUYER_ID,
  SELLER_ID,
  START_NOW,
  apply,
  byId,
  create,
  makeInput,
  mustFail,
  mustOk,
  offerId,
  startedMatch,
} from './helpers';

const config = makeEconomyConfig();

describe('GR-001/GR-002 factory validation', () => {
  it('rejects non-distinct players', () => {
    const r = createMatch({ ...makeInput(), seller: { playerId: BUYER_ID, role: 'SELLER', reservationValueTenths: 400, verifiableFactIds: [] } }, config);
    expect(mustFail(r).code).toBe('INVALID_MATCH_INPUT');
  });

  it('rejects a second buyer (roles must be one of each)', () => {
    const r = createMatch({ ...makeInput(), seller: { playerId: SELLER_ID, role: 'BUYER', reservationValueTenths: 400, verifiableFactIds: [] } }, config);
    expect(mustFail(r).code).toBe('INVALID_MATCH_INPUT');
  });

  it('rejects invalid reservation values', () => {
    const zero = createMatch({ ...makeInput(), buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 0, verifiableFactIds: [] } }, config);
    expect(mustFail(zero).code).toBe('INVALID_MATCH_INPUT');
    const neg = createMatch({ ...makeInput(), seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: -5, verifiableFactIds: [] } }, config);
    expect(mustFail(neg).code).toBe('INVALID_MATCH_INPUT');
    const huge = createMatch(
      { ...makeInput(), seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 9_999_999_999, verifiableFactIds: [] } },
      config,
    );
    expect(mustFail(huge).code).toBe('INVALID_MATCH_INPUT');
  });

  it('rejects ranked matches without positive ZOPA (07_DATA_MODEL)', () => {
    const r = createMatch(
      { ...makeInput(), seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 1000, verifiableFactIds: [] } },
      config,
    );
    expect(mustFail(r).code).toBe('INVALID_MATCH_INPUT');
  });

  it('allows non-ranked matches with zopa <= 0 (no settlement is then legal)', () => {
    const state = create(
      { mode: 'FRIEND_LIVE', seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 1000, verifiableFactIds: [] } },
      config,
    );
    expect(state.status).toBe('CREATED');
  });

  it('rejects a first mover who is not a participant', () => {
    const r = createMatch({ ...makeInput(), firstPlayerId: 'stranger' }, config);
    expect(mustFail(r).code).toBe('INVALID_MATCH_INPUT');
  });

  it('records first mover, version identifiers, and both fresh chip budgets', () => {
    const state = create();
    expect(state.firstPlayerId).toBe(BUYER_ID);
    expect(state.gameRulesVersion).toBe('game-rules-0.1.0');
    expect(state.economyConfigVersion).toBe('economy-0.3.0');
    for (const p of state.participants) {
      expect(p.initialChipBudget).toBe(100);
      expect(p.chipsSpent).toBe(0);
      expect(p.openingOfferTenths).toBeNull();
      expect(p.latestOfferTenths).toBeNull();
      expect(p.reservationValueTenths).toBeGreaterThan(0);
    }
  });
});

describe('ready / match start', () => {
  it('starts only when both players are ready; first mover owns the first clock (GR-005/GR-014)', () => {
    const state = create();
    expect(state.status).toBe('CREATED');

    const first = applyCommand(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    const okFirst = mustOk(first);
    expect(okFirst.state.status).toBe('READY');
    expect(okFirst.events.map((e) => e.type)).toEqual(['PLAYER_READY']);

    const second = applyCommand(okFirst.state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    const okSecond = mustOk(second);
    expect(okSecond.state.status).toBe('ACTIVE');
    expect(okSecond.state.activePlayerId).toBe(BUYER_ID);
    expect(okSecond.state.turnStartedAt).toBe(START_NOW);
    expect(okSecond.state.startedAt).toBe(START_NOW);
    expect(okSecond.events.map((e) => e.type)).toEqual(['PLAYER_READY', 'MATCH_STARTED']);
    expect(okSecond.events[1]!.payload).toMatchObject({ firstPlayerId: BUYER_ID });
  });

  it('double-ready is idempotent and emits no further events', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    const again = mustOk(applyCommand(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config));
    expect(again.events).toHaveLength(0);
    expect(again.state.status).toBe('READY');
  });

  it('rejects READY once the match is active', () => {
    const { state } = startedMatch();
    expect(mustFail(applyCommand(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW + 1 }, config)).code).toBe(
      'MATCH_NOT_ACTIVE',
    );
  });
});

describe('GR-006 opening offer', () => {
  it('costs zero chips and is recorded as the opening', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config));
    expect(byId(r.state, BUYER_ID).chipsSpent).toBe(0);
    expect(byId(r.state, BUYER_ID).openingOfferTenths).toBe(500);
    expect(r.events[0]!.payload).toMatchObject({ isOpening: true, concessionCostChips: 0, remainingConcessionChips: 100 });
  });

  it('allows extreme anchors (GR-006: any valid amount within RV)', () => {
    const { state } = startedMatch();
    const low = mustOk(applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 1, now: START_NOW }, config));
    expect(byId(low.state, BUYER_ID).latestOfferTenths).toBe(1);

    const { state: highState } = startedMatch({
      buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 9_999_999_999, verifiableFactIds: [] },
      seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 9_999_999_990, verifiableFactIds: [] },
    });
    const high = mustOk(
      applyCommand(highState, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 9_999_999_999, now: START_NOW }, config),
    );
    expect(byId(high.state, BUYER_ID).latestOfferTenths).toBe(9_999_999_999);
  });
});

describe('GR-003 hard reservation boundary', () => {
  it('allows an offer exactly at the RV', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 1000, now: START_NOW }, config));
    expect(r.ok).toBe(true);
  });

  it('rejects 0.1 beyond the RV (buyer 100.1 at RV 100)', () => {
    const { state } = startedMatch();
    const r = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 1001, now: START_NOW }, config);
    expect(mustFail(r).code).toBe('OUTSIDE_RESERVATION_VALUE');
  });

  it('rejects seller offers below the seller RV (39.9 at RV 40)', () => {
    const { state, config: cfg } = startedMatch({ firstPlayerId: SELLER_ID });
    const r = applyCommand(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(1), amountTenths: 399, now: START_NOW }, cfg);
    expect(mustFail(r).code).toBe('OUTSIDE_RESERVATION_VALUE');
  });
});

describe('GR-004 amount domain', () => {
  it('rejects zero, negative, non-integer, and out-of-range tenths', () => {
    const { state } = startedMatch();
    for (const amount of [0, -10, 3.5, 10_000_000_000]) {
      const r = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: amount, now: START_NOW }, config);
      expect(mustFail(r).code).toBe('AMOUNT_OUT_OF_RANGE');
    }
  });
});

describe('GR-007/GR-008 unidirectional concessions and turn transfer', () => {
  it('buyer: 20 -> 30 -> 31.5 valid; 30 -> 25 invalid (docs example)', () => {
    let state = create(); // buyer RV 100
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 200, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 900, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 300, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 800, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(5), amountTenths: 315, now: START_NOW }, config);
    expect(byId(state, BUYER_ID).latestOfferTenths).toBe(315);

    const backward = applyCommand(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(6), amountTenths: 900, now: START_NOW }, config);
    expect(mustFail(backward).code).toBe('NON_MONOTONIC_CONCESSION');
  });

  it('seller: 100 -> 80 -> 72 valid; 80 -> 90 invalid (docs example)', () => {
    let state = create({ firstPlayerId: SELLER_ID });
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(1), amountTenths: 1000, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(2), amountTenths: 200, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(3), amountTenths: 800, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(4), amountTenths: 300, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(5), amountTenths: 720, now: START_NOW }, config);
    expect(byId(state, SELLER_ID).latestOfferTenths).toBe(720);

    const backward = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(6), amountTenths: 100, now: START_NOW }, config);
    expect(mustFail(backward).code).toBe('NON_MONOTONIC_CONCESSION');
  });

  it('duplicate offers are invalid and do not transfer the turn (GR-007)', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 600, now: START_NOW }, config);
    const before = state.activePlayerId;

    // Buyer repeats their own previous offer: duplicate, no turn transfer.
    const dup = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 500, now: START_NOW }, config);
    expect(mustFail(dup).code).toBe('DUPLICATE_OFFER');
    expect(state.activePlayerId).toBe(before);
  });

  it('no illegal/non-moving offer ever transfers the turn (DD Phase 1 / GR-007 gap-fill)', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 600, now: START_NOW }, config);
    const before = structuredClone(state);

    const cases: { code: string; command: Parameters<typeof applyCommand>[1] }[] = [
      // Backwards movement (GR-008).
      { code: 'NON_MONOTONIC_CONCESSION', command: { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 400, now: START_NOW } },
      // Duplicate (GR-007).
      { code: 'DUPLICATE_OFFER', command: { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(4), amountTenths: 500, now: START_NOW } },
      // Outside the mandate (GR-003).
      { code: 'OUTSIDE_RESERVATION_VALUE', command: { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(5), amountTenths: 1001, now: START_NOW } },
      // Amount domain violations (GR-004).
      { code: 'AMOUNT_OUT_OF_RANGE', command: { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(6), amountTenths: 0, now: START_NOW } },
    ];
    for (const { code, command } of cases) {
      const r = applyCommand(state, command, config);
      expect(mustFail(r).code).toBe(code);
      expect(state).toEqual(before); // no mutation, no turn switch
    }

    // Unaffordable concession (GR-017) with a depleted budget: also no switch.
    const tight = makeEconomyConfig({ concessionBudgetChips: 0 });
    let broke = create({}, tight);
    broke = apply(broke, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, tight);
    broke = apply(broke, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, tight);
    broke = apply(broke, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, tight);
    broke = apply(broke, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 600, now: START_NOW }, tight);
    const brokeBefore = structuredClone(broke);
    const unaffordable = applyCommand(broke, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW }, tight);
    expect(mustFail(unaffordable).code).toBe('INSUFFICIENT_CONCESSION_CHIPS');
    expect(broke).toEqual(brokeBefore);
  });

  it('transfers the turn to the opponent on a valid offer (GR-007/GR-014)', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config));
    expect(r.state.activePlayerId).toBe(SELLER_ID);
    expect(r.state.turnStartedAt).toBe(START_NOW);
    expect(r.events[0]!.payload).toMatchObject({ nextActivePlayerId: SELLER_ID });
  });

  it('rejects offers from the non-active player (NOT_YOUR_TURN)', () => {
    const { state } = startedMatch();
    const r = applyCommand(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(1), amountTenths: 600, now: START_NOW }, config);
    expect(mustFail(r).code).toBe('NOT_YOUR_TURN');
  });

  it('rejects offers on terminal matches (MATCH_NOT_ACTIVE)', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 700, now: START_NOW }, config);
    state = apply(state, { kind: 'ACCEPT', playerId: SELLER_ID, offerId: offerId(1), now: START_NOW }, config);
    const r = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(2), amountTenths: 800, now: START_NOW }, config);
    expect(mustFail(r).code).toBe('MATCH_NOT_ACTIVE');
  });
});

describe('GR-017 concession chips', () => {
  it('charges the config-driven cost on concessions (seller 80 -> 60 costs 5 chips under defaults)', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config);
    // Seller's opening (80) is free (GR-006).
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 800, now: START_NOW }, config);
    expect(byId(state, SELLER_ID).chipsSpent).toBe(0);
    // Buyer concedes 50 -> 55 (cost 3), seller concedes 80 -> 60 (cost 5).
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW }, config);
    const r = mustOk(applyCommand(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 600, now: START_NOW }, config));
    expect(byId(r.state, SELLER_ID).chipsSpent).toBe(5);
    expect(r.events[0]!.payload).toMatchObject({ concessionCostChips: 5, remainingConcessionChips: 95 });
  });

  it('rejects a concession that exceeds the remaining budget', () => {
    const tight = makeEconomyConfig({ concessionBudgetChips: 5 });
    let state = create({}, tight);
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, tight);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, tight);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, tight);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 800, now: START_NOW }, tight);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW }, tight);
    // Seller's 80 -> 50 concession costs 7 chips > 5 budget.
    const r = applyCommand(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 500, now: START_NOW }, tight);
    expect(mustFail(r).code).toBe('INSUFFICIENT_CONCESSION_CHIPS');
  });

  it('rejected offers leave chips and clock untouched', () => {
    const { state } = startedMatch();
    const before = structuredClone(state);
    const r = applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 1001, now: START_NOW + 5000 }, config);
    mustFail(r);
    expect(state).toEqual(before);
  });
});

describe('GR-010 acceptance', () => {
  function dealReady(now = START_NOW): MatchState {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now }, config);
    return state;
  }

  it('creates a deal only by explicit acceptance of the current standing offer', () => {
    let state = dealReady();
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 650, now: START_NOW + 1000 }, config);
    const r = mustOk(applyCommand(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(2), now: START_NOW + 2000 }, config));

    expect(r.state.status).toBe('DEAL');
    expect(r.state.settlementTenths).toBe(650);
    expect(r.state.completionReason).toBe('ACCEPTED');
    expect(r.state.activePlayerId).toBeNull();
    expect(r.state.turnStartedAt).toBeNull();
    expect(r.events.map((e) => e.type)).toEqual(['OFFER_ACCEPTED', 'MATCH_COMPLETED']);
    expect(r.state.economy?.ratedEligible).toBe(true);
    expect(r.state.economy?.buyerSurplusShare).toBeCloseTo((1000 - 650) / 600, 12);
    expect(r.state.economy?.sellerSurplusShare).toBeCloseTo((650 - 400) / 600, 12);
    expect(r.state.economy?.settlementTenths).toBe(650);
  });

  it('rejects acceptance of a superseded offer (OFFER_NOT_CURRENT)', () => {
    let state = dealReady();
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 650, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 600, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 625, now: START_NOW }, config);
    const r = applyCommand(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(2), now: START_NOW }, config);
    expect(mustFail(r).code).toBe('OFFER_NOT_CURRENT');
  });

  it('rejects acceptance when the opponent has no standing offer (OFFER_NOT_CURRENT)', () => {
    const { state } = startedMatch();
    const r = applyCommand(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(99), now: START_NOW }, config);
    expect(mustFail(r).code).toBe('OFFER_NOT_CURRENT');
  });

  it('rejects acceptance outside the accepting player’s RV (OFFER_NOT_ACCEPTABLE_BY_RESERVATION)', () => {
    // Buyer RV 100; seller (RV 40) offers 100.1 -> buyer cannot accept.
    let state = dealReady();
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 1001, now: START_NOW }, config);
    const r = applyCommand(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(2), now: START_NOW }, config);
    expect(mustFail(r).code).toBe('OFFER_NOT_ACCEPTABLE_BY_RESERVATION');
  });

  it('rejects acceptance when it is not your turn', () => {
    const { state } = startedMatch();
    const r = applyCommand(state, { kind: 'ACCEPT', playerId: SELLER_ID, offerId: offerId(1), now: START_NOW }, config);
    expect(mustFail(r).code).toBe('NOT_YOUR_TURN');
  });
});

describe('GR-011 crossed offers never auto-settle', () => {
  it('buyer 70 / seller 65 stays ACTIVE until explicit acceptance', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 700, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 650, now: START_NOW }, config);

    expect(state.status).toBe('ACTIVE');
    expect(state.settlementTenths).toBeNull();
    expect(state.activePlayerId).toBe(BUYER_ID);

    state = apply(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(2), now: START_NOW }, config);
    expect(state.status).toBe('DEAL');
    expect(state.settlementTenths).toBe(650);
  });
});

describe('GR-012 walk away', () => {
  it('ends the match as no deal with zero gross reward for both', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config);

    const r = mustOk(applyCommand(state, { kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 10_000 }, config));
    expect(r.state.status).toBe('NO_DEAL');
    expect(r.state.completionReason).toBe('WALKED_AWAY');
    expect(r.state.economy).not.toBeNull();
    for (const p of Object.values(r.state.economy!.players)) {
      expect(p.grossReward).toBe(0);
    }
    expect(r.state.economy!.buyerSurplusShare).toBeNull();
    expect(r.state.economy!.sellerSurplusShare).toBeNull();
    // GR-019: ranked walk-away matches remain rating-eligible (handling is OQ-005).
    expect(r.state.economy!.ratedEligible).toBe(true);
    expect(r.events.map((e) => e.type)).toEqual(['WALKED_AWAY', 'MATCH_COMPLETED']);
  });

  it('spent concession chips remain spent in match-economy accounting (GR-012)', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 800, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW }, config);
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 600, now: START_NOW }, config);
    state = apply(state, { kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW }, config);

    const seller = state.economy!.players[SELLER_ID]!;
    expect(seller.chipsSpent).toBe(5); // 80 -> 60 concession
    expect(seller.netResult).toBe(-5);
  });

  it('is not available when it is not your turn', () => {
    const { state } = startedMatch();
    const r = applyCommand(state, { kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW }, config);
    expect(mustFail(r).code).toBe('NOT_YOUR_TURN');
  });
});

describe('GR-013 chat', () => {
  it('does not transfer the turn or affect the clock', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'msg-1', body: 'I can move, but not much.', now: START_NOW + 5000 }, config));
    expect(r.state.activePlayerId).toBe(BUYER_ID);
    expect(r.state.turnStartedAt).toBe(START_NOW);
    expect(r.events[0]!.type).toBe('MESSAGE_SENT');
  });

  it('works for the non-active player and while paused', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW }, config);
    expect(state.status).toBe('PAUSED');
    state = apply(state, { kind: 'MESSAGE', playerId: SELLER_ID, messageId: 'msg-1', body: 'You there?', now: START_NOW }, config);
    expect(state.status).toBe('PAUSED');
  });

  it('rejects empty messages and chat after completion', () => {
    const { state } = startedMatch();
    expect(mustFail(applyCommand(state, { kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'm', body: '   ', now: START_NOW }, config)).code).toBe('MESSAGE_EMPTY');

    let done = create();
    done = apply(done, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    done = apply(done, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    done = apply(done, { kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW }, config);
    expect(mustFail(applyCommand(done, { kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'm', body: 'hi', now: START_NOW }, config)).code).toBe('MATCH_NOT_ACTIVE');
  });
});

describe('GR-015 disconnect / reconnect', () => {
  it('freezes the active player’s clock and pauses the match', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW + 10_000 }, config));
    expect(r.state.status).toBe('PAUSED');
    expect(r.state.turnStartedAt).toBeNull();
    expect(byId(r.state, BUYER_ID).cumulativeActiveMs).toBe(10_000);
    expect(r.events.map((e) => e.type)).toEqual(['PLAYER_DISCONNECTED', 'MATCH_PAUSED']);
  });

  it('does not pause the match when the non-active player disconnects', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'DISCONNECT', playerId: SELLER_ID, now: START_NOW }, config));
    expect(r.state.status).toBe('ACTIVE');
    expect(r.state.turnStartedAt).toBe(START_NOW);
    expect(r.events.map((e) => e.type)).toEqual(['PLAYER_DISCONNECTED']);
  });

  it('reconnection resumes the same player’s clock with unchanged ownership', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW + 10_000 }, config);
    state = apply(state, { kind: 'RECONNECT', playerId: BUYER_ID, now: START_NOW + 60_000 }, config);

    expect(state.status).toBe('ACTIVE');
    expect(state.activePlayerId).toBe(BUYER_ID);
    expect(state.turnStartedAt).toBe(START_NOW + 60_000);
    // The paused window (10s -> 60s) must not count as decision time.
    expect(byId(state, BUYER_ID).cumulativeActiveMs).toBe(10_000);
  });

  it('pauses immediately when the turn transfers to a disconnected player', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'DISCONNECT', playerId: SELLER_ID, now: START_NOW }, config);
    expect(state.status).toBe('ACTIVE'); // non-active disconnect does not pause

    const r = mustOk(applyCommand(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 5000 }, config));
    expect(r.state.status).toBe('PAUSED');
    expect(r.state.activePlayerId).toBe(SELLER_ID);
    expect(r.state.turnStartedAt).toBeNull();
    expect(r.events.map((e) => e.type)).toEqual(['OFFER_SUBMITTED', 'MATCH_PAUSED']);
  });

  it('double disconnect and reconnect are idempotent', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW }, config);
    const again = mustOk(applyCommand(state, { kind: 'DISCONNECT', playerId: BUYER_ID, now: START_NOW }, config));
    expect(again.events).toHaveLength(0);
    const back = mustOk(applyCommand(again.state, { kind: 'RECONNECT', playerId: BUYER_ID, now: START_NOW }, config));
    expect(back.state.status).toBe('ACTIVE');
    const backAgain = mustOk(applyCommand(back.state, { kind: 'RECONNECT', playerId: BUYER_ID, now: START_NOW }, config));
    expect(backAgain.events).toHaveLength(0);
  });
});

describe('technical abort', () => {
  it('aborts an active match with an audit event and never affects canonical rating (GR-019)', () => {
    const { state } = startedMatch();
    const r = mustOk(applyCommand(state, { kind: 'ABORT', now: START_NOW + 1000 }, config));
    expect(r.state.status).toBe('ABORTED');
    expect(r.state.completionReason).toBe('ABORTED');
    expect(r.state.economy?.ratedEligible).toBe(false);
    expect(r.events.map((e) => e.type)).toEqual(['MATCH_ABORTED']);
  });

  it('is a no-op after completion', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'WALK_AWAY', playerId: BUYER_ID, now: START_NOW }, config);
    const r = mustOk(applyCommand(state, { kind: 'ABORT', now: START_NOW + 1 }, config));
    expect(r.events).toHaveLength(0);
    expect(r.state.status).toBe('NO_DEAL');
  });
});

describe('clock accounting across a full deal', () => {
  it('accumulates only the owner’s active segments and derives final multipliers', () => {
    let state = create();
    state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
    state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);

    // Buyer thinks 10s, opens at 50.
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 10_000 }, config);
    // Seller thinks 20s, opens at 70.
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 700, now: START_NOW + 30_000 }, config);
    // Buyer thinks 5s, concedes to 55 (cost 3).
    state = apply(state, { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW + 35_000 }, config);
    // Seller thinks 5s, concedes to 60 (cost 4)… buyer accepts at 60? No — seller concedes, buyer then accepts.
    state = apply(state, { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(4), amountTenths: 600, now: START_NOW + 40_000 }, config);
    // Buyer thinks 5s and accepts the seller's 60.
    state = apply(state, { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(4), now: START_NOW + 45_000 }, config);

    const buyer = state.economy!.players[BUYER_ID]!;
    const seller = state.economy!.players[SELLER_ID]!;
    expect(buyer.cumulativeActiveMs).toBe(20_000); // 10s + 5s + 5s
    expect(seller.cumulativeActiveMs).toBe(25_000); // 20s + 5s
    expect(buyer.clockMultiplier).toBeCloseTo(1 - 0.7 * (20_000 / config.clockFloorMs), 12);
    expect(seller.clockMultiplier).toBeCloseTo(1 - 0.7 * (25_000 / config.clockFloorMs), 12);

    // Settlement 60 with seller RV 40 / buyer RV 100: seller share 1/3, buyer 2/3.
    expect(seller.grossReward).toBeCloseTo(100 * (1 / 3) * seller.clockMultiplier, 12);
    expect(buyer.grossReward).toBeCloseTo(100 * (2 / 3) * buyer.clockMultiplier, 12);
    // Buyer spent 3 chips (50 -> 55), seller 4 chips (70 -> 60).
    expect(buyer.chipsSpent).toBe(3);
    expect(seller.chipsSpent).toBe(4);
    expect(seller.netResult).toBeCloseTo(seller.grossReward - 4, 12);
    expect(buyer.netResult).toBeCloseTo(buyer.grossReward - 3, 12);
  });
});

describe('determinism', () => {
  it('same input state + command sequence + config yields identical state and events', () => {
    const run = (): unknown => {
      // Fixed matchId so the fixture counter cannot leak into the comparison.
      const created = mustOk(createMatch(makeInput({ matchId: 'determinism-match' }), config));
      let state = created.state;
      state = apply(state, { kind: 'READY', playerId: BUYER_ID, now: START_NOW }, config);
      state = apply(state, { kind: 'READY', playerId: SELLER_ID, now: START_NOW }, config);
      const commands: DomainCommand[] = [
        { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 1000 },
        { kind: 'MESSAGE', playerId: SELLER_ID, messageId: 'm1', body: 'Hello', now: START_NOW + 1500 },
        { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 600, now: START_NOW + 2000 },
        { kind: 'ACCEPT', playerId: BUYER_ID, offerId: offerId(2), now: START_NOW + 2500 },
      ];
      const events = [];
      for (const command of commands) {
        const r = mustOk(applyCommand(state, command, config));
        state = r.state;
        events.push(r.events);
      }
      return { state, events };
    };
    expect(run()).toEqual(run());
  });

  it('event sequences are strictly monotonic across a full flow', () => {
    const { state } = startedMatch();
    const commands: DomainCommand[] = [
      { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(1), amountTenths: 500, now: START_NOW + 1000 },
      { kind: 'OFFER', playerId: SELLER_ID, offerId: offerId(2), amountTenths: 600, now: START_NOW + 2000 },
      { kind: 'MESSAGE', playerId: BUYER_ID, messageId: 'm1', body: 'thoughts?', now: START_NOW + 2500 },
      { kind: 'OFFER', playerId: BUYER_ID, offerId: offerId(3), amountTenths: 550, now: START_NOW + 3000 },
      { kind: 'ACCEPT', playerId: SELLER_ID, offerId: offerId(3), now: START_NOW + 4000 },
    ];
    let s = state;
    let last = 0;
    for (const command of commands) {
      const r = mustOk(applyCommand(s, command, config));
      for (const e of r.events) {
        expect(e.sequence).toBeGreaterThan(last);
        last = e.sequence;
      }
      s = r.state;
    }
    expect(s.eventSequence).toBe(last);
  });
});
