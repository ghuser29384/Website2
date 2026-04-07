import type { FormEvent } from "react";

import {
  CAUSE_OPTIONS,
  COMPROMISE_CAUSE_OPTIONS,
  DURATION_OPTIONS,
  OFFER_MODE_OPTIONS,
  type OfferDraft,
  type OfferMode,
  VERIFICATION_OPTIONS,
} from "@/lib/offers";

interface OfferComposerProps {
  draft: OfferDraft;
  onFieldChange: (field: keyof OfferDraft, value: string | number | boolean) => void;
  onModeChange: (mode: OfferMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetLocalOffers: () => void;
}

export function OfferComposer({
  draft,
  onFieldChange,
  onModeChange,
  onSubmit,
  onResetLocalOffers,
}: OfferComposerProps) {
  const isOffset = draft.mode === "offset";
  const isPayment = draft.mode === "payment";

  return (
    <form className="panel composer" onSubmit={onSubmit}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Offer composer</p>
          <h3>New moral trade</h3>
        </div>
        <span className="panel-note">Client-side prototype</span>
      </div>

      <label className="field">
        <span>Alias</span>
        <input
          maxLength={40}
          name="alias"
          placeholder="e.g. Victoria"
          type="text"
          value={draft.alias}
          onChange={(event) => onFieldChange("alias", event.currentTarget.value)}
        />
      </label>

      <label className="field">
        <span>Exchange mode</span>
        <select
          name="mode"
          value={draft.mode}
          onChange={(event) => onModeChange(event.currentTarget.value as OfferMode)}
        >
          {OFFER_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="field-grid">
        <label className="field">
          <span>What you&apos;re offering</span>
          <select
            name="offeredCause"
            value={draft.offeredCause}
            onChange={(event) => onFieldChange("offeredCause", event.currentTarget.value)}
          >
            {CAUSE_OPTIONS.map((cause) => (
              <option key={cause} value={cause}>
                {cause}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>What you want in return</span>
          <select
            name="requestedCause"
            value={draft.requestedCause}
            onChange={(event) => onFieldChange("requestedCause", event.currentTarget.value)}
          >
            {CAUSE_OPTIONS.slice()
              .reverse()
              .map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>What will you do?</span>
        <textarea
          name="offerAction"
          placeholder={
            isOffset
              ? "e.g. Redirect $1,000 I would have donated to an opposed advocacy cause into a compromise fund."
              : isPayment
                ? "e.g. Pay $600 if the counterparty adopts a vegetarian diet for 12 months."
              : "e.g. Donate 1% of my income to an effective poverty charity for 12 months."
          }
          rows={3}
          value={draft.offerAction}
          onChange={(event) => onFieldChange("offerAction", event.currentTarget.value)}
        />
      </label>

      <label className="field">
        <span>What do you want the other side to do?</span>
        <textarea
          name="requestAction"
          placeholder={
            isOffset
              ? "e.g. Redirect your matching opposed donation into the same compromise fund."
              : isPayment
                ? "e.g. Adopt a vegetarian diet for 12 months with monthly check-ins."
              : "e.g. Adopt a vegetarian diet for 12 months."
          }
          rows={3}
          value={draft.requestAction}
          onChange={(event) => onFieldChange("requestAction", event.currentTarget.value)}
        />
      </label>

      <label className="field">
        <span>Compromise destination (offset only)</span>
        <select
          disabled={!isOffset}
          name="compromiseCause"
          value={draft.compromiseCause}
          onChange={(event) => onFieldChange("compromiseCause", event.currentTarget.value)}
        >
          {COMPROMISE_CAUSE_OPTIONS.map((cause) => (
            <option key={cause} value={cause}>
              {cause}
            </option>
          ))}
        </select>
      </label>

      <div className="meter-grid">
        <label className="field meter-field">
          <span>Your impact estimate</span>
          <div className="range-row">
            <input
              max={10}
              min={1}
              name="offerImpact"
              type="range"
              value={draft.offerImpact}
              onChange={(event) => onFieldChange("offerImpact", Number(event.currentTarget.value))}
            />
            <output htmlFor="offerImpact">{draft.offerImpact}</output>
          </div>
          <small>How strong this action feels on your own moral scale.</small>
        </label>

        <label className="field meter-field">
          <span>Minimum counterparty impact</span>
          <div className="range-row">
            <input
              max={10}
              min={1}
              name="minCounterpartyImpact"
              type="range"
              value={draft.minCounterpartyImpact}
              onChange={(event) =>
                onFieldChange("minCounterpartyImpact", Number(event.currentTarget.value))
              }
            />
            <output htmlFor="minCounterpartyImpact">{draft.minCounterpartyImpact}</output>
          </div>
          <small>Your threshold for calling the trade worthwhile.</small>
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Verification preference</span>
          <select
            name="verification"
            value={draft.verification}
            onChange={(event) => onFieldChange("verification", event.currentTarget.value)}
          >
            {VERIFICATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Review period</span>
          <select
            name="duration"
            value={draft.duration}
            onChange={(event) => onFieldChange("duration", event.currentTarget.value)}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field meter-field">
        <span>Trust intensity</span>
        <div className="range-row">
          <input
            max={5}
            min={1}
            name="trustLevel"
            type="range"
            value={draft.trustLevel}
            onChange={(event) => onFieldChange("trustLevel", Number(event.currentTarget.value))}
          />
          <output htmlFor="trustLevel">{draft.trustLevel}</output>
        </div>
        <small>Higher values indicate stronger verification and longer commitment requirements.</small>
      </label>

      <label className="field">
        <span>Why this trade matters to you</span>
        <textarea
          name="notes"
          placeholder="Explain the moral reasoning or practical detail that would help a counterparty trust the offer."
          rows={3}
          value={draft.notes}
          onChange={(event) => onFieldChange("notes", event.currentTarget.value)}
        />
      </label>

      <label className="check-row">
        <input
          checked={draft.counterfactualHonesty}
          name="counterfactualHonesty"
          type="checkbox"
          onChange={(event) => onFieldChange("counterfactualHonesty", event.currentTarget.checked)}
        />
        <span>I am honestly stating a trade-dependent action, not something I would do anyway.</span>
      </label>

      <label className="check-row">
        <input
          checked={draft.policyPledge}
          name="policyPledge"
          type="checkbox"
          onChange={(event) => onFieldChange("policyPledge", event.currentTarget.checked)}
        />
        <span>I am not asking for anything illegal, deceptive, or electorally sensitive.</span>
      </label>

      <div className="form-actions">
        <button className="button button-primary" type="submit">
          Add offer
        </button>
        <button className="button button-secondary" type="button" onClick={onResetLocalOffers}>
          Reset local offers
        </button>
      </div>
    </form>
  );
}
