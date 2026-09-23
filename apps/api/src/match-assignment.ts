/**
 * Server-side match assignment (PRD-004: scenario, roles, private RVs,
 * first mover, balance-config version).
 *
 * RV distribution is PROVISIONAL — OQ-007 is open ("Need test distributions
 * that create varied ZOPA widths and absolute scales"). v0.1 friend matches
 * use a small-scale distribution with guaranteed positive ZOPA:
 * buyer RV ∈ [30.0, 100.0], seller RV ∈ [10.0, buyer - 10.0].
 * First mover is 50/50 (GR-005). All randomness is server-side crypto.
 */

import type { Role } from '@bounty-bay/domain';
import { randomInt, randomUUID } from 'node:crypto';

export interface Assignment {
  scenarioId: string;
  scenarioVersion: number;
  role: Role;
  reservationValueTenths: number;
}

export interface MatchAssignmentInput {
  scenarioId: string;
  scenarioVersion: number;
}

/** Uniform integer in [min, max] inclusive (tenths). */
function uniformTenths(min: number, max: number): number {
  return randomInt(min, max + 1);
}

export function assignCreatorRole(input: MatchAssignmentInput): Assignment {
  const role = randomInt(0, 2) === 0 ? 'BUYER' : 'SELLER';
  return { ...input, role, reservationValueTenths: reservationValueFor(role) };
}

export function assignJoinerRole(input: MatchAssignmentInput, creatorRole: Role): Assignment {
  const role: Role = creatorRole === 'BUYER' ? 'SELLER' : 'BUYER';
  return { ...input, role, reservationValueTenths: reservationValueFor(role) };
}

/**
 * PDR-3 (QA-004): fixed-role assignment for rematches. The role is carried
 * from the previous match — only the RV is freshly drawn.
 */
export function assignFixedRole(input: MatchAssignmentInput, role: Role): Assignment {
  return { ...input, role, reservationValueTenths: reservationValueFor(role) };
}

/** AI opponent RV (DEC-025): the same disjoint human ranges, so ZOPA > 0 is guaranteed. */
export function assignAiOpponentRole(role: Role): number {
  return reservationValueFor(role);
}

function reservationValueFor(role: Role): number {
  if (role === 'BUYER') return uniformTenths(300, 1000);
  // Seller RV must sit at least 10.0 below any possible buyer RV for ZOPA > 0.
  return uniformTenths(100, 290);
}

export function pickFirstPlayer(buyerId: string, sellerId: string): string {
  return randomInt(0, 2) === 0 ? buyerId : sellerId;
}

export function newCommandId(): string {
  return randomUUID();
}
