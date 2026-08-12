import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

const useProductionServer =
  process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1" ||
  (process.env.CI === "true" && existsSync(".next/BUILD_ID"));

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  webServer: {
    command: useProductionServer
      ? "npm run start -- -H 127.0.0.1 -p 3210"
      : "npm run dev -- -H 127.0.0.1 -p 3210",
    reuseExistingServer: !useProductionServer,
    timeout: 120_000,
    url: "http://127.0.0.1:3210",
  },
  use: {
    baseURL: "http://127.0.0.1:3210",
    storageState: {
      cookies: [
        {
          domain: "127.0.0.1",
          expires: -1,
          httpOnly: true,
          name: "mt_walkthrough_seen",
          path: "/",
          sameSite: "Lax",
          secure: false,
          value: "1",
        },
      ],
      origins: [],
    },
    trace: "retain-on-failure",
  },
});
