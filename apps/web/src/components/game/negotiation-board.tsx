'use client';

/**
 * NegotiationBoard (canvas v1, DEC-029): the first-person live match.
 * The environment carries the screen; every interface object is a diegetic
 * table object (plaques, rail, parchment composer, seals, medallion,
 * coins). Pure presentation — all state and game logic live in the
 * container. Turn state is read from the light before any label.
 */

import ChatPanel from './chat-panel';
import ChipMeter from './chip-meter';
import ClockMultiplier from './clock-multiplier';
import ConfidentialPosition from './confidential-position';
import GapMeter from './gap-meter';
import MatchActions from './match-actions';
import OfferComposer, { type ComposerModel } from './offer-composer';
import OfferPlate from './offer-plate';
import PlayerIdentity from './player-identity';
import ScenarioDisplay from './scenario-display';
import FirstPersonScene from './scene';
import TimeWarning from './time-warning';
import TurnBanner, { type TurnState } from './turn-banner';
import type { MatchSnapshot, TimelineItem } from './types';

export default function NegotiationBoard(props: {
  snapshot: MatchSnapshot;
  turnState: TurnState;
  thinkingMs: number;
  opponentStats?: { rating?: number; games?: number };
  myStats?: { rating?: number; games?: number };
  timeline: TimelineItem[];
  messages: { actor: 'me' | 'opponent'; text: string }[];
  unread: number;
  onChatSeen: () => void;
  composer: ComposerModel;
  actions: {
    canOffer: boolean;
    canAccept: boolean;
    acceptAmountTenths: number | null;
    pending: boolean;
    onOffer: () => void;
    onAccept: () => void;
    onWalkAway: () => void;
  };
  chat: {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled: boolean;
  };
  children?: React.ReactNode;
}) {
  const { view, handles, scenario } = props.snapshot;
  const me = view.participants.find((p) => p.playerId === view.myPlayerId)!;
  const opponent = view.participants.find((p) => p.playerId !== view.myPlayerId)!;
  const opponentHandle = handles[opponent.playerId] ?? 'Goldenotter';
  const ai = props.snapshot.aiOpponents[0] ?? null;

  const buyer = view.participants.find((p) => p.role === 'BUYER')!;
  const seller = view.participants.find((p) => p.role === 'SELLER')!;
  const crossed =
    view.status === 'ACTIVE' &&
    buyer.latestOfferTenths !== null &&
    seller.latestOfferTenths !== null &&
    buyer.latestOfferTenths >= seller.latestOfferTenths;

  // private-to-me: their standing offer sits inside my mandate
  const inReach =
    view.status === 'ACTIVE' &&
    !crossed &&
    opponent.latestOfferTenths !== null &&
    view.myReservationValueTenths !== undefined &&
    (me.role === 'BUYER'
      ? opponent.latestOfferTenths <= view.myReservationValueTenths
      : opponent.latestOfferTenths >= view.myReservationValueTenths);

  // GR-023: the warning tracks the active player's running clock
  const activeParticipant =
    view.status === 'ACTIVE' && view.activePlayerId !== null
      ? view.participants.find((p) => p.playerId === view.activePlayerId) ?? null
      : null;
  const activeClockSide: 'mine' | 'theirs' = view.myTurn ? 'mine' : 'theirs';
  const atFloor = (view.myTurn ? me : opponent).clockMultiplier <= 0.3005;

  const opponentPose =
    view.status !== 'ACTIVE' ? 'idle' : !view.myTurn ? 'thinking' : crossed ? 'smug' : opponent.latestOfferTenths !== null ? 'offer' : 'idle';

  const proposed = props.composer.value.trim() !== '' ? props.composer.value : undefined;

  return (
    <div className="lm-world" data-testid="market-world">
      <FirstPersonScene spotOn={view.myTurn ? 'mine' : 'theirs'} crossed={crossed} />

      {/* the opponent at the table */}
      <div className={`lm-opponent ${ai ? 'lm-opponent--ai' : ''}`} aria-hidden="true">
        {ai ? (
          <div className="lm-opponent__portrait">
            <img src={`/game/ai-${ai.personaKey}.svg`} alt="" />
          </div>
        ) : (
          <div className="lm-opponent__sprite" data-pose={opponentPose} />
        )}
      </div>
      <PlayerIdentity handle={ai ? ai.displayName : opponentHandle} role={opponent.role} stats={props.opponentStats} side="theirs" />

      {/* turn ribbon (exact strings — E2E contract) + crossed ribbon.
          crossed maps back to the turn label; the crossed ribbon is its own
          element so the E2E exact-match on the turn text never breaks. */}
      <TurnBanner
        state={
          props.turnState === 'crossed' ? (view.myTurn ? 'yours' : 'theirs') : props.turnState === 'done' ? 'terminal' : props.turnState
        }
      />
      {crossed && (
        <span className="lm-ribbon lm-ribbon--deal lm-crossed-ribbon" data-testid="crossed-ribbon">
          OFFERS CROSSED · ACCEPT TO CLOSE
        </span>
      )}
      <h2 className="sr-only" data-testid="match-status">
        {view.myRole} vs {opponent.role} · {view.status}
      </h2>

      {/* hanging offer plaques */}
      <OfferPlate
        kind="theirs"
        who={`${(ai ? ai.displayName : opponentHandle).toUpperCase()} ASKS`}
        amountTenths={opponent.latestOfferTenths}
        tag={opponent.latestOfferTenths === null ? 'has not moved yet' : 'standing'}
        active={!view.myTurn && view.status === 'ACTIVE'}
        crossed={crossed}
        testId="opponent-standing"
      />
      <OfferPlate
        kind="mine"
        who="YOUR OFFER"
        amountTenths={me.latestOfferTenths}
        tag={me.latestOfferTenths === null ? 'you have not moved yet' : 'committed · cannot move back'}
        active={view.myTurn && view.status === 'ACTIVE'}
        crossed={crossed}
        testId="my-standing"
      />

      {/* my private limit card */}
      <ConfidentialPosition limitTenths={view.myReservationValueTenths} mandate={scenario?.myNarrative} pulse={inReach} />

      {/* the negotiated object */}
      <ScenarioDisplay title={scenario?.title ?? 'The Deal'} description={scenario?.description ?? ''} />

      {/* the schematic price rail */}
      <GapMeter
        mineTenths={me.latestOfferTenths}
        theirsTenths={opponent.latestOfferTenths}
        crossed={crossed}
        proposedTenths={proposed}
      />

      {/* the active player's clock medallion + time warning */}
      <ClockMultiplier
        multiplier={(view.myTurn ? me : opponent).clockMultiplier}
        thinkingMs={view.myTurn && view.status === 'ACTIVE' ? props.thinkingMs : undefined}
        side={activeClockSide}
        atFloor={atFloor}
      />
      <TimeWarning
        tier={activeParticipant?.timeTier ?? null}
        remainingMs={activeParticipant?.decisionTimeRemainingMs ?? null}
        who={activeParticipant !== null ? (activeParticipant.playerId === view.myPlayerId ? 'YOUR TIME' : 'OPPONENT TIME') : undefined}
      />

      {/* my coin pile */}
      <ChipMeter remaining={me.remainingChips} total={me.remainingChips + me.chipsSpent} />

      {/* market talk */}
      <ChatPanel
        timeline={props.timeline}
        messages={props.messages}
        unread={props.unread}
        onSend={props.chat.onSend}
        onSeen={props.onChatSeen}
        disabled={props.chat.disabled}
        inputValue={props.chat.value}
        onInputChange={props.chat.onChange}
      />

      {/* the parchment composer + seal + accept + menu */}
      <OfferComposer model={props.composer} />
      <MatchActions {...props.actions} sealAmount={proposed} crossed={crossed} />

      {props.children}
    </div>
  );
}
