"use client";

import { useState } from "react";

type BudgetPeriod = "monthly" | "round_limited";
type BaselineConfidence = "low" | "medium" | "high";
type FallbackRule = "carry_forward" | "reroute" | "release_hold";
type UnroutableBudgetPolicy = "carry_forward" | "release_hold" | "manual_review";
type SupportStance = "strong" | "weak" | "dissent" | "abstain";

interface CommonGroundBudgetStancePayload {
  campaignId: string;
  stance: SupportStance;
  maxAllocCents: number;
  maxAllocPctBps: number;
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
  participantSurplusConfirmed: boolean;
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
    savedStanceCount?: number;
    status?: string;
    stateMutation?: string;
  };
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
  switch (value) {
    case "strong":
      return "Fund this";
    case "weak":
      return "Fund if different-view support joins";
    case "dissent":
      return "Needs review";
    case "abstain":
      return "Skip";
  }
}

export function MpgfCommonGroundBudgetSavePanel({
  activationState,
  apiPath,
  blockedReasonCount,
  participantConfirmationHash,
  payload,
  paymentCaptureAllowed,
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
  const stanceSummary = payload.stances
    .map((stance) => `${stance.campaignId}: ${stanceLabel(stance.stance)}`)
    .join("; ");

  async function saveBudgetPreview() {
    if (!canSave) {
      setStatusMessage("Preview is not ready to save. Confirm surplus terms and resolve blockers first.");
      return;
    }

    setPending(true);
    setStatusMessage("Saving no-capture Common Ground Budget preview.");

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
          ? `Saved ${result.persistence.savedStanceCount ?? 0} private stance(s). No payment capture was authorized.`
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
        <h3>Final review consent boundary</h3>
        <p>
          Suggested defaults are not binding unless shown on this review screen and explicitly
          saved. This save records a no-capture preview only; later authorization, capture, reward,
          credit, certificate, reroute, or release requires the recorded CRECM state to pass.
        </p>
        <dl className="mpgf-summary-grid" aria-label="Common Ground Budget final review checklist">
          <div>
            <dt>Binding caps</dt>
            <dd>
              {payload.budgetPeriod.replaceAll("_", " ")} cap {formatCents(maximumBudgetCents)};
              per-project caps are recorded in cents and basis points.
            </dd>
          </div>
          <div>
            <dt>Cross-view conditions</dt>
            <dd>Strong and weak stances map to canonical records; weak support clears only with different-view support.</dd>
          </div>
          <div>
            <dt>Counterpart buckets</dt>
            <dd>Counterpart-bucket eligibility uses the frozen eligible-set hash and canonical CRECM rules.</dd>
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
            <dd>No charge now; saved payment methods or JIT authorizations are not escrow, custody, funds held, or payment protection.</dd>
          </div>
          <div>
            <dt>Fee treatment</dt>
            <dd>Gross, fee, net recipient, actual, counted, and match-eligible cents remain separate.</dd>
          </div>
          <div>
            <dt>Reward, credit, and certificate opt-ins</dt>
            <dd>Contributor-only benefits stay separate and never count as public-good dollars or allocation power.</dd>
          </div>
          <div>
            <dt>Self-matching exclusions</dt>
            <dd>Same participant, linked account, same payment method, and same-control support cannot satisfy counterparty conditions.</dd>
          </div>
          <div>
            <dt>Sealed-progress behavior</dt>
            <dd>Exact live threshold, counterparty-volume, and success-without-me progress stays sealed before close.</dd>
          </div>
          <div>
            <dt>Failure-bonus denial categories</dt>
            <dd>Denied for rulebook, legal/custody, identity, sybil, collusion, authorization, consent, conflict, and review failures.</dd>
          </div>
          <div>
            <dt>Rulebook hash</dt>
            <dd>{rulebookHash.slice(0, 19)}...</dd>
          </div>
          <div>
            <dt>Plain labels</dt>
            <dd>{stanceSummary || "No project stances selected."}</dd>
          </div>
        </dl>
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
          {pending ? "Saving preview" : "Save budget preview"}
        </button>
      </div>
      <p className="mpgf-small" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
