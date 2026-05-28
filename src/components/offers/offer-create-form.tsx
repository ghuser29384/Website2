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
  type PaymentIntervalUnit,
  type OfferMode,
} from "@/lib/offers";
import {
  evaluateMoralTradeProtocolDraft,
  formatProtocolReviewStatus,
  type MoralTradeVerificationStepStatus,
} from "@/lib/proposal-review";

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
  initialTemplate?: OfferTemplate | null;
}

export interface OfferTemplate {
  title: string;
  description: string;
  mode: OfferMode;
  offeredCause: string;
  requestedCause: string;
  compromiseCause: string;
  offerAction: string;
  requestAction: string;
  baselineStatement: string;
  exitCondition: string;
  notes: string;
  offerImpact: string;
  minCounterpartyImpact: string;
  verification: string;
  duration: string;
  paymentIntervalUnit: PaymentIntervalUnit;
  paymentIntervalValue: string;
  trustLevel: string;
  offset?: {
    baselineAmountUsd: string;
    requestedMatchingAmountUsd: string;
    baselineOpposedCause: string;
    requestedOpposedCause: string;
    participationMode: "direct" | "pool";
    compromiseDestinationId?: string;
    offsetRatio: string;
    timeHorizon?: "one_off" | "recurring";
    verificationMethod?: "proof_of_past_donations" | "receipts_uploaded" | "funds_in_escrow" | "third_party_audit";
    unmatchedSurplusRule?: "return_to_donors" | "donate_to_compromise_destination" | "donate_to_original_cause" | "split_evenly";
  };
}

interface OfferWizardStep {
  id: string;
  title: string;
  detail: string;
  href: string;
  complete: boolean;
}

const defaultOffsetFields = createDefaultDonationOffsetFields();

const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    title: "30-day pledge swap",
    description: "A short, reviewable commitment in exchange for a reciprocal action.",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    compromiseCause: "Not needed",
    offerAction:
      "I will follow a vegetarian diet for the review period and keep a simple public log of exceptions.",
    requestAction:
      "The counterparty will donate to an evidence-focused global health or poverty charity during the same period.",
    baselineStatement:
      "Without this trade, I would not make this short diet commitment during the next 30 days.",
    exitCondition:
      "Either side can pause before the review period starts; after it starts, missed evidence creates an unresolved record rather than a completed one.",
    notes:
      "This is a voluntary pledge swap. Each side should be free to decline, pause, or renegotiate if the burden becomes materially different from what was stated.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Public pledge",
    duration: "30 days",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "3",
  },
  {
    title: "Matched donation offset",
    description: "Redirect opposed donations to a named compromise destination with evidence rules.",
    mode: "offset",
    offeredCause: "Democracy",
    requestedCause: "Global poverty",
    compromiseCause: "Global poverty",
    offerAction:
      "I will redirect a real planned donation away from my baseline opposed cause and into the named compromise destination.",
    requestAction:
      "The counterparty will redirect the matched portion of their opposed donation into the same compromise destination.",
    baselineStatement:
      "I have a real baseline intention to make the opposed donation unless this offset clears review.",
    exitCondition:
      "If the match is incomplete by the deadline, the unmatched surplus rule controls and the record stays unresolved until evidence is reviewed.",
    notes:
      "This offset should only be used for a genuine baseline intention. It is not a threat, custody promise, tax claim, or legal escrow arrangement.",
    offerImpact: "7",
    minCounterpartyImpact: "7",
    verification: "Manual review required",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
    offset: {
      baselineAmountUsd: "1000",
      requestedMatchingAmountUsd: "1000",
      baselineOpposedCause: "Democracy",
      requestedOpposedCause: "Gun rights",
      participationMode: "direct",
      offsetRatio: "1",
    },
  },
  {
    title: "Threshold offset pool",
    description: "A pooled donation offset with a named threshold and review gate.",
    mode: "offset",
    offeredCause: "Democracy",
    requestedCause: "Global poverty",
    compromiseCause: "Not needed",
    offerAction:
      "I will join a pooled offset and redirect my baseline opposed donation if the pool reaches the assurance threshold.",
    requestAction:
      "Counterparties on the other side will redirect matching opposed donations into the same compromise destination.",
    baselineStatement:
      "The pool only counts commitments attached to a real baseline donation intention and reviewable evidence.",
    exitCondition:
      "If the assurance threshold is not met by the deadline, the pool closes or follows its published unmatched-surplus rule.",
    notes:
      "This is a thresholded offset pool, not custody, escrow, tax advice, or a guarantee that funds have moved before evidence review.",
    offerImpact: "7",
    minCounterpartyImpact: "7",
    verification: "Manual review required",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
    offset: {
      baselineAmountUsd: "500",
      requestedMatchingAmountUsd: "500",
      baselineOpposedCause: "Democracy",
      requestedOpposedCause: "Gun rights",
      participationMode: "pool",
      offsetRatio: "1",
    },
  },
];

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

function formatOfferModeLabel(mode: OfferMode) {
  return OFFER_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

function formatVerificationStepStatus(status: MoralTradeVerificationStepStatus) {
  switch (status) {
    case "blocked":
      return "Blocked";
    case "human_review":
      return "Review";
    case "needs_input":
      return "Input";
    default:
      return "Pass";
  }
}

export function OfferCreateForm({
  formMessage,
  supabaseReady,
  availablePools,
  initialMode = "pledge",
  initialOffsetParticipationMode = defaultOffsetFields.participationMode,
  initialOffsetPoolId = "",
  initialOffsetPoolSide = "",
  initialTemplate = null,
}: OfferCreateFormProps) {
  const [mode, setMode] = useState<OfferMode>(initialTemplate?.mode ?? initialMode);
  const [offeredCause, setOfferedCause] = useState(initialTemplate?.offeredCause ?? "Animal welfare");
  const [requestedCause, setRequestedCause] = useState(initialTemplate?.requestedCause ?? "Global poverty");
  const [compromiseCause, setCompromiseCause] = useState(initialTemplate?.compromiseCause ?? "Not needed");
  const [baselineAmountUsd, setBaselineAmountUsd] = useState(
    initialTemplate?.offset?.baselineAmountUsd ?? String(defaultOffsetFields.baselineAmountUsd ?? 1000),
  );
  const [baselineOpposedCause, setBaselineOpposedCause] = useState(
    initialTemplate?.offset?.baselineOpposedCause ?? defaultOffsetFields.baselineOpposedCause,
  );
  const [requestedMatchingAmountUsd, setRequestedMatchingAmountUsd] = useState(
    initialTemplate?.offset?.requestedMatchingAmountUsd ??
      String(defaultOffsetFields.requestedMatchingAmountUsd ?? 1000),
  );
  const [requestedOpposedCause, setRequestedOpposedCause] = useState(
    initialTemplate?.offset?.requestedOpposedCause ?? defaultOffsetFields.requestedOpposedCause,
  );
  const [offerAction, setOfferAction] = useState(initialTemplate?.offerAction ?? "");
  const [requestAction, setRequestAction] = useState(initialTemplate?.requestAction ?? "");
  const [baselineStatement, setBaselineStatement] = useState(initialTemplate?.baselineStatement ?? "");
  const [exitCondition, setExitCondition] = useState(initialTemplate?.exitCondition ?? "");
  const [notes, setNotes] = useState(initialTemplate?.notes ?? "");
  const [compromiseDestinationId, setCompromiseDestinationId] = useState(
    initialTemplate?.offset?.compromiseDestinationId ?? defaultOffsetFields.compromiseDestinationId,
  );
  const [offsetRatio, setOffsetRatio] = useState(
    initialTemplate?.offset?.offsetRatio ?? String(defaultOffsetFields.offsetRatio ?? 1),
  );
  const [timeHorizon, setTimeHorizon] = useState(
    initialTemplate?.offset?.timeHorizon ?? defaultOffsetFields.timeHorizon,
  );
  const [verificationMethod, setVerificationMethod] = useState(
    initialTemplate?.offset?.verificationMethod ?? defaultOffsetFields.verificationMethod,
  );
  const [unmatchedSurplusRule, setUnmatchedSurplusRule] = useState(
    initialTemplate?.offset?.unmatchedSurplusRule ?? defaultOffsetFields.unmatchedSurplusRule,
  );
  const [participationMode, setParticipationMode] = useState(
    initialTemplate?.offset?.participationMode ?? initialOffsetParticipationMode,
  );
  const [poolId, setPoolId] = useState(initialOffsetPoolId);
  const [poolName, setPoolName] = useState("");
  const [poolSide, setPoolSide] = useState<"side_a" | "side_b" | "">(initialOffsetPoolSide);
  const [assuranceMinimumUsd, setAssuranceMinimumUsd] = useState("");
  const [poolMaximumCapUsd, setPoolMaximumCapUsd] = useState(
    String(defaultOffsetFields.poolMaximumCapUsd ?? 10_000),
  );
  const [assuranceDeadline, setAssuranceDeadline] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [offerImpact, setOfferImpact] = useState(initialTemplate?.offerImpact ?? "7");
  const [minCounterpartyImpact, setMinCounterpartyImpact] = useState(initialTemplate?.minCounterpartyImpact ?? "6");
  const [verificationPreference, setVerificationPreference] = useState(initialTemplate?.verification ?? "Annual receipts");
  const [reviewPeriod, setReviewPeriod] = useState(initialTemplate?.duration ?? "6 months");
  const [paymentIntervalUnit, setPaymentIntervalUnit] = useState<PaymentIntervalUnit>(initialTemplate?.paymentIntervalUnit ?? "none");
  const [paymentIntervalValue, setPaymentIntervalValue] = useState(initialTemplate?.paymentIntervalValue ?? "1");
  const [trustLevel, setTrustLevel] = useState(initialTemplate?.trustLevel ?? "3");
  const [antiThreatCertified, setAntiThreatCertified] = useState(false);
  const [verificationMetadataAcknowledged, setVerificationMetadataAcknowledged] = useState(false);

  const isOffset = mode === "offset";
  const isPayment = mode === "payment";
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
      description: [offerAction, requestAction, baselineStatement, exitCondition, notes]
        .filter(Boolean)
        .join("\n"),
      evidenceUrl,
    }),
    [
      baselineAmountUsd,
      baselineStatement,
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
      exitCondition,
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

    if (!baselineStatement.trim()) {
      errors.push("State the no-trade baseline or default you are comparing against.");
    }

    if (!exitCondition.trim()) {
      errors.push("State the exit, pause, expiry, or unresolved-evidence condition.");
    }

    if (!notes.trim()) {
      errors.push("Add a public description covering evidence, boundaries, and why the trade is mutually beneficial.");
    }

    if (isPayment) {
      errors.push("General paid action offers are deferred and cannot be published from the public offer wizard.");
    }

    return errors;
  }, [baselineStatement, exitCondition, isPayment, notes, offerAction, requestAction]);
  const liveOfferErrors = useMemo(
    () => [...liveCoreOfferErrors, ...liveOffsetErrors],
    [liveCoreOfferErrors, liveOffsetErrors],
  );
  const protocolReview = useMemo(
    () =>
      evaluateMoralTradeProtocolDraft({
        format: mode,
        offeredCause,
        requestedCause,
        offeredAction: offerAction,
        requestedAction: requestAction,
        baselineStatement,
        duration: reviewPeriod,
        exitConditions: exitCondition,
        verificationMethod: isOffset
          ? formatDonationOffsetVerificationMethod(effectiveVerificationMethod)
          : verificationPreference,
        publicDescription: notes,
        evidenceUrl,
        participantImportance: Number(offerImpact),
        counterpartyThreshold: Number(minCounterpartyImpact),
      }),
    [
      baselineStatement,
      effectiveVerificationMethod,
      evidenceUrl,
      exitCondition,
      isOffset,
      minCounterpartyImpact,
      mode,
      notes,
      offerAction,
      offerImpact,
      offeredCause,
      requestedCause,
      requestAction,
      reviewPeriod,
      verificationPreference,
    ],
  );
  const canPublishOffer = supabaseReady && liveOfferErrors.length === 0;
  const wizardSteps: OfferWizardStep[] = useMemo(
    () => [
      {
        id: "route",
        title: "Choose a launch route",
        detail: isPayment
          ? "Paid action offers are paused for operator-reviewed pilots."
          : `${formatOfferModeLabel(mode)} is inside the current launch wedge.`,
        href: "#offer-route",
        complete: !isPayment,
      },
      {
        id: "terms",
        title: "State reciprocal terms",
        detail: "Name what you will do and what the counterparty should do.",
        href: "#offer-terms",
        complete: Boolean(offerAction.trim() && requestAction.trim()),
      },
      {
        id: "baseline",
        title: "Explain baseline and exit",
        detail: "Make the no-trade default, expiry, and unresolved-evidence path reviewable.",
        href: "#offer-boundaries",
        complete: Boolean(baselineStatement.trim() && exitCondition.trim()),
      },
      {
        id: "evidence",
        title: "Set evidence rules",
        detail: isOffset
          ? "Offset fields, evidence method, surplus rule, and pool safeguards must pass checks."
          : `${verificationPreference} over ${reviewPeriod}.`,
        href: "#offer-evidence",
        complete: isOffset ? liveOffsetErrors.length === 0 : Boolean(verificationPreference && reviewPeriod),
      },
      {
        id: "publish",
        title: "Ready for review",
        detail: "A public description and all required safeguards are complete.",
        href: "#offer-publish",
        complete: canPublishOffer,
      },
    ],
    [
      baselineStatement,
      canPublishOffer,
      exitCondition,
      isOffset,
      isPayment,
      liveOffsetErrors.length,
      mode,
      offerAction,
      requestAction,
      reviewPeriod,
      verificationPreference,
    ],
  );
  const completedWizardSteps = wizardSteps.filter((step) => step.complete).length;
  const wizardProgressPercent = Math.round((completedWizardSteps / wizardSteps.length) * 100);

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

  function applyOfferTemplate(template: OfferTemplate) {
    setMode(template.mode);
    setOfferedCause(template.offeredCause);
    setRequestedCause(template.requestedCause);
    setCompromiseCause(template.compromiseCause);
    setOfferAction(template.offerAction);
    setRequestAction(template.requestAction);
    setBaselineStatement(template.baselineStatement);
    setExitCondition(template.exitCondition);
    setNotes(template.notes);
    setOfferImpact(template.offerImpact);
    setMinCounterpartyImpact(template.minCounterpartyImpact);
    setVerificationPreference(template.verification);
    setReviewPeriod(template.duration);
    setPaymentIntervalUnit(template.paymentIntervalUnit);
    setPaymentIntervalValue(template.paymentIntervalValue);
    setTrustLevel(template.trustLevel);

    if (template.offset) {
      setBaselineAmountUsd(template.offset.baselineAmountUsd);
      setRequestedMatchingAmountUsd(template.offset.requestedMatchingAmountUsd);
      setBaselineOpposedCause(template.offset.baselineOpposedCause);
      setRequestedOpposedCause(template.offset.requestedOpposedCause);
      setParticipationMode(template.offset.participationMode);
      setCompromiseDestinationId(
        template.offset.compromiseDestinationId ?? defaultOffsetFields.compromiseDestinationId,
      );
      setOffsetRatio(template.offset.offsetRatio);
      setTimeHorizon(template.offset.timeHorizon ?? defaultOffsetFields.timeHorizon);
      setVerificationMethod(
        template.offset.verificationMethod ?? defaultOffsetFields.verificationMethod,
      );
      setUnmatchedSurplusRule(
        template.offset.unmatchedSurplusRule ?? defaultOffsetFields.unmatchedSurplusRule,
      );
      setPoolId("");
      setPoolSide("");
    }
  }

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

      <section className="offer-wizard-panel" aria-labelledby="offer-wizard-heading">
        <div className="offer-wizard-summary">
          <div>
            <p className="eyebrow">Guided offer wizard</p>
            <h3 id="offer-wizard-heading">Turn intent into a reviewable record</h3>
            <p>
              The report recommends short, bounded trades with explicit baselines, evidence, and
              completion states. Use this progress rail to keep the proposal inside that shape.
            </p>
          </div>
          <div className="offer-wizard-meter" aria-label={`${completedWizardSteps} of ${wizardSteps.length} steps complete`}>
            <span>{completedWizardSteps}/{wizardSteps.length} complete</span>
            <div className="offset-progress-track" aria-hidden="true">
              <span
                className="offset-progress-fill"
                style={{ width: `${wizardProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <ol className="offer-wizard-steps">
          {wizardSteps.map((step) => (
            <li className={step.complete ? "is-complete" : ""} key={step.id}>
              <a href={step.href}>
                <span aria-hidden="true">{step.complete ? "OK" : "--"}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel offer-template-panel" aria-labelledby="offer-template-heading">
        <div>
          <p className="eyebrow">Start from a template</p>
          <h3 id="offer-template-heading">Prefill a common moral-trade structure</h3>
          <p>
            Templates focus on the launch wedge: donation offsets, public-goods-style pools, and
            bounded pledge swaps. You still need to edit the terms so the offer is true,
            voluntary, and verifiable.
          </p>
        </div>
        <div className="offer-template-grid">
          {OFFER_TEMPLATES.map((template) => (
            <button
              className="offer-template-button"
              key={template.title}
              type="button"
              onClick={() => applyOfferTemplate(template)}
            >
              <strong>{template.title}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        className={`protocol-review-panel protocol-review-panel-${protocolReview.status}`}
        aria-labelledby="protocol-review-heading"
      >
        <div className="protocol-review-head">
          <div>
            <p className="eyebrow">Protocol review preview</p>
            <h3 id="protocol-review-heading">
              Status: {formatProtocolReviewStatus(protocolReview.status)}
            </h3>
            <p>{protocolReview.summary}</p>
          </div>
          <span className="protocol-review-status">
            {protocolReview.factorCodes.length} factor code
            {protocolReview.factorCodes.length === 1 ? "" : "s"}
          </span>
        </div>

        <div>
          <strong>Fixed verification loop</strong>
          <ol className="protocol-verification-list">
            {protocolReview.verificationLoop.map((step) => (
              <li
                className={`protocol-verification-step protocol-verification-step-${step.status}`}
                key={step.key}
              >
                <span className="protocol-step-status">
                  {formatVerificationStepStatus(step.status)}
                </span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </li>
            ))}
          </ol>
        </div>

        <div className="protocol-review-grid">
          <div>
            <strong>Missing or thin fields</strong>
            {protocolReview.missingRequiredFields.length ||
            protocolReview.underspecifiedFields.length ? (
              <ul className="clean-list">
                {[...protocolReview.missingRequiredFields, ...protocolReview.underspecifiedFields].map(
                  (field) => (
                    <li key={field}>{field}</li>
                  ),
                )}
              </ul>
            ) : (
              <p>Core draft fields are present.</p>
            )}
          </div>
          <div>
            <strong>Trust axes</strong>
            <ul className="clean-list">
              <li>Factual trust: {protocolReview.trustAssessment.factualTrust.rating}</li>
              <li>
                Counterfactual baseline:{" "}
                {protocolReview.trustAssessment.counterfactualBaseline.rating}
              </li>
              <li>
                Externality review:{" "}
                {protocolReview.trustAssessment.externalityReview.required ? "required" : "not triggered"}
              </li>
              <li>
                Party-relative benefit:{" "}
                {protocolReview.trustAssessment.partyRelativeBenefit.rating}
              </li>
              <li>Privacy redaction: {protocolReview.trustAssessment.privacyRedaction.rating}</li>
            </ul>
          </div>
          <div>
            <strong>Factor codes</strong>
            <div className="protocol-factor-list">
              {protocolReview.factorCodes.map((factor) => (
                <span key={factor}>{factor}</span>
              ))}
            </div>
          </div>
        </div>

        {protocolReview.policyConflicts.length ? (
          <div className="protocol-conflict-note">
            <strong>Policy conflicts:</strong> {protocolReview.policyConflicts.join(", ")}
          </div>
        ) : null}

        <div className="protocol-review-grid">
          <div>
            <strong>Evidence to request</strong>
            {protocolReview.reviewInstructions.artifactsToRequest.length ? (
              <ul className="clean-list">
                {protocolReview.reviewInstructions.artifactsToRequest.map((artifact) => (
                  <li key={artifact}>{artifact}</li>
                ))}
              </ul>
            ) : (
              <p>No extra artifacts are requested by the deterministic preview.</p>
            )}
          </div>
          <div>
            <strong>Reviewer scope</strong>
            <ul className="clean-list">
              {protocolReview.reviewInstructions.reviewScope.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Appeal triggers</strong>
            <ul className="clean-list">
              {protocolReview.reviewInstructions.appealTriggers.map((trigger) => (
                <li key={trigger}>{trigger}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="protocol-review-grid">
          <div>
            <strong>Cited evidence table</strong>
            <ul className="clean-list">
              {protocolReview.citedEvidenceTable.map((row) => (
                <li key={`${row.citation}:${row.claim}`}>
                  {row.status}: {row.claim} ({row.citation})
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="protocol-review-grid">
          <div>
            <strong>Clarification questions</strong>
            {protocolReview.clarificationQuestions.length ? (
              <ul className="clean-list">
                {protocolReview.clarificationQuestions.map((item) => (
                  <li key={item.field}>
                    {item.field}: {item.question}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No clarification questions are needed before reviewer triage.</p>
            )}
          </div>
          <div>
            <strong>Next step checklist</strong>
            <ul className="clean-list">
              {protocolReview.nextStepChecklist.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Reviewer summary</strong>
            <p>{protocolReview.reviewerSummary}</p>
          </div>
        </div>
      </section>

      <form
        action={createOfferAction}
        className="stack-form"
        onSubmit={(event) => {
          if (liveOfferErrors.length || !supabaseReady) {
            event.preventDefault();
          }
        }}
      >
        <label className="field" id="offer-route">
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
          {isPayment ? (
            <small>
              Paid action offers are intentionally deferred from the public creation path. Use
              pledge swaps, verified offsets, or the public-goods flow unless an operator invites a
              reviewed paid-action pilot.
            </small>
          ) : null}
        </label>

        <div className="panel subtle-panel">
          <p className="eyebrow">Validator checklist</p>
          <div className="tag-row">
            <span className="badge badge-secondary">No-trade baseline</span>
            <span className="badge badge-secondary">Evidence schema</span>
            <span className="badge badge-secondary">One proof, one claim</span>
            <span className="badge badge-secondary">Exit condition</span>
            <span className="badge badge-secondary">Challenge window</span>
            <span className="badge badge-secondary">Completion state</span>
          </div>
          <p className="panel-note">
            A public offer should be easy for a reviewer to evaluate without guessing what would
            have happened absent the trade.
          </p>
        </div>

        <div className="field-grid" id="offer-terms">
          <label className="field">
            <span>What you&apos;re offering</span>
            <select
              name="offered_cause"
              value={offeredCause}
              onChange={(event) => setOfferedCause(readFormControlValue(event))}
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
              name="requested_cause"
              value={requestedCause}
              onChange={(event) => setRequestedCause(readFormControlValue(event))}
            >
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

        <label className="field" id="offer-boundaries">
          <span>No-trade baseline / default</span>
          <textarea
            name="baseline_statement"
            onChange={(event) => setBaselineStatement(readFormControlValue(event))}
            placeholder="e.g. Without this trade, I would make the opposed donation next month; I can support that baseline with past donation records."
            required
            rows={3}
            value={baselineStatement}
          />
          <small>
            This is the counterfactual trust field: reviewers need to know what the default would
            have been.
          </small>
        </label>

        <label className="field">
          <span>Exit, pause, or expiry condition</span>
          <textarea
            name="exit_condition"
            onChange={(event) => setExitCondition(readFormControlValue(event))}
            placeholder="e.g. If evidence is missing by the deadline, the record remains unresolved and no completion badge is shown."
            required
            rows={3}
            value={exitCondition}
          />
          <small>
            Short, bounded trades are easier to trust than open-ended commitments with unclear exit
            rules.
          </small>
        </label>

        <label className="field">
          <span>Compromise destination (offset only)</span>
          <select
            name="compromise_cause"
            value={compromiseCause}
            onChange={(event) => setCompromiseCause(readFormControlValue(event))}
          >
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
                Evidence links must be unique to one offset claim. Unverified baselines are kept
                out of the public marketplace until they are reviewed.
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
            <input
              max={10}
              min={1}
              name="offer_impact"
              type="number"
              value={offerImpact}
              onChange={(event) => setOfferImpact(readFormControlValue(event))}
            />
            <small>
              This reflects your own stated priorities. It is not a platform judgment about
              objective moral value.
            </small>
          </label>

          <label className="field">
            <span>Minimum counterparty impact</span>
            <input
              max={10}
              min={1}
              name="min_counterparty_impact"
              type="number"
              value={minCounterpartyImpact}
              onChange={(event) => setMinCounterpartyImpact(readFormControlValue(event))}
            />
            <small>
              Use this as a participant-relative threshold for the trade, not as a global moral
              ranking.
            </small>
          </label>
        </div>

        <div className="field-grid" id="offer-evidence">
          <label className="field">
            <span>Verification preference</span>
            <select
              name="verification"
              value={verificationPreference}
              onChange={(event) => setVerificationPreference(readFormControlValue(event))}
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
              value={reviewPeriod}
              onChange={(event) => setReviewPeriod(readFormControlValue(event))}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isPayment ? (
          <>
            <div className="field-grid">
              <label className="field">
                <span>Payment cadence (deferred paid pilots only)</span>
                <select
                  name="payment_interval_unit"
                  value={paymentIntervalUnit}
                  onChange={(event) => setPaymentIntervalUnit(readFormControlValue(event) as PaymentIntervalUnit)}
                >
                  {PAYMENT_INTERVAL_UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Repeat every</span>
                <input
                  min={1}
                  name="payment_interval_value"
                  type="number"
                  value={paymentIntervalValue}
                  onChange={(event) => setPaymentIntervalValue(readFormControlValue(event))}
                />
              </label>
            </div>
            <p className="panel-note">
              Paid action offers are not part of the public launch wedge. Payment cadence appears
              only for future reviewed pilots and never implies escrow or custody.
            </p>
          </>
        ) : (
          <>
            <input name="payment_interval_unit" type="hidden" value="none" />
            <input name="payment_interval_value" type="hidden" value="1" />
          </>
        )}

        <label className="field">
          <span>Trust intensity</span>
          <input
            max={5}
            min={1}
            name="trust_level"
            type="number"
            value={trustLevel}
            onChange={(event) => setTrustLevel(readFormControlValue(event))}
          />
        </label>

        <label className="field" id="offer-publish">
          <span>Description</span>
          <textarea
            name="notes"
            onChange={(event) => setNotes(readFormControlValue(event))}
            placeholder="Explain why each side is better off than the no-trade baseline, what evidence you can provide, and what should happen if matching is incomplete."
            required
            rows={4}
            value={notes}
          />
        </label>

        <div className="form-actions">
          <button className="button button-primary" disabled={!canPublishOffer} type="submit">
            {isPayment ? "Paid offers are deferred" : "Publish offer"}
          </button>
          <Link className="button button-secondary" href="/offers">
            Back to offers
          </Link>
        </div>
      </form>
    </article>
  );
}
