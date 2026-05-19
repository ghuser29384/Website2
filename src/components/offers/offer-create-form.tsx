"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { createOfferAction } from "@/app/actions";
import {
  calculateDonationOffsetPoolProgress,
  calculateDonationOffsetPreview,
  createDefaultDonationOffsetFields,
  formatDonationOffsetPoolStatus,
  formatDonationOffsetRatio,
  formatDonationOffsetTimeHorizon,
  formatDonationOffsetUnmatchedRule,
  formatDonationOffsetVerificationMethod,
  getConsensusCharities,
  getDonationOffsetComplexityWarnings,
  getSelectableRegisteredCharities,
  validateDonationOffsetFields,
  validateDonationOffsetSubmissionGuards,
  DONATION_OFFSET_PARTICIPATION_MODE_OPTIONS,
  DONATION_OFFSET_POOL_SIDE_OPTIONS,
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

interface DonationOffsetPoolOption {
  id: string;
  name: string;
  compromiseCharityId: string;
  compromiseCharityName: string;
  offsetRatio: number;
  timeHorizon: "one_off" | "recurring";
  verificationMethod: "proof_of_past_donations" | "receipts_uploaded" | "funds_in_escrow" | "third_party_audit";
  unmatchedSurplusRule:
    | "return_to_donors"
    | "donate_to_compromise_destination"
    | "donate_to_original_cause"
    | "split_evenly";
  assuranceMinimumCents: number;
  maximumCapCents: number;
  assuranceDeadlineAt: string | null;
  sideALabel: string;
  sideBLabel: string;
  sideATotalCents: number;
  sideBTotalCents: number;
  matchedCompromiseCents: number;
  status: "open" | "assurance_pending" | "assurance_met" | "closed";
}

interface OfferCreateFormProps {
  formMessage:
    | {
        text: string;
        tone: "error" | "success";
      }
    | null;
  supabaseReady: boolean;
  availablePools: DonationOffsetPoolOption[];
  initialMode?: OfferMode;
  initialOffsetParticipationMode?: "direct" | "pool";
  initialOffsetPoolId?: string;
  initialOffsetPoolSide?: "side_a" | "side_b" | "";
}

const defaultOffsetFields = createDefaultDonationOffsetFields();

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function readFormControlValue(event: { currentTarget: EventTarget }) {
  return (event.currentTarget as unknown as { value: string }).value;
}

export function OfferCreateForm({
  formMessage,
  supabaseReady,
  availablePools,
  initialMode = "pledge",
  initialOffsetParticipationMode = defaultOffsetFields.participationMode,
  initialOffsetPoolId = "",
  initialOffsetPoolSide = "",
}: OfferCreateFormProps) {
  const [mode, setMode] = useState<OfferMode>(initialMode);
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
  const [participationMode, setParticipationMode] = useState(initialOffsetParticipationMode);
  const [poolId, setPoolId] = useState(initialOffsetPoolId);
  const [poolName, setPoolName] = useState("");
  const [poolSide, setPoolSide] = useState<"side_a" | "side_b" | "">(initialOffsetPoolSide);
  const [assuranceMinimumUsd, setAssuranceMinimumUsd] = useState("");
  const [poolMaximumCapUsd, setPoolMaximumCapUsd] = useState(
    String(defaultOffsetFields.poolMaximumCapUsd ?? 10_000),
  );
  const [assuranceDeadline, setAssuranceDeadline] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [antiThreatCertified, setAntiThreatCertified] = useState(false);
  const [verificationMetadataAcknowledged, setVerificationMetadataAcknowledged] = useState(false);

  const isOffset = mode === "offset";
  const selectableCharities = getSelectableRegisteredCharities();
  const consensusCharities = getConsensusCharities();
  const selectedPool = useMemo(
    () => availablePools.find((pool) => pool.id === poolId) ?? null,
    [availablePools, poolId],
  );
  const joinedPool = participationMode === "pool" ? selectedPool : null;
  const isJoiningExistingPool = joinedPool !== null;
  const effectivePoolName = joinedPool?.name ?? poolName;
  const effectiveBaselineOpposedCause =
    joinedPool && poolSide
      ? poolSide === "side_a"
        ? joinedPool.sideALabel
        : joinedPool.sideBLabel
      : baselineOpposedCause;
  const effectiveRequestedOpposedCause =
    joinedPool && poolSide
      ? poolSide === "side_a"
        ? joinedPool.sideBLabel
        : joinedPool.sideALabel
      : requestedOpposedCause;
  const effectiveCompromiseDestinationId = joinedPool?.compromiseCharityId ?? compromiseDestinationId;
  const effectiveOffsetRatio = joinedPool ? String(joinedPool.offsetRatio) : offsetRatio;
  const effectiveTimeHorizon = joinedPool?.timeHorizon ?? timeHorizon;
  const effectiveVerificationMethod = joinedPool?.verificationMethod ?? verificationMethod;
  const effectiveUnmatchedSurplusRule = joinedPool?.unmatchedSurplusRule ?? unmatchedSurplusRule;
  const effectiveAssuranceMinimumUsd = joinedPool
    ? joinedPool.assuranceMinimumCents > 0
      ? String(joinedPool.assuranceMinimumCents / 100)
      : ""
    : assuranceMinimumUsd;
  const effectivePoolMaximumCapUsd = joinedPool
    ? String(joinedPool.maximumCapCents / 100)
    : poolMaximumCapUsd;
  const effectiveAssuranceDeadline = joinedPool
    ? toDateInputValue(joinedPool.assuranceDeadlineAt)
    : assuranceDeadline;

  const normalizedOffsetFields = useMemo(
    () => ({
      baselineAmountUsd: Number(baselineAmountUsd),
      baselineOpposedCause: effectiveBaselineOpposedCause,
      requestedMatchingAmountUsd: Number(requestedMatchingAmountUsd),
      requestedOpposedCause: effectiveRequestedOpposedCause,
      compromiseDestinationId: effectiveCompromiseDestinationId,
      offsetRatio: Number(effectiveOffsetRatio),
      timeHorizon: effectiveTimeHorizon,
      verificationMethod: effectiveVerificationMethod,
      unmatchedSurplusRule: effectiveUnmatchedSurplusRule,
      participationMode,
      poolId,
      poolName: effectivePoolName,
      poolSide,
      assuranceMinimumUsd:
        effectiveAssuranceMinimumUsd === "" ? null : Number(effectiveAssuranceMinimumUsd),
      poolMaximumCapUsd:
        effectivePoolMaximumCapUsd === "" ? null : Number(effectivePoolMaximumCapUsd),
      assuranceDeadline: effectiveAssuranceDeadline,
      description: [offerAction, requestAction, notes].filter(Boolean).join("\n"),
      evidenceUrl,
    }),
    [
      baselineAmountUsd,
      evidenceUrl,
      effectiveAssuranceDeadline,
      effectiveAssuranceMinimumUsd,
      effectiveBaselineOpposedCause,
      effectiveCompromiseDestinationId,
      effectiveOffsetRatio,
      effectivePoolName,
      effectivePoolMaximumCapUsd,
      effectiveRequestedOpposedCause,
      effectiveTimeHorizon,
      effectiveUnmatchedSurplusRule,
      effectiveVerificationMethod,
      notes,
      offerAction,
      participationMode,
      poolId,
      poolSide,
      requestAction,
      requestedMatchingAmountUsd,
    ],
  );

  const liveOffsetErrors = useMemo(
    () =>
      isOffset
        ? [
            ...validateDonationOffsetFields(normalizedOffsetFields),
            ...validateDonationOffsetSubmissionGuards({
              participationMode,
              antiThreatCertification: antiThreatCertified,
              verificationMetadataAcknowledged,
              evidenceUrl,
            }),
          ]
        : [],
    [
      antiThreatCertified,
      evidenceUrl,
      isOffset,
      normalizedOffsetFields,
      participationMode,
      verificationMetadataAcknowledged,
    ],
  );

  const offsetPreview = useMemo(
    () =>
      calculateDonationOffsetPreview({
        baselineAmountUsd: Number(baselineAmountUsd),
        requestedMatchingAmountUsd: Number(requestedMatchingAmountUsd),
        offsetRatio: Number(effectiveOffsetRatio),
        unmatchedSurplusRule: effectiveUnmatchedSurplusRule,
      }),
    [
      baselineAmountUsd,
      effectiveOffsetRatio,
      effectiveUnmatchedSurplusRule,
      requestedMatchingAmountUsd,
    ],
  );

  const complexityWarnings = useMemo(
    () => (isOffset ? getDonationOffsetComplexityWarnings(normalizedOffsetFields) : []),
    [isOffset, normalizedOffsetFields],
  );
  const liveCoreOfferErrors = useMemo(() => {
    const errors: string[] = [];

    if (!offerAction.trim()) {
      errors.push("Describe the action you are offering.");
    }

    if (!requestAction.trim()) {
      errors.push("Describe what you want the counterparty to do.");
    }

    if (!notes.trim()) {
      errors.push("Add a public description covering evidence, boundaries, and why the trade is mutually beneficial.");
    }

    return errors;
  }, [notes, offerAction, requestAction]);
  const liveOfferErrors = useMemo(
    () => [...liveCoreOfferErrors, ...liveOffsetErrors],
    [liveCoreOfferErrors, liveOffsetErrors],
  );
  const canPublishOffer = supabaseReady && liveOfferErrors.length === 0;

  const joinedPoolProgress = useMemo(() => {
    if (!selectedPool || participationMode !== "pool" || !poolSide) {
      return null;
    }

    const baselineCents = Math.round((Number(baselineAmountUsd) || 0) * 100);
    const nextSideATotal =
      selectedPool.sideATotalCents + (poolSide === "side_a" ? baselineCents : 0);
    const nextSideBTotal =
      selectedPool.sideBTotalCents + (poolSide === "side_b" ? baselineCents : 0);

    return calculateDonationOffsetPoolProgress({
      sideATotalUsd: nextSideATotal / 100,
      sideBTotalUsd: nextSideBTotal / 100,
      offsetRatio: Number(effectiveOffsetRatio),
      assuranceMinimumUsd:
        effectiveAssuranceMinimumUsd === "" ? 0 : Number(effectiveAssuranceMinimumUsd),
      deadlineAt: effectiveAssuranceDeadline || selectedPool.assuranceDeadlineAt || undefined,
    });
  }, [
    baselineAmountUsd,
    effectiveAssuranceDeadline,
    effectiveAssuranceMinimumUsd,
    effectiveOffsetRatio,
    participationMode,
    poolSide,
    selectedPool,
  ]);

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
          Extortion is not allowed. Only publish an offset if the baseline donation is a real
          intention you can support with past-donation proof, a third-party payment record, or a
          third-party audit.
        </div>
      ) : null}

      {liveOfferErrors.length ? (
        <div className="status-banner status-banner-error" aria-live="polite">
          <strong>Fix these fields before publishing.</strong>
          <ul className="clean-list">
            {liveOfferErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {canPublishOffer ? (
        <div className="status-banner status-banner-success" aria-live="polite">
          Ready to publish. Server-side checks will still verify authentication, moderation, and
          evidence rules before the offer is saved.
        </div>
      ) : null}

      {isOffset && complexityWarnings.length ? (
        <div className="status-banner status-banner-warning">
          <strong>Complexity warning.</strong>
          <ul className="clean-list">
            {complexityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        action={createOfferAction}
        className="stack-form"
        onSubmit={(event) => {
          if (liveOfferErrors.length || !supabaseReady) {
            event.preventDefault();
          }
        }}
      >
        <label className="field">
          <span>Exchange mode</span>
          <select
            value={mode}
            name="mode"
            onChange={(event) => setMode(readFormControlValue(event) as OfferMode)}
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
            onChange={(event) => setOfferAction(readFormControlValue(event))}
            placeholder="e.g. Redirect $1,000 I would otherwise have donated to an opposed lobbying cause into the named compromise fund."
            required
            rows={4}
            value={offerAction}
          />
        </label>

        <label className="field">
          <span>What do you want the other side to do?</span>
          <textarea
            name="request_action"
            onChange={(event) => setRequestAction(readFormControlValue(event))}
            placeholder="e.g. Redirect the matched portion of your opposed donation into the same compromise destination."
            required
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

            {isJoiningExistingPool ? (
              <>
                <input
                  name="baseline_opposed_cause"
                  type="hidden"
                  value={effectiveBaselineOpposedCause}
                />
                <input
                  name="requested_opposed_cause"
                  type="hidden"
                  value={effectiveRequestedOpposedCause}
                />
                <input
                  name="compromise_destination_id"
                  type="hidden"
                  value={effectiveCompromiseDestinationId}
                />
                <input name="offset_ratio" type="hidden" value={effectiveOffsetRatio} />
                <input
                  name="offset_time_horizon"
                  type="hidden"
                  value={effectiveTimeHorizon}
                />
                <input
                  name="offset_verification_method"
                  type="hidden"
                  value={effectiveVerificationMethod}
                />
                <input
                  name="unmatched_surplus_rule"
                  type="hidden"
                  value={effectiveUnmatchedSurplusRule}
                />
                <input
                  name="assurance_minimum_usd"
                  type="hidden"
                  value={effectiveAssuranceMinimumUsd}
                />
                <input
                  name="offset_pool_maximum_cap_usd"
                  type="hidden"
                  value={effectivePoolMaximumCapUsd}
                />
                <input
                  name="assurance_deadline"
                  type="hidden"
                  value={effectiveAssuranceDeadline}
                />
              </>
            ) : null}

            <fieldset className="field">
              <legend>Participation mode</legend>
              <div className="radio-stack">
                {DONATION_OFFSET_PARTICIPATION_MODE_OPTIONS.map((option) => (
                  <label className="radio-row" key={option.value}>
                    <input
                      checked={participationMode === option.value}
                      name="offset_participation_mode"
                      type="radio"
                      value={option.value}
                      onChange={(event) => setParticipationMode(readFormControlValue(event) as "direct" | "pool")}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <br />
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {participationMode === "pool" ? (
              <div className="field-grid">
                <label className="field">
                  <span>Join an existing offset pool</span>
                  <select
                    name="offset_pool_id"
                    value={poolId}
                    onChange={(event) => setPoolId(readFormControlValue(event))}
                  >
                    <option value="">Create a new pool instead</option>
                    {availablePools.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name} | {pool.compromiseCharityName} |{" "}
                        {formatDonationOffsetPoolStatus(pool.status)}
                      </option>
                    ))}
                  </select>
                  <small>
                    Existing pools aggregate donors on each side and apply one shared ratio,
                    verification method, and assurance deadline.
                  </small>
                </label>

                <label className="field">
                  <span>Name for a new pool</span>
                  <input
                    name="offset_pool_name"
                    placeholder="e.g. Pro-choice / pro-life global health pool"
                    type="text"
                    value={effectivePoolName}
                    disabled={isJoiningExistingPool}
                    onChange={(event) => setPoolName(readFormControlValue(event))}
                  />
                  <small>
                    Use this when you are opening a pooled offset rather than joining one that already
                    exists.
                  </small>
                </label>
              </div>
            ) : null}

            {participationMode === "pool" ? (
              <fieldset className="field">
                <legend>Which side are you joining?</legend>
                <div className="radio-stack">
                  {DONATION_OFFSET_POOL_SIDE_OPTIONS.map((option) => (
                    <label className="radio-row" key={option.value}>
                      <input
                        checked={poolSide === option.value}
                        name="offset_pool_side"
                        type="radio"
                        value={option.value}
                        onChange={(event) => setPoolSide(readFormControlValue(event) as "side_a" | "side_b")}
                      />
                      <span>
                        {option.value === "side_a"
                          ? selectedPool?.sideALabel || "Side A"
                          : selectedPool?.sideBLabel || "Side B"}
                      </span>
                    </label>
                  ))}
                </div>
                <small>
                  Pools work best when each side is named clearly, so that aggregate pledges remain
                  legible.
                </small>
              </fieldset>
            ) : null}

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
                  onChange={(event) => setBaselineAmountUsd(readFormControlValue(event))}
                />
                <small>
                  The amount you would otherwise have donated to the opposed cause. Baseline proof is
                  what prevents extortion concerns.
                </small>
              </label>

              <label className="field">
                <span>Baseline opposed cause</span>
                <select
                  name="baseline_opposed_cause"
                  required={isOffset}
                  value={effectiveBaselineOpposedCause}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setBaselineOpposedCause(readFormControlValue(event))}
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
                  onChange={(event) => setRequestedMatchingAmountUsd(readFormControlValue(event))}
                />
                <small>
                  The amount you want redirected away from the other side&apos;s opposed cause.
                </small>
              </label>

              <label className="field">
                <span>Requested opposing cause</span>
                <select
                  name="requested_opposed_cause"
                  required={isOffset}
                  value={effectiveRequestedOpposedCause}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setRequestedOpposedCause(readFormControlValue(event))}
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
                  value={effectiveCompromiseDestinationId}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setCompromiseDestinationId(readFormControlValue(event))}
                >
                  {selectableCharities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name}
                    </option>
                  ))}
                </select>
                <small>
                  Choose a named destination both sides can recognize. Consensus charities make better
                  compromise endpoints. Existing pools inherit this from the pool.
                </small>
              </label>

              <label className="field">
                <span>Offset ratio</span>
                <input
                  min="0.01"
                  name="offset_ratio"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={effectiveOffsetRatio}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setOffsetRatio(readFormControlValue(event))}
                />
                <small>
                  How many counterparty dollars should match each $1 of your baseline donation.
                  Simple <strong>1:1</strong> offsets are usually easier to match.
                </small>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Time horizon</span>
                <select
                  name="offset_time_horizon"
                  required={isOffset}
                  value={effectiveTimeHorizon}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setTimeHorizon(readFormControlValue(event) as "one_off" | "recurring")}
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
                  value={effectiveVerificationMethod}
                  disabled={isJoiningExistingPool}
                  onChange={(event) =>
                    setVerificationMethod(
                      readFormControlValue(event) as
                        | "proof_of_past_donations"
                        | "funds_in_escrow"
                        | "third_party_audit",
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
                  Proof of past donations helps establish counterfactual credibility. Third-party
                  payment records and audits can add stronger factual trust.
                </small>
              </label>
            </div>

            <fieldset className="field">
              <legend>Unmatched surplus rule</legend>
              <div className="radio-stack">
                {DONATION_OFFSET_UNMATCHED_RULE_OPTIONS.map((option) => (
                  <label className="radio-row" key={option.value}>
                    <input
                      checked={effectiveUnmatchedSurplusRule === option.value}
                      disabled={isJoiningExistingPool}
                      name="unmatched_surplus_rule"
                      type="radio"
                      value={option.value}
                      onChange={(event) =>
                        setUnmatchedSurplusRule(
                          readFormControlValue(event) as
                            | "return_to_donors"
                            | "donate_to_compromise_destination"
                            | "donate_to_original_cause",
                        )
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <small>
                State in advance what happens if only part of the intended offset is matched.
              </small>
            </fieldset>

            {participationMode === "pool" ? (
              <div className="field-grid">
                <label className="field">
                  <span>Assurance minimum</span>
                  <input
                    min="0"
                    name="assurance_minimum_usd"
                    step="0.01"
                    type="number"
                    value={effectiveAssuranceMinimumUsd}
                    disabled={isJoiningExistingPool}
                    onChange={(event) => setAssuranceMinimumUsd(readFormControlValue(event))}
                  />
                  <small>
                    Donors can commit on the condition that the pool reaches this minimum matched
                    redirection.
                  </small>
                </label>

                <label className="field">
                  <span>Assurance deadline</span>
                    <input
                      name="assurance_deadline"
                      type="date"
                      value={effectiveAssuranceDeadline}
                      disabled={isJoiningExistingPool}
                      onChange={(event) => setAssuranceDeadline(readFormControlValue(event))}
                    />
                  <small>
                    A deadline makes the assurance contract legible and gives people a clear decision
                    point.
                  </small>
                </label>

                <label className="field">
                  <span>Pool maximum cap</span>
                  <input
                    disabled={isJoiningExistingPool}
                    min="0.01"
                    name="offset_pool_maximum_cap_usd"
                    step="0.01"
                    type="number"
                    value={effectivePoolMaximumCapUsd}
                    onChange={(event) => setPoolMaximumCapUsd(readFormControlValue(event))}
                  />
                  <small>
                    The maximum aggregate compromise amount this pool should gather before review
                    closes further matching.
                  </small>
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Receipt, payment record, or audit link</span>
              <input
                name="offset_evidence_url"
                placeholder="https://..."
                type="url"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(readFormControlValue(event))}
              />
              <small>
                Unverified baselines are kept out of the public marketplace until they are reviewed.
              </small>
            </label>

            {participationMode === "pool" ? (
              <div className="panel subtle-panel">
                <p className="eyebrow">Pool review status</p>
                <p className="route-text">
                  New pooled offsets are saved for manual review. They are not legal escrow,
                  payment custody, or a promise that any redirection has happened.
                </p>
                <label className="radio-row">
                  <input
                    checked={antiThreatCertified}
                    name="offset_anti_threat_certification"
                    required
                    type="checkbox"
                    onChange={(event) =>
                      setAntiThreatCertified(
                        (event.currentTarget as HTMLInputElement).checked,
                      )
                    }
                  />
                  <span>
                    I certify this pool is based on a real baseline intention, not a threat,
                    coercive demand, harassment, doxxing, fraud, or pressure on vulnerable people.
                  </span>
                </label>
                <label className="radio-row">
                  <input
                    checked={verificationMetadataAcknowledged}
                    name="offset_verification_metadata_acknowledgement"
                    required
                    type="checkbox"
                    onChange={(event) =>
                      setVerificationMetadataAcknowledged(
                        (event.currentTarget as HTMLInputElement).checked,
                      )
                    }
                  />
                  <span>
                    I have provided a verification method and evidence link that a reviewer can
                    inspect before treating the pooled offset as credible.
                  </span>
                </label>
              </div>
            ) : null}

            <div className="panel offset-summary">
              <p className="eyebrow">Live summary</p>
              <h3>{formatUsd(offsetPreview.compromiseTotalUsd)} would move to the compromise charity.</h3>
              <p>
                This offer redirects <strong>{formatUsd(offsetPreview.matchedBaselineUsd)}</strong> from the
                baseline side and asks the counterparty to redirect{" "}
                <strong>{formatUsd(offsetPreview.matchedCounterpartyUsd)}</strong> at a ratio of{" "}
                <strong>{formatDonationOffsetRatio(Number(effectiveOffsetRatio))}</strong>.
              </p>
              <p>
                Unmatched remainder: {formatUsd(offsetPreview.unmatchedBaselineUsd)} on the baseline side
                and {formatUsd(offsetPreview.unmatchedCounterpartyUsd)} on the counterparty side.
              </p>
              <p>{offsetPreview.unmatchedRuleLabel}</p>
              <p>
                Verification: {formatDonationOffsetVerificationMethod(effectiveVerificationMethod)} | Horizon:{" "}
                {formatDonationOffsetTimeHorizon(effectiveTimeHorizon)} | Surplus rule:{" "}
                {formatDonationOffsetUnmatchedRule(effectiveUnmatchedSurplusRule)}
              </p>
              {participationMode === "pool" ? (
                <div className="offset-pool-preview">
                  <p>
                    Pool mode turns this into a larger aggregate offset. Your side is{" "}
                    <strong>{poolSide || "not yet chosen"}</strong>.
                  </p>
                  {selectedPool ? (
                    <>
                      <p>
                        Current pool: <strong>{selectedPool.name}</strong> | Already matched:{" "}
                        <strong>{formatUsd(selectedPool.matchedCompromiseCents / 100)}</strong>
                      </p>
                      {joinedPoolProgress ? (
                        <>
                          <div className="offset-progress-track" aria-hidden="true">
                            <span
                              className="offset-progress-fill"
                              style={{ width: `${joinedPoolProgress.assuranceProgressPct}%` }}
                            />
                          </div>
                          <p>
                            After your commitment, the pool would show{" "}
                            <strong>{formatUsd(joinedPoolProgress.matchedCompromiseUsd)}</strong> matched
                            toward an assurance threshold of{" "}
                            <strong>{formatUsd(joinedPoolProgress.assuranceMinimumUsd)}</strong>.
                          </p>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p>
                      New pool commitments can set an assurance threshold and deadline so donors only
                      redirect once enough matching support appears.
                    </p>
                  )}
                  <p>
                    Pool cap: <strong>{formatUsd(Number(effectivePoolMaximumCapUsd) || 0)}</strong>.
                    Review status: manual review required before public reliance.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="panel subtle-panel">
              <p className="eyebrow">Consensus destinations</p>
              <div className="tag-row">
                {consensusCharities.map((charity) => (
                  <span className="badge badge-secondary" key={charity.id}>
                    {charity.name}
                  </span>
                ))}
              </div>
              <p className="panel-note">
                These are the compromise destinations on Moral Trade most clearly framed as moral
                public goods: broad goods many different moral views can value at once.
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
            onChange={(event) => setNotes(readFormControlValue(event))}
            placeholder="Explain why this offset beats zero-sum spending on your view, what evidence you can provide, and what should happen if matching is incomplete."
            required
            rows={4}
            value={notes}
          />
        </label>

        <div className="form-actions">
          <button className="button button-primary" disabled={!canPublishOffer} type="submit">
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
