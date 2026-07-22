import type {
  ComposedLiveRoute,
  FeasibleLiveRouteStep,
  RouteActiveComparisonSide,
  RoutePlannerResult,
} from "./route-recommendations";

export type PresentedRoutePlannerStatus =
  | "incomplete"
  | "no_live"
  | "ready"
  | "signed_out"
  | "unavailable";

function presentationStatus(status: RoutePlannerResult["status"]): PresentedRoutePlannerStatus {
  if (status === "ready") return "ready";
  if (status === "no_live_routes") return "no_live";
  return "incomplete";
}

function comparisonDetail(step: RouteActiveComparisonSide) {
  const parts: string[] = [];
  if (step.burden.moneyCents > 0) {
    parts.push(
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(step.burden.moneyCents / 100),
    );
  }
  if (step.burden.timeMinutes > 0) parts.push(`${step.burden.timeMinutes} min`);
  parts.push(`${step.burden.actionCount} action${step.burden.actionCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function presentStep(step: FeasibleLiveRouteStep) {
  return {
    sourceId: step.sourceId,
    sourceType: step.sourceType,
    title: step.title,
    detail: step.summary,
    href: step.href,
    costCents: step.burden.moneyCents,
    timeMinutes: step.burden.timeMinutes,
    evidenceLabel: step.components.evidence.label,
    live: true as const,
    why: step.components.fit.basis,
  };
}

function routeUncertainties(route: ComposedLiveRoute) {
  const uncertainties = [
    "The source was open when checked; availability, reciprocal acceptance, and completion are rechecked before action.",
  ];
  if (
    route.steps.some(
      (step) =>
        step.burden.timeCertainty === "conservative_default" ||
        step.burden.actionCertainty === "conservative_default" ||
        step.burden.timeCertainty === "unknown" ||
        step.burden.actionCertainty === "unknown",
    )
  ) {
    uncertainties.push("At least one burden estimate is unknown or uses a conservative default because the listing is incomplete.");
  }
  if (route.steps.some((step) => step.sourceType === "donation_pool")) {
    uncertainties.push("A live pool does not imply that this contribution is pivotal or that its threshold will be met.");
  }
  return uncertainties;
}

function presentRoute(route: ComposedLiveRoute) {
  return {
    id: route.id,
    label: route.label,
    summary: route.rationale,
    metrics: {
      fit: { ...route.components.fit },
      friction: { ...route.components.friction },
      evidence: { ...route.components.evidence },
      coordination: { ...route.components.coordination },
    },
    steps: route.steps.map(presentStep),
    uncertainties: routeUncertainties(route),
  };
}

export function presentRoutePlanner(result: RoutePlannerResult) {
  const needsMoreInput = [...result.missingProfileFields];
  if (result.status === "needs_baseline") {
    if (result.profile.plannedDonationBaseline === null) {
      needsMoreInput.push("planned_donation_baseline");
    } else if (result.profile.plannedDonationBaseline && !result.profile.plannedDonationCents) {
      needsMoreInput.push("planned_donation_cents");
    }
  }
  const comparison = result.activeComparison
    ? {
        key: result.activeComparison.id,
        left: {
          title: result.activeComparison.left.title,
          format: result.activeComparison.left.routeFormat,
          detail: comparisonDetail(result.activeComparison.left),
        },
        right: {
          title: result.activeComparison.right.title,
          format: result.activeComparison.right.routeFormat,
          detail: comparisonDetail(result.activeComparison.right),
        },
        answeredCount: Object.keys(result.profile.pairwiseAnswers).length,
        targetCount: 5,
        hypothetical: false,
      }
    : null;

  return {
    status: presentationStatus(result.status),
    checkedAt: result.checkedAt,
    profile: {
      goal: result.profile.goal,
      causePriorities: result.profile.causePriorities,
      moneyBudgetCents: result.profile.moneyBudgetCents,
      timeBudgetMinutes: result.profile.timeBudgetMinutes,
      actionBudgetCount: result.profile.actionBudgetCount,
      horizon: result.profile.horizon,
      routeFormats: result.profile.routeFormats,
      evidencePreference: result.profile.evidencePreference,
      uncertaintyPreference: result.profile.uncertaintyPreference,
      interactionPreference: result.profile.interactionPreference,
      privacyPreference: result.profile.privacyPreference,
      plannedDonationBaseline: result.profile.plannedDonationBaseline,
      plannedDonationCents: result.profile.plannedDonationCents,
      otherwiseBaseline: result.profile.otherwiseBaseline,
      calibrationCount: Object.keys(result.profile.pairwiseAnswers).length,
      interviewCompleted: result.profile.interviewAnswers.confirmed === true,
    },
    needsMoreInput: [...new Set(needsMoreInput)],
    routes: result.routes.map(presentRoute),
    comparison,
    candidateCount: result.steps.length,
  };
}
