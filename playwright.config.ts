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
