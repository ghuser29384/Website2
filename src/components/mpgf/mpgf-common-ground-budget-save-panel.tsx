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

export function MpgfCommonGroundBudgetSavePanel({
  activationState,
  apiPath,
  blockedReasonCount,
  participantConfirmationHash,
  payload,
  paymentCaptureAllowed,
  releaseGateRequirementBundleHash,
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
