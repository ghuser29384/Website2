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

// Vercel preview builders have 8 GB of memory; this route-heavy app needs
// constrained build workers to avoid OOM SIGKILL failures.
const vercelLowMemoryBuildConfig =
  process.env.VERCEL === "1"
    ? {
        cpus: 1,
        memoryBasedWorkersCount: false,
      }
    : {};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["terminal.local"],
  experimental: {
    ...vercelLowMemoryBuildConfig,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
    // On Vercel the coordinator and webpack worker each receive a large heap.
    // Keeping compilation in the constrained coordinator avoids their combined
    // RSS crossing the 8 GB preview-builder limit on this route-heavy app.
    webpackBuildWorker: process.env.VERCEL !== "1",
    webpackMemoryOptimizations: true,
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  outputFileTracingIncludes: {
    "/mpgf": mpgfRuntimeArtifacts,
    "/mpgf/**/*": mpgfRuntimeArtifacts,
    "/trades/new": ["./public/moral-trade-create/index.html"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "moraltrade.org" }],
        destination: "https://www.moraltrade.org/:path*",
        permanent: true,
      },
      {
        source: "/donation-offsets/conditional",
        destination: "/trades/new?structure=conditional-donation",
        permanent: true,
      },
      {
        source: "/moral-trade-create",
        destination: "/trades/new",
        permanent: true,
      },
      {
        source: "/moral-trade-create/index.html",
        destination: "/trades/new",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/live-now",
          destination: "/api/live-now-a1",
        },
        {
          source: "/feed",
          destination: "/moral-trade-live.html",
        },
        {
          source: "/discover",
          destination: "/moral-trade-discover.html",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
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
        source: "/agreements/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/saved-offers/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/background-networking/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/onboarding/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/password-update/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/mpgf/admin/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/mpgf/account/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/profile/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/background/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/jobs/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/saved-searches",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/wish-registry/search",
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
      {
        source: "/invitations/:path*",
        headers: [
          ...privateNoStoreHeaders,
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
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
