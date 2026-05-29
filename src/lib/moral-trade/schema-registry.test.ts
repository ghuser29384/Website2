import assert from "node:assert/strict";
import test from "node:test";

import dataModelProfileSchemaJson from "../../../config/moral-trade/data-model-profile.schema.json";
import publicOfferListingSchemaJson from "../../../config/moral-trade/public-offer-listing.schema.json";

import {
  getMoralTradeSchemaDocumentBySlug,
  getMoralTradeSchemaRegistry,
  validateMoralTradeSchemaRegistry,
  type MoralTradeSchemaRegistry,
} from "./schema-registry";
import { GET as schemaRegistryRoute } from "../../app/api/moral-trade/schemas/route";
import { GET as schemaDocumentRoute } from "../../app/schemas/moral-trade/[schema]/route";

test("schema registry publishes every core Moral Trade JSON Schema document", () => {
  const registry = getMoralTradeSchemaRegistry();
  const validation = validateMoralTradeSchemaRegistry(registry);
  const keys = registry.schemaDocuments.map((entry) => entry.key);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(keys.includes("protocol_profile_schema"));
  assert.ok(keys.includes("data_model_profile_schema"));
  assert.ok(keys.includes("api_contract_profile_schema"));
  assert.ok(keys.includes("copilot_contract_schema"));
  assert.ok(keys.includes("incident_response_profile_schema"));
  assert.ok(keys.includes("public_offer_listing_schema"));
  assert.ok(
    registry.schemaDocuments.every((entry) =>
      entry.publicPath.startsWith("/schemas/moral-trade/"),
    ),
  );
  assert.ok(
    registry.schemaDocuments.every((entry) =>
      entry.schemaId.startsWith("https://www.moraltrade.org/schemas/moral-trade/"),
    ),
  );
});

test("public offer listing schema covers the collection API payload fields", () => {
  assert.equal(publicOfferListingSchemaJson.additionalProperties, false);
  assert.ok(publicOfferListingSchemaJson.required.includes("offeredAction"));
  assert.ok(publicOfferListingSchemaJson.required.includes("requestedAction"));
  assert.ok(publicOfferListingSchemaJson.required.includes("verificationMethod"));
  assert.ok(publicOfferListingSchemaJson.required.includes("manualReviewRequired"));
  assert.ok(publicOfferListingSchemaJson.required.includes("noEscrow"));
  assert.equal(
    publicOfferListingSchemaJson.$id,
    "https://www.moraltrade.org/schemas/moral-trade/public-offer-listing.schema.json",
  );
});

test("data model profile schema covers entity, privacy, relationship, and non-claim fields", () => {
  assert.equal(dataModelProfileSchemaJson.additionalProperties, false);
  assert.ok(dataModelProfileSchemaJson.required.includes("entities"));
  assert.ok(dataModelProfileSchemaJson.required.includes("privacyClasses"));
  assert.ok(dataModelProfileSchemaJson.required.includes("offerRequiredFields"));
  assert.ok(dataModelProfileSchemaJson.required.includes("relationshipBoundaries"));
  assert.ok(dataModelProfileSchemaJson.required.includes("nonClaims"));
  assert.ok(
    Object.prototype.hasOwnProperty.call(dataModelProfileSchemaJson.properties, "entities"),
  );
  assert.equal(
    dataModelProfileSchemaJson.$id,
    "https://www.moraltrade.org/schemas/moral-trade/data-model-profile.schema.json",
  );
});

test("schema document lookup returns exact schema documents by public slug", () => {
  const found = getMoralTradeSchemaDocumentBySlug("data-model-profile.schema.json");
  const missing = getMoralTradeSchemaDocumentBySlug("unknown.schema.json");

  assert.ok(found);
  assert.equal(found.entry.key, "data_model_profile_schema");
  assert.equal(found.document.$id, found.entry.schemaId);
  assert.equal(
    getMoralTradeSchemaDocumentBySlug("public-offer-listing.schema.json")?.entry.key,
    "public_offer_listing_schema",
  );
  assert.equal(missing, null);
});

test("schema registry and public schema routes return validator-backed JSON", async () => {
  const registryResponse = await schemaRegistryRoute(
    new Request("http://localhost/api/moral-trade/schemas"),
  );
  const registryBody = await registryResponse.json();
  const schemaResponse = await schemaDocumentRoute(
    new Request("http://localhost/schemas/moral-trade/data-model-profile.schema.json"),
    { params: Promise.resolve({ schema: "data-model-profile.schema.json" }) },
  );
  const schemaBody = await schemaResponse.json();

  assert.equal(registryResponse.status, 200);
  assert.equal(registryBody.ok, true);
  assert.ok(
    registryBody.schemaDocuments.some(
      (entry: { slug: string }) => entry.slug === "data-model-profile.schema.json",
    ),
  );
  assert.equal(schemaResponse.status, 200);
  assert.equal(
    schemaBody.$id,
    "https://www.moraltrade.org/schemas/moral-trade/data-model-profile.schema.json",
  );
  assert.ok(schemaBody.required.includes("entities"));
});

test("schema registry validation fails if public ids or strict schema shape weaken", () => {
  const registry = getMoralTradeSchemaRegistry();
  const weakened: MoralTradeSchemaRegistry = {
    ...registry,
    schemaDocuments: registry.schemaDocuments.map((entry) =>
      entry.key === "data_model_profile_schema"
        ? {
            ...entry,
            publicPath: "/api/private/data-model-profile.schema.json",
            schemaId: "https://example.com/private/data-model-profile.schema.json",
            topLevelRequiredFields: entry.topLevelRequiredFields.filter(
              (field) => field !== "entities",
            ),
          }
        : entry,
    ),
    registryTests: registry.registryTests.filter(
      (testHook) => testHook !== "data_model_profile_json_schema",
    ),
  };
  const validation = validateMoralTradeSchemaRegistry(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-schema-paths")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("data-model-schema")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("registry-tests")));
});
