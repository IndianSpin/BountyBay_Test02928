/**
 * Hidden-information guarantee (GR-002/GR-018, SI-001): the AgentContext —
 * the only input a persona receives — is built from viewMatchFor, so the
 * opponent's RV is structurally absent pre-terminal. This suite pins that
 * with a string scan of the serialized context, plus the persona actually
 * deciding on it.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { applyCommand, createMatch, viewMatchFor, type CreateMatchInput, type DomainCommand } from '@bounty-bay/domain';
import { describe, expect, it } from 'vitest';
import { resolveAgent } from '../src/registry';
import { matchSeed, mulberry32 } from '../src/rng';
import { BUYER_ID, mustOk, SELLER_ID, START_NOW } from './helpers';

/** Distinctive RVs: buyer 1234 tenths (123.4), seller 567 (56.7) — values that never legitimately appear in offers or timestamps. */
function activeContext(seed: number) {
  const config = makeEconomyConfig();
  const input: CreateMatchInput = {
    matchId: `ai-hidden-${seed}`,
    mode: 'AI',
    scenarioId: 'scenario-0001',
    scenarioVersion: 1,
    gameRulesVersion: 'game-rules-0.1.0',
    economyConfigVersion: 'economy-0.1.0',
    ratingVersion: null,
    buyer: { playerId: BUYER_ID, role: 'BUYER', reservationValueTenths: 1234 },
    seller: { playerId: SELLER_ID, role: 'SELLER', reservationValueTenths: 567 },
    firstPlayerId: BUYER_ID,
    createdAt: START_NOW,
  };

  let state = mustOk(createMatch(input, config)).state;
  const commit = (command: DomainCommand) => {
    state = mustOk(applyCommand(state, command, config)).state;
  };
  commit({ kind: 'READY', playerId: BUYER_ID, now: START_NOW });
  commit({ kind: 'READY', playerId: SELLER_ID, now: START_NOW });
  // buyer opens below own RV (100.0) — the seller's turn; mid-match
  commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: 'offer-0001', amountTenths: 1000, now: START_NOW + 1000 });

  return { state, config, now: START_NOW + 2000 };
}

describe('agent context hidden information', () => {
  it('never exposes the opponent RV to a persona pre-terminal', () => {
    const { state, config, now } = activeContext(42);
    const context = {
      view: viewMatchFor(state, SELLER_ID, now, config),
      now,
      rng: mulberry32(matchSeed(state.matchId, 'closer')),
      chatAllowed: true,
    };

    // structural: the buyer's entry carries no RV key pre-result
    const buyerEntry = context.view.participants.find((p) => p.playerId === BUYER_ID)!;
    expect(buyerEntry.reservationValueTenths).toBeUndefined();

    // string scan: the buyer RV (1234) appears nowhere in the serialized context
    expect(JSON.stringify(context)).not.toContain('1234');

    // the persona decides from this context alone — and takes the crossing deal
    const agent = resolveAgent('closer', config);
    const decision = agent.decide(context);
    expect(decision).toEqual({ kind: 'ACCEPT', offerId: 'offer-0001' });
  });

  it('reveals the opponent RV post-terminal (GR-018)', () => {
    const { state, config } = activeContext(43);
    const walked = mustOk(applyCommand(state, { kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 2000 }, config)).state;
    expect(walked.status).toBe('NO_DEAL');

    const terminalView = viewMatchFor(walked, SELLER_ID, START_NOW + 3000, config);
    const terminalBuyer = terminalView.participants.find((p) => p.playerId === BUYER_ID)!;
    expect(terminalBuyer.reservationValueTenths).toBe(1234);
  });
});
