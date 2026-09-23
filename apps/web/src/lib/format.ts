/**
 * UI display formatting. The domain's formatTenths stays canonical for
 * engine-facing strings; display strings add thousands separators per
 * 09_UI_DESIGN_SYSTEM ("Format large numbers with separators after parsing").
 */

export function formatTenthsGrouped(tenths: number): string {
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  const grouped = new Intl.NumberFormat('en-US').format(whole);
  return frac === 0 ? grouped : `${grouped}.${frac}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}
