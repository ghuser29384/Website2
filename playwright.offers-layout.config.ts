import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

// This suite starts its own Next.js process and in-memory backend on random
// loopback ports. It needs neither the shared server nor production inventory.
export default defineConfig({
  ...baseConfig,
  testMatch: /offers-density\.spec\.ts/,
  webServer: undefined,
  workers: 1,
  fullyParallel: false,
});
