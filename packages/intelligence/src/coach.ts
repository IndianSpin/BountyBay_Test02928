/**
 * Coaching composer (IN-5, DEC-028, docs/18 §7 + docs/20). Structured
 * input → validated structured output, deterministic throughout.
 *
 * - Every output field carries its claim level (docs/18 §2): L1
 *   objective match facts, L3 research-supported principles (register
 *   phrasing per evidence grade), L4 interpretive coaching hypotheses.
 * - The evidence-grade register comes from IN-4's gradeStatement; no
 *   claim without a citation.
 * - Free-form output is REJECTED, never repeated: the only LLM seam is
 *   a provider stub whose non-null (free-form) suggestion makes
 *   composeCoach throw. The deterministic template output is identical
 *   with or without a provider.
 * - Failure modes (§13): no research found → deterministic fallback
 *   text, empty citations, certainty ONE_POSSIBILITY — evidence is
 *   never invented. Unknown observation type → fall back to the
 *   objective Game Review facts (certainty STATES).
 */

import type { PlayerId } from '@bounty-bay/domain';
import { gradeStatement, type KnowledgeRecord } from './knowledge';
import type { ConceptMapping } from './mappings';
import type { MatchObservation, ObservationType } from './types';
import type { ReviewMoment } from './curate';

export const COACH_COMPOSER_VERSION = 'coaching-composer-0.1.0';

export type ClaimLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface ClaimField {
  level: ClaimLevel;
  text: string;
}

export type CertaintyLanguage =
  | 'STATES'
  | 'RESEARCH_SUGGESTS'
  | 'FRAMEWORK_RECOMMENDS'
  | 'PRACTITIONER_APPROACH'
  | 'ONE_POSSIBILITY';

export interface CoachInput {
  playerId: PlayerId;
  matchId: string;
  /** The player-scoped observation being coached. */
  observation: MatchObservation;
  /** The curated review moment for the same observation, when the review surfaced one. */
  moment: ReviewMoment | null;
  /** Mapping-store lookup for the observation type (may be empty). */
  concepts: ConceptMapping[];
  /** Retrieved knowledge records (may be empty — see §13). */
  research: KnowledgeRecord[];
  /** Structured coaching objective id (e.g. 'CONCESSION_DISCIPLINE'), or null. */
  objective: string | null;
}

export interface CoachOutput {
  version: string;
  observationType: ObservationType;
  headline: ClaimField;
  observation: ClaimField;
  why_it_matters: ClaimField;
  research_context: ClaimField;
  suggested_action: ClaimField;
  practice_recommendation: ClaimField;
  citations: string[];
  certainty_language: CertaintyLanguage;
}

/** LLM seam (stub only — BB-231): a provider may PROPOSE free-form text. */
export interface LlmProvider {
  supplement(input: CoachInput, draft: CoachOutput): string | null;
}

/** The deterministic provider: proposes nothing. Output is identical with it. */
export const NOOP_LLM: LlmProvider = { supplement: () => null };

export const FALLBACK_RESEARCH_CONTEXT =
  'No curated research found for this observation — no evidence is invented here. The deterministic Game Review remains the full source of facts.';

const GRADE_RANK: Record<KnowledgeRecord['evidence_level'], number> = { A: 0, B: 1, C: 2, D: 3 };

/** Deterministic research selection: tags ∩ concepts, best grade first, then id order; at most 3. */
export function selectResearch(research: KnowledgeRecord[], concepts: ConceptMapping[]): KnowledgeRecord[] {
  const conceptSet = new Set(concepts.map((c) => c.concept));
  return research
    .filter((record) => record.ontology_tags.some((tag) => conceptSet.has(tag)))
    .sort((a, b) => (GRADE_RANK[a.evidence_level] !== GRADE_RANK[b.evidence_level] ? GRADE_RANK[a.evidence_level] - GRADE_RANK[b.evidence_level] : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, 3);
}

// -- fixed templates (L1 copy per type; L4 practice actions) ---------------

interface CoachTemplate {
  headline: string;
  observation: string;
  suggestedAction: string;
  practiceRecommendation: string;
}

const TEMPLATES: Partial<Record<ObservationType, CoachTemplate>> = {
  STRONG_OPENING_POSITION: {
    headline: 'YOUR OPENING SAT NEAR THEIR LIMIT',
    observation: 'Your opening claimed a position close to — or beyond — the opponent\'s limit.',
    suggestedAction: 'One option worth trying is calibrating the opening against what you can learn about their limit before you sit down.',
    practiceRecommendation: 'Replay the opening in practice: vary the position and observe how the opponent\'s first response changes.',
  },
  CONSERVATIVE_OPENING: {
    headline: 'YOUR OPENING STAYED BESIDE YOUR OWN LIMIT',
    observation: 'Your opening sat close to your own limit, leaving most of the range unclaimed.',
    suggestedAction: 'One option is preparing an opening slightly beyond your comfort position next match.',
    practiceRecommendation: 'Practice opening positions: pick a target two steps past your usual first number and play it out.',
  },
  LARGE_OPENING: {
    headline: 'YOUR OPENING WAS FAR FROM YOUR LIMIT',
    observation: 'Your opening move was unusually distant from your own limit.',
    suggestedAction: 'One option is testing whether the large opening anchors the range toward your target or invites an early stall.',
    practiceRecommendation: 'Practice two openings for the same scenario — one large, one moderate — and compare the resulting ranges.',
  },
  UNRECIPROCATED_CONCESSION: {
    headline: 'YOU MOVED WHILE THEY HELD',
    observation: 'You conceded while their position had not changed since your previous move.',
    suggestedAction: 'One option is pairing your next concession with a small ask, so movement is exchanged rather than given.',
    practiceRecommendation: 'Play a match where every concession must be accompanied by a message or a paired request — observe the difference.',
  },
  CONSECUTIVE_UNILATERAL_CONCESSIONS: {
    headline: 'A RUN OF ONE-SIDED MOVES',
    observation: 'You made consecutive concessions without reciprocal movement from the other side.',
    suggestedAction: 'One option is holding your position for one full turn after a concession before moving again.',
    practiceRecommendation: 'Practice the hold: concede once, then refuse to move until the opponent\'s offer changes.',
  },
  LARGEST_CONCESSION: {
    headline: 'YOUR LARGEST SINGLE GIVE',
    observation: 'The match contained one concession clearly larger than the rest.',
    suggestedAction: 'One option is breaking large concessions into smaller, spaced steps next time.',
    practiceRecommendation: 'Practice step sizing: plan the concession ladder before the match and stay on it.',
  },
  LATE_LARGE_CONCESSION: {
    headline: 'A LARGE GIVE LATE IN THE MATCH',
    observation: 'Your largest concession arrived in the final third of the match.',
    suggestedAction: 'One option is front-loading smaller tests so late moves never need to be this large.',
    practiceRecommendation: 'Practice the late game with a fixed remaining budget: never give more than one step per turn.',
  },
  DECLINING_CONCESSIONS: {
    headline: 'YOUR CONCESSIONS SHRANK',
    observation: 'Your concession sizes declined move over move.',
    suggestedAction: 'One option is signaling that the shrinking steps are deliberate — the pattern reads as approaching your limit.',
    practiceRecommendation: 'Practice shrinking ladders and watch where the opponent starts accepting.',
  },
  INCREASING_CONCESSIONS: {
    headline: 'YOUR CONCESSIONS GREW',
    observation: 'Your concession sizes increased move over move.',
    suggestedAction: 'One option is checking whether growing steps signal growing flexibility you did not intend.',
    practiceRecommendation: 'Practice fixed-size concession ladders and compare the opponent\'s responses.',
  },
  FAST_CONCESSION_AFTER_RESISTANCE: {
    headline: 'QUICK RETREAT UNDER RESISTANCE',
    observation: 'You conceded within seconds of the opponent holding their position.',
    suggestedAction: 'One option is pausing a full beat after resistance before answering at all.',
    practiceRecommendation: 'Practice a minimum-response-time rule: no offer inside a set delay after a hold.',
  },
  LONG_HOLD: {
    headline: 'YOU TOOK YOUR TIME',
    observation: 'One or more of your decisions ran 30 seconds or longer.',
    suggestedAction: 'One option is using long decisions deliberately — the hold itself is information to the other side.',
    practiceRecommendation: 'Practice deciding between a fast reply and a deliberate hold before each turn.',
  },
  TIME_PRESSURE_EXPOSURE: {
    headline: 'YOU PLAYED INSIDE THE LOW-TIME WINDOW',
    observation: 'A meaningful share of your decision time ran inside the low-time window.',
    suggestedAction: 'One option is banking decisions early so the endgame never runs hot.',
    practiceRecommendation: 'Practice a fixed per-move time budget in friend matches.',
  },
  HIGH_CHIP_SPEND: {
    headline: 'HEAVY CHIP SPEND',
    observation: 'You spent a large share of your chip budget.',
    suggestedAction: 'One option is reserving chips for the moves that most need them.',
    practiceRecommendation: 'Practice a low-spend match: identify the minimum chips each move actually needs.',
  },
  LOW_CHIP_SPEND: {
    headline: 'LIGHT CHIP SPEND',
    observation: 'You spent a small share of your chip budget across the match.',
    suggestedAction: 'One option is checking whether unused chips could have bought information at key moments.',
    practiceRecommendation: 'Practice one high-information chip move per match and compare outcomes.',
  },
  EFFICIENT_CLOSE: {
    headline: 'EFFICIENT CLOSE',
    observation: 'The deal closed in few offers with modest chip spend.',
    suggestedAction: 'One option is replaying the close to see which early moves made it this cheap.',
    practiceRecommendation: 'Practice closing sequences that preserve the same efficiency under resistance.',
  },
  DEAL_NEAR_OWN_LIMIT: {
    headline: 'THE DEAL SAT AT YOUR LIMIT',
    observation: 'The settlement landed within a tenth of your own limit.',
    suggestedAction: 'One option is examining whether your reservation value was visible in your concession pattern.',
    practiceRecommendation: 'Practice hiding your limit: vary step sizes so the ladder never points at one number.',
  },
  DEAL_NEAR_OPPONENT_LIMIT: {
    headline: 'THE DEAL SAT AT THEIR LIMIT',
    observation: 'The settlement landed within a tenth of the opponent\'s limit.',
    suggestedAction: 'One option is recording how you got there — the sequence may be repeatable.',
    practiceRecommendation: 'Practice extending a favorable position without breaking the deal.',
  },
  STRONG_SURPLUS_CAPTURE: {
    headline: 'YOU CAPTURED MOST OF THE SURPLUS',
    observation: 'You claimed a large share of the available surplus.',
    suggestedAction: 'One option is testing whether the same position could have pushed slightly further.',
    practiceRecommendation: 'Practice re-running the same match script with one extra turn of ambition.',
  },
  LOW_SURPLUS_CAPTURE: {
    headline: 'A THIN SHARE OF THE SURPLUS',
    observation: 'You claimed a small share of the available surplus.',
    suggestedAction: 'One option is revisiting the moment the settlement formed — the last concession is usually the lever.',
    practiceRecommendation: 'Practice endgames: refuse the first acceptable number once and measure the difference.',
  },
  MISSED_STANDING_OFFER: {
    headline: 'A STANDING DEAL WAS AVAILABLE',
    observation: 'A standing offer inside your limit remained when the match ended.',
    suggestedAction: 'One option is tracking the opponent\'s standing offer at every turn, especially before ending a match.',
    practiceRecommendation: 'Practice a pre-exit checklist: standing offer, remaining time, your limit — in that order.',
  },
  FAILED_POSITIVE_ZOPA: {
    headline: 'A DEAL WAS POSSIBLE',
    observation: 'A positive bargaining range existed and no agreement was reached.',
    suggestedAction: 'One option is treating range existence as a signal to keep the exchange open one turn longer.',
    practiceRecommendation: 'Practice range diagnosis: estimate the ZOPA from the first two offers and act on it.',
  },
  DEADLOCK: {
    headline: 'THE DEAL STALLED',
    observation: 'The final gap was small relative to the range, and the match ended without agreement.',
    suggestedAction: 'One option is making the smallest legal step in a deadlock rather than holding or leaving.',
    practiceRecommendation: 'Practice deadlock turns: one micro-concession, then reassess.',
  },
  TIMEOUT: {
    headline: 'TIME RAN OUT',
    observation: 'The decision budget expired before a choice was made.',
    suggestedAction: 'One option is setting a personal pre-deadline: decide by the warning tier, not the hard limit.',
    practiceRecommendation: 'Practice matches against a strict personal clock with no final-minute decisions allowed.',
  },
  FAST_CLOSE: {
    headline: 'THE CLOSE WAS FAST',
    observation: 'Agreement followed crossed offers within seconds.',
    suggestedAction: 'One option is checking whether the fast close locked in terms a slower close would have improved.',
    practiceRecommendation: 'Practice one delayed close per match: hold a full beat before accepting.',
  },
  SILENT_NEGOTIATION: {
    headline: 'A MATCH WITHOUT MESSAGES',
    observation: 'The match ran with formal offers and no messages from you.',
    suggestedAction: 'One option is adding one message per match — pitch, question, or acknowledgment — and observing the response.',
    practiceRecommendation: 'Practice one-message matches: send exactly one message and note what changes.',
  },
  OFFER_WITH_PITCH: {
    headline: 'OFFERS WITH A PITCH',
    observation: 'One or more of your offers arrived moments after a message.',
    suggestedAction: 'One option is checking whether pitched offers landed better than silent ones in this match.',
    practiceRecommendation: 'Practice pitch discipline: one offer with pitch, one without, compare the responses.',
  },
};

const FALLBACK_HEADLINE = 'GAME REVIEW FALLBACK';
const FALLBACK_OBSERVATION = 'The deterministic Game Review is the source of facts for this observation.';
const FALLBACK_WHY = 'No coaching interpretation is available for this observation yet.';
const FALLBACK_ACTION = 'Review the match timeline and moments in the Game Review.';
const FALLBACK_PRACTICE = 'Replay the match in practice mode and try one alternative at the key moment.';

function l1(text: string): ClaimField {
  return { level: 'L1', text };
}
function l3(text: string): ClaimField {
  return { level: 'L3', text };
}
function l4(text: string): ClaimField {
  return { level: 'L4', text };
}

export class ComposerError extends Error {}

/** Composes deterministic coach output; rejects free-form supplements (§7). */
export function composeCoach(input: CoachInput, llm: LlmProvider = NOOP_LLM): CoachOutput {
  const template = TEMPLATES[input.observation.type];

  // Unknown observation type → §13 fallback to objective Game Review facts.
  if (!template) {
    const output: CoachOutput = {
      version: COACH_COMPOSER_VERSION,
      observationType: input.observation.type,
      headline: l1(input.moment?.headline ?? FALLBACK_HEADLINE),
      observation: l1(input.moment?.detail ?? FALLBACK_OBSERVATION),
      why_it_matters: l4(FALLBACK_WHY),
      research_context: l1(FALLBACK_RESEARCH_CONTEXT),
      suggested_action: l4(FALLBACK_ACTION),
      practice_recommendation: l4(FALLBACK_PRACTICE),
      citations: [],
      certainty_language: 'STATES',
    };
    const freeForm = llm.supplement(input, output);
    if (freeForm !== null) throw new ComposerError('unsupported free-form output rejected (§7)');
    return output;
  }

  const selected = selectResearch(input.research, input.concepts);
  const top = selected[0] ?? null;
  const statement = top !== null ? gradeStatement(top) : null;
  const certainty: CertaintyLanguage = statement === null ? 'ONE_POSSIBILITY' : statement.register;

  const output: CoachOutput = {
    version: COACH_COMPOSER_VERSION,
    observationType: input.observation.type,
    headline: l1(input.moment?.headline ?? template.headline),
    observation: l1(input.moment?.detail ?? template.observation),
    why_it_matters:
      statement !== null
        ? l3(statement.phrase)
        : l4('One possibility is that this shaped the outcome — the Game Review timeline shows where it sat in the match.'),
    research_context:
      statement !== null
        ? l3(`${statement.phrase} ${top!.conditions}`)
        : l1(FALLBACK_RESEARCH_CONTEXT),
    suggested_action: l4(template.suggestedAction),
    practice_recommendation: l4(template.practiceRecommendation),
    citations: selected.map((record) => record.citation_text),
    certainty_language: certainty,
  };

  // The LLM seam: any non-null proposal is free-form and gets rejected —
  // deterministic output is the only output (§7 "rejected, not repeated").
  const freeForm = llm.supplement(input, output);
  if (freeForm !== null) throw new ComposerError('unsupported free-form output rejected (§7)');

  return output;
}

export interface OutputValidationError {
  field: string;
  message: string;
}

/** Structural validation of coach output against its input (§7). */
export function validateCoachOutput(output: CoachOutput, input: CoachInput): OutputValidationError[] {
  const errors: OutputValidationError[] = [];
  const fail = (field: string, message: string) => errors.push({ field, message });

  if (output.version !== COACH_COMPOSER_VERSION) fail('version', `version must be ${COACH_COMPOSER_VERSION}`);
  if (output.headline.level !== 'L1' || !output.headline.text.trim()) fail('headline', 'headline must be a non-empty L1 field');
  if (output.observation.level !== 'L1' || !output.observation.text.trim()) fail('observation', 'observation must be a non-empty L1 field');
  if (!['L3', 'L4'].includes(output.why_it_matters.level) || !output.why_it_matters.text.trim()) fail('why_it_matters', 'why_it_matters must be a non-empty L3/L4 field');
  if (!['L1', 'L3'].includes(output.research_context.level) || !output.research_context.text.trim()) fail('research_context', 'research_context must be a non-empty L1/L3 field');
  if (output.suggested_action.level !== 'L4' || !output.suggested_action.text.trim()) fail('suggested_action', 'suggested_action must be a non-empty L4 field');
  if (output.practice_recommendation.level !== 'L4' || !output.practice_recommendation.text.trim()) fail('practice_recommendation', 'practice_recommendation must be a non-empty L4 field');
  if (!['STATES', 'RESEARCH_SUGGESTS', 'FRAMEWORK_RECOMMENDS', 'PRACTITIONER_APPROACH', 'ONE_POSSIBILITY'].includes(output.certainty_language)) {
    fail('certainty_language', `unknown certainty language ${output.certainty_language}`);
  }

  // citations must come from the input's research records — never invented
  const known = new Set(input.research.map((record) => record.citation_text));
  for (const citation of output.citations) {
    if (!known.has(citation)) fail('citations', `citation not present in input research: ${citation.slice(0, 60)}…`);
  }
  if (output.citations.length > 3) fail('citations', 'at most 3 citations');
  if (output.citations.length > 0 && output.certainty_language === 'STATES') {
    fail('certainty_language', 'STATES output must carry no citations (facts only)');
  }
  return errors;
}
