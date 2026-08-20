import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as sharedConnectorPost } from "@/app/api/connectors/every-org/[routeId]/route";
import { POST as mpgfConnectorPost } from "@/app/api/mpgf/every-org/webhook/route";
import {
  authenticateEveryOrgPartnerWebhookRequest,
  EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS,
  getEveryOrgCredentialConfiguration,
  isValidEveryOrgWebhookRouteId,
  resolveEveryOrgSharedConnector,
} from "@/lib/every-org-partner-webhook-auth";

const publicToken = "phase-a-public-donate-link-token";
const privateToken = "phase-a-private-partner-authorization-token";
const routeId = "phase-a-webhook-route-id-000000000001";

const distinctCredentialEnvironment = {
  EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN: publicToken,
  EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN: privateToken,
};

function walkFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);

    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

test("credential directions are explicit and the private value never leaves the server-side inspection boundary", () => {
  const configuration = getEveryOrgCredentialConfiguration(
    distinctCredentialEnvironment,
  );
  const serialized = JSON.stringify(configuration);

  assert.equal(configuration.donateLinkWebhookToken, publicToken);
  assert.equal(configuration.partnerWebhookAuthorizationTokenConfigured, true);
  assert.equal(
    configuration.partnerWebhookAuthorizationContract,
    EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS,
  );
  assert.equal(configuration.credentialConfigurationValid, true);
  assert.equal(configuration.partnerWebhookAuthorizationReady, false);
  assert.equal(serialized.includes(publicToken), true);
  assert.equal(serialized.includes(privateToken), false);
});

test("missing, equal, and legacy credentials all fail closed without aliasing", () => {
  const missingPrivate = getEveryOrgCredentialConfiguration({
    EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN: publicToken,
  });
  const equal = getEveryOrgCredentialConfiguration({
    EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN: privateToken,
    EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN: privateToken,
  });
  const legacy = getEveryOrgCredentialConfiguration({
    ...distinctCredentialEnvironment,
    EVERY_ORG_WEBHOOK_TOKEN: "legacy-token",
  });

  assert.equal(missingPrivate.credentialConfigurationValid, false);
  assert.equal(equal.credentialConfigurationValid, false);
  assert.equal(equal.donateLinkWebhookToken, "");
  assert.equal(JSON.stringify(equal).includes(privateToken), false);
  assert.equal(legacy.credentialConfigurationValid, false);
  assert.deepEqual(legacy.unsupportedCredentialEnvironmentNames, [
    "EVERY_ORG_WEBHOOK_TOKEN",
  ]);
});

test("the provider authenticator is explicitly unconfirmed and accepts no guessed header", () => {
  const unconfirmed = authenticateEveryOrgPartnerWebhookRequest(
    distinctCredentialEnvironment,
  );
  const invalid = authenticateEveryOrgPartnerWebhookRequest({});

  assert.deepEqual(unconfirmed, {
    authorized: false,
    status: "unconfirmed",
  });
  assert.deepEqual(invalid, {
    authorized: false,
    status: "configuration_invalid",
  });
});

test("webhook route IDs are opaque non-secret routing values with a closed URL-safe grammar", () => {
  assert.equal(isValidEveryOrgWebhookRouteId(routeId), true);
  assert.equal(
    isValidEveryOrgWebhookRouteId("another-phase-a-webhook-route-id-000001"),
    true,
  );
  assert.equal(isValidEveryOrgWebhookRouteId("too-short"), false);
  assert.equal(
    isValidEveryOrgWebhookRouteId("route-id-with-a-slash/0000000000000000"),
    false,
  );
  assert.equal(
    isValidEveryOrgWebhookRouteId("route id with spaces 000000000000000000"),
    false,
  );
});

test("the shared connector accepts its defense-in-depth route ID only for one compatible ready configuration", () => {
  const direct = {
    mechanism: "direct_donation_upgrade" as const,
    enabled: true,
    ready: true,
    environment: "staging" as const,
    webhookRouteId: routeId,
  };
  const pledge = {
    mechanism: "pledge_donation" as const,
    enabled: true,
    ready: true,
    environment: "staging" as const,
    webhookRouteId: routeId,
  };

  assert.equal(
    resolveEveryOrgSharedConnector(routeId, [direct]).accepted,
    true,
  );
  assert.equal(
    resolveEveryOrgSharedConnector(routeId, [direct, pledge]).accepted,
    true,
  );
  assert.equal(
    resolveEveryOrgSharedConnector("wrong-path", [direct]).status,
    "route_id_mismatch",
  );
  assert.equal(
    resolveEveryOrgSharedConnector(routeId, [
      direct,
      { ...pledge, environment: "live" },
    ]).status,
    "environment_ambiguous",
  );
  assert.equal(
    resolveEveryOrgSharedConnector(routeId, [
      direct,
      {
        ...pledge,
        webhookRouteId:
          "another-phase-a-webhook-route-id-000000000001",
      },
    ]).status,
    "route_id_ambiguous",
  );
  assert.equal(
    resolveEveryOrgSharedConnector(routeId, [
      { ...direct, ready: false },
    ]).status,
    "mechanism_not_ready",
  );
});

test("shared connector rejects before body parsing, direct dispatch, Supabase creation, or sensitive logging", async (t) => {
  let textCalls = 0;
  const consoleError = t.mock.method(console, "error");
  const request = {
    async text() {
      textCalls += 1;
      throw new Error("body must not be read");
    },
  } as unknown as Request;
  const response = await sharedConnectorPost(
    request,
    { params: Promise.resolve({ routeId }) },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false });
  assert.equal(textCalls, 0);
  assert.equal(consoleError.mock.callCount(), 0);
});

test("MPGF connector rejects before JSON parsing, event normalization, persistence, or logging", async (t) => {
  let jsonCalls = 0;
  const consoleError = t.mock.method(console, "error");
  const request = {
    async json() {
      jsonCalls += 1;
      throw new Error("body must not be parsed");
    },
  } as unknown as Request;
  const response = await mpgfConnectorPost(request);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false });
  assert.equal(jsonCalls, 0);
  assert.equal(consoleError.mock.callCount(), 0);
});

test("client components and Donate Link builders never reference the private credential variable", () => {
  const privateEnvironmentName =
    "EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN";
  const clientSources = walkFiles("src")
    .filter((path) => /\.(?:ts|tsx)$/.test(path))
    .map((path) => readFileSync(path, "utf8"))
    .filter((source) => /^\s*["']use client["'];/m.test(source));
  const outboundSources = [
    "src/lib/direct-donation-upgrade.ts",
    "src/lib/trade-donation.ts",
    "src/lib/mpgf/public-goods-every-org.ts",
    "src/app/api/mpgf/every-org/donate-link/route.ts",
  ].map((path) => readFileSync(path, "utf8"));

  for (const source of [...clientSources, ...outboundSources]) {
    assert.equal(source.includes(privateEnvironmentName), false);
  }

  const inboundSources = [
    "src/app/api/connectors/every-org/[routeId]/route.ts",
    "src/app/api/mpgf/every-org/webhook/route.ts",
  ].map((path) => readFileSync(path, "utf8"));
  for (const source of inboundSources) {
    assert.doesNotMatch(
      source,
      /headers\.get\(|Bearer\s|x-mpgf-every-org-webhook-secret|mpgf-every-org-webhook-secret/i,
    );
  }
});
