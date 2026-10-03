import assert from "node:assert/strict";
import test from "node:test";

import {
  getEnabledOAuthProviders,
  isOAuthProviderEnabled,
} from "@/lib/auth-provider-settings";
import { getSupabaseEnv } from "@/lib/supabase/config";

const ORIGINAL_FETCH = globalThis.fetch;

function restoreEnv(
  previousUrl: string | undefined,
  previousKey: string | undefined,
) {
  if (previousUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }

  if (previousKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
}

test("Supabase OAuth provider settings use the checked-in public defaults without env overrides", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const requests: string[] = [];

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const defaults = getSupabaseEnv();
  globalThis.fetch = async (input, init) => {
    requests.push(input.toString());
    assert.equal((init?.headers as Record<string, string>).apikey, defaults.publishableKey);
    return new Response(JSON.stringify({ external: { twitter: true } }), { status: 200 });
  };

  try {
    assert.deepEqual(await getEnabledOAuthProviders(), ["twitter"]);
    assert.deepEqual(requests, [`${defaults.url}/auth/v1/settings`]);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    restoreEnv(previousUrl, previousKey);
  }
});

test("Supabase OAuth provider settings omit product-disabled providers", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://example.supabase.co/auth/v1/settings");
    assert.equal((init?.headers as Record<string, string>).apikey, "publishable-test-key");
    return new Response(
      JSON.stringify({ external: { google: true, apple: true, facebook: true } }),
      { status: 200 },
    );
  };

  try {
    assert.deepEqual(await getEnabledOAuthProviders(), ["google", "facebook"]);
    assert.equal(await isOAuthProviderEnabled("google"), true);
    assert.equal(await isOAuthProviderEnabled("apple"), false);
    assert.equal(await isOAuthProviderEnabled("facebook"), true);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    restoreEnv(previousUrl, previousKey);
  }
});

test("Supabase OAuth provider settings include X when authorize accepts OAuth 2 provider", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const fetches: string[] = [];

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.moraltrade.org";
  globalThis.fetch = async (input, init) => {
    const requestUrl = input.toString();
    fetches.push(requestUrl);
    assert.equal((init?.headers as Record<string, string>).apikey, "publishable-test-key");

    if (requestUrl === "https://example.supabase.co/auth/v1/settings") {
      return new Response(
        JSON.stringify({ external: { google: true, twitter: false } }),
        { status: 200 },
      );
    }

    const authorizeUrl = new URL(requestUrl);
    assert.equal(authorizeUrl.pathname, "/auth/v1/authorize");
    assert.equal(authorizeUrl.searchParams.get("provider"), "x");
    assert.equal(
      authorizeUrl.searchParams.get("redirect_to"),
      "https://www.moraltrade.org/auth/confirm?next=%2Fdashboard&mode=login",
    );
    assert.equal(init?.redirect, "manual");
    return new Response(null, {
      headers: { location: "https://x.com/i/oauth2/authorize" },
      status: 302,
    });
  };

  try {
    assert.deepEqual(await getEnabledOAuthProviders(), ["google", "x"]);
    assert.deepEqual(fetches, [
      "https://example.supabase.co/auth/v1/settings",
      "https://example.supabase.co/auth/v1/authorize?provider=x&redirect_to=https%3A%2F%2Fwww.moraltrade.org%2Fauth%2Fconfirm%3Fnext%3D%252Fdashboard%26mode%3Dlogin",
    ]);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    restoreEnv(previousUrl, previousKey);
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

test("Supabase OAuth provider settings do not include X when authorize rejects it", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  globalThis.fetch = async (input) => {
    const requestUrl = input.toString();
    if (requestUrl === "https://example.supabase.co/auth/v1/settings") {
      return new Response(
        JSON.stringify({ external: { google: true, twitter: false } }),
        { status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ error_code: "validation_failed", msg: "Unsupported provider" }),
      { status: 400 },
    );
  };

  try {
    assert.deepEqual(await getEnabledOAuthProviders(), ["google"]);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    restoreEnv(previousUrl, previousKey);
  }
});
