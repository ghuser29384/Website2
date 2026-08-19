import baseConfig from "./playwright.config";

const appPort = 3211;
const mockPort = 3231;
const hostedBaseURL = process.env.AUTH_RESOLUTION_BASE_URL;
const baseURL = hostedBaseURL ?? `http://127.0.0.1:${appPort}`;
const mockURL = `http://127.0.0.1:${mockPort}`;
const localFixtureControlSecret = "auth-resolution-local-control-fixture";

export default {
  ...baseConfig,
  fullyParallel: false,
  outputDir: "test-results/auth-resolution",
  preserveOutput: "always",
  // Keep this fixture-backed security suite out of the repository's generic
  // release matcher; it owns a separate mock Auth server and lifecycle.
  testMatch: /auth-resolution-delayed\.auth\.ts/,
  workers: 1,
  webServer: hostedBaseURL
    ? undefined
    : [
    {
      command: "node scripts/auth-resolution-supabase.mjs",
      env: {
        AUTH_RESOLUTION_FIXTURE_CONTROL_SECRET: localFixtureControlSecret,
        AUTH_RESOLUTION_SUPABASE_PORT: String(mockPort),
      },
      reuseExistingServer: false,
      timeout: 30_000,
      url: mockURL,
    },
    {
      command: `npm run start -- -H 127.0.0.1 -p ${appPort}`,
      env: {
        NEXT_PUBLIC_SITE_URL: baseURL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "auth-resolution-public-fixture",
        NEXT_PUBLIC_SUPABASE_URL: mockURL,
        SUPABASE_SERVICE_ROLE_KEY: "auth-resolution-service-fixture",
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: baseURL,
    },
      ],
  use: {
    ...baseConfig.use,
    baseURL,
    // Session cookies contain ephemeral signed tokens; never retain them in traces.
    trace: "off",
  },
};
