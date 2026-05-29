import aiGovernanceProfileSchemaJson from "../../../config/moral-trade/ai-governance-profile.schema.json";
import apiContractProfileSchemaJson from "../../../config/moral-trade/api-contract-profile.schema.json";
import copilotContractSchemaJson from "../../../config/moral-trade/copilot-contract.schema.json";
import dataModelProfileSchemaJson from "../../../config/moral-trade/data-model-profile.schema.json";
import evaluationProfileSchemaJson from "../../../config/moral-trade/evaluation-profile.schema.json";
import externalityProfileSchemaJson from "../../../config/moral-trade/externality-profile.schema.json";
import incidentResponseProfileSchemaJson from "../../../config/moral-trade/incident-response-profile.schema.json";
import operationsProfileSchemaJson from "../../../config/moral-trade/operations-profile.schema.json";
import performanceProfileSchemaJson from "../../../config/moral-trade/performance-profile.schema.json";
import protocolProfileSchemaJson from "../../../config/moral-trade/protocol-profile.schema.json";
import publicOfferListingSchemaJson from "../../../config/moral-trade/public-offer-listing.schema.json";
import securityProfileSchemaJson from "../../../config/moral-trade/security-profile.schema.json";

export const MORAL_TRADE_SCHEMA_REGISTRY_VERSION =
  "moral-trade-schema-registry-v0.1-2026-05";
export const MORAL_TRADE_SCHEMA_REGISTRY_VALIDATOR_VERSION =
  "moral-trade-schema-registry-validator-v0.1";

export type MoralTradeJsonSchemaDocument = Record<string, unknown> & {
  $schema?: string;
  $id?: string;
  title?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
};

export type MoralTradeSchemaRegistryEntry = {
  key: string;
  label: string;
  slug: string;
  profileKey: string;
  publicPath: string;
  schemaId: string;
  title: string;
  topLevelRequiredFields: string[];
  propertyCount: number;
};

export type MoralTradeSchemaRegistry = {
  version: string;
  purpose: string;
  schemaDocuments: MoralTradeSchemaRegistryEntry[];
  registryTests: string[];
};

export type MoralTradeSchemaRegistryCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
};

export type MoralTradeSchemaRegistryValidation = {
  status: "pass" | "fail";
  validatorName: "moral-trade-schema-registry";
  validatorVersion: string;
  registryVersion: string;
  checks: MoralTradeSchemaRegistryCheck[];
  blockers: string[];
};

type SchemaSource = {
  key: string;
  label: string;
  slug: string;
  profileKey: string;
  document: MoralTradeJsonSchemaDocument;
};

const SCHEMA_SOURCES: SchemaSource[] = [
  {
    key: "ai_governance_profile_schema",
    label: "AI governance profile schema",
    slug: "ai-governance-profile.schema.json",
    profileKey: "ai_governance",
    document: aiGovernanceProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "api_contract_profile_schema",
    label: "API contract profile schema",
    slug: "api-contract-profile.schema.json",
    profileKey: "api_contract",
    document: apiContractProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "copilot_contract_schema",
    label: "Copilot contract schema",
    slug: "copilot-contract.schema.json",
    profileKey: "copilot_contract",
    document: copilotContractSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "data_model_profile_schema",
    label: "Data model profile schema",
    slug: "data-model-profile.schema.json",
    profileKey: "data_model",
    document: dataModelProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "evaluation_profile_schema",
    label: "Evaluation profile schema",
    slug: "evaluation-profile.schema.json",
    profileKey: "evaluation",
    document: evaluationProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "externality_profile_schema",
    label: "Externality profile schema",
    slug: "externality-profile.schema.json",
    profileKey: "externality",
    document: externalityProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "incident_response_profile_schema",
    label: "Incident response profile schema",
    slug: "incident-response-profile.schema.json",
    profileKey: "incident_response",
    document: incidentResponseProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "operations_profile_schema",
    label: "Operations profile schema",
    slug: "operations-profile.schema.json",
    profileKey: "operations",
    document: operationsProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "performance_profile_schema",
    label: "Performance profile schema",
    slug: "performance-profile.schema.json",
    profileKey: "performance",
    document: performanceProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "protocol_profile_schema",
    label: "Core protocol profile schema",
    slug: "protocol-profile.schema.json",
    profileKey: "protocol",
    document: protocolProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "public_offer_listing_schema",
    label: "Public offer listing schema",
    slug: "public-offer-listing.schema.json",
    profileKey: "public_offers",
    document: publicOfferListingSchemaJson as MoralTradeJsonSchemaDocument,
  },
  {
    key: "security_profile_schema",
    label: "Security profile schema",
    slug: "security-profile.schema.json",
    profileKey: "security",
    document: securityProfileSchemaJson as MoralTradeJsonSchemaDocument,
  },
];

const REQUIRED_SCHEMA_KEYS = [
  "ai_governance_profile_schema",
  "api_contract_profile_schema",
  "copilot_contract_schema",
  "data_model_profile_schema",
  "evaluation_profile_schema",
  "externality_profile_schema",
  "incident_response_profile_schema",
  "operations_profile_schema",
  "performance_profile_schema",
  "protocol_profile_schema",
  "public_offer_listing_schema",
  "security_profile_schema",
] as const;

const REQUIRED_TESTS = [
  "schema_registry_validator",
  "data_model_profile_json_schema",
  "schema_document_route_smoke",
  "api_contract_schema_registry_route",
  "technical_spec_schema_registry_smoke",
  "health_schema_registry_smoke",
] as const;

function schemaPublicPath(slug: string) {
  return `/schemas/moral-trade/${slug}`;
}

function expectedSchemaId(slug: string) {
  return `https://www.moraltrade.org${schemaPublicPath(slug)}`;
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeSchemaRegistryCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function getSchemaEntry(source: SchemaSource): MoralTradeSchemaRegistryEntry {
  return {
    key: source.key,
    label: source.label,
    slug: source.slug,
    profileKey: source.profileKey,
    publicPath: schemaPublicPath(source.slug),
    schemaId: source.document.$id ?? "",
    title: source.document.title ?? source.label,
    topLevelRequiredFields: source.document.required ?? [],
    propertyCount: Object.keys(source.document.properties ?? {}).length,
  };
}

export function getMoralTradeSchemaRegistry(): MoralTradeSchemaRegistry {
  return {
    version: MORAL_TRADE_SCHEMA_REGISTRY_VERSION,
    purpose:
      "Public manifest for Moral Trade JSON Schema documents backing core profiles, contracts, validators, and exact non-MPGF schema definitions.",
    schemaDocuments: SCHEMA_SOURCES.map(getSchemaEntry),
    registryTests: [...REQUIRED_TESTS],
  };
}

export function getMoralTradeSchemaDocumentBySlug(slug: string) {
  const normalizedSlug = slug.trim();
  const source = SCHEMA_SOURCES.find((entry) => entry.slug === normalizedSlug);

  if (!source) {
    return null;
  }

  return {
    entry: getSchemaEntry(source),
    document: source.document,
  };
}

export function validateMoralTradeSchemaRegistry(
  registry: MoralTradeSchemaRegistry = getMoralTradeSchemaRegistry(),
): MoralTradeSchemaRegistryValidation {
  const keys = registry.schemaDocuments.map((entry) => entry.key);
  const slugs = registry.schemaDocuments.map((entry) => entry.slug);
  const ids = registry.schemaDocuments.map((entry) => entry.schemaId);
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const sourcesByKey = new Map(SCHEMA_SOURCES.map((source) => [source.key, source]));
  const schemaShapeFailures = registry.schemaDocuments
    .map((entry) => {
      const source = sourcesByKey.get(entry.key);
      const document = source?.document;
      const required = Array.isArray(document?.required) ? document.required : [];
      const properties = document?.properties ?? {};
      const missingRequiredProperties = required.filter(
        (field) => !Object.prototype.hasOwnProperty.call(properties, field),
      );

      if (
        !source ||
        !document ||
        document.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
        document.$id !== expectedSchemaId(entry.slug) ||
        document.type !== "object" ||
        !required.length ||
        !Object.keys(properties).length ||
        document.additionalProperties !== false ||
        missingRequiredProperties.length
      ) {
        return `${entry.key}:${missingRequiredProperties.join(",") || "shape"}`;
      }

      return null;
    })
    .filter((entry): entry is string => Boolean(entry));

  const checks = [
    check(
      "schema-key-coverage",
      "Registry covers every core Moral Trade schema document",
      hasAll(keys, REQUIRED_SCHEMA_KEYS) && duplicateKeys.length === 0,
      `${keys.length} schema document(s); duplicates: ${
        duplicateKeys.length ? duplicateKeys.join(", ") : "none"
      }.`,
    ),
    check(
      "public-schema-paths",
      "Schema documents have stable public paths and canonical ids",
      registry.schemaDocuments.every(
        (entry) =>
          entry.publicPath === schemaPublicPath(entry.slug) &&
          entry.schemaId === expectedSchemaId(entry.slug) &&
          entry.slug.endsWith(".schema.json"),
      ) &&
        duplicateSlugs.length === 0 &&
        duplicateIds.length === 0,
      registry.schemaDocuments.map((entry) => entry.publicPath).join(", "),
    ),
    check(
      "json-schema-shapes",
      "Each schema has strict object shape, required fields, and top-level properties",
      schemaShapeFailures.length === 0,
      schemaShapeFailures.length ? schemaShapeFailures.join(", ") : "all schema shapes strict",
    ),
    check(
      "data-model-schema",
      "Core data model profile has an exact public JSON Schema",
      keys.includes("data_model_profile_schema") &&
        registry.schemaDocuments.some(
          (entry) =>
            entry.key === "data_model_profile_schema" &&
            entry.topLevelRequiredFields.includes("entities") &&
            entry.topLevelRequiredFields.includes("privacyClasses") &&
            entry.topLevelRequiredFields.includes("relationshipBoundaries"),
        ),
      registry.schemaDocuments.find((entry) => entry.key === "data_model_profile_schema")
        ?.schemaId ?? "missing",
    ),
    check(
      "public-offer-listing-schema",
      "Public offers collection has an exact listing JSON Schema",
      keys.includes("public_offer_listing_schema") &&
        registry.schemaDocuments.some(
          (entry) =>
            entry.key === "public_offer_listing_schema" &&
            entry.topLevelRequiredFields.includes("offeredAction") &&
            entry.topLevelRequiredFields.includes("requestedAction") &&
            entry.topLevelRequiredFields.includes("verificationMethod") &&
            entry.topLevelRequiredFields.includes("noEscrow"),
        ),
      registry.schemaDocuments.find((entry) => entry.key === "public_offer_listing_schema")
        ?.schemaId ?? "missing",
    ),
    check(
      "registry-tests",
      "Schema registry test hooks",
      hasAll(registry.registryTests, REQUIRED_TESTS),
      registry.registryTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-schema-registry",
    validatorVersion: MORAL_TRADE_SCHEMA_REGISTRY_VALIDATOR_VERSION,
    registryVersion: registry.version,
    checks,
    blockers,
  };
}
