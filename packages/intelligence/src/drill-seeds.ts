/**
 * Starter practice set (IN-6, BB-237, docs/18 §8): 10 WHAT WOULD YOU
 * DO? drills + 5 micro-lessons + a full 26-type recommendation table.
 *
 * - Every source is a knowledge-base citation text (cite() resolves ids
 *   against the founder-REVIEWED seeds and throws on any miss — no
 *   fabricated references can survive the build).
 * - No drill marks any option as "the answer": every drill has ≥ 2
 *   options with pairwise distinct outcomes (enforced in drills.ts).
 * - Persona references are DEC-025 persona keys as strings; the
 *   canonical §8 example holds: UNRECIPROCATED_CONCESSIONS → PLAY THE
 *   WALL ('wall').
 * - Daily/skill drills and streaks are OUT (OQ-026).
 */

import type { Drill, MicroLesson, PracticeRecommendation, PracticeSeedSet } from './drills';
import { KNOWLEDGE_SEEDS } from './knowledge-seeds';

const CITATIONS = new Map(KNOWLEDGE_SEEDS.map((record) => [record.id, record.citation_text]));

/** Resolve a seed id to its citation text — throws on a miss, so a fabricated reference fails the build. */
function cite(id: string): string {
  const citation = CITATIONS.get(id);
  if (!citation) throw new Error(`drill source references unknown knowledge record "${id}"`);
  return citation;
}

const DRILLS: readonly Drill[] = [
  {
    id: 'drill-unreciprocated',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'They held. Do you move again?',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: 800, timeRemainingMs: 60000, chipsRemaining: 80, roundNumber: 4 },
    privateInfo: { yourLastOfferTenths: 700 },
    options: [
      { id: 'hold', label: 'Hold at 700 and wait one full turn', outcome: 'Your position stays 700; the turn passes back with no new information from you.', teachingNote: 'A held position tests whether their 800 was a limit or a posture.' },
      { id: 'concede-small', label: 'Move to 740 with a short message', outcome: 'Your position moves to 740; the gap to their 800 narrows from 100 to 60.', teachingNote: 'A small paired concession exchanges movement instead of giving it unilaterally.' },
      { id: 'concede-large', label: 'Jump to 800 in one move', outcome: 'Your position moves to 800 — a large unilateral give while theirs is unchanged.', teachingNote: 'A large unreciprocated move signals flexibility the other side can exploit.' },
    ],
    teachingObjective: 'Practice concession discipline: movement is exchanged, not given.',
    conceptTags: ['RECIPROCITY', 'SIGNALING'],
    explanation: 'A widely used negotiation framework recommends recognizing that a concession without reciprocal movement is information handed to the other side for free.',
    sources: [cite('kb-cialdini-influence')],
    benchmark: null,
  },
  {
    id: 'drill-anchor',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'You open first',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: null, timeRemainingMs: 120000, chipsRemaining: 100, roundNumber: 1 },
    privateInfo: { opponentLimitEstimateTenths: 400 },
    options: [
      { id: 'open-low', label: 'Open at 500 — far toward their estimated limit', outcome: 'The opening claims a position at 17% of the range from their limit.', teachingNote: 'A low buyer opening anchors the exchange near the favorable end of the range.' },
      { id: 'open-mid', label: 'Open at 700 — the middle of the range', outcome: 'The opening sits mid-range, leaving room in both directions.', teachingNote: 'A middle opening claims less anchor but preserves flexibility and credibility.' },
      { id: 'open-range', label: 'Open at 550–600 as a range offer', outcome: 'A range opening anchors while reading as more flexible than a single number.', teachingNote: 'Range offers can anchor and appear polite at once — the width itself signals.' },
    ],
    teachingObjective: 'Practice opening position: the first number shapes the whole exchange.',
    conceptTags: ['FIRST_OFFERS', 'ANCHORING'],
    explanation: 'Research suggests first offers anchor negotiation outcomes — the number that opens the exchange pulls the settlement toward it.',
    sources: [cite('kb-galinsky-first-offers'), cite('kb-ames-mason-tandem')],
    benchmark: null,
  },
  {
    id: 'drill-deadline',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'Thirty seconds on the clock',
    scenario: { role: 'SELLER', reservationValueTenths: 400, opponentLatestOfferTenths: 700, timeRemainingMs: 30000, chipsRemaining: 50, roundNumber: 6 },
    privateInfo: { yourLatestOfferTenths: 1000, gapTenths: 300, rangeTenths: 600 },
    options: [
      { id: 'hold', label: 'Hold at 1000 and let the clock run', outcome: 'The clock runs toward its limit while your position stays 1000.', teachingNote: 'Holding under pressure uses the deadline as leverage — if your read of their urgency is right.' },
      { id: 'concede', label: 'Move to 850 to keep the exchange alive', outcome: 'Your position moves to 850; the gap halves.', teachingNote: 'A pressured concession trades capture for a higher chance of closing.' },
      { id: 'message', label: 'Send one message, then decide', outcome: 'The message lands; the clock keeps running while you deliberate.', teachingNote: 'A message under pressure can reframe — but it spends time you may not have.' },
    ],
    teachingObjective: 'Practice deadline decisions: who owns the clock owns part of the exchange.',
    conceptTags: ['TIME_PRESSURE', 'DEADLINES'],
    explanation: 'Research suggests time pressure is associated with lower individual outcomes and a greater tendency toward concession behavior.',
    sources: [cite('kb-stuhlmacher-time-pressure')],
    benchmark: null,
  },
  {
    id: 'drill-fixed-pie',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'Is the pie fixed?',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: 800, timeRemainingMs: 90000, chipsRemaining: 90, roundNumber: 2 },
    privateInfo: { yourLimitTenths: 1000, opponentLimitEstimateTenths: 400, yourOpeningOfferTenths: 500 },
    options: [
      { id: 'treat-fixed', label: 'Treat it as win-lose and counter at 500 again', outcome: 'Your counter repeats your opening; the exchange stays purely positional.', teachingNote: 'Fixed-pie assumptions keep both sides splitting instead of finding room.' },
      { id: 'probe', label: 'Ask what flexibility they have before countering', outcome: 'A question is sent; their next move reveals whether the gap is real.', teachingNote: 'Testing for compatibility before assuming win-lose can expose value both sides missed.' },
      { id: 'split', label: 'Meet at the middle: offer 650', outcome: 'The offer splits the gap between your 500 and their 800 in half.', teachingNote: 'Splitting is a claiming move — it does not test whether the range itself could widen.' },
    ],
    teachingObjective: 'Practice testing fixed-pie assumptions before conceding to them.',
    conceptTags: ['FIXED_PIE', 'VALUE_CREATION'],
    explanation: 'Research suggests negotiators routinely assume a fixed pie, and the assumption persists even after information that could reveal compatible interests is available.',
    sources: [cite('kb-thompson-hastie-fixed-pie')],
    benchmark: null,
  },
  {
    id: 'drill-batna',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'Walk, accept, or push?',
    scenario: { role: 'BUYER', reservationValueTenths: 750, opponentLatestOfferTenths: 690, timeRemainingMs: 20000, chipsRemaining: 10, roundNumber: 5 },
    privateInfo: { alternativePriceTenths: 750 },
    options: [
      { id: 'accept', label: 'Accept the standing 690', outcome: 'You settle at 690 — 60 better than your alternative.', teachingNote: 'The floor under every offer is what you can get without this deal.' },
      { id: 'walk', label: 'Walk away and use the alternative', outcome: 'The match ends with no deal; your alternative costs 750 — 60 worse than the standing offer.', teachingNote: 'Walking with a standing offer inside your limit gives up value the exchange was offering.' },
      { id: 'counter', label: 'Counter 695 with your last chips', outcome: 'A one-step counter risks the clock and the deal for 5 more tenths.', teachingNote: 'A marginal push late costs chips and time — the capture gain is 5 against a live deal.' },
    ],
    teachingObjective: 'Practice BATNA discipline: compare every option to your alternative, not to your pride.',
    conceptTags: ['BATNA', 'WALK_AWAY_DECISIONS'],
    explanation: 'A widely used negotiation framework recommends negotiating against a prepared best alternative — it is the floor under every offer you make or consider.',
    sources: [cite('kb-fisher-getting-to-yes')],
    benchmark: null,
  },
  {
    id: 'drill-large-concession',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'After your biggest give',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: 700, timeRemainingMs: 75000, chipsRemaining: 60, roundNumber: 5 },
    privateInfo: { yourLastOfferTenths: 650, lastGiveTenths: 150 },
    options: [
      { id: 'small-steps', label: 'Keep every next step at 50 or less', outcome: 'The concession ladder stays small and regular from here.', teachingNote: 'Regular small steps keep flexibility without telegraphing a limit.' },
      { id: 'repeat-big', label: 'Give another 150 to close the remaining gap', outcome: 'One more large give lands you at 800.', teachingNote: 'A second large give trains the other side to wait for big moves.' },
      { id: 'message-first', label: 'Explain the previous step, then offer 700', outcome: 'Your message frames the give as deliberate; the offer moves 50.', teachingNote: 'Framing attaches a reason to a number — the reason becomes part of the signal.' },
    ],
    teachingObjective: 'Practice step sizing after a large concession.',
    conceptTags: ['SIZE', 'SIGNALING'],
    explanation: 'A widely used negotiation framework recommends recognizing that concession sizes are signals — the ladder you show is the negotiation the other side reads.',
    sources: [cite('kb-malhotra-psychological-influence'), cite('kb-cialdini-influence')],
    benchmark: null,
  },
  {
    id: 'drill-silence',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'Four offers, no messages',
    scenario: { role: 'SELLER', reservationValueTenths: 400, opponentLatestOfferTenths: 700, timeRemainingMs: 80000, chipsRemaining: 70, roundNumber: 5 },
    privateInfo: { offersSoFar: 4, messagesSent: 0 },
    options: [
      { id: 'question', label: 'Send one question about their position', outcome: 'A question is sent; their answer may reveal information no offer would.', teachingNote: 'Questions buy information; offers buy position. Silence buys neither.' },
      { id: 'pitch', label: 'Pitch your next offer with a message', outcome: 'The offer lands with a stated reason attached.', teachingNote: 'A pitched offer gives the number a story the other side can argue with — or accept.' },
      { id: 'stay-silent', label: 'Stay silent and make the next offer', outcome: 'The exchange continues with no messages from you.', teachingNote: 'Silence can read as discipline or as disengagement — you do not control which.' },
    ],
    teachingObjective: 'Practice using the message channel deliberately.',
    conceptTags: ['SILENCE', 'INFORMATION_DISCLOSURE'],
    explanation: 'Research suggests a problem-solving orientation, with open exchange of information, produces more integrative agreements — selectively disclosed.',
    sources: [cite('kb-pruitt-lewis-integrative')],
    benchmark: null,
  },
  {
    id: 'drill-surplus',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'The settlement is forming at 600',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: 600, timeRemainingMs: 60000, chipsRemaining: 40, roundNumber: 6 },
    privateInfo: { opponentLimitEstimateTenths: 400, rangeTenths: 600 },
    options: [
      { id: 'take', label: 'Accept 600 now', outcome: 'You capture 67% of the range and keep the deal safe.', teachingNote: 'A safe close at two-thirds capture is a strong outcome — the risk of one more push is the deal itself.' },
      { id: 'push-once', label: 'Counter 550 once, then accept anything inside your limit', outcome: 'A one-step push tests the last 8% of the range.', teachingNote: 'One disciplined push can capture the final slice without risking the close.' },
      { id: 'push-hard', label: 'Demand 500 and hold', outcome: 'Your demand of 500 sits a full 100 tenths below their standing 600.', teachingNote: 'A hard final demand risks a deadlock over value you already hold in hand.' },
    ],
    teachingObjective: 'Practice surplus capture: measure the last push against the risk to the deal.',
    conceptTags: ['VALUE_CAPTURE', 'AMBITION'],
    explanation: 'Research suggests negotiators with specific, ambitious goals reach higher outcomes — and the risk of ambition is the deal you already have.',
    sources: [cite('kb-zetik-goals')],
    benchmark: null,
  },
  {
    id: 'drill-pressure',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'Deep in the low-time window',
    scenario: { role: 'BUYER', reservationValueTenths: 1000, opponentLatestOfferTenths: 750, timeRemainingMs: 20000, chipsRemaining: 30, roundNumber: 7 },
    privateInfo: { timePressureExposureFraction: 0.6 },
    options: [
      { id: 'decide-now', label: 'Decide now by the plan you set earlier', outcome: 'The decision lands inside the remaining budget.', teachingNote: 'Decisions made by plan, not under the gun, survive the low-time window.' },
      { id: 'extend', label: 'Use another turn to think', outcome: 'The clock keeps running into the warning tiers.', teachingNote: 'Under pressure, deliberation runs on shortcuts — the extra turn may not buy better judgment.' },
      { id: 'walk', label: 'Walk away to reset', outcome: 'The match ends with no deal and a full reset of your position.', teachingNote: 'Walking to escape pressure trades the match for relief — the pressure was on both sides.' },
    ],
    teachingObjective: 'Practice pre-deciding: bank decisions before the clock gets short.',
    conceptTags: ['TIME_PRESSURE', 'IMPASSE'],
    explanation: 'Research suggests that under time pressure, negotiators rely more on heuristic processing and adjust less to new information.',
    sources: [cite('kb-dedreu-pressure-mind')],
    benchmark: null,
  },
  {
    id: 'drill-walk',
    version: 'practice-system-0.1.0',
    kind: 'WHAT_WOULD_YOU_DO',
    title: 'A standing offer inside your limit',
    scenario: { role: 'BUYER', reservationValueTenths: 700, opponentLatestOfferTenths: 690, timeRemainingMs: 15000, chipsRemaining: 20, roundNumber: 6 },
    privateInfo: { rangeTenths: 300 },
    options: [
      { id: 'accept', label: 'Accept the standing 690', outcome: 'You settle at 690, inside your limit.', teachingNote: 'The standing offer already satisfies your mandate — ending the match any other way gives up value.' },
      { id: 'walk', label: 'Walk away', outcome: 'The match ends with zero bounty for both, and 10 of value left on the table.', teachingNote: 'A walk-away with a mandate-satisfying offer standing is the exact pattern the review flags.' },
      { id: 'counter', label: 'Counter 695', outcome: 'A 5-tenth counter risks the clock for a marginal gain.', teachingNote: 'Pushing the last 5 tenths can be right — or it can turn a live deal into a miss.' },
    ],
    teachingObjective: 'Practice the pre-exit check: standing offer, time left, your limit.',
    conceptTags: ['WALK_AWAY_DECISIONS', 'FAILED_ZOPA'],
    explanation: 'A widely used negotiation framework recommends a prepared standard for walking — and checking the standing offer against it before you end a match.',
    sources: [cite('kb-fisher-getting-to-yes')],
    benchmark: null,
  },
];

const LESSONS: readonly MicroLesson[] = [
  {
    id: 'lesson-reciprocity',
    version: 'practice-system-0.1.0',
    title: 'What reciprocity does in negotiation',
    minutes: 2,
    conceptTags: ['RECIPROCITY', 'SIGNALING'],
    steps: [
      { text: 'A concession with no reciprocal movement is a gift of information: it tells the other side you will pay to keep the exchange alive.', level: 'L3' },
      { text: 'Paired concessions — movement exchanged for movement — keep your flexibility from reading as weakness.', level: 'L4' },
      { text: 'In your matches, notice who moved last before you move again.', level: 'L1' },
    ],
    sources: [cite('kb-cialdini-influence')],
    callableFrom: ['UNRECIPROCATED_CONCESSION', 'CONSECUTIVE_UNILATERAL_CONCESSIONS', 'FAST_CONCESSION_AFTER_RESISTANCE'],
  },
  {
    id: 'lesson-anchoring',
    version: 'practice-system-0.1.0',
    title: 'Why first offers stick',
    minutes: 2,
    conceptTags: ['FIRST_OFFERS', 'ANCHORING'],
    steps: [
      { text: 'First offers pull settlements toward the opening number — the anchor works even when both sides know it is a position.', level: 'L3' },
      { text: 'When you face an anchor, shift focus to the counterpart\'s alternatives instead of counter-anchoring from their number.', level: 'L4' },
      { text: 'Your own opening is the anchor you control — prepare it before the match starts.', level: 'L1' },
    ],
    sources: [cite('kb-galinsky-first-offers'), cite('kb-ames-mason-tandem')],
    callableFrom: ['STRONG_OPENING_POSITION', 'LARGE_OPENING', 'CONSERVATIVE_OPENING'],
  },
  {
    id: 'lesson-time-pressure',
    version: 'practice-system-0.1.0',
    title: 'Clocks change decisions',
    minutes: 2,
    conceptTags: ['TIME_PRESSURE', 'DEADLINES'],
    steps: [
      { text: 'Under time pressure, negotiators concede more and adjust less to new information — the clock is a lever.', level: 'L3' },
      { text: 'Bank decisions early: set your thresholds before the low-time window opens.', level: 'L4' },
      { text: 'The hard limit ends the match for you — the warning tiers are your signal to decide.', level: 'L1' },
    ],
    sources: [cite('kb-stuhlmacher-time-pressure'), cite('kb-dedreu-pressure-mind')],
    callableFrom: ['TIME_PRESSURE_EXPOSURE', 'TIMEOUT', 'FAST_CLOSE'],
  },
  {
    id: 'lesson-fixed-pie',
    version: 'practice-system-0.1.0',
    title: 'The pie is not always fixed',
    minutes: 3,
    conceptTags: ['FIXED_PIE', 'VALUE_CREATION'],
    steps: [
      { text: 'Negotiators routinely assume a fixed pie and miss compatible interests — the assumption costs value.', level: 'L3' },
      { text: 'Test the assumption with a question about priorities before conceding to a win-lose frame.', level: 'L4' },
      { text: 'In Bounty Bay the range is set by the two limits — but how much of it you claim together is still a choice.', level: 'L1' },
    ],
    sources: [cite('kb-thompson-hastie-fixed-pie')],
    callableFrom: ['FAILED_POSITIVE_ZOPA', 'DEADLOCK', 'LOW_SURPLUS_CAPTURE'],
  },
  {
    id: 'lesson-batna',
    version: 'practice-system-0.1.0',
    title: 'Your floor under every offer',
    minutes: 2,
    conceptTags: ['BATNA', 'WALK_AWAY_DECISIONS'],
    steps: [
      { text: 'A best alternative is the floor under every offer you make or consider — deals are compared to it, not to hopes.', level: 'L3' },
      { text: 'Before ending a match, check the standing offer against your limit and your alternative.', level: 'L4' },
      { text: 'Walking while a mandate-satisfying offer stands leaves the value on the table — the review flags exactly this.', level: 'L1' },
    ],
    sources: [cite('kb-fisher-getting-to-yes')],
    callableFrom: ['MISSED_STANDING_OFFER', 'DEAL_NEAR_OWN_LIMIT'],
  },
];

const RECOMMENDATIONS: readonly PracticeRecommendation[] = [
  { observationType: 'STRONG_OPENING_POSITION', drillIds: ['drill-anchor'], personaKey: 'anchor' },
  { observationType: 'CONSERVATIVE_OPENING', drillIds: ['drill-anchor'], personaKey: 'anchor' },
  { observationType: 'LARGE_OPENING', drillIds: ['drill-anchor'], personaKey: 'anchor' },
  { observationType: 'UNRECIPROCATED_CONCESSION', drillIds: ['drill-unreciprocated'], personaKey: 'wall' },
  { observationType: 'CONSECUTIVE_UNILATERAL_CONCESSIONS', drillIds: ['drill-unreciprocated'], personaKey: 'wall' },
  { observationType: 'LARGEST_CONCESSION', drillIds: ['drill-large-concession'], personaKey: 'grinder' },
  { observationType: 'LATE_LARGE_CONCESSION', drillIds: ['drill-large-concession'], personaKey: 'grinder' },
  { observationType: 'DECLINING_CONCESSIONS', drillIds: ['drill-large-concession'], personaKey: 'grinder' },
  { observationType: 'INCREASING_CONCESSIONS', drillIds: ['drill-large-concession'], personaKey: 'grinder' },
  { observationType: 'FAST_CONCESSION_AFTER_RESISTANCE', drillIds: ['drill-unreciprocated'], personaKey: 'wall' },
  { observationType: 'LONG_HOLD', drillIds: ['drill-deadline'], personaKey: 'mirror' },
  { observationType: 'TIME_PRESSURE_EXPOSURE', drillIds: ['drill-pressure'], personaKey: 'closer' },
  { observationType: 'HIGH_CHIP_SPEND', drillIds: ['drill-surplus'], personaKey: 'anchor' },
  { observationType: 'LOW_CHIP_SPEND', drillIds: ['drill-surplus'], personaKey: 'closer' },
  { observationType: 'EFFICIENT_CLOSE', drillIds: ['drill-surplus'], personaKey: 'closer' },
  { observationType: 'DEAL_NEAR_OWN_LIMIT', drillIds: ['drill-surplus'], personaKey: 'grinder' },
  { observationType: 'DEAL_NEAR_OPPONENT_LIMIT', drillIds: ['drill-surplus'], personaKey: 'closer' },
  { observationType: 'STRONG_SURPLUS_CAPTURE', drillIds: ['drill-surplus'], personaKey: 'closer' },
  { observationType: 'LOW_SURPLUS_CAPTURE', drillIds: ['drill-surplus'], personaKey: 'grinder' },
  { observationType: 'MISSED_STANDING_OFFER', drillIds: ['drill-walk'], personaKey: 'closer' },
  { observationType: 'FAILED_POSITIVE_ZOPA', drillIds: ['drill-fixed-pie', 'drill-walk'], personaKey: 'wall' },
  { observationType: 'DEADLOCK', drillIds: ['drill-fixed-pie'], personaKey: 'wall' },
  { observationType: 'TIMEOUT', drillIds: ['drill-pressure'], personaKey: 'mirror' },
  { observationType: 'FAST_CLOSE', drillIds: ['drill-deadline'], personaKey: 'anchor' },
  { observationType: 'SILENT_NEGOTIATION', drillIds: ['drill-silence'], personaKey: 'mirror' },
  { observationType: 'OFFER_WITH_PITCH', drillIds: ['drill-silence'], personaKey: 'mirror' },
];

export const PRACTICE_SEEDS: PracticeSeedSet = {
  drills: DRILLS,
  lessons: LESSONS,
  recommendations: RECOMMENDATIONS,
  fallbackDrillId: 'drill-unreciprocated',
};
