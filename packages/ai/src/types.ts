/**
 * The production AI opponent contract (docs/08_API_CONTRACTS.md, DEC-025).
 *
 * Agents receive ONLY what the AI player could legally know: the
 * role-scoped MatchView (opponent RV structurally absent pre-terminal), its
 * own private RV inside the view, and deterministic per-match entropy.
 * Intents carry no playerId/now/commandId — the turn engine stamps those,
 * and every intent passes the exact same domain validation as human
 * commands (adapter not authority).
 */

import type { MatchView } from '@bounty-bay/domain';

export type PersonaKey = 'anchor' | 'grinder' | 'closer' | 'wall' | 'mirror';

export interface AgentContext {
  view: MatchView;
  /** Server-authoritative ms epoch; the same value the engine stamps on the command. */
  now: number;
  /** Deterministic per-match entropy (mulberry32 seeded from matchId + persona). Not game information. */
  rng: () => number;
  /** Engine-set: false on the re-decide after a flavor chat batch, so a persona chats at most once per turn. */
  chatAllowed: boolean;
}

export type OfferIntent = { kind: 'OFFER'; offerId: string; amountTenths: number };
export type AcceptIntent = { kind: 'ACCEPT'; offerId: string };
export type WalkAwayIntent = { kind: 'WALK_AWAY' };
export type MessageIntent = { kind: 'MESSAGE'; messageId: string; body: string };

export type AgentDecision = OfferIntent | AcceptIntent | WalkAwayIntent | MessageIntent[];

export interface OpponentAgent {
  personaKey: PersonaKey;
  decide(context: AgentContext): AgentDecision;
}

export interface PersonaStrategy {
  /** Buyer opens at fraction × own RV; seller at multiple × own RV. */
  opening: { buyerFraction: number; sellerMultiplier: number };
  /** Fraction of the remaining gap conceded per move; 'reciprocal' mirrors the opponent's cumulative movement. */
  concessionFraction: number | 'reciprocal';
  /** Accept when the opponent's standing offer beats this ratio of own RV (per role). */
  acceptThreshold: { buyer: number; seller: number };
  /** Probability of walking away on a turn (rolled only when no accept applies). */
  walkProbability: number;
}

export interface PersonaConfig {
  key: PersonaKey;
  displayName: string;
  /** Bot user handle; must match the API handle pattern. */
  handle: string;
  /** Card flavor line on the practice entry. */
  blurb: string;
  /** Response-time profile (ms), per persona. */
  thinkRangeMs: [number, number];
  /** Chance of a flavor chat batch on a turn. */
  chatProbability: number;
  chatLines: string[];
  strategy: PersonaStrategy;
}
