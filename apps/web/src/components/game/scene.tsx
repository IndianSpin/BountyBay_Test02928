'use client';

/**
 * First-person live-match environment (Claude Design canvas v1, boards
 * LMR-D/M, DEC-029): the lantern wharf scene, seat lighting (turn state
 * is read from light before any label), and the first-person table.
 * Pure presentation — no game state lives here.
 */

export default function FirstPersonScene({ spotOn, crossed }: { spotOn: 'mine' | 'theirs'; crossed?: boolean }) {
  return (
    <>
      <div className="lm-world__scene" aria-hidden="true" />
      <div className={`lm-light ${spotOn === 'mine' ? 'lm-light--player' : 'lm-light--opponent'}`} aria-hidden="true" />
      {crossed && (
        <div
          className="lm-light"
          style={{ background: 'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(63,190,107,.20), rgba(63,190,107,0) 70%)' }}
          aria-hidden="true"
        />
      )}
      <div className="lm-dim" aria-hidden="true" />
      <img
        src="/game/table-fp.svg"
        alt=""
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', zIndex: 2, pointerEvents: 'none' }}
      />
    </>
  );
}
