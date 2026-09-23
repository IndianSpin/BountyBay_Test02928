/**
 * Amount domain (GR-004).
 *
 * V1 player-visible amount rules: minimum 0.1, maximum 999,999,999.9,
 * precision one decimal place, zero/negative/scientific notation invalid.
 * Monetary-style amounts are stored as integer tenths: `47.3 -> 473`.
 *
 * Player offer amounts are ALWAYS integers here — never floating point
 * (AGENTS.md "Never": no floating-point for player offer amounts).
 */

/** 0.1 — the V1 minimum amount (GR-004). */
export const MIN_AMOUNT_TENTHS = 1;

/** 999,999,999.9 in tenths — the V1 engineering maximum (GR-004). */
export const DEFAULT_MAX_AMOUNT_TENTHS = 9_999_999_999;

export type ParseAmountReason = 'EMPTY' | 'INVALID_FORMAT' | 'ZERO' | 'OUT_OF_RANGE';

export type ParseAmountResult = { ok: true; tenths: number } | { ok: false; reason: ParseAmountReason };

const AMOUNT_PATTERN = /^(\d{1,9})(?:\.(\d))?$/;

/**
 * Strict parser for user-supplied amount strings (PRD-007).
 * Rejects scientific notation, negatives, more than one decimal place,
 * leading `+`, bare decimals, and integers above the 9-digit engineering max.
 */
export function parseAmountTenths(
  input: string,
  maxTenths: number = DEFAULT_MAX_AMOUNT_TENTHS,
): ParseAmountResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'EMPTY' };
  const match = AMOUNT_PATTERN.exec(trimmed);
  if (!match) return { ok: false, reason: 'INVALID_FORMAT' };
  const tenths = Number(match[1]) * 10 + (match[2] !== undefined ? Number(match[2]) : 0);
  if (tenths === 0) return { ok: false, reason: 'ZERO' };
  if (tenths > maxTenths) return { ok: false, reason: 'OUT_OF_RANGE' };
  return { ok: true, tenths };
}

/** Domain-level validity: positive integer tenths within [0.1, max]. */
export function isValidAmountTenths(tenths: number, maxTenths: number = DEFAULT_MAX_AMOUNT_TENTHS): boolean {
  return Number.isInteger(tenths) && tenths >= MIN_AMOUNT_TENTHS && tenths <= maxTenths;
}

/** Display formatting: `473 -> "47.3"`, `1000 -> "100"`, `1 -> "0.1"`. */
export function formatTenths(tenths: number): string {
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return frac === 0 ? String(whole) : `${whole}.${frac}`;
}
