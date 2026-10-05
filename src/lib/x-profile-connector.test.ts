import assert from "node:assert/strict";
import test from "node:test";

import {
  X_CONNECTION_SECRET_KEYS,
  X_PROFILE_CONNECTOR_CALLBACK_PATH,
  X_PROFILE_CONNECTOR_SCOPES,
  buildXAuthorizationUrl,
  buildXSourceConnectionInsert,
  createXOAuthAttempt,
  exchangeXAuthorizationCode,
  getSafeXProfileConnectorReturnPath,
  getXProfileConnectorAvailability,
  getXProfileUrl,
  getXUsernameFromProfileUrl,
  isMatchingXOAuthState,
  revokeXOAuthToken,
} from "@/lib/x-profile-connector";

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

const readyEnv = testEnv({
  X_PROFILE_CONNECTOR_ENABLED: "true",
  X_OAUTH_CLIENT_ID: "client-id",
  X_OAUTH_CLIENT_SECRET: "client-secret",
});

const readyConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  enabled: true as const,
  reason: "ready" as const,
  redirectUri: `https://www.moraltrade.org${X_PROFILE_CONNECTOR_CALLBACK_PATH}`,
};

test("the X connector fails closed until every production gate is ready", () => {
  assert.deepEqual(
    getXProfileConnectorAvailability({
      env: testEnv(),
      secureStorageReady: true,
      siteUrl: "https://www.moraltrade.org",
      supabaseReady: true,
    }),
    {
      enabled: false,
      reason: "disabled",
      redirectUri: `https://www.moraltrade.org${X_PROFILE_CONNECTOR_CALLBACK_PATH}`,
    },
  );

  assert.equal(
    getXProfileConnectorAvailability({
      env: readyEnv,
      secureStorageReady: false,
      siteUrl: "https://www.moraltrade.org",
      supabaseReady: true,
    }).reason,
    "secure_storage_unavailable",
  );

  assert.equal(
    getXProfileConnectorAvailability({
      env: readyEnv,
      secureStorageReady: true,
      siteUrl: "https://www.moraltrade.org",
      supabaseReady: true,
    }).reason,
    "ready",
  );
});

test("the authorization request uses S256 PKCE and only the declared read scopes", () => {
  const attempt = createXOAuthAttempt();
  const url = buildXAuthorizationUrl({ attempt, config: readyConfig });

  assert.match(attempt.state, /^[A-Za-z0-9_-]{40,}$/);
  assert.match(attempt.verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.match(attempt.challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(url.origin, "https://x.com");
  assert.equal(url.pathname, "/i/oauth2/authorize");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), X_PROFILE_CONNECTOR_SCOPES.join(" "));
  assert.equal(isMatchingXOAuthState(attempt.state, attempt.state), true);
  assert.equal(isMatchingXOAuthState(attempt.state, `${attempt.state}x`), false);
});

test("the token exchange requires the full read-only grant and a refresh token", async () => {
  let requestBody = "";
  let authorization = "";
  const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = String(init?.body ?? "");
    authorization = new Headers(init?.headers).get("Authorization") ?? "";
    return Response.json({
      access_token: "access-token",
      expires_in: 7200,
      refresh_token: "refresh-token",
      scope: X_PROFILE_CONNECTOR_SCOPES.join(" "),
      token_type: "bearer",
    });
  }) as typeof fetch;

  const tokens = await exchangeXAuthorizationCode({
    code: "authorization-code",
    codeVerifier: "code-verifier",
    config: readyConfig,
    fetchImpl,
  });

  assert.equal(tokens.refreshToken, "refresh-token");
  assert.match(authorization, /^Basic /);
  assert.equal(new URLSearchParams(requestBody).get("code_verifier"), "code-verifier");
  assert.equal(new URLSearchParams(requestBody).get("client_id"), null);

  const incompleteFetch = (async () =>
    Response.json({
      access_token: "access-token",
      expires_in: 7200,
      refresh_token: "refresh-token",
      scope: "tweet.read users.read",
      token_type: "bearer",
    })) as typeof fetch;

  await assert.rejects(
    exchangeXAuthorizationCode({
      code: "authorization-code",
      codeVerifier: "code-verifier",
      config: readyConfig,
      fetchImpl: incompleteFetch,
    }),
    /required read-only scopes/,
  );
});

test("connector return paths stay same-origin", () => {
  assert.equal(
    getSafeXProfileConnectorReturnPath("/complete-profile?source=walkthrough"),
    "/complete-profile?source=walkthrough",
  );
  assert.equal(getSafeXProfileConnectorReturnPath("//evil.example"), "/complete-profile");
  assert.equal(getSafeXProfileConnectorReturnPath("/\\evil.example"), "/complete-profile");
  assert.equal(getSafeXProfileConnectorReturnPath("https://evil.example"), "/complete-profile");
});

test("confidential-client revocation identifies the app and token", async () => {
  let requestBody = "";
  let authorization = "";
  const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = String(init?.body ?? "");
    authorization = new Headers(init?.headers).get("Authorization") ?? "";
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  assert.equal(
    await revokeXOAuthToken({ config: readyConfig, fetchImpl, token: "refresh-token" }),
    true,
  );
  assert.match(authorization, /^Basic /);
  assert.equal(new URLSearchParams(requestBody).get("client_id"), "client-id");
  assert.equal(new URLSearchParams(requestBody).get("token"), "refresh-token");
});

test("the stored connector row is consent-limited, encrypted, and expires", () => {
  const previousKey = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = "test-only-x-connector-key";

  try {
    const row = buildXSourceConnectionInsert({
      identity: { id: "2244994945", name: "Moral Trade", username: "moraltrade" },
      now: new Date("2026-07-23T00:00:00.000Z"),
      profileId: "00000000-0000-4000-8000-000000000001",
      tokens: {
        accessToken: "access-token",
        expiresInSeconds: 7200,
        refreshToken: "refresh-token",
        scope: X_PROFILE_CONNECTOR_SCOPES.join(" "),
        tokenType: "bearer",
      },
    });

    assert.equal(row.access_status, "connected");
    assert.equal(row.raw_ingestion_allowed, false);
    assert.equal(row.ai_shadow_mode_allowed, false);
    assert.deepEqual(row.allowed_field_keys, ["cause_priorities"]);
    assert.equal(row.last_import_item_count, 0);
    assert.equal(row.retention_expires_at, "2026-10-21T00:00:00.000Z");
    const encrypted = row.sensitive_ciphertexts as Record<string, unknown>;
    assert.match(String(encrypted[X_CONNECTION_SECRET_KEYS.accessToken]), /^bgenc:v2:/);
    assert.match(String(encrypted[X_CONNECTION_SECRET_KEYS.refreshToken]), /^bgenc:v2:/);
    assert.doesNotMatch(JSON.stringify(encrypted), /access-token|refresh-token/);
  } finally {
    if (previousKey === undefined) delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
    else process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previousKey;
  }
});

test("X profile URLs are normalized without accepting lookalike hosts", () => {
  assert.equal(getXProfileUrl("@moraltrade"), "https://x.com/moraltrade");
  assert.equal(getXUsernameFromProfileUrl("https://x.com/moraltrade"), "moraltrade");
  assert.equal(getXUsernameFromProfileUrl("https://x.com.evil.example/moraltrade"), "");
});
