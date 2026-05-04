"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { createOfferAction } from "@/app/actions";
import {
  calculateDonationOffsetPreview,
  createDefaultDonationOffsetFields,
  formatDonationOffsetRatio,
  formatDonationOffsetTimeHorizon,
  formatDonationOffsetUnmatchedRule,
  formatDonationOffsetVerificationMethod,
  getSelectableRegisteredCharities,
  validateDonationOffsetFields,
  DONATION_OFFSET_TIME_HORIZON_OPTIONS,
  DONATION_OFFSET_UNMATCHED_RULE_OPTIONS,
  DONATION_OFFSET_VERIFICATION_OPTIONS,
} from "@/lib/donation-offsets";
import {
  CAUSE_OPTIONS,
  COMPROMISE_CAUSE_OPTIONS,
  DURATION_OPTIONS,
  OFFER_MODE_OPTIONS,
  PAYMENT_INTERVAL_UNIT_OPTIONS,
  VERIFICATION_OPTIONS,
  type OfferMode,
} from "@/lib/offers";

interface OfferCreateFormProps {
  formMessage:
    | {
        text: string;
        tone: "error" | "success";
      }
    | null;
  supabaseReady: boolean;
}

const defaultOffsetFields = createDefaultDonationOffsetFields();

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function OfferCreateForm({ formMessage, supabaseReady }: OfferCreateFormProps) {
  const [mode, setMode] = useState<OfferMode>("pledge");
  const [offsetErrors, setOffsetErrors] = useState<string[]>([]);
  const [baselineAmountUsd, setBaselineAmountUsd] = useState(
    String(defaultOffsetFields.baselineAmountUsd ?? 1000),
  );
  const [baselineOpposedCause, setBaselineOpposedCause] = useState(
    defaultOffsetFields.baselineOpposedCause,
  );
  const [requestedMatchingAmountUsd, setRequestedMatchingAmountUsd] = useState(
    String(defaultOffsetFields.requestedMatchingAmountUsd ?? 1000),
  );
  const [requestedOpposedCause, setRequestedOpposedCause] = useState(
    defaultOffsetFields.requestedOpposedCause,
  );
  const [offerAction, setOfferAction] = useState("");
  const [requestAction, setRequestAction] = useState("");
  const [notes, setNotes] = useState("");
  const [compromiseDestinationId, setCompromiseDestinationId] = useState(
    defaultOffsetFields.compromiseDestinationId,
  );
  const [offsetRatio, setOffsetRatio] = useState(String(defaultOffsetFields.offsetRatio ?? 1));
  const [timeHorizon, setTimeHorizon] = useState(defaultOffsetFields.timeHorizon);
  const [verificationMethod, setVerificationMethod] = useState(
    defaultOffsetFields.verificationMethod,
  );
  const [unmatchedSurplusRule, setUnmatchedSurplusRule] = useState(
    defaultOffsetFields.unmatchedSurplusRule,
  );
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const isOffset = mode === "offset";
  const selectableCharities = getSelectableRegisteredCharities();

  const offsetPreview = useMemo(
    () =>
      calculateDonationOffsetPreview({
        baselineAmountUsd: Number(baselineAmountUsd),
        requestedMatchingAmountUsd: Number(requestedMatchingAmountUsd),
        offsetRatio: Number(offsetRatio),
        unmatchedSurplusRule,
      }),
    [baselineAmountUsd, requestedMatchingAmountUsd, offsetRatio, unmatchedSurplusRule],
  );

  return (
    <article className="panel auth-card">
      <div className="section-head auth-head">
        <p className="eyebrow">Offer details</p>
        <h2>Create offer</h2>
        <p>
          State the two sides, the expected gain, and the verification terms in one
          public record.
        </p>
      </div>

      {!supabaseReady ? (
        <div className="status-banner status-banner-error">
          Supabase is not configured yet. Add environment variables before creating
          live offers.
        </div>
      ) : null}

      {formMessage ? (
        <div
          className={`status-banner ${
            formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
          }`}
        >
          {formMessage.text}
        </div>
      ) : null}

      {isOffset ? (
        <div className="status-banner status-banner-error">
          Extortion is not allowed. Do not post an offset offer unless the baseline donation is a
          real trade-dependent intention that you can verify with receipts, escrow, or a third-party
          audit.
        </div>
      ) : null}

      {isOffset && offsetErrors.length ? (
        <div className="status-banner status-banner-error">
          <strong>Complete the donation offset fields before publishing.</strong>
          <ul className="clean-list">
            {offsetErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        action={createOfferAction}
        className="stack-form"
        onSubmit={(event) => {
          if (!isOffset) {
            setOffsetErrors([]);
            return;
          }

          const errors = validateDonationOffsetFields({
            baselineAmountUsd: Number(baselineAmountUsd),
            baselineOpposedCause,
            requestedMatchingAmountUsd: Number(requestedMatchingAmountUsd),
            requestedOpposedCause,
            compromiseDestinationId,
            offsetRatio: Number(offsetRatio),
            timeHorizon,
            verificationMethod,
            unmatchedSurplusRule,
            description: [offerAction, requestAction, notes].filter(Boolean).join("\n"),
            evidenceUrl,
          });

          if (errors.length) {
            event.preventDefault();
            setOffsetErrors(errors);
            return;
          }

          setOffsetErrors([]);
        }}
      >
        <label className="field">
          <span>Exchange mode</span>
          <select
            defaultValue="pledge"
            name="mode"
            onChange={(event) =>
              setMode((event.currentTarget as unknown as { value: string }).value as OfferMode)
            }
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
            <select defaultValue="Animal welfare" name="offered_cause">
              {CAUSE_OPTIONS.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>What you want in return</span>
            <select defaultValue="Global poverty" name="requested_cause">
              {CAUSE_OPTIONS.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Alias</span>
          <input name="owner_alias_override" placeholder="Optional public alias override" type="text" />
          <small>
            Leave blank to use your profile display name. Offset offers are public, so choose the
            name you want others to see.
          </small>
        </label>

        <label className="field">
          <span>What will you do?</span>
          <textarea
            name="offer_action"
            onChange={(event) => setOfferAction((event.currentTarget as unknown as { value: string }).value)}
            placeholder="e.g. Redirect $1,000 I would otherwise have donated to an opposed lobbying cause into the named compromise fund."
            rows={4}
            value={offerAction}
          />
        </label>

        <label className="field">
          <span>What do you want the other side to do?</span>
          <textarea
            name="request_action"
            onChange={(event) =>
              setRequestAction((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="e.g. Redirect the matched portion of your opposed donation into the same compromise destination."
            rows={4}
            value={requestAction}
          />
        </label>

        <label className="field">
          <span>Compromise destination (offset only)</span>
          <select defaultValue="Not needed" name="compromise_cause">
            {COMPROMISE_CAUSE_OPTIONS.map((cause) => (
              <option key={cause} value={cause}>
                {cause}
              </option>
            ))}
          </select>
        </label>

        {isOffset ? (
          <div className="panel subtle-panel offset-fieldset">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Donation offset terms</p>
                <h3>State the redirect, the compromise charity, and the fallback rule</h3>
              </div>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Baseline donation amount</span>
                <input
                  min="0.01"
                  name="baseline_amount_usd"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={baselineAmountUsd}
                  onChange={(event) =>
                    setBaselineAmountUsd((event.currentTarget as unknown as { value: string }).value)
                  }
                />
                <small>
                  This is what you would otherwise have donated to the opposed cause. Provide evidence
                  so the offer does not look like a coercive threat.
                </small>
              </label>

              <label className="field">
                <span>Baseline opposed cause</span>
                <select
                  name="baseline_opposed_cause"
                  required={isOffset}
                  value={baselineOpposedCause}
                  onChange={(event) =>
                    setBaselineOpposedCause((event.currentTarget as unknown as { value: string }).value)
                  }
                >
                  {CAUSE_OPTIONS.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
                <small>The cause or campaign your baseline donation would otherwise have supported.</small>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Requested matching donation</span>
                <input
                  min="0.01"
                  name="requested_matching_amount_usd"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={requestedMatchingAmountUsd}
                  onChange={(event) =>
                    setRequestedMatchingAmountUsd(
                      (event.currentTarget as unknown as { value: string }).value,
                    )
                  }
                />
                <small>The counterparty amount you want redirected away from the opposed cause.</small>
              </label>

              <label className="field">
                <span>Requested opposing cause</span>
                <select
                  name="requested_opposed_cause"
                  required={isOffset}
                  value={requestedOpposedCause}
                  onChange={(event) =>
                    setRequestedOpposedCause((event.currentTarget as unknown as { value: string }).value)
                  }
                >
                  {CAUSE_OPTIONS.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
                <small>The opposed cause from which you want the matching donor to redirect money.</small>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Compromise destination</span>
                <select
                  name="compromise_destination_id"
                  required={isOffset}
                  value={compromiseDestinationId}
                  onChange={(event) =>
                    setCompromiseDestinationId((event.currentTarget as unknown as { value: string }).value)
                  }
                >
                  {selectableCharities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name}
                    </option>
                  ))}
                </select>
                <small>A registered charity both sides can name as the redirected destination.</small>
              </label>

              <label className="field">
                <span>Offset ratio</span>
                <input
                  min="0.01"
                  name="offset_ratio"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={offsetRatio}
                  onChange={(event) =>
                    setOffsetRatio((event.currentTarget as unknown as { value: string }).value)
                  }
                />
                <small>
                  How many counterparty dollars should match each $1 of your baseline donation. Simple{" "}
                  <strong>1:1</strong> offsets are usually easier to match.
                </small>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Time horizon</span>
                <select
                  name="offset_time_horizon"
                  required={isOffset}
                  value={timeHorizon}
                  onChange={(event) =>
                    setTimeHorizon(
                      (event.currentTarget as unknown as { value: string }).value as typeof timeHorizon,
                    )
                  }
                >
                  {DONATION_OFFSET_TIME_HORIZON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>Use one-off for a single redirected donation and recurring for an ongoing rule.</small>
              </label>

              <label className="field">
                <span>Verification method</span>
                <select
                  name="offset_verification_method"
                  required={isOffset}
                  value={verificationMethod}
                  onChange={(event) =>
                    setVerificationMethod(
                      (event.currentTarget as unknown as { value: string })
                        .value as typeof verificationMethod,
                    )
                  }
                >
                  {DONATION_OFFSET_VERIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  Acceptable verification includes receipts, escrow, or third-party attestation.
                </small>
              </label>
            </div>

            <fieldset className="field">
              <legend>Unmatched surplus rule</legend>
              <div className="radio-stack">
                {DONATION_OFFSET_UNMATCHED_RULE_OPTIONS.map((option) => (
                  <label className="radio-row" key={option.value}>
                    <input
                      checked={unmatchedSurplusRule === option.value}
                      name="unmatched_surplus_rule"
                      type="radio"
                      value={option.value}
                      onChange={(event) =>
                        setUnmatchedSurplusRule(
                          (event.currentTarget as unknown as { value: string })
                            .value as typeof unmatchedSurplusRule,
                        )
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <small>Say in advance what happens if only part of the intended offset can be matched.</small>
            </fieldset>

            <label className="field">
              <span>Receipt, escrow, or audit link</span>
              <input
                name="offset_evidence_url"
                placeholder="https://..."
                type="url"
                value={evidenceUrl}
                onChange={(event) =>
                  setEvidenceUrl((event.currentTarget as unknown as { value: string }).value)
                }
              />
              <small>
                A link is not legally required to draft an offer, but unverifiable baselines are flagged
                and may be kept out of the public marketplace.
              </small>
            </label>

            <div className="panel offset-summary">
              <p className="eyebrow">Live summary</p>
              <h3>{formatUsd(offsetPreview.compromiseTotalUsd)} would move to the compromise charity.</h3>
              <p>
                This offer redirects <strong>{formatUsd(offsetPreview.matchedBaselineUsd)}</strong> from the
                baseline side and asks the counterparty to redirect{" "}
                <strong>{formatUsd(offsetPreview.matchedCounterpartyUsd)}</strong> at a ratio of{" "}
                <strong>{formatDonationOffsetRatio(Number(offsetRatio))}</strong>.
              </p>
              <p>
                Unmatched remainder: {formatUsd(offsetPreview.unmatchedBaselineUsd)} on the baseline side
                and {formatUsd(offsetPreview.unmatchedCounterpartyUsd)} on the counterparty side.
              </p>
              <p>{offsetPreview.unmatchedRuleLabel}</p>
              <p>
                Verification: {formatDonationOffsetVerificationMethod(verificationMethod)} | Horizon:{" "}
                {formatDonationOffsetTimeHorizon(timeHorizon)} | Surplus rule:{" "}
                {formatDonationOffsetUnmatchedRule(unmatchedSurplusRule)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="field-grid">
          <label className="field">
            <span>Your impact estimate</span>
            <input defaultValue={7} max={10} min={1} name="offer_impact" type="number" />
          </label>

          <label className="field">
            <span>Minimum counterparty impact</span>
            <input defaultValue={6} max={10} min={1} name="min_counterparty_impact" type="number" />
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>Verification preference</span>
            <select defaultValue="Annual receipts" name="verification">
              {VERIFICATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Review period</span>
            <select defaultValue="6 months" name="duration">
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>Payment cadence (payment offers only)</span>
            <select defaultValue="none" name="payment_interval_unit">
              {PAYMENT_INTERVAL_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Repeat every</span>
            <input defaultValue={1} min={1} name="payment_interval_value" type="number" />
          </label>
        </div>
        <p className="panel-note">
          For paid action offers, use 1 day, 1 month, 1 year, or a custom interval such as 40 days.
        </p>

        <label className="field">
          <span>Trust intensity</span>
          <input defaultValue={3} max={5} min={1} name="trust_level" type="number" />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            name="notes"
            onChange={(event) => setNotes((event.currentTarget as unknown as { value: string }).value)}
            placeholder="Explain why this offset beats zero-sum spending on your view, what evidence you can provide, and what happens if only part of the donation can be matched."
            required={isOffset}
            rows={4}
            value={notes}
          />
        </label>

        <div className="form-actions">
          <button className="button button-primary" type="submit">
            Publish offer
          </button>
          <Link className="button button-secondary" href="/offers">
            Back to offers
          </Link>
        </div>
      </form>
    </article>
  );
}
