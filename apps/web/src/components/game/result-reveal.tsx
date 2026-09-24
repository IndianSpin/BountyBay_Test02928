'use client';

/**
 * Result reveal — live adapter (BB-265 G-2): the rematch state
 * machine, telemetry and API flows are unchanged (PDR-3 mutual
 * consent, SH4 letters, DA-P1-SPEC §4.2); the RENDER is the golden
 * result scene (golden-result.tsx, ported from
 * design-sandbox/golden/states/result.html). The scene composition
 * replaces the old dark modal: the deal stays on the table, the
 * person stays in frame, the reward flies into the counters, and
 * SWAP SIDES · REMATCH is the primary action.
 */

import { useEffect, useState } from 'react';
import { trackEvent } from '../../lib/analytics';
import { PERSONA_CHARACTER, castCharacter } from './character-registry';
import GoldenResultScene, { type ResultSceneData } from './golden-result';
import type { MatchSnapshot } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** BB-219b (PDR-3): rematch = mutual consent. */
type RematchPhase = 'idle' | 'proposing' | 'waiting' | 'declined';

export default function ResultReveal({
  snapshot,
  userId,
  onRematch,
  matchId,
  token,
}: {
  snapshot: MatchSnapshot;
  userId: string;
  onRematch: () => void;
  matchId: string;
  token: string;
}) {
  const view = snapshot.view;
  const opponent = view.participants.find((p) => p.playerId !== userId)!;
  const ai = snapshot.aiOpponents[0] ?? null;
  const deal = view.status === 'DEAL';
  const myShare = view.economy
    ? view.myRole === 'BUYER'
      ? view.economy.buyerSurplusShare
      : view.economy.sellerSurplusShare
    : null;
  const myEconomy = view.economy?.players[userId];
  const theirEconomy = view.economy?.players[opponent.playerId];

  // PDR-3 mutual-consent rematch state (friend matches only; AI practice
  // keeps the plain reset path).
  const friendMode = ai === null;
  const opponentHandle = snapshot.handles[opponent.playerId] ?? 'your opponent';
  const [rematchPhase, setRematchPhase] = useState<RematchPhase>('idle');
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<{ matchId: string } | null>(null);

  const authHeaders = { authorization: `Bearer ${token}` };

  async function proposeRematch(): Promise<void> {
    // DA-P1-SPEC §4.2: a real rematch click is observable (friend mode).
    trackEvent('rematch_clicked', token, matchId);
    setRematchPhase('proposing');
    try {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/rematch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({ commandId: crypto.randomUUID() }),
      });
      if (!res.ok) {
        // 409 = the opponent proposed first (one open proposal per source):
        // stay idle — the incoming poll below surfaces their proposal.
        setRematchPhase('idle');
        return;
      }
      const body = (await res.json()) as { matchId: string };
      setProposalId(body.matchId);
      setRematchPhase('waiting');
    } catch {
      setRematchPhase('idle');
    }
  }

  // The proposer watches their open proposal: ACTIVE means the opponent
  // accepted — join the new match. A 403/404 means the row is gone
  // (declined or cancelled) — surface the closed state.
  useEffect(() => {
    if (rematchPhase !== 'waiting' || proposalId === null) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/v1/matches/${proposalId}`, { headers: authHeaders });
        if (res.status === 403 || res.status === 404) {
          setProposalId(null);
          setRematchPhase('declined');
          return;
        }
        if (!res.ok) return;
        // the accepted proposal returns the FULL snapshot: status lives at
        // view.status (the bare { status } shape is the pre-join branch).
        const body = (await res.json()) as { status?: string; view?: { status?: string } };
        if (body.status === 'ACTIVE' || body.view?.status === 'ACTIVE') {
          window.location.assign(`/play?resume=${proposalId}`);
        }
      } catch {
        /* polling is best-effort */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [rematchPhase, proposalId, token]);

  // The opponent watches for an incoming proposal on the source match.
  useEffect(() => {
    if (!friendMode || rematchPhase !== 'idle') return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/v1/matches/${matchId}/rematch`, { headers: authHeaders });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { incoming: { matchId: string } | null };
        if (body.incoming !== null && !cancelled) {
          setIncoming(body.incoming);
          clearInterval(timer);
        }
      } catch {
        /* polling is best-effort */
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [friendMode, rematchPhase, matchId, token]);

  async function acceptRematch(): Promise<void> {
    if (incoming === null) return;
    const res = await fetch(`${API_URL}/v1/matches/${incoming.matchId}/rematch/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ commandId: crypto.randomUUID() }),
    });
    if (!res.ok) {
      setIncoming(null);
      return;
    }
    window.location.assign(`/play?resume=${incoming.matchId}`);
  }

  async function declineRematch(): Promise<void> {
    // SH4 frame 15: NOT NOW dismisses the in-session prompt but the
    // proposal stands — it becomes the letter at The Bay (the proposal
    // row persists; the letter's ANSWER re-opens this prompt).
    setIncoming(null);
  }

  async function cancelRematch(): Promise<void> {
    if (proposalId === null) return;
    await fetch(`${API_URL}/v1/matches/${proposalId}/rematch/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ commandId: crypto.randomUUID() }),
    }).catch(() => null);
    setProposalId(null);
    setRematchPhase('idle');
  }

  // SH4 frame 14: the deal ends, the person doesn't leave — the
  // opponent stays in frame and speaks; the outcome drives their clip.
  const opponentCharacter = castCharacter(
    ai !== null ? (PERSONA_CHARACTER[ai.personaKey as keyof typeof PERSONA_CHARACTER] ?? 'goldenotter') : 'goldenotter',
  );

  const data: ResultSceneData = {
    deal,
    character: opponentCharacter,
    opponentHandle,
    scenarioTitle: snapshot.scenario?.title ?? '',
    settlementTenths: view.settlementTenths,
    myLimitTenths: view.myReservationValueTenths ?? null,
    theirLimitTenths: opponent.reservationValueTenths ?? null,
    myShare,
    theirShare:
      view.economy !== null && view.economy !== undefined
        ? view.myRole === 'BUYER'
          ? view.economy.sellerSurplusShare
          : view.economy.buyerSurplusShare
        : null,
    myMultiplier: myEconomy?.clockMultiplier ?? 1,
    theirMultiplier: theirEconomy?.clockMultiplier ?? 1,
    chipsSpent: myEconomy?.chipsSpent ?? 0,
    gross: myEconomy?.grossReward ?? 0,
    net: myEconomy?.netResult ?? 0,
    // Rating movement is P1-M2 — the golden fixture shows it, the live
    // app does not have it yet.
    ratingFrom: null,
    ratingTo: null,
    rated: false,
    ai: ai !== null,
    completionReason: view.completionReason,
    incoming: incoming !== null ? { line: 'Same table, fresh numbers — I buy this time?', windowSec: 12 } : null,
    rematch: friendMode
      ? {
          phase: rematchPhase,
          onPropose: () => void proposeRematch(),
          onAccept: () => void acceptRematch(),
          onDecline: declineRematch,
          onCancel: () => void cancelRematch(),
          waitingFor: opponentHandle,
        }
      : null,
    onPlayAgain: ai !== null ? onRematch : undefined,
    links: { review: `/review/${matchId}`, replay: `/replay/${matchId}`, backToBay: '/bay' },
  };

  return <GoldenResultScene data={data} />;
}
