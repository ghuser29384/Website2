import { defineConfig } from "@playwright/test";

// Never inherit authenticated storage or a hosted URL from the app's e2e config.
export default defineConfig({
  testDir: "./tests",
  testMatch: /trade-draft-palette\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 1,
  outputDir: "test-results/trade-draft-palette",
  preserveOutput: "always",
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:3247",
    browserName: "chromium",
    timezoneId: "UTC",
    locale: "en-US",
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
    serviceWorkers: "block",
    storageState: { cookies: [], origins: [] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "node scripts/trade-draft-palette-fixture.mjs",
    url: "http://127.0.0.1:3247",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
