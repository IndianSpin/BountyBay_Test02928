/**
 * Role-scoped match projection (GR-002, GR-016, GR-018; SI-001;
 * 06_ARCHITECTURE.md §10).
 *
 * This is a pure function over state, so the hidden-information boundary is
 * testable at the domain level: the opponent's reservation value can never
 * appear in a pre-result view, whatever the server layer does.
 *
 * Opponent handles come from the user service, not the domain — the API
 * layer decorates `playerId` with public handle data.
 */

import type { EconomyConfig } from '@bounty-bay/config';
import { effectiveHardDecisionLimitMs, effectiveTimeWarnings } from '@bounty-bay/config';
import { clockMultiplier, elapsedActiveMs } from './clock';
import type { MatchState, PlayerId } from './types';

export type TimeTier = 'NORMAL' | 'LOW_TIME' | 'CRITICAL';

export interface ParticipantView {
  playerId: PlayerId;
  role: 'BUYER' | 'SELLER';
  disconnected: boolean;
  openingOfferTenths: number | null;
  latestOfferTenths: number | null;
  /** Needed to construct ACCEPT commands (GR-010); not private information. */
  standingOfferId: string | null;
  chipsSpent: number;
  remainingChips: number;
  cumulativeActiveMs: number;
  clockMultiplier: number;
  /**
   * GR-023 (DD Phase 1): remaining hard decision-time budget in ms for this
   * player's running clock; null when the config has no limit or the match
   * is terminal. Shared information (GR-016).
   */
  decisionTimeRemainingMs: number | null;
  /** DD Phase 1: server-derived warning tier; null when no limit/terminal. */
  timeTier: TimeTier | null;
  /**
   * GR-002: present for the viewer always; for the opponent only once the
   * match is terminal (GR-018 reveal). Absent key pre-result.
   */
  reservationValueTenths?: number;
}

export interface MatchView {
  matchId: string;
  mode: MatchState['mode'];
  status: MatchState['status'];
  scenarioId: string;
  scenarioVersion: number;
  gameRulesVersion: string;
  economyConfigVersion: string;
  ratingVersion: string | null;
  firstPlayerId: PlayerId;
  activePlayerId: PlayerId | null;
  turnStartedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  settlementTenths: number | null;
  completionReason: MatchState['completionReason'];
  /** My convenience fields (08: `myReservationValueTenths`). */
  myPlayerId: PlayerId;
  myRole: 'BUYER' | 'SELLER';
  myTurn: boolean;
  /** Absent (not null) when the viewer is not a participant's peer. */
  myReservationValueTenths?: number;
  participants: [ParticipantView, ParticipantView];
  economy: MatchState['economy'];
}

export function viewMatchFor(state: MatchState, viewerId: PlayerId, now: number, config: EconomyConfig): MatchView {
  const viewer = state.participants.find((p) => p.playerId === viewerId);
  const terminal = state.status === 'DEAL' || state.status === 'NO_DEAL' || state.status === 'ABORTED';
  const limit = effectiveHardDecisionLimitMs(config);
  const warnings = effectiveTimeWarnings(config);

  const timeBudget = (p: MatchState['participants'][number]): { remainingMs: number | null; tier: TimeTier | null } => {
    if (terminal || limit === null) return { remainingMs: null, tier: null };
    const remainingMs = Math.max(0, limit - elapsedActiveMs(p, state, now));
    const tier: TimeTier = remainingMs <= 0 || (warnings !== null && remainingMs <= warnings.criticalMs)
      ? 'CRITICAL'
      : warnings !== null && remainingMs <= warnings.lowMs
        ? 'LOW_TIME'
        : 'NORMAL';
    return { remainingMs, tier };
  };

  const participantView = (p: MatchState['participants'][number]): ParticipantView => {
    const { remainingMs, tier } = timeBudget(p);
    const base: ParticipantView = {
      playerId: p.playerId,
      role: p.role,
      disconnected: p.disconnected,
      openingOfferTenths: p.openingOfferTenths,
      latestOfferTenths: p.latestOfferTenths,
      standingOfferId: p.standingOfferId,
      chipsSpent: p.chipsSpent,
      remainingChips: p.initialChipBudget - p.chipsSpent,
      cumulativeActiveMs: p.cumulativeActiveMs,
      clockMultiplier: clockMultiplier(elapsedActiveMs(p, state, now), config),
      decisionTimeRemainingMs: remainingMs,
      timeTier: tier,
    };
    // GR-002: own RV always; opponent RV only after completion (GR-018).
    if (p.playerId === viewerId || terminal) {
      return { ...base, reservationValueTenths: p.reservationValueTenths };
    }
    return base;
  };

  return {
    matchId: state.matchId,
    mode: state.mode,
    status: state.status,
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    gameRulesVersion: state.gameRulesVersion,
    economyConfigVersion: state.economyConfigVersion,
    ratingVersion: state.ratingVersion,
    firstPlayerId: state.firstPlayerId,
    activePlayerId: state.activePlayerId,
    turnStartedAt: state.turnStartedAt,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    settlementTenths: state.settlementTenths,
    completionReason: state.completionReason,
    myPlayerId: viewerId,
    myRole: viewer?.role ?? 'BUYER',
    myTurn: state.status === 'ACTIVE' && state.activePlayerId === viewerId,
    myReservationValueTenths: viewer ? viewer.reservationValueTenths : undefined,
    participants: state.participants.map((p) => participantView(p)) as [ParticipantView, ParticipantView],
    economy: state.economy,
  };
}
