'use client';

/**
 * Turn ribbon (canvas v1, DEC-029). The innerText of this element is
 * EXACTLY 'YOUR MOVE' / 'OPPONENT THINKING' / the other states — E2E
 * matches on it, so nothing else may live inside this element. The
 * crossed state has its own ribbon (negotiation-board).
 */

export type TurnState = 'yours' | 'theirs' | 'reconnecting' | 'paused' | 'terminal' | 'crossed' | 'done';

const LABELS: Record<TurnState, string> = {
  yours: 'YOUR MOVE',
  theirs: 'OPPONENT THINKING',
  reconnecting: 'RECONNECTING',
  paused: 'PAUSED · CONNECTION LOST',
  terminal: '',
  // crossed/done are mapped by the board (crossed keeps the turn label and
  // gets its own ribbon; done renders nothing behind the result overlay)
  crossed: '',
  done: '',
};

export default function TurnBanner({ state }: { state: TurnState }) {
  const kind =
    state === 'yours' ? 'player' : state === 'theirs' ? 'opponent' : state === 'paused' ? 'danger' : 'warn';
  return (
    <span className={`lm-ribbon lm-ribbon--${kind}`} data-testid="turn-banner" role="status">
      {LABELS[state]}
    </span>
  );
}
