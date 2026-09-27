import { defineConfig } from "@playwright/test";
import base from "./playwright.commitments.config";

export default defineConfig({
  ...base,
  testMatch: /audit-remediation\.auth\.ts/,
  outputDir: "test-results/audit-remediation",
  webServer: Array.isArray(base.webServer) ? base.webServer.map((server, index) => index === 0
    ? {...server, env:{...server.env, AUTH_RESOLUTION_AUDIT_FIXTURE:"1"}}
    : server) : base.webServer,
});
