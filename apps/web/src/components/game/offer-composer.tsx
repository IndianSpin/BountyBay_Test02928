'use client';

import { parseAmountTenths } from '@bounty-bay/domain';
import { formatTenthsGrouped } from '../../lib/format';

/**
 * OfferComposer as the parchment counter card (canvas v1): −/+ steppers,
 * the number, the move delta, and the cost line. The client preview is
 * advisory only; the server remains authoritative. `offer-input` and
 * `cost-preview` testids are E2E contracts.
 */

export interface ComposerModel {
  value: string;
  onChange: (value: string) => void;
  myRole: 'BUYER' | 'SELLER';
  myPreviousTenths: number | null;
  myLimitTenths?: number;
  remainingChips: number;
  preview: { cost: number; affordable: boolean; movingToward: boolean } | null;
  disabled: boolean;
  onSubmit: () => void;
}

export default function OfferComposer({ model }: { model: ComposerModel }) {
  const parsed = parseAmountTenths(model.value);
  const amount = parsed.ok ? parsed.tenths : null;

  function step(deltaTenths: number): void {
    const base = amount ?? (model.myPreviousTenths ?? 0);
    const next = Math.max(1, base + deltaTenths);
    model.onChange(String(next / 10));
  }

  let feedback: React.ReactNode = null;
  if (model.value.trim() !== '' && amount !== null) {
    if (model.myPreviousTenths === null) {
      feedback = <span className="preview-free">Opening offer · free</span>;
    } else if (model.preview) {
      const move = amount - model.myPreviousTenths;
      const direction = model.myRole === 'BUYER' ? 'move-up' : 'move-down';
      const directionOther = model.myRole === 'BUYER' ? 'move-down' : 'move-up';
      feedback = (
        <>
          <span className={`${model.preview.movingToward ? direction : directionOther}`}>
            move {move > 0 ? '+' : ''}
            {formatTenthsGrouped(Math.abs(move))}
            {model.preview.movingToward ? '' : ' · not toward them'}
          </span>
          <span>
            costs <b className="num">{model.preview.cost} chips</b>
          </span>
          <span>
            <b className="num">{Math.max(0, model.remainingChips - model.preview.cost)} left after</b>
            {!model.preview.affordable && <em className="too-expensive"> · not enough chips</em>}
          </span>
          <span className="lm-composer__no-back">can&rsquo;t go back down</span>
        </>
      );
    }
  } else if (model.value.trim() !== '') {
    feedback = <span className="invalid-amount">Use a positive amount with one decimal (e.g. 62.5).</span>;
  }

  const beyondLimit =
    amount !== null && model.myLimitTenths !== undefined && model.myRole === 'BUYER' && amount > model.myLimitTenths
      ? `Your mandate does not allow you to offer more than ${formatTenthsGrouped(model.myLimitTenths)}.`
      : amount !== null && model.myLimitTenths !== undefined && model.myRole === 'SELLER' && amount < model.myLimitTenths
        ? `Your mandate does not allow you to offer less than ${formatTenthsGrouped(model.myLimitTenths)}.`
        : null;

  return (
    <div className="lm-composer">
      <span className="lm-composer__k">YOUR OFFER · NOT SENT</span>
      <div className="lm-composer__row">
        <button type="button" className="lm-stepper" aria-label="decrease offer" onClick={() => step(-1)} disabled={model.disabled}>
          −
        </button>
        <input
          data-testid="offer-input"
          inputMode="decimal"
          value={model.value}
          onChange={(e) => model.onChange(e.target.value)}
          placeholder={model.myPreviousTenths !== null ? `below ${formatTenthsGrouped(model.myPreviousTenths)}` : 'e.g. 62.5'}
          disabled={model.disabled}
          aria-describedby="cost-preview"
          className="lm-composer__input"
          autoComplete="off"
        />
        <button type="button" className="lm-stepper" aria-label="increase offer" onClick={() => step(1)} disabled={model.disabled}>
          +
        </button>
        {amount !== null && model.myPreviousTenths !== null && (
          <span className="lm-composer__delta">
            {amount - model.myPreviousTenths > 0 ? '+' : ''}
            {formatTenthsGrouped(Math.abs(amount - model.myPreviousTenths))}
          </span>
        )}
      </div>
      <div className="lm-composer__cost" id="cost-preview" data-testid="cost-preview" aria-live="polite">
        {feedback}
        {beyondLimit && <span className="invalid-amount">{beyondLimit}</span>}
      </div>
    </div>
  );
}
