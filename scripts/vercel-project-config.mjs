export const CANONICAL_MORAL_TRADE_PROJECT_ID = "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7";
export const DUPLICATE_WEBSITE2_PROJECT_ID = "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK";
export const RECOMMENDATION_TRAINING_PATH = "/api/jobs/recommendation-training";
export const RECOMMENDATION_TRAINING_SCHEDULE = "30 12 * * *";
export const COLLECTIVE_COMMITMENT_EXPIRY_PATH = "/api/jobs/collective-commitments-expire";
export const COLLECTIVE_COMMITMENT_EXPIRY_SCHEDULE = "*/5 * * * *";

const sharedCrons = Object.freeze([
  { path: "/api/jobs/saved-searches", schedule: "0 9 * * *" },
  { path: "/api/jobs/delegates", schedule: "30 9 * * *" },
  { path: "/api/jobs/email", schedule: "0 10 * * *" },
  { path: "/api/jobs/trade-reminders", schedule: "0 11 * * *" },
  { path: "/api/jobs/background-networking", schedule: "0 * * * *" },
  { path: "/api/jobs/conditional-redirects", schedule: "15 * * * *" },
]);

const recommendationTrainingCron = Object.freeze({
  path: RECOMMENDATION_TRAINING_PATH,
  schedule: RECOMMENDATION_TRAINING_SCHEDULE,
});

const collectiveCommitmentExpiryCron = Object.freeze({
  path: COLLECTIVE_COMMITMENT_EXPIRY_PATH,
  schedule: COLLECTIVE_COMMITMENT_EXPIRY_SCHEDULE,
});

export function buildVercelProjectConfig({
  projectId = process.env.VERCEL_PROJECT_ID,
} = {}) {
  const crons = sharedCrons.map((cron) => ({ ...cron }));

  // Both Vercel projects deploy the same repository. Only the canonical Moral Trade
  // project owns scheduled state transitions; website2 must not invoke them.
  if (projectId !== DUPLICATE_WEBSITE2_PROJECT_ID) {
    crons.push(
      { ...recommendationTrainingCron },
      { ...collectiveCommitmentExpiryCron },
    );
  }

  return {
    ignoreCommand: "node scripts/vercel-ignore-build.mjs",
    crons,
  };
}
