import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /verify-production-account-identity\.spec\.ts/,
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  workers: 1,
  use: {
    baseURL: "https://www.moraltrade.org",
    trace: "retain-on-failure",
  },
});
