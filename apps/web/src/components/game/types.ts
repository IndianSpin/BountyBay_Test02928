/**
 * Shared view types for the Royale game components (DEC-024, docs/09).
 * Mirrors the API's role-scoped snapshot; game logic never lives here.
 */

import type { EconomyConfig } from '@bounty-bay/config';

/** DD Phase 1 (docs/09): server-derived decision-time warning tier. */
export type TimeTier = 'NORMAL' | 'LOW_TIME' | 'CRITICAL';

export interface ParticipantView {
  playerId: string;
  role: 'BUYER' | 'SELLER';
  disconnected: boolean;
  openingOfferTenths: number | null;
  latestOfferTenths: number | null;
  standingOfferId: string | null;
  chipsSpent: number;
  remainingChips: number;
  cumulativeActiveMs: number;
  clockMultiplier: number;
  /** GR-023: remaining hard decision-time budget (ms); null = no limit/terminal. */
  decisionTimeRemainingMs: number | null;
  /** Server-derived warning tier; render only, never compute. */
  timeTier: TimeTier | null;
  reservationValueTenths?: number;
}

export interface MatchEconomyView {
  zopaTenths: number;
  settlementTenths: number | null;
  buyerSurplusShare: number | null;
  sellerSurplusShare: number | null;
  ratedEligible: boolean;
  players: Record<
    string,
    {
      playerId: string;
      clockMultiplier: number;
      grossReward: number;
      netResult: number;
      chipsSpent: number;
      remainingChips: number;
      cumulativeActiveMs: number;
    }
  >;
}

export interface MatchView {
  matchId: string;
  mode: string;
  status: string;
  firstPlayerId: string;
  activePlayerId: string | null;
  turnStartedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  settlementTenths: number | null;
  completionReason: string | null;
  myPlayerId: string;
  myRole: 'BUYER' | 'SELLER';
  myTurn: boolean;
  myReservationValueTenths?: number;
  participants: [ParticipantView, ParticipantView];
  economy: MatchEconomyView | null;
}

export interface ScenarioView {
  id: string;
  version: number;
  title: string;
  description: string;
  myNarrative: string;
  /** DD-M2 (GR-028): role-scoped dossier — the viewer's own only. */
  sharedContext: string | null;
  myPrivateContext: string | null;
  myPrivateFacts: DossierFactView[];
}

/** DEC-025: an AI practice opponent in this match (empty for human matches). */
export interface AiOpponentView {
  playerId: string;
  personaKey: string;
  displayName: string;
}

export interface MatchSnapshot {
  matchId: string;
  view: MatchView;
  economyConfig: EconomyConfig;
  handles: Record<string, string>;
  scenario: ScenarioView | null;
  aiOpponents: AiOpponentView[];
  serverNow: number;
  /** GR-024: set when the match ended by timeout; null otherwise. */
  timeoutPlayerId: string | null;
}

import type { DossierFactView } from './dossier-model';

export interface TimelineItem {
  kind: string;
  text: string;
  actor: 'me' | 'opponent' | 'system';
}
