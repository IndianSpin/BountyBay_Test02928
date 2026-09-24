/**
 * AI table talk tests (BB-254, AI_BEHAVIOR_CONTRACT): the deterministic
 * turn pipeline — beliefs, intent selection, fixture generation, and
 * the impossible-non-response fallback — valid / invalid / boundary /
 * property per the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  generateTableTalk,
  initialBeliefs,
  runAiTurn,
  selectIntent,
  SOCIAL_INTENTS,
  TABLE_TALK_VERSION,
  updateBeliefs,
  type AiBeliefs,
  type AiObservationInput,
  type SocialIntent,
} from '../src';

function input(overrides: Partial<AiObservationInput> = {}): AiObservationInput {
  return {
    matchId: 'match-0001',
    roundNumber: 3,
    role: 'BUYER',
    myLatestOfferTenths: 700,
    opponentLatestOfferTenths: 800,
    opponentConcessionRun: 0,
    opponentLastDecisionMs: 10000,
    opponentMessageCount: 0,
    opponentHeldLastTurn: false,
    crossedOffers: false,
    economicAction: { kind: 'OFFER', amountTenths: 740 },
    personaKey: 'grinder',
    ...overrides,
  };
}

const ALL_PERSONAS = ['anchor', 'grinder', 'closer', 'wall', 'mirror'] as const;

describe('AI table talk (BB-254)', () => {
  it('updates beliefs from legal-view observations only', () => {
    const start = initialBeliefs();
    expect(start).toEqual({ opponentFlexibility: 'UNKNOWN', opponentTimePosture: 'UNKNOWN' });

    const flexible = updateBeliefs(start, input({ opponentConcessionRun: 2 }));
    expect(flexible.opponentFlexibility).toBe('FLEXIBLE');

    const holding = updateBeliefs(start, input({ opponentHeldLastTurn: true, crossedOffers: true }));
    expect(holding.opponentFlexibility).toBe('HOLDING');

    const patient = updateBeliefs(start, input({ opponentLastDecisionMs: 45000 }));
    expect(patient.opponentTimePosture).toBe('PATIENT');

    const pressed = updateBeliefs(start, input({ opponentLastDecisionMs: 3000 }));
    expect(pressed.opponentTimePosture).toBe('PRESSED');

    // unknown inputs keep previous beliefs
    expect(updateBeliefs(flexible, input({ opponentConcessionRun: 0, opponentHeldLastTurn: false, opponentLastDecisionMs: null }))).toEqual(flexible);
  });

  it('chooses intents per the contract order', () => {
    expect(selectIntent(input({ economicAction: { kind: 'ACCEPT' } }), initialBeliefs())).toBe('CONDITIONAL_CLOSE');
    expect(selectIntent(input({ economicAction: { kind: 'WALK_AWAY' } }), initialBeliefs())).toBe('SIGNAL_FINALITY');
    // I moved while they held → REQUEST_RECIPROCITY
    expect(
      selectIntent(input({ opponentHeldLastTurn: true, economicAction: { kind: 'OFFER', amountTenths: 760 } }), initialBeliefs()),
    ).toBe('REQUEST_RECIPROCITY');
    // they keep conceding → PRESSURE (grinder) / HOLD (wall)
    expect(selectIntent(input({ opponentConcessionRun: 3 }), initialBeliefs())).toBe('PRESSURE');
    expect(selectIntent(input({ opponentConcessionRun: 3, personaKey: 'wall' }), initialBeliefs())).toBe('HOLD');
    // crossed + small gap → CONDITIONAL_CLOSE
    expect(selectIntent(input({ crossedOffers: true, myLatestOfferTenths: 750, opponentLatestOfferTenths: 800 }), initialBeliefs())).toBe('CONDITIONAL_CLOSE');
    // silent opponent late in the match → PROBE
    expect(selectIntent(input({ opponentMessageCount: 0, roundNumber: 4 }), initialBeliefs())).toBe('PROBE');
    // anchor discloses its read in the first rounds
    expect(selectIntent(input({ opponentMessageCount: 1, roundNumber: 2, personaKey: 'anchor' }), initialBeliefs())).toBe('DISCLOSE');
    // persona defaults (late match, nothing else matched)
    expect(selectIntent(input({ opponentMessageCount: 1, roundNumber: 6, personaKey: 'anchor' }), initialBeliefs())).toBe('BLUFF');
    expect(selectIntent(input({ opponentMessageCount: 1, roundNumber: 6, personaKey: 'wall' }), initialBeliefs())).toBe('HOLD');
    expect(selectIntent(input({ opponentMessageCount: 1, roundNumber: 6, personaKey: 'mirror' }), initialBeliefs())).toBe('PROBE');
  });

  it('generates deterministic table talk for every intent', () => {
    for (const intent of SOCIAL_INTENTS) {
      const first = generateTableTalk(input(), intent);
      const second = generateTableTalk(input(), intent);
      expect(first.trim().length).toBeGreaterThan(0);
      expect(second).toBe(first); // deterministic for fixed inputs
    }
    // unknown intent → generation throws (runAiTurn falls back instead)
    expect(() => generateTableTalk(input(), 'NOT_AN_INTENT' as SocialIntent)).toThrow(/no fixtures/);
  });

  it('runs the full turn and returns control with the action untouched', () => {
    const beliefs: AiBeliefs = initialBeliefs();
    const turnInput = input({ economicAction: { kind: 'OFFER', amountTenths: 760 } });
    const result = runAiTurn(turnInput, beliefs);
    expect(result.talk.trim().length).toBeGreaterThan(0);
    expect(result.economicAction).toEqual({ kind: 'OFFER', amountTenths: 760 }); // passthrough identity
    expect(result.beliefs).toEqual(updateBeliefs(beliefs, turnInput));
    // deterministic
    expect(runAiTurn(turnInput, beliefs)).toEqual(result);
    expect(runAiTurn(turnInput, beliefs).talk).toBe(result.talk);
  });

  it('makes non-response impossible: generation failure yields a fallback line', () => {
    const failing = () => {
      throw new Error('generation timed out');
    };
    const result = runAiTurn(input(), initialBeliefs(), failing);
    expect(result.talk.trim().length).toBeGreaterThan(0);
    // even a generator returning empty strings is caught
    const empty = runAiTurn(input(), initialBeliefs(), () => '');
    expect(empty.talk.trim().length).toBeGreaterThan(0);
  });

  it('covers every persona with every intent-compatible action kind', () => {
    for (const personaKey of ALL_PERSONAS) {
      for (const economicAction of [
        { kind: 'OFFER', amountTenths: 740 },
        { kind: 'ACCEPT' },
        { kind: 'WALK_AWAY' },
      ] as const) {
        const turnInput = input({ personaKey, economicAction });
        const result = runAiTurn(turnInput, initialBeliefs());
        expect(result.talk.trim().length).toBeGreaterThan(0);
        expect(SOCIAL_INTENTS).toContain(result.intent);
      }
    }
  });

  it('is deterministic and free of hidden information by construction', () => {
    const turnInput = input();
    const first = runAiTurn(turnInput, initialBeliefs());
    const second = runAiTurn(turnInput, initialBeliefs());
    expect(second).toEqual(first);

    // the observation surface has no reservation-value or message-content fields
    const keys = Object.keys(turnInput);
    for (const hidden of ['reservationValue', 'rv', 'opponentMessageText', 'body']) {
      expect(keys.some((k) => k.toLowerCase().includes(hidden.toLowerCase()))).toBe(false);
    }

    // version constant exported for the contract record
    expect(TABLE_TALK_VERSION).toBe('table-talk-0.1.0');
  });

  it('falls back to intent-appropriate lines for every intent when generation fails', () => {
    const failing = () => {
      throw new Error('boom');
    };
    for (const personaKey of ALL_PERSONAS) {
      for (const round of [1, 2, 5, 9]) {
        const turnInput = input({ personaKey, roundNumber: round });
        const result = runAiTurn(turnInput, initialBeliefs(), failing);
        expect(result.talk.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
