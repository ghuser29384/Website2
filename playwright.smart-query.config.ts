import path from "node:path";

import baseConfig from "./playwright.config";

const appPort = 3210;
const mockPort = 3230;
const baseURL = `http://127.0.0.1:${appPort}`;
const mockURL = `http://127.0.0.1:${mockPort}`;
const fixturePath = path.resolve(
  process.env.RENDERED_QA_OFFERS_FIXTURE ?? "qa-results/rendered-qa-offers.json",
);

export default {
  ...baseConfig,
  webServer: [
    {
      command: "node scripts/rendered-qa-supabase.mjs",
      env: {
        RENDERED_QA_OFFERS_FIXTURE: fixturePath,
        RENDERED_QA_SUPABASE_PORT: String(mockPort),
      },
      reuseExistingServer: false,
      timeout: 30_000,
      url: mockURL,
    },
    {
      command: `npm run start -- -H 127.0.0.1 -p ${appPort}`,
      env: {
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "rendered-qa-public-read",
        NEXT_PUBLIC_SUPABASE_URL: mockURL,
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: baseURL,
    },
  ],
  use: {
    ...baseConfig.use,
    baseURL,
  },
};
