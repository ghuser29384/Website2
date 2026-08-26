import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.COMPACT_UAT_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!baseURL) throw new Error("COMPACT_UAT_BASE_URL is required.");
if (!bypass) throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET is required.");

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: "test-results/pr737-ledger-playwright",
  reporter: [["line"]],
  projects: [
    { name: "desktop-1440x900", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet-1024x768", use: { viewport: { width: 1024, height: 768 } } },
    { name: "mobile-390x844", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "mobile-320x568", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } } },
  ],
  use: {
    baseURL,
    navigationTimeout: 35_000,
    actionTimeout: 20_000,
    trace: "on",
    screenshot: "only-on-failure",
  },
});
