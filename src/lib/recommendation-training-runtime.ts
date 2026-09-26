export const CANONICAL_RECOMMENDATION_TRAINING_PROJECT_ID =
  "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7";

export interface RecommendationTrainingRuntimeEnvironment {
  [key: string]: string | undefined;
  VERCEL_PROJECT_ID?: string;
  VERCEL_TARGET_ENV?: string;
}

export interface RecommendationTrainingRuntimeDecision {
  execute: boolean;
  projectId: string | null;
  reason: "canonical_vercel_project" | "local_or_unidentified_runtime" | "non_canonical_vercel_project";
  targetEnvironment: string | null;
}

export function evaluateRecommendationTrainingRuntime(
  environment: RecommendationTrainingRuntimeEnvironment = process.env,
): RecommendationTrainingRuntimeDecision {
  const projectId = environment.VERCEL_PROJECT_ID?.trim() || null;
  const targetEnvironment = environment.VERCEL_TARGET_ENV?.trim() || null;

  if (!projectId) {
    return {
      execute: true,
      projectId: null,
      reason: "local_or_unidentified_runtime",
      targetEnvironment,
    };
  }

  if (projectId === CANONICAL_RECOMMENDATION_TRAINING_PROJECT_ID) {
    return {
      execute: true,
      projectId,
      reason: "canonical_vercel_project",
      targetEnvironment,
    };
  }

  return {
    execute: false,
    projectId,
    reason: "non_canonical_vercel_project",
    targetEnvironment,
  };
}
