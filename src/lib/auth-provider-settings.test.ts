import assert from "node:assert/strict";
import test from "node:test";

import {
  getEnabledOAuthProviders,
  isOAuthProviderEnabled,
} from "@/lib/auth-provider-settings";

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

test("Supabase OAuth provider settings fail closed without Supabase env", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let fetched = false;

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  globalThis.fetch = async () => {
    fetched = true;
    return new Response("{}");
  };

  try {
    assert.deepEqual(await getEnabledOAuthProviders(), []);
    assert.equal(fetched, false);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    restoreEnv(previousUrl, previousKey);
  }
});

test("Supabase OAuth provider settings mirror enabled external providers", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://example.supabase.co/auth/v1/settings");
    assert.equal((init?.headers as Record<string, string>).apikey, "publishable-test-key");
    return new Response(
      JSON.stringify({ external: { google: true, apple: false, facebook: true } }),
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
