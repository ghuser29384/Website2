import assert from "node:assert/strict";
import test from "node:test";

import {
  auditMoralTradeApiImplementationContract,
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
  type MoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";

test("api contract profile publishes core routes, schemas, privacy classes, and fallbacks", () => {
  const profile = getMoralTradeApiContractProfile();
  const validation = validateMoralTradeApiContractProfile(profile);

  assert.equal(validation.status, "pass");
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_health"));
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_api_contract" &&
        route.path === "/api/moral-trade/api-contract" &&
        route.responseSchema === "api_contract_response",
    ),
  );
  assert.ok(profile.routes.some((route) => route.key === "public_offers_collection"));
  assert.ok(profile.routes.some((route) => route.key === "public_offer_detail"));
  assert.ok(profile.routes.some((route) => route.key === "public_offers_facets"));
  assert.ok(profile.routes.some((route) => route.key === "saved_search_create"));
  assert.ok(profile.routes.some((route) => route.key === "public_offer_follow"));
  assert.ok(profile.routes.some((route) => route.key === "public_offer_create_similar"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_data_model_contract"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_policy_bundle_contract"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_provenance_schema"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_schema_registry"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_security_health"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_incident_response_health"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_copilot_review"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_match_signal_contract"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_match_signal_evaluate"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_challenge_appeal_contract"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_challenge_appeal_evaluate"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_disclosure_contract"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_disclosure_evaluate"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_review_workflow_evaluate"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_reasoning_packets"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_performance_health"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_externality_health"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_ai_governance_health"));
  assert.ok(profile.routes.some((route) => route.key === "profile_export"));
  assert.ok(profile.routes.some((route) => route.key === "profile_import"));
  assert.ok(profile.routes.some((route) => route.key === "profile_export" && route.rateLimitSurface === "profile_portability"));
  assert.ok(profile.routes.some((route) => route.key === "profile_import" && route.rateLimitSurface === "profile_portability"));
  assert.ok(profile.routes.some((route) => route.key === "wish_registry_search"));
  assert.ok(profile.routes.some((route) => route.key === "funnel_events"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "profile_export_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "empty_request"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "api_contract_response")
      ?.fields.some(
        (field) =>
          field.key === "implementationAudit" && field.type === "implementation_audit",
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offers_collection_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offers_collection_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offer_detail_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offer_detail_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offers_facets_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offers_facets_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "saved_search_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "saved_search_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offer_follow_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offer_follow_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offer_create_similar_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "public_offer_create_similar_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "profile_import_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "data_model_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "policy_bundle_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "schema_registry_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "schemaRegistryValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "provenance_schema_response")
      ?.fields.some((field) => field.key === "sampleBundleSummary"),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "copilot_review_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "copilot_review_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "copilot_review_request")
      ?.fields.some((field) => field.key === "evidenceMetadata"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "copilot_review_response")
      ?.fields.some((field) => field.key === "evidenceMetadataSummary" && field.required),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "match_signal_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "match_signal_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "match_signal_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "challenge_appeal_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "challenge_appeal_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "challenge_appeal_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "disclosure_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "disclosure_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "disclosure_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "review_workflow_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "review_workflow_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "reasoning_packets_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "security_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "incident_response_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "performance_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "externality_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "ai_governance_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "wish_registry_search_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "empty_204_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "funnel_event_request")
      ?.fields.some((field) => field.key === "metadata" && field.privacy === "redacted_analytics"),
  );
  assert.ok(profile.privacyClasses.some((entry) => entry.key === "authenticated_private"));
  assert.ok(profile.privacyClasses.some((entry) => entry.key === "ephemeral_private_draft_review"));
  assert.ok(profile.privacyClasses.some((entry) => entry.key === "redacted_analytics"));
});

test("api contract implementation audit proves route metadata is backed by executable tables", () => {
  const profile = getMoralTradeApiContractProfile();
  const audit = auditMoralTradeApiImplementationContract(profile);

  assert.equal(audit.status, "pass");
  assert.equal(audit.blockers.length, 0);
  assert.equal(audit.routeCount, profile.routes.length);
  assert.deepEqual(audit.missingRateLimitSurfaces, []);
  assert.deepEqual(audit.missingCacheControls, []);
  assert.deepEqual(audit.orphanedRateLimitSurfaces, []);
  assert.ok(audit.implementedRateLimitSurfaces.includes("public_contract_read"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("offer_collection_read"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("analytics_ingest"));
  assert.ok(audit.implementedCacheControls.includes("no_store_dynamic"));
  assert.ok(audit.implementedCacheControls.includes("private_no_store"));
  assert.ok(audit.implementedCacheControls.includes("public_contract_static"));
  assert.ok(
    audit.routeFindings.every(
      (finding) =>
        finding.status === "pass" &&
        finding.rateLimitLimit !== null &&
        finding.cacheControlHeader !== null,
    ),
  );
});

test("api contract schema definitions cover every route request and response schema", () => {
  const profile = getMoralTradeApiContractProfile();
  const schemaKeys = new Set(profile.schemaDefinitions.map((schema) => schema.key));
  const referencedSchemaKeys = new Set(
    profile.routes.flatMap((route) => [route.requestSchema, route.responseSchema]),
  );

  assert.deepEqual(
    [...referencedSchemaKeys].filter((schemaKey) => !schemaKeys.has(schemaKey)),
    [],
  );
  assert.ok(
    profile.schemaDefinitions.every(
      (schema) =>
        schema.key === "empty_request" ||
        schema.key === "empty_204_response" ||
        schema.fields.length > 0,
    ),
  );
});

test("api contract validation fails when private or sparse-preview protections are missing", () => {
  const profile = getMoralTradeApiContractProfile();
  const weakenedProfile: MoralTradeApiContractProfile = {
    ...profile,
    routes: profile.routes.map((route) => {
      if (route.key === "profile_export") {
        return { ...route, cacheControl: "public_cache" };
      }

      if (route.key === "profile_import") {
        return {
          ...route,
          fallback: "Import anything.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "wish_registry_search") {
        return { ...route, rateLimitSurface: "public_contract_read", fallback: "Return all rows." };
      }

      if (route.key === "moral_trade_provenance_schema") {
        return { ...route, cacheControl: "public_contract_static", fallback: "Return schemas." };
      }

      if (route.key === "moral_trade_schema_registry") {
        return { ...route, cacheControl: "public_contract_static", fallback: "Hide schemas." };
      }

      if (route.key === "public_offers_collection") {
        return {
          ...route,
          cacheControl: "public_cache",
          fallback: "Return personalized offers.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "public_offer_detail") {
        return {
          ...route,
          cacheControl: "public_cache",
          fallback: "Return private details.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "public_offers_facets") {
        return {
          ...route,
          cacheControl: "public_cache",
          fallback: "Return all facets.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "saved_search_create") {
        return {
          ...route,
          cacheControl: "public_cache",
          fallback: "Store anonymous searches and contact users.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "public_offer_follow") {
        return {
          ...route,
          cacheControl: "public_cache",
          fallback: "Publish all follow counts.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "public_offer_create_similar") {
        return {
          ...route,
          cacheControl: "public_cache",
          fallback: "Store cloned offers and copy contact details.",
          rateLimitSurface: "public_contract_read",
        };
      }

      if (route.key === "moral_trade_data_model_contract") {
        return { ...route, cacheControl: "public_contract_static", fallback: "Expose all records." };
      }

      if (route.key === "moral_trade_policy_bundle_contract") {
        return { ...route, cacheControl: "public_contract_static", fallback: "Use hidden context." };
      }

      if (route.key === "moral_trade_copilot_review") {
        return { ...route, cacheControl: "public_cache", fallback: "Return generated output." };
      }

      if (route.key === "moral_trade_review_workflow_evaluate") {
        return { ...route, cacheControl: "public_cache", fallback: "Publish evaluated workflow." };
      }

      if (route.key === "moral_trade_match_signal_evaluate") {
        return { ...route, cacheControl: "public_cache", fallback: "Rank all profiles." };
      }

      if (route.key === "moral_trade_challenge_appeal_evaluate") {
        return { ...route, cacheControl: "public_cache", fallback: "Resolve every dispute." };
      }

      if (route.key === "moral_trade_disclosure_evaluate") {
        return { ...route, cacheControl: "public_cache", fallback: "Reveal exact wishes." };
      }

      if (route.key === "moral_trade_incident_response_health") {
        return { ...route, cacheControl: "public_cache", fallback: "Publish raw reports." };
      }

      if (route.key === "moral_trade_reasoning_packets") {
        return { ...route, cacheControl: "public_cache", fallback: "Return all reasoning." };
      }

      return route;
    }),
  };
  const validation = validateMoralTradeApiContractProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("private-cache-controls")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("profile-portability-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-thresholded-search")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("provenance-schema-validator")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("schema-registry-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-offers-collection-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-offer-detail-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-offers-facets-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("saved-search-create-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-offer-follow-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("data-model-contract-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("policy-bundle-contract-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("copilot-review-nonmutating")));
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("review-workflow-evaluate-nonmutating"),
    ),
  );
  assert.ok(validation.blockers.some((blocker) => blocker.includes("match-signal-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("challenge-appeal-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("disclosure-grant-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("incident-response-health-route")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("reasoning-packets-validator")));
});

test("api contract validation fails when route-referenced schema fields are missing", () => {
  const profile = getMoralTradeApiContractProfile();
  const weakenedProfile: MoralTradeApiContractProfile = {
    ...profile,
    schemaDefinitions: profile.schemaDefinitions
      .filter((schema) => schema.key !== "wish_registry_search_request")
      .map((schema) =>
        schema.key === "funnel_event_request"
          ? { ...schema, fields: [] }
          : schema.key === "copilot_review_request"
            ? {
                ...schema,
                fields: schema.fields.filter((field) => field.key !== "evidenceMetadata"),
              }
            : schema.key === "copilot_review_response"
              ? {
                  ...schema,
                  fields: schema.fields.filter(
                    (field) => field.key !== "evidenceMetadataSummary",
                  ),
                }
              : schema,
      ),
  };
  const validation = validateMoralTradeApiContractProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("copilot-review-nonmutating")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("schema-definitions")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("field-level-schema-contracts")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("analytics-redaction")));
});
