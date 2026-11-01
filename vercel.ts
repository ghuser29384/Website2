import { buildVercelProjectConfig } from "./scripts/vercel-project-config.mjs";

export const config = {
  ...buildVercelProjectConfig(),
  // This validation branch must never create an automatic Vercel deployment.
  git: {
    deploymentEnabled: false,
  },
};
