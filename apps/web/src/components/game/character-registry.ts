/**
 * Cast character presentation registry (BB-225, CAST-* boards): every
 * opponent — AI persona or human — gets the character-first treatment
 * (DESIGN_ACCEPTANCE rule 2). Key-state poses per character:
 * idle · thinking · speaking · offer · smug · offline.
 *
 * Three source kinds:
 *   - files: per-state SVGs (GoldenOtter v4 — the BB-216 system)
 *   - sheet: one 15-cell 9000×900 sprite (600px cells; a cell per state
 *     — the cast-v2 sheets, same rig family as ch-goldenotter; v3 files
 *     pending a founder asset export)
 *   - avatar: a single portrait, no states (GREYLOT — the v3 heron pose
 *     set needs a founder asset export; flagged in the deviation note)
 *
 * The registry is the human character-selection seam: when a character
 * key arrives on users/scenarios, the board consumes it directly — no
 * presentation code changes.
 */

import type { PersonaKey } from '@bounty-bay/ai';

export type CharacterPose = 'idle' | 'thinking' | 'speaking' | 'offer' | 'smug' | 'offline';

export interface CastCharacter {
  key: string;
  displayName: string;
  epithet: string;
  kind: 'files' | 'sheet' | 'avatar';
  /** files: the base path (`/game/otter` → `otter-<pose>.svg`) · sheet/avatar: the asset path */
  src: string;
  /** sheet kind: cell index per pose (600px cells, 0-based) */
  cells: Partial<Record<CharacterPose, number>>;
}

const SHEET_CELLS: Record<CharacterPose, number> = {
  idle: 0,
  thinking: 1,
  offer: 2,
  speaking: 4,
  smug: 8,
  offline: 0,
};

const sheet = (key: string, displayName: string, epithet: string, file: string): CastCharacter => ({
  key,
  displayName,
  epithet,
  kind: 'sheet',
  src: `/game/${file}`,
  cells: SHEET_CELLS,
});

export const CAST: Record<string, CastCharacter> = {
  goldenotter: { key: 'goldenotter', displayName: 'GOLDENOTTER', epithet: 'The Closer', kind: 'files', src: '/game/otter', cells: {} },
  greylot: { key: 'greylot', displayName: 'GREYLOT', epithet: 'The Auctioneer', kind: 'avatar', src: '/game/ironheron.svg', cells: {} },
  hogshead: sheet('hogshead', 'HOGSHEAD', 'The Wholesaler', 'ch-hogshead.svg'),
  pipquill: sheet('pipquill', 'PIP QUILL', 'The Accountant', 'ch-pipquill.svg'),
  vesperine: sheet('vesperine', 'VESPERINE', 'The Curio Dealer', 'ch-vesperine.svg'),
  mossback: sheet('mossback', 'OLD MOSSBACK', 'The Collector', 'ch-mossback.svg'),
  marigold: sheet('marigold', 'MARIGOLD FENN', 'The Patron', 'ch-marigold.svg'),
  zippa: sheet('zippa', 'ZIPPA RATCHET', 'The Inventor-Trader', 'ch-zippa.svg'),
};

/**
 * AI persona → cast character. Proposed mapping (product assumption,
 * recorded in the BB-225 deviation note for founder review):
 *   closer  = GOLDENOTTER (canonical, GO-Recommended)
 *   anchor  = GREYLOT (the auctioneer opens high)
 *   grinder = HOGSHEAD (wholesale volume, small steps)
 *   wall    = OLD MOSSBACK (the collector will not budge)
 *   mirror  = PIP QUILL (the accountant follows the numbers)
 * VESPERINE and ZIPPA await future personas.
 */
export const PERSONA_CHARACTER: Record<PersonaKey, string> = {
  anchor: 'greylot',
  closer: 'goldenotter',
  grinder: 'hogshead',
  mirror: 'pipquill',
  wall: 'mossback',
};

/** Resolves a character key with the GoldenOtter default (humans today). */
export function castCharacter(key: string | undefined): CastCharacter {
  return CAST[key ?? 'goldenotter'] ?? CAST.goldenotter!;
}
