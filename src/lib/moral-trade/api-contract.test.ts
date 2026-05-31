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
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_document_coverage_health" &&
        route.path === "/api/moral-trade/document-coverage/health" &&
        route.responseSchema === "document_coverage_health_response" &&
        /never fabricate production evidence/i.test(route.fallback),
    ),
  );
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_ai_shadow_contract"));
  assert.ok(
    profile.routes.some(
      (route) => route.key === "moral_trade_background_capability_gates_contract",
    ),
  );
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_transparency_report"));
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_transparency_report" &&
        route.path === "/api/moral-trade/transparency/report" &&
        route.cacheControl === "no_store_dynamic" &&
        route.rateLimitSurface === "public_contract_read",
    ),
  );
  assert.ok(profile.routes.some((route) => route.key === "profile_export"));
  assert.ok(profile.routes.some((route) => route.key === "profile_import"));
  assert.ok(profile.routes.some((route) => route.key === "profile_export" && route.rateLimitSurface === "profile_portability"));
  assert.ok(profile.routes.some((route) => route.key === "profile_import" && route.rateLimitSurface === "profile_portability"));
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_summary_create" &&
        route.path === "/api/background/source-summaries" &&
        route.auth === "authenticated" &&
        route.cacheControl === "private_no_store" &&
        route.rateLimitSurface === "background_source_summary_write" &&
        /viewer-owned source connection/i.test(route.fallback) &&
        /does not outlive/i.test(route.fallback) &&
        /raw source ingestion stays disabled/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_intro_packet_create" &&
        route.path === "/api/background/intro-packets" &&
        route.auth === "authenticated" &&
        route.cacheControl === "private_no_store" &&
        route.rateLimitSurface === "background_intro_packet_write" &&
        /send no outreach/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_opportunity_brief_list" &&
        route.path === "/api/background/opportunity-briefs" &&
        route.auth === "authenticated" &&
        route.cacheControl === "private_no_store" &&
        route.rateLimitSurface === "background_opportunity_brief_read" &&
        /broad-preview opportunity cards/i.test(route.fallback) &&
        /exact wishes/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_opportunity_feedback_create" &&
        route.path === "/api/background/opportunity-briefs/:id/feedback" &&
        route.auth === "authenticated" &&
        route.cacheControl === "private_no_store" &&
        route.rateLimitSurface === "background_opportunity_feedback_write" &&
        /closed reason\/outcome codes/i.test(route.fallback) &&
        /no outreach is sent/i.test(route.fallback),
    ),
  );
  assert.ok(profile.routes.some((route) => route.key === "wish_registry_search"));
  assert.ok(profile.routes.some((route) => route.key === "funnel_events"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "profile_export_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_summary_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_summary_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_packet_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_packet_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_opportunity_brief_list_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_opportunity_feedback_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_opportunity_feedback_create_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_source_summary_create_response")
      ?.fields.some(
        (field) =>
          field.key === "rawIngestionAllowed" &&
          field.required &&
          /Always false/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_source_summary_create_request")
      ?.fields.some(
        (field) =>
          field.key === "sourceConnectionId" &&
          /viewer-owned source connection/i.test(field.description) &&
          /cross-profile connections fail closed/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_source_summary_create_request")
      ?.fields.some(
        (field) =>
          field.key === "retentionDays" &&
          /cannot outlive/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_source_summary_create_request")
      ?.fields.some(
        (field) =>
          field.key === "allowedFieldKeys" &&
          /approved field list/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_intro_packet_create_response")
      ?.fields.some(
        (field) =>
          field.key === "outreachSent" &&
          field.required &&
          /Always false/i.test(field.description),
      ),
  );
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
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "transparencyReportValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "documentCoverageValidation"),
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
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "challenge_appeal_evaluate_request")
      ?.fields.some(
        (field) =>
          field.key === "appeal" &&
          /requested outcome/i.test(field.description),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "challenge_appeal_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "disclosure_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "disclosure_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "disclosure_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "review_workflow_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "review_workflow_evaluate_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "reasoning_packets_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "reasoning_packets_response"));
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_reasoning_packets" &&
        route.requestSchema === "reasoning_packets_request",
    ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "reasoning_packets_request")
      ?.fields.some((field) => field.key === "status" && field.required === false),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "reasoning_packets_response")
      ?.fields.some((field) => field.key === "activeFilter" && field.type === "enum"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "reasoning_packets_response")
      ?.fields.some((field) => field.key === "filterCounts" && field.privacy === "public_contract"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "operations_health_response")
      ?.purpose.includes("retention lifecycle controls"),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "security_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "incident_response_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "performance_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "externality_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "ai_governance_health_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "document_coverage_health_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "validation" &&
          /source documents, recommendation families/i.test(field.description),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "ai_shadow_contract_response"));
  assert.ok(
    profile.schemaDefinitions.some(
      (schema) => schema.key === "background_capability_gates_contract_response",
    ),
  );
  assert.ok(
    profile.schemaDefinitions.some(
      (schema) => schema.key === "background_rls_audit_contract_response",
    ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "transparency_report_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "transparency_report_response")
      ?.fields.some(
        (field) =>
          field.key === "report" &&
          field.privacy === "public_contract" &&
          /small nonzero samples are suppressed/i.test(field.description),
      ),
  );
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
  assert.equal(
    validation.checks.find((entry) => entry.id === "transparency-report-route")?.status,
    "pass",
  );
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
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_source_summary_write"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_intro_packet_write"));
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

      if (route.key === "moral_trade_transparency_report") {
        return { ...route, cacheControl: "public_cache", fallback: "Return every case." };
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
  assert.ok(validation.blockers.some((blocker) => blocker.includes("transparency-report-route")));
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
