/**
 * DA-P1 (BB-229): the analytics emitter stamps deployment tags on every
 * line in the documented order and dedupes time_tier_entered (per match/
 * player/tier) and result_viewed (per match/player, per process).
 */

import { describe, expect, it } from 'vitest';
import { createAnalyticsEmitter } from '../src/analytics';

describe('analytics emitter (DA-P1)', () => {
  it('stamps environment/release/service after analytics_event, before emitted_at', () => {
    const lines: string[] = [];
    createAnalyticsEmitter((line) => lines.push(line), { environment: 'e2e', release: 'abc123@0.1.0' }).emit('signup_completed', {
      playerId: 'p1',
      authProvider: 'dev',
    });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    expect(keys.indexOf('analytics_event')).toBe(0);
    expect(keys.indexOf('environment')).toBe(1);
    expect(keys.indexOf('release')).toBe(2);
    expect(keys.indexOf('service')).toBe(3);
    expect(keys.indexOf('emitted_at')).toBe(keys.length - 1);
    expect(parsed.environment).toBe('e2e');
    expect(parsed.release).toBe('abc123@0.1.0');
    expect(parsed.service).toBe('api');
    expect(parsed.playerId).toBe('p1');
  });

  it('defaults to development/local tags', () => {
    const lines: string[] = [];
    createAnalyticsEmitter((line) => lines.push(line)).emit('match_timed_out', { matchId: 'm1' });
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.environment).toBe('development');
    expect(parsed.release).toBe('local');
  });

  it('dedupes result_viewed at most once per (match, player) per process', () => {
    const lines: string[] = [];
    const emitter = createAnalyticsEmitter((line) => lines.push(line));
    emitter.emit('result_viewed', { matchId: 'm1', playerId: 'p1' });
    emitter.emit('result_viewed', { matchId: 'm1', playerId: 'p1' }); // dropped
    emitter.emit('result_viewed', { matchId: 'm1', playerId: 'p2' }); // kept
    expect(lines).toHaveLength(2);
  });

  it('keeps time_tier_entered dedup per (match, player, tier)', () => {
    const lines: string[] = [];
    const emitter = createAnalyticsEmitter((line) => lines.push(line));
    emitter.emit('time_tier_entered', { matchId: 'm1', playerId: 'p1', tier: 'LOW_TIME' });
    emitter.emit('time_tier_entered', { matchId: 'm1', playerId: 'p1', tier: 'LOW_TIME' }); // dropped
    emitter.emit('time_tier_entered', { matchId: 'm1', playerId: 'p1', tier: 'CRITICAL' }); // kept
    expect(lines).toHaveLength(2);
  });
});
