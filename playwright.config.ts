import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3210",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:3210",
  },
  use: {
    baseURL: "http://127.0.0.1:3210",
    trace: "retain-on-failure",
  },
});
