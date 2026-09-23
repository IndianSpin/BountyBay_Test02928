/**
 * Structured coaching state (IN-3, DEC-028, docs/18 §9 + docs/20).
 *
 * The coaching state is structured data — focus, topics, assignments,
 * completions, before/after entries, repeat-issue counts — never LLM
 * chat memory. All transitions are pure functions over explicit input;
 * timestamps come from the caller (server time), never from a clock
 * read inside this module.
 */

export const COACHING_STATE_VERSION = 'coaching-state-0.1.0';

export type CoachingAssignmentKind = 'DRILL' | 'LESSON' | 'PERSONA_MATCH';

export interface CoachingTopic {
  id: string;
  label: string;
}

export interface CoachingAssignment {
  id: string;
  kind: CoachingAssignmentKind;
  /** Reference to the practice target (drill id, lesson id, persona id). */
  refId: string;
  assignedAt: number;
  completedAt: number | null;
}

export interface BeforeAfterEntry {
  /** Profile metric name the intervention targeted (e.g. 'decisionSpeedMs'). */
  metric: string;
  before: number;
  after: number;
  /** Server timestamp of the after measurement. */
  at: number;
}

export interface CoachingState {
  version: string;
  /** Current focus topic id, or null when no focus is set. */
  focus: string | null;
  topics: CoachingTopic[];
  assignments: CoachingAssignment[];
  beforeAfter: BeforeAfterEntry[];
  /** Observed recurrence counts by issue id (repeat-issue tracking). */
  repeatIssueCounts: Record<string, number>;
}

export function emptyCoachingState(): CoachingState {
  return { version: COACHING_STATE_VERSION, focus: null, topics: [], assignments: [], beforeAfter: [], repeatIssueCounts: {} };
}

export function assignPractice(state: CoachingState, assignment: CoachingAssignment): CoachingState {
  if (state.assignments.some((existing) => existing.id === assignment.id)) {
    throw new Error(`assignment ${assignment.id} already exists`);
  }
  if (!Number.isFinite(assignment.assignedAt)) throw new Error(`assignment ${assignment.id} has a non-finite assignedAt`);
  return { ...state, assignments: [...state.assignments, assignment] };
}

export function completeAssignment(state: CoachingState, assignmentId: string, completedAt: number): CoachingState {
  const assignment = state.assignments.find((existing) => existing.id === assignmentId);
  if (!assignment) throw new Error(`unknown assignment ${assignmentId}`);
  if (assignment.completedAt !== null) throw new Error(`assignment ${assignmentId} is already completed`);
  if (!Number.isFinite(completedAt)) throw new Error(`non-finite completedAt for assignment ${assignmentId}`);
  if (completedAt < assignment.assignedAt) throw new Error(`assignment ${assignmentId} completed before it was assigned`);
  return {
    ...state,
    assignments: state.assignments.map((existing) => (existing.id === assignmentId ? { ...existing, completedAt } : existing)),
  };
}

export function setFocus(state: CoachingState, topicId: string | null): CoachingState {
  if (topicId !== null && !state.topics.some((topic) => topic.id === topicId)) {
    throw new Error(`unknown focus topic ${topicId}`);
  }
  return { ...state, focus: topicId };
}

export function recordBeforeAfter(state: CoachingState, entry: BeforeAfterEntry): CoachingState {
  if (!Number.isFinite(entry.before) || !Number.isFinite(entry.after) || !Number.isFinite(entry.at)) {
    throw new Error(`non-finite before/after entry for metric ${entry.metric}`);
  }
  return { ...state, beforeAfter: [...state.beforeAfter, entry] };
}

export function recordRepeatIssue(state: CoachingState, issueId: string): CoachingState {
  return { ...state, repeatIssueCounts: { ...state.repeatIssueCounts, [issueId]: (state.repeatIssueCounts[issueId] ?? 0) + 1 } };
}
