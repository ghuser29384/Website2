import { defineConfig } from "@playwright/test";

// Exercise the real Next.js rewrite, integrity-checked loader and asset cascade.
// Only the read-only account/feed responses are replaced with explicit fixtures.
export default defineConfig({
  testDir: "./tests",
  testMatch: "feed-layout-server.spec.ts",
  timeout: 30_000,
  workers: 1,
  reporter: "list",
  outputDir: process.env.FEED_LAYOUT_SERVER_OUTPUT_DIR || "test-results/feed-layout-server",
  use: { browserName: "chromium", baseURL: "http://127.0.0.1:3211" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3211",
    url: "http://127.0.0.1:3211/feed",
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
