#!/usr/bin/env node

const MANAGEMENT_API_BASE_URL = "https://api.supabase.com/v1";

function readArg(name) {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  return null;
}

function deriveProjectRef() {
  const explicit = readArg("--project-ref") ?? readEnv("SUPABASE_PROJECT_REF", "PROJECT_REF");
  if (explicit) {
    return explicit;
  }

  const projectUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  if (!projectUrl) {
    return null;
  }

  try {
    const hostname = new URL(projectUrl).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : null;
  } catch {
    return null;
  }
}

function requireValue(value, label) {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

function buildPatchPayload() {
  const payload = {};

  const googleClientId = readEnv("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID");
  const googleSecret = readEnv("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET");
  if (googleClientId || googleSecret) {
    payload.external_google_enabled = true;
    payload.external_google_client_id = requireValue(googleClientId, "GOOGLE_OAUTH_CLIENT_ID");
    payload.external_google_secret = requireValue(googleSecret, "GOOGLE_OAUTH_CLIENT_SECRET");
  }

  const appleClientId = readEnv("APPLE_OAUTH_CLIENT_ID", "APPLE_CLIENT_ID");
  const appleSecret = readEnv("APPLE_OAUTH_CLIENT_SECRET", "APPLE_CLIENT_SECRET");
  if (appleClientId || appleSecret) {
    payload.external_apple_enabled = true;
    payload.external_apple_client_id = requireValue(appleClientId, "APPLE_OAUTH_CLIENT_ID");
    payload.external_apple_secret = requireValue(appleSecret, "APPLE_OAUTH_CLIENT_SECRET");
  }

  if (!Object.keys(payload).length) {
    throw new Error(
      "Set Google or Apple OAuth credentials before running this script. Expected GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET and/or APPLE_OAUTH_CLIENT_ID/APPLE_OAUTH_CLIENT_SECRET.",
    );
  }

  return payload;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = json?.message ?? json?.error ?? text;
    throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail}` : ""}`);
  }

  return json;
}

async function readPublicProviderSettings() {
  const projectUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const publishableKey = readEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  );

  if (!projectUrl || !publishableKey) {
    return null;
  }

  const settings = await requestJson(`${projectUrl.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
    },
  });

  return {
    google: settings.external?.google === true,
    apple: settings.external?.apple === true,
  };
}

function summarizePayload(payload) {
  return {
    google: payload.external_google_enabled === true,
    apple: payload.external_apple_enabled === true,
    fields: Object.keys(payload).sort(),
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`Usage:
SUPABASE_ACCESS_TOKEN=... \\
GOOGLE_OAUTH_CLIENT_ID=... \\
GOOGLE_OAUTH_CLIENT_SECRET=... \\
APPLE_OAUTH_CLIENT_ID=org.moraltrade.web \\
APPLE_OAUTH_CLIENT_SECRET=... \\
npm run auth:configure-oauth

Optional:
  SUPABASE_PROJECT_REF=jnpoxvalyjtdghnperyu
  NEXT_PUBLIC_SUPABASE_URL=https://jnpoxvalyjtdghnperyu.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
  --project-ref=jnpoxvalyjtdghnperyu
  --dry-run

Apple uses the generated Sign in with Apple client-secret JWT, not the raw .p8 key.`);
    return;
  }

  const projectRef = requireValue(deriveProjectRef(), "SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL");
  const payload = buildPatchPayload();
  const summary = summarizePayload(payload);

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ projectRef, dryRun: true, patch: summary }, null, 2));
    return;
  }

  const accessToken = requireValue(readEnv("SUPABASE_ACCESS_TOKEN"), "SUPABASE_ACCESS_TOKEN");
  await requestJson(`${MANAGEMENT_API_BASE_URL}/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const publicSettings = await readPublicProviderSettings();
  console.log(JSON.stringify({ projectRef, patched: summary, publicSettings }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
