import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  webServer: {
    command: "npm run dev -- -p 3210",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://localhost:3210",
  },
  use: {
    baseURL: "http://localhost:3210",
    trace: "retain-on-failure",
  },
});
