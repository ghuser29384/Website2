import type { NextConfig } from "next";

const mpgfRuntimeArtifacts = [
  "./mpgf_pilot_v0_3_codex_build_instruction_latest.md",
  "./config/mpgf/**/*",
  "./docs/mpgf/**/*",
  "./supabase/migrations/202605*.sql",
  "./tests/fixtures/mpgf/**/*",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/mpgf": mpgfRuntimeArtifacts,
    "/mpgf/**/*": mpgfRuntimeArtifacts,
  },
  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;
