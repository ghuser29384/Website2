import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
  type MoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";

test("api contract profile publishes core routes, schemas, privacy classes, and fallbacks", () => {
  const profile = getMoralTradeApiContractProfile();
  const validation = validateMoralTradeApiContractProfile(profile);

  assert.equal(validation.status, "pass");
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_health"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_provenance_schema"));
  assert.ok(profile.routes.some((route) => route.key === "moral_trade_security_health"));
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
  assert.ok(profile.routes.some((route) => route.key === "wish_registry_search"));
  assert.ok(profile.routes.some((route) => route.key === "funnel_events"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "profile_export_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "empty_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "profile_import_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "provenance_schema_response")
      ?.fields.some((field) => field.key === "sampleBundleSummary"),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "copilot_review_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "copilot_review_response"));
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

      if (route.key === "wish_registry_search") {
        return { ...route, rateLimitSurface: "public_contract_read", fallback: "Return all rows." };
      }

      if (route.key === "moral_trade_provenance_schema") {
        return { ...route, cacheControl: "public_contract_static", fallback: "Return schemas." };
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

      if (route.key === "moral_trade_reasoning_packets") {
        return { ...route, cacheControl: "public_cache", fallback: "Return all reasoning." };
      }

      return route;
    }),
  };
  const validation = validateMoralTradeApiContractProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("private-cache-controls")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-thresholded-search")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("provenance-schema-validator")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("copilot-review-nonmutating")));
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("review-workflow-evaluate-nonmutating"),
    ),
  );
  assert.ok(validation.blockers.some((blocker) => blocker.includes("match-signal-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("challenge-appeal-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("disclosure-grant-routes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("reasoning-packets-validator")));
});

test("api contract validation fails when route-referenced schema fields are missing", () => {
  const profile = getMoralTradeApiContractProfile();
  const weakenedProfile: MoralTradeApiContractProfile = {
    ...profile,
    schemaDefinitions: profile.schemaDefinitions
      .filter((schema) => schema.key !== "wish_registry_search_request")
      .map((schema) =>
        schema.key === "funnel_event_request" ? { ...schema, fields: [] } : schema,
      ),
  };
  const validation = validateMoralTradeApiContractProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("schema-definitions")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("field-level-schema-contracts")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("analytics-redaction")));
});
