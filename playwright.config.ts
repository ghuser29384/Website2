import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const localBaseUrl = "http://127.0.0.1:3210";
const baseURL = externalBaseUrl || localBaseUrl;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev -- -H 127.0.0.1 -p 3210",
        reuseExistingServer: true,
        timeout: 120_000,
        url: localBaseUrl,
      },
  use: {
    baseURL,
    storageState: {
      cookies: externalBaseUrl
        ? []
        : [
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
