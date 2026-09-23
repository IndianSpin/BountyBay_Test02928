'use client';

/**
 * Live negotiation container (Phase 3, Bounty Bay Royale).
 *
 * Owns ALL game state and server communication: socket lifecycle, snapshot
 * fetching, event accumulation, commands, ticking clock projection, ARIA
 * announcements. Presentation is delegated to the Royale game components;
 * no game logic lives in presentation. Client-side calculations (cost
 * preview, elapsed time) are previews only — the API/domain is authoritative.
 */

import { concessionCostChips, concessionMagnitude, parseAmountTenths } from '@bounty-bay/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { formatTenthsGrouped } from '../../lib/format';
import NegotiationBoard from '../../components/game/negotiation-board';
import MerchantScene from '../../components/game/scene';
import type { TurnState } from '../../components/game/turn-banner';
import ResultReveal from '../../components/game/result-reveal';
import type { MatchSnapshot, MatchView, TimelineItem } from '../../components/game/types';

// Canvas composition + result reveal (BB-201: split out of globals.css).
// Imported at the single container for all .lm-* usage — the board, the
// staging MerchantScene, and the terminal ResultReveal.
import '../../components/game/live-match.css';
import '../../components/game/reveal.css';


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface MatchScreenProps {
  matchId: string;
  token: string;
  userId: string;
  opponentJoined: boolean;
  onRematch: () => void;
}

interface ChatMessageItem {
  actor: 'me' | 'opponent';
  text: string;
}

export default function MatchScreen({ matchId, token, userId, opponentJoined, onRematch }: MatchScreenProps) {
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [serverNow, setServerNow] = useState<number>(Date.now());
  const [amountInput, setAmountInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [seenMessages, setSeenMessages] = useState(0);
  const [opponentStats, setOpponentStats] = useState<{ rating?: number; games?: number } | undefined>();
  const socketRef = useRef<Socket | null>(null);
  const viewRef = useRef<MatchView | null>(null);
  const lastOpponentOfferRef = useRef<number | null>(null);

  // -- snapshot + socket ----------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('user:registered', () => socket.emit('match:join', { matchId }));
    socket.on('match:joined', () => void refreshSnapshot());
    socket.on('match:state', (payload: { view: MatchView; serverNow: number }) => {
      if (cancelled) return;
      const next = payload.view;
      const previous = viewRef.current;
      if (previous !== null && previous.status === 'ACTIVE' && next.status === 'ACTIVE' && next.myTurn !== previous.myTurn) {
        setAnnouncement(next.myTurn ? 'Your move' : 'Opponent thinking');
      }
      // DD Phase 1: announce the active player's warning tier changes (GR-023).
      const activeNext = next.activePlayerId !== null ? next.participants.find((p) => p.playerId === next.activePlayerId) : undefined;
      const activePrev =
        previous !== null && previous.activePlayerId !== null
          ? previous.participants.find((p) => p.playerId === previous.activePlayerId)
          : undefined;
      if (activeNext !== undefined && activeNext.timeTier !== null && activeNext.timeTier !== activePrev?.timeTier) {
        setAnnouncement(activeNext.timeTier === 'CRITICAL' ? 'Critical — time running out' : 'Low on time');
      }
      const opponent = next.participants.find((p) => p.playerId !== userId);
      if (opponent !== undefined && opponent.latestOfferTenths !== null && opponent.latestOfferTenths !== lastOpponentOfferRef.current) {
        setAnnouncement(`Opponent offered ${formatTenthsGrouped(opponent.latestOfferTenths)}`);
      }
      lastOpponentOfferRef.current = opponent?.latestOfferTenths ?? null;
      viewRef.current = next;
      setSnapshot((prev) => (prev ? { ...prev, view: next, serverNow: payload.serverNow } : prev));
      setServerNow(payload.serverNow);
    });
    socket.on('match:event', (payload: { events: { type: string; actorPlayerId: string | null; payload: Record<string, unknown> }[] }) => {
      setTimeline((prev) => [
        ...prev,
        ...payload.events
          .map((e) => toTimelineItem(e, userId))
          .filter((item): item is TimelineItem => item !== null),
      ]);
    });
    socket.on('match:clock-sync', (payload: { serverNow: number }) => setServerNow(payload.serverNow));
    socket.emit('user:register', { userId });

    async function refreshSnapshot(): Promise<void> {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}`, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const body = (await res.json()) as MatchSnapshot;
      if (cancelled) return;
      viewRef.current = body.view;
      lastOpponentOfferRef.current = body.view.participants.find((p) => p.playerId !== userId)?.latestOfferTenths ?? null;
      setSnapshot(body);
      setServerNow(body.serverNow);
      void enrichOpponentStats(body);
    }

    async function enrichOpponentStats(current: MatchSnapshot): Promise<void> {
      const opponent = current.view.participants.find((p) => p.playerId !== userId);
      if (!opponent) return;
      // DEC-025: bots have no meaningful profile; never fetch one
      if (current.aiOpponents.some((ai) => ai.playerId === opponent.playerId)) return;
      const handle = current.handles[opponent.playerId];
      if (!handle) return;
      try {
        const res = await fetch(`${API_URL}/v1/profiles/${encodeURIComponent(handle)}`);
        if (!res.ok || cancelled) return;
        const profile = (await res.json()) as { bountyRating?: number; ratedGames?: number };
        setOpponentStats({ rating: profile.bountyRating, games: profile.ratedGames });
      } catch {
        /* stats are optional garnish; a new player has nothing to show */
      }
    }

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [matchId, token, userId]);

  // Per-second clock projection while active (preview only, GR-016).
  const activeKey = `${snapshot?.view.status ?? ''}|${snapshot?.view.activePlayerId ?? ''}|${snapshot?.view.turnStartedAt ?? ''}`;
  useEffect(() => {
    if (snapshot === null || snapshot.view.status !== 'ACTIVE') return;
    const timer = setInterval(() => setServerNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeKey, snapshot]);

  const view = snapshot?.view ?? null;
  const terminal = view !== null && (view.status === 'DEAL' || view.status === 'NO_DEAL' || view.status === 'ABORTED');

  // -- derived display ------------------------------------------------------

  const me = view?.participants.find((p) => p.playerId === userId);
  const opponent = view?.participants.find((p) => p.playerId !== userId);
  const myPrevious = me?.latestOfferTenths ?? null;

  const parsedAmount = useMemo(() => parseAmountTenths(amountInput), [amountInput]);
  const preview = useMemo(() => {
    if (view === null || snapshot === null || !parsedAmount.ok || myPrevious === null) return null;
    const magnitude = concessionMagnitude(myPrevious, parsedAmount.tenths);
    const cost = concessionCostChips(magnitude, snapshot.economyConfig);
    const movingToward = view.myRole === 'BUYER' ? parsedAmount.tenths > myPrevious : parsedAmount.tenths < myPrevious;
    return { cost, affordable: cost <= (me?.remainingChips ?? 0), movingToward };
  }, [view, snapshot, parsedAmount, myPrevious, me]);

  const elapsedMs = useMemo(() => {
    if (!view || view.status !== 'ACTIVE' || view.turnStartedAt === null || view.activePlayerId === null) return 0;
    return Math.max(0, serverNow - view.turnStartedAt);
  }, [view, serverNow]);

  const messages: ChatMessageItem[] = useMemo(
    () =>
      timeline
        .filter((item) => item.kind === 'MESSAGE_SENT')
        .map((item) => ({ actor: item.actor === 'me' ? 'me' : 'opponent', text: item.text })),
    [timeline],
  );
  const unread = Math.max(0, messages.filter((m) => m.actor === 'opponent').length - seenMessages);

  function turnState(): TurnState {
    if (!view) return 'reconnecting';
    if (terminal) return 'done';
    if (view.status === 'PAUSED') return 'paused';
    if (!connected) return 'reconnecting';
    return view.myTurn ? 'yours' : 'theirs';
  }

  // -- commands -------------------------------------------------------------

  async function readyUp(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/ready`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID() }),
      });
      if (!res.ok) setError((await res.json()).message ?? 'ready rejected');
    } finally {
      setPending(false);
    }
  }

  async function submitOffer(): Promise<void> {
    if (!parsedAmount.ok) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/offers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID(), amountTenths: parsedAmount.tenths }),
      });
      if (res.ok) setAmountInput('');
      else setError(gameLanguage(await res.json()));
    } finally {
      setPending(false);
    }
  }

  async function acceptOffer(): Promise<void> {
    if (!opponent?.standingOfferId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID(), offerId: opponent.standingOfferId }),
      });
      if (!res.ok) setError(gameLanguage(await res.json()));
    } finally {
      setPending(false);
    }
  }

  async function walkAway(): Promise<void> {
    // Confirmation lives in the ⋯ menu sheet (board LMD-07): the caller
    // invokes this only after the hold-to-confirm completes.
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/walk-away`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID() }),
      });
      if (!res.ok) setError(gameLanguage(await res.json()));
    } finally {
      setPending(false);
    }
  }

  async function sendChat(override?: string): Promise<void> {
    // `override` is the quick-prompt path (chat-panel): a prompt sends as
    // a normal chat message — COMM stays mechanically separate from
    // FORMAL OFFER, and chat never changes turn state (GR-013).
    const body = (override ?? chatInput).trim();
    if (!body) return;
    setChatInput('');
    try {
      await fetch(`${API_URL}/v1/matches/${matchId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ commandId: crypto.randomUUID(), body }),
      });
    } catch {
      /* socket state will resync */
    }
  }

  /** Rule rejections explained in game language (docs/09 §11), never raw codes. */
  function gameLanguage(body: { code?: string; message?: string }): string {
    switch (body.code) {
      case 'NOT_YOUR_TURN':
        return "It's the opponent's move right now.";
      case 'DUPLICATE_OFFER':
        return 'You already moved to that number. You cannot take a concession back.';
      case 'NON_MONOTONIC_CONCESSION':
        return 'You cannot take that concession back. Move only toward the opponent.';
      case 'OUTSIDE_RESERVATION_VALUE':
        return view?.myRole === 'BUYER'
          ? 'Your mandate does not allow you to offer that much.'
          : 'Your mandate does not allow you to offer that little.';
      case 'INSUFFICIENT_CONCESSION_CHIPS':
        return 'That move costs more chips than you have left.';
      case 'OFFER_NOT_CURRENT':
        return 'That offer is no longer on the table.';
      case 'OFFER_NOT_ACCEPTABLE_BY_RESERVATION':
        return 'Accepting that would break your mandate.';
      case 'COMMAND_ALREADY_PROCESSED':
        return 'That action was already processed.';
      case 'TIMED_OUT':
        return 'Time is up — the match is ending by timeout.';
      case 'AMOUNT_OUT_OF_RANGE':
      case 'INVALID_AMOUNT':
        return 'Use a positive amount with one decimal, between 0.1 and 999,999,999.9.';
      default:
        return body.message ?? 'That move is not legal.';
    }
  }

  // -- render ---------------------------------------------------------------

  if (!opponentJoined) {
    return (
      <main className="home">
        <div className="panel">
          <h2>Challenge created</h2>
          <p className="home-sub">Share the link with your opponent to begin. The match starts once they join and both players are ready.</p>
        </div>
      </main>
    );
  }

  if (!snapshot || !view || !me || !opponent) {
    return <main className="home"><p>Loading match…</p></main>;
  }

  if (view.status === 'CREATED' || view.status === 'READY') {
    const aiOpponent = snapshot.aiOpponents[0] ?? null;
    return (
      <main>
        <span aria-live="polite" className="sr-only">{announcement}</span>
        <div className="market-world">
          <MerchantSceneStaging />
        </div>
        <div className="world-overlay">
          <div className="staging-card">
            <h2>{aiOpponent ? `${aiOpponent.displayName} has taken the table` : 'Waiting for both players to be ready'}</h2>
            <p>
              {aiOpponent
                ? 'Practice match · unrated. Ready up and the deal opens.'
                : `Your opponent has ${view.status === 'READY' ? 'readied up' : 'joined'}. The deal opens when both of you are ready.`}
            </p>
            <button type="button" className="counter-btn" data-testid="ready-button" onClick={readyUp} disabled={pending}>
              {view.status === 'READY' ? 'Waiting for opponent…' : 'Ready'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <span aria-live="polite" role="status" className="sr-only">{announcement}</span>

      <NegotiationBoard
        snapshot={snapshot}
        turnState={turnState()}
        thinkingMs={elapsedMs}
        opponentStats={opponentStats}
        timeline={timeline}
        messages={messages}
        unread={unread}
        onChatSeen={() => setSeenMessages(messages.filter((m) => m.actor === 'opponent').length)}
        composer={{
          value: amountInput,
          onChange: setAmountInput,
          myRole: view.myRole,
          myPreviousTenths: myPrevious,
          myLimitTenths: view.myReservationValueTenths,
          remainingChips: me.remainingChips,
          preview,
          disabled: pending || !view.myTurn,
          onSubmit: submitOffer,
        }}
        actions={{
          canOffer:
            view.myTurn &&
            parsedAmount.ok &&
            (myPrevious === null || (preview !== null && preview.movingToward && preview.affordable)),
          canAccept:
            view.myTurn &&
            opponent.latestOfferTenths !== null &&
            opponent.standingOfferId !== null &&
            (view.myRole === 'BUYER'
              ? opponent.latestOfferTenths <= (view.myReservationValueTenths ?? Infinity)
              : opponent.latestOfferTenths >= (view.myReservationValueTenths ?? -Infinity)),
          acceptAmountTenths: opponent.latestOfferTenths,
          pending,
          onOffer: submitOffer,
          onAccept: acceptOffer,
          onWalkAway: walkAway,
        }}
        chat={{
          value: chatInput,
          onChange: setChatInput,
          onSend: sendChat,
          disabled: terminal,
        }}
      />

      {error && <p className="world-error" role="alert">{error}</p>}

      {terminal && view.economy && (
        <ResultReveal snapshot={snapshot} userId={userId} onRematch={onRematch} matchId={matchId} />
      )}
    </main>
  );
}

/** The empty harbor shown behind the staging overlay. */
function MerchantSceneStaging() {
  return <MerchantScene spotOn="mine" />;
}

function toTimelineItem(
  event: { type: string; actorPlayerId: string | null; payload: Record<string, unknown> },
  userId: string,
): TimelineItem | null {
  const actor = event.actorPlayerId === userId ? 'me' : 'opponent';
  switch (event.type) {
    case 'OFFER_SUBMITTED': {
      const amount = formatTenthsGrouped(event.payload.amountTenths as number);
      const isOpening = event.payload.isOpening === true;
      const cost = event.payload.concessionCostChips as number;
      const text = `${actor === 'me' ? 'You' : 'Opponent'} offered ${amount}${isOpening ? ' (opening · free)' : ` (−${cost} chips)`}`;
      return { kind: event.type, text, actor };
    }
    case 'MESSAGE_SENT':
      return { kind: event.type, text: `${String(event.payload.body)}`, actor };
    case 'OFFER_ACCEPTED':
      return { kind: event.type, text: `Deal accepted at ${formatTenthsGrouped(event.payload.amountTenths as number)}`, actor: 'system' };
    case 'WALKED_AWAY':
      return { kind: event.type, text: `${actor === 'me' ? 'You' : 'Opponent'} walked away · no deal`, actor };
    case 'TIMED_OUT':
      return { kind: event.type, text: `${actor === 'me' ? 'You' : 'Opponent'} ran out of time · no deal`, actor };
    case 'MATCH_STARTED':
      return { kind: event.type, text: 'Match started', actor: 'system' };
    case 'PLAYER_DISCONNECTED':
      return { kind: event.type, text: `${actor === 'me' ? 'You' : 'Opponent'} disconnected · clock frozen`, actor };
    case 'PLAYER_RECONNECTED':
      return { kind: event.type, text: `${actor === 'me' ? 'You' : 'Opponent'} reconnected · clock resumed`, actor };
    case 'MATCH_PAUSED':
      return { kind: event.type, text: 'Match paused', actor: 'system' };
    default:
      return null;
  }
}
