import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_AMOUNT_TENTHS, formatTenths, isValidAmountTenths, parseAmountTenths } from '../src/amount';

describe('parseAmountTenths — GR-004 valid cases', () => {
  it('parses the minimum amount 0.1', () => {
    expect(parseAmountTenths('0.1')).toEqual({ ok: true, tenths: 1 });
  });

  it('parses whole numbers', () => {
    expect(parseAmountTenths('1')).toEqual({ ok: true, tenths: 10 });
    expect(parseAmountTenths('100')).toEqual({ ok: true, tenths: 1000 });
  });

  it('parses one-decimal values (docs: 47.3 -> 473)', () => {
    expect(parseAmountTenths('47.3')).toEqual({ ok: true, tenths: 473 });
  });

  it('parses the engineering maximum 999,999,999.9', () => {
    expect(parseAmountTenths('999999999.9')).toEqual({ ok: true, tenths: 9_999_999_999 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseAmountTenths('  42 ')).toEqual({ ok: true, tenths: 420 });
  });

  it('accepts trailing zero decimal (1.0)', () => {
    expect(parseAmountTenths('1.0')).toEqual({ ok: true, tenths: 10 });
  });
});

describe('parseAmountTenths — GR-004 invalid cases', () => {
  it.each(['', '   ', 'abc', '0', '0.0', '-1', '-0.1', '+1', '1e3', '1E3', '.5', '1.', '1.23', '1,000', '1000000000', '999999999.95', '∞', 'NaN'])(
    'rejects %j',
    (input) => {
      expect(parseAmountTenths(input).ok).toBe(false);
    },
  );

  it('rejects zero with ZERO reason', () => {
    expect(parseAmountTenths('0')).toEqual({ ok: false, reason: 'ZERO' });
    expect(parseAmountTenths('0.0')).toEqual({ ok: false, reason: 'ZERO' });
  });

  it('rejects empty with EMPTY reason', () => {
    expect(parseAmountTenths('')).toEqual({ ok: false, reason: 'EMPTY' });
  });

  it('rejects scientific notation (GR-004)', () => {
    expect(parseAmountTenths('1e3').ok).toBe(false);
    expect(parseAmountTenths('1.5e2').ok).toBe(false);
  });

  it('rejects out-of-range with OUT_OF_RANGE reason under a custom maximum', () => {
    expect(parseAmountTenths('500', 100)).toEqual({ ok: false, reason: 'OUT_OF_RANGE' });
    // Ten-digit integers fail the format pattern before any range check.
    expect(parseAmountTenths('1000000000')).toEqual({ ok: false, reason: 'INVALID_FORMAT' });
  });
});

describe('isValidAmountTenths — boundary cases', () => {
  it('accepts the min boundary 0.1', () => {
    expect(isValidAmountTenths(1)).toBe(true);
  });

  it('accepts the max boundary', () => {
    expect(isValidAmountTenths(DEFAULT_MAX_AMOUNT_TENTHS)).toBe(true);
  });

  it('rejects zero, negatives, non-integers, and above max', () => {
    expect(isValidAmountTenths(0)).toBe(false);
    expect(isValidAmountTenths(-1)).toBe(false);
    expect(isValidAmountTenths(0.5)).toBe(false);
    expect(isValidAmountTenths(DEFAULT_MAX_AMOUNT_TENTHS + 1)).toBe(false);
    expect(isValidAmountTenths(NaN)).toBe(false);
    expect(isValidAmountTenths(Infinity)).toBe(false);
  });

  it('respects a custom maximum', () => {
    expect(isValidAmountTenths(500, 1000)).toBe(true);
    expect(isValidAmountTenths(1001, 1000)).toBe(false);
  });
});

describe('formatTenths', () => {
  it('formats tenths to display strings', () => {
    expect(formatTenths(473)).toBe('47.3');
    expect(formatTenths(1000)).toBe('100');
    expect(formatTenths(1)).toBe('0.1');
    expect(formatTenths(9_999_999_999)).toBe('999999999.9');
  });
});
