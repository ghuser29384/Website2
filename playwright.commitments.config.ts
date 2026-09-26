import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

// Never run synthetic sessions against a hosted app or a real Auth service.
if (process.env.AUTH_RESOLUTION_BASE_URL || process.env.AUTH_RESOLUTION_FIXTURE_URL) {
  throw new Error("Commitments loading tests require the local synthetic fixture.");
}

const baseURL = "http://127.0.0.1:3211";
const fixtureURL = "http://127.0.0.1:3231";

export default defineConfig({
  ...baseConfig,
  fullyParallel: false,
  testMatch: /commitments-loading\.auth\.ts/,
  outputDir: "test-results/commitments-loading",
  preserveOutput: "always",
  retries: 0,
  workers: 1,
  use: { ...baseConfig.use, baseURL, trace: "off" },
  webServer: [
    {
      command: "node scripts/auth-resolution-supabase.mjs",
      env: {
        AUTH_RESOLUTION_FIXTURE_CONTROL_SECRET: "auth-resolution-local-control-fixture",
        AUTH_RESOLUTION_SUPABASE_PORT: "3231",
        COMMITMENTS_LAYOUT_FIXTURE: "1",
      },
      reuseExistingServer: false,
      timeout: 30_000,
      url: fixtureURL,
    },
    {
      command: "npm run start -- -H 127.0.0.1 -p 3211",
      env: {
        NEXT_PUBLIC_SITE_URL: baseURL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "auth-resolution-public-fixture",
        NEXT_PUBLIC_SUPABASE_URL: fixtureURL,
        SUPABASE_SERVICE_ROLE_KEY: "auth-resolution-service-fixture",
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: baseURL,
    },
  ],
});
