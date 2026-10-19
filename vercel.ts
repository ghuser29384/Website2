import { buildVercelProjectConfig } from "./scripts/vercel-project-config.mjs";

export const config = {
  ...buildVercelProjectConfig(),
  // This validation branch must never create an automatic Vercel deployment.
  git: {
    deploymentEnabled: {
      "build/website2-legacy-query-20261019": false,
      "build/search-cpu-20261019": false,
    },
  },
};
