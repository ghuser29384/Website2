import { randomUUID } from "node:crypto";

import {
  PARETO_EXPERIMENT_KEY,
  PARETO_HEURISTIC_MODEL_KEY,
  PARETO_MODEL_VERSION,
  assignNonDirectHoldout,
  betaPosteriorMean,
  clamp,
  clearsParetoDirectGate,
  factorAffinity,
  predictParetoModel,
  round,
  type ParetoFeatureSnapshot,
  type ParetoModelArtifact,
  type ParetoPredictionVector,
} from "./pareto-recommendation-model";
import { createServiceClient } from "./supabase/server";

export type ParetoRuntimeMode = "heuristic" | "shadow" | "active";

type MatchClass = "direct" | "near" | "adjacent" | "discovery";

interface RuntimeRecommendation {
  acceptanceEstimates?: {
    completion?: number;
    counterparty?: number;
    substantiveCompatibility?: number;
    user?: number;
  };
  difficulty?: number;
  id: string;
  matchClass?: MatchClass;
  mode?: string;
  opportunityType?: string;
  ownerId?: string;
  reciprocalScore?: number;
  saved?: boolean;
  score?: number;
  semanticScore?: number;
  trustLevel?: number;
  updatedAt?: string;
  verification?: string;
  willingness?: number;
  [key: string]: unknown;
}

interface ModelVersionRow {
  artifact: unknown;
  created_at: string;
  id: string;
  model_key: string;
  status: string;
}

interface FactorRow {
  factors: unknown;
  graph_factors: unknown;
  opportunity_key?: string;
  profile_id?: string;
}

interface CounterpartyPriorRow {
  acceptance_count: number;
  completion_count: number;
  owner_id: string;
  proposal_count: number;
}

interface GuardrailRow {
  reasons: string[] | null;
  stop_experiment: boolean;
}

interface LoadedRuntimeState {
  artifact: ParetoModelArtifact | null;
  candidateModelKey: string | null;
  guardrailReasons: string[];
  mode: ParetoRuntimeMode;
  modelId: string | null;
  modelKey: string;
  opportunityFactors: Map<string, { collaborative: number[]; graph: number[] }>;
  ownerPriors: Map<string, { acceptance: number; completion: number }>;
  profileFactors: { collaborative: number[]; graph: number[] } | null;
  stopExperiment: boolean;
}

export interface ParetoRuntimeDiagnostics {
  activeModelKey: string;
  candidateModelKey: string | null;
  coldStart: boolean;
  directMatchesRandomized: false;
  exposureWriteStatus: "written" | "failed" | "skipped";
  experiment: {
    affectedCandidateKey: string | null;
    arm: "not_assigned" | "treatment" | "holdout";
    assignmentProbability: number;
    enabled: boolean;
    jointPropensity: number;
    stableBucket: number;
    stoppedByGuardrail: boolean;
  };
  guardrailReasons: string[];
  mode: ParetoRuntimeMode;
  objective: "pareto_safe_additionality";
  privateProfileProseProcessed: false;
  requestId: string;
  sensitiveAttributesUsed: false;
}

export interface ParetoRuntimePayload extends Record<string, unknown> {
  learningDiagnostics?: ParetoRuntimeDiagnostics;
  recommendations?: RuntimeRecommendation[];
}

const CLASS_PRIORITY: Record<MatchClass, number> = {
  direct: 4,
  near: 3,
  adjacent: 2,
  discovery: 1,
};

const PROFILE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function profileUuid(value: unknown) {
  return typeof value === "string" && PROFILE_UUID_PATTERN.test(value) ? value : null;
}

function numericArray(value: unknown) {
  if (!Array.isArray(value)) return [] as number[];
  const result = value.map(Number);
  return result.length && result.every(Number.isFinite) ? result : [];
}

function matchClass(value: unknown): MatchClass {
  return value === "direct" || value === "near" || value === "adjacent" || value === "discovery"
    ? value
    : "adjacent";
}

function opportunityType(value: unknown) {
  return typeof value === "string" && value ? value.slice(0, 40) : "offer";
}

function candidateKey(recommendation: RuntimeRecommendation) {
  return `${opportunityType(recommendation.opportunityType)}:${recommendation.id}`;
}

function safeArtifact(value: unknown): ParetoModelArtifact | null {
  if (!value || typeof value !== "object") return null;
  const artifact = value as Partial<ParetoModelArtifact>;
  if (artifact.modelVersion !== PARETO_MODEL_VERSION || !artifact.heads || !artifact.thresholds) {
    return null;
  }
  return artifact as ParetoModelArtifact;
}

function publicQuality(recommendation: RuntimeRecommendation) {
  const verification = typeof recommendation.verification === "string" ? recommendation.verification.trim() : "";
  const trust = clamp(Number(recommendation.trustLevel ?? 0) / 5);
  return clamp((verification.length >= 12 ? 0.68 : 0.34) + trust * 0.32);
}

function ownerPrior(
  priors: ReadonlyMap<string, { acceptance: number; completion: number }>,
  ownerId: unknown,
  key: "acceptance" | "completion",
  fallback: number,
) {
  const normalizedOwnerId = profileUuid(ownerId);
  if (!normalizedOwnerId) return fallback;
  return priors.get(normalizedOwnerId)?.[key] ?? fallback;
}

function featureSnapshot(
  recommendation: RuntimeRecommendation,
  state: LoadedRuntimeState,
): ParetoFeatureSnapshot {
  const estimates = recommendation.acceptanceEstimates ?? {};
  const key = candidateKey(recommendation);
  const opportunityFactors = state.opportunityFactors.get(key);
  const collaborative = factorAffinity(
    state.profileFactors?.collaborative,
    opportunityFactors?.collaborative,
  );
  const graph = factorAffinity(state.profileFactors?.graph, opportunityFactors?.graph);
  const classification = matchClass(recommendation.matchClass);
  const baseCounterparty = clamp(Number(estimates.counterparty ?? 0.5));
  const baseCompletion = clamp(Number(estimates.completion ?? 0.45));
  return {
    substantive_compatibility: clamp(
      Number(estimates.substantiveCompatibility ?? recommendation.semanticScore ?? 0),
    ),
    base_user_acceptance: clamp(Number(estimates.user ?? 0.5)),
    base_counterparty_acceptance: baseCounterparty,
    base_completion: baseCompletion,
    reciprocal_score: clamp(Number(recommendation.reciprocalScore ?? 0.5)),
    difficulty_inverse: clamp(1 - (Number(recommendation.difficulty ?? 3) - 1) / 4),
    willingness: clamp(Number(recommendation.willingness ?? 50) / 100),
    trust: clamp(Number(recommendation.trustLevel ?? 0) / 5),
    public_quality: publicQuality(recommendation),
    saved: recommendation.saved === true ? 1 : 0,
    direct_prior: classification === "direct" ? 1 : 0,
    near_prior: classification === "near" ? 1 : 0,
    collaborative_affinity: collaborative,
    graph_affinity: graph,
    owner_acceptance_prior: ownerPrior(
      state.ownerPriors,
      recommendation.ownerId,
      "acceptance",
      baseCounterparty,
    ),
    owner_completion_prior: ownerPrior(
      state.ownerPriors,
      recommendation.ownerId,
      "completion",
      baseCompletion,
    ),
  };
}

function heuristicPrediction(snapshot: ParetoFeatureSnapshot): ParetoPredictionVector {
  const prediction = {
    userAcceptance: snapshot.base_user_acceptance,
    counterpartyAcceptance: clamp(
      snapshot.base_counterparty_acceptance * 0.65 + snapshot.owner_acceptance_prior * 0.35,
    ),
    verifiedCompletion: clamp(
      snapshot.base_completion * 0.65 + snapshot.owner_completion_prior * 0.2 + snapshot.public_quality * 0.15,
    ),
    viewerGain: clamp(
      snapshot.substantive_compatibility * 0.65 + snapshot.reciprocal_score * 0.2 + snapshot.willingness * 0.15,
    ),
    counterpartyGain: clamp(
      snapshot.base_counterparty_acceptance * 0.55 + snapshot.reciprocal_score * 0.3 + snapshot.public_quality * 0.15,
    ),
    additionality: clamp(0.44 + snapshot.direct_prior * 0.1 + snapshot.public_quality * 0.08),
    externalitySafety: clamp(0.54 + snapshot.trust * 0.24 + snapshot.public_quality * 0.18),
    satisfaction: clamp(0.34 + snapshot.reciprocal_score * 0.48 + snapshot.public_quality * 0.12),
  };
  const product = Math.max(
    1e-8,
    prediction.viewerGain *
      prediction.counterpartyGain *
      prediction.verifiedCompletion *
      prediction.additionality *
      prediction.externalitySafety,
  );
  return { ...prediction, paretoSuccess: clamp(Math.pow(product, 1 / 5)) };
}

function shadowCanDowngrade(artifact: ParetoModelArtifact | null) {
  if (!artifact) return false;
  const keys = ["viewerGain", "counterpartyGain", "verifiedCompletion", "externalitySafety"] as const;
  return keys.every((key) => {
    const metrics = artifact.heads[key].metrics;
    return artifact.heads[key].enabled && metrics.sampleCount >= 100 && (metrics.brier ?? 1) <= 0.28;
  });
}

function classify(
  base: MatchClass,
  prediction: ParetoPredictionVector,
  state: LoadedRuntimeState,
  snapshot: ParetoFeatureSnapshot,
) {
  if (state.mode === "active" && state.artifact) {
    const clears = clearsParetoDirectGate(prediction, state.artifact.thresholds);
    if (clears && snapshot.substantive_compatibility >= 0.56 && (base === "direct" || base === "near")) {
      return "direct" as const;
    }
    if (base === "direct" && !clears) return "near" as const;
    return base;
  }
  if (
    state.mode === "shadow" &&
    base === "direct" &&
    shadowCanDowngrade(state.artifact) &&
    (prediction.viewerGain < 0.3 ||
      prediction.counterpartyGain < 0.3 ||
      prediction.verifiedCompletion < 0.25 ||
      prediction.externalitySafety < 0.4)
  ) {
    return "near" as const;
  }
  return base;
}

function enrichRecommendations(
  recommendations: readonly RuntimeRecommendation[],
  state: LoadedRuntimeState,
) {
  return recommendations
    .map((recommendation) => {
      const snapshot = featureSnapshot(recommendation, state);
      const prediction = state.artifact
        ? predictParetoModel(state.artifact, snapshot)
        : heuristicPrediction(snapshot);
      const baseClass = matchClass(recommendation.matchClass);
      const finalClass = classify(baseClass, prediction, state, snapshot);
      const paretoRankScore =
        prediction.paretoSuccess * 100 +
        prediction.satisfaction * 8 +
        snapshot.reciprocal_score * 12 +
        snapshot.collaborative_affinity * 5 +
        snapshot.graph_affinity * 5;
      return {
        ...recommendation,
        matchClass: finalClass,
        paretoPrediction: Object.fromEntries(
          Object.entries(prediction).map(([key, value]) => [key, round(value)]),
        ),
        paretoRankScore: round(paretoRankScore, 3),
        recommendationModel: {
          key: state.modelKey,
          mode: state.mode,
          objective: "pareto_safe_additionality",
        },
        __featureSnapshot: snapshot,
      };
    })
    .sort((left, right) => {
      const classDifference = CLASS_PRIORITY[matchClass(right.matchClass)] - CLASS_PRIORITY[matchClass(left.matchClass)];
      if (classDifference) return classDifference;
      return Number(right.paretoRankScore ?? 0) - Number(left.paretoRankScore ?? 0) || left.id.localeCompare(right.id);
    });
}

function filterRoutePlanner(payload: ParetoRuntimePayload, directIds: ReadonlySet<string>) {
  const planner = payload.routePlanner;
  if (!planner || typeof planner !== "object") return;
  const value = planner as Record<string, unknown>;
  if (!Array.isArray(value.routes)) return;
  const routes = value.routes.filter((route) => {
    if (!route || typeof route !== "object") return false;
    const steps = Array.isArray((route as Record<string, unknown>).steps)
      ? ((route as Record<string, unknown>).steps as Array<Record<string, unknown>>)
      : [];
    return steps.length > 0 && steps.every((step) => directIds.has(String(step.sourceId ?? "")));
  });
  payload.routePlanner = {
    ...value,
    routes,
    candidateCount: directIds.size,
    status: routes.length ? value.status : value.status === "ready" ? "no_live" : value.status,
  };
}

async function loadRuntimeState(recommendations: readonly RuntimeRecommendation[], profileId: string) {
  const fallback: LoadedRuntimeState = {
    artifact: null,
    candidateModelKey: null,
    guardrailReasons: [],
    mode: "heuristic",
    modelId: null,
    modelKey: PARETO_HEURISTIC_MODEL_KEY,
    opportunityFactors: new Map(),
    ownerPriors: new Map(),
    profileFactors: null,
    stopExperiment: false,
  };
  try {
    const service = createServiceClient() as any;
    const [modelsResult, guardrailResult] = await Promise.all([
      service
        .from("recommendation_model_versions")
        .select("id,model_key,status,artifact,created_at")
        .in("status", ["active", "shadow", "cold_start"])
        .order("created_at", { ascending: false })
        .limit(8),
      service
        .from("recommendation_guardrail_snapshots")
        .select("stop_experiment,reasons")
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (modelsResult.error) return { ...fallback, service };
    const rows = (modelsResult.data ?? []) as ModelVersionRow[];
    const active = rows.find((row) => row.status === "active" && safeArtifact(row.artifact));
    const candidate = rows.find(
      (row) => (row.status === "shadow" || row.status === "cold_start") && safeArtifact(row.artifact),
    );
    const selected = active ?? candidate ?? null;
    const artifact = selected ? safeArtifact(selected.artifact) : null;
    const mode: ParetoRuntimeMode = active ? "active" : candidate?.status === "shadow" ? "shadow" : "heuristic";
    const guardrail = guardrailResult.error ? null : (guardrailResult.data as GuardrailRow | null);
    if (!selected || !artifact) {
      return {
        ...fallback,
        candidateModelKey: candidate?.model_key ?? null,
        guardrailReasons: guardrail?.reasons ?? [],
        stopExperiment: guardrail?.stop_experiment === true,
        service,
      };
    }
    const opportunityKeys = recommendations.map(candidateKey);
    const ownerIds = recommendations
      .map((recommendation) => profileUuid(recommendation.ownerId))
      .filter((ownerId): ownerId is string => Boolean(ownerId));
    const [profileFactorResult, opportunityFactorResult, priorResult] = await Promise.all([
      service
        .from("recommendation_user_factors")
        .select("profile_id,factors,graph_factors")
        .eq("model_version_id", selected.id)
        .eq("profile_id", profileId)
        .maybeSingle(),
      opportunityKeys.length
        ? service
            .from("recommendation_opportunity_factors")
            .select("opportunity_key,factors,graph_factors")
            .eq("model_version_id", selected.id)
            .in("opportunity_key", opportunityKeys)
        : Promise.resolve({ data: [], error: null }),
      ownerIds.length
        ? service
            .from("recommendation_counterparty_priors")
            .select("owner_id,proposal_count,acceptance_count,completion_count")
            .eq("model_version_id", selected.id)
            .in("owner_id", [...new Set(ownerIds)])
        : Promise.resolve({ data: [], error: null }),
    ]);
    const profileFactor = profileFactorResult.error
      ? null
      : (profileFactorResult.data as FactorRow | null);
    const opportunityFactors = new Map<string, { collaborative: number[]; graph: number[] }>();
    ((opportunityFactorResult.data ?? []) as FactorRow[]).forEach((row) => {
      if (!row.opportunity_key) return;
      opportunityFactors.set(row.opportunity_key, {
        collaborative: numericArray(row.factors),
        graph: numericArray(row.graph_factors),
      });
    });
    const ownerPriors = new Map<string, { acceptance: number; completion: number }>();
    ((priorResult.data ?? []) as CounterpartyPriorRow[]).forEach((row) => {
      const acceptance = betaPosteriorMean(
        row.acceptance_count,
        row.proposal_count,
        artifact.platformPriors.acceptance,
      );
      const completion = betaPosteriorMean(
        row.completion_count,
        row.acceptance_count,
        artifact.platformPriors.completion,
      );
      ownerPriors.set(row.owner_id, { acceptance, completion });
    });
    return {
      artifact,
      candidateModelKey: candidate?.model_key ?? null,
      guardrailReasons: guardrail?.reasons ?? [],
      mode,
      modelId: selected.id,
      modelKey: selected.model_key,
      opportunityFactors,
      ownerPriors,
      profileFactors: profileFactor
        ? {
            collaborative: numericArray(profileFactor.factors),
            graph: numericArray(profileFactor.graph_factors),
          }
        : null,
      stopExperiment: guardrail?.stop_experiment === true,
      service,
    } as LoadedRuntimeState & { service: any };
  } catch (error) {
    console.error("[pareto-feed] Learning state unavailable; using reciprocal heuristic", {
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function sanitizedRecommendation(recommendation: Record<string, unknown>) {
  const { __featureSnapshot: _featureSnapshot, ...safe } = recommendation;
  return safe;
}

function errorDetails(error: unknown) {
  if (error instanceof Error) return { message: error.message };
  if (!error || typeof error !== "object") return { message: String(error) };
  const value = error as Record<string, unknown>;
  return {
    message: typeof value.message === "string" ? value.message : String(error),
    code: typeof value.code === "string" ? value.code : undefined,
    details: typeof value.details === "string" ? value.details : undefined,
    hint: typeof value.hint === "string" ? value.hint : undefined,
  };
}

async function recordAssignmentAndExposures({
  assignment,
  day,
  displayed,
  heldOut,
  profileId,
  requestId,
  state,
}: {
  assignment: ReturnType<typeof assignNonDirectHoldout>;
  day: string;
  displayed: Array<RuntimeRecommendation & { __featureSnapshot: ParetoFeatureSnapshot }>;
  heldOut: (RuntimeRecommendation & { __featureSnapshot: ParetoFeatureSnapshot }) | null;
  profileId: string;
  requestId: string;
  state: LoadedRuntimeState & { service?: any };
}) {
  const service = state.service;
  if (!service) return "skipped" as const;
  try {
    if (assignment.arm !== "not_assigned") {
      const assignmentResult = await service.from("recommendation_experiment_assignments").upsert(
        {
          profile_id: profileId,
          experiment_key: PARETO_EXPERIMENT_KEY,
          assignment_day: day,
          arm: assignment.arm,
          stable_bucket: assignment.stableBucket,
          assignment_probability: assignment.assignmentProbability,
          candidate_probability: assignment.candidateProbability,
          joint_propensity: assignment.jointPropensity,
          affected_candidate_key: assignment.affectedCandidateKey,
        },
        { onConflict: "profile_id,experiment_key,assignment_day" },
      );
      if (assignmentResult.error) throw assignmentResult.error;
    }
    const occurredAt = new Date().toISOString();
    const rows: Array<Record<string, unknown>> = displayed.map((recommendation, rank) => ({
      profile_id: profileId,
      request_id: requestId,
      opportunity_type: opportunityType(recommendation.opportunityType),
      opportunity_id: recommendation.id,
      owner_id: profileUuid(recommendation.ownerId),
      rank: rank + 1,
      match_class: matchClass(recommendation.matchClass),
      was_shown: true,
      model_version_id: state.modelId,
      model_key: state.modelKey,
      model_mode: state.mode,
      objective: "pareto_safe_additionality",
      prediction: recommendation.paretoPrediction ?? {},
      feature_snapshot: recommendation.__featureSnapshot,
      experiment_key:
        assignment.affectedCandidateKey === candidateKey(recommendation) ? PARETO_EXPERIMENT_KEY : "",
      assignment_arm:
        assignment.affectedCandidateKey === candidateKey(recommendation) ? assignment.arm : "not_assigned",
      assignment_probability:
        assignment.affectedCandidateKey === candidateKey(recommendation) ? assignment.assignmentProbability : 1,
      candidate_probability:
        assignment.affectedCandidateKey === candidateKey(recommendation) ? assignment.candidateProbability : 1,
      joint_propensity:
        assignment.affectedCandidateKey === candidateKey(recommendation) ? assignment.jointPropensity : 1,
      stable_bucket: assignment.stableBucket,
      occurred_at: occurredAt,
    }));
    if (heldOut) {
      rows.push({
        profile_id: profileId,
        request_id: requestId,
        opportunity_type: opportunityType(heldOut.opportunityType),
        opportunity_id: heldOut.id,
        owner_id: profileUuid(heldOut.ownerId),
        rank: null,
        match_class: matchClass(heldOut.matchClass),
        was_shown: false,
        model_version_id: state.modelId,
        model_key: state.modelKey,
        model_mode: state.mode,
        objective: "pareto_safe_additionality",
        prediction: heldOut.paretoPrediction ?? {},
        feature_snapshot: heldOut.__featureSnapshot,
        experiment_key: PARETO_EXPERIMENT_KEY,
        assignment_arm: "holdout",
        assignment_probability: assignment.assignmentProbability,
        candidate_probability: assignment.candidateProbability,
        joint_propensity: assignment.jointPropensity,
        stable_bucket: assignment.stableBucket,
        occurred_at: occurredAt,
      });
    }
    const result = await service.from("recommendation_exposures").upsert(rows, {
      onConflict: "profile_id,request_id,opportunity_type,opportunity_id",
      ignoreDuplicates: true,
    });
    if (result.error) throw result.error;
    return "written" as const;
  } catch (error) {
    console.error("[pareto-feed] Failed to write exposure receipts; feed remained available", {
      ...errorDetails(error),
      requestId,
    });
    return "failed" as const;
  }
}

export async function applyParetoLearningToLiveNowPayload({
  payload,
  profileId,
  now = new Date(),
}: {
  payload: ParetoRuntimePayload;
  profileId: string;
  now?: Date;
}) {
  const baseRecommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.filter(
        (item): item is RuntimeRecommendation =>
          Boolean(item) && typeof item === "object" && typeof (item as RuntimeRecommendation).id === "string",
      )
    : [];
  if (!profileId || !baseRecommendations.length || payload.authenticated !== true) return payload;
  const state = await loadRuntimeState(baseRecommendations, profileId);
  const enriched = enrichRecommendations(baseRecommendations, state) as Array<
    RuntimeRecommendation & { __featureSnapshot: ParetoFeatureSnapshot }
  >;
  const experimentEnabled =
    process.env.RECOMMENDATION_CAUSAL_EXPERIMENT_ENABLED !== "false" && !state.stopExperiment;
  const day = now.toISOString().slice(0, 10);
  const assignment = assignNonDirectHoldout({
    candidates: enriched.map((recommendation) => ({
      id: recommendation.id,
      matchClass: matchClass(recommendation.matchClass),
      opportunityType: opportunityType(recommendation.opportunityType),
    })),
    day,
    experimentEnabled,
    profileId,
  });
  const affected = assignment.affectedCandidateKey
    ? enriched.find((recommendation) => candidateKey(recommendation) === assignment.affectedCandidateKey) ?? null
    : null;
  const heldOut = assignment.arm === "holdout" ? affected : null;
  const displayed = heldOut
    ? enriched.filter((recommendation) => candidateKey(recommendation) !== assignment.affectedCandidateKey)
    : enriched;
  const requestId = randomUUID();
  const exposureWriteStatus = await recordAssignmentAndExposures({
    assignment,
    day,
    displayed,
    heldOut,
    profileId,
    requestId,
    state,
  });
  const directIds = new Set(
    displayed.filter((recommendation) => matchClass(recommendation.matchClass) === "direct").map((item) => item.id),
  );
  const result: ParetoRuntimePayload = {
    ...payload,
    matchingOfferCount: directIds.size,
    matchingOpportunityCount: directIds.size,
    feedOpportunityCount: displayed.length,
    recommendations: displayed.map((recommendation) => ({
      ...sanitizedRecommendation(recommendation as unknown as Record<string, unknown>),
      exposureRequestId: requestId,
    })) as unknown as RuntimeRecommendation[],
    learningDiagnostics: {
      activeModelKey: state.modelKey,
      candidateModelKey: state.candidateModelKey,
      coldStart: state.mode === "heuristic",
      directMatchesRandomized: false,
      exposureWriteStatus,
      experiment: {
        affectedCandidateKey: assignment.affectedCandidateKey,
        arm: assignment.arm,
        assignmentProbability: assignment.assignmentProbability,
        enabled: experimentEnabled,
        jointPropensity: assignment.jointPropensity,
        stableBucket: assignment.stableBucket,
        stoppedByGuardrail: state.stopExperiment,
      },
      guardrailReasons: state.guardrailReasons,
      mode: state.mode,
      objective: "pareto_safe_additionality",
      privateProfileProseProcessed: false,
      requestId,
      sensitiveAttributesUsed: false,
    } satisfies ParetoRuntimeDiagnostics,
  };
  if (state.mode === "active" || directIds.size < baseRecommendations.filter((item) => matchClass(item.matchClass) === "direct").length) {
    filterRoutePlanner(result, directIds);
  }
  return result;
}
