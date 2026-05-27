import type { NextConfig } from "next";

const mpgfRuntimeArtifacts = [
  "./mpgf_pilot_v0_3_codex_build_instruction_latest.md",
  "./config/mpgf/**/*",
  "./docs/mpgf/**/*",
  "./supabase/migrations/202605*.sql",
  "./tests/fixtures/mpgf/**/*",
];

const privateNoStoreHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/dashboard/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/admin/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/profile/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/jobs/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
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
