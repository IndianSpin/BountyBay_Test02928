/**
 * EconomyConfig validation + DD Phase 1 helpers (GR-023/GR-024, DEC-027).
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ECONOMY_CONFIG,
  effectiveHardDecisionLimitMs,
  effectiveTimeWarnings,
  makeEconomyConfig,
  validateEconomyConfig,
} from '../src';

describe('DEFAULT_ECONOMY_CONFIG (economy-0.2.0)', () => {
  it('carries the DD Phase 1 test defaults', () => {
    expect(DEFAULT_ECONOMY_CONFIG.version).toBe('economy-0.2.0');
    expect(DEFAULT_ECONOMY_CONFIG.clockFloorMs).toBe(60_000);
    expect(DEFAULT_ECONOMY_CONFIG.hardDecisionTimeLimitMs).toBe(90_000);
    expect(DEFAULT_ECONOMY_CONFIG.timeoutPolicy).toBe('ATTRIBUTED_NO_DEAL');
    expect(DEFAULT_ECONOMY_CONFIG.timeWarningLowMs).toBe(30_000);
    expect(DEFAULT_ECONOMY_CONFIG.timeWarningCriticalMs).toBe(10_000);
    expect(validateEconomyConfig(DEFAULT_ECONOMY_CONFIG)).toEqual([]);
  });

  it('is accepted as a whole and via makeEconomyConfig', () => {
    expect(validateEconomyConfig(makeEconomyConfig())).toEqual([]);
  });
});

describe('validateEconomyConfig — DD Phase 1 fields', () => {
  it('valid: explicit tiny-limit config (db test shape)', () => {
    const config = makeEconomyConfig({
      hardDecisionTimeLimitMs: 10_000,
      timeoutPolicy: 'ATTRIBUTED_NO_DEAL',
      timeWarningLowMs: 5_000,
      timeWarningCriticalMs: 2_000,
    });
    expect(validateEconomyConfig(config)).toEqual([]);
  });

  it('invalid: limit must be a positive integer', () => {
    for (const limit of [0, -1, 1.5, NaN]) {
      const errors = validateEconomyConfig(makeEconomyConfig({ hardDecisionTimeLimitMs: limit }));
      expect(errors.some((e) => e.includes('hardDecisionTimeLimitMs'))).toBe(true);
    }
  });

  it('invalid: unknown timeout policy is rejected', () => {
    const config = makeEconomyConfig({ timeoutPolicy: 'MUTUAL_DRAW' as never });
    expect(validateEconomyConfig(config).some((e) => e.includes('timeoutPolicy'))).toBe(true);
  });

  it('invalid: warning thresholds must satisfy 0 < critical < low', () => {
    const equal = validateEconomyConfig(makeEconomyConfig({ timeWarningLowMs: 5_000, timeWarningCriticalMs: 5_000 }));
    expect(equal.some((e) => e.includes('timeWarning thresholds'))).toBe(true);
    const inverted = validateEconomyConfig(makeEconomyConfig({ timeWarningLowMs: 2_000, timeWarningCriticalMs: 5_000 }));
    expect(inverted.some((e) => e.includes('timeWarning thresholds'))).toBe(true);
    const zero = validateEconomyConfig(makeEconomyConfig({ timeWarningLowMs: 5_000, timeWarningCriticalMs: 0 }));
    expect(zero.some((e) => e.includes('timeWarning thresholds'))).toBe(true);
  });

  it('boundary: low warning below the hard limit', () => {
    const at = validateEconomyConfig(makeEconomyConfig({ hardDecisionTimeLimitMs: 90_000, timeWarningLowMs: 90_000, timeWarningCriticalMs: 10_000 }));
    expect(at.some((e) => e.includes('below hardDecisionTimeLimitMs'))).toBe(true);
    const under = validateEconomyConfig(makeEconomyConfig({ hardDecisionTimeLimitMs: 90_000, timeWarningLowMs: 89_999, timeWarningCriticalMs: 10_000 }));
    expect(under).toEqual([]);
  });
});

describe('effectiveHardDecisionLimitMs — legacy config compatibility', () => {
  it('returns the limit when set', () => {
    expect(effectiveHardDecisionLimitMs(makeEconomyConfig())).toBe(90_000);
  });

  it('returns null for absent, non-finite, or non-positive limits (legacy rows)', () => {
    expect(effectiveHardDecisionLimitMs(makeEconomyConfig({ hardDecisionTimeLimitMs: undefined }))).toBeNull();
    expect(effectiveHardDecisionLimitMs(makeEconomyConfig({ hardDecisionTimeLimitMs: NaN }))).toBeNull();
    expect(effectiveHardDecisionLimitMs(makeEconomyConfig({ hardDecisionTimeLimitMs: 0 }))).toBeNull();
    expect(effectiveHardDecisionLimitMs(makeEconomyConfig({ hardDecisionTimeLimitMs: -5 }))).toBeNull();
  });
});

describe('effectiveTimeWarnings', () => {
  it('returns thresholds when both are valid', () => {
    expect(effectiveTimeWarnings(makeEconomyConfig())).toEqual({ lowMs: 30_000, criticalMs: 10_000 });
  });

  it('returns null when either threshold is missing or non-positive', () => {
    expect(effectiveTimeWarnings(makeEconomyConfig({ timeWarningLowMs: undefined }))).toBeNull();
    expect(effectiveTimeWarnings(makeEconomyConfig({ timeWarningCriticalMs: undefined }))).toBeNull();
    expect(effectiveTimeWarnings(makeEconomyConfig({ timeWarningCriticalMs: 0 }))).toBeNull();
  });
});
