"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SupportSignalType = "strong_support" | "weak_common_ground_support" | "dissent_review_requested";
type MoralCluster = "humanitarian" | "longtermist" | "animal_inclusive" | "institutional_pluralist";

interface SupportSignalOption {
  value: SupportSignalType;
  label: string;
  description: string;
  defaultStrengthBps: number;
}

interface MoralClusterOption {
  value: MoralCluster;
  label: string;
  description: string;
}

interface CollectiveActionState {
  value: string;
  label: string;
  description: string;
}

interface MpgfSupportSignalPanelProps {
  campaignId: string;
  campaignTitle: string;
  cgVqafReportPath: string;
  commonGroundScoreBps: number;
  dissentSignalCount: number;
  initialState: string;
  moralClusterCount: number;
  moralClusterOptions: readonly MoralClusterOption[];
  roundId: string;
  signalOptions: readonly SupportSignalOption[];
  stateSteps: readonly CollectiveActionState[];
  supportSignalPath: string;
  viewerPresent: boolean;
  weakCommonGroundSignalCount: number;
}

interface SupportSignalResponse {
  ok?: boolean;
  currentState?: string;
  error?: string;
  persistence?: {
    status?: string;
  };
  supportSignal?: {
    id: string;
    signalType: SupportSignalType;
    countsForCommonGround: boolean;
  };
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function persistenceLabel(value: string | undefined) {
  if (value === "inserted") {
    return "recorded";
  }

  if (value === "already_recorded") {
    return "already recorded";
  }

  if (value === "not_configured") {
    return "validated";
  }

  return statusLabel(value ?? "received");
}

export function MpgfSupportSignalPanel({
  campaignId,
  campaignTitle,
  cgVqafReportPath,
  commonGroundScoreBps,
  dissentSignalCount,
  initialState,
  moralClusterCount,
  moralClusterOptions,
  roundId,
  signalOptions,
  stateSteps,
  supportSignalPath,
  viewerPresent,
  weakCommonGroundSignalCount,
}: MpgfSupportSignalPanelProps) {
  const [selectedCluster, setSelectedCluster] = useState<MoralCluster>(moralClusterOptions[0]?.value ?? "humanitarian");
  const [selectedSignal, setSelectedSignal] = useState<SupportSignalType>(
    signalOptions[1]?.value ?? "weak_common_ground_support",
  );
  const [pending, setPending] = useState(false);
  const [currentState, setCurrentState] = useState(initialState);
  const [statusMessage, setStatusMessage] = useState(
    viewerPresent
      ? "Private by default; public output is aggregate only."
      : "Sign in to record a private support or dissent signal.",
  );
  const selectedSignalOption = useMemo(
    () => signalOptions.find((option) => option.value === selectedSignal) ?? signalOptions[0],
    [selectedSignal, signalOptions],
  );
  const scorePercent = Math.round(commonGroundScoreBps / 100);

  async function submitSignal(signalType: SupportSignalType) {
    const option = signalOptions.find((candidate) => candidate.value === signalType);

    setSelectedSignal(signalType);

    if (!viewerPresent) {
      setStatusMessage("Sign in before recording an MPGF support signal.");
      return;
    }

    setPending(true);
    setStatusMessage("Recording private support signal.");

    try {
      const response = await fetch(supportSignalPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId,
          moralCluster: selectedCluster,
          signalType,
          strengthBps: option?.defaultStrengthBps,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as SupportSignalResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Could not record MPGF support signal.");
      }

      setCurrentState(initialState === "signal_only" ? result.currentState ?? "signal_only" : initialState);
      setStatusMessage(
        `${option?.label ?? "Support signal"} ${persistenceLabel(result.persistence?.status)} for ${campaignTitle}.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not record MPGF support signal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mpgf-support-signal-panel" aria-label={`${campaignTitle} common-ground support`}>
      <div className="mpgf-support-signal-header">
        <div>
          <p className="eyebrow">Common-ground discovery</p>
          <h4>Private support signal</h4>
        </div>
        <Link className="text-button" href={cgVqafReportPath}>
          CG-VQAF report
        </Link>
      </div>

      <dl className="mpgf-signal-stats">
        <div>
          <dt>Common-ground score</dt>
          <dd>{scorePercent}%</dd>
        </div>
        <div>
          <dt>Weak support</dt>
          <dd>{weakCommonGroundSignalCount}</dd>
        </div>
        <div>
          <dt>Moral clusters</dt>
          <dd>{moralClusterCount}</dd>
        </div>
        <div>
          <dt>Dissent signals</dt>
          <dd>{dissentSignalCount}</dd>
        </div>
      </dl>

      <label className="mpgf-signal-cluster">
        Moral cluster
        <select
          value={selectedCluster}
          onChange={(event) => setSelectedCluster(event.currentTarget.value as MoralCluster)}
        >
          {moralClusterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mpgf-signal-buttons" role="group" aria-label="Record support signal">
        {signalOptions.map((option) => (
          <button
            aria-pressed={selectedSignal === option.value}
            className="mpgf-signal-button"
            disabled={pending || !viewerPresent}
            key={option.value}
            type="button"
            onClick={() => submitSignal(option.value)}
          >
            <span>{option.label}</span>
            <small>{option.description}</small>
          </button>
        ))}
      </div>

      <div className="mpgf-state-rail" aria-label={`Round workflow for ${campaignTitle}`}>
        {stateSteps.map((step) => (
          <span
            aria-current={currentState === step.value ? "step" : undefined}
            className="mpgf-state-pill"
            key={`${roundId}-${campaignId}-${step.value}`}
            title={step.description}
          >
            {step.label}
          </span>
        ))}
      </div>

      <p className="mpgf-small" aria-live="polite">
        {statusMessage} Selected signal: {selectedSignalOption?.label ?? statusLabel(selectedSignal)}.
      </p>
      {!viewerPresent ? (
        <Link className="button button-secondary" href={`/login?returnTo=/mpgf/rounds/${roundId}`}>
          Sign in to record signal
        </Link>
      ) : null}
    </div>
  );
}
