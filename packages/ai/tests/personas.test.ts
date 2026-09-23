/**
 * Persona legality + lifecycle (P1-M1): every persona negotiates every
 * persona in both roles through the same domain path as humans. A single
 * illegal intent throws inside driveDuel — a green suite means all five
 * personas never emit an illegal move across the full matrix, every match
 * reaches a terminal state, and replay reproduces each one exactly.
 */

import { describe, expect, it } from 'vitest';
import { AI_PERSONAS } from '../src/registry';
import { driveDuel } from './helpers';

const SEEDS = [11, 222, 3333];

describe('persona matrix', () => {
  it.each(AI_PERSONAS.map((p) => [p.key] as const))('%s self-play reaches a terminal state', (key) => {
    for (const seed of SEEDS) {
      const result = driveDuel(key, key, seed);
      expect(result.outcome, `seed ${seed}`).not.toBe('UNFINISHED');
    }
  });

  it('every persona pair (both roles) reaches a terminal state with legal moves only', () => {
    for (const a of AI_PERSONAS) {
      for (const b of AI_PERSONAS) {
        for (const seed of SEEDS) {
          const result = driveDuel(a.key, b.key, seed);
          expect(result.outcome, `${a.key} vs ${b.key} seed ${seed}`).not.toBe('UNFINISHED');
        }
      }
    }
  });
});
