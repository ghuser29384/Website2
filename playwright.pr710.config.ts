import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  outputDir: "test-results/pr710-backed-offer",
  reporter: [["line"]],
  testDir: "./tests",
  testMatch: /pr710-backed-offer-rendered\.spec\.ts/,
  timeout: 180_000,
  use: {
    trace: "retain-on-failure",
  },
  workers: 1,
});
