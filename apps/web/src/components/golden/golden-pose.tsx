'use client';

/**
 * GOLDEN POSE (BB-256): the golden pages render REAL character art
 * through the same registry seam the live app uses — files (per-pose
 * SVGs), sheets (15-cell sprite) or avatar — plus the founder's
 * animation clips (sprite-player) when motion is allowed. Nothing here
 * is a stand-in: the golden reference is a prototype of the product.
 */

import { castCharacter, type CharacterPose } from '../game/character-registry';
import AnimatedOpponent from '../game/sprite-player';

export default function GoldenPose({
  character,
  pose,
  className = '',
}: {
  character: string;
  pose: CharacterPose;
  className?: string;
}) {
  const ch = castCharacter(character);
  return (
    <div className={`gb-pose gb-pose--${ch.kind} ${className}`.trim()} aria-hidden="true">
      {ch.kind === 'files' && <img key={pose} className="gb-pose__img" src={`${ch.src}-${pose}.svg`} alt="" />}
      {ch.kind === 'sheet' && (
        <div className="gb-pose__sheet" data-pose={pose} style={{ backgroundImage: `url('${ch.src}')` }} />
      )}
      {ch.kind === 'avatar' && <img key={pose} className="gb-pose__img" src={ch.src} alt="" />}
      <AnimatedOpponent character={ch.key} pose={pose} />
    </div>
  );
}
