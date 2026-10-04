import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const routePath = "src/app/api/connectors/every-org/[routeId]/route.ts";
const oldRoutePath = "src/app/api/connectors/every-org/[secret]/route.ts";

test("Every.org webhook routing is explicitly non-secret and sender authentication remains first", () => {
  assert.equal(existsSync(routePath), true);
  assert.equal(existsSync(oldRoutePath), false);

  const route = readFileSync(routePath, "utf8");
  const environment = readFileSync(".env.example", "utf8");
  const auth = route.indexOf("authenticateEveryOrgPartnerWebhookRequest(request.headers)");
  const params = route.indexOf("await context.params");
  const body = route.indexOf("await request.text()");
  const database = route.indexOf("createServiceClient()");

  assert.ok(auth >= 0);
  assert.ok(params > auth);
  assert.ok(body > params);
  assert.ok(database > body);
  assert.match(route, /params: Promise<\{ routeId: string \}>/);
  assert.match(route, /resolveEveryOrgSharedConnector\(routeId,/);
  assert.doesNotMatch(route, /WEBHOOK_PATH_SECRET|webhookPathSecret/);

  assert.match(environment, /EVERY_ORG_WEBHOOK_ROUTE_ID=/);
  assert.match(environment, /not a credential and may appear in provider/);
  assert.match(
    environment,
    /Sender authentication uses the private Partner Webhook token/,
  );
  assert.doesNotMatch(environment, /EVERY_ORG_WEBHOOK_PATH_SECRET=/);
});
