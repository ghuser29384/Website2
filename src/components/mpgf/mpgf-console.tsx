"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  createMpgfRealMoneyCheckoutAction,
  recordMpgfPledgesAction,
  recordMpgfPublicGoodsPledgeAction,
  saveMpgfBallotAction,
  saveMpgfPoolProposalAction,
  submitMpgfManualExternalPaymentEvidenceAction,
} from "@/app/mpgf/actions";
import {
  demoAlternatives,
  demoBallots,
  demoCycle,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsSubscriptions,
  demoPledges,
  MPGF_COPY,
} from "@/lib/mpgf/data";
import {
  FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION,
  PROVISIONAL_FAILURE_BONUS_SUCCESS_PREMIUM_POLICY,
} from "@/lib/mpgf/failure-bonus-success-premium";
import {
  FAILURE_BONUS_THRESHOLD_EDITOR_COPY,
  FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS,
  addFailureBonusThresholdDraft,
  buildFailureBonusThresholdEditorQuote,
  createFailureBonusThresholdDraft,
  moveFailureBonusThresholdDraft,
  parseUsdInputToCents,
  removeFailureBonusThresholdDraft,
  type FailureBonusThresholdDraft,
  type FailureBonusThresholdEditorResult,
} from "@/lib/mpgf/failure-bonus-threshold-editor";
import {
  allocateMpgfAssuranceRound,
  buildDemoBallotFromWeights,
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
  createMpgfPublicGoodsIdentityAttestation,
  createMpgfPublicGoodsPledge,
  createMpgfPublicGoodsSponsorSubscription,
  createMpgfPledgeOnlyRecord,
  createMpgfRecurringContributionCommitment,
  formatUsd,
  getPledgedCents,
  isLedgerBalanced,
  materializeMpgfRecurringPledgeForCycle,
  saveMpgfBallotDraft,
  submitMpgfBallot,
  submitMpgfPoolProposalDraft,
} from "@/lib/mpgf/mechanism";
import type { MpgfParticipantState } from "@/lib/mpgf/participant-types";
import type { MpgfManualEvidenceProvider, MpgfManualEvidenceReadiness, MpgfRealMoneyReadiness } from "@/lib/mpgf/real-money-types";
import type {
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsDestinationType,
  MpgfPublicGoodsVisibilityMode,
} from "@/lib/mpgf/types";

type MpgfConsoleTab = "contribute" | "pools" | "ballot" | "summary";

interface MpgfConsoleProps {
  initialPoolProposalDeadline?: string;
  initialTab?: MpgfConsoleTab;
  participantState?: MpgfParticipantState;
  manualEvidenceReadiness?: MpgfManualEvidenceReadiness;
  realMoneyReadiness?: MpgfRealMoneyReadiness;
  poolTemplateApplied?: boolean;
  viewerPresent?: boolean;
}

const tabs: Array<{ id: MpgfConsoleTab; label: string }> = [
  { id: "contribute", label: "Pledge" },
  { id: "pools", label: "Pools" },
  { id: "ballot", label: "Ballot" },
  { id: "summary", label: "Summary" },
];

function readFormControlValue(event: { currentTarget: EventTarget }) {
  return (event.currentTarget as unknown as { value: string }).value;
}

function readNumericFormControlValue(event: { currentTarget: EventTarget }) {
  const value = Number(readFormControlValue(event));

  return Number.isFinite(value) ? value : 0;
}


function formatBasisPointsPercent(basisPoints: number) {
  const percent = basisPoints / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;
}


interface FailureBonusThresholdEditorProps {
  drafts: FailureBonusThresholdDraft[];
  failureBonusRatePercent: string;
  maxParticipants: string;
  maxBonusPerParticipantDollars: string;
  result: FailureBonusThresholdEditorResult | null;
  onFailureBonusRateChange: (value: string) => void;
  onMaxParticipantsChange: (value: string) => void;
  onMaxBonusPerParticipantChange: (value: string) => void;
  onThresholdChange: (
    thresholdId: string,
    patch: Partial<Omit<FailureBonusThresholdDraft, "thresholdId">>,
  ) => void;
  onAddThreshold: () => void;
  onRemoveThreshold: (thresholdId: string) => void;
  onMoveThreshold: (thresholdId: string, direction: "up" | "down") => void;
}

function FailureBonusThresholdEditor({
  drafts,
  failureBonusRatePercent,
  maxParticipants,
  maxBonusPerParticipantDollars,
  result,
  onFailureBonusRateChange,
  onMaxParticipantsChange,
  onMaxBonusPerParticipantChange,
  onThresholdChange,
  onAddThreshold,
  onRemoveThreshold,
  onMoveThreshold,
}: FailureBonusThresholdEditorProps) {
  const schedule = result?.ok ? result.quote.schedule : null;
  const finalThreshold = schedule?.thresholds.at(-1);

  return (
    <section className="mpgf-threshold-editor" aria-labelledby="failure-bonus-threshold-editor-heading">
      <div className="mpgf-threshold-editor-header">
        <div>
          <p className="eyebrow">Failure-bonus contract</p>
          <h3 id="failure-bonus-threshold-editor-heading">Price one to ten cumulative thresholds</h3>
        </div>
        <span className="mpgf-small">
          {drafts.length}/{FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS} thresholds
        </span>
      </div>

      <div className="mpgf-threshold-policy-note">
        <strong>One promise across the pool</strong>
        <p>{FAILURE_BONUS_THRESHOLD_EDITOR_COPY.poolWidePolicy}</p>
        <p>{FAILURE_BONUS_THRESHOLD_EDITOR_COPY.underwritingBounds}</p>
        <p>
          The participant and per-person caps apply once across the whole pool, not once per threshold.
          Each incremental funding tranche is priced once. After the first accepted pledge, the formula,
          eligibility policy, caps, and threshold schedule cannot change.
        </p>
      </div>

      <div className="mpgf-threshold-policy-grid">
        <label>
          Pool-wide failure bonus rate
          <span className="mpgf-money-input mpgf-percent-input">
            <input
              aria-label="Failure bonus rate percent"
              inputMode="decimal"
              type="text"
              value={failureBonusRatePercent}
              onChange={(event) => onFailureBonusRateChange(readFormControlValue(event))}
            />
            <span>%</span>
          </span>
        </label>
        <label>
          Maximum eligible participants
          <input
            inputMode="numeric"
            min="1"
            step="1"
            type="number"
            value={maxParticipants}
            onChange={(event) => onMaxParticipantsChange(readFormControlValue(event))}
          />
        </label>
        <label>
          Maximum failure bonus per participant
          <span className="mpgf-money-input">
            <span>$</span>
            <input
              aria-label="Maximum failure bonus per participant dollars"
              inputMode="decimal"
              type="text"
              value={maxBonusPerParticipantDollars}
              onChange={(event) => onMaxBonusPerParticipantChange(readFormControlValue(event))}
            />
          </span>
        </label>
      </div>

      <div className="mpgf-threshold-card-list">
        {drafts.map((draft, index) => {
          const thresholdNumber = index + 1;
          const quote = schedule?.thresholds[index];
          return (
            <article key={draft.thresholdId} className="mpgf-threshold-card">
              <header className="mpgf-threshold-card-header">
                <div>
                  <strong>Threshold {thresholdNumber}</strong>
                  <span className="mpgf-small">Stable ID: {draft.thresholdId}</span>
                </div>
                <div className="mpgf-threshold-card-actions" aria-label={`Threshold ${thresholdNumber} order controls`}>
                  <button
                    aria-label={`Move threshold ${thresholdNumber} up`}
                    className="button button-secondary"
                    disabled={index === 0}
                    type="button"
                    onClick={() => onMoveThreshold(draft.thresholdId, "up")}
                  >
                    Up
                  </button>
                  <button
                    aria-label={`Move threshold ${thresholdNumber} down`}
                    className="button button-secondary"
                    disabled={index === drafts.length - 1}
                    type="button"
                    onClick={() => onMoveThreshold(draft.thresholdId, "down")}
                  >
                    Down
                  </button>
                  <button
                    aria-label={`Remove threshold ${thresholdNumber}`}
                    className="button button-secondary"
                    disabled={drafts.length === 1}
                    type="button"
                    onClick={() => onRemoveThreshold(draft.thresholdId)}
                  >
                    Remove
                  </button>
                </div>
              </header>

              <div className="mpgf-threshold-input-grid">
                <label>
                  Threshold {thresholdNumber} cumulative net recipient amount
                  <span className="mpgf-money-input">
                    <span>$</span>
                    <input
                      inputMode="decimal"
                      type="text"
                      value={draft.cumulativeNetRecipientDollars}
                      onChange={(event) =>
                        onThresholdChange(draft.thresholdId, {
                          cumulativeNetRecipientDollars: readFormControlValue(event),
                        })
                      }
                    />
                  </span>
                </label>
                <label>
                  Threshold {thresholdNumber} estimated success probability
                  <span className="mpgf-money-input mpgf-percent-input">
                    <input
                      inputMode="decimal"
                      type="text"
                      value={draft.successProbabilityPercent}
                      onChange={(event) =>
                        onThresholdChange(draft.thresholdId, {
                          successProbabilityPercent: readFormControlValue(event),
                        })
                      }
                    />
                    <span>%</span>
                  </span>
                </label>
                <label>
                  Threshold {thresholdNumber} expected eligible balance at failure
                  <span className="mpgf-money-input mpgf-percent-input">
                    <input
                      inputMode="decimal"
                      type="text"
                      value={draft.expectedEligibleFailureFillPercent}
                      onChange={(event) =>
                        onThresholdChange(draft.thresholdId, {
                          expectedEligibleFailureFillPercent: readFormControlValue(event),
                        })
                      }
                    />
                    <span>%</span>
                  </span>
                </label>
              </div>

              {quote ? (
                <dl className="mpgf-threshold-metrics">
                  <div>
                    <dt>Incremental net tranche</dt>
                    <dd>{formatUsd(quote.incrementalNetRecipientCents)}</dd>
                  </div>
                  <div>
                    <dt>Premium rate</dt>
                    <dd>{formatBasisPointsPercent(quote.premiumRateBps)}</dd>
                  </div>
                  <div>
                    <dt>Tranche premium</dt>
                    <dd>{formatUsd(quote.successPremiumCents)}</dd>
                  </div>
                  <div>
                    <dt>Cumulative premium</dt>
                    <dd>{formatUsd(quote.cumulativeSuccessPremiumCents)}</dd>
                  </div>
                  <div>
                    <dt>Gross success requirement</dt>
                    <dd>{formatUsd(quote.grossSuccessRequirementCents)}</dd>
                  </div>
                  <div>
                    <dt>Cumulative maximum bonus exposure</dt>
                    <dd>{formatUsd(quote.maximumFailureBonusExposureCents ?? 0)}</dd>
                  </div>
                </dl>
              ) : null}
            </article>
          );
        })}
      </div>

      <button
        className="button button-secondary mpgf-add-threshold-button"
        disabled={drafts.length >= FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS}
        type="button"
        onClick={onAddThreshold}
      >
        Add cumulative threshold
      </button>

      {result?.ok === false ? (
        <div className="mpgf-threshold-errors" role="alert">
          <strong>Complete the threshold contract before saving.</strong>
          <ul>
            {result.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      {schedule && finalThreshold ? (
        <div className="mpgf-threshold-schedule-summary" role="status">
          <strong>
            Provisional schedule: {schedule.thresholds.length} threshold{schedule.thresholds.length === 1 ? "" : "s"}, final gross requirement {formatUsd(finalThreshold.grossSuccessRequirementCents)}
          </strong>
          <p>
            Final cumulative net recipient amount: {formatUsd(finalThreshold.cumulativeNetRecipientThresholdCents)}.
            Cumulative success premium: {formatUsd(finalThreshold.cumulativeSuccessPremiumCents)}.
            Cumulative maximum failure-bonus exposure: {formatUsd(finalThreshold.maximumFailureBonusExposureCents ?? 0)}.
          </p>
          <p>
            The success premium is paid separately by the pool creator or named sponsor into the common Failure Bonus Reserve only for cleared tranches. It is not deducted from the recipient threshold. Future success premiums never count as collateral for current bonus promises.
          </p>
          <p>
            Every quote remains provisional until an authorized operator approves the complete schedule atomically. A creator cannot approve only selected tranches, lower the platform expense load or reserve margin, or make underwriting assumptions more optimistic than the provisional policy.
          </p>
          <div className="mpgf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Threshold</th>
                  <th scope="col">Cumulative net</th>
                  <th scope="col">Incremental net</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Tranche premium</th>
                  <th scope="col">Cumulative premium</th>
                  <th scope="col">Gross requirement</th>
                  <th scope="col">Cumulative exposure</th>
                </tr>
              </thead>
              <tbody>
                {schedule.thresholds.map((threshold) => (
                  <tr key={threshold.thresholdId}>
                    <th scope="row">{threshold.thresholdIndex}</th>
                    <td>{formatUsd(threshold.cumulativeNetRecipientThresholdCents)}</td>
                    <td>{formatUsd(threshold.incrementalNetRecipientCents)}</td>
                    <td>{formatBasisPointsPercent(threshold.premiumRateBps)}</td>
                    <td>{formatUsd(threshold.successPremiumCents)}</td>
                    <td>{formatUsd(threshold.cumulativeSuccessPremiumCents)}</td>
                    <td>{formatUsd(threshold.grossSuccessRequirementCents)}</td>
                    <td>{formatUsd(threshold.maximumFailureBonusExposureCents ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function createClientMutationKey(prefix: string) {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}:${randomId}`;
}

function assignBrowserLocation(url: string) {
  (globalThis as unknown as { location?: { assign: (target: string) => void } }).location?.assign(url);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function payloadMessage(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const error = record?.error;
  const nextAction = record?.nextAction;

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (typeof nextAction === "string" && nextAction.trim()) {
    return nextAction.replaceAll("_", " ");
  }

  return fallback;
}

function donateHrefFromPayload(payload: unknown) {
  const donateLink = asRecord(asRecord(payload)?.donateLink);
  const href = donateLink?.href;

  return typeof href === "string" && href.trim() ? href : null;
}

export function MpgfConsole({
  initialPoolProposalDeadline = "",
  initialTab = "contribute",
  manualEvidenceReadiness,
  participantState,
  poolTemplateApplied = false,
  realMoneyReadiness,
  viewerPresent = false,
}: MpgfConsoleProps) {
  const [activeTab, setActiveTab] = useState<MpgfConsoleTab>(initialTab);
  const [persistedState, setPersistedState] = useState<MpgfParticipantState | undefined>(participantState);
  const [pendingAction, setPendingAction] = useState<
    "fastRoute" | "savedCommitment" | "pledge" | "publicGoodsPledge" | "checkout" | "manualEvidence" | "proposal" | "ballot" | null
  >(null);
  const [oneTimePledge, setOneTimePledge] = useState(25);
  const [monthlyPledge, setMonthlyPledge] = useState(10);
  const [publicGoodsCampaignId, setPublicGoodsCampaignId] = useState("campaign-global-health-basic-needs");
  const [publicGoodsPledgeAmount, setPublicGoodsPledgeAmount] = useState(25);
  const [publicGoodsCounterpartBuckets, setPublicGoodsCounterpartBuckets] = useState(
    "animal-welfare, existential-risk, institutional-integrity",
  );
  const [publicGoodsMinimumCounterpartyDollars, setPublicGoodsMinimumCounterpartyDollars] = useState(25);
  const [publicGoodsVisibilityMode, setPublicGoodsVisibilityMode] =
    useState<MpgfPublicGoodsVisibilityMode>("private_amount");
  const [publicGoodsCaptureMode, setPublicGoodsCaptureMode] =
    useState<MpgfPublicGoodsCaptureMode>("external_handoff");
  const [publicGoodsRecurring, setPublicGoodsRecurring] = useState(false);
  const [futureUseConsentAccepted, setFutureUseConsentAccepted] = useState(false);
  const [publicGoodsReason, setPublicGoodsReason] = useState("");
  const [manualEvidenceAmount, setManualEvidenceAmount] = useState(25);
  const [manualEvidenceProvider, setManualEvidenceProvider] = useState<MpgfManualEvidenceProvider>("open_collective");
  const [manualEvidenceReference, setManualEvidenceReference] = useState("");
  const [manualEvidenceUrl, setManualEvidenceUrl] = useState("");
  const [manualEvidenceDescription, setManualEvidenceDescription] = useState("");
  const [manualEvidencePaidAt, setManualEvidencePaidAt] = useState("");
  const [pledgeIdempotencyKey, setPledgeIdempotencyKey] = useState(() => createClientMutationKey("mpgf.pledge"));
  const [publicGoodsPledgeIdempotencyKey, setPublicGoodsPledgeIdempotencyKey] = useState(() =>
    createClientMutationKey("mpgf.public-goods-pledge"),
  );
  const [poolProposalIdempotencyKey, setPoolProposalIdempotencyKey] = useState(() =>
    createClientMutationKey("mpgf.pool"),
  );
  const [ballotDraftIdempotencyKey, setBallotDraftIdempotencyKey] = useState(() =>
    createClientMutationKey("mpgf.ballot.draft"),
  );
  const [ballotSubmitIdempotencyKey, setBallotSubmitIdempotencyKey] = useState(() =>
    createClientMutationKey("mpgf.ballot.submit"),
  );
  const [pledgeConfirmation, setPledgeConfirmation] = useState(
    viewerPresent
      ? "No new pledge has been recorded in this account session."
      : "No pledge has been recorded in this browser session.",
  );
  const [publicGoodsPledgeConfirmation, setPublicGoodsPledgeConfirmation] = useState(
    "Your pledge only happens if enough verified people join. No money moves in pledge-only mode.",
  );
  const [fastRouteMessage, setFastRouteMessage] = useState(
    "Every.org fast-route donations return to a pending state until webhook import and review.",
  );
  const [savedCommitmentMessage, setSavedCommitmentMessage] = useState(
    "Production participation is pledge-only and uses external handoff. Moral Trade does not store a payment method.",
  );
  const [proposalTitle, setProposalTitle] = useState(
    poolTemplateApplied ? "New conditional public-good pool" : "Community public-goods evaluation reserve",
  );
  const [proposalSummary, setProposalSummary] = useState("");
  const [proposalCauseArea, setProposalCauseArea] = useState("");
  const [proposalProblem, setProposalProblem] = useState(
    "Many cause areas lack comparable public evidence that different moral views can inspect together.",
  );
  const [proposalIntervention, setProposalIntervention] = useState("");
  const [proposalMoralPublicGoodRationale, setProposalMoralPublicGoodRationale] = useState("");
  const [proposalRequestedMaximumFunding, setProposalRequestedMaximumFunding] = useState(50_000);
  const [proposalMinimumViableFunding, setProposalMinimumViableFunding] = useState(10_000);
  const [proposalOutcomeUnitLabel, setProposalOutcomeUnitLabel] = useState("");
  const [proposalOutcomeUnitDefinition, setProposalOutcomeUnitDefinition] = useState("");
  const [proposalReferenceAlternative, setProposalReferenceAlternative] = useState("");
  const [proposalMeasurementMethod, setProposalMeasurementMethod] = useState("");
  const [proposalUncertaintyDescription, setProposalUncertaintyDescription] = useState("");
  const [proposalExpectedEffectVsFunding, setProposalExpectedEffectVsFunding] = useState("");
  const [proposalTimeline, setProposalTimeline] = useState("");
  const [proposalMilestones, setProposalMilestones] = useState("");
  const [proposalRisks, setProposalRisks] = useState("");
  const [proposalMisusePathways, setProposalMisusePathways] = useState("");
  const [proposalRecipientName, setProposalRecipientName] = useState("");
  const [proposalImplementingTeam, setProposalImplementingTeam] = useState("");
  const [proposalDestinationType, setProposalDestinationType] =
    useState<MpgfPublicGoodsDestinationType>("external_charity");
  const [proposalDestinationRef, setProposalDestinationRef] = useState("");
  const [proposalThresholdDrafts, setProposalThresholdDrafts] = useState<FailureBonusThresholdDraft[]>(() => [
    createFailureBonusThresholdDraft({
      thresholdId: "threshold-1",
      cumulativeNetRecipientDollars: "10000.00",
    }),
  ]);
  const [proposalThresholdSupporters, setProposalThresholdSupporters] = useState(25);
  const [proposalFailureBonusEnabled, setProposalFailureBonusEnabled] = useState(poolTemplateApplied);
  const [proposalFailureBonusRatePercent, setProposalFailureBonusRatePercent] = useState("10.00");
  const [proposalFailureBonusMaxParticipants, setProposalFailureBonusMaxParticipants] = useState("");
  const [proposalFailureBonusMaxPerParticipantDollars, setProposalFailureBonusMaxPerParticipantDollars] =
    useState("");
  const [proposalDeadlineAt, setProposalDeadlineAt] = useState(initialPoolProposalDeadline);
  const [proposalVerificationMethod, setProposalVerificationMethod] = useState("");
  const [proposalBaselineRule, setProposalBaselineRule] = useState("");
  const [proposalExitRule, setProposalExitRule] = useState("");
  const [proposalBaseMatchRatio, setProposalBaseMatchRatio] = useState(1);
  const [proposalQfEnabled, setProposalQfEnabled] = useState(true);
  const [proposalQfCapMultiple, setProposalQfCapMultiple] = useState(1.5);
  const [proposalPayoutMethod, setProposalPayoutMethod] =
    useState<MpgfPublicGoodsCaptureMode>("external_handoff");
  const [proposalConfirmation, setProposalConfirmation] = useState(
    poolTemplateApplied
      ? "Threshold coalition template applied. Replace the project, baseline, threshold, cap, deadline, failure rule, recipient, and evidence terms before saving."
      : "Complete the pool reasoning fields before saving or submitting. This route performs no live authorization, payout, or real-money accounting.",
  );
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps])),
  );
  const [ballotConfirmation, setBallotConfirmation] = useState("No demo ballot draft saved yet.");
  const [ballotReviewOpen, setBallotReviewOpen] = useState(false);
  const [realMoneyMessage, setRealMoneyMessage] = useState(
    realMoneyReadiness?.ready
      ? "An approved external checkout route is available behind the published readiness gates."
      : "Native checkout is disabled. Use Every.org, a future sponsor-backed route, or pledge-only external handoff.",
  );
  const [manualEvidenceMessage, setManualEvidenceMessage] = useState(
    !viewerPresent
      ? "Manual evidence submission is available after sign-in."
      : manualEvidenceReadiness?.ready
      ? "Manual external-payment evidence can be submitted for review."
      : "Manual external-payment evidence can be submitted by signed-in participants; persistence errors will be shown after submission.",
  );

  const localBallot = useMemo(() => buildDemoBallotFromWeights(weights), [weights]);
  const budgetCents = demoCycle.budgetCents + Math.round(oneTimePledge * 100) + Math.round(monthlyPledge * 100);
  const allocation = useMemo(
    () => computeExactMpgfAllocation({ ballots: [...demoBallots, localBallot], budgetCents }),
    [budgetCents, localBallot],
  );
  const publicSummary = useMemo(() => buildPublicSummary({ allocation }), [allocation]);
  const ledgerTransactions = useMemo(() => buildDemoLedgerTransactions(demoPledges), []);
  const assuranceAllocation = useMemo(() => allocateMpgfAssuranceRound(), []);
  const sponsorPoolSubscriptionPreview = useMemo(
    () =>
      createMpgfPublicGoodsSponsorSubscription({
        userId: "browser-preview-sponsor",
        amountCents: Math.max(100, Math.round(monthlyPledge * 100)),
      }),
    [monthlyPledge],
  );
  const sponsorPoolMonthlyCents = demoMpgfPublicGoodsSubscriptions
    .filter((subscription) => subscription.status === "active")
    .reduce((sum, subscription) => sum + subscription.amountCents, 0);
  const ledgerBalanced = ledgerTransactions.every(isLedgerBalanced);

  function updateWeight(alternativeId: string, value: number) {
    setWeights((current) => ({
      ...current,
      [alternativeId]: value,
    }));
  }

  function updateProposalThresholdDraft(
    thresholdId: string,
    patch: Partial<Omit<FailureBonusThresholdDraft, "thresholdId">>,
  ) {
    setProposalThresholdDrafts((current) =>
      current.map((threshold) =>
        threshold.thresholdId === thresholdId ? { ...threshold, ...patch } : threshold,
      ),
    );
  }

  function addProposalThresholdDraft() {
    try {
      setProposalThresholdDrafts(
        addFailureBonusThresholdDraft(
          proposalThresholdDrafts,
          createClientMutationKey("mpgf.threshold"),
        ),
      );
    } catch (error) {
      setProposalConfirmation(
        error instanceof Error ? error.message : "A cumulative threshold could not be added.",
      );
    }
  }

  function removeProposalThresholdDraft(thresholdId: string) {
    try {
      setProposalThresholdDrafts(
        removeFailureBonusThresholdDraft(proposalThresholdDrafts, thresholdId),
      );
    } catch (error) {
      setProposalConfirmation(
        error instanceof Error ? error.message : "The cumulative threshold could not be removed.",
      );
    }
  }

  function moveProposalThresholdDraft(
    thresholdId: string,
    direction: "up" | "down",
  ) {
    try {
      setProposalThresholdDrafts(
        moveFailureBonusThresholdDraft(proposalThresholdDrafts, thresholdId, direction),
      );
    } catch (error) {
      setProposalConfirmation(
        error instanceof Error ? error.message : "The cumulative threshold could not be reordered.",
      );
    }
  }

  const participantPledgeCount = persistedState?.pledges.length ?? 0;
  const participantCommitmentCount = persistedState?.recurringCommitments.length ?? 0;
  const participantPublicGoodsPledgeCount = persistedState?.publicGoodsPledges.length ?? 0;
  const participantPublicGoodsSubscriptionCount = persistedState?.publicGoodsSubscriptions.length ?? 0;
  const participantProposalCount = persistedState?.poolProposals.length ?? 0;
  const participantBallotCount = persistedState?.ballots.length ?? 0;
  const selectedPublicGoodsCampaign =
    demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === publicGoodsCampaignId) ??
    demoMpgfPublicGoodsCampaigns[0];
  const storedPaymentCommitmentsEnabled = Boolean(realMoneyReadiness?.ready);
  const persistenceLabel = viewerPresent
    ? persistedState?.status === "authenticated"
      ? "Persisted to your MPGF participant account."
      : "Persistence is signed in but not fully available."
    : "Sign in to persist this workflow across sessions.";
  const proposalMilestoneItems = proposalMilestones
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const proposalRiskItems = proposalRisks
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const proposalFirstThresholdCents = useMemo(() => {
    try {
      return parseUsdInputToCents(
        proposalThresholdDrafts[0]?.cumulativeNetRecipientDollars ?? "",
        "Net recipient threshold",
      );
    } catch {
      return 0;
    }
  }, [proposalThresholdDrafts]);
  const proposalThresholdEditorResult = useMemo(() => {
    if (!proposalFailureBonusEnabled) return null;
    return buildFailureBonusThresholdEditorQuote({
      drafts: proposalThresholdDrafts,
      failureBonusRatePercent: proposalFailureBonusRatePercent,
      maxParticipants: proposalFailureBonusMaxParticipants,
      maxBonusPerParticipantDollars: proposalFailureBonusMaxPerParticipantDollars,
      requestedMaximumFundingDollars: String(proposalRequestedMaximumFunding),
      verifiedSupporterMinimum: proposalThresholdSupporters,
    });
  }, [
    proposalFailureBonusEnabled,
    proposalFailureBonusMaxParticipants,
    proposalFailureBonusMaxPerParticipantDollars,
    proposalFailureBonusRatePercent,
    proposalRequestedMaximumFunding,
    proposalThresholdDrafts,
    proposalThresholdSupporters,
  ]);
  const proposalSuccessPremiumSchedule =
    proposalThresholdEditorResult?.ok === true ? proposalThresholdEditorResult.quote : null;
  const poolReasoningComplete = [
    proposalTitle,
    proposalSummary,
    proposalCauseArea,
    proposalProblem,
    proposalIntervention,
    proposalMoralPublicGoodRationale,
    proposalOutcomeUnitLabel,
    proposalOutcomeUnitDefinition,
    proposalMeasurementMethod,
    proposalExpectedEffectVsFunding,
    proposalTimeline,
    proposalMisusePathways,
    proposalDestinationRef,
    proposalVerificationMethod,
    proposalBaselineRule,
    proposalExitRule,
  ].every((value) => value.trim()) &&
    proposalRequestedMaximumFunding > 0 &&
    proposalMinimumViableFunding >= 0 &&
    proposalMinimumViableFunding <= proposalRequestedMaximumFunding &&
    proposalFirstThresholdCents > 0 &&
    proposalFirstThresholdCents <= Math.round(proposalRequestedMaximumFunding * 100) &&
    proposalThresholdSupporters > 0 &&
    (!proposalFailureBonusEnabled || Boolean(proposalSuccessPremiumSchedule)) &&
    Number.isFinite(Date.parse(`${proposalDeadlineAt}T00:00:00.000Z`)) &&
    proposalBaseMatchRatio >= 0 &&
    proposalQfCapMultiple >= 0 &&
    proposalMilestoneItems.length > 0 &&
    proposalRiskItems.length > 0 &&
    Boolean(proposalRecipientName.trim() || proposalImplementingTeam.trim());

  function buildPoolReasoningActionInput(intent: "draft" | "submitted") {
    return {
      idempotencyKey: poolProposalIdempotencyKey,
      title: proposalTitle,
      summary: proposalSummary,
      causeArea: proposalCauseArea,
      problem: proposalProblem,
      intervention: proposalIntervention,
      moralPublicGoodRationale: proposalMoralPublicGoodRationale,
      requestedMaximumFundingDollars: proposalRequestedMaximumFunding,
      minimumViableFundingDollars: proposalMinimumViableFunding || undefined,
      outcomeUnitLabel: proposalOutcomeUnitLabel,
      outcomeUnitDefinition: proposalOutcomeUnitDefinition,
      referenceAlternative: proposalReferenceAlternative,
      measurementMethod: proposalMeasurementMethod,
      uncertaintyDescription: proposalUncertaintyDescription,
      expectedEffectVsFunding: proposalExpectedEffectVsFunding,
      timeline: proposalTimeline,
      milestones: proposalMilestones,
      risks: proposalRisks,
      misusePathways: proposalMisusePathways,
      proposedRecipientName: proposalRecipientName,
      implementingTeam: proposalImplementingTeam,
      publicGoodsDestinationType: proposalDestinationType,
      publicGoodsDestinationRef: proposalDestinationRef,
      publicGoodsThresholdAmountDollars: proposalFirstThresholdCents / 100,
      publicGoodsThresholdSupporters: proposalThresholdSupporters,
      publicGoodsFailureBonusEnabled: proposalFailureBonusEnabled,
      publicGoodsFailureBonusRateBps: proposalSuccessPremiumSchedule?.failureBonusRateBps,
      publicGoodsFailureBonusEligibilityPolicy:
        proposalSuccessPremiumSchedule?.eligibilityPolicy,
      publicGoodsFailureBonusMaxParticipants:
        proposalSuccessPremiumSchedule?.eligibilityPolicy.maxParticipants,
      publicGoodsFailureBonusMaxPerParticipantCents:
        proposalSuccessPremiumSchedule?.eligibilityPolicy.maxBonusPerParticipantCents,
      publicGoodsThresholdSchedule: proposalSuccessPremiumSchedule?.schedule,
      publicGoodsSuccessPremiumRateBps:
        proposalSuccessPremiumSchedule?.firstPremiumRateBps,
      publicGoodsSuccessPremiumCents:
        proposalSuccessPremiumSchedule?.firstSuccessPremiumCents,
      publicGoodsSuccessPremiumPayer: proposalFailureBonusEnabled
        ? "pool_creator_or_sponsor" as const
        : undefined,
      publicGoodsSuccessPremiumPolicyVersion: proposalFailureBonusEnabled
        ? FAILURE_BONUS_SUCCESS_PREMIUM_POLICY_VERSION
        : undefined,
      publicGoodsSuccessPremiumIncludedInNetThreshold: proposalFailureBonusEnabled
        ? false as const
        : undefined,
      publicGoodsSuccessPremiumProvisional: proposalFailureBonusEnabled ? true as const : undefined,
      publicGoodsGrossSuccessRequirementCents:
        proposalSuccessPremiumSchedule?.firstGrossSuccessRequirementCents,
      publicGoodsSuccessPremiumPricingAssumptions:
        proposalSuccessPremiumSchedule?.schedule.thresholds[0]?.assumptions,
      publicGoodsDeadlineAt: proposalDeadlineAt
        ? new Date(`${proposalDeadlineAt}T23:59:59.000Z`).toISOString()
        : undefined,
      publicGoodsVerificationMethod: proposalVerificationMethod,
      publicGoodsBaselineRule: proposalBaselineRule,
      publicGoodsExitRule: proposalExitRule,
      publicGoodsBaseMatchRatio: proposalBaseMatchRatio,
      publicGoodsQfEnabled: proposalQfEnabled,
      publicGoodsQfCapMultiple: proposalQfCapMultiple,
      publicGoodsPayoutMethod: proposalPayoutMethod,
      intent,
    };
  }

  function buildPoolReasoningDemoInput() {
    return {
      title: proposalTitle,
      summary: proposalSummary,
      causeArea: proposalCauseArea,
      problem: proposalProblem,
      intervention: proposalIntervention,
      moralPublicGoodRationale: proposalMoralPublicGoodRationale,
      requestedMaximumFundingCents: Math.round(proposalRequestedMaximumFunding * 100),
      minimumViableFundingCents: proposalMinimumViableFunding
        ? Math.round(proposalMinimumViableFunding * 100)
        : undefined,
      outcomeUnitLabel: proposalOutcomeUnitLabel,
      outcomeUnitDefinition: proposalOutcomeUnitDefinition,
      referenceAlternative: proposalReferenceAlternative,
      measurementMethod: proposalMeasurementMethod,
      uncertaintyDescription: proposalUncertaintyDescription,
      expectedEffectVsFunding: proposalExpectedEffectVsFunding,
      timeline: proposalTimeline,
      milestones: proposalMilestoneItems,
      risks: proposalRiskItems,
      misusePathways: proposalMisusePathways,
      proposedRecipientName: proposalRecipientName,
      implementingTeam: proposalImplementingTeam,
    };
  }

  async function recordPledgeOnlyCommitments() {
    if (viewerPresent) {
      setPendingAction("pledge");
      const result = await recordMpgfPledgesAction({
        idempotencyKey: pledgeIdempotencyKey,
        oneTimeAmountDollars: oneTimePledge,
        monthlyAmountDollars: monthlyPledge,
      });

      if (result.state) {
        setPersistedState(result.state);
      }

      setPledgeConfirmation(result.message);
      if (result.ok) {
        setPledgeIdempotencyKey(createClientMutationKey("mpgf.pledge"));
      }
      setPendingAction(null);
      return;
    }

    const oneTime = createMpgfPledgeOnlyRecord({
      amountCents: Math.max(1, Math.round(oneTimePledge * 100)),
      cadence: "one_time",
      contributorLabel: "Direct-working participant",
    });
    const monthly =
      monthlyPledge > 0
        ? createMpgfRecurringContributionCommitment({
            userId: "direct-working-monthly-participant",
            amountCents: Math.round(monthlyPledge * 100),
            mode: "pledge_only",
          })
        : null;
    const materializedMonthlyPledge = monthly
      ? materializeMpgfRecurringPledgeForCycle({
          commitmentId: monthly.id,
          cycleId: demoCycle.id,
          commitment: monthly,
        })
      : null;

    setPledgeConfirmation(
      monthly && materializedMonthlyPledge
        ? `Recorded demo pledge ${oneTime.id}, monthly commitment ${monthly.id}, and materialized pledge ${materializedMonthlyPledge.id}. No money moved.`
        : `Recorded demo commitment ${oneTime.id}. No money moved.`,
    );
  }

  async function recordPublicGoodsAssurancePledge() {
    if (!selectedPublicGoodsCampaign) {
      setPublicGoodsPledgeConfirmation("Choose a public-goods campaign before pledging.");
      return;
    }

    if (viewerPresent) {
      setPendingAction("publicGoodsPledge");
      const result = await recordMpgfPublicGoodsPledgeAction({
        idempotencyKey: publicGoodsPledgeIdempotencyKey,
        campaignId: selectedPublicGoodsCampaign.id,
        amountDollars: publicGoodsPledgeAmount,
        acceptableCounterpartBuckets: publicGoodsCounterpartBuckets,
        minimumCounterpartyClearedDollars: publicGoodsMinimumCounterpartyDollars,
        visibilityMode: publicGoodsVisibilityMode,
        captureMode: publicGoodsCaptureMode,
        isRecurring: publicGoodsRecurring,
        supporterReason: publicGoodsReason,
      });

      if (result.state) {
        setPersistedState(result.state);
      }

      setPublicGoodsPledgeConfirmation(result.message);
      if (result.ok) {
        setPublicGoodsPledgeIdempotencyKey(createClientMutationKey("mpgf.public-goods-pledge"));
        setPublicGoodsReason("");
      }
      setPendingAction(null);
      return;
    }

    try {
      const identity = createMpgfPublicGoodsIdentityAttestation({
        userId: "browser-public-goods-supporter",
        provider: "demo_self_attestation",
        humanScoreBps: 8_000,
        expiresAt: "2026-12-31T23:59:59.000Z",
        redactedReference: "browser-demo-public-goods-attestation",
      });
      const pledge = createMpgfPublicGoodsPledge({
        campaign: selectedPublicGoodsCampaign,
        userId: identity.userId,
        amountCents: Math.max(1, Math.round(publicGoodsPledgeAmount * 100)),
        acceptableCounterpartBuckets: publicGoodsCounterpartBuckets,
        minimumCounterpartyClearedCents: Math.max(100, Math.round(publicGoodsMinimumCounterpartyDollars * 100)),
        visibilityMode: publicGoodsVisibilityMode,
        captureMode: publicGoodsCaptureMode,
        isRecurring: publicGoodsRecurring,
        supporterReason: publicGoodsReason,
        identityAttestation: identity,
      });

      setPublicGoodsPledgeConfirmation(
        `Recorded demo public-goods pledge ${pledge.id}. It remains conditional on threshold, review, and evidence gates.`,
      );
    } catch (error) {
      setPublicGoodsPledgeConfirmation(
        error instanceof Error ? error.message : "Public-goods pledge could not be recorded.",
      );
    }
  }

  async function startEveryOrgFastRoute() {
    if (!selectedPublicGoodsCampaign) {
      setFastRouteMessage("Choose a campaign before opening the Every.org fast route.");
      return;
    }

    setPendingAction("fastRoute");

    try {
      const response = await fetch("/api/mpgf/every-org/donate-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amountCents: Math.max(100, Math.round(publicGoodsPledgeAmount * 100)),
          campaignId: selectedPublicGoodsCampaign.id,
        }),
      });
      const payload = await response.json().catch(() => null);
      const href = donateHrefFromPayload(payload);

      if (response.ok && href) {
        setFastRouteMessage("Opening Every.org. Moral Trade will keep the return state pending until webhook review.");
        setPendingAction(null);
        assignBrowserLocation(href);
        return;
      }

      setFastRouteMessage(payloadMessage(payload, "Could not create an Every.org fast-route link."));
    } catch (error) {
      setFastRouteMessage(error instanceof Error ? error.message : "Could not create an Every.org fast-route link.");
    }

    setPendingAction(null);
  }

  async function startSavedCommitment() {
    if (!selectedPublicGoodsCampaign) {
      setSavedCommitmentMessage("Choose a campaign before saving a conditional commitment.");
      return;
    }

    if (!viewerPresent) {
      setSavedCommitmentMessage("Sign in before saving a Stripe SetupIntent commitment.");
      return;
    }

    if (!futureUseConsentAccepted) {
      setSavedCommitmentMessage("Accept future-use consent before saving a Stripe SetupIntent commitment.");
      return;
    }

    setPendingAction("savedCommitment");

    try {
      const response = await fetch("/api/mpgf/stripe/setup-intent", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amountCents: Math.max(100, Math.round(publicGoodsPledgeAmount * 100)),
          acceptableCounterpartBuckets: publicGoodsCounterpartBuckets,
          campaignId: selectedPublicGoodsCampaign.id,
          minimumCounterpartyClearedCents: Math.max(100, Math.round(publicGoodsMinimumCounterpartyDollars * 100)),
          explicitFutureUseConsent: futureUseConsentAccepted,
        }),
      });
      const payload = await response.json().catch(() => null);

      setSavedCommitmentMessage(
        response.ok
          ? "SetupIntent saved. Client confirmation and Stripe webhook review are still required before counting."
          : payloadMessage(payload, "Could not save a Stripe SetupIntent commitment."),
      );
    } catch (error) {
      setSavedCommitmentMessage(
        error instanceof Error ? error.message : "Could not save a Stripe SetupIntent commitment.",
      );
    }

    setPendingAction(null);
  }

  async function startRealMoneyCheckout(cadence: "one_time" | "monthly") {
    setPendingAction("checkout");
    const result = await createMpgfRealMoneyCheckoutAction({
      amountDollars: cadence === "monthly" ? monthlyPledge : oneTimePledge,
      cadence,
    });

    setRealMoneyMessage(result.message);

    if (result.checkoutUrl) {
      assignBrowserLocation(result.checkoutUrl);
      return;
    }

    setPendingAction(null);
  }

  async function submitManualEvidence() {
    if (!viewerPresent) {
      setManualEvidenceMessage("Manual evidence submission is available after sign-in.");
      return;
    }

    setPendingAction("manualEvidence");
    const result = await submitMpgfManualExternalPaymentEvidenceAction({
      amountDollars: manualEvidenceAmount,
      provider: manualEvidenceProvider,
      externalPaymentReference: manualEvidenceReference,
      evidenceUrl: manualEvidenceUrl,
      evidenceDescription: manualEvidenceDescription,
      paidAt: manualEvidencePaidAt ? new Date(`${manualEvidencePaidAt}T00:00:00.000Z`).toISOString() : null,
    });

    setManualEvidenceMessage(result.message);

    if (result.ok) {
      setManualEvidenceReference("");
      setManualEvidenceUrl("");
      setManualEvidenceDescription("");
      setManualEvidencePaidAt("");
    }

    setPendingAction(null);
  }

  async function saveBallotDraft() {
    if (viewerPresent) {
      setPendingAction("ballot");
      const result = await saveMpgfBallotAction({
        idempotencyKey: ballotDraftIdempotencyKey,
        weightsByAlternativeId: weights,
        intent: "draft",
      });

      if (result.state) {
        setPersistedState(result.state);
      }

      setBallotReviewOpen(true);
      setBallotConfirmation(result.message);
      if (result.ok) {
        setBallotDraftIdempotencyKey(createClientMutationKey("mpgf.ballot.draft"));
      }
      setPendingAction(null);
      return;
    }

    const draft = saveMpgfBallotDraft({
      userId: "direct-working-participant",
      cycleId: demoCycle.id,
      weightsByAlternativeId: weights,
    });

    setBallotReviewOpen(true);
    setBallotConfirmation(`Saved ${draft.id} version ${draft.draftVersion}; review before final demo submission.`);
  }

  async function submitBallotAfterReview() {
    if (viewerPresent) {
      setPendingAction("ballot");
      const result = await saveMpgfBallotAction({
        idempotencyKey: ballotSubmitIdempotencyKey,
        weightsByAlternativeId: weights,
        intent: "submitted",
      });

      if (result.state) {
        setPersistedState(result.state);
      }

      setBallotReviewOpen(false);
      setBallotConfirmation(result.message);
      if (result.ok) {
        setBallotSubmitIdempotencyKey(createClientMutationKey("mpgf.ballot.submit"));
      }
      setPendingAction(null);
      return;
    }

    const draft = saveMpgfBallotDraft({
      userId: "direct-working-participant",
      cycleId: demoCycle.id,
      weightsByAlternativeId: weights,
    });
    const submitted = submitMpgfBallot(draft);

    setBallotReviewOpen(false);
    setBallotConfirmation(`Submitted ${submitted.id} in demo mode. No disbursement was authorized.`);
  }

  async function savePoolProposal(intent: "draft" | "submitted") {
    if (!poolReasoningComplete) {
      setProposalConfirmation(
        "Complete the pool reasoning and assurance fields before saving or submitting: funding, destination, thresholds, verification rules, output unit, effect reasoning, timeline, milestones, risks, misuse pathways, and recipient or implementing team.",
      );
      return;
    }

    if (viewerPresent) {
      setPendingAction("proposal");
      const result = await saveMpgfPoolProposalAction(buildPoolReasoningActionInput(intent));

      if (result.state) {
        setPersistedState(result.state);
      }

      setProposalConfirmation(result.message);
      if (result.ok) {
        setPoolProposalIdempotencyKey(createClientMutationKey("mpgf.pool"));
      }
      setPendingAction(null);
      return;
    }

    if (intent === "draft") {
      setProposalConfirmation(
        `Saved draft ${proposalTitle.trim() || "untitled proposal"} with complete pool reasoning in this browser session. No live records changed.`,
      );
      return;
    }

    try {
      const proposal = submitMpgfPoolProposalDraft(buildPoolReasoningDemoInput());

      setProposalConfirmation(
        `Submitted ${proposal.id} for demo review. It remains fixture-owned and cannot create live allocation or payout effects.`,
      );
    } catch (error) {
      setProposalConfirmation(error instanceof Error ? error.message : "Proposal could not be submitted.");
    }
  }

  return (
    <section className="mpgf-console" aria-label="Moral Public Goods Fund direct-working console">
      <div className="mpgf-console-toolbar" aria-label="MPGF workflow">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-pressed={activeTab === tab.id}
            className="mpgf-tab"
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="mpgf-small" role="status">
        {persistenceLabel} Account records: {participantPublicGoodsPledgeCount} public-goods pledges,{" "}
        {participantPublicGoodsSubscriptionCount} sponsor-pool refills, {participantPledgeCount} legacy pledges,{" "}
        {participantCommitmentCount} monthly commitments, {participantProposalCount} proposals, {participantBallotCount} ballots.
      </p>

      {activeTab === "contribute" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel mpgf-panel-primary">
            <p className="eyebrow">1. Every.org fast route</p>
            <h2>Donate through webhook auto-import</h2>
            <p>
              Open the curated Every.org destination for the selected campaign. The return page stays
              pending: only the partner webhook plus MPGF review can make the contribution count.
            </p>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Campaign</dt>
                <dd>{selectedPublicGoodsCampaign?.title ?? "-"}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatUsd(Math.max(100, Math.round(publicGoodsPledgeAmount * 100)))}</dd>
              </div>
              <div>
                <dt>Return state</dt>
                <dd>pending webhook</dd>
              </div>
              <div>
                <dt>Fallback</dt>
                <dd>manual proof</dd>
              </div>
            </dl>
            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={pendingAction === "fastRoute" || publicGoodsPledgeAmount < 1}
                type="button"
                onClick={startEveryOrgFastRoute}
              >
                Open Every.org fast route
              </button>
              <Link className="button button-secondary" href="/mpgf/contribute/every-org/pending">
                View pending state
              </Link>
            </div>
            <p className="mpgf-small" role="status">
              {fastRouteMessage}
            </p>
          </section>

          <section className="mpgf-panel mpgf-panel-primary">
            <p className="eyebrow">2. Saved commitment</p>
            <h2>Save a conditional commitment</h2>
            <p>
              Save a non-custodial pledge intent. When the published conditions clear, the
              participant pays the approved external recipient through Every.org or a sponsor-backed
              route. Moral Trade does not store a payment method in the current production posture.
            </p>
            <div className="mpgf-form-grid">
              <label>
                Campaign
                <select
                  value={publicGoodsCampaignId}
                  onChange={(event) => setPublicGoodsCampaignId(readFormControlValue(event))}
                >
                  {demoMpgfPublicGoodsCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Conditional pledge amount
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    value={publicGoodsPledgeAmount}
                    onChange={(event) => setPublicGoodsPledgeAmount(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
              <label>
                Visibility
                <select
                  value={publicGoodsVisibilityMode}
                  onChange={(event) =>
                    setPublicGoodsVisibilityMode(readFormControlValue(event) as MpgfPublicGoodsVisibilityMode)
                  }
                >
                  <option value="private_amount">Private amount</option>
                  <option value="public_supporter">Public supporter</option>
                  <option value="public_reason">Public reason</option>
                </select>
              </label>
              <label>
                Acceptable counterpart buckets
                <textarea
                  placeholder="Comma-separated moral buckets that may clear against this pledge"
                  value={publicGoodsCounterpartBuckets}
                  onChange={(event) => setPublicGoodsCounterpartBuckets(readFormControlValue(event))}
                />
              </label>
              <label>
                Minimum counterpart-cleared volume
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    value={publicGoodsMinimumCounterpartyDollars}
                    onChange={(event) => setPublicGoodsMinimumCounterpartyDollars(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
              <label>
                Capture mode
                <select
                  value={publicGoodsCaptureMode}
                  onChange={(event) =>
                    setPublicGoodsCaptureMode(readFormControlValue(event) as MpgfPublicGoodsCaptureMode)
                  }
                >
                  <option value="external_handoff">External handoff</option>
                  <option value="signed_intent">Signed intent</option>
                  <option value="stored_payment_method" disabled>
                    Stored payment method - provider phase
                  </option>
                </select>
              </label>
              <label>
                Supporter reason
                <textarea
                  disabled={publicGoodsVisibilityMode !== "public_reason"}
                  placeholder="Optional public reason shown only when public reason is selected."
                  value={publicGoodsReason}
                  onChange={(event) => setPublicGoodsReason(readFormControlValue(event))}
                />
              </label>
              <label className="checkbox-label">
                <input
                  checked={publicGoodsRecurring}
                  type="checkbox"
                  onChange={(event) => setPublicGoodsRecurring(event.currentTarget.checked)}
                />
                <span>Also create an optional monthly sponsor-pool refill pledge</span>
              </label>
              {storedPaymentCommitmentsEnabled ? (
                <label className="checkbox-label">
                  <input
                    checked={futureUseConsentAccepted}
                    type="checkbox"
                    onChange={(event) => setFutureUseConsentAccepted(event.currentTarget.checked)}
                  />
                  <span>
                    I consent to save this payment method for one future MPGF charge only after
                    threshold, review, challenge, and parameter-lock gates clear.
                  </span>
                </label>
              ) : null}
            </div>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Threshold</dt>
                <dd>{selectedPublicGoodsCampaign ? formatUsd(selectedPublicGoodsCampaign.thresholdAmountCents) : "-"}</dd>
              </div>
              <div>
                <dt>Verified supporters needed</dt>
                <dd>{selectedPublicGoodsCampaign?.thresholdSupporters ?? "-"}</dd>
              </div>
              <div>
                <dt>Saved path</dt>
                <dd>{storedPaymentCommitmentsEnabled ? "SetupIntent first" : "external handoff or pledge-only"}</dd>
              </div>
              <div>
                <dt>Max exposure</dt>
                <dd>{formatUsd(Math.max(100, Math.round(publicGoodsPledgeAmount * 100)))}</dd>
              </div>
              <div>
                <dt>Counterpart minimum</dt>
                <dd>{formatUsd(Math.max(100, Math.round(publicGoodsMinimumCounterpartyDollars * 100)))}</dd>
              </div>
              <div>
                <dt>Failure path</dt>
                <dd>expire, release authorization, or donor fallback reroute</dd>
              </div>
              <div>
                <dt>Authorization timing</dt>
                <dd>near clearing only</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>
                  {selectedPublicGoodsCampaign
                    ? new Date(selectedPublicGoodsCampaign.deadlineAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "-"}
                </dd>
              </div>
            </dl>
            <div className="mpgf-inline-actions">
              {storedPaymentCommitmentsEnabled ? (
                <button
                  className="button button-secondary"
                  disabled={
                    !viewerPresent ||
                    pendingAction === "savedCommitment" ||
                    publicGoodsPledgeAmount < 1 ||
                    !futureUseConsentAccepted
                  }
                  type="button"
                  onClick={startSavedCommitment}
                >
                  Save provider commitment
                </button>
              ) : null}
              <button
                className={storedPaymentCommitmentsEnabled ? "button button-secondary" : "button button-primary"}
                disabled={pendingAction === "publicGoodsPledge" || publicGoodsPledgeAmount < 1}
                type="button"
                onClick={recordPublicGoodsAssurancePledge}
              >
                {viewerPresent ? "Save pledge intent" : "Record demo contribution intent"}
              </button>
              <Link className="button button-secondary" href="/mpgf/pools">
                Compare campaigns
              </Link>
            </div>
            <p className="mpgf-small" role="status">
              {savedCommitmentMessage}
            </p>
            <p className="mpgf-small" role="status">
              {publicGoodsPledgeConfirmation}
            </p>
          </section>

          <section className="mpgf-panel mpgf-panel-primary" id="manual-proof-fallback">
            <p className="eyebrow">3. Manual proof fallback</p>
            <h2>Use reviewed evidence only when integrations cannot import</h2>
            <p>{MPGF_COPY.manualExternalPaymentEvidence}</p>
            {manualEvidenceReadiness?.externalPaymentUrl ? (
              <a
                className="button button-secondary"
                href={manualEvidenceReadiness.externalPaymentUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open {manualEvidenceReadiness.providerLabel}
              </a>
            ) : null}
            <div className="mpgf-form-grid">
              <label>
                External amount
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    value={manualEvidenceAmount}
                    onChange={(event) => setManualEvidenceAmount(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
              <label>
                Provider
                <select
                  disabled={!viewerPresent}
                  value={manualEvidenceProvider}
                  onChange={(event) => setManualEvidenceProvider(readFormControlValue(event) as MpgfManualEvidenceProvider)}
                >
                  <option value="open_collective">Open Collective</option>
                  <option value="fiscal_host">Fiscal host</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                External reference
                <input
                  disabled={!viewerPresent}
                  placeholder="Receipt, transaction, invoice, or contribution ID"
                  value={manualEvidenceReference}
                  onChange={(event) => setManualEvidenceReference(readFormControlValue(event))}
                />
              </label>
              <label>
                Evidence URL
                <input
                  disabled={!viewerPresent}
                  placeholder="https://..."
                  type="url"
                  value={manualEvidenceUrl}
                  onChange={(event) => setManualEvidenceUrl(readFormControlValue(event))}
                />
              </label>
              <label>
                Payment date
                <input
                  disabled={!viewerPresent}
                  type="date"
                  value={manualEvidencePaidAt}
                  onChange={(event) => setManualEvidencePaidAt(readFormControlValue(event))}
                />
              </label>
              <label>
                Evidence description
                <textarea
                  disabled={!viewerPresent}
                  placeholder="Describe where the payment was made and what evidence an MPGF reviewer should inspect."
                  value={manualEvidenceDescription}
                  onChange={(event) => setManualEvidenceDescription(readFormControlValue(event))}
                />
              </label>
            </div>
            <div className="mpgf-confirmation" role="status">
              {!viewerPresent
                ? "Manual evidence submission is available after sign-in."
                : "Manual evidence submission is open for signed-in participants. Review is still required before contribution accounting."}
            </div>
            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={
                  !viewerPresent ||
                  pendingAction === "manualEvidence" ||
                  !manualEvidenceReference.trim() ||
                  !manualEvidenceDescription.trim()
                }
                type="button"
                onClick={submitManualEvidence}
              >
                Submit evidence
              </button>
              <Link className="button button-secondary" href="/mpgf/account/contributions">
                View evidence state
              </Link>
            </div>
            <p className="mpgf-small" role="status">
              {manualEvidenceMessage}
            </p>
            {!viewerPresent ? (
              <Link className="inline-link" href="/login?returnTo=/mpgf/contribute">
                Sign in before submitting manual evidence.
              </Link>
            ) : null}
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Pledge rehearsal</p>
            <h2>Try the mechanism before evidence review</h2>
            <p>{MPGF_COPY.pledgeOnly}</p>
            <div className="mpgf-form-grid">
              <label>
                One-time pledge
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    disabled={!viewerPresent}
                    min="1"
                    step="1"
                    type="number"
                    value={oneTimePledge}
                    onChange={(event) => setOneTimePledge(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
              <label>
                Monthly recurring pledge
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={monthlyPledge}
                    onChange={(event) => setMonthlyPledge(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
            </div>
            <div className="mpgf-confirmation" role="status">
              Demo pledge total: {formatUsd(Math.round(oneTimePledge * 100) + Math.round(monthlyPledge * 100))}
            </div>
            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={pendingAction === "pledge"}
                type="button"
                onClick={recordPledgeOnlyCommitments}
              >
                {viewerPresent ? "Save pledge state" : "Record demo pledges"}
              </button>
              <Link className="button button-secondary" href="/mpgf/account/contributions">
                View contribution state
              </Link>
            </div>
            <p className="mpgf-small" role="status">
              {pledgeConfirmation}
            </p>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Project funding gate</p>
            <h2>{realMoneyReadiness?.ready ? "Approved external checkout is available" : "Native checkout is disabled"}</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <div className="mpgf-confirmation" role="status">
              {realMoneyReadiness?.ready
                ? "All configured provider and acceptance gates are passed. The external provider remains the payment and refund source of truth."
                : "Moral Trade is not accepting project funds through native checkout. Direct-to-charity Every.org routes and pledge-only participation remain available."}
            </div>
            {realMoneyReadiness?.ready ? (
              <div className="mpgf-inline-actions">
                <button
                  className="button button-primary"
                  disabled={
                    !viewerPresent ||
                    pendingAction === "checkout" ||
                    !Number.isFinite(oneTimePledge) ||
                    oneTimePledge < 1
                  }
                  type="button"
                  onClick={() => startRealMoneyCheckout("one_time")}
                >
                  Open one-time checkout
                </button>
                <button
                  className="button button-secondary"
                  disabled={
                    !viewerPresent ||
                    pendingAction === "checkout" ||
                    !Number.isFinite(monthlyPledge) ||
                    monthlyPledge < 1
                  }
                  type="button"
                  onClick={() => startRealMoneyCheckout("monthly")}
                >
                  Open monthly checkout
                </button>
              </div>
            ) : (
              <div className="mpgf-inline-actions">
                <Link className="button button-primary" href="/support">
                  Review support routes
                </Link>
              </div>
            )}
            <p className="mpgf-small" role="status">
              {realMoneyMessage}
            </p>
            <Link className="inline-link" href="/mpgf/real-money-terms">
              Review funding terms and refund boundaries
            </Link>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Sponsor pool circle</p>
            <h2>Optional monthly sponsor-pool refill</h2>
            <p>
              Recurring support refills future challenge budgets after the assurance mechanism is
              understood. It stays opt-in and separate from one-time pledge conversion.
            </p>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Demo monthly refill</dt>
                <dd>{formatUsd(sponsorPoolMonthlyCents)}</dd>
              </div>
              <div>
                <dt>Preview amount</dt>
                <dd>{formatUsd(sponsorPoolSubscriptionPreview.amountCents)}</dd>
              </div>
              <div>
                <dt>Default capture</dt>
                <dd>{sponsorPoolSubscriptionPreview.captureMode.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{sponsorPoolSubscriptionPreview.mode.replaceAll("_", " ")}</dd>
              </div>
            </dl>
            <p className="mpgf-small">
              Preview only: no subscription, charge, donation receipt, custody claim, or payment-provider
              object is created unless a later provider-approved flow explicitly says so.
            </p>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Pledge safety gate</p>
            <h2>Pledge mode never charges</h2>
            <ul className="mpgf-check-list">
              <li>Stripe is not called by MPGF pledge-only mode.</li>
              <li>No tax, escrow, refund, or donation receipt claim is made.</li>
              <li>Monthly pledges are not subscriptions or charges.</li>
              <li>Demo ledger templates are double-entry balanced: {ledgerBalanced ? "yes" : "no"}.</li>
              <li>Authenticated participant records are saved to MPGF account state.</li>
            </ul>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Assurance match preview</p>
            <h2>{formatUsd(demoMpgfMatchPool.budgetCents)} sponsor pool</h2>
            <p>
              Base match and capped QF bonus appear only for campaigns that pass amount,
              verified-supporter, and review gates.
            </p>
            <div className="mpgf-allocation-bars">
              {assuranceAllocation.lines.map((line) => {
                const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.id === line.campaignId);

                return (
                  <div key={line.campaignId} className="mpgf-allocation-row">
                    <div>
                      <span>{campaign?.title ?? line.campaignId}</span>
                      <strong>{formatUsd(line.status === "payable" ? line.totalPayoutCents : 0)}</strong>
                    </div>
                    <meter max={demoMpgfMatchPool.budgetCents} value={line.baseMatchCents + line.qfBonusCents} />
                    <p className="mpgf-small">
                      {line.status.replaceAll("_", " ")}; {line.verifiedSupporterCount} verified supporter(s).
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "pools" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Pool reasoning</p>
            <h2>Draft a candidate pool reasoning</h2>
            {poolTemplateApplied ? (
              <p className="status-banner status-banner-success" role="status">
                Template applied. Every term remains editable; opening this form creates no pledge,
                authorization, allocation, or payout.
              </p>
            ) : null}
            <div className="mpgf-form-grid">
              <label>
                Proposal title
                <input value={proposalTitle} onChange={(event) => setProposalTitle(readFormControlValue(event))} />
              </label>
              <label>
                Cause area
                <input value={proposalCauseArea} onChange={(event) => setProposalCauseArea(readFormControlValue(event))} />
              </label>
              <label>
                Requested maximum funding
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="1"
                    step="100"
                    type="number"
                    value={proposalRequestedMaximumFunding}
                    onChange={(event) => setProposalRequestedMaximumFunding(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
              <label>
                Minimum viable funding
                <span className="mpgf-money-input">
                  <span>$</span>
                  <input
                    min="0"
                    step="100"
                    type="number"
                    value={proposalMinimumViableFunding}
                    onChange={(event) => setProposalMinimumViableFunding(readNumericFormControlValue(event))}
                  />
                </span>
              </label>
              <label>
                Summary
                <textarea value={proposalSummary} onChange={(event) => setProposalSummary(readFormControlValue(event))} />
              </label>
              <label>
                Problem statement
                <textarea value={proposalProblem} onChange={(event) => setProposalProblem(readFormControlValue(event))} />
              </label>
              <label>
                Proposed intervention
                <textarea value={proposalIntervention} onChange={(event) => setProposalIntervention(readFormControlValue(event))} />
              </label>
              <label>
                Moral public-good rationale
                <textarea
                  value={proposalMoralPublicGoodRationale}
                  onChange={(event) => setProposalMoralPublicGoodRationale(readFormControlValue(event))}
                />
              </label>
              <label>
                Output unit label
                <input
                  value={proposalOutcomeUnitLabel}
                  onChange={(event) => setProposalOutcomeUnitLabel(readFormControlValue(event))}
                />
              </label>
              <label>
                Reference alternative
                <input
                  value={proposalReferenceAlternative}
                  onChange={(event) => setProposalReferenceAlternative(readFormControlValue(event))}
                />
              </label>
              <label>
                Output unit definition
                <textarea
                  value={proposalOutcomeUnitDefinition}
                  onChange={(event) => setProposalOutcomeUnitDefinition(readFormControlValue(event))}
                />
              </label>
              <label>
                Measurement method
                <textarea
                  value={proposalMeasurementMethod}
                  onChange={(event) => setProposalMeasurementMethod(readFormControlValue(event))}
                />
              </label>
              <label>
                Uncertainty description
                <textarea
                  value={proposalUncertaintyDescription}
                  onChange={(event) => setProposalUncertaintyDescription(readFormControlValue(event))}
                />
              </label>
              <label>
                Expected effect vs funding
                <textarea
                  value={proposalExpectedEffectVsFunding}
                  onChange={(event) => setProposalExpectedEffectVsFunding(readFormControlValue(event))}
                />
              </label>
              <label>
                Timeline
                <textarea value={proposalTimeline} onChange={(event) => setProposalTimeline(readFormControlValue(event))} />
              </label>
              <label>
                Milestones
                <textarea value={proposalMilestones} onChange={(event) => setProposalMilestones(readFormControlValue(event))} />
              </label>
              <label>
                Risks
                <textarea value={proposalRisks} onChange={(event) => setProposalRisks(readFormControlValue(event))} />
              </label>
              <label>
                Misuse pathways
                <textarea value={proposalMisusePathways} onChange={(event) => setProposalMisusePathways(readFormControlValue(event))} />
              </label>
              <label>
                Proposed recipient
                <input value={proposalRecipientName} onChange={(event) => setProposalRecipientName(readFormControlValue(event))} />
              </label>
              <label>
                Implementing team
                <textarea
                  value={proposalImplementingTeam}
                  onChange={(event) => setProposalImplementingTeam(readFormControlValue(event))}
                />
              </label>
              <label>
                Destination type
                <select
                  value={proposalDestinationType}
                  onChange={(event) =>
                    setProposalDestinationType(readFormControlValue(event) as MpgfPublicGoodsDestinationType)
                  }
                >
                  <option value="external_charity">External charity</option>
                  <option value="fiscal_host">Fiscal host</option>
                  <option value="internal_demo_pool">Internal demo pool</option>
                  <option value="signed_sponsor_route">Signed sponsor route</option>
                </select>
              </label>
              <label>
                Destination reference
                <input
                  placeholder="Public charity, fiscal host, or signed sponsor route"
                  value={proposalDestinationRef}
                  onChange={(event) => setProposalDestinationRef(readFormControlValue(event))}
                />
              </label>
              {!proposalFailureBonusEnabled ? (
                <label>
                  Net recipient amount threshold
                  <span className="mpgf-money-input">
                    <span>$</span>
                    <input
                      inputMode="decimal"
                      type="text"
                      value={proposalThresholdDrafts[0]?.cumulativeNetRecipientDollars ?? ""}
                      onChange={(event) =>
                        updateProposalThresholdDraft(
                          proposalThresholdDrafts[0]?.thresholdId ?? "threshold-1",
                          { cumulativeNetRecipientDollars: readFormControlValue(event) },
                        )
                      }
                    />
                  </span>
                </label>
              ) : null}
              <label>
                Verified supporter minimum
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={proposalThresholdSupporters}
                  onChange={(event) => setProposalThresholdSupporters(readNumericFormControlValue(event))}
                />
              </label>
              <label className="checkbox-label">
                <input
                  checked={proposalFailureBonusEnabled}
                  type="checkbox"
                  onChange={(event) => setProposalFailureBonusEnabled(event.currentTarget.checked)}
                />
                <span>Offer a backed failure bonus and price success premiums for the common reserve</span>
              </label>
              {proposalFailureBonusEnabled ? (
                <FailureBonusThresholdEditor
                  drafts={proposalThresholdDrafts}
                  failureBonusRatePercent={proposalFailureBonusRatePercent}
                  maxParticipants={proposalFailureBonusMaxParticipants}
                  maxBonusPerParticipantDollars={proposalFailureBonusMaxPerParticipantDollars}
                  result={proposalThresholdEditorResult}
                  onFailureBonusRateChange={setProposalFailureBonusRatePercent}
                  onMaxParticipantsChange={setProposalFailureBonusMaxParticipants}
                  onMaxBonusPerParticipantChange={setProposalFailureBonusMaxPerParticipantDollars}
                  onThresholdChange={updateProposalThresholdDraft}
                  onAddThreshold={addProposalThresholdDraft}
                  onRemoveThreshold={removeProposalThresholdDraft}
                  onMoveThreshold={moveProposalThresholdDraft}
                />
              ) : null}
              <label>
                Assurance deadline
                <input
                  type="date"
                  value={proposalDeadlineAt}
                  onChange={(event) => setProposalDeadlineAt(readFormControlValue(event))}
                />
              </label>
              <label>
                Verification method
                <textarea
                  value={proposalVerificationMethod}
                  onChange={(event) => setProposalVerificationMethod(readFormControlValue(event))}
                />
              </label>
              <label>
                Anti-threat baseline rule
                <textarea
                  value={proposalBaselineRule}
                  onChange={(event) => setProposalBaselineRule(readFormControlValue(event))}
                />
              </label>
              <label>
                Exit rule
                <textarea value={proposalExitRule} onChange={(event) => setProposalExitRule(readFormControlValue(event))} />
              </label>
              <label>
                Base match ratio
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={proposalBaseMatchRatio}
                  onChange={(event) => setProposalBaseMatchRatio(readNumericFormControlValue(event))}
                />
              </label>
              <label>
                QF cap multiple
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={proposalQfCapMultiple}
                  onChange={(event) => setProposalQfCapMultiple(readNumericFormControlValue(event))}
                />
              </label>
              <label>
                Payout method
                <select
                  value={proposalPayoutMethod}
                  onChange={(event) => setProposalPayoutMethod(readFormControlValue(event) as MpgfPublicGoodsCaptureMode)}
                >
                  <option value="external_handoff">External handoff</option>
                  <option value="signed_intent">Signed intent</option>
                  <option value="stored_payment_method">Stored payment method</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  checked={proposalQfEnabled}
                  type="checkbox"
                  onChange={(event) => setProposalQfEnabled(event.currentTarget.checked)}
                />
                <span>Allow capped QF bonus after threshold and review gates</span>
              </label>
            </div>
            <div className="mpgf-inline-actions">
              <button
                className="button button-secondary"
                disabled={pendingAction === "proposal" || !poolReasoningComplete}
                type="button"
                onClick={() => savePoolProposal("draft")}
              >
                Save draft
              </button>
              <button
                className="button button-primary"
                disabled={pendingAction === "proposal" || !poolReasoningComplete}
                type="button"
                onClick={() => savePoolProposal("submitted")}
              >
                {viewerPresent ? "Submit proposal" : "Submit demo proposal"}
              </button>
            </div>
            <div className="mpgf-confirmation" role="status">
              {proposalConfirmation}
            </div>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Visible demo pools</p>
            <div className="mpgf-pool-list">
              {persistedState?.poolProposals.map((proposal) => (
                <article key={proposal.id} className="mpgf-pool-row">
                  <div>
                    <h3>{proposal.title}</h3>
                    <p>
                      {proposal.status.replaceAll("_", " ")}: {proposal.problem}
                    </p>
                    {proposal.outcomeUnitsSummary ? (
                      <p>Output unit: {proposal.outcomeUnitsSummary.split("\n")[0]?.replace(/^Unit: /, "")}</p>
                    ) : null}
                    {proposal.requestedMaximumFundingCents ? (
                      <p>Requested maximum: {formatUsd(proposal.requestedMaximumFundingCents)}</p>
                    ) : null}
                    {proposal.publicGoodsThresholdSchedule ? (
                      <div>
                        <p>
                          {proposal.publicGoodsThresholdSchedule.thresholds.length} cumulative assurance threshold{proposal.publicGoodsThresholdSchedule.thresholds.length === 1 ? "" : "s"} with {proposal.publicGoodsThresholdSupporters ?? "-"} verified supporters required.
                        </p>
                        <p>
                          Pool-wide failure bonus: {formatBasisPointsPercent(proposal.publicGoodsFailureBonusRateBps ?? 0)}; maximum {proposal.publicGoodsFailureBonusMaxParticipants ?? "-"} eligible participants and {formatUsd(proposal.publicGoodsFailureBonusMaxPerParticipantCents ?? 0)} per participant.
                        </p>
                        <ol className="mpgf-persisted-threshold-list">
                          {proposal.publicGoodsThresholdSchedule.thresholds.map((threshold) => (
                            <li key={threshold.thresholdId}>
                              Threshold {threshold.thresholdIndex}: {formatUsd(threshold.cumulativeNetRecipientThresholdCents)} net; {formatBasisPointsPercent(threshold.premiumRateBps)} tranche rate; {formatUsd(threshold.cumulativeSuccessPremiumCents)} cumulative premium; {formatUsd(threshold.grossSuccessRequirementCents)} gross.
                            </li>
                          ))}
                        </ol>
                        <p>
                          Schedule status: {proposal.publicGoodsFailureBonusScheduleStatus === "approved" ? "approved" : "provisional—operator approval required"}.
                        </p>
                      </div>
                    ) : proposal.publicGoodsThresholdAmountCents ? (
                      <p>
                        Assurance threshold: {formatUsd(proposal.publicGoodsThresholdAmountCents)} with{" "}
                        {proposal.publicGoodsThresholdSupporters ?? "-"} verified supporters.
                      </p>
                    ) : null}
                    {proposal.publicGoodsDestinationRef ? (
                      <p>
                        Destination: {proposal.publicGoodsDestinationType?.replaceAll("_", " ") ?? "public goods"} -{" "}
                        {proposal.publicGoodsDestinationRef}
                      </p>
                    ) : null}
                  </div>
                  <span className="mpgf-small">Saved</span>
                </article>
              ))}
              {demoAlternatives.map((alternative) => (
                <article key={alternative.id} className="mpgf-pool-row">
                  <div>
                    <h3>{alternative.shortName}</h3>
                    <p>{alternative.moralPublicGoodRationale}</p>
                  </div>
                  <Link className="inline-link" href={`/mpgf/pools/${alternative.id}`}>
                    View
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "ballot" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Bounded ballot</p>
            <h2>Set marginal-value weights</h2>
            <p>
              Weights are integer basis points. The demo normalizes the local ballot and combines it with
              fixture ballots before exact integer allocation.
            </p>
            <div className="mpgf-slider-list">
              {demoAlternatives.map((alternative) => (
                <label key={alternative.id}>
                  <span>
                    {alternative.shortName}
                    <strong>{weights[alternative.id] ?? 0} bps</strong>
                  </span>
                  <input
                    max="10000"
                    min="0"
                    step="100"
                    type="range"
                    value={weights[alternative.id] ?? 0}
                    onChange={(event) => updateWeight(alternative.id, readNumericFormControlValue(event))}
                  />
                  <input
                    aria-label={`${alternative.shortName} basis-point weight`}
                    max="10000"
                    min="0"
                    step="1"
                    type="number"
                    value={weights[alternative.id] ?? 0}
                    onChange={(event) => updateWeight(alternative.id, readNumericFormControlValue(event))}
                  />
                </label>
              ))}
            </div>
            <div className="mpgf-inline-actions">
              <button
                className="button button-secondary"
                disabled={pendingAction === "ballot"}
                type="button"
                onClick={saveBallotDraft}
              >
                Save draft
              </button>
              <button className="button button-primary" type="button" onClick={() => setBallotReviewOpen(true)}>
                Review ballot
              </button>
            </div>
            <p className="mpgf-small" role="status">
              {ballotConfirmation}
            </p>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Certified allocation preview</p>
            <h2>{formatUsd(allocation.allocatedCents)} allocated</h2>
            <div className="mpgf-allocation-bars">
              {allocation.lines.map((line) => (
                <div key={line.alternativeId} className="mpgf-allocation-row">
                  <div>
                    <span>{line.name}</span>
                    <strong>{formatUsd(line.allocationCents)}</strong>
                  </div>
                  <meter max={allocation.budgetCents} value={line.allocationCents} />
                </div>
              ))}
            </div>
            <p className="mpgf-small">
              Certificate: {allocation.certificate.algorithm}; tie break:{" "}
              {allocation.certificate.deterministicTieBreak.replaceAll("_", " ")}.
            </p>
            {ballotReviewOpen ? (
              <div className="mpgf-confirmation" role="status">
                Review complete: total local ballot weight{" "}
                {localBallot.weights.reduce((sum, weight) => sum + weight.valueBps, 0)} bps.
                <div className="mpgf-inline-actions">
                  <button
                    className="button button-primary"
                    disabled={pendingAction === "ballot"}
                    type="button"
                    onClick={submitBallotAfterReview}
                  >
                    {viewerPresent ? "Submit final ballot" : "Submit final demo ballot"}
                  </button>
                  <button className="button button-secondary" type="button" onClick={() => setBallotReviewOpen(false)}>
                    Keep editing
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeTab === "summary" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Public summary</p>
            <h2>Safe non-real-money summary</h2>
            <dl className="mpgf-summary-grid">
              <div>
                <dt>Demo budget</dt>
                <dd>{formatUsd(publicSummary.budgetCents)}</dd>
              </div>
              <div>
                <dt>Fixture pledges</dt>
                <dd>{formatUsd(getPledgedCents())}</dd>
              </div>
              <div>
                <dt>Released internally</dt>
                <dd>{formatUsd(publicSummary.releasedInternalCents)}</dd>
              </div>
              <div>
                <dt>Externally paid</dt>
                <dd>{formatUsd(publicSummary.externallyPaidCents)}</dd>
              </div>
            </dl>
            <p>{publicSummary.disclaimers.allocationDisbursementStatus}</p>
          </section>

          <section className="mpgf-panel">
            <p className="eyebrow">Required disclaimers</p>
            <ul className="mpgf-check-list">
              {Object.entries(publicSummary.disclaimers).map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}
