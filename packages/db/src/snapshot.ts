/**
 * Snapshot codec (06_ARCHITECTURE.md §6): the Match.domainState JSON column
 * holds `{ state, config }` — the authoritative domain state plus the exact
 * balance config that produced it, so historical results stay reproducible
 * after balance changes (06 §11).
 */

import type { EconomyConfig } from '@bounty-bay/config';
import type { MatchState } from '@bounty-bay/domain';
import type { Prisma } from './generated/prisma/client';

export interface StoredSnapshot {
  state: MatchState;
  config: EconomyConfig;
}

export function encodeSnapshot(snapshot: StoredSnapshot): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue;
}

/**
 * Decodes a snapshot written by this package. Shape validation is light on
 * purpose: the column is written only through the command service, and the
 * event stream remains independently verifiable via replay (PRD-009).
 */
export function decodeSnapshot(json: unknown): StoredSnapshot | null {
  if (json === null || json === undefined) return null;
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  if (typeof raw !== 'object' || raw === null) return null;
  const { state, config } = raw as { state?: unknown; config?: unknown };
  if (typeof state !== 'object' || state === null) return null;
  if (typeof config !== 'object' || config === null) return null;
  const s = state as Partial<MatchState>;
  const c = config as Partial<EconomyConfig>;
  if (typeof s.matchId !== 'string' || typeof s.status !== 'string') return null;
  if (!Array.isArray(s.participants) || s.participants.length !== 2) return null;
  if (typeof c.version !== 'string') return null;
  return { state: state as MatchState, config: config as EconomyConfig };
}
