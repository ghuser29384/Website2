import { defineConfig } from "@playwright/test";

// Static-shell integration fixtures: real shipped scripts/styles, synthetic data,
// no Next server, authenticated session, API writes, or database connection.
export default defineConfig({
  testDir: "./tests",
  testMatch: "feed-empty-layout.spec.ts",
  timeout: 30_000,
  workers: 1,
  reporter: "list",
  outputDir: process.env.FEED_LAYOUT_OUTPUT_DIR || "test-results/feed-layout",
  use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
});
