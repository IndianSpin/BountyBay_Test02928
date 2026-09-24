/**
 * DD-M3 (GR-028): verified-information reveals. A reveal is a formal game
 * action — only the active player may reveal, only facts in their OWN
 * verifiable set, reveals are immutable once made, they consume the turn,
 * and they are subject to the GR-023 hard decision-time guard. Unrevealed
 * fact ids stay hidden from every projection (SI-001); the revealed set is
 * shared and replay-reconstructable.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { applyCommand, createMatch, replayMatch, viewMatchFor, type DomainEvent } from '../src';
import { BUYER_ID, byId, makeInput, mustFail, mustOk, SELLER_ID, startedMatch } from './helpers';

function revealCmd(playerId: string, factId: string, now = 1_000_100) {
  return { kind: 'REVEAL' as const, playerId, factId, now };
}

describe('REVEAL (DD-M3, GR-028)', () => {
  it('a verifiable fact is revealed once, consuming the turn and emitting FACT_REVEALED', () => {
    const { state, config } = startedMatch(); // first mover: BUYER_ID
    const result = mustOk(applyCommand(state, revealCmd(BUYER_ID, 'fact-b1'), config));
    expect(result.state.status).toBe('ACTIVE');
    expect(byId(result.state, BUYER_ID).revealedFactIds).toEqual(['fact-b1']);
    expect(result.state.activePlayerId).toBe(SELLER_ID); // the reveal spent the move
    const event = result.events.find((e) => e.type === 'FACT_REVEALED')!;
    expect(event.actorPlayerId).toBe(BUYER_ID);
    expect(event.payload.factId).toBe('fact-b1');
  });

  it('rejects reveals of facts outside the player’s verifiable set (REVEAL_NOT_VERIFIABLE)', () => {
    const { state, config } = startedMatch();
    const result = mustFail(applyCommand(state, revealCmd(BUYER_ID, 'fact-s1'), config)); // the seller's fact
    expect(result.code).toBe('REVEAL_NOT_VERIFIABLE');
  });

  it('rejects a second reveal of the same fact (REVEAL_ALREADY_MADE) and never mutates', () => {
    const { state, config } = startedMatch();
    const first = mustOk(applyCommand(state, revealCmd(BUYER_ID, 'fact-b1'), config));
    // The opponent cannot reveal the buyer's fact (not in their verifiable set).
    const stolen = mustFail(applyCommand(first.state, revealCmd(SELLER_ID, 'fact-b1'), config));
    expect(stolen.code).toBe('REVEAL_NOT_VERIFIABLE');
    // The owner cannot reveal it twice — immutable once made. (The reveal
    // spent the buyer's move; give the turn back via a seller reveal.)
    const backToBuyer = mustOk(applyCommand(first.state, revealCmd(SELLER_ID, 'fact-s1'), config)).state;
    const repeat = mustFail(applyCommand(backToBuyer, revealCmd(BUYER_ID, 'fact-b1'), config));
    expect(repeat.code).toBe('REVEAL_ALREADY_MADE');
    expect(byId(backToBuyer, BUYER_ID).revealedFactIds).toEqual(['fact-b1']);
    expect(byId(backToBuyer, SELLER_ID).revealedFactIds).toEqual(['fact-s1']);
  });

  it('is turn-gated and ACTIVE-only (NOT_YOUR_TURN / MATCH_NOT_ACTIVE)', () => {
    const { state, config } = startedMatch();
    const notYourTurn = mustFail(applyCommand(state, revealCmd(SELLER_ID, 'fact-s1'), config));
    expect(notYourTurn.code).toBe('NOT_YOUR_TURN');

    // CREATED (pre-start) refuses reveals.
    const preStart = mustOk(createMatch(makeInput(), config)).state;
    const beforeReady = mustFail(applyCommand(preStart, revealCmd(BUYER_ID, 'fact-b1'), config));
    expect(beforeReady.code).toBe('MATCH_NOT_ACTIVE');

    // Terminal states refuse reveals (deal at the seller's RV 40.0).
    let terminal = state;
    terminal = mustOk(
      applyCommand(terminal, { kind: 'OFFER', playerId: BUYER_ID, offerId: 'o1', amountTenths: 400, now: 1_000_100 }, config),
    ).state;
    terminal = mustOk(applyCommand(terminal, { kind: 'ACCEPT', playerId: SELLER_ID, offerId: 'o1', now: 1_000_200 }, config)).state;
    const afterDeal = mustFail(applyCommand(terminal, revealCmd(BUYER_ID, 'fact-b1'), config));
    expect(afterDeal.code).toBe('MATCH_NOT_ACTIVE');
  });

  it('is subject to the GR-023 hard decision-time guard (TIMED_OUT after the limit)', () => {
    // Buyer reveals at t=0 (legal), handing the turn to the seller.
    const { state, config } = startedMatch({}, makeEconomyConfig(), 0);
    const afterBuyer = mustOk(applyCommand(state, revealCmd(BUYER_ID, 'fact-b1', 0), config)).state;
    // The seller's turn started at 0; the guard fires once elapsed >= limit.
    const expired = mustFail(applyCommand(afterBuyer, revealCmd(SELLER_ID, 'fact-s1', 90_000), config));
    expect(expired.code).toBe('TIMED_OUT');
    // Boundary: 89_999 ms is still inside the budget.
    const atLimit = mustOk(applyCommand(afterBuyer, revealCmd(SELLER_ID, 'fact-s1', 89_999), config));
    expect(byId(atLimit.state, SELLER_ID).revealedFactIds).toEqual(['fact-s1']);
  });

  it('is inert under legacy configs without a decision-time limit', () => {
    const legacy = makeEconomyConfig({ hardDecisionTimeLimitMs: undefined });
    const { state, config } = startedMatch({}, legacy, 0);
    const ok = mustOk(applyCommand(state, revealCmd(BUYER_ID, 'fact-b1', 1_000_000_000), config));
    expect(ok.state.status).toBe('ACTIVE');
  });

  it('both players can reveal their own facts across turns (boundary: last fact)', () => {
    const { state, config } = startedMatch({
      buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: ['b1', 'b2'] },
      seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 400, verifiableFactIds: ['s1', 's2'] },
    });
    let s = state;
    s = mustOk(applyCommand(s, revealCmd(BUYER_ID, 'b1'), config)).state;
    s = mustOk(applyCommand(s, revealCmd(SELLER_ID, 's1'), config)).state;
    s = mustOk(applyCommand(s, revealCmd(BUYER_ID, 'b2'), config)).state;
    expect(byId(s, BUYER_ID).revealedFactIds).toEqual(['b1', 'b2']);
    expect(byId(s, SELLER_ID).revealedFactIds).toEqual(['s1']);
  });

  it('the projection exposes revealed ids to both players but never the unrevealed verifiable set (SI-001)', () => {
    const { state, config } = startedMatch();
    const revealed = mustOk(applyCommand(state, revealCmd(BUYER_ID, 'fact-b1'), config)).state;

    const sellerView = viewMatchFor(revealed, SELLER_ID, 1_000_200, config);
    const serializedBuyerView = JSON.stringify(viewMatchFor(revealed, BUYER_ID, 1_000_200, config));
    const serializedSellerView = JSON.stringify(sellerView);

    // The opponent sees the buyer's revealed fact id…
    expect(sellerView.participants.find((p) => p.playerId === BUYER_ID)!.revealedFactIds).toEqual(['fact-b1']);
    // …but the unrevealed verifiable id list is never serialized anywhere.
    expect(serializedSellerView).not.toContain('"verifiableFactIds"');
    expect(serializedBuyerView).not.toContain('"verifiableFactIds"');
    // The seller's verifiable id (unrevealed) never appears in either view.
    expect(serializedSellerView).not.toContain('fact-s1');
    expect(serializedBuyerView).not.toContain('fact-s1');
    // The buyer sees their own revealed id.
    expect(serializedBuyerView).toContain('fact-b1');
  });

  it('replays a stream with FACT_REVEALED to the identical state and events', () => {
    const input = makeInput({
      buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: ['fact-b1', 'fact-b2'] },
      seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 400, verifiableFactIds: ['fact-s1'] },
    });
    const config = makeEconomyConfig();
    // Build the FULL stored stream from creation: ready ×2, then reveals.
    const commands = [
      { kind: 'READY' as const, playerId: BUYER_ID, now: 1_000_000 },
      { kind: 'READY' as const, playerId: SELLER_ID, now: 1_000_000 },
      revealCmd(BUYER_ID, 'fact-b1', 1_000_100),
      revealCmd(SELLER_ID, 'fact-s1', 1_000_200),
      revealCmd(BUYER_ID, 'fact-b2', 1_000_300),
    ];
    let s = mustOk(createMatch(input, config)).state;
    const stored: DomainEvent[] = [];
    for (const command of commands) {
      const result = mustOk(applyCommand(s, command, config));
      s = result.state;
      for (const event of result.events) {
        stored.push({ sequence: stored.length + 1, type: event.type, at: event.at, actorPlayerId: event.actorPlayerId, payload: event.payload });
      }
    }
    const replayed = replayMatch(input, config, stored);
    expect(replayed.state).toEqual(s);
    expect(replayed.replayedEvents.map((e) => e.type)).toEqual(stored.map((e) => e.type));
  });

  it('rejects invalid verifiable fact ids at match creation', () => {
    const config = makeEconomyConfig();
    const dup = mustFail(
      createMatch(
        makeInput({ buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: ['x', 'x'] } }),
        config,
      ),
    );
    expect(dup.code).toBe('INVALID_MATCH_INPUT');
    const blank = mustFail(
      createMatch(
        makeInput({ buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1000, verifiableFactIds: [''] } }),
        config,
      ),
    );
    expect(blank.code).toBe('INVALID_MATCH_INPUT');
  });
});
