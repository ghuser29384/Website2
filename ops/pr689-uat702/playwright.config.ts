import { defineConfig } from "@playwright/test";

const baseURL = process.env.MPGF_DAC_PRODUCT_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!baseURL) throw new Error("MPGF_DAC_PRODUCT_BASE_URL is required.");
if (!bypass) throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET is required.");

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: "test-results/uat702-playwright",
  reporter: [["line"]],
  use: {
    baseURL,
    navigationTimeout: 35_000,
    actionTimeout: 20_000,
    trace: "off",
  },
});
