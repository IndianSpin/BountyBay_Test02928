/**
 * GOLDEN STATE CONTRACTS (BB-256 point 2): the contract as DATA.
 * Each journey state declares:
 *   - elements: required elements with a golden selector, a live
 *     selector (the app's own markup — the GATE checks the live app
 *     against the same contract), and minimum rendered sizes;
 *   - noOverlap: pairs of element ids that must not intersect
 *     (bounding boxes, checked on the golden page);
 *   - forbidden: forbidden patterns, in the founder's words;
 *   - timeline: the animation timeline (single source:
 *     journey-data.ts — the golden pages and the GATE read it here).
 *
 * The GATE consumes this file directly (E2E specs compile app TS), so
 * the golden pages, the live app and the gate can never drift apart:
 * the contract is the single source of truth.
 */

import { ALL_STATES, JOURNEY_A, JOURNEY_B, type GoldenState, type TimelineBeat } from './journey-data';

export interface ContractElement {
  /** stable element id — also the data-golden value on the golden page */
  id: string;
  /** selector locating the element on the golden page */
  golden: string;
  /** selector locating the element on the live app (null = golden-only garnish) */
  live: string | null;
  /** minimum rendered size (px) — checked at the SMALLER viewport */
  minW: number;
  minH: number;
  /** what the element is, for the failure report */
  note: string;
}

export interface StateContract {
  state: string;
  journey: 'A' | 'B';
  order: number;
  name: string;
  elements: ContractElement[];
  noOverlap: [string, string][];
  forbidden: string[];
  timeline: TimelineBeat[];
}

const GOLDEN = (id: string): string => `[data-golden="${id}"]`;

/** Shared contract fragments — the frame every golden state renders. */
const FRAME: ContractElement[] = [
  {
    id: 'golden-frame',
    golden: '[data-golden="golden-frame"]',
    live: null,
    minW: 320,
    minH: 420,
    note: 'the golden frame chrome (state header + composition)',
  },
  {
    id: 'golden-title',
    golden: '[data-golden="golden-title"]',
    live: null,
    minW: 160,
    minH: 24,
    note: 'the state title in the golden frame header',
  },
];

const A = JOURNEY_A.map((s) => s);
const B = JOURNEY_B.map((s) => s);
void A;
void B;

export const CONTRACTS: StateContract[] = [
  {
    state: 'bay',
    journey: 'A',
    order: 1,
    name: 'The Bay',
    elements: [
      ...FRAME,
      { id: 'bay-table', golden: GOLDEN('bay-table'), live: '[data-testid="bay-table"]', minW: 240, minH: 140, note: 'the gold table' },
      { id: 'bay-letters', golden: GOLDEN('bay-letters'), live: '[data-testid="bay-letters"]', minW: 160, minH: 80, note: 'the letters slot' },
      { id: 'bay-slots', golden: GOLDEN('bay-slots'), live: null, minW: 240, minH: 60, note: 'the SOON slot row' },
      { id: 'bay-practice', golden: GOLDEN('bay-practice'), live: '[data-testid="bay-practice"]', minW: 160, minH: 80, note: 'the practice room' },
      { id: 'bay-me', golden: GOLDEN('bay-me'), live: '[data-testid="bay-me"]', minW: 140, minH: 80, note: 'the ME standing card' },
    ],
    noOverlap: [
      ['bay-table', 'bay-letters'],
      ['bay-table', 'bay-slots'],
      ['bay-table', 'bay-practice'],
      ['bay-table', 'bay-me'],
    ],
    forbidden: [
      'no element wider than the viewport (no horizontal scroll)',
      'no fabricated liquidity numbers — honest copy only',
      'SOON slots carry no controls',
    ],
    timeline: JOURNEY_A[0]!.timeline,
  },
  {
    state: 'battle-selection',
    journey: 'A',
    order: 2,
    name: 'Battle selection',
    elements: [
      ...FRAME,
      { id: 'bs-heading', golden: GOLDEN('bs-heading'), live: null, minW: 160, minH: 28, note: 'PLAY A PERSON heading' },
      { id: 'bs-challenge', golden: GOLDEN('bs-challenge'), live: null, minW: 200, minH: 100, note: 'challenge someone card' },
      { id: 'bs-practice', golden: GOLDEN('bs-practice'), live: null, minW: 200, minH: 100, note: 'practice — not a person card' },
    ],
    noOverlap: [
      ['bs-challenge', 'bs-practice'],
      ['bs-heading', 'bs-challenge'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'ranked matchmaking is honest about its state (no fake queue numbers)',
      'AI practice is labeled — never presented as a person',
    ],
    timeline: JOURNEY_A[1]!.timeline,
  },
  {
    state: 'challenge-created',
    journey: 'A',
    order: 3,
    name: 'Challenge created',
    elements: [
      ...FRAME,
      { id: 'cc-seal', golden: GOLDEN('cc-seal'), live: null, minW: 180, minH: 90, note: 'the sealed challenge card' },
      { id: 'cc-share', golden: GOLDEN('cc-share'), live: '.share-input', minW: 180, minH: 28, note: 'the share link input' },
      { id: 'cc-wait', golden: GOLDEN('cc-wait'), live: null, minW: 120, minH: 20, note: 'waiting for opponent copy' },
    ],
    noOverlap: [
      ['cc-seal', 'cc-share'],
      ['cc-seal', 'cc-wait'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the share link is the whole invitation — no extra fabricated state',
    ],
    timeline: JOURNEY_A[2]!.timeline,
  },
  {
    state: 'opponent-joins',
    journey: 'A',
    order: 4,
    name: 'Opponent joins',
    elements: [
      ...FRAME,
      { id: 'oj-door', golden: GOLDEN('oj-door'), live: null, minW: 80, minH: 80, note: 'the door the opponent enters through' },
      { id: 'oj-kestrel', golden: GOLDEN('oj-kestrel'), live: '[data-testid="opponent-found"]', minW: 120, minH: 120, note: 'KESTREL in frame (real art)' },
      { id: 'oj-ready', golden: GOLDEN('oj-ready'), live: '[data-testid="ready-button"]', minW: 120, minH: 40, note: 'the READY counter button' },
    ],
    noOverlap: [
      ['oj-kestrel', 'oj-ready'],
      ['oj-door', 'oj-kestrel'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the opponent is a character first — no bare handle-only staging',
    ],
    timeline: JOURNEY_A[3]!.timeline,
  },
  {
    state: 'role-reveal',
    journey: 'A',
    order: 5,
    name: 'Role & dossier',
    elements: [
      ...FRAME,
      { id: 'rr-role', golden: GOLDEN('rr-role'), live: null, minW: 120, minH: 40, note: 'the role card (YOU ARE THE BUYER)' },
      { id: 'rr-rv', golden: GOLDEN('rr-rv'), live: '[data-testid="my-rv"]', minW: 60, minH: 24, note: 'the reservation value reveal' },
      { id: 'rr-dossier', golden: GOLDEN('rr-dossier'), live: '.lm-dossier', minW: 140, minH: 60, note: 'the dossier details' },
      { id: 'rr-opponent', golden: GOLDEN('rr-opponent'), live: '.lm-opponent', minW: 100, minH: 100, note: 'the opponent in frame' },
    ],
    noOverlap: [
      ['rr-rv', 'rr-dossier'],
      ['rr-role', 'rr-rv'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the RV reveal is private until the reveal moment — never pre-shown',
    ],
    timeline: JOURNEY_A[4]!.timeline,
  },
  {
    state: 'live-match',
    journey: 'A',
    order: 6,
    name: 'Live match',
    elements: [
      ...FRAME,
      { id: 'lm-world', golden: GOLDEN('lm-world'), live: '[data-testid="market-world"]', minW: 260, minH: 260, note: 'the market world' },
      { id: 'lm-opponent', golden: GOLDEN('lm-opponent'), live: '.lm-opponent', minW: 100, minH: 100, note: 'the opponent character in frame' },
      { id: 'lm-plaque', golden: GOLDEN('lm-plaque'), live: null, minW: 120, minH: 40, note: 'the offer plaque on the rail' },
      { id: 'lm-cross', golden: GOLDEN('lm-cross'), live: '[data-testid="crossed-ribbon"]', minW: 60, minH: 20, note: 'the crossed-offers ribbon' },
      { id: 'lm-close', golden: GOLDEN('lm-close'), live: null, minW: 120, minH: 24, note: 'the warm-close marker' },
      { id: 'lm-composer', golden: GOLDEN('lm-composer'), live: '[data-testid="offer-input"]', minW: 120, minH: 32, note: 'the offer composer input' },
    ],
    noOverlap: [
      ['lm-world', 'lm-composer'],
      ['lm-opponent', 'lm-plaque'],
    ],
    forbidden: [
      'no element wider than the viewport (the BB-232 class — this is the state that regressed)',
      'the interface shrinks to what the state needs — no dead controls',
      'one hero per state: the opponent dominates, the rail carries offers',
    ],
    timeline: JOURNEY_A[5]!.timeline,
  },
  {
    state: 'result',
    journey: 'A',
    order: 7,
    name: 'Result',
    elements: [
      ...FRAME,
      { id: 'rs-person', golden: GOLDEN('rs-person'), live: '[data-testid="result"] .lm-opponent', minW: 100, minH: 100, note: 'the opponent stays in frame' },
      { id: 'rs-limits', golden: GOLDEN('rs-limits'), live: '[data-testid="result-limits"]', minW: 160, minH: 40, note: 'the limits flip' },
      { id: 'rs-split', golden: GOLDEN('rs-split'), live: '[data-testid="result-split"]', minW: 160, minH: 40, note: 'the surplus split' },
      { id: 'rs-ledger', golden: GOLDEN('rs-ledger'), live: '[data-testid="result-ledger"]', minW: 160, minH: 40, note: 'the settlement ledger' },
      { id: 'rs-ring', golden: GOLDEN('rs-ring'), live: '[data-testid="rematch-prompt"]', minW: 160, minH: 40, note: 'the rematch offer ring' },
      { id: 'rs-actions', golden: GOLDEN('rs-actions'), live: '[data-testid="analyze-deal"]', minW: 80, minH: 24, note: 'the result actions (review the deal)' },
    ],
    noOverlap: [
      ['rs-person', 'rs-limits'],
      ['rs-limits', 'rs-split'],
      ['rs-limits', 'rs-ledger'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the opponent stays in frame — never swapped out for a logo',
      'the rematch window is decorative — proposals persist until answered',
    ],
    timeline: JOURNEY_A[6]!.timeline,
  },
  {
    state: 'review',
    journey: 'A',
    order: 8,
    name: 'Game review',
    elements: [
      ...FRAME,
      { id: 'rv-header', golden: GOLDEN('rv-header'), live: null, minW: 200, minH: 40, note: 'GAME REVIEW header + scenario title' },
      { id: 'rv-m-result', golden: GOLDEN('rv-m-result'), live: '[data-testid="moment-result"]', minW: 140, minH: 48, note: 'the result moment' },
      { id: 'rv-m-opening', golden: GOLDEN('rv-m-opening'), live: '[data-testid="moment-conservative-opening"]', minW: 140, minH: 48, note: 'the cautious opening moment' },
      { id: 'rv-m-limit', golden: GOLDEN('rv-m-limit'), live: '[data-testid="moment-deal-at-limit"]', minW: 140, minH: 48, note: 'the deal-at-limit moment' },
      { id: 'rv-m-close', golden: GOLDEN('rv-m-close'), live: '[data-testid="moment-fast-close"]', minW: 140, minH: 48, note: 'the fast close moment' },
      { id: 'rv-m-efficient', golden: GOLDEN('rv-m-efficient'), live: '[data-testid="moment-efficient-close"]', minW: 140, minH: 48, note: 'the efficient close moment' },
      { id: 'rv-timeline', golden: GOLDEN('rv-timeline'), live: '[data-testid="review-timeline"]', minW: 160, minH: 80, note: 'the match timeline' },
    ],
    noOverlap: [
      ['rv-m-result', 'rv-m-opening'],
      ['rv-header', 'rv-m-result'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'deterministic facts only — no opinion language',
      'moments never overlap one another',
    ],
    timeline: JOURNEY_A[7]!.timeline,
  },
  {
    state: 'rematch',
    journey: 'A',
    order: 9,
    name: 'Rematch',
    elements: [
      ...FRAME,
      { id: 'rm-letter', golden: GOLDEN('rm-letter'), live: '[data-testid="bay-letter"]', minW: 120, minH: 40, note: 'the sealed letter at The Bay' },
      { id: 'rm-stage', golden: GOLDEN('rm-stage'), live: null, minW: 220, minH: 160, note: 'the in-session rematch stage' },
      { id: 'rm-ring', golden: GOLDEN('rm-ring'), live: '[data-testid="rematch-prompt"]', minW: 160, minH: 40, note: 'the offer ring' },
      { id: 'rm-accept', golden: GOLDEN('rm-accept'), live: '[data-testid="rematch-accept"]', minW: 80, minH: 32, note: 'the ACCEPT control' },
    ],
    noOverlap: [
      ['rm-stage', 'rm-ring'],
      ['rm-letter', 'rm-stage'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'NOT NOW never deletes the proposal — it becomes a letter',
    ],
    timeline: JOURNEY_A[8]!.timeline,
  },
  {
    state: 'back-to-bay',
    journey: 'A',
    order: 10,
    name: 'Back to The Bay',
    elements: [
      ...FRAME,
      { id: 'bb-bay', golden: GOLDEN('bb-bay'), live: '[data-testid="bay"]', minW: 260, minH: 300, note: 'the Bay, settled' },
      { id: 'bb-table', golden: GOLDEN('bb-table'), live: '[data-testid="bay-table"]', minW: 240, minH: 140, note: 'the gold table' },
      { id: 'bb-letter', golden: GOLDEN('bb-letter'), live: '[data-testid="bay-letter"]', minW: 120, minH: 40, note: 'the sealed letter waiting' },
    ],
    noOverlap: [
      ['bb-table', 'bb-letter'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the return lands on the hub — never a dead end',
    ],
    timeline: JOURNEY_A[9]!.timeline,
  },
  {
    state: 'practice-entry',
    journey: 'B',
    order: 1,
    name: 'Practice entry',
    elements: [
      ...FRAME,
      { id: 'pe-bay', golden: GOLDEN('pe-bay'), live: '[data-testid="bay"]', minW: 260, minH: 300, note: 'the Bay' },
      { id: 'pe-practice', golden: GOLDEN('pe-practice'), live: '[data-testid="bay-practice"]', minW: 160, minH: 80, note: 'the practice room, spotlighted' },
    ],
    noOverlap: [],
    forbidden: ['no element wider than the viewport', 'practice is AI-labeled'],
    timeline: JOURNEY_B[0]!.timeline,
  },
  {
    state: 'persona-select',
    journey: 'B',
    order: 2,
    name: 'Select AI persona',
    elements: [
      ...FRAME,
      { id: 'ps-heading', golden: GOLDEN('ps-heading'), live: null, minW: 160, minH: 28, note: 'PICK YOUR PRACTICE heading' },
      { id: 'ps-card-1', golden: GOLDEN('ps-card-1'), live: '[data-testid="persona-anchor"]', minW: 120, minH: 120, note: 'the Anchor card' },
      { id: 'ps-card-2', golden: GOLDEN('ps-card-2'), live: '[data-testid="persona-grinder"]', minW: 120, minH: 120, note: 'the Grinder card' },
      { id: 'ps-card-3', golden: GOLDEN('ps-card-3'), live: '[data-testid="persona-closer"]', minW: 120, minH: 120, note: 'the Closer card' },
      { id: 'ps-card-4', golden: GOLDEN('ps-card-4'), live: '[data-testid="persona-wall"]', minW: 120, minH: 120, note: 'the Wall card' },
      { id: 'ps-card-5', golden: GOLDEN('ps-card-5'), live: '[data-testid="persona-mirror"]', minW: 120, minH: 120, note: 'the Mirror card' },
    ],
    noOverlap: [
      ['ps-card-1', 'ps-card-2'],
      ['ps-card-2', 'ps-card-3'],
      ['ps-card-3', 'ps-card-4'],
      ['ps-card-4', 'ps-card-5'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'persona cards are distinct — no two cards may touch',
      'personas are labeled AI — never presented as people',
    ],
    timeline: JOURNEY_B[1]!.timeline,
  },
  {
    state: 'ai-start',
    journey: 'B',
    order: 3,
    name: 'AI match start',
    elements: [
      ...FRAME,
      { id: 'as-card', golden: GOLDEN('as-card'), live: '[data-testid="opponent-found"]', minW: 120, minH: 120, note: 'the persona character in frame' },
      { id: 'as-tag', golden: GOLDEN('as-tag'), live: null, minW: 60, minH: 20, note: 'the practice · unrated tag' },
      { id: 'as-ready', golden: GOLDEN('as-ready'), live: '[data-testid="ready-button"]', minW: 120, minH: 40, note: 'the READY counter button' },
    ],
    noOverlap: [
      ['as-card', 'as-ready'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the AI opponent is a character first',
    ],
    timeline: JOURNEY_B[2]!.timeline,
  },
  {
    state: 'ai-talk',
    journey: 'B',
    order: 4,
    name: 'AI table talk',
    elements: [
      ...FRAME,
      { id: 'at-world', golden: GOLDEN('at-world'), live: '[data-testid="market-world"]', minW: 260, minH: 260, note: 'the market world' },
      { id: 'at-observe', golden: GOLDEN('at-observe'), live: null, minW: 100, minH: 40, note: 'OBSERVE chain link' },
      { id: 'at-belief', golden: GOLDEN('at-belief'), live: null, minW: 100, minH: 40, note: 'BELIEFS chain link' },
      { id: 'at-action', golden: GOLDEN('at-action'), live: null, minW: 100, minH: 40, note: 'ACTION chain link' },
      { id: 'at-intent', golden: GOLDEN('at-intent'), live: null, minW: 100, minH: 40, note: 'INTENT chain link' },
      { id: 'at-talk', golden: GOLDEN('at-talk'), live: '.lm-chat', minW: 100, minH: 40, note: 'the spoken line (TALK)' },
      { id: 'at-return', golden: GOLDEN('at-return'), live: null, minW: 100, minH: 20, note: 'RETURN to the table' },
    ],
    noOverlap: [
      ['at-world', 'at-observe'],
      ['at-observe', 'at-belief'],
      ['at-belief', 'at-action'],
      ['at-action', 'at-intent'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the talk chain follows OBSERVE→BELIEFS→ACTION→INTENT→TALK→RETURN in order',
      'table talk never reveals private data (no opponent RV)',
    ],
    timeline: JOURNEY_B[3]!.timeline,
  },
  {
    state: 'ai-result',
    journey: 'B',
    order: 5,
    name: 'AI result',
    elements: [
      ...FRAME,
      { id: 'ar-person', golden: GOLDEN('ar-person'), live: '[data-testid="result"] .lm-opponent', minW: 100, minH: 100, note: 'the persona stays in frame' },
      { id: 'ar-limits', golden: GOLDEN('ar-limits'), live: '[data-testid="result-limits"]', minW: 160, minH: 40, note: 'the limits flip' },
      { id: 'ar-tag', golden: GOLDEN('ar-tag'), live: null, minW: 80, minH: 20, note: 'the practice · unrated tag' },
      { id: 'ar-actions', golden: GOLDEN('ar-actions'), live: '[data-testid="back-to-bay"]', minW: 80, minH: 24, note: 'back to The Bay' },
    ],
    noOverlap: [
      ['ar-person', 'ar-limits'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'the result carries the practice · unrated tag — never a rating',
    ],
    timeline: JOURNEY_B[4]!.timeline,
  },
  {
    state: 'profile-training',
    journey: 'B',
    order: 6,
    name: 'Profile / training',
    elements: [
      ...FRAME,
      { id: 'pt-card', golden: GOLDEN('pt-card'), live: '[data-testid="bay-me"]', minW: 140, minH: 80, note: 'the standing card' },
      { id: 'pt-line', golden: GOLDEN('pt-line'), live: null, minW: 120, minH: 20, note: 'the training line' },
      { id: 'pt-meter', golden: GOLDEN('pt-meter'), live: null, minW: 120, minH: 12, note: 'the progress meter' },
    ],
    noOverlap: [
      ['pt-card', 'pt-meter'],
      ['pt-line', 'pt-meter'],
    ],
    forbidden: [
      'no element wider than the viewport',
      'training progress is honest — never fabricated numbers',
    ],
    timeline: JOURNEY_B[5]!.timeline,
  },
  {
    state: 'play-again',
    journey: 'B',
    order: 7,
    name: 'Play again',
    elements: [
      ...FRAME,
      { id: 'pa-stage', golden: GOLDEN('pa-stage'), live: '[data-testid="result"]', minW: 220, minH: 160, note: 'the result stage' },
      { id: 'pa-again', golden: GOLDEN('pa-again'), live: null, minW: 80, minH: 24, note: 'PLAY AGAIN' },
      { id: 'pa-bay', golden: GOLDEN('pa-bay'), live: '[data-testid="back-to-bay"]', minW: 80, minH: 24, note: 'back to The Bay' },
    ],
    noOverlap: [
      ['pa-again', 'pa-bay'],
    ],
    forbidden: ['no element wider than the viewport', 'play again never pretends to be rated'],
    timeline: JOURNEY_B[6]!.timeline,
  },
];

export function contractFor(state: string): StateContract | undefined {
  return CONTRACTS.find((c) => c.state === state);
}

/** The viewports every golden state renders at. */
export const GOLDEN_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

/** The founder's universal rules — checked on every state, both views. */
export const UNIVERSAL_FORBIDDEN = [
  'no element may render wider than the viewport (no horizontal scroll)',
  'no required element may be missing',
  'no contracted pair may overlap',
  'no required element may be clipped by an ancestor or the viewport edge',
  'the animation timeline must run in order, on the contracted timings',
];

export const ALL_CONTRACT_STATES: string[] = ALL_STATES.map((s: GoldenState) => s.key);
