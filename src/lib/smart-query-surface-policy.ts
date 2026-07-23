import type {
  SmartQueryInterpretation,
  SmartQueryIntent,
  SmartQuerySurface,
} from "./smart-query";

interface SurfacePolicyDecision {
  reason: string;
  target: SmartQueryIntent;
}

function hasMoneyOrDeadline(query: SmartQueryInterpretation) {
  const facets = query.facets;
  return Boolean(
    facets.minAmountCents !== null ||
      facets.maxAmountCents !== null ||
      facets.deadlineBefore ||
      facets.deadlineAfter,
  );
}

function unsupportedDecision(
  query: SmartQueryInterpretation,
): SurfacePolicyDecision | null {
  const facets = query.facets;
  const surface = query.surface;

  if (surface === "global") return null;

  if (surface === "discover") {
    if (facets.poolKinds.length) {
      return { reason: "moral-public-good pool type", target: "mpgf_pools" };
    }
    if (facets.evidenceStates.length) {
      return { reason: "evidence-review state", target: "evidence" };
    }
    if (
      facets.participantKinds.length ||
      facets.openToPayment !== null ||
      facets.openToPledges !== null ||
      facets.minCredit !== null ||
      facets.location
    ) {
      return { reason: "participant-profile constraints", target: "people" };
    }
    if (facets.minAmountCents !== null || facets.deadlineAfter) {
      return { reason: "minimum budget or start-date constraints", target: "offers" };
    }
    return null;
  }

  if (surface === "offers") {
    if (facets.actionTypes.includes("pool") || facets.poolKinds.length) {
      return { reason: "pool constraints", target: "pools" };
    }
    if (facets.evidenceStates.length) {
      return { reason: "evidence-review state", target: "evidence" };
    }
    if (
      facets.participantKinds.length ||
      facets.openToPayment !== null ||
      facets.openToPledges !== null ||
      facets.location
    ) {
      return { reason: "participant-profile constraints", target: "people" };
    }
    return null;
  }

  if (surface === "people") {
    if (facets.poolKinds.length || facets.actionTypes.includes("pool")) {
      return { reason: "pool constraints", target: "pools" };
    }
    if (facets.evidenceStates.length) {
      return { reason: "evidence-review state", target: "evidence" };
    }
    if (hasMoneyOrDeadline(query) || facets.actionTypes.length) {
      return { reason: "offer budget, deadline, or action constraints", target: "offers" };
    }
    return null;
  }

  if (surface === "wishes") {
    if (facets.poolKinds.length || facets.actionTypes.includes("pool")) {
      return { reason: "pool constraints", target: "pools" };
    }
    if (facets.evidenceStates.length) {
      return { reason: "evidence-review state", target: "evidence" };
    }
    if (facets.verified !== null || facets.minCredit !== null) {
      return { reason: "reviewed-evidence or credit constraints", target: "people" };
    }
    if (hasMoneyOrDeadline(query) || facets.actionTypes.length) {
      return { reason: "offer budget, deadline, or action constraints", target: "offers" };
    }
    return null;
  }

  if (surface === "evidence") {
    if (facets.poolKinds.length || facets.actionTypes.includes("pool")) {
      return { reason: "pool constraints", target: "pools" };
    }
    if (
      facets.participantKinds.length ||
      facets.openToPayment !== null ||
      facets.openToPledges !== null ||
      facets.minCredit !== null ||
      facets.location
    ) {
      return { reason: "participant-profile constraints", target: "people" };
    }
    if (hasMoneyOrDeadline(query) || facets.actionTypes.length) {
      return { reason: "offer budget, deadline, or action constraints", target: "offers" };
    }
    return null;
  }

  if (surface === "pools") {
    if (facets.poolKinds.length) {
      return { reason: "moral-public-good pool type", target: "mpgf_pools" };
    }
    if (facets.evidenceStates.length) {
      return { reason: "evidence-review state", target: "evidence" };
    }
    if (
      facets.participantKinds.length ||
      facets.openToPayment !== null ||
      facets.openToPledges !== null ||
      facets.minCredit !== null ||
      facets.location
    ) {
      return { reason: "participant-profile constraints", target: "people" };
    }
    return null;
  }

  if (surface === "mpgf_pools") {
    if (facets.evidenceStates.length) {
      return { reason: "evidence-review state", target: "evidence" };
    }
    if (
      facets.participantKinds.length ||
      facets.openToPayment !== null ||
      facets.openToPledges !== null ||
      facets.minCredit !== null ||
      facets.location
    ) {
      return { reason: "participant-profile constraints", target: "people" };
    }
    if (facets.actionTypes.some((type) => type !== "pool")) {
      return { reason: "bilateral offer action constraints", target: "offers" };
    }
  }

  return null;
}

function targetLabel(target: SmartQueryIntent) {
  switch (target) {
    case "offers":
      return "live offers";
    case "people":
      return "public people";
    case "wishes":
      return "broad wish previews";
    case "evidence":
      return "public evidence";
    case "pools":
      return "funding pools";
    case "mpgf_pools":
      return "moral public-good pools";
    default:
      return "the matching directory";
  }
}

export function applySmartQuerySurfacePolicy(
  interpretation: SmartQueryInterpretation,
): SmartQueryInterpretation {
  if (interpretation.needsClarification) return interpretation;
  const decision = unsupportedDecision(interpretation);
  if (!decision) return interpretation;

  const label = targetLabel(decision.target);
  return {
    ...interpretation,
    confidence: Math.min(interpretation.confidence, 0.78),
    needsClarification: true,
    clarification: {
      field: "route",
      question: `This directory does not expose ${decision.reason}. Search ${label} instead?`,
      options: [`Search ${label}`],
    },
    reasonCodes: [
      ...new Set([
        ...interpretation.reasonCodes,
        `surface_cannot_support_${decision.reason.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
        `suggest_${decision.target}`,
      ]),
    ],
  };
}

export function smartQuerySurfaceFromClarification(
  currentSurface: SmartQuerySurface,
  field: string | undefined,
  answer: string | undefined,
): SmartQuerySurface {
  if (field !== "route" || !answer) return currentSurface;
  const normalized = answer.toLowerCase();
  if (normalized.includes("live offers")) return "offers";
  if (normalized.includes("public people")) return "people";
  if (normalized.includes("wish")) return "wishes";
  if (normalized.includes("evidence")) return "evidence";
  if (normalized.includes("moral public-good")) return "mpgf_pools";
  if (normalized.includes("funding pools")) return "pools";
  return currentSurface;
}
