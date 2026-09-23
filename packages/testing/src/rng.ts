/**
 * Deterministic RNG for tests, fixtures, and the simulator.
 *
 * The domain package draws no randomness internally (GR-005 first-mover
 * selection is a server concern); tests and the simulator inject it here.
 */

/** mulberry32 — small, fast, deterministic 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  (): number;
}

/** UUID-shaped id generator for fixtures (deterministic given a seed). */
export function idFactory(seed = 1): () => string {
  const rng = mulberry32(seed);
  let counter = 0;
  return () => {
    counter += 1;
    const hex = Math.floor(rng() * 0xffffffff).toString(16).padStart(8, '0');
    return `00000000-0000-4000-8000-${hex}${String(counter).padStart(4, '0')}`;
  };
}
