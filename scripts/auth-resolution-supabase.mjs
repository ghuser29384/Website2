import { generateKeyPairSync, sign } from "node:crypto";
import http from "node:http";

const host = process.env.AUTH_RESOLUTION_SUPABASE_HOST ?? "127.0.0.1";
const port = Number(process.env.AUTH_RESOLUTION_SUPABASE_PORT ?? "3231");
const publicOrigin = new URL(
  process.env.AUTH_RESOLUTION_PUBLIC_URL ?? `http://${host}:${port}`,
).origin;
const fixtureControlSecret = process.env.AUTH_RESOLUTION_FIXTURE_CONTROL_SECRET;

if (!fixtureControlSecret) {
  throw new Error("AUTH_RESOLUTION_FIXTURE_CONTROL_SECRET is required.");
}

const USER_ID = "fa100000-0000-4000-8000-000000000630";
const OTHER_USER_ID = "fa100000-0000-4000-8000-000000000631";
const SESSION_ID = "fa100000-0000-4000-8000-000000000632";
const ISSUER = `${publicOrigin}/auth/v1`;
const KEY_ID = "auth-resolution-ephemeral-es256";
const nowSeconds = Math.floor(Date.now() / 1_000);

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const publicJwk = {
  ...publicKey.export({ format: "jwk" }),
  alg: "ES256",
  key_ops: ["verify"],
  kid: KEY_ID,
  use: "sig",
};

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signedFixtureToken({ expired = false, mode, subject = USER_ID }) {
  const encodedHeader = base64Url({ alg: "ES256", kid: KEY_ID, typ: "JWT" });
  const encodedPayload = base64Url({
    aal: "aal1",
    aud: "authenticated",
    email: "auth-resolution@qa.invalid",
    exp: expired ? nowSeconds - 60 : nowSeconds + 3_600,
    iat: nowSeconds - 60,
    is_anonymous: false,
    iss: ISSUER,
    jti: `auth-resolution-${mode}`,
    role: "authenticated",
    session_id: SESSION_ID,
    sub: subject,
  });
  const signature = sign(
    "sha256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    { dsaEncoding: "ieee-p1363", key: privateKey },
  ).toString("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function fixtureUser(id = USER_ID) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "auth-resolution@qa.invalid",
    email_confirmed_at: "2026-08-13T12:00:00.000Z",
    phone: "",
    confirmed_at: "2026-08-13T12:00:00.000Z",
    last_sign_in_at: "2026-08-13T12:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Auth Resolution QA" },
    identities: [],
    created_at: "2026-08-13T12:00:00.000Z",
    updated_at: "2026-08-13T12:00:00.000Z",
    is_anonymous: false,
  };
}

const validTokens = {
  delayed: signedFixtureToken({ mode: "delayed" }),
  expired: signedFixtureToken({ expired: true, mode: "expired" }),
  fast: signedFixtureToken({ mode: "fast" }),
  mismatch: signedFixtureToken({ mode: "mismatch" }),
};
const invalidKeyPair = generateKeyPairSync("ec", { namedCurve: "P-256" });
function invalidSignatureToken() {
  const encodedHeader = base64Url({ alg: "ES256", kid: KEY_ID, typ: "JWT" });
  const encodedPayload = base64Url({
    aud: "authenticated",
    exp: nowSeconds + 3_600,
    iat: nowSeconds - 60,
    iss: ISSUER,
    jti: "auth-resolution-invalid",
    role: "authenticated",
    session_id: SESSION_ID,
    sub: USER_ID,
  });
  const signature = sign(
    "sha256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    { dsaEncoding: "ieee-p1363", key: invalidKeyPair.privateKey },
  ).toString("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
const tokens = { ...validTokens, invalid: invalidSignatureToken() };
const modeByToken = new Map(Object.entries(tokens).map(([mode, token]) => [token, mode]));
const attempts = new Map();
const verificationEvents = [];
let verificationGateEnabled = false;
let verificationGateSequence = 0;
const pendingVerificationGates = new Map();

function fixtureSession(mode) {
  const accessToken = tokens[mode];
  const sessionUserId = mode === "mismatch" ? OTHER_USER_ID : USER_ID;
  return {
    access_token: accessToken,
    refresh_token: `auth-resolution-refresh-${mode}`,
    // Keep the untrusted cookie metadata current even for the expired fixture.
    // The verifier must reject that fixture from the signed JWT's actual `exp`,
    // without turning the case into a refresh-token test.
    expires_in: 3_600,
    expires_at: nowSeconds + 3_600,
    token_type: "bearer",
    user: fixtureUser(sessionUserId),
  };
}

function cookieValue(value) {
  return `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "access-control-allow-origin": "*",
    "cache-control": "private, no-store",
    "content-type": "application/json; charset=utf-8",
    "x-supabase-api-version": "2024-01-01",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function bearerToken(request) {
  const authorization = request.headers.authorization ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function hasFixtureControlAccess(request) {
  return request.headers["x-auth-resolution-fixture-control"] === fixtureControlSecret;
}

function releaseVerificationGate(gateId) {
  const gate = pendingVerificationGates.get(gateId);
  if (!gate) return false;
  gate.release();
  return true;
}

function cancelPendingVerificationGates() {
  const gateIds = [...pendingVerificationGates.keys()];
  for (const gateId of gateIds) pendingVerificationGates.get(gateId)?.cancel();
  return gateIds;
}

function emptyPostgrest(response, request) {
  const isHead = request.method === "HEAD";
  response.writeHead(200, {
    "access-control-allow-origin": "*",
    "content-profile": "public",
    "content-range": "*/0",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(isHead ? undefined : "[]");
}

function selectedPostgrest(response, request, url) {
  if (url.pathname === "/rest/v1/profiles") {
    const fixtureProfile = {
      ...fixtureUser(USER_ID),
      bio: "",
      city: "",
      country: "",
      display_name: "Auth Resolution QA",
      public_location_granularity: "hidden",
      region: "",
      username: null,
    };
    const acceptProfile = request.headers.acceptprofile ?? "public";
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-profile": acceptProfile,
      "content-type": "application/vnd.pgrst.object+json; charset=utf-8",
    });
    response.end(JSON.stringify(fixtureProfile));
    return true;
  }
  return false;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-headers":
        "authorization,apikey,content-type,x-auth-resolution-fixture-control,x-client-info",
      "access-control-allow-methods": "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-origin": "*",
    });
    response.end();
    return;
  }

  if (url.pathname.startsWith("/__fixture/") && !hasFixtureControlAccess(request)) {
    json(response, 404, { message: "Auth-resolution fixture endpoint not found." });
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    json(response, 200, { ready: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__fixture/reset") {
    const cancelledVerificationGateIds = cancelPendingVerificationGates();
    attempts.clear();
    verificationEvents.splice(0, verificationEvents.length);
    verificationGateEnabled = false;
    json(response, 200, { cancelledVerificationGateIds, reset: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__fixture/verification-gate") {
    verificationGateEnabled = true;
    json(response, 200, { enabled: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__fixture/verification-gate/release") {
    const gateId = url.searchParams.get("gateId") ?? "";
    if (!releaseVerificationGate(gateId)) {
      json(response, 409, { message: "Verification gate is not pending." });
      return;
    }
    json(response, 200, { gateId, released: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__fixture/session") {
    const mode = url.searchParams.get("mode") ?? "delayed";
    if (!(mode in tokens)) {
      json(response, 400, { message: "Unsupported auth-resolution fixture mode." });
      return;
    }
    const session = fixtureSession(mode);
    json(response, 200, {
      accessToken: session.access_token,
      // supabase-js derives the default storage key from the configured URL
      // hostname. This localhost fixture therefore uses `127`, not a hosted
      // Supabase project ref.
      cookieName: `sb-${new URL(ISSUER).hostname.split(".")[0]}-auth-token`,
      cookieValue: cookieValue(session),
      issuer: ISSUER,
      session,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__fixture/stats") {
    json(response, 200, Object.fromEntries(attempts));
    return;
  }

  if (request.method === "GET" && url.pathname === "/__fixture/events") {
    json(response, 200, {
      attempts: Object.fromEntries(attempts),
      verificationEvents,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/.well-known/jwks.json") {
    json(response, 200, { keys: [publicJwk] }, { "cache-control": "no-store" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/auth/v1/token") {
    json(response, 400, {
      code: "refresh_token_not_found",
      message: "Invalid Refresh Token: Refresh Token Not Found",
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/user") {
    const mode = modeByToken.get(bearerToken(request)) ?? "unknown";
    const nextAttempt = (attempts.get(mode) ?? 0) + 1;
    attempts.set(mode, nextAttempt);
    process.stdout.write(
      `Auth-resolution fixture verification mode=${mode} attempt=${nextAttempt}.\n`,
    );

    if (mode === "delayed" && nextAttempt === 1) {
      verificationEvents.push({
        delayMs: 250,
        mode,
        nextAttempt,
        result: "retryable_503",
      });
      setTimeout(() => {
        json(response, 503, { code: "temporarily_unavailable", message: "fixture retry" });
      }, 250);
      return;
    }

    if (mode === "expired") {
      verificationEvents.push({ mode, nextAttempt, result: "definitive_401" });
      json(response, 401, { code: "bad_jwt", message: "JWT expired" });
      return;
    }

    if (mode === "fast" || mode === "delayed" || mode === "mismatch") {
      if (mode === "delayed" && verificationGateEnabled) {
        const gateId = `verification-${++verificationGateSequence}`;
        verificationEvents.push({ gateId, mode, nextAttempt, result: "pending_verified_user" });
        let settled = false;
        let expiry;
        const cleanup = () => {
          pendingVerificationGates.delete(gateId);
          clearTimeout(expiry);
          response.off("close", cancel);
        };
        const cancel = () => {
          if (settled) return;
          settled = true;
          cleanup();
          verificationEvents.push({ gateId, mode, nextAttempt, result: "cancelled_verified_user" });
          response.destroy();
        };
        const release = () => {
          if (settled) return;
          settled = true;
          cleanup();
          verificationEvents.push({ gateId, mode, nextAttempt, result: "verified_user" });
          json(response, 200, fixtureUser(USER_ID));
        };
        expiry = setTimeout(cancel, 9_000);
        expiry.unref();
        response.once("close", cancel);
        pendingVerificationGates.set(gateId, { cancel, release });
        return;
      }
      verificationEvents.push({ mode, nextAttempt, result: "verified_user" });
      json(response, 200, fixtureUser(USER_ID));
      return;
    }

    verificationEvents.push({ mode, nextAttempt, result: "definitive_401" });
    json(response, 401, { code: "bad_jwt", message: "Invalid JWT signature" });
    return;
  }

  if (url.pathname.startsWith("/rest/v1/")) {
    if (selectedPostgrest(response, request, url)) return;
    emptyPostgrest(response, request);
    return;
  }

  json(response, 404, { message: "Auth-resolution fixture endpoint not found." });
});

server.listen(port, host, () => {
  process.stdout.write(
    `Auth-resolution Supabase fixture ready at http://${host}:${port}; public origin ${publicOrigin}.\n`,
  );
});
