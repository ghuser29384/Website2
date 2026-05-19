"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  createMpgfRealMoneyCheckoutAction,
  recordMpgfPledgesAction,
  saveMpgfBallotAction,
  saveMpgfPoolProposalAction,
  submitMpgfManualExternalPaymentEvidenceAction,
} from "@/app/mpgf/actions";
import { demoAlternatives, demoBallots, demoCycle, demoPledges, MPGF_COPY } from "@/lib/mpgf/data";
import {
  buildDemoBallotFromWeights,
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
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

type MpgfConsoleTab = "contribute" | "pools" | "ballot" | "summary";

interface MpgfConsoleProps {
  initialTab?: MpgfConsoleTab;
  participantState?: MpgfParticipantState;
  manualEvidenceReadiness?: MpgfManualEvidenceReadiness;
  realMoneyReadiness?: MpgfRealMoneyReadiness;
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

export function MpgfConsole({
  initialTab = "contribute",
  manualEvidenceReadiness,
  participantState,
  realMoneyReadiness,
  viewerPresent = false,
}: MpgfConsoleProps) {
  const [activeTab, setActiveTab] = useState<MpgfConsoleTab>(initialTab);
  const [persistedState, setPersistedState] = useState<MpgfParticipantState | undefined>(participantState);
  const [pendingAction, setPendingAction] = useState<"pledge" | "checkout" | "manualEvidence" | "proposal" | "ballot" | null>(null);
  const [oneTimePledge, setOneTimePledge] = useState(25);
  const [monthlyPledge, setMonthlyPledge] = useState(10);
  const [manualEvidenceAmount, setManualEvidenceAmount] = useState(25);
  const [manualEvidenceProvider, setManualEvidenceProvider] = useState<MpgfManualEvidenceProvider>("open_collective");
  const [manualEvidenceReference, setManualEvidenceReference] = useState("");
  const [manualEvidenceUrl, setManualEvidenceUrl] = useState("");
  const [manualEvidenceDescription, setManualEvidenceDescription] = useState("");
  const [manualEvidencePaidAt, setManualEvidencePaidAt] = useState("");
  const [pledgeIdempotencyKey, setPledgeIdempotencyKey] = useState(() => createClientMutationKey("mpgf.pledge"));
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
  const [proposalTitle, setProposalTitle] = useState("Community public-goods evaluation reserve");
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
  const [proposalConfirmation, setProposalConfirmation] = useState(
    "Complete the pool reasoning fields before saving or submitting. This route performs no live authorization, payout, or real-money accounting.",
  );
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps])),
  );
  const [ballotConfirmation, setBallotConfirmation] = useState("No demo ballot draft saved yet.");
  const [ballotReviewOpen, setBallotReviewOpen] = useState(false);
  const [realMoneyMessage, setRealMoneyMessage] = useState(
    realMoneyReadiness?.ready
      ? "Real-money Stripe Checkout is available after terms acceptance."
      : "Integrated checkout is planned for a later provider-approved phase.",
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
  const ledgerBalanced = ledgerTransactions.every(isLedgerBalanced);

  function updateWeight(alternativeId: string, value: number) {
    setWeights((current) => ({
      ...current,
      [alternativeId]: value,
    }));
  }

  const participantPledgeCount = persistedState?.pledges.length ?? 0;
  const participantCommitmentCount = persistedState?.recurringCommitments.length ?? 0;
  const participantProposalCount = persistedState?.poolProposals.length ?? 0;
  const participantBallotCount = persistedState?.ballots.length ?? 0;
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
  ].every((value) => value.trim()) &&
    proposalRequestedMaximumFunding > 0 &&
    proposalMinimumViableFunding >= 0 &&
    proposalMinimumViableFunding <= proposalRequestedMaximumFunding &&
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
        "Complete the pool reasoning fields before saving or submitting: funding, output unit, effect reasoning, timeline, milestones, risks, misuse pathways, and recipient or implementing team.",
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
      <div className="mpgf-console-toolbar" role="tablist" aria-label="MPGF workflow">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className="mpgf-tab"
            role="tab"
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="mpgf-small" role="status">
        {persistenceLabel} Account records: {participantPledgeCount} pledges, {participantCommitmentCount} monthly
        commitments, {participantProposalCount} proposals, {participantBallotCount} ballots.
      </p>

      {activeTab === "contribute" ? (
        <div className="mpgf-workflow-grid">
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

          <section className="mpgf-panel mpgf-panel-primary">
            <p className="eyebrow">Manual evidence</p>
            <h2>Record external payment evidence</h2>
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
            <p className="eyebrow">Real-money checkout</p>
            <h2>Contribute with Stripe</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <div className="mpgf-confirmation" role="status">
              {realMoneyReadiness?.ready
                ? "All configured real-money acceptance gates are passed."
                : "Integrated checkout is planned for a later provider-approved phase."}
            </div>
            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={
                  !viewerPresent ||
                  !realMoneyReadiness?.ready ||
                  pendingAction === "checkout" ||
                  !Number.isFinite(oneTimePledge) ||
                  oneTimePledge < 1
                }
                type="button"
                onClick={() => startRealMoneyCheckout("one_time")}
              >
                Contribute once
              </button>
              <button
                className="button button-secondary"
                disabled={
                  !viewerPresent ||
                  !realMoneyReadiness?.ready ||
                  pendingAction === "checkout" ||
                  !Number.isFinite(monthlyPledge) ||
                  monthlyPledge < 1
                }
                type="button"
                onClick={() => startRealMoneyCheckout("monthly")}
              >
                Start monthly
              </button>
            </div>
            <p className="mpgf-small" role="status">
              {realMoneyMessage}
            </p>
            {!viewerPresent ? (
              <Link className="inline-link" href="/login?returnTo=/mpgf/contribute">
                Sign in before creating a Stripe Checkout session.
              </Link>
            ) : null}
            <Link className="inline-link" href="/mpgf/real-money-terms">
              Review real-money terms and refund policy
            </Link>
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
        </div>
      ) : null}

      {activeTab === "pools" ? (
        <div className="mpgf-workflow-grid">
          <section className="mpgf-panel">
            <p className="eyebrow">Pool reasoning</p>
            <h2>Draft a candidate pool reasoning</h2>
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
