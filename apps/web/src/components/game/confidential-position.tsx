'use client';

import { formatTenthsGrouped } from '../../lib/format';

/**
 * My reservation value as the ember "MY LIMIT · ONLY YOU" card (canvas
 * v1). Always shows the value (it is my own private number); the mandate
 * narrative sits inside the toggle. `pulse` marks the private-to-me
 * "their standing offer is inside my mandate" state (DEC-029).
 */
export default function ConfidentialPosition({
  limitTenths,
  mandate,
  pulse,
}: {
  limitTenths?: number;
  mandate?: string;
  pulse?: boolean;
}) {
  return (
    <details className={`lm-limit ${pulse ? 'lm-limit--pulse' : ''}`} data-testid="confidential">
      <summary>
        <span className="lm-limit__k">
          <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
            <rect x="1" y="6" width="10" height="8" rx="2" fill="#FFF4E8" />
            <path d="M3 6 V4 a3 3 0 0 1 6 0 V6" stroke="#FFF4E8" strokeWidth="2" fill="none" />
          </svg>
          MY MAX · ONLY YOU
        </span>
        <span className="lm-limit__v num" data-testid="my-rv">
          {limitTenths !== undefined ? formatTenthsGrouped(limitTenths) : '—'}
        </span>
        <span className="lm-limit__seal" aria-hidden="true">· SEALED</span>
      </summary>
      <div className="lm-limit__body">
        {mandate && <p>{mandate}</p>}
        <p className="lm-limit__line">
          Your limit: {limitTenths !== undefined ? formatTenthsGrouped(limitTenths) : '—'}. Only you can see this.
        </p>
      </div>
    </details>
  );
}
