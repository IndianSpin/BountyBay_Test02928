'use client';

import { parseAmountTenths } from '@bounty-bay/domain';

import { formatTenthsGrouped } from '../../lib/format';

/**
 * NegotiationBoard (BB-216, founder D-24 + D-26): the first-person live
 * match, readable in exactly this order — Opponent → their offer → my
 * position/limit → action. Four protected zones carry ~five objects; the
 * opponent dominates and physically reacts (sprite poses + plaque
 * landing); numbers are physical events on the rail. Pure presentation —
 * all state and game logic live in the container.
 */

import ChatPanel from './chat-panel';
import ChipMeter from './chip-meter';
import ClockMultiplier from './clock-multiplier';
import ConfidentialPosition from './confidential-position';
import Dossier from './dossier';
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
    onSend: (text?: string) => void;
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

  // Character reactions (canvas v2, GO2-Animation key states; D-24 #2,
  // D-26 #3): key-pose swap per state — the rig in-betweening lives in
  // the canvas, the exported poses are what ships. Conversation first:
  // while the opponent's latest message bubbles beside them they hold
  // the speaking pose; then the negotiation state speaks.
  const lastMessage = props.messages.length > 0 ? props.messages[props.messages.length - 1]! : null;
  const opponentPose =
    view.status === 'PAUSED'
      ? 'offline'
      : view.status !== 'ACTIVE'
        ? 'idle'
        : !view.myTurn
          ? 'thinking'
          : lastMessage !== null && lastMessage.actor === 'opponent'
            ? 'speaking'
            : crossed
              ? 'smug'
              : opponent.latestOfferTenths !== null
                ? 'offer'
                : 'idle';

  const proposed = props.composer.value.trim() !== '' ? props.composer.value : undefined;

  // D-24 #8/#10 (visual half; the canOffer predicate is BB-217's): the
  // seal never advertises an amount outside my mandate as the hero CTA.
  const parsedProposed = parseAmountTenths(props.composer.value);
  const sealLegal =
    parsedProposed.ok &&
    (view.myReservationValueTenths === undefined ||
      (view.myRole === 'BUYER'
        ? parsedProposed.tenths <= view.myReservationValueTenths
        : parsedProposed.tenths >= view.myReservationValueTenths));
  const sealAmount = sealLegal && parsedProposed.ok ? formatTenthsGrouped(parsedProposed.tenths) : undefined;

  const theirKey = `their-${opponent.latestOfferTenths ?? 'none'}`;
  const mineKey = `mine-${me.latestOfferTenths ?? 'none'}`;

  return (
    <div className={`lm-world ${crossed ? 'lm-world--crossed' : ''} ${ai ? 'lm-world--ai' : ''}`} data-testid="market-world">
      <FirstPersonScene spotOn={view.myTurn ? 'mine' : 'theirs'} crossed={crossed} />

      {/* the negotiated object — world decoration, not an interface object */}
      <ScenarioDisplay title={scenario?.title ?? 'The Deal'} description={scenario?.description ?? ''} />

      {/* ZONE 1 · the opponent — the emotional heart, largest element */}
      <section className="lm-opponent-zone">
        <PlayerIdentity
          handle={ai ? ai.displayName : opponentHandle}
          role={opponent.role}
          stats={props.opponentStats}
          side="theirs"
        />
        <div className={`lm-opponent ${ai ? 'lm-opponent--ai' : ''}`} aria-hidden="true">
          {ai ? (
            <div className="lm-opponent__portrait">
              <img src={`/game/ai-${ai.personaKey}.svg`} alt="" />
            </div>
          ) : (
            /* canvas v2 (GO2): the Closer poses ship as single SVGs; the
               key remounts a crossfade on every reaction change */
            <img key={opponentPose} className="lm-opponent__pose" src={`/game/otter-${opponentPose}.svg`} alt="" />
          )}
        </div>
        <ChatPanel
          timeline={props.timeline}
          messages={props.messages}
          unread={props.unread}
          onSend={props.chat.onSend}
          onSeen={props.onChatSeen}
          disabled={props.chat.disabled}
          inputValue={props.chat.value}
          onInputChange={props.chat.onChange}
          opponentName={ai ? ai.displayName : opponentHandle}
        />
      </section>

      {/* ZONE 2 · negotiation state: one plaque, one rail, my band */}
      <section className="lm-state-zone">
        {crossed && (
          <span className="lm-ribbon lm-ribbon--deal lm-crossed-ribbon" data-testid="crossed-ribbon">
            OFFERS CROSSED · ACCEPT TO CLOSE
          </span>
        )}
        {/* key remounts replay the plaque-landing event on every change */}
        <OfferPlate
          key={theirKey}
          kind="theirs"
          who={`${(ai ? ai.displayName : opponentHandle).toUpperCase()} ASKS`}
          amountTenths={opponent.latestOfferTenths}
          tag={opponent.latestOfferTenths === null ? 'has not moved yet' : 'standing'}
          active={!view.myTurn && view.status === 'ACTIVE'}
          crossed={crossed}
          testId="opponent-standing"
        />
        <GapMeter
          mineTenths={me.latestOfferTenths}
          theirsTenths={opponent.latestOfferTenths}
          crossed={crossed}
          proposedTenths={proposed}
        />
        <div className="lm-myband">
          {/* my private limit card */}
          <ConfidentialPosition limitTenths={view.myReservationValueTenths} mandate={scenario?.myNarrative} pulse={inReach} />
          {/* my standing offer — a quiet readout, not a second plaque */}
          <OfferPlate
            key={mineKey}
            kind="mine"
            who="YOUR OFFER"
            amountTenths={me.latestOfferTenths}
            tag={me.latestOfferTenths === null ? 'you have not moved yet' : 'committed · cannot move back'}
            active={view.myTurn && view.status === 'ACTIVE'}
            crossed={crossed}
            testId="my-standing"
          />
        </div>
        {/* BB-213: W1's private dossier (DD-M2) wired into the private zone.
            Role-scoped by the API — only the viewer's own dossier renders. */}
        {scenario !== null && (
          <div className="lm-dossier">
            <Dossier
              sharedContext={scenario.sharedContext}
              privateContext={scenario.myPrivateContext}
              facts={scenario.myPrivateFacts}
              role={view.myRole}
            />
          </div>
        )}
      </section>

      {/* ZONE 3 · action: the composer and the ONE seal */}
      <section className="lm-action-zone">
        <OfferComposer model={props.composer} />
        <MatchActions {...props.actions} sealAmount={sealAmount} crossed={crossed} />
      </section>

      {/* quiet row: turn chip · clock · chips · time warning (body size) */}
      <section className="lm-quiet-row">
        <TurnBanner
          state={
            props.turnState === 'crossed' ? (view.myTurn ? 'yours' : 'theirs') : props.turnState === 'done' ? 'terminal' : props.turnState
          }
        />
        <ClockMultiplier
          multiplier={(view.myTurn ? me : opponent).clockMultiplier}
          thinkingMs={view.myTurn && view.status === 'ACTIVE' ? props.thinkingMs : undefined}
          side={activeClockSide}
          atFloor={atFloor}
        />
        <ChipMeter remaining={me.remainingChips} total={me.remainingChips + me.chipsSpent} />
        <TimeWarning
          tier={activeParticipant?.timeTier ?? null}
          remainingMs={activeParticipant?.decisionTimeRemainingMs ?? null}
          who={activeParticipant !== null ? (activeParticipant.playerId === view.myPlayerId ? 'YOUR TIME' : 'OPPONENT TIME') : undefined}
        />
      </section>

      <h2 className="sr-only" data-testid="match-status">
        {view.myRole} vs {opponent.role} · {view.status}
      </h2>

      {props.children}
    </div>
  );
}
