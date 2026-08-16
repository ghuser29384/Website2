import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /direct-spending-upgrade-authenticated\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL:
      process.env.DIRECT_SPENDING_UPGRADE_RENDERED_BASE_URL ??
      "http://127.0.0.1:3212",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "output/playwright/spending-upgrade/test-results",
});
