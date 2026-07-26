import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Complete Profile exposes truthful optional-source states", () => {
  const page = read("src/app/complete-profile/page.tsx");
  const component = read("src/components/profile/complete-profile-connections.tsx");

  assert.match(page, /CompleteProfileConnections/);
  assert.match(component, /Effective Altruism Forum/);
  assert.match(component, /No simulated Connect button is shown/);
  assert.match(component, /Substack/);
  assert.match(component, /Publication-admin tooling is not treated as reader consent/);
  assert.match(component, /likes, bookmarks, and follow relationships/);
  assert.match(component, /never move a spark/);
  assert.match(component, /No X activity has been imported or applied/);
  assert.match(component, /method="post"/);
});

test("the real X path remains environment-gated and consent-bound", () => {
  const env = read(".env.example");
  const start = read("src/app/api/profile-sources/x/start/route.ts");
  const callback = read("src/app/api/profile-sources/x/callback/route.ts");
  const disconnect = read("src/app/api/profile-sources/x/disconnect/route.ts");

  assert.match(env, /X_PROFILE_CONNECTOR_ENABLED=false/);
  assert.match(env, /X_OAUTH_CLIENT_ID=/);
  assert.match(env, /X_OAUTH_CLIENT_SECRET=/);
  assert.match(start, /export async function POST/);
  assert.match(start, /Invalid request origin/);
  assert.match(start, /createXOAuthAttempt/);
  assert.match(start, /buildXAuthorizationUrl/);
  assert.match(start, /priority-suggestions/);
  assert.match(callback, /No X activity has been imported or applied to your sparks/);
  assert.match(disconnect, /NextResponse\.redirect\(url, 303\)/);
  assert.match(disconnect, /sensitive_ciphertexts: \{\}/);
  assert.match(disconnect, /revokeXOAuthToken/);
});
