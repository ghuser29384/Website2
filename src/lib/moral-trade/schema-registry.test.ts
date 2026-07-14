import assert from "node:assert/strict";
import test from "node:test";

import dataModelProfileSchemaJson from "../../../config/moral-trade/data-model-profile.schema.json";
import protocolProfileJson from "../../../config/moral-trade/protocol-profile.json";
import protocolProfileSchemaJson from "../../../config/moral-trade/protocol-profile.schema.json";
import publicOfferListingSchemaJson from "../../../config/moral-trade/public-offer-listing.schema.json";

import {
  getMoralTradeSchemaDocumentBySlug,
  getMoralTradeSchemaRegistry,
  validateMoralTradeSchemaRegistry,
  type MoralTradeSchemaRegistry,
} from "./schema-registry";
import { validateMoralTradeJsonSchemaSubset } from "./json-schema-subset";
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
  assert.ok(validation.checks.some((entry) => entry.id === "profile-schema-parity"));
  assert.ok(
    validation.checks.some((entry) => entry.id === "profile-json-schema-conformance"),
  );
  assert.ok(
    validation.checks.some((entry) => entry.id === "public-schema-sample-conformance"),
  );
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
  const protocolSchema = registry.schemaDocuments.find(
    (entry) => entry.key === "protocol_profile_schema",
  );

  assert.ok(protocolSchema);
  assert.ok(protocolSchema.topLevelRequiredFields.includes("provenancePersistence"));
  assert.ok(protocolSchema.schemaPropertyKeys.includes("provenancePersistence"));
  assert.ok(protocolSchema.profileTopLevelFields.includes("provenancePersistence"));
  const publicOfferSchema = registry.schemaDocuments.find(
    (entry) => entry.key === "public_offer_listing_schema",
  );

  assert.ok(publicOfferSchema);
  assert.equal(publicOfferSchema.sampleValidationCount, 8);
  assert.equal(publicOfferSchema.sampleValidationFailureCount, 0);
});

test("public offer listing schema covers the collection API payload fields", () => {
  assert.equal(publicOfferListingSchemaJson.additionalProperties, false);
  assert.ok(publicOfferListingSchemaJson.required.includes("offeredAction"));
  assert.ok(publicOfferListingSchemaJson.required.includes("requestedAction"));
  assert.ok(publicOfferListingSchemaJson.required.includes("baselineBondBadge"));
  assert.ok(publicOfferListingSchemaJson.required.includes("verificationMethod"));
  assert.ok(publicOfferListingSchemaJson.required.includes("manualReviewRequired"));
  assert.ok(publicOfferListingSchemaJson.required.includes("noEscrow"));
  assert.equal(
    publicOfferListingSchemaJson.$id,
    "https://www.moraltrade.org/schemas/moral-trade/public-offer-listing.schema.json",
  );
  assert.ok(
    Object.prototype.hasOwnProperty.call(
      publicOfferListingSchemaJson.properties,
      "baselineBondBadge",
    ),
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

test("core protocol profile schema covers provenance persistence", () => {
  assert.equal(protocolProfileSchemaJson.additionalProperties, false);
  assert.ok(protocolProfileSchemaJson.required.includes("decisionPipeline"));
  assert.ok(protocolProfileSchemaJson.required.includes("provenancePersistence"));
  assert.ok(
    Object.prototype.hasOwnProperty.call(
      protocolProfileSchemaJson.properties,
      "provenancePersistence",
    ),
  );
  assert.ok(
    Object.prototype.hasOwnProperty.call(
      protocolProfileSchemaJson.properties.provenancePersistence.properties,
      "tables",
    ),
  );
});

test("schema subset validation checks nested provenance persistence requirements", () => {
  const validationFailures = validateMoralTradeJsonSchemaSubset(
    protocolProfileJson,
    protocolProfileSchemaJson,
  );
  const weakenedSchema = {
    ...protocolProfileSchemaJson,
    properties: {
      ...protocolProfileSchemaJson.properties,
      provenancePersistence: {
        ...protocolProfileSchemaJson.properties.provenancePersistence,
        properties: {
          ...protocolProfileSchemaJson.properties.provenancePersistence.properties,
          tables: {
            ...protocolProfileSchemaJson.properties.provenancePersistence.properties.tables,
            minItems: 99,
          },
        },
      },
    },
  };
  const weakenedFailures = validateMoralTradeJsonSchemaSubset(
    protocolProfileJson,
    weakenedSchema,
  );

  assert.equal(validationFailures.length, 0);
  assert.ok(
    weakenedFailures.some((failure) =>
      failure.includes("$.provenancePersistence.tables: fewer than minItems 99"),
    ),
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
  assert.equal(registryBody.publicContract.publicPayloadSampleValidationCount, 8);
  assert.equal(registryBody.publicContract.publicPayloadSampleValidationFailureCount, 0);
  assert.ok(
    registryBody.schemaDocuments.some(
      (entry: { slug: string; sampleValidationCount: number }) =>
        entry.slug === "public-offer-listing.schema.json" &&
        entry.sampleValidationCount === 8,
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

test("schema registry validation fails if profile/schema parity weakens", () => {
  const registry = getMoralTradeSchemaRegistry();
  const weakened: MoralTradeSchemaRegistry = {
    ...registry,
    schemaDocuments: registry.schemaDocuments.map((entry) =>
      entry.key === "protocol_profile_schema"
        ? {
            ...entry,
            schemaPropertyKeys: entry.schemaPropertyKeys.filter(
              (field) => field !== "provenancePersistence",
            ),
          }
        : entry,
    ),
  };
  const validation = validateMoralTradeSchemaRegistry(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("profile-schema-parity")));
});
