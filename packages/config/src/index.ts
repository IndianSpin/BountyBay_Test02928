/**
 * Versioned, server-side balance configuration.
 *
 * All values are test defaults per docs/03_GAME_ECONOMY.md §2 — NOT settled
 * product decisions. They must stay server-configurable, and every match
 * stores the exact config version used (GE: "match stores the exact
 * balance-config version used"; 06_ARCHITECTURE.md §11).
 */

/** Behavioral rule set identifier (06_ARCHITECTURE.md §11). */
export const GAME_RULES_VERSION = 'game-rules-0.1.0';

/** GR-024 (DD Phase 1): supported timeout policies. */
export type TimeoutPolicy = 'ATTRIBUTED_NO_DEAL';

export const TIMEOUT_POLICIES: readonly TimeoutPolicy[] = ['ATTRIBUTED_NO_DEAL'];

export interface EconomyConfig {
  /** Config identifier, e.g. `economy-0.2.0`. Immutable once used by a match. */
  version: string;
  /** GE-009: gross reward pool for a completed deal (chips). */
  matchBountyChips: number;
  /** GE-004: fresh per-player concession budget at match start (chips). */
  concessionBudgetChips: number;
  /** GE-007: concession cost multiplier `K` (K > 0). */
  concessionK: number;
  /** GE-007: concession cost exponent `alpha` (0 < alpha < 1). */
  concessionAlpha: number;
  /** GE-008: payout multiplier floor (settled at 0.30). */
  clockFloorMultiplier: number;
  /** GE-008: cumulative active ms at which the multiplier floor is reached. */
  clockFloorMs: number;
  /** GE: per-turn grace period in ms (provisional, default 0). */
  turnGraceMs: number;
  /** GR-004: maximum offer amount in integer tenths (999,999,999.9). */
  maxAmountTenths: number;
  /**
   * GR-023 (DD Phase 1): hard personal decision-time budget in ms.
   * Optional — absent/null means no limit (legacy `economy-0.1.0`
   * snapshots replay with no timeout behavior).
   */
  hardDecisionTimeLimitMs?: number;
  /** GR-024 (DD Phase 1): timeout policy. Only `ATTRIBUTED_NO_DEAL`. */
  timeoutPolicy?: TimeoutPolicy;
  /** DD Phase 1: LOW TIME warning threshold (ms remaining; provisional). */
  timeWarningLowMs?: number;
  /** DD Phase 1: CRITICAL warning threshold (ms remaining; provisional). */
  timeWarningCriticalMs?: number;
}

/** v0.2 test defaults — provisional values marked in docs/03_GAME_ECONOMY.md §2. */
export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  version: 'economy-0.2.0',
  matchBountyChips: 100,
  concessionBudgetChips: 100,
  concessionK: 10,
  concessionAlpha: 0.6,
  clockFloorMultiplier: 0.3,
  clockFloorMs: 60_000,
  turnGraceMs: 0,
  maxAmountTenths: 9_999_999_999,
  hardDecisionTimeLimitMs: 90_000,
  timeoutPolicy: 'ATTRIBUTED_NO_DEAL',
  timeWarningLowMs: 30_000,
  timeWarningCriticalMs: 10_000,
};

/**
 * GR-023 (DD Phase 1): effective hard decision-time limit, or null when the
 * config has none (legacy configs). The domain must read the limit only
 * through this helper so old snapshots replay with no timeout behavior.
 */
export function effectiveHardDecisionLimitMs(config: EconomyConfig): number | null {
  const limit = config.hardDecisionTimeLimitMs;
  return limit !== undefined && Number.isFinite(limit) && limit > 0 ? limit : null;
}

export interface TimeWarnings {
  lowMs: number;
  criticalMs: number;
}

/**
 * DD Phase 1: effective warning thresholds, or null when unset/invalid
 * (the client then renders no tier warnings). `criticalMs <= lowMs` is
 * enforced by validateEconomyConfig for admin-supplied configs.
 */
export function effectiveTimeWarnings(config: EconomyConfig): TimeWarnings | null {
  const low = config.timeWarningLowMs;
  const critical = config.timeWarningCriticalMs;
  if (low === undefined || critical === undefined) return null;
  if (!Number.isFinite(low) || !Number.isFinite(critical) || low <= 0 || critical <= 0) return null;
  return { lowMs: low, criticalMs: critical };
}

/** Returns a copy of the defaults with overrides applied and the version bumped marker set by caller. */
export function makeEconomyConfig(overrides: Partial<Omit<EconomyConfig, 'version'>> = {}): EconomyConfig {
  return { ...DEFAULT_ECONOMY_CONFIG, ...overrides };
}

/**
 * Structural validation for admin-supplied configs (PRD-016). A match must
 * never start with an invalid config.
 */
export function validateEconomyConfig(config: EconomyConfig): string[] {
  const errors: string[] = [];
  if (!config.version) errors.push('version must be a non-empty identifier');
  if (!Number.isFinite(config.matchBountyChips) || config.matchBountyChips <= 0)
    errors.push('matchBountyChips must be a positive number');
  if (!Number.isFinite(config.concessionBudgetChips) || config.concessionBudgetChips < 0)
    errors.push('concessionBudgetChips must be >= 0');
  if (!Number.isFinite(config.concessionK) || config.concessionK <= 0)
    errors.push('concessionK must be > 0 (GE-007)');
  if (!Number.isFinite(config.concessionAlpha) || config.concessionAlpha <= 0 || config.concessionAlpha >= 1)
    errors.push('concessionAlpha must be in (0, 1) (GE-007)');
  if (!Number.isFinite(config.clockFloorMultiplier) || config.clockFloorMultiplier <= 0 || config.clockFloorMultiplier > 1)
    errors.push('clockFloorMultiplier must be in (0, 1]');
  if (!Number.isFinite(config.clockFloorMs) || config.clockFloorMs <= 0)
    errors.push('clockFloorMs must be a positive number');
  if (!Number.isFinite(config.turnGraceMs) || config.turnGraceMs < 0)
    errors.push('turnGraceMs must be >= 0');
  if (!Number.isInteger(config.maxAmountTenths) || config.maxAmountTenths < 1)
    errors.push('maxAmountTenths must be a positive integer (GR-004)');
  if (config.hardDecisionTimeLimitMs !== undefined) {
    if (!Number.isInteger(config.hardDecisionTimeLimitMs) || config.hardDecisionTimeLimitMs <= 0)
      errors.push('hardDecisionTimeLimitMs must be a positive integer (GR-023)');
    if (config.timeoutPolicy !== undefined && !TIMEOUT_POLICIES.includes(config.timeoutPolicy))
      errors.push(`timeoutPolicy must be one of: ${TIMEOUT_POLICIES.join(', ')} (GR-024)`);
  }
  const low = config.timeWarningLowMs;
  const critical = config.timeWarningCriticalMs;
  if (low !== undefined || critical !== undefined) {
    if (
      low === undefined ||
      critical === undefined ||
      !Number.isInteger(low) ||
      !Number.isInteger(critical) ||
      critical <= 0 ||
      low <= critical
    )
      errors.push('timeWarning thresholds must satisfy 0 < criticalMs < lowMs (DD Phase 1)');
    if (config.hardDecisionTimeLimitMs !== undefined && low !== undefined && Number.isInteger(low) && low >= config.hardDecisionTimeLimitMs)
      errors.push('timeWarningLowMs must be below hardDecisionTimeLimitMs (DD Phase 1)');
  }
  return errors;
}
