/**
 * AI table talk (BB-254, AI_BEHAVIOR_CONTRACT §3 of
 * .agents/CANONICAL_CONTRACTS.md, D-70). The deterministic AI-turn
 * pipeline:
 *
 *   OBSERVE (legal view only) → UPDATE BELIEFS → legal economic action
 *   (PASSED IN — never invented here) → CHOOSE SOCIAL INTENT → GENERATE
 *   TABLE TALK → RETURN CONTROL.
 *
 * Hard rules:
 * - Deterministic only: no LLM, no RNG — fixture selection is a hash of
 *   (matchId, roundNumber, intent).
 * - Hidden information never enters: the input types have no
 *   reservation-value fields, and opponent message CONTENT is never
 *   read (presence only). Fixtures may reference only public match
 *   facts — both players' offers are public within a live match.
 * - The language layer never makes or changes a move: the economic
 *   action arrives from the persona layer and is returned unchanged;
 *   domain validation stays in packages/domain.
 * - Graceful fallback: if generation fails or times out, a
 *   deterministic fallback line ships instead — non-response is
 *   impossible.
 * - Bluff fixtures are vague claims about resolve, never fabricated
 *   verifiable facts.
 */

import type { PersonaKey } from './drills';

export const TABLE_TALK_VERSION = 'table-talk-0.1.0';

export type SocialIntent =
  | 'PROBE'
  | 'CHALLENGE'
  | 'JUSTIFY'
  | 'REQUEST_RECIPROCITY'
  | 'HOLD'
  | 'SIGNAL_FINALITY'
  | 'CONDITIONAL_CLOSE'
  | 'PRESSURE'
  | 'DISCLOSE'
  | 'BLUFF';

export const SOCIAL_INTENTS: readonly SocialIntent[] = [
  'PROBE',
  'CHALLENGE',
  'JUSTIFY',
  'REQUEST_RECIPROCITY',
  'HOLD',
  'SIGNAL_FINALITY',
  'CONDITIONAL_CLOSE',
  'PRESSURE',
  'DISCLOSE',
  'BLUFF',
];

export type AiEconomicAction = { kind: 'OFFER' | 'ACCEPT' | 'WALK_AWAY'; amountTenths?: number };

/**
 * Legal-view observations for one AI turn. No reservation values, no
 * message content — only facts both players can see in the match.
 */
export interface AiObservationInput {
  matchId: string;
  /** 1-based turn index. */
  roundNumber: number;
  role: 'BUYER' | 'SELLER';
  myLatestOfferTenths: number | null;
  opponentLatestOfferTenths: number | null;
  /** Consecutive opponent concessions toward me (their latest kept improving for me). */
  opponentConcessionRun: number;
  /** Opponent's last decision time in ms, when known. */
  opponentLastDecisionMs: number | null;
  /** Presence only — message content is never read by this module. */
  opponentMessageCount: number;
  /** The opponent's latest offer was unchanged since their previous one. */
  opponentHeldLastTurn: boolean;
  crossedOffers: boolean;
  /** The persona's legal decision — passed through, never altered. */
  economicAction: AiEconomicAction;
  personaKey: PersonaKey;
}

export type FlexibilityBelief = 'UNKNOWN' | 'FLEXIBLE' | 'HOLDING';
export type TimePostureBelief = 'UNKNOWN' | 'PATIENT' | 'PRESSED';

export interface AiBeliefs {
  opponentFlexibility: FlexibilityBelief;
  opponentTimePosture: TimePostureBelief;
}

export function initialBeliefs(): AiBeliefs {
  return { opponentFlexibility: 'UNKNOWN', opponentTimePosture: 'UNKNOWN' };
}

/** UPDATE BELIEFS — coarse three-state judgments over legal-view observations only. */
export function updateBeliefs(prev: AiBeliefs, input: AiObservationInput): AiBeliefs {
  let flexibility = prev.opponentFlexibility;
  if (input.opponentConcessionRun >= 2) flexibility = 'FLEXIBLE';
  else if (input.opponentHeldLastTurn && input.crossedOffers) flexibility = 'HOLDING';

  let posture = prev.opponentTimePosture;
  if (input.opponentLastDecisionMs !== null) {
    if (input.opponentLastDecisionMs >= 30_000) posture = 'PATIENT';
    else if (input.opponentLastDecisionMs <= 5_000) posture = 'PRESSED';
  }
  return { opponentFlexibility: flexibility, opponentTimePosture: posture };
}

// -- CHOOSE SOCIAL INTENT ------------------------------------------------------

const FINALITY_DEFAULT: Record<PersonaKey, SocialIntent> = {
  anchor: 'BLUFF',
  grinder: 'JUSTIFY',
  closer: 'CONDITIONAL_CLOSE',
  wall: 'HOLD',
  mirror: 'PROBE',
};

/** Deterministic intent decision, in contract order (finality first). */
export function selectIntent(input: AiObservationInput, beliefs: AiBeliefs): SocialIntent {
  const action = input.economicAction;
  if (action.kind === 'ACCEPT') return 'CONDITIONAL_CLOSE';
  if (action.kind === 'WALK_AWAY') return 'SIGNAL_FINALITY';

  // OFFER — social intent depends on the exchange so far
  const myOffer = input.myLatestOfferTenths;
  const oppOffer = input.opponentLatestOfferTenths;
  const gap = myOffer !== null && oppOffer !== null ? Math.abs(myOffer - oppOffer) : null;

  if (input.opponentHeldLastTurn && myOffer !== null && action.amountTenths !== undefined && action.amountTenths !== myOffer) {
    return 'REQUEST_RECIPROCITY'; // I just moved toward them and they had not
  }
  if (input.opponentHeldLastTurn && beliefs.opponentFlexibility === 'HOLDING') return 'CHALLENGE';
  if (input.opponentConcessionRun >= 2) return input.personaKey === 'wall' || input.personaKey === 'mirror' ? 'HOLD' : 'PRESSURE';
  if (input.crossedOffers && gap !== null && gap <= 100) return 'CONDITIONAL_CLOSE';
  if (input.opponentMessageCount === 0 && input.roundNumber >= 3) return 'PROBE';
  if (beliefs.opponentTimePosture === 'PRESSED') return 'PRESSURE';
  if (input.personaKey === 'anchor' && input.roundNumber <= 3) return 'DISCLOSE';
  return FINALITY_DEFAULT[input.personaKey];
}

// -- GENERATE TABLE TALK --------------------------------------------------------

type Fixture = string | ((input: AiObservationInput) => string);

const TALK_FIXTURES: Record<SocialIntent, readonly Fixture[]> = {
  PROBE: [
    'Still with me? I\'d rather hear where you stand than guess.',
    'What would make this work for you?',
    'Before I answer, tell me: is that your best position?',
  ],
  CHALLENGE: [
    'That number hasn\'t moved. Are we negotiating, or is that your limit?',
    'You\'ve held that position for a while — what\'s behind it?',
    'I can wait for a real move. Holding forever ends the same way for both of us.',
  ],
  JUSTIFY: [
    (input) => `I've moved to ${input.economicAction.amountTenths ?? input.myLatestOfferTenths ?? 'a new position'}. That's a real step — your turn to meet it.`,
    (input) => `My move is on the table: ${input.economicAction.amountTenths ?? input.myLatestOfferTenths ?? 'a fair step'}. I made it because I want this done, not because I have to move.`,
    'I don\'t move without a reason. This move is mine — respond to it.',
  ],
  REQUEST_RECIPROCITY: [
    'I moved. Now you move — that\'s how this works.',
    'One side doing all the walking isn\'t a negotiation. Meet me partway.',
    'I\'ve given ground twice now. Your turn.',
  ],
  HOLD: [
    'My position stands.',
    'I\'m comfortable right here. The clock can wait with me.',
    'No movement from my side this round.',
  ],
  SIGNAL_FINALITY: [
    'This is my final position.',
    'Last number from me — take it or leave it.',
    'I\'ve said my piece. I won\'t move again.',
  ],
  CONDITIONAL_CLOSE: [
    (input) => `If you can meet ${input.economicAction.amountTenths ?? input.myLatestOfferTenths ?? 'this'}, we're done right now.`,
    (input) => `Here's the deal: ${input.economicAction.amountTenths ?? input.myLatestOfferTenths ?? 'these terms'} and we shake on it.`,
    'Agreement is one step away — say yes and it\'s over.',
  ],
  PRESSURE: [
    'The clock doesn\'t care about either of us. Decide.',
    'Every minute you hold costs both of us the same nothing — but only one of us is still moving.',
    'I can keep this up all match. Can you?',
  ],
  DISCLOSE: [
    'I\'ll be plain: I think we\'re closer than the numbers look.',
    'Here\'s my honest read — we\'re both too far apart to keep pretending otherwise.',
    'I\'m telling you where I stand because guessing wastes the clock.',
  ],
  BLUFF: [
    'I have all the patience this match needs — and then some.',
    'I can hold this line longer than you\'d believe.',
    'Walking away costs me nothing today.',
  ],
};

/** Fallback lines per intent — generation failure still produces one of these. */
const FALLBACK_TALK: Record<SocialIntent, string> = {
  PROBE: 'Where do you stand?',
  CHALLENGE: 'That position is not moving. Why?',
  JUSTIFY: 'I made a move — now you.',
  REQUEST_RECIPROCITY: 'I moved. Your turn.',
  HOLD: 'Holding my position.',
  SIGNAL_FINALITY: 'This is my final position.',
  CONDITIONAL_CLOSE: 'Meet my number and we close.',
  PRESSURE: 'Decide.',
  DISCLOSE: 'I am showing you my position.',
  BLUFF: 'I can hold this line.',
};

const GENERIC_FALLBACK = 'Your move.';

/** FNV-1a over the fixture key — deterministic, no RNG. */
function fixtureIndex(key: string, count: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}

/** Resolves the deterministic fixture for (intent, matchId, roundNumber). Throws on unknown intent — runAiTurn falls back instead. */
export function generateTableTalk(input: AiObservationInput, intent: SocialIntent): string {
  const fixtures = TALK_FIXTURES[intent];
  if (!fixtures || fixtures.length === 0) throw new Error(`no fixtures for social intent ${intent}`);
  const key = `${input.matchId}|${input.roundNumber}|${intent}`;
  const fixture = fixtures[fixtureIndex(key, fixtures.length)]!;
  const talk = typeof fixture === 'function' ? fixture(input) : fixture;
  if (!talk || talk.trim() === '') throw new Error(`empty table talk generated for intent ${intent}`);
  return talk;
}

// -- RETURN CONTROL --------------------------------------------------------------

export interface AiTurnResult {
  intent: SocialIntent;
  /** Never empty — a deterministic fallback line ships if generation fails. */
  talk: string;
  beliefs: AiBeliefs;
  /** Identical to the input action — the language layer never changes a move. */
  economicAction: AiEconomicAction;
}

export type TalkGenerator = (input: AiObservationInput, intent: SocialIntent) => string;

/**
 * One full AI turn. Generation failures are caught and replaced with a
 * deterministic fallback line — non-response is impossible by
 * construction.
 */
export function runAiTurn(
  input: AiObservationInput,
  prevBeliefs: AiBeliefs,
  generate: TalkGenerator = generateTableTalk,
): AiTurnResult {
  const beliefs = updateBeliefs(prevBeliefs, input);
  const intent = selectIntent(input, beliefs);
  let talk: string;
  try {
    talk = generate(input, intent);
  } catch {
    talk = FALLBACK_TALK[intent] ?? GENERIC_FALLBACK;
  }
  if (!talk || talk.trim() === '') talk = FALLBACK_TALK[intent] ?? GENERIC_FALLBACK;
  return { intent, talk, beliefs, economicAction: input.economicAction };
}
