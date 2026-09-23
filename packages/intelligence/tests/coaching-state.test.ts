/**
 * Coaching state tests (IN-3, BB-205, docs/18 §9): structured state —
 * focus, topics, assignments, completions, before/after, repeat issues —
 * with pure transitions, never LLM chat memory. Valid / invalid /
 * boundary per the AGENTS.md testing rule.
 */

import { describe, expect, it } from 'vitest';
import {
  assignPractice,
  COACHING_STATE_VERSION,
  completeAssignment,
  emptyCoachingState,
  recordBeforeAfter,
  recordRepeatIssue,
  setFocus,
} from '../src';

function withTopic() {
  let state = emptyCoachingState();
  state = { ...state, topics: [{ id: 'concessions', label: 'Concession discipline' }] };
  return state;
}

describe('coaching state (IN-3)', () => {
  it('starts empty and versioned with no focus', () => {
    const state = emptyCoachingState();
    expect(state.version).toBe(COACHING_STATE_VERSION);
    expect(state.focus).toBeNull();
    expect(state.topics).toEqual([]);
    expect(state.assignments).toEqual([]);
    expect(state.beforeAfter).toEqual([]);
    expect(state.repeatIssueCounts).toEqual({});
  });

  it('tracks the full structured lifecycle without mutating input', () => {
    const start = withTopic();
    const assigned = assignPractice(start, { id: 'd1', kind: 'DRILL', refId: 'drill-concession-1', assignedAt: 1000, completedAt: null });
    const focused = setFocus(assigned, 'concessions');
    const completed = completeAssignment(focused, 'd1', 2000);
    const after = recordBeforeAfter(completed, { metric: 'decisionSpeedMs', before: 12000, after: 9000, at: 2000 });
    const repeats = recordRepeatIssue(after, 'unreciprocated-run');
    const repeatsAgain = recordRepeatIssue(repeats, 'unreciprocated-run');

    expect(repeatsAgain.focus).toBe('concessions');
    expect(repeatsAgain.assignments[0]!.completedAt).toBe(2000);
    expect(repeatsAgain.beforeAfter).toEqual([{ metric: 'decisionSpeedMs', before: 12000, after: 9000, at: 2000 }]);
    expect(repeatsAgain.repeatIssueCounts['unreciprocated-run']).toBe(2);

    // every transition is pure: inputs untouched
    expect(start.assignments).toEqual([]);
    expect(assigned.focus).toBeNull();
    expect(completed.beforeAfter).toEqual([]);
    expect(after.repeatIssueCounts).toEqual({});
  });

  it('rejects invalid transitions', () => {
    const start = withTopic();
    const assigned = assignPractice(start, { id: 'd1', kind: 'LESSON', refId: 'lesson-1', assignedAt: 1000, completedAt: null });

    expect(() => assignPractice(assigned, { id: 'd1', kind: 'DRILL', refId: 'x', assignedAt: 1000, completedAt: null }))
      .toThrow(/already exists/);
    expect(() => completeAssignment(start, 'nope', 2000)).toThrow(/unknown assignment/);
    expect(() => completeAssignment(assigned, 'd1', 500)).toThrow(/before it was assigned/);
    const completed = completeAssignment(assigned, 'd1', 2000);
    expect(() => completeAssignment(completed, 'd1', 3000)).toThrow(/already completed/);
    expect(() => completeAssignment(assigned, 'd1', Number.NaN)).toThrow(/non-finite completedAt/);
    expect(() => setFocus(start, 'unknown-topic')).toThrow(/unknown focus topic/);
    expect(() => recordBeforeAfter(start, { metric: 'x', before: Number.NaN, after: 1, at: 2 })).toThrow(/non-finite/);
  });

  it('handles boundary operations on empty state', () => {
    const cleared = setFocus(withTopic(), null);
    expect(cleared.focus).toBeNull();
    const first = recordRepeatIssue(emptyCoachingState(), 'issue-1');
    expect(first.repeatIssueCounts['issue-1']).toBe(1);
  });
});
