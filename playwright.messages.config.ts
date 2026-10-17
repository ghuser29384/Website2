import authConfig from "./playwright.auth-resolution.config";

export default {
  ...authConfig,
  testMatch: /messages-loading\.auth\.ts/,
  outputDir: "test-results/messages-loading",
};
