import apiContractProfileJson from "../../../config/moral-trade/api-contract-profile.json";

export const MORAL_TRADE_API_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-api-contract-validator-v0.1";

export type MoralTradeApiRouteContract = {
  key: string;
  method: "GET" | "POST";
  path: string;
  auth: "public" | "optional" | "authenticated" | "internal";
  privacyClass: string;
  requestSchema: string;
  responseSchema: string;
  rateLimitSurface: string;
  cacheControl: string;
  fallback: string;
};

export type MoralTradeApiSchemaField = {
  key: string;
  type: string;
  required: boolean;
  privacy: string;
  description: string;
};

export type MoralTradeApiContractProfile = {
  version: string;
  purpose: string;
  routes: MoralTradeApiRouteContract[];
  schemaDefinitions: Array<{
    key: string;
    purpose: string;
    fields: MoralTradeApiSchemaField[];
  }>;
  privacyClasses: Array<{ key: string; rule: string }>;
  apiTests: string[];
};

export interface MoralTradeApiContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeApiContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-api-contract-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeApiContractCheck[];
  blockers: string[];
}

const apiContractProfile = apiContractProfileJson as MoralTradeApiContractProfile;

const REQUIRED_ROUTES = [
  "moral_trade_health",
  "moral_trade_provenance_schema",
  "moral_trade_copilot_contract",
  "moral_trade_copilot_review",
  "moral_trade_match_signal_contract",
  "moral_trade_match_signal_evaluate",
  "moral_trade_review_workflow_contract",
  "moral_trade_reasoning_packets",
  "moral_trade_review_workflow_evaluate",
  "moral_trade_operations_health",
  "moral_trade_security_health",
  "moral_trade_evaluation_health",
  "moral_trade_performance_health",
  "moral_trade_externality_health",
  "moral_trade_ai_governance_health",
  "profile_schema",
  "profile_export",
  "profile_import",
  "wish_registry_search",
  "funnel_events",
] as const;

const REQUIRED_PRIVACY_CLASSES = [
  "public_contract",
  "public_schema",
  "authenticated_private",
  "privacy_thresholded_public_preview",
  "redacted_analytics",
  "ephemeral_private_draft_review",
] as const;

const EMPTY_SCHEMA_KEYS = new Set(["empty_request", "empty_204_response"]);

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeApiContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeApiContractProfile() {
  return apiContractProfile;
}

export function validateMoralTradeApiContractProfile(
  profile: MoralTradeApiContractProfile = apiContractProfile,
): MoralTradeApiContractValidation {
  const routeKeys = profile.routes.map((route) => route.key);
  const privacyClassKeys = profile.privacyClasses.map((entry) => entry.key);
  const schemaKeys = profile.schemaDefinitions.map((entry) => entry.key);
  const routeSchemaKeys = Array.from(
    new Set(profile.routes.flatMap((route) => [route.requestSchema, route.responseSchema])),
  );
  const authenticatedRoutes = profile.routes.filter((route) => route.auth === "authenticated");
  const publicPreviewRoutes = profile.routes.filter(
    (route) => route.privacyClass === "privacy_thresholded_public_preview",
  );
  const provenanceSchemaRoute = profile.routes.find(
    (route) => route.key === "moral_trade_provenance_schema",
  );
  const provenanceSchemaResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "provenance_schema_response",
  );
  const draftReviewRoutes = profile.routes.filter(
    (route) => route.privacyClass === "ephemeral_private_draft_review",
  );
  const matchSignalContractRoute = profile.routes.find(
    (route) => route.key === "moral_trade_match_signal_contract",
  );
  const matchSignalEvaluateRoute = profile.routes.find(
    (route) => route.key === "moral_trade_match_signal_evaluate",
  );
  const matchSignalContractResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "match_signal_contract_response",
  );
  const matchSignalEvaluateResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "match_signal_evaluate_response",
  );
  const reviewWorkflowEvaluateRoute = profile.routes.find(
    (route) => route.key === "moral_trade_review_workflow_evaluate",
  );
  const reasoningPacketsRoute = profile.routes.find(
    (route) => route.key === "moral_trade_reasoning_packets",
  );
  const reasoningPacketsResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "reasoning_packets_response",
  );
  const analyticsRoutes = profile.routes.filter((route) => route.privacyClass === "redacted_analytics");
  const funnelEventSchema = profile.schemaDefinitions.find(
    (schema) => schema.key === "funnel_event_request",
  );
  const checks = [
    check(
      "core-api-routes",
      "Core API routes",
      hasAll(routeKeys, REQUIRED_ROUTES) &&
        profile.routes.every((route) => route.path.startsWith("/api/") && route.responseSchema),
      routeKeys.join(", "),
    ),
    check(
      "schema-definitions",
      "Named request and response schemas",
      hasAll(schemaKeys, routeSchemaKeys) &&
        profile.schemaDefinitions.every((schema) => schema.purpose && Array.isArray(schema.fields)),
      routeSchemaKeys.join(", "),
    ),
    check(
      "field-level-schema-contracts",
      "Field-level schema contracts",
      profile.schemaDefinitions.every((schema) => {
        if (EMPTY_SCHEMA_KEYS.has(schema.key)) {
          return schema.fields.length === 0;
        }

        return (
          schema.fields.length > 0 &&
          schema.fields.every(
            (field) =>
              field.key &&
              field.type &&
              typeof field.required === "boolean" &&
              field.privacy &&
              field.description,
          )
        );
      }),
      `${profile.schemaDefinitions.length} schema definition(s) with field contracts.`,
    ),
    check(
      "privacy-classes",
      "Privacy classes",
      hasAll(privacyClassKeys, REQUIRED_PRIVACY_CLASSES),
      privacyClassKeys.join(", "),
    ),
    check(
      "private-cache-controls",
      "Authenticated private routes fail closed",
      authenticatedRoutes.length >= 2 &&
        authenticatedRoutes.every((route) => route.cacheControl === "private_no_store") &&
        authenticatedRoutes.every((route) => /viewer|authenticated|auth/i.test(route.fallback)),
      authenticatedRoutes.map((route) => route.key).join(", "),
    ),
    check(
      "privacy-thresholded-search",
      "Wish-registry search privacy and rate limits",
      publicPreviewRoutes.some(
        (route) =>
          route.key === "wish_registry_search" &&
          route.rateLimitSurface === "wish_registry_search" &&
          /suppress|sparse|broad previews/i.test(route.fallback),
      ),
      publicPreviewRoutes.map((route) => `${route.key}:${route.rateLimitSurface}`).join(", "),
    ),
    check(
      "provenance-schema-validator",
      "Provenance schema route is validator-backed",
      provenanceSchemaRoute?.cacheControl === "no_store_dynamic" &&
        /validator|blockers/i.test(provenanceSchemaRoute.fallback) &&
        Boolean(
          provenanceSchemaResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          provenanceSchemaResponse?.fields.some(
            (field) => field.key === "sampleBundleSummary" && field.type === "object",
          ),
        ),
      provenanceSchemaRoute
        ? `${provenanceSchemaRoute.key}:${provenanceSchemaRoute.cacheControl}`
        : "missing",
    ),
    check(
      "copilot-review-nonmutating",
      "Copilot draft review is ephemeral and non-mutating",
      draftReviewRoutes.some(
        (route) =>
          route.key === "moral_trade_copilot_review" &&
          route.method === "POST" &&
          route.cacheControl === "private_no_store" &&
          route.rateLimitSurface === "copilot_draft_review" &&
          /never store|without changing proposal state|change proposal state/i.test(route.fallback),
      ),
      draftReviewRoutes.map((route) => `${route.key}:${route.cacheControl}`).join(", "),
    ),
    check(
      "review-workflow-evaluate-nonmutating",
      "Review workflow evaluation is ephemeral and non-mutating",
      reviewWorkflowEvaluateRoute?.method === "POST" &&
        reviewWorkflowEvaluateRoute.cacheControl === "private_no_store" &&
        reviewWorkflowEvaluateRoute.rateLimitSurface === "review_workflow_evaluate" &&
        /without changing proposal state|never store|state/i.test(
          reviewWorkflowEvaluateRoute.fallback,
        ),
      reviewWorkflowEvaluateRoute
        ? `${reviewWorkflowEvaluateRoute.key}:${reviewWorkflowEvaluateRoute.cacheControl}:${reviewWorkflowEvaluateRoute.rateLimitSurface}`
        : "missing",
    ),
    check(
      "match-signal-routes",
      "Match signal contract and evaluate routes are validator-backed and non-mutating",
      matchSignalContractRoute?.method === "GET" &&
        matchSignalContractRoute.cacheControl === "no_store_dynamic" &&
        /validation blockers|human review/i.test(matchSignalContractRoute.fallback) &&
        matchSignalEvaluateRoute?.method === "POST" &&
        matchSignalEvaluateRoute.cacheControl === "private_no_store" &&
        matchSignalEvaluateRoute.rateLimitSurface === "match_signal_evaluate" &&
        /never store|exact wishes|contact counterparties|rank moral value/i.test(
          matchSignalEvaluateRoute.fallback,
        ) &&
        Boolean(
          matchSignalContractResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          matchSignalEvaluateResponse?.fields.some(
            (field) => field.key === "stateMutation" && /Always false/i.test(field.description),
          ),
        ),
      matchSignalEvaluateRoute
        ? `${matchSignalEvaluateRoute.key}:${matchSignalEvaluateRoute.cacheControl}:${matchSignalEvaluateRoute.rateLimitSurface}`
        : "missing",
    ),
    check(
      "reasoning-packets-validator",
      "Reasoning packets route is public and validator-backed",
      reasoningPacketsRoute?.method === "GET" &&
        reasoningPacketsRoute.cacheControl === "no_store_dynamic" &&
        reasoningPacketsRoute.privacyClass === "public_contract" &&
        /validator|private offers|hidden reasoning|global moral ranking/i.test(
          reasoningPacketsRoute.fallback,
        ) &&
        Boolean(
          reasoningPacketsResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          reasoningPacketsResponse?.fields.some(
            (field) => field.key === "packets" && field.type === "reasoning_packet_array",
          ),
        ) &&
        Boolean(
          reasoningPacketsResponse?.fields.some(
            (field) => field.key === "publicContract" && field.privacy === "public_contract",
          ),
        ),
      reasoningPacketsRoute
        ? `${reasoningPacketsRoute.key}:${reasoningPacketsRoute.cacheControl}`
        : "missing",
    ),
    check(
      "analytics-redaction",
      "Analytics ingest redaction",
      analyticsRoutes.some(
        (route) => route.key === "funnel_events" && /raw private wish text/i.test(route.fallback),
      ) &&
        Boolean(
          funnelEventSchema?.fields.some(
            (field) =>
              field.key === "metadata" &&
              field.privacy === "redacted_analytics" &&
              /raw wishes|contact details|source notes|private text/i.test(field.description),
          ),
        ) &&
        Boolean(
          funnelEventSchema?.fields.some(
            (field) => field.key === "path" && /query strings and hashes are stripped/i.test(field.description),
          ),
        ),
      analyticsRoutes.map((route) => route.key).join(", "),
    ),
    check(
      "api-tests",
      "API contract test hooks",
      profile.apiTests.includes("api_contract_profile_validator") &&
        profile.apiTests.includes("health_route_contract_smoke") &&
        profile.apiTests.includes("technical_spec_api_contract_smoke") &&
        profile.apiTests.includes("performance_route_contract"),
      profile.apiTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-api-contract-profile",
    validatorVersion: MORAL_TRADE_API_CONTRACT_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
