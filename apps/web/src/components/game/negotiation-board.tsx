'use client';

import { parseAmountTenths } from '@bounty-bay/domain';

import { formatTenthsGrouped } from '../../lib/format';
import type { CharacterPose } from './character-registry';

/** PV-Comms: quick lines are PERFORMED — a pose per shared line
 *  (signature gestures per character are art-level, not exported). */
const QUICK_LINE_POSES: Record<string, CharacterPose> = {
  'why?': 'speaking',
  'too far.': 'smug',
  "i'm holding.": 'idle',
  'you need to move.': 'speaking',
  "we're close.": 'offer',
  'is that final?': 'thinking',
  'what would get this done?': 'speaking',
};

/**
 * NegotiationBoard (BB-216, founder D-24 + D-26): the first-person live
 * match, readable in exactly this order — Opponent → their offer → my
 * position/limit → action. Four protected zones carry ~five objects; the
 * opponent dominates and physically reacts (sprite poses + plaque
 * landing); numbers are physical events on the rail. Pure presentation —
 * all state and game logic live in the container.
 */

import { PERSONA_CHARACTER, castCharacter } from './character-registry';
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
  // BB-225: the opponent's character presentation. AI personas resolve
  // through the registry; humans are GoldenOtter until character
  // selection exists (the registry is that seam).
  const opponentCharacter = castCharacter(ai !== null ? (PERSONA_CHARACTER[ai.personaKey as keyof typeof PERSONA_CHARACTER] ?? 'goldenotter') : 'goldenotter');

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
  // D-26 #3, PV-Comms): key-pose swap per state — the rig in-betweening
  // lives in the canvas, the exported poses are what ships. Conversation
  // first: while the opponent's latest message bubbles beside them they
  // hold the speaking pose (quick lines get their own pose); then the
  // negotiation state speaks.
  const lastMessage = props.messages.length > 0 ? props.messages[props.messages.length - 1]! : null;
  const opponentPose =
    view.status === 'PAUSED'
      ? 'offline'
      : view.status !== 'ACTIVE'
        ? 'idle'
        : !view.myTurn
          ? 'thinking'
          : lastMessage !== null && lastMessage.actor === 'opponent'
            ? (QUICK_LINE_POSES[lastMessage.text.toLowerCase()] ?? 'speaking')
            : crossed
              ? 'smug'
              : opponent.latestOfferTenths !== null
                ? 'offer'
                : 'idle';

  // PV-Seq: the public trail — every offer in order, both sides. The
  // board never interprets it; the player does (the words vs the trail
  // sit on screen together and the game never connects them).
  const offers = props.timeline
    .filter((item) => item.kind === 'OFFER_SUBMITTED' && item.amountTenths !== undefined)
    .map((item) => ({ amountTenths: item.amountTenths!, actor: item.actor, isOpening: item.isOpening === true }));
  const myTrail = offers.filter((o) => o.actor === 'me').map((o) => o.amountTenths);
  const theirTrail = offers.filter((o) => o.actor === 'opponent').map((o) => o.amountTenths);
  const openingOffers = offers.filter((o) => o.isOpening);

  // PV-Juice INTENSITY 6: "close" is computed ONLY from public offers
  // (the warm light never hints at anyone's limit).
  const myLastTrail = myTrail.length > 0 ? myTrail[myTrail.length - 1]! : null;
  const theirLastTrail = theirTrail.length > 0 ? theirTrail[theirTrail.length - 1]! : null;
  const close =
    view.status === 'ACTIVE' &&
    !crossed &&
    myLastTrail !== null &&
    theirLastTrail !== null &&
    openingOffers.length === 2 &&
    Math.abs(myLastTrail - theirLastTrail) <= 0.2 * Math.abs(openingOffers[0]!.amountTenths - openingOffers[1]!.amountTenths);

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
    <div
      className={`lm-world ${crossed ? 'lm-world--crossed' : ''} ${ai ? 'lm-world--ai' : ''} ${
        view.myTurn && view.status === 'ACTIVE' ? 'lm-world--mine' : ''
      } ${close ? 'lm-world--close' : ''}`}
      data-testid="market-world"
    >
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
        <div className={`lm-opponent lm-opponent--${opponentCharacter.kind}`} aria-hidden="true">
          {opponentCharacter.kind === 'files' && (
            /* canvas v2 (GO2): the Closer poses ship as single SVGs; the
               key remounts a crossfade on every reaction change */
            <img key={opponentPose} className="lm-opponent__pose" src={`${opponentCharacter.src}-${opponentPose}.svg`} alt="" />
          )}
          {opponentCharacter.kind === 'sheet' && (
            /* cast-v2 sheets: a cell per key state (600px grid); the
               position transition slides between poses */
            <div className="lm-opponent__sheet" data-pose={opponentPose} style={{ backgroundImage: `url('${opponentCharacter.src}')` }} />
          )}
          {opponentCharacter.kind === 'avatar' && (
            /* single-portrait character (GREYLOT until the v3 pose set
               is exported): static, keyed crossfade only */
            <img key={opponentPose} className="lm-opponent__pose lm-opponent__avatar" src={opponentCharacter.src} alt="" />
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
          myTrail={myTrail}
          theirTrail={theirTrail}
        />
        <div className="lm-myband">
          {/* my private limit card — MY MAX · SEALED (PV-Seq frame 02) */}
          <ConfidentialPosition limitTenths={view.myReservationValueTenths} mandate={scenario?.myNarrative} pulse={inReach} />
        </div>
        {/* my standing offer — a plaque at MY end of the rail (PV-Seq:
            plaques live ON the rail; MY MAX stays the private card) */}
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
      </section>

      {/* ZONE 3 · action: the composer and the ONE seal */}
      <section className="lm-action-zone">
        <OfferComposer model={props.composer} />
        <MatchActions {...props.actions} sealAmount={sealAmount} crossed={crossed} />
        {/* BB-213 + BB-232: W1's private dossier (DD-M2) — collapsed behind
            a disclosure (the panel is on demand; its DOM and testids are
            untouched). In the action zone so the mobile sheet stays one
            contiguous panel. Role-scoped by the API. */}
        {scenario !== null && (
          <details className="lm-dossier">
            <summary>
              <span>Private dossier</span>
              <span className="lm-dossier__hint">only you can see this</span>
            </summary>
            <Dossier
              sharedContext={scenario.sharedContext}
              privateContext={scenario.myPrivateContext}
              facts={scenario.myPrivateFacts}
              role={view.myRole}
            />
          </details>
        )}
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
