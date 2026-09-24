/**
 * GOLDEN REFERENCE DATA (BB-256, D-73): the fixed world every golden
 * page renders — one player (BOB), one opponent (KESTREL), one scenario
 * (THE RUBY COMPASS), one deal (agreement at 74.0). Reference data only:
 * the numbers here are presentation fixtures, not domain claims.
 *
 * Every state carries a TIMELINE — a file the pages consume (inline
 * animation-delay/duration) and the GATE verifies against the DOM.
 * Beats reference element ids via data-golden-beat; each beat is one
 * animation moment with a start time, duration and named effect.
 */

export interface TimelineBeat {
  /** start time relative to state entry, ms */
  atMs: number;
  /** animation duration, ms */
  durationMs: number;
  /** the data-golden-beat element this drives */
  element: string;
  /** the named effect (motion-spec effect or state choreography) */
  effect: string;
}

export interface GoldenState {
  key: string;
  journey: 'A' | 'B';
  /** the journey order index within its journey */
  order: number;
  name: string;
  /** the state's line in PRODUCT_HEALTH.md */
  line: string;
  timeline: TimelineBeat[];
}

export const REFERENCE = {
  me: { name: 'BOB', character: 'goldenotter' },
  opponent: { name: 'KESTREL', character: 'greylot', handle: 'Kestrel' },
  scenario: { title: 'THE RUBY COMPASS' },
  deal: {
    myLimit: 74.0,
    theirLimit: 34.0,
    agreement: 74.0,
    captured: '100%',
    chipsSpent: 0,
    offers: 1,
    closeMs: 2000,
  },
} as const;

/**
 * Journey A — HUMAN PvP (PRODUCT_HEALTH.md order):
 * Bay → Play → Challenge → Opponent joins → Role/Dossier → Live Match →
 * Result → Game Review → Rematch → Bay.
 */
export const JOURNEY_A: GoldenState[] = [
  {
    key: 'bay',
    journey: 'A',
    order: 1,
    name: 'The Bay',
    line: 'Bay (hub)',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'bay-table', effect: 'table-glow' },
      { atMs: 200, durationMs: 500, element: 'bay-letters', effect: 'rise' },
      { atMs: 400, durationMs: 450, element: 'bay-slots', effect: 'rise' },
      { atMs: 700, durationMs: 400, element: 'bay-practice', effect: 'rise' },
      { atMs: 900, durationMs: 400, element: 'bay-me', effect: 'rise' },
    ],
  },
  {
    key: 'battle-selection',
    journey: 'A',
    order: 2,
    name: 'Battle selection',
    line: 'Play / battle selection',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'bs-heading', effect: 'fade-in' },
      { atMs: 200, durationMs: 500, element: 'bs-challenge', effect: 'rise' },
      { atMs: 500, durationMs: 450, element: 'bs-practice', effect: 'rise' },
    ],
  },
  {
    key: 'challenge-created',
    journey: 'A',
    order: 3,
    name: 'Challenge created',
    line: 'Challenge created',
    timeline: [
      { atMs: 0, durationMs: 600, element: 'cc-seal', effect: 'pin-slam' },
      { atMs: 500, durationMs: 500, element: 'cc-share', effect: 'type-in' },
      { atMs: 900, durationMs: 400, element: 'cc-wait', effect: 'fade-in' },
    ],
  },
  {
    key: 'opponent-joins',
    journey: 'A',
    order: 4,
    name: 'Opponent joins',
    line: 'Opponent joins (friend)',
    timeline: [
      { atMs: 0, durationMs: 500, element: 'oj-door', effect: 'door-open' },
      { atMs: 400, durationMs: 900, element: 'oj-kestrel', effect: 'walk-in' },
      { atMs: 1200, durationMs: 400, element: 'oj-ready', effect: 'rise' },
    ],
  },
  {
    key: 'role-reveal',
    journey: 'A',
    order: 5,
    name: 'Role & dossier',
    line: 'Role/Dossier reveal',
    timeline: [
      { atMs: 0, durationMs: 500, element: 'rr-role', effect: 'flip-in' },
      { atMs: 400, durationMs: 700, element: 'rr-rv', effect: 'flip-reveal' },
      { atMs: 1000, durationMs: 600, element: 'rr-dossier', effect: 'slide-in' },
      { atMs: 1400, durationMs: 500, element: 'rr-opponent', effect: 'settle' },
    ],
  },
  {
    key: 'live-match',
    journey: 'A',
    order: 6,
    name: 'Live match',
    line: 'Live Match',
    timeline: [
      { atMs: 0, durationMs: 600, element: 'lm-world', effect: 'world-in' },
      { atMs: 300, durationMs: 0, element: 'lm-opponent', effect: 'idle-loop' },
      { atMs: 800, durationMs: 700, element: 'lm-plaque', effect: 'plaque-slide' },
      { atMs: 1400, durationMs: 300, element: 'lm-cross', effect: 'cross-snap' },
      { atMs: 1700, durationMs: 600, element: 'lm-close', effect: 'warm-close' },
    ],
  },
  {
    key: 'result',
    journey: 'A',
    order: 7,
    name: 'Result',
    line: 'Result / SH4 reveal',
    timeline: [
      { atMs: 0, durationMs: 0, element: 'rs-person', effect: 'person-stays' },
      { atMs: 300, durationMs: 700, element: 'rs-limits', effect: 'flip' },
      { atMs: 900, durationMs: 800, element: 'rs-split', effect: 'coin-cascade' },
      { atMs: 1600, durationMs: 500, element: 'rs-ledger', effect: 'rise' },
      { atMs: 2000, durationMs: 400, element: 'rs-ring', effect: 'ring-in' },
      { atMs: 2300, durationMs: 400, element: 'rs-actions', effect: 'rise' },
    ],
  },
  {
    key: 'review',
    journey: 'A',
    order: 8,
    name: 'Game review',
    line: 'Game Review',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'rv-header', effect: 'fade-in' },
      { atMs: 300, durationMs: 500, element: 'rv-m-result', effect: 'rise' },
      { atMs: 450, durationMs: 500, element: 'rv-m-opening', effect: 'rise' },
      { atMs: 600, durationMs: 500, element: 'rv-m-limit', effect: 'rise' },
      { atMs: 750, durationMs: 500, element: 'rv-m-close', effect: 'rise' },
      { atMs: 900, durationMs: 500, element: 'rv-m-efficient', effect: 'rise' },
      { atMs: 1200, durationMs: 500, element: 'rv-timeline', effect: 'rise' },
    ],
  },
  {
    key: 'rematch',
    journey: 'A',
    order: 9,
    name: 'Rematch',
    line: 'Rematch (letter → accept)',
    timeline: [
      { atMs: 0, durationMs: 500, element: 'rm-letter', effect: 'unseal' },
      { atMs: 400, durationMs: 600, element: 'rm-stage', effect: 'stage-in' },
      { atMs: 900, durationMs: 400, element: 'rm-ring', effect: 'ring-in' },
      { atMs: 1200, durationMs: 400, element: 'rm-accept', effect: 'rise' },
    ],
  },
  {
    key: 'back-to-bay',
    journey: 'A',
    order: 10,
    name: 'Back to The Bay',
    line: 'Back to Bay',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'bb-bay', effect: 'settle' },
      { atMs: 300, durationMs: 400, element: 'bb-table', effect: 'table-glow' },
      { atMs: 600, durationMs: 500, element: 'bb-letter', effect: 'letter-land' },
    ],
  },
];

/**
 * Journey B — AI PRACTICE (PRODUCT_HEALTH.md order):
 * Bay → Practice → Select AI → Match → Meaningful table talk → Result →
 * Profile/training update → Play Again/Bay.
 */
export const JOURNEY_B: GoldenState[] = [
  {
    key: 'practice-entry',
    journey: 'B',
    order: 1,
    name: 'Practice entry',
    line: 'Practice entry (Bay)',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'pe-bay', effect: 'settle' },
      { atMs: 300, durationMs: 500, element: 'pe-practice', effect: 'spotlight' },
    ],
  },
  {
    key: 'persona-select',
    journey: 'B',
    order: 2,
    name: 'Select AI persona',
    line: 'Select AI persona',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'ps-heading', effect: 'fade-in' },
      { atMs: 150, durationMs: 450, element: 'ps-card-1', effect: 'rise' },
      { atMs: 300, durationMs: 450, element: 'ps-card-2', effect: 'rise' },
      { atMs: 450, durationMs: 450, element: 'ps-card-3', effect: 'rise' },
      { atMs: 600, durationMs: 450, element: 'ps-card-4', effect: 'rise' },
      { atMs: 750, durationMs: 450, element: 'ps-card-5', effect: 'rise' },
    ],
  },
  {
    key: 'ai-start',
    journey: 'B',
    order: 3,
    name: 'AI match start',
    line: 'AI match start',
    timeline: [
      { atMs: 0, durationMs: 500, element: 'as-card', effect: 'walk-in' },
      { atMs: 400, durationMs: 500, element: 'as-tag', effect: 'stamp' },
      { atMs: 800, durationMs: 400, element: 'as-ready', effect: 'rise' },
    ],
  },
  {
    key: 'ai-talk',
    journey: 'B',
    order: 4,
    name: 'AI table talk',
    line: 'AI table talk (per AI_BEHAVIOR_CONTRACT)',
    timeline: [
      { atMs: 0, durationMs: 600, element: 'at-world', effect: 'world-in' },
      { atMs: 400, durationMs: 450, element: 'at-observe', effect: 'chain-link' },
      { atMs: 800, durationMs: 450, element: 'at-belief', effect: 'chain-link' },
      { atMs: 1200, durationMs: 450, element: 'at-action', effect: 'chain-link' },
      { atMs: 1600, durationMs: 450, element: 'at-intent', effect: 'chain-link' },
      { atMs: 2000, durationMs: 500, element: 'at-talk', effect: 'speak' },
      { atMs: 2400, durationMs: 300, element: 'at-return', effect: 'return' },
    ],
  },
  {
    key: 'ai-result',
    journey: 'B',
    order: 5,
    name: 'AI result',
    line: 'AI result',
    timeline: [
      { atMs: 0, durationMs: 0, element: 'ar-person', effect: 'person-stays' },
      { atMs: 300, durationMs: 700, element: 'ar-limits', effect: 'flip' },
      { atMs: 900, durationMs: 500, element: 'ar-tag', effect: 'stamp' },
      { atMs: 1300, durationMs: 500, element: 'ar-actions', effect: 'rise' },
    ],
  },
  {
    key: 'profile-training',
    journey: 'B',
    order: 6,
    name: 'Profile / training',
    line: 'Profile/training update',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'pt-card', effect: 'rise' },
      { atMs: 300, durationMs: 500, element: 'pt-line', effect: 'fade-in' },
      { atMs: 700, durationMs: 500, element: 'pt-meter', effect: 'fill' },
    ],
  },
  {
    key: 'play-again',
    journey: 'B',
    order: 7,
    name: 'Play again',
    line: 'Play Again / back to Bay',
    timeline: [
      { atMs: 0, durationMs: 400, element: 'pa-stage', effect: 'stage-in' },
      { atMs: 300, durationMs: 400, element: 'pa-again', effect: 'rise' },
      { atMs: 600, durationMs: 400, element: 'pa-bay', effect: 'rise' },
    ],
  },
];

export const ALL_STATES: GoldenState[] = [...JOURNEY_A, ...JOURNEY_B];

export function goldenState(key: string): GoldenState | undefined {
  return ALL_STATES.find((s) => s.key === key);
}
