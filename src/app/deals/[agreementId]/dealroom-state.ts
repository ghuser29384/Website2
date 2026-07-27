export interface LifecycleStage {
  label: string;
  reached: boolean;
}

export function formatDealroomState(value: string) {
  return value.replaceAll("_", " ");
}

export function buildLifecycleStages({
  agreementStatus,
  completionState,
  eventTypes,
  evidenceCount,
  hasRecordedTerms,
  reviewStatuses,
}: {
  agreementStatus: string;
  completionState: string;
  eventTypes: Set<string>;
  evidenceCount: number;
  hasRecordedTerms: boolean;
  reviewStatuses: Set<string>;
}): LifecycleStage[] {
  const activated = agreementStatus === "active" || agreementStatus === "completed";
  const complete = agreementStatus === "completed";
  const evidenceSubmitted =
    evidenceCount > 0 ||
    eventTypes.has("evidence_submitted") ||
    eventTypes.has("verification_submitted") ||
    completionState !== "pending_evidence";
  const reviewed =
    completionState === "reviewed_complete" ||
    reviewStatuses.has("reviewed_complete") ||
    reviewStatuses.has("closed") ||
    complete;

  return [
    { label: "Agreement opened", reached: true },
    {
      label: "Negotiating",
      reached:
        agreementStatus === "proposed" ||
        activated ||
        eventTypes.has("counterproposal"),
    },
    { label: "Terms recorded", reached: hasRecordedTerms || activated },
    { label: "Activated", reached: activated },
    { label: "In progress", reached: activated },
    { label: "Evidence submitted", reached: evidenceSubmitted || reviewed },
    { label: "Reviewed", reached: reviewed },
    { label: "Complete", reached: complete },
  ];
}

export function getLifecycleStageState(
  stages: LifecycleStage[],
  index: number,
): "complete" | "current" | "upcoming" {
  const highestReached = stages.reduce(
    (highest, stage, stageIndex) => (stage.reached ? stageIndex : highest),
    0,
  );
  const finalComplete = stages.at(-1)?.reached ?? false;

  if (index < highestReached || (finalComplete && index <= highestReached)) {
    return "complete";
  }

  if (index === highestReached) return "current";
  return "upcoming";
}
