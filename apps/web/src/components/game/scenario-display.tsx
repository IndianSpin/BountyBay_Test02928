'use client';

/**
 * ScenarioDisplay: the negotiated object on the velvet at the center of
 * the table (canvas v1). The asset is decorative presentation; the
 * scenario title stays in the accessible label.
 */
export default function ScenarioDisplay({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="lm-asset" data-testid="scenario-display" aria-label={title ?? 'The negotiated object'}>
      <img src="/game/asset-compass.svg" alt={title ?? 'The negotiated object'} />
      <span className="sr-only">{description}</span>
    </div>
  );
}
