export const CANONICAL_MORAL_TRADE_PROJECT_ID =
  "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7";
export const DUPLICATE_WEBSITE2_PROJECT_ID =
  "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK";
export const RELEASE_PREVIEW_BRANCH = "release/vercel-preview";
export const VERCEL_IGNORE_COMMAND = "node scripts/vercel-ignore-build.mjs";
export const RECOMMENDATION_TRAINING_PATH =
  "/api/jobs/recommendation-training";
export const RECOMMENDATION_TRAINING_SCHEDULE = "30 12 * * *";

const sharedCrons = Object.freeze([
  { path: "/api/jobs/saved-searches", schedule: "0 9 * * *" },
  { path: "/api/jobs/delegates", schedule: "30 9 * * *" },
  { path: "/api/jobs/email", schedule: "0 10 * * *" },
  { path: "/api/jobs/trade-reminders", schedule: "0 11 * * *" },
  { path: "/api/jobs/background-networking", schedule: "0 * * * *" },
  { path: "/api/jobs/conditional-redirects", schedule: "15 * * * *" },
  { path: "/api/jobs/donation-upgrades", schedule: "*/15 * * * *" },
]);

const recommendationTrainingCron = Object.freeze({
  path: RECOMMENDATION_TRAINING_PATH,
  schedule: RECOMMENDATION_TRAINING_SCHEDULE,
});

export function buildVercelProjectConfig({
  projectId = process.env.VERCEL_PROJECT_ID,
} = {}) {
  const crons = sharedCrons.map((cron) => ({ ...cron }));

  // Only the canonical Moral Trade project owns A1's natural training schedule.
  // The duplicate website2 project is retained temporarily only so its legacy
  // domains can be detached safely; it must never receive this invocation.
  if (projectId !== DUPLICATE_WEBSITE2_PROJECT_ID) {
    crons.push({ ...recommendationTrainingCron });
  }

  return {
    // Git pushes are quality-gated in GitHub Actions and deployed as prebuilt
    // artifacts. Disabling Vercel's automatic Git builds prevents every
    // intermediate branch commit from starting one or two paid builds.
    git: {
      deploymentEnabled: false,
    },
    // Defense in depth if automatic Git deployments are ever re-enabled.
    ignoreCommand: VERCEL_IGNORE_COMMAND,
    crons,
  };
}
