/** Deterministic per-match AI entropy (mulberry32). Not game information. */

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

/** Stable per-match seed: same matchId + persona ⇒ the same decision stream across restarts. */
export function matchSeed(matchId: string, personaKey: string): number {
  let hash = 2166136261;
  for (const ch of `${matchId}:${personaKey}`) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
