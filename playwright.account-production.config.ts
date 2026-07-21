import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /exact-account-identity-all-pages\.spec\.ts/,
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  workers: 1,
  use: {
    baseURL: "https://www.moraltrade.org",
    screenshot: "on",
    trace: "retain-on-failure",
  },
});
