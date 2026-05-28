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
  outputFileTracingIncludes: {
    "/mpgf": mpgfRuntimeArtifacts,
    "/mpgf/**/*": mpgfRuntimeArtifacts,
  },
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
            value: "max-age=63072000; includeSubDomains; preload",
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
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.every.org https://every.org",
          },
        ],
      },
    ];
  },
  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;
