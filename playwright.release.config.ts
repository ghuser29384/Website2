import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  // The release workflow validates the credential-free current product. Historical
  // interface contracts and isolated authenticated QA remain outside this suite.
  testIgnore: [
    "**/exact-live-account.spec.ts",
    "**/exact-live-autocomplete.spec.ts",
    "**/exact-live-itinerary-editor.spec.ts",
    "**/exact-live-plan-resources.spec.ts",
    "**/exact-live-templates.spec.ts",
    "**/your-match-viewport.spec.ts",
    "**/feed-create-phase1-authenticated.spec.ts",
  ],
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: {
    ...(baseConfig.expect ?? {}),
    timeout: 10_000,
  },
});
