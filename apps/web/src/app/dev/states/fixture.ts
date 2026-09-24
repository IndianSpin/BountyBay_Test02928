import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * BB-265: loads design-sandbox/golden/fixture/reference-match.json —
 * the one reference match every golden state renders from ("Same
 * data" rule: the dev pages never fabricate their own). Server-only,
 * dev-only.
 */

export interface ReferenceFixture {
  asset: { name: string; image: string };
  me: { handle: string; role: 'buyer' | 'seller'; character: string; rating: number; reservationValue: number };
  opponent: { handle: string; role: 'buyer' | 'seller'; character: string; rating: number; reservationValue: number; deals: number };
  result: {
    settlement: number;
    zopa: number;
    share: { me: number; opponent: number };
    clockMultiplier: { me: number; opponent: number };
    timeUsed: { me: string; opponent: string };
    chipsSpent: { me: number; opponent: number };
    bounty: { match: number; gross: number; net: number };
    rating: { from: number; to: number; delta: number };
    rematch: { line: string; windowSec: number };
  };
}

export async function loadReferenceFixture(): Promise<ReferenceFixture> {
  const candidates = [
    path.resolve(process.cwd(), '../../design-sandbox/golden/fixture/reference-match.json'),
    path.resolve(process.cwd(), 'design-sandbox/golden/fixture/reference-match.json'),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(await readFile(candidate, 'utf8')) as ReferenceFixture;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('golden fixture not found (design-sandbox/golden/fixture/reference-match.json)');
}
