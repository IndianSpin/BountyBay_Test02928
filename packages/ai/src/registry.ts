/**
 * Persona registry (DEC-025). Config-driven and versioned so historical
 * matches remain attributable. Persona parameters live in code for M1,
 * mirroring DEFAULT_ECONOMY_CONFIG; behavioral tuning without deploys
 * would move them to versioned DB rows (recorded in the docs/16 P1
 * section).
 */

import type { EconomyConfig } from '@bounty-bay/config';
import { createPersonaAgent } from './personas';
import type { OpponentAgent, PersonaConfig, PersonaKey } from './types';

export const AI_PERSONAS_VERSION = 'ai-personas-0.1.0';

/** Same pattern the API enforces for human handles. */
const HANDLE_PATTERN = /^[A-Za-z0-9_-]{3,16}$/;

export const AI_PERSONAS: readonly PersonaConfig[] = [
  {
    key: 'anchor',
    displayName: 'The Anchor',
    handle: 'TheAnchor',
    blurb: 'Opens hard and digs in. Cheap only by accident.',
    thinkRangeMs: [1500, 3000],
    chatProbability: 0.3,
    chatLines: ['My price is my price.', 'I name the terms.', 'Come back with something serious.'],
    strategy: {
      opening: { buyerFraction: 0.02, sellerMultiplier: 5000 },
      concessionFraction: 0.12,
      acceptThreshold: { buyer: 0.65, seller: 1.4 },
      walkProbability: 0.08,
    },
  },
  {
    key: 'grinder',
    displayName: 'The Grinder',
    handle: 'TheGrinder',
    blurb: 'Moves a sliver at a time. Wears you down.',
    thinkRangeMs: [2500, 4000],
    chatProbability: 0.35,
    chatLines: ['Every tenth counts.', 'A little more... a little less...', 'Patience pays.'],
    strategy: {
      opening: { buyerFraction: 0.5, sellerMultiplier: 1.5 },
      concessionFraction: 0.05,
      acceptThreshold: { buyer: 1.0, seller: 1.0 },
      walkProbability: 0.02,
    },
  },
  {
    key: 'closer',
    displayName: 'The Closer',
    handle: 'TheCloser',
    blurb: 'Wants the deal signed before the tide turns.',
    thinkRangeMs: [800, 1800],
    chatProbability: 0.4,
    chatLines: ["We're close. Closer.", "Let's finish this.", 'Done by dusk?'],
    strategy: {
      opening: { buyerFraction: 0.85, sellerMultiplier: 1.15 },
      concessionFraction: 0.35,
      acceptThreshold: { buyer: 0.95, seller: 1.0 },
      walkProbability: 0.0,
    },
  },
  {
    key: 'wall',
    displayName: 'The Wall',
    handle: 'TheWall',
    blurb: 'Barely moves. Pays only on its own terms.',
    thinkRangeMs: [1800, 3500],
    chatProbability: 0.25,
    chatLines: ['Still no.', 'Not enough.', 'I can wait.'],
    strategy: {
      opening: { buyerFraction: 0.3, sellerMultiplier: 1.6 },
      concessionFraction: 0.02,
      acceptThreshold: { buyer: 0.75, seller: 1.3 },
      walkProbability: 0.05,
    },
  },
  {
    key: 'mirror',
    displayName: 'The Mirror',
    handle: 'TheMirror',
    blurb: 'Matches your movement. Courteous and deadly.',
    thinkRangeMs: [1200, 2500],
    chatProbability: 0.3,
    chatLines: ['Your pace, my pace.', 'Move for move.', 'I follow your lead.'],
    strategy: {
      opening: { buyerFraction: 0.6, sellerMultiplier: 1.3 },
      concessionFraction: 'reciprocal',
      acceptThreshold: { buyer: 1.0, seller: 1.0 },
      walkProbability: 0.02,
    },
  },
];

let validated = false;

/** Cheap self-check; runs once before the first agent resolution. */
export function assertRegistryValid(): void {
  if (validated) return;
  const keys = new Set<string>();
  for (const persona of AI_PERSONAS) {
    if (keys.has(persona.key)) throw new Error(`duplicate persona key: ${persona.key}`);
    keys.add(persona.key);
    if (!HANDLE_PATTERN.test(persona.handle)) {
      throw new Error(`persona handle violates the handle pattern: ${persona.handle}`);
    }
    const [min, max] = persona.thinkRangeMs;
    if (min < 0 || max < min) throw new Error(`persona think range invalid: ${persona.key}`);
    if (persona.chatProbability < 0 || persona.chatProbability > 1) {
      throw new Error(`persona chat probability invalid: ${persona.key}`);
    }
    if (persona.strategy.walkProbability < 0 || persona.strategy.walkProbability > 1) {
      throw new Error(`persona walk probability invalid: ${persona.key}`);
    }
  }
  validated = true;
}

export function personaByKey(key: string): PersonaConfig | undefined {
  return AI_PERSONAS.find((persona) => persona.key === key);
}

export function resolveAgent(personaKey: PersonaKey, config: EconomyConfig): OpponentAgent {
  assertRegistryValid();
  const persona = personaByKey(personaKey);
  if (!persona) throw new Error(`unknown persona: ${personaKey}`);
  return createPersonaAgent(persona, config);
}
