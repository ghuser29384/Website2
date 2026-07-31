import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getSupabaseEnv,
  isEvidencePaymentQaPreviewHost,
} from "@/lib/supabase/config";

const QA_PROJECT_URL = "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const PRODUCTION_PROJECT_URL = "https://jnpoxvalyjtdghnperyu.supabase.co";

test("the exact evidence-payment review aliases use isolated QA", () => {
  const reviewHosts = [
    "moraltrade-site-git-agent-evidence-weighted-payo-402d27-ellen-s.vercel.app",
    "website2-git-agent-evidence-weighted-payouts-20260723-ellen-s.vercel.app",
  ];

  for (const hostname of reviewHosts) {
    assert.equal(isEvidencePaymentQaPreviewHost(hostname), true);
    assert.equal(getSupabaseEnv(hostname).url, QA_PROJECT_URL);
  }
});

test("host matching is exact, normalized, and cannot redirect production", () => {
  assert.equal(
    getSupabaseEnv(
      "MORALTRADE-SITE-GIT-AGENT-EVIDENCE-WEIGHTED-PAYO-402D27-ELLEN-S.VERCEL.APP:443",
    ).url,
    QA_PROJECT_URL,
  );

  for (const hostname of [
    "moraltrade.org",
    "www.moraltrade.org",
    "moraltrade-site.vercel.app",
    "website2-3qvxma7sp-ellen-s.vercel.app",
    "moraltrade-site-git-agent-evidence-weighted-payo-402d27-ellen-s.vercel.app.attacker.test",
  ]) {
    assert.equal(isEvidencePaymentQaPreviewHost(hostname), false);
    assert.equal(getSupabaseEnv(hostname).url, PRODUCTION_PROJECT_URL);
  }
});

test("the QA review aliases override production Vercel environment values", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production-override.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "production-override-key";

  try {
    assert.equal(
      getSupabaseEnv(
        "website2-git-agent-evidence-weighted-payouts-20260723-ellen-s.vercel.app",
      ).url,
      QA_PROJECT_URL,
    );
    assert.equal(getSupabaseEnv("www.moraltrade.org").url, process.env.NEXT_PUBLIC_SUPABASE_URL);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;

    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});

test("the request proxy marks only the isolated-QA review aliases", async () => {
  const proxySource = await readFile(
    new URL("./proxy.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    proxySource,
    /isEvidencePaymentQaPreviewHost\(hostname\)[\s\S]*x-moral-trade-data-plane", "isolated-qa"/,
  );
});
