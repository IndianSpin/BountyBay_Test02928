/**
 * Registry invariants (P1-M1): versioned, exactly five personas with unique
 * keys, handle-pattern-safe identities, sane parameter ranges, and agent
 * resolution for every key.
 */

import { makeEconomyConfig } from '@bounty-bay/config';
import { describe, expect, it } from 'vitest';
import { AI_PERSONAS, AI_PERSONAS_VERSION, assertRegistryValid, resolveAgent } from '../src/registry';

describe('persona registry', () => {
  it('is versioned and self-validating', () => {
    expect(AI_PERSONAS_VERSION).toMatch(/^ai-personas-\d+\.\d+\.\d+$/);
    expect(() => assertRegistryValid()).not.toThrow();
  });

  it('contains exactly the five P1 personas with unique keys and valid handles', () => {
    expect(AI_PERSONAS.map((p) => p.key)).toEqual(['anchor', 'grinder', 'closer', 'wall', 'mirror']);
    for (const persona of AI_PERSONAS) {
      expect(persona.handle).toMatch(/^[A-Za-z0-9_-]{3,16}$/);
      expect(persona.displayName).toBeTruthy();
      expect(persona.blurb).toBeTruthy();
    }
  });

  it('keeps persona parameters in sane ranges', () => {
    for (const persona of AI_PERSONAS) {
      expect(persona.thinkRangeMs[0]).toBeGreaterThanOrEqual(0);
      expect(persona.thinkRangeMs[1]).toBeGreaterThanOrEqual(persona.thinkRangeMs[0]);
      expect(persona.chatProbability).toBeGreaterThanOrEqual(0);
      expect(persona.chatProbability).toBeLessThanOrEqual(1);
      expect(persona.strategy.walkProbability).toBeGreaterThanOrEqual(0);
      expect(persona.strategy.walkProbability).toBeLessThanOrEqual(1);
      expect(persona.chatLines.length).toBeGreaterThan(0);
    }
  });

  it('resolves an agent for every key', () => {
    const config = makeEconomyConfig();
    for (const persona of AI_PERSONAS) {
      const agent = resolveAgent(persona.key, config);
      expect(agent.personaKey).toBe(persona.key);
    }
  });
});
