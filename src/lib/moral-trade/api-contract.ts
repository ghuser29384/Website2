import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import apiContractProfileJson from "../../../config/moral-trade/api-contract-profile.json";

import {
  MORAL_TRADE_API_CACHE_CONTROL_HEADERS,
  MORAL_TRADE_API_RATE_LIMITS,
} from "./api-rate-limit";

export const MORAL_TRADE_API_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-api-contract-validator-v0.4";
export const MORAL_TRADE_API_IMPLEMENTATION_AUDIT_VERSION =
  "moral-trade-api-implementation-audit-v0.2";

export type MoralTradeApiRouteContract = {
  key: string;
  method: "DELETE" | "GET" | "POST";
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

export interface MoralTradeApiImplementationRouteFinding {
  routeKey: string;
  routePath: string;
  routeFilePresent: boolean;
  candidateRouteFiles: string[];
  resolvedRouteFile: string | null;
  rateLimitSurface: string;
  rateLimitLimit: number | null;
  rateLimitWindowMs: number | null;
  cacheControl: string;
  cacheControlHeader: string | null;
  status: "pass" | "fail";
}

export interface MoralTradeApiImplementationAudit {
  status: "pass" | "fail";
  validatorName: "moral-trade-api-implementation";
  validatorVersion: string;
  profileVersion: string;
  routeCount: number;
  implementedRateLimitSurfaces: string[];
  implementedCacheControls: string[];
  missingRateLimitSurfaces: string[];
  missingCacheControls: string[];
  missingRouteFiles: string[];
  orphanedRateLimitSurfaces: string[];
  routeFindings: MoralTradeApiImplementationRouteFinding[];
  blockers: string[];
}

const apiContractProfile = apiContractProfileJson as MoralTradeApiContractProfile;

const REQUIRED_ROUTES = [
  "moral_trade_health",
  "moral_trade_api_contract",
  "public_offers_collection",
  "public_offer_detail",
  "public_offers_facets",
  "saved_search_create",
  "public_offer_follow",
  "public_offer_create_similar",
  "moral_trade_data_model_contract",
  "moral_trade_policy_bundle_contract",
  "moral_trade_release_gate_contract",
  "moral_trade_participant_confirmation_contract",
  "moral_trade_participant_eligibility_contract",
  "moral_trade_production_readiness_contract",
  "moral_trade_recipient_destination_contract",
  "moral_trade_provenance_schema",
  "moral_trade_schema_registry",
  "moral_trade_copilot_contract",
  "moral_trade_copilot_review",
  "moral_trade_match_signal_contract",
  "moral_trade_match_signal_evaluate",
  "moral_trade_challenge_appeal_contract",
  "moral_trade_challenge_appeal_evaluate",
  "moral_trade_disclosure_contract",
  "moral_trade_disclosure_evaluate",
  "moral_trade_review_workflow_contract",
  "moral_trade_reasoning_packets",
  "moral_trade_review_workflow_evaluate",
  "moral_trade_operations_health",
  "moral_trade_security_health",
  "moral_trade_incident_response_health",
  "moral_trade_evaluation_health",
  "moral_trade_performance_health",
  "moral_trade_externality_health",
  "moral_trade_ai_governance_health",
  "moral_trade_document_coverage_health",
  "moral_trade_ai_shadow_contract",
  "moral_trade_background_capability_gates_contract",
  "moral_trade_private_overlap_contract",
  "moral_trade_background_rls_audit_contract",
  "moral_trade_transparency_report",
  "profile_schema",
  "profile_export",
  "profile_import",
  "background_wish_interview_session_create",
  "background_wish_interview_answer_create",
  "background_wish_interview_apply",
  "background_wish_dialogue_start",
  "background_wish_dialogue_message",
  "background_wish_dialogue_proposal",
  "background_wish_dialogue_apply",
  "background_source_connection_create",
  "background_source_create_bg17_alias",
  "background_source_connection_revoke",
  "background_source_revoke_bg17_alias",
  "background_source_sync_queue",
  "background_source_summary_draft",
  "background_source_summary_draft_bg16_alias",
  "background_source_connection_summary_draft_alias",
  "background_source_summary_approve",
  "background_source_summary_draft_approve_bg17_alias",
  "background_source_connection_approve_bg16_alias",
  "background_source_connection_summary_approve_alias",
  "background_profile_signal_recompute",
  "background_profile_recompute_bg16_alias",
  "background_source_summary_create",
  "background_intro_packet_create",
  "background_intro_request_create",
  "background_intro_request_appeal",
  "background_intro_request_approve_contact",
  "background_opportunity_brief_list",
  "background_opportunity_list",
  "background_opportunity_feedback_create",
  "background_opportunity_feedback_create_alias",
  "background_helper_run_create",
  "background_opportunity_feedback_create_bg17_body_alias",
  "background_private_overlap_check",
  "wish_registry_search",
  "funnel_events",
] as const;

const REQUIRED_PRIVACY_CLASSES = [
  "public_contract",
  "public_schema",
  "authenticated_private",
  "authenticated_private_step_up",
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

const NEXT_APP_ROOT = "src/app";
const NEXT_ROUTE_FILE_NAME = "route.ts";

function absoluteWorkspacePath(relativePath: string) {
  return join(process.cwd(), relativePath);
}

function fileExists(relativePath: string) {
  return existsSync(absoluteWorkspacePath(relativePath));
}

function listChildRouteDirectories(relativeDirectory: string) {
  try {
    return readdirSync(absoluteWorkspacePath(relativeDirectory), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function isDynamicRouteDirectory(directoryName: string) {
  return /^\[(?:\.\.\.)?[^/\]]+\]$/.test(directoryName);
}

function routePathSegments(routePath: string) {
  return routePath
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

function contractSegmentToRouteDirectory(segment: string) {
  return segment.startsWith(":") ? `[${segment.slice(1)}]` : segment;
}

function fallbackRouteFileForContractPath(routePath: string) {
  return `${NEXT_APP_ROOT}/${routePathSegments(routePath)
    .map(contractSegmentToRouteDirectory)
    .join("/")}/${NEXT_ROUTE_FILE_NAME}`;
}

function resolveNextRouteFile(routePath: string) {
  const segments = routePathSegments(routePath);
  let candidateDirectories = [NEXT_APP_ROOT];

  for (const segment of segments) {
    const nextDirectories: string[] = [];

    for (const directory of candidateDirectories) {
      if (segment.startsWith(":")) {
        const paramName = segment.slice(1);
        const childDirectories = listChildRouteDirectories(directory).filter(isDynamicRouteDirectory);
        const preferredNames = new Set([`[${paramName}]`, `[...${paramName}]`]);
        const orderedChildDirectories = [
          ...childDirectories.filter((childDirectory) => preferredNames.has(childDirectory)),
          ...childDirectories.filter((childDirectory) => !preferredNames.has(childDirectory)),
        ];

        for (const childDirectory of orderedChildDirectories) {
          nextDirectories.push(`${directory}/${childDirectory}`);
        }
      } else {
        const staticDirectory = `${directory}/${segment}`;

        if (fileExists(staticDirectory)) {
          nextDirectories.push(staticDirectory);
        }
      }
    }

    candidateDirectories = Array.from(new Set(nextDirectories));

    if (!candidateDirectories.length) {
      break;
    }
  }

  const candidateRouteFiles = Array.from(
    new Set([
      ...candidateDirectories.map((directory) => `${directory}/${NEXT_ROUTE_FILE_NAME}`),
      fallbackRouteFileForContractPath(routePath),
    ]),
  ).sort();
  const resolvedRouteFile = candidateRouteFiles.find(fileExists) ?? null;

  return {
    candidateRouteFiles,
    resolvedRouteFile,
  };
}

export function getMoralTradeApiContractProfile() {
  return apiContractProfile;
}

export function auditMoralTradeApiImplementationContract(
  profile: MoralTradeApiContractProfile = apiContractProfile,
): MoralTradeApiImplementationAudit {
  const implementedRateLimits = MORAL_TRADE_API_RATE_LIMITS as Record<
    string,
    { limit: number; windowMs: number } | undefined
  >;
  const implementedCacheControls = MORAL_TRADE_API_CACHE_CONTROL_HEADERS as Record<
    string,
    string | undefined
  >;
  const implementedRateLimitSurfaces = Object.keys(implementedRateLimits).sort();
  const implementedCacheControlKeys = Object.keys(implementedCacheControls).sort();
  const publishedRateLimitSurfaces = Array.from(
    new Set(profile.routes.map((route) => route.rateLimitSurface)),
  ).sort();
  const publishedCacheControls = Array.from(
    new Set(profile.routes.map((route) => route.cacheControl)),
  ).sort();
  const missingRateLimitSurfaces = publishedRateLimitSurfaces.filter(
    (surface) => !implementedRateLimits[surface],
  );
  const missingCacheControls = publishedCacheControls.filter(
    (cacheControl) => !implementedCacheControls[cacheControl],
  );
  const orphanedRateLimitSurfaces = implementedRateLimitSurfaces.filter(
    (surface) => !publishedRateLimitSurfaces.includes(surface),
  );
  const routeFindings = profile.routes.map((route) => {
    const rateLimit = implementedRateLimits[route.rateLimitSurface];
    const cacheControlHeader = implementedCacheControls[route.cacheControl] ?? null;
    const routeFileResolution = resolveNextRouteFile(route.path);
    const routeFilePresent = Boolean(routeFileResolution.resolvedRouteFile);

    return {
      routeKey: route.key,
      routePath: route.path,
      routeFilePresent,
      candidateRouteFiles: routeFileResolution.candidateRouteFiles,
      resolvedRouteFile: routeFileResolution.resolvedRouteFile,
      rateLimitSurface: route.rateLimitSurface,
      rateLimitLimit: rateLimit?.limit ?? null,
      rateLimitWindowMs: rateLimit?.windowMs ?? null,
      cacheControl: route.cacheControl,
      cacheControlHeader,
      status:
        rateLimit && cacheControlHeader && routeFilePresent ? ("pass" as const) : ("fail" as const),
    };
  });
  const missingRouteFiles = routeFindings
    .filter((finding) => !finding.routeFilePresent)
    .map((finding) => `${finding.routeKey}:${finding.routePath}`)
    .sort();
  const blockers = [
    ...missingRateLimitSurfaces.map((surface) => `missing_rate_limit_surface:${surface}`),
    ...missingCacheControls.map((cacheControl) => `missing_cache_control:${cacheControl}`),
    ...missingRouteFiles.map((route) => `missing_route_file:${route}`),
    ...orphanedRateLimitSurfaces.map((surface) => `orphaned_rate_limit_surface:${surface}`),
  ];

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-api-implementation",
    validatorVersion: MORAL_TRADE_API_IMPLEMENTATION_AUDIT_VERSION,
    profileVersion: profile.version,
    routeCount: profile.routes.length,
    implementedRateLimitSurfaces,
    implementedCacheControls: implementedCacheControlKeys,
    missingRateLimitSurfaces,
    missingCacheControls,
    missingRouteFiles,
    orphanedRateLimitSurfaces,
    routeFindings,
    blockers,
  };
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
  const apiContractRoute = profile.routes.find(
    (route) => route.key === "moral_trade_api_contract",
  );
  const aggregateHealthResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "moral_trade_aggregate_health_response",
  );
  const apiContractResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "api_contract_response",
  );
  const provenanceSchemaResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "provenance_schema_response",
  );
  const schemaRegistryRoute = profile.routes.find(
    (route) => route.key === "moral_trade_schema_registry",
  );
  const schemaRegistryResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "schema_registry_response",
  );
  const publicOffersRoute = profile.routes.find(
    (route) => route.key === "public_offers_collection",
  );
  const publicOffersRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offers_collection_request",
  );
  const publicOffersResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offers_collection_response",
  );
  const publicOfferDetailRoute = profile.routes.find(
    (route) => route.key === "public_offer_detail",
  );
  const publicOfferDetailRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offer_detail_request",
  );
  const publicOfferDetailResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offer_detail_response",
  );
  const publicOffersFacetsRoute = profile.routes.find(
    (route) => route.key === "public_offers_facets",
  );
  const publicOffersFacetsRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offers_facets_request",
  );
  const publicOffersFacetsResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offers_facets_response",
  );
  const savedSearchCreateRoute = profile.routes.find(
    (route) => route.key === "saved_search_create",
  );
  const savedSearchCreateRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "saved_search_create_request",
  );
  const savedSearchCreateResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "saved_search_create_response",
  );
  const publicOfferFollowRoute = profile.routes.find(
    (route) => route.key === "public_offer_follow",
  );
  const publicOfferFollowRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offer_follow_request",
  );
  const publicOfferFollowResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offer_follow_response",
  );
  const publicOfferCreateSimilarRoute = profile.routes.find(
    (route) => route.key === "public_offer_create_similar",
  );
  const publicOfferCreateSimilarRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offer_create_similar_request",
  );
  const publicOfferCreateSimilarResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "public_offer_create_similar_response",
  );
  const profileExportRoute = profile.routes.find(
    (route) => route.key === "profile_export",
  );
  const profileImportRoute = profile.routes.find(
    (route) => route.key === "profile_import",
  );
  const dataModelContractRoute = profile.routes.find(
    (route) => route.key === "moral_trade_data_model_contract",
  );
  const dataModelContractResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "data_model_contract_response",
  );
  const policyBundleContractRoute = profile.routes.find(
    (route) => route.key === "moral_trade_policy_bundle_contract",
  );
  const policyBundleContractResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "policy_bundle_contract_response",
  );
  const copilotReviewRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "copilot_review_request",
  );
  const copilotReviewResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "copilot_review_response",
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
  const matchSignalSchema = profile.schemaDefinitions.find(
    (schema) => schema.key === "match_signal",
  );
  const challengeAppealContractRoute = profile.routes.find(
    (route) => route.key === "moral_trade_challenge_appeal_contract",
  );
  const challengeAppealEvaluateRoute = profile.routes.find(
    (route) => route.key === "moral_trade_challenge_appeal_evaluate",
  );
  const challengeAppealContractResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "challenge_appeal_contract_response",
  );
  const challengeAppealEvaluateResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "challenge_appeal_evaluate_response",
  );
  const disclosureContractRoute = profile.routes.find(
    (route) => route.key === "moral_trade_disclosure_contract",
  );
  const disclosureEvaluateRoute = profile.routes.find(
    (route) => route.key === "moral_trade_disclosure_evaluate",
  );
  const disclosureContractResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "disclosure_contract_response",
  );
  const disclosureEvaluateResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "disclosure_evaluate_response",
  );
  const backgroundIntroRequestCreateRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "background_intro_request_create_request",
  );
  const backgroundIntroPacketCreateRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "background_intro_packet_create_request",
  );
  const incidentResponseHealthRoute = profile.routes.find(
    (route) => route.key === "moral_trade_incident_response_health",
  );
  const incidentResponseHealthResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "incident_response_health_response",
  );
  const transparencyReportRoute = profile.routes.find(
    (route) => route.key === "moral_trade_transparency_report",
  );
  const transparencyReportResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "transparency_report_response",
  );
  const reviewWorkflowEvaluateRoute = profile.routes.find(
    (route) => route.key === "moral_trade_review_workflow_evaluate",
  );
  const reviewWorkflowEvaluateRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "review_workflow_evaluate_request",
  );
  const reasoningPacketsRoute = profile.routes.find(
    (route) => route.key === "moral_trade_reasoning_packets",
  );
  const reasoningPacketsRequest = profile.schemaDefinitions.find(
    (schema) => schema.key === "reasoning_packets_request",
  );
  const reasoningPacketsResponse = profile.schemaDefinitions.find(
    (schema) => schema.key === "reasoning_packets_response",
  );
  const analyticsRoutes = profile.routes.filter((route) => route.privacyClass === "redacted_analytics");
  const funnelEventSchema = profile.schemaDefinitions.find(
    (schema) => schema.key === "funnel_event_request",
  );
  const implementationAudit = auditMoralTradeApiImplementationContract(profile);
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
      "profile-portability-routes",
      "Profile export and import fail closed with private cache and rate limits",
      profileExportRoute?.method === "GET" &&
        profileExportRoute.path === "/api/profile/export" &&
        profileExportRoute.auth === "authenticated" &&
        profileExportRoute.cacheControl === "private_no_store" &&
        profileExportRoute.rateLimitSurface === "profile_portability" &&
        /Fail closed|viewer-owned portable profile bundle/i.test(profileExportRoute.fallback) &&
        profileImportRoute?.method === "POST" &&
        profileImportRoute.path === "/api/profile/import" &&
        profileImportRoute.auth === "authenticated" &&
        profileImportRoute.cacheControl === "private_no_store" &&
        profileImportRoute.rateLimitSurface === "profile_portability" &&
        /Fail closed|validate payload shape|counterparty-linked records/i.test(
          profileImportRoute.fallback,
        ),
      [profileExportRoute, profileImportRoute]
        .flatMap((route) =>
          route ? [`${route.key}:${route.rateLimitSurface}:${route.cacheControl}`] : [],
        )
        .join(", "),
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
      "api-contract-route",
      "API contract route is cataloged and implementation-audited",
      apiContractRoute?.method === "GET" &&
        apiContractRoute.path === "/api/moral-trade/api-contract" &&
        apiContractRoute.cacheControl === "no_store_dynamic" &&
        apiContractRoute.rateLimitSurface === "public_contract_read" &&
        /validator blockers|implementation audit|route catalog|schema definitions|privacy classes|test hooks|private participant records/i.test(
          apiContractRoute.fallback,
        ) &&
        Boolean(
          apiContractResponse?.fields.some(
            (field) =>
              field.key === "implementationAudit" &&
              field.type === "implementation_audit",
          ),
        ) &&
        implementationAudit.status === "pass",
      apiContractRoute
        ? `${apiContractRoute.key}:${apiContractRoute.rateLimitSurface}:${apiContractRoute.cacheControl}:${implementationAudit.status}`
        : "missing",
    ),
    check(
      "implementation-backed-rate-limits-and-cache",
      "Published rate-limit and cache names have executable tables",
      implementationAudit.status === "pass",
      [
        `routes=${implementationAudit.routeCount}`,
        `missingRateLimits=${implementationAudit.missingRateLimitSurfaces.join("|") || "none"}`,
        `missingCacheControls=${implementationAudit.missingCacheControls.join("|") || "none"}`,
        `orphanedRateLimits=${implementationAudit.orphanedRateLimitSurfaces.join("|") || "none"}`,
      ].join(", "),
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
        ) &&
        Boolean(
          provenanceSchemaResponse?.fields.some(
            (field) => field.key === "persistenceTables" && field.type === "array",
          ),
        ),
      provenanceSchemaRoute
        ? `${provenanceSchemaRoute.key}:${provenanceSchemaRoute.cacheControl}`
        : "missing",
    ),
    check(
      "schema-registry-route",
      "Schema registry route publishes exact JSON Schema documents",
      schemaRegistryRoute?.method === "GET" &&
        schemaRegistryRoute.cacheControl === "no_store_dynamic" &&
        schemaRegistryRoute.privacyClass === "public_schema" &&
        /schema registry|schema documents|data-model schema|blockers/i.test(
          schemaRegistryRoute.fallback,
        ) &&
        Boolean(
          schemaRegistryResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          schemaRegistryResponse?.fields.some(
            (field) =>
              field.key === "schemaDocuments" && field.privacy === "public_schema",
          ),
        ),
      schemaRegistryRoute
        ? `${schemaRegistryRoute.key}:${schemaRegistryRoute.cacheControl}`
        : "missing",
    ),
    check(
      "public-offers-collection-route",
      "Public offers collection route exposes filtered listings and facets safely",
      publicOffersRoute?.method === "GET" &&
        publicOffersRoute.path === "/api/offers" &&
        publicOffersRoute.cacheControl === "no_store_dynamic" &&
        publicOffersRoute.rateLimitSurface === "offer_collection_read" &&
        publicOffersRoute.privacyClass === "public_contract" &&
        /worked-example|live listing|visible facets|private wishes|contact details|global moral ranking/i.test(
          publicOffersRoute.fallback,
        ) &&
        Boolean(
          publicOffersRequest?.fields.some(
            (field) => field.key === "tab" && /defaults to examples/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOffersResponse?.fields.some(
            (field) =>
              field.key === "items" && field.type === "public_offer_listing_array",
          ),
        ) &&
        Boolean(
          publicOffersResponse?.fields.some(
            (field) =>
              field.key === "meta" && /hidden-zero-facet|available facet/i.test(field.description),
          ),
        ),
      publicOffersRoute
        ? `${publicOffersRoute.key}:${publicOffersRoute.rateLimitSurface}:${publicOffersRoute.cacheControl}`
        : "missing",
    ),
    check(
      "public-offer-detail-route",
      "Public offer detail route exposes one public listing without private state",
      publicOfferDetailRoute?.method === "GET" &&
        publicOfferDetailRoute.path === "/api/offers/:slug" &&
        publicOfferDetailRoute.cacheControl === "no_store_dynamic" &&
        publicOfferDetailRoute.rateLimitSurface === "offer_detail_read" &&
        publicOfferDetailRoute.privacyClass === "public_contract" &&
        /validator-backed public listing detail|404 blockers|contact details|private wishes|personalized saved-offer state|agreement formation/i.test(
          publicOfferDetailRoute.fallback,
        ) &&
        Boolean(
          publicOfferDetailRequest?.fields.some(
            (field) => field.key === "slug" && field.required,
          ),
        ) &&
        Boolean(
          publicOfferDetailResponse?.fields.some(
            (field) => field.key === "item" && field.type === "public_offer_listing_or_null",
          ),
        ) &&
        Boolean(
          publicOfferDetailResponse?.fields.some(
            (field) => field.key === "actions" && /sign-in|consent/i.test(field.description),
          ),
        ),
      publicOfferDetailRoute
        ? `${publicOfferDetailRoute.key}:${publicOfferDetailRoute.rateLimitSurface}:${publicOfferDetailRoute.cacheControl}`
        : "missing",
    ),
    check(
      "public-offers-facets-route",
      "Public offer facets route exposes positive-count browse facets safely",
      publicOffersFacetsRoute?.method === "GET" &&
        publicOffersFacetsRoute.path === "/api/offers/facets" &&
        publicOffersFacetsRoute.cacheControl === "no_store_dynamic" &&
        publicOffersFacetsRoute.rateLimitSurface === "offer_facets_read" &&
        publicOffersFacetsRoute.privacyClass === "public_contract" &&
        /positive-count public facets|default-tab|zero-count private-sensitive facets|personalized browse state/i.test(
          publicOffersFacetsRoute.fallback,
        ) &&
        Boolean(
          publicOffersFacetsRequest?.fields.some(
            (field) => field.key === "tab" && /defaults to examples/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOffersFacetsResponse?.fields.some(
            (field) => field.key === "availableFacets" && /positive-count/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOffersFacetsResponse?.fields.some(
            (field) => field.key === "meta" && /hidden-zero-facet|defaulting/i.test(field.description),
          ),
        ),
      publicOffersFacetsRoute
        ? `${publicOffersFacetsRoute.key}:${publicOffersFacetsRoute.rateLimitSurface}:${publicOffersFacetsRoute.cacheControl}`
        : "missing",
    ),
    check(
      "saved-search-create-route",
      "Saved-search create route stores viewer-owned browse memory only",
      savedSearchCreateRoute?.method === "POST" &&
        savedSearchCreateRoute.path === "/api/saved-searches" &&
        savedSearchCreateRoute.auth === "authenticated" &&
        savedSearchCreateRoute.cacheControl === "private_no_store" &&
        savedSearchCreateRoute.rateLimitSurface === "saved_search_write" &&
        savedSearchCreateRoute.privacyClass === "authenticated_private" &&
        /viewer authentication|sign-in draft without storage|private wishes|contact details|autonomous outreach|platform moral ranking/i.test(
          savedSearchCreateRoute.fallback,
        ) &&
        Boolean(
          savedSearchCreateRequest?.fields.some(
            (field) => field.key === "notifyOnLiveMatch" && field.type === "boolean",
          ),
        ) &&
        Boolean(
          savedSearchCreateRequest?.fields.some(
            (field) => field.key === "cause" && /follow-cause/i.test(field.description),
          ),
        ) &&
        Boolean(
          savedSearchCreateResponse?.fields.some(
            (field) => field.key === "signInUrl" && /no search is stored before auth/i.test(field.description),
          ),
        ) &&
        Boolean(
          savedSearchCreateResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ),
      savedSearchCreateRoute
        ? `${savedSearchCreateRoute.key}:${savedSearchCreateRoute.rateLimitSurface}:${savedSearchCreateRoute.cacheControl}`
        : "missing",
    ),
    check(
      "public-offer-follow-route",
      "Offer follow route stores viewer-owned saved-offer state only",
      publicOfferFollowRoute?.method === "POST" &&
        publicOfferFollowRoute.path === "/api/offers/:id/follow" &&
        publicOfferFollowRoute.auth === "authenticated" &&
        publicOfferFollowRoute.cacheControl === "private_no_store" &&
        publicOfferFollowRoute.rateLimitSurface === "offer_follow_write" &&
        publicOfferFollowRoute.privacyClass === "authenticated_private" &&
        /viewer authentication|live public offer id|viewer-owned saved-offer record|private wishes|contact details|public social-follow counts|autonomous outreach|agreement formation/i.test(
          publicOfferFollowRoute.fallback,
        ) &&
        Boolean(
          publicOfferFollowRequest?.fields.some(
            (field) => field.key === "id" && /worked-example slugs are rejected/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOfferFollowResponse?.fields.some(
            (field) => field.key === "savedOffer" && /no public social counters|contact details/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOfferFollowResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ),
      publicOfferFollowRoute
        ? `${publicOfferFollowRoute.key}:${publicOfferFollowRoute.rateLimitSurface}:${publicOfferFollowRoute.cacheControl}`
        : "missing",
    ),
    check(
      "public-offer-create-similar-route",
      "Offer create-similar route returns only review-required draft prefills",
      publicOfferCreateSimilarRoute?.method === "POST" &&
        publicOfferCreateSimilarRoute.path === "/api/offers/:id/create-similar" &&
        publicOfferCreateSimilarRoute.auth === "authenticated" &&
        publicOfferCreateSimilarRoute.cacheControl === "private_no_store" &&
        publicOfferCreateSimilarRoute.rateLimitSurface === "offer_create_similar" &&
        publicOfferCreateSimilarRoute.privacyClass === "authenticated_private" &&
        /viewer authentication|live public offer id|review-required draft prefill|Never store before auth|private wishes|contact details|raw source notes|evidence URLs|global moral ranking|escrow|agreement formation/i.test(
          publicOfferCreateSimilarRoute.fallback,
        ) &&
        Boolean(
          publicOfferCreateSimilarRequest?.fields.some(
            (field) => field.key === "id" && /worked-example slugs are rejected/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOfferCreateSimilarResponse?.fields.some(
            (field) => field.key === "draft" && /stateMutation:false|no offer is stored before auth/i.test(field.description),
          ),
        ) &&
        Boolean(
          publicOfferCreateSimilarResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ),
      publicOfferCreateSimilarRoute
        ? `${publicOfferCreateSimilarRoute.key}:${publicOfferCreateSimilarRoute.rateLimitSurface}:${publicOfferCreateSimilarRoute.cacheControl}`
        : "missing",
    ),
    check(
      "data-model-contract-route",
      "Data model contract route is validator-backed and privacy-preserving",
      dataModelContractRoute?.method === "GET" &&
        dataModelContractRoute.cacheControl === "no_store_dynamic" &&
        dataModelContractRoute.privacyClass === "public_contract" &&
        /validation blockers|private wishes|source notes|saved searches|privacy grants|payment records|raw feeds/i.test(
          dataModelContractRoute.fallback,
        ) &&
        Boolean(
          dataModelContractResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          dataModelContractResponse?.fields.some(
            (field) =>
              field.key === "publicContract" && field.privacy === "public_contract",
          ),
        ),
      dataModelContractRoute
        ? `${dataModelContractRoute.key}:${dataModelContractRoute.cacheControl}`
        : "missing",
    ),
    check(
      "policy-bundle-contract-route",
      "Policy bundle contract route is validator-backed and strict-bundle scoped",
      policyBundleContractRoute?.method === "GET" &&
        policyBundleContractRoute.cacheControl === "no_store_dynamic" &&
        policyBundleContractRoute.privacyClass === "public_contract" &&
        /validation blockers|broad app context|hidden reasoning|private feeds|unlisted factor codes|unseeded prohibited patterns/i.test(
          policyBundleContractRoute.fallback,
        ) &&
        Boolean(
          policyBundleContractResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          policyBundleContractResponse?.fields.some(
            (field) =>
              field.key === "publicContract" && field.privacy === "public_contract",
          ),
        ),
      policyBundleContractRoute
        ? `${policyBundleContractRoute.key}:${policyBundleContractRoute.cacheControl}`
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
          /never store|without changing proposal state|change proposal state/i.test(route.fallback) &&
          /strict-input-bundle|no copilot output packet/i.test(route.fallback),
      ) &&
        Boolean(
          copilotReviewRequest?.fields.some(
            (field) =>
              field.key === "draft" &&
              /unsupported, private, protected-trait, raw-note, contact-detail, broad-context, or extra draft fields fail closed/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          copilotReviewRequest?.fields.some(
            (field) =>
              field.key === "citations" &&
              /unsupported, private, contact-like, raw-note, source-note, thread, token, or hidden-reasoning labels fail closed/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          copilotReviewRequest?.fields.some(
            (field) =>
              field.key === "evidenceMetadata" &&
              field.privacy === "private_request" &&
              /unsupported extra fields|raw artifact content|private notes|contact details|fail closed/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          copilotReviewResponse?.fields.some(
            (field) =>
              field.key === "evidenceMetadataSummary" &&
              field.required &&
              /unsupported-field counts|raw artifacts|unsupported extra fields|private notes/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          copilotReviewResponse?.fields.some(
            (field) =>
              field.key === "output" &&
              !field.required &&
              /strict input bundle|pre-output validation/i.test(field.description),
          ),
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
        ) &&
        Boolean(
          reviewWorkflowEvaluateRequest?.fields.some(
            (field) =>
              field.key === "reviewInput" &&
              /unsupported, private, protected-trait, raw-note, contact-detail, or extra wrapper keys fail closed/i.test(
                field.description,
              ),
          ),
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
        ) &&
        Boolean(
          matchSignalSchema?.fields.some(
            (field) =>
              field.key === "privacyPolicyId" &&
              field.required &&
              /redacted-preview privacy policy id/i.test(field.description),
          ),
        ) &&
        Boolean(
          matchSignalSchema?.fields.some(
            (field) =>
              field.key === "disclosureStage" &&
              field.required &&
              /disclosure-grant workflow/i.test(field.description),
          ),
        ) &&
        Boolean(
          matchSignalSchema?.fields.some(
            (field) =>
              field.key === "redactedFields" &&
              field.required &&
              /exact private wishes/i.test(field.description) &&
              /contact details/i.test(field.description),
          ),
        ) &&
        Boolean(
          matchSignalSchema?.fields.some(
            (field) =>
              field.key === "humanReviewRequired" &&
              field.required &&
              /before disclosure, contact, reliance, or state changes/i.test(
                field.description,
              ),
          ),
        ),
      matchSignalEvaluateRoute
        ? `${matchSignalEvaluateRoute.key}:${matchSignalEvaluateRoute.cacheControl}:${matchSignalEvaluateRoute.rateLimitSurface}`
        : "missing",
    ),
    check(
      "challenge-appeal-routes",
      "Challenge appeal contract and evaluate routes are validator-backed, scoped, and non-mutating",
      challengeAppealContractRoute?.method === "GET" &&
        challengeAppealContractRoute.cacheControl === "no_store_dynamic" &&
        /validation blockers|unrelated moral disagreements|human review/i.test(
          challengeAppealContractRoute.fallback,
        ) &&
        challengeAppealEvaluateRoute?.method === "POST" &&
        challengeAppealEvaluateRoute.cacheControl === "private_no_store" &&
        challengeAppealEvaluateRoute.rateLimitSurface === "challenge_appeal_evaluate" &&
        /never store|private details|broaden appeal scope|resolve disputes without human review/i.test(
          challengeAppealEvaluateRoute.fallback,
        ) &&
        Boolean(
          challengeAppealContractResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          challengeAppealEvaluateResponse?.fields.some(
            (field) => field.key === "stateMutation" && /Always false/i.test(field.description),
          ),
        ),
      challengeAppealEvaluateRoute
        ? `${challengeAppealEvaluateRoute.key}:${challengeAppealEvaluateRoute.cacheControl}:${challengeAppealEvaluateRoute.rateLimitSurface}`
        : "missing",
    ),
    check(
      "disclosure-grant-routes",
      "Disclosure grant contract and evaluate routes are validator-backed, staged, and non-mutating",
      disclosureContractRoute?.method === "GET" &&
        disclosureContractRoute.cacheControl === "no_store_dynamic" &&
        /validation blockers|exact wishes|source notes|contact details|field-level stage grants/i.test(
          disclosureContractRoute.fallback,
        ) &&
        disclosureEvaluateRoute?.method === "POST" &&
        disclosureEvaluateRoute.cacheControl === "private_no_store" &&
        disclosureEvaluateRoute.rateLimitSurface === "disclosure_evaluate" &&
        /never store|reveal exact wishes|mine private feeds|introduce counterparties|mutate privacy grants/i.test(
          disclosureEvaluateRoute.fallback,
        ) &&
        Boolean(
          disclosureContractResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          disclosureEvaluateResponse?.fields.some(
            (field) => field.key === "stateMutation" && /Always false/i.test(field.description),
          ),
        ),
      disclosureEvaluateRoute
        ? `${disclosureEvaluateRoute.key}:${disclosureEvaluateRoute.cacheControl}:${disclosureEvaluateRoute.rateLimitSurface}`
        : "missing",
    ),
    check(
      "background-intro-request-field-boundary",
      "Background intro requests fail closed on unsupported disclosure fields",
      Boolean(
        backgroundIntroRequestCreateRequest?.fields.some(
          (field) =>
            field.key === "requestedFieldKeys" &&
            /unsupported, private, protected-trait, raw-note, contact-detail, or extra field keys fail closed/i.test(
              field.description,
            ),
        ),
      ),
      backgroundIntroRequestCreateRequest
        ? `${backgroundIntroRequestCreateRequest.key}:requestedFieldKeys`
        : "missing",
    ),
    check(
      "background-intro-requester-answer-boundary",
      "Background intro requester answers fail closed on unsupported private fields",
      Boolean(
        backgroundIntroPacketCreateRequest?.fields.some(
          (field) =>
            field.key === "requesterAnswers" &&
            /approved firstQuestion, privacyConstraints, and proposedTradeShape keys/i.test(
              field.description,
            ) &&
            /unsupported, private, protected-trait, raw-note, contact-detail, or extra requester-answer keys fail closed/i.test(
              field.description,
            ),
        ),
      ) &&
        Boolean(
          backgroundIntroRequestCreateRequest?.fields.some(
            (field) =>
              field.key === "proposedTradeShape" &&
              /unsupported, private, protected-trait, raw-note, contact-detail, or extra requester-answer keys fail closed/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          backgroundIntroRequestCreateRequest?.fields.some(
            (field) =>
              field.key === "privacyConstraints" &&
              /unsupported, private, protected-trait, raw-note, contact-detail, or extra requester-answer keys fail closed/i.test(
                field.description,
              ),
          ),
        ),
      [
        backgroundIntroPacketCreateRequest
          ? `${backgroundIntroPacketCreateRequest.key}:requesterAnswers`
          : "missing-packet",
        backgroundIntroRequestCreateRequest
          ? `${backgroundIntroRequestCreateRequest.key}:proposedTradeShape/privacyConstraints`
          : "missing-request",
      ].join(", "),
    ),
    check(
      "incident-response-health-route",
      "Incident response health route is validator-backed and privacy-redacted",
      incidentResponseHealthRoute?.method === "GET" &&
        incidentResponseHealthRoute.cacheControl === "no_store_dynamic" &&
        incidentResponseHealthRoute.privacyClass === "public_contract" &&
        /incident response blockers|raw private wishes|source notes|contact details|payment secrets|provider payloads/i.test(
          incidentResponseHealthRoute.fallback,
        ) &&
        Boolean(
          incidentResponseHealthResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          incidentResponseHealthResponse?.fields.some(
            (field) =>
              field.key === "publicContract" && field.privacy === "public_contract",
          ),
        ),
      incidentResponseHealthRoute
        ? `${incidentResponseHealthRoute.key}:${incidentResponseHealthRoute.cacheControl}`
        : "missing",
    ),
    check(
      "transparency-report-route",
      "Transparency report route is aggregate-only, thresholded, and health-audited",
      transparencyReportRoute?.method === "GET" &&
        transparencyReportRoute.path === "/api/moral-trade/transparency/report" &&
        transparencyReportRoute.auth === "public" &&
        transparencyReportRoute.cacheControl === "no_store_dynamic" &&
        transparencyReportRoute.rateLimitSurface === "public_contract_read" &&
        transparencyReportRoute.privacyClass === "public_contract" &&
        /threshold rules|aggregate-only|never expose participant ids|profile text|source notes|exact wishes|contact details|private evidence artifacts/i.test(
          transparencyReportRoute.fallback,
        ) &&
        Boolean(
          transparencyReportResponse?.fields.some(
            (field) => field.key === "validation" && field.type === "validator_result",
          ),
        ) &&
        Boolean(
          transparencyReportResponse?.fields.some(
            (field) =>
              field.key === "publicContract" &&
              field.privacy === "public_contract" &&
              /minimum public count|metric definitions|privacy rules/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          transparencyReportResponse?.fields.some(
            (field) =>
              field.key === "report" &&
              field.privacy === "public_contract" &&
              /Thresholded aggregate metrics only|small nonzero samples are suppressed|no private case records/i.test(
                field.description,
              ),
          ),
        ) &&
        Boolean(
          aggregateHealthResponse?.fields.some(
            (field) =>
              field.key === "transparencyReportValidation" &&
              field.type === "validator_result" &&
              /small-sample suppression|private-field exclusion/i.test(field.description),
          ),
        ),
      transparencyReportRoute
        ? `${transparencyReportRoute.key}:${transparencyReportRoute.cacheControl}:${transparencyReportRoute.rateLimitSurface}`
        : "missing",
    ),
    check(
      "reasoning-packets-validator",
      "Reasoning packets route is public and validator-backed",
      reasoningPacketsRoute?.method === "GET" &&
        reasoningPacketsRoute.requestSchema === "reasoning_packets_request" &&
        reasoningPacketsRoute.cacheControl === "no_store_dynamic" &&
        reasoningPacketsRoute.privacyClass === "public_contract" &&
        /validator|filter facets|packet_generation_failed|route crash|private offers|hidden reasoning|global moral ranking/i.test(
          reasoningPacketsRoute.fallback,
        ) &&
        Boolean(
          reasoningPacketsRequest?.fields.some(
            (field) =>
              field.key === "status" &&
              field.type === "enum" &&
              field.required === false,
          ),
        ) &&
        Boolean(
          reasoningPacketsResponse?.fields.some(
            (field) => field.key === "recoveryMode" && /packet_generation_failed/i.test(field.description),
          ),
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
        ) &&
        Boolean(
          reasoningPacketsResponse?.fields.some(
            (field) => field.key === "activeFilter" && field.type === "enum",
          ),
        ) &&
        Boolean(
          reasoningPacketsResponse?.fields.some(
            (field) => field.key === "filterCounts" && field.privacy === "public_contract",
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
        profile.apiTests.includes("data_model_contract_route") &&
        profile.apiTests.includes("policy_bundle_contract_route") &&
        profile.apiTests.includes("public_offers_collection_route") &&
        profile.apiTests.includes("performance_route_contract") &&
        profile.apiTests.includes("incident_response_route_contract"),
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
