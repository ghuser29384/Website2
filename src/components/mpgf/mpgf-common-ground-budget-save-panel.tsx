"use client";

import { useState } from "react";

import {
  MPGF_CRECM_PLAIN_LANGUAGE_LABELS,
  getMpgfCrecPlainLanguageLabelForStance,
  type MpgfCrecGuidedStance,
} from "@/lib/mpgf/public-goods-crecm-labels";

type BudgetPeriod = "monthly" | "round_limited";
type BaselineConfidence = "low" | "medium" | "high";
type FallbackRule = "carry_forward" | "reroute" | "release_hold";
type NextCaptureRule = "none_before_final_review" | "monthly_after_final_review" | "manual_review_required";
type UnroutableBudgetPolicy = "carry_forward" | "release_hold" | "manual_review";
type SupportStance = MpgfCrecGuidedStance;

interface CommonGroundBudgetStancePayload {
  acceptableCounterBucketIds: string[];
  campaignId: string;
  conditionAccepted: boolean;
  stance: SupportStance;
  maxAllocCents: number;
  maxAllocPctBps: number;
  minCounterpartyVolumeCents: number;
  rankOrder: number;
  redactedNote?: string;
}

export interface CommonGroundBudgetSavePayload {
  baselineConfidenceLevel: BaselineConfidence;
  baselineConfidenceRationale: string;
  budgetPeriod: BudgetPeriod;
  defaultAllocationBaseline: string;
  fallbackRule: FallbackRule;
  monthlyBudgetCents: number;
  nextCaptureAt: string | null;
  nextCaptureRule: NextCaptureRule;
  participantSurplusConfirmed: boolean;
  perProjectCapCents: number;
  roundBudgetCents: number;
  savePreview: true;
  settlementCurrency: "usd";
  stances: CommonGroundBudgetStancePayload[];
  unroutableBudgetPolicy: UnroutableBudgetPolicy;
}

interface CommonGroundBudgetSavePanelProps {
  activationState: string;
  apiPath: string;
  blockedReasonCount: number;
  participantConfirmationHash: string | null;
  payload: CommonGroundBudgetSavePayload;
  paymentCaptureAllowed: false;
  projectReviewRows: CommonGroundBudgetReviewProject[];
  releaseGateRequirementBundleHash: string;
  rulebookHash: string;
  sourceSpec: string;
  technicalLabel: string;
  termsSnapshotHash: string;
}

interface CommonGroundBudgetSaveResponse {
  ok?: boolean;
  error?: string;
  participantConfirmationHash?: string | null;
  persistence?: {
    message?: string;
    savedBudgetId?: string | null;
    savedConditionalIntentCount?: number;
    savedStanceCount?: number;
    status?: string;
    stateMutation?: string;
  };
}

interface CommonGroundBudgetReviewProject {
  acceptableCounterBucketIds: string[];
  campaignId: string;
  conditionAccepted: boolean;
  maxAllocCents: number;
  minCounterpartyVolumeCents: number;
  rankOrder: number;
  redactedNote?: string;
  stance: SupportStance;
  title: string;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

function stanceLabel(value: SupportStance) {
  return getMpgfCrecPlainLanguageLabelForStance(value);
}

function fallbackLabel(value: FallbackRule) {
  switch (value) {
    case "carry_forward":
      return "carry forward";
    case "reroute":
      return "try another approved project";
    case "release_hold":
      return "cancel authorization or release hold if applicable";
  }
}

function budgetPeriodLabel(value: BudgetPeriod) {
  return value === "monthly" ? "monthly" : "one-time";
}

function nextCaptureRuleLabel(value: NextCaptureRule) {
  switch (value) {
    case "monthly_after_final_review":
      return "monthly after final review";
    case "manual_review_required":
      return "manual review required";
    case "none_before_final_review":
      return "none before final review";
  }
}

export function MpgfCommonGroundBudgetSavePanel({
  activationState,
  apiPath,
  blockedReasonCount,
  participantConfirmationHash,
  payload,
  paymentCaptureAllowed,
  projectReviewRows,
  releaseGateRequirementBundleHash,
  rulebookHash,
  sourceSpec,
  technicalLabel,
  termsSnapshotHash,
}: CommonGroundBudgetSavePanelProps) {
  const canSave =
    activationState === "ready_for_confirmation" &&
    blockedReasonCount === 0 &&
    Boolean(participantConfirmationHash) &&
    !paymentCaptureAllowed;
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    canSave
      ? "Ready to save this no-capture budget preview."
      : "Preview must be confirmed and non-blocking before it can be saved.",
  );
  const [savedBudgetId, setSavedBudgetId] = useState<string | null>(null);
  const maximumBudgetCents =
    payload.budgetPeriod === "monthly" ? payload.monthlyBudgetCents : payload.roundBudgetCents;
  const projectRows =
    projectReviewRows.length > 0
      ? projectReviewRows
      : payload.stances.map((stance) => ({
          acceptableCounterBucketIds: stance.acceptableCounterBucketIds,
          campaignId: stance.campaignId,
          conditionAccepted: stance.conditionAccepted,
          maxAllocCents: stance.maxAllocCents,
          minCounterpartyVolumeCents: stance.minCounterpartyVolumeCents,
          rankOrder: stance.rankOrder,
          redactedNote: stance.redactedNote,
          stance: stance.stance,
          title: stance.campaignId,
        }));

  async function saveBudgetPreview() {
    if (!canSave) {
      setStatusMessage("Preview is not ready to save. Confirm surplus terms and resolve blockers first.");
      return;
    }

    setPending(true);
    setStatusMessage("Saving no-capture Common Ground Budget.");

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as CommonGroundBudgetSaveResponse;

      if (!response.ok || result.ok === false || result.persistence?.status === "failed_closed") {
        throw new Error(result.error ?? result.persistence?.message ?? "Could not save budget preview.");
      }

      setSavedBudgetId(result.persistence?.savedBudgetId ?? null);
      setStatusMessage(
        result.persistence?.status === "saved_no_capture"
          ? `Saved ${result.persistence.savedStanceCount ?? 0} private stance(s) and ${
              result.persistence.savedConditionalIntentCount ?? 0
            } explicit conditional-intent setup record(s). No payment capture was authorized.`
          : result.persistence?.message ?? "Preview returned without saving.",
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save budget preview.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="notice-card" aria-label="Save Common Ground Budget preview">
      <strong>Save no-capture budget preview</strong>
      <p>
        This saves your frozen baseline, eligible-set hash, fallback rule, participant confirmation,
        and private project stances. It still does not authorize payment capture.
      </p>
      <section aria-label="Final review consent boundary">
        <h3>Review your Common Ground Budget</h3>
        <p>
          This review screen is the consent boundary. Hidden defaults, suggestions, project-card
          text, status chips, emails, or calculator outputs that are not shown here cannot become
          binding.
        </p>
        <dl className="mpgf-summary-grid" aria-label="Common Ground Budget final review summary">
          <div>
            <dt>{MPGF_CRECM_PLAIN_LANGUAGE_LABELS.maximumThisRound}</dt>
            <dd>{formatCents(maximumBudgetCents)}</dd>
          </div>
          <div>
            <dt>Per-project cap</dt>
            <dd>{formatCents(payload.perProjectCapCents)}</dd>
          </div>
          <div>
            <dt>Next capture rule</dt>
            <dd>
              {nextCaptureRuleLabel(payload.nextCaptureRule)}
              {payload.nextCaptureAt ? ` at ${payload.nextCaptureAt}` : ""}
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>Saved method required for final clearing; no charge or hold now.</dd>
          </div>
          <div>
            <dt>If something does not clear</dt>
            <dd>{fallbackLabel(payload.fallbackRule)}</dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>Project stances and review notes stay participant/reviewer-only; public output is aggregate only.</dd>
          </div>
          <div>
            <dt>Sealed progress</dt>
            <dd>Exact live threshold and counterparty gaps hidden until close.</dd>
          </div>
        </dl>
        <div aria-label="Common Ground Budget project review">
          <h4>Projects</h4>
          <ul>
            {projectRows.map((project) => (
              <li key={`review-${project.campaignId}`}>
                {project.title}: {stanceLabel(project.stance)} / canonical {project.stance},{" "}
                {project.stance === "dissent" || project.stance === "abstain"
                  ? "allocation $0"
                  : `max ${formatCents(project.maxAllocCents)}, ${
                      project.conditionAccepted ? "condition accepted" : "condition still missing"
                    }`}, priority{" "}
                {project.rankOrder}. Private review note:{" "}
                {project.redactedNote ? `${project.redactedNote} (reviewer-only)` : "none"}
              </li>
            ))}
          </ul>
        </div>
        <div aria-label="Common Ground Budget settlement preview">
          <h4>What you may see after settlement</h4>
          <ul>
            <li>Charged from you: gross captured amount, if any.</li>
            <li>{MPGF_CRECM_PLAIN_LANGUAGE_LABELS.sentToProject}: net recipient-disbursed public-good dollars.</li>
            <li>{MPGF_CRECM_PLAIN_LANGUAGE_LABELS.countsForMatching}: counted and match-eligible dollars.</li>
            <li>{MPGF_CRECM_PLAIN_LANGUAGE_LABELS.sponsorAdded}: base match and capped bonus, if backed and eligible.</li>
            <li>
              {MPGF_CRECM_PLAIN_LANGUAGE_LABELS.contributorBenefit}: success reward / coordination credit / impact
              certificate, if eligible.
            </li>
            <li>Failed projects: refund, reroute, carry-forward, or cancellation according to your fallback.</li>
          </ul>
        </div>
        <details>
          <summary>Required details</summary>
          <p>
            Suggested defaults are not binding unless shown on this review screen and explicitly
            saved. This save records a no-capture preview only; later authorization, capture, reward,
            credit, certificate, reroute, or release requires the recorded CRECM state to pass.
          </p>
          <dl className="mpgf-summary-grid" aria-label="Common Ground Budget final review required details">
            <div>
              <dt>Binding caps</dt>
              <dd>
                {budgetPeriodLabel(payload.budgetPeriod)} cap {formatCents(maximumBudgetCents)};
                per-project cap {formatCents(payload.perProjectCapCents)}; per-project caps are
                recorded in cents and basis points.
              </dd>
            </div>
            <div>
              <dt>Next capture</dt>
              <dd>
                {nextCaptureRuleLabel(payload.nextCaptureRule)}
                {payload.nextCaptureAt ? ` at ${payload.nextCaptureAt}` : ""}; no capture happens
                before final review and the recorded rule passes.
              </dd>
            </div>
            <div>
              <dt>Cross-view conditions</dt>
              <dd>
                Strong and weak stances map to canonical ConditionalTradeIntent records only after
                condition acceptance. Minimum verified counterparty volume is shown for each selected
                project.
              </dd>
            </div>
            <div>
              <dt>Counterpart buckets</dt>
              <dd>
                {projectRows
                  .filter((project) => project.stance === "strong" || project.stance === "weak")
                  .map((project) =>
                    `${project.title}: ${formatCents(project.minCounterpartyVolumeCents)} from ${project.acceptableCounterBucketIds.join(", ")}`,
                  )
                  .join("; ") || "No allocatable project condition selected."}
              </dd>
            </div>
            <div>
              <dt>Fallback rule</dt>
              <dd>
                {payload.fallbackRule.replaceAll("_", " ")}; unroutable budget policy{" "}
                {payload.unroutableBudgetPolicy.replaceAll("_", " ")}.
              </dd>
            </div>
            <div>
              <dt>Payment language</dt>
              <dd>
                No charge now; saved payment methods or JIT authorizations are not escrow, custody,
                funds held, or payment protection.
              </dd>
            </div>
            <div>
              <dt>Fee treatment</dt>
              <dd>Gross, fee, net recipient, actual, counted, and match-eligible cents remain separate.</dd>
            </div>
            <div>
              <dt>Reward, credit, and certificate opt-ins</dt>
              <dd>
                Success-reward, coordination-credit, and impact-certificate opt-ins are off unless
                explicitly selected, require captured successful contribution rows, cannot be
                retroactively obtained by non-signers or late signers, and never count as
                public-good dollars or allocation power.
              </dd>
            </div>
            <div>
              <dt>Self-matching exclusions</dt>
              <dd>
                Same participant, linked account, same payment method, and same-control support
                cannot satisfy counterparty conditions.
              </dd>
            </div>
            <div>
              <dt>Sealed-progress behavior</dt>
              <dd>Exact live threshold, counterparty-volume, and success-without-me progress stays sealed before close.</dd>
            </div>
            <div>
              <dt>Failure-bonus denial categories</dt>
              <dd>
                Denied for review-not-approved, challenge-blocked, anti-threat, destination,
                project-identity/destination-route, externality, conflict, sponsor, rulebook,
                legal/custody, identity, sybil, collusion, authorization, and user-consent
                failures.
              </dd>
            </div>
            <div>
              <dt>Rulebook hash</dt>
              <dd>{rulebookHash.slice(0, 19)}...</dd>
            </div>
            <div>
              <dt>Plain labels</dt>
              <dd>
                {projectRows.map((project) => `${project.title}: ${stanceLabel(project.stance)}`).join("; ") ||
                  "No project stances selected."}
              </dd>
            </div>
          </dl>
        </details>
        <p className="mpgf-small">
          Source: {sourceSpec}; mechanism: {technicalLabel}.
        </p>
      </section>
      <dl className="mpgf-summary-grid">
        <div>
          <dt>Terms snapshot</dt>
          <dd>{termsSnapshotHash.slice(0, 19)}...</dd>
        </div>
        <div>
          <dt>Participant confirmation</dt>
          <dd>{participantConfirmationHash ? `${participantConfirmationHash.slice(0, 19)}...` : "required"}</dd>
        </div>
        <div>
          <dt>Gate bundle</dt>
          <dd>{releaseGateRequirementBundleHash.slice(0, 19)}...</dd>
        </div>
        <div>
          <dt>Save state</dt>
          <dd>{savedBudgetId ? "saved" : statusLabel(activationState)}</dd>
        </div>
      </dl>
      <div className="mpgf-admin-action-grid">
        <button className="button button-primary" disabled={!canSave || pending} type="button" onClick={saveBudgetPreview}>
          {pending ? "Saving Common Ground Budget" : "Save Common Ground Budget"}
        </button>
      </div>
      <p className="mpgf-small" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
