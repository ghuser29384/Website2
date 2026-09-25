import { defineConfig } from "@playwright/test";

import authConfig from "./playwright.auth-resolution.config";

// This suite uses only the existing loopback Auth/PostgREST fixture. It must
// never accept a hosted URL or use a real account for its synthetic sessions.
if (process.env.AUTH_RESOLUTION_BASE_URL || process.env.AUTH_RESOLUTION_FIXTURE_URL) {
  throw new Error("Commitments loading tests require the local synthetic fixture.");
}

export default defineConfig({
  ...authConfig,
  testMatch: /commitments-loading\.auth\.ts/,
  outputDir: "test-results/commitments-loading",
  retries: 0,
  use: { ...authConfig.use, trace: "off" },
});
