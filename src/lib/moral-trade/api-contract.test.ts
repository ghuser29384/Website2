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
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_release_gate_contract" &&
        route.path === "/api/moral-trade/release-gates/contract" &&
        route.responseSchema === "release_gate_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_participant_confirmation_contract" &&
        route.path === "/api/moral-trade/participant-confirmations/contract" &&
        route.responseSchema === "participant_confirmation_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_participant_eligibility_contract" &&
        route.path === "/api/moral-trade/participant-eligibility/contract" &&
        route.responseSchema === "participant_eligibility_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_account_security_contract" &&
        route.path === "/api/moral-trade/account-security/contract" &&
        route.responseSchema === "account_security_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_reviewer_quality_contract" &&
        route.path === "/api/moral-trade/reviewer-quality/contract" &&
        route.responseSchema === "reviewer_quality_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_anti_enumeration_contract" &&
        route.path === "/api/moral-trade/anti-enumeration/contract" &&
        route.responseSchema === "anti_enumeration_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_privacy_governance_contract" &&
        route.path === "/api/moral-trade/privacy-governance/contract" &&
        route.responseSchema === "privacy_governance_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_impact_claim_contract" &&
        route.path === "/api/moral-trade/impact-claims/contract" &&
        route.responseSchema === "impact_claim_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_matching_clearing_contract" &&
        route.path === "/api/moral-trade/matching-clearing/contract" &&
        route.responseSchema === "matching_clearing_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_baseline_integrity_contract" &&
        route.path === "/api/moral-trade/baseline-integrity/contract" &&
        route.responseSchema === "baseline_integrity_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_agreement_amendment_contract" &&
        route.path === "/api/moral-trade/agreement-amendments/contract" &&
        route.responseSchema === "agreement_amendment_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_production_readiness_contract" &&
        route.path === "/api/moral-trade/production-readiness/contract" &&
        route.responseSchema === "production_readiness_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_recipient_destination_contract" &&
        route.path === "/api/moral-trade/recipient-destinations/contract" &&
        route.responseSchema === "recipient_destination_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_side_agreement_contract" &&
        route.path === "/api/moral-trade/side-agreements/contract" &&
        route.responseSchema === "side_agreement_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_trade_classification_contract" &&
        route.path === "/api/moral-trade/trade-classification/contract" &&
        route.responseSchema === "trade_classification_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_protective_assessment_contract" &&
        route.path === "/api/moral-trade/protective-assessments/contract" &&
        route.responseSchema === "protective_assessment_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_user_safety_content_moderation_contract" &&
        route.path ===
          "/api/moral-trade/user-safety-content-moderation/contract" &&
        route.responseSchema ===
          "user_safety_content_moderation_contract_response",
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_financial_settlement_controls_contract" &&
        route.path ===
          "/api/moral-trade/financial-settlement-controls/contract" &&
        route.responseSchema ===
          "financial_settlement_controls_contract_response",
    ),
  );
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
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_performance_health" &&
        /route segment error-boundary evidence/i.test(route.fallback),
    ),
  );
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
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "moral_trade_private_overlap_contract" &&
        route.path === "/api/moral-trade/private-overlap/contract" &&
        route.responseSchema === "private_overlap_contract_response" &&
        /formal cryptographic review/i.test(route.fallback) &&
        /raw tags/i.test(route.fallback),
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
        route.key === "background_wish_interview_session_create" &&
        route.path === "/api/background/wish-interview/sessions" &&
        route.auth === "authenticated" &&
        route.cacheControl === "private_no_store" &&
        route.rateLimitSurface === "background_wish_interview_write" &&
        /shadow-only interview session/i.test(route.fallback) &&
        /never mutates the profile/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_wish_interview_answer_create" &&
        route.path === "/api/background/wish-interview/sessions/:id/answer" &&
        route.rateLimitSurface === "background_wish_interview_write" &&
        /configured encryption/i.test(route.fallback) &&
        /field keys, option counts, and length buckets/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_wish_interview_apply" &&
        route.path === "/api/background/wish-interview/sessions/:id/apply" &&
        route.rateLimitSurface === "background_wish_interview_write" &&
        /contact details/i.test(route.fallback) &&
        /live public-preview mutation/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_wish_dialogue_proposal" &&
        route.path === "/api/background/wish-dialogue/:id/proposal" &&
        route.rateLimitSurface === "background_wish_interview_write" &&
        /schema-bound broad field proposals/i.test(route.fallback) &&
        /explicit apply/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_wish_dialogue_apply" &&
        route.path === "/api/background/wish-dialogue/:id/apply" &&
        /exact wishes/i.test(route.fallback) &&
        /live public-preview mutation/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_connection_create" &&
        route.path === "/api/background/source-connections" &&
        route.auth === "authenticated" &&
        route.cacheControl === "private_no_store" &&
        route.rateLimitSurface === "background_source_summary_write" &&
        /raw-ingestion disabled/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_create_bg17_alias" &&
        route.path === "/api/background/sources" &&
        /Bg17-compatible source alias/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_sync_queue" &&
        route.path === "/api/background/sources/:id/draft-summary" &&
        route.responseSchema === "background_source_sync_queue_response" &&
        /rejects raw text/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_summary_draft" &&
        route.path === "/api/background/source-connections/:id/draft-summary" &&
        /raw source text only in request memory/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_summary_draft_bg16_alias" &&
        route.path === "/api/background/source-connections/:id/summary-draft" &&
        route.rateLimitSurface === "background_source_summary_write" &&
        /Bg16-compatible alias/i.test(route.fallback) &&
        /raw imported source text request-only/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_connection_summary_draft_alias" &&
        route.path === "/api/background/source-connections/:id/summaries/draft" &&
        route.rateLimitSurface === "background_source_summary_write" &&
        /Alias/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_summary_approve" &&
        route.path === "/api/background/source-summaries/:id/approve" &&
        /active profile signals/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_connection_approve_bg16_alias" &&
        route.path === "/api/background/source-connections/:id/approve" &&
        route.requestSchema === "background_source_summary_approve_request" &&
        /summaryId or shadowRunId/i.test(route.fallback) &&
        /belongs to the requested source connection/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_source_connection_summary_approve_alias" &&
        route.path === "/api/background/source-connections/:id/summaries/:summaryId/approve" &&
        /belongs to the requested source connection/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_profile_signal_recompute" &&
        route.path === "/api/background/profile-signals/recompute" &&
        /marking expired, revoked, or stale signals/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_profile_recompute_bg16_alias" &&
        route.path === "/api/background/profile/recompute" &&
        route.responseSchema === "background_profile_signal_recompute_response" &&
        /revoked, expired, and stale signal cleanup/i.test(route.fallback),
    ),
  );
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
        route.key === "background_intro_request_create" &&
        route.path === "/api/background/intro-requests" &&
        route.auth === "authenticated" &&
        route.rateLimitSurface === "background_intro_packet_write" &&
        /probe checks/i.test(route.fallback) &&
        /no disclosure/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_intro_request_appeal" &&
        route.path === "/api/background/intro-requests/:id/appeal" &&
        /declined or changes-requested/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_intro_request_approve_contact" &&
        route.path === "/api/background/intro-requests/:id/approve-contact" &&
        route.privacyClass === "authenticated_private_step_up" &&
        /fresh MFA step-up/i.test(route.fallback) &&
        /never returns contact details/i.test(route.fallback),
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
        route.key === "background_opportunity_list" &&
        route.path === "/api/background/opportunities" &&
        route.auth === "authenticated" &&
        route.rateLimitSurface === "background_opportunity_brief_read" &&
        /broad-preview cards/i.test(route.fallback),
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
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_opportunity_feedback_create_alias" &&
        route.path === "/api/background/opportunities/:id/feedback" &&
        route.auth === "authenticated" &&
        route.rateLimitSurface === "background_opportunity_feedback_write" &&
        /same owner-only access/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_helper_run_create" &&
        route.path === "/api/background/helper-runs" &&
        route.rateLimitSurface === "background_helper_run_write" &&
        /query fingerprint/i.test(route.fallback) &&
        /Retry-After/i.test(route.fallback),
    ),
  );
  assert.ok(
    profile.routes.some(
      (route) =>
        route.key === "background_private_overlap_check" &&
        route.path === "/api/background/private-overlap/check" &&
        route.rateLimitSurface === "background_private_overlap_check" &&
        /free text/i.test(route.fallback) &&
        /receipt id/i.test(route.fallback),
    ),
  );
  assert.ok(profile.routes.some((route) => route.key === "wish_registry_search"));
  assert.ok(profile.routes.some((route) => route.key === "funnel_events"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "profile_export_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_interview_session_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_interview_session_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_interview_answer_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_interview_answer_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_interview_apply_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_interview_apply_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_dialogue_start_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_dialogue_proposal_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_wish_dialogue_apply_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_connection_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_sync_queue_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_summary_draft_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_summary_approve_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_profile_signal_recompute_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_summary_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_source_summary_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_packet_create_request"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_intro_packet_create_request")
      ?.fields.some(
        (field) =>
          field.key === "requesterAnswers" &&
          /approved firstQuestion, privacyConstraints, and proposedTradeShape keys/i.test(
            field.description,
          ) &&
          /unsupported, private, protected-trait, raw-note, contact-detail, or extra requester-answer keys fail closed/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_packet_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_request_create_request"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_intro_request_create_request")
      ?.fields.some(
        (field) =>
          field.key === "requestedFieldKeys" &&
          /unsupported, private, protected-trait, raw-note, contact-detail, or extra field keys fail closed/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_intro_request_create_request")
      ?.fields.some(
        (field) =>
          field.key === "proposedTradeShape" &&
          /unsupported, private, protected-trait, raw-note, contact-detail, or extra requester-answer keys fail closed/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_intro_request_create_request")
      ?.fields.some(
        (field) =>
          field.key === "privacyConstraints" &&
          /unsupported, private, protected-trait, raw-note, contact-detail, or extra requester-answer keys fail closed/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_request_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_request_appeal_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_intro_request_contact_approval_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_opportunity_brief_list_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_opportunity_feedback_create_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_opportunity_feedback_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_helper_run_create_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "background_private_overlap_check_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "private_overlap_contract_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_wish_interview_answer_create_response")
      ?.fields.some(
        (field) =>
          field.key === "answerTextStoredInSession" &&
          field.required &&
          /Always false/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_wish_interview_apply_request")
      ?.fields.some(
        (field) =>
          field.key === "approvedDeltaKeys" &&
          /contact details/i.test(field.description) &&
          /raw source notes/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "background_wish_interview_apply_response")
      ?.fields.some(
        (field) =>
          field.key === "profileMutationApplied" &&
          field.required &&
          /Always false/i.test(field.description),
      ),
  );
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
    profile.schemaDefinitions.some(
      (schema) => schema.key === "agreement_amendment_contract_response",
    ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "agreementAmendmentValidation"),
  );
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
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "release_gate_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "participant_confirmation_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "participant_eligibility_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "account_security_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "reviewer_quality_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "anti_enumeration_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "privacy_governance_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "impact_claim_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "matching_clearing_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "baseline_integrity_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "production_readiness_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "recipient_destination_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "schema_registry_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "releaseGateValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "participantConfirmationValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "participantEligibilityValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "accountSecurityValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "reviewerQualityValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "antiEnumerationValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "privacyGovernanceValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "impactClaimValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "matchingClearingValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "baselineIntegrityValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "productionReadinessValidation"),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some((field) => field.key === "recipientDestinationValidation"),
  );
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
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some(
        (field) =>
          field.key === "publicContract" &&
          /decision pipeline/i.test(field.description) &&
          /schema sample validation counts/i.test(field.description) &&
          /AI-governance sample documentation packet count/i.test(field.description) &&
          /document-coverage evidence phrase count/i.test(field.description),
      ),
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
      ?.fields.some(
        (field) =>
          field.key === "draft" &&
          /unsupported, private, protected-trait, raw-note, contact-detail, broad-context, or extra draft fields fail closed/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "copilot_review_request")
      ?.fields.some(
        (field) =>
          field.key === "citations" &&
          /unsupported, private, contact-like, raw-note, source-note, thread, token, or hidden-reasoning labels fail closed/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "copilot_review_request")
      ?.fields.some(
        (field) =>
          field.key === "evidenceMetadata" &&
          /unsupported extra fields/i.test(field.description) &&
          /fail closed/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "copilot_review_response")
      ?.fields.some(
        (field) =>
          field.key === "evidenceMetadataSummary" &&
          field.required &&
          /unsupported-field counts/i.test(field.description) &&
          /unsupported extra fields/i.test(field.description),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "match_signal_contract_response"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "match_signal_evaluate_request"));
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "match_signal_evaluate_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "match_signal_evaluate_request")
      ?.fields.some(
        (field) =>
          field.key === "profilePair" &&
          /unsupported, private, protected-trait, raw-note, or contact-detail keys fail closed/i.test(
            field.description,
          ),
      ),
  );
  const matchSignalSchema = profile.schemaDefinitions.find((schema) => schema.key === "match_signal");
  assert.ok(matchSignalSchema);
  assert.ok(
    matchSignalSchema.fields.some(
      (field) => field.key === "privacyPolicyId" && /redacted-preview privacy policy id/i.test(field.description),
    ),
  );
  assert.ok(
    matchSignalSchema.fields.some(
      (field) => field.key === "disclosureStage" && /disclosure-grant workflow/i.test(field.description),
    ),
  );
  assert.ok(
    matchSignalSchema.fields.some(
      (field) => field.key === "humanReviewRequired" && /before disclosure, contact, reliance, or state changes/i.test(field.description),
    ),
  );
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
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "review_workflow_evaluate_request")
      ?.fields.some(
        (field) =>
          field.key === "reviewInput" &&
          /unsupported, private, protected-trait, raw-note, contact-detail, or extra wrapper keys fail closed/i.test(
            field.description,
          ),
      ),
  );
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
      ?.fields.some(
        (field) =>
          field.key === "recoveryMode" &&
          /packet_generation_failed/i.test(field.description),
      ),
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
  assert.ok(
    profile.schemaDefinitions.some(
      (schema) =>
        schema.key === "performance_health_response" &&
        /route segment error-boundary evidence/i.test(schema.purpose),
    ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "externality_health_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "externality_health_response")
      ?.fields.some(
        (field) => field.key === "publicContract" && /trigger-standard matrix/i.test(field.description),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "ai_governance_health_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "moral_trade_aggregate_health_response")
      ?.fields.some(
        (field) =>
          field.key === "aiGovernanceValidation" &&
          /redacted sample documentation packets/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "ai_governance_health_response")
      ?.fields.some(
        (field) =>
          field.key === "publicContract" &&
          /redacted sample documentation packets/i.test(field.description),
      ),
  );
  assert.ok(profile.schemaDefinitions.some((schema) => schema.key === "document_coverage_health_response"));
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "validation" &&
          /required implementation evidence phrases/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "sourceDocumentArtifacts" &&
          /Hash-checked Markdown and PDF source artifacts/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "sourceStackReferences" &&
          /Recommended source-stack traceability records/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "testingPlanCoverage" &&
          /schema, policy, evidence, privacy, fairness, UX, and resilience/i.test(
            field.description,
          ),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "publicContract" &&
          /required implementation evidence phrases/i.test(field.description),
      ),
  );
  assert.ok(
    profile.schemaDefinitions
      .find((schema) => schema.key === "document_coverage_health_response")
      ?.fields.some(
        (field) =>
          field.key === "canonicalInstruction" &&
          /SHA-256 artifact hash/i.test(field.description),
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
  assert.deepEqual(audit.missingRouteFiles, []);
  assert.deepEqual(audit.orphanedRateLimitSurfaces, []);
  assert.ok(audit.implementedRateLimitSurfaces.includes("public_contract_read"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("offer_collection_read"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_wish_interview_write"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_source_summary_write"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_intro_packet_write"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_helper_run_write"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("background_private_overlap_check"));
  assert.ok(audit.implementedRateLimitSurfaces.includes("analytics_ingest"));
  assert.ok(audit.implementedCacheControls.includes("no_store_dynamic"));
  assert.ok(audit.implementedCacheControls.includes("private_no_store"));
  assert.ok(audit.implementedCacheControls.includes("public_contract_static"));
  assert.ok(
    audit.routeFindings.every(
      (finding) =>
        finding.status === "pass" &&
        finding.routeFilePresent &&
        finding.resolvedRouteFile !== null &&
        finding.rateLimitLimit !== null &&
        finding.cacheControlHeader !== null,
    ),
  );

  const routeFinding = (routeKey: string) => {
    const finding = audit.routeFindings.find((entry) => entry.routeKey === routeKey);
    assert.ok(finding);
    return finding;
  };

  assert.equal(
    routeFinding("public_offer_detail").resolvedRouteFile,
    "src/app/api/offers/[...slug]/route.ts",
  );
  assert.equal(
    routeFinding("public_offer_follow").resolvedRouteFile,
    "src/app/api/offers/[offerId]/follow/route.ts",
  );
  assert.equal(
    routeFinding("background_source_connection_revoke").resolvedRouteFile,
    "src/app/api/background/source-connections/[id]/route.ts",
  );
  assert.equal(
    routeFinding("background_wish_interview_apply").resolvedRouteFile,
    "src/app/api/background/wish-interview/sessions/[id]/apply/route.ts",
  );
  assert.equal(
    routeFinding("background_wish_dialogue_apply").resolvedRouteFile,
    "src/app/api/background/wish-dialogue/[id]/apply/route.ts",
  );
  assert.equal(
    routeFinding("background_source_create_bg17_alias").resolvedRouteFile,
    "src/app/api/background/sources/route.ts",
  );
  assert.equal(
    routeFinding("background_source_sync_queue").resolvedRouteFile,
    "src/app/api/background/sources/[id]/draft-summary/route.ts",
  );
  assert.equal(
    routeFinding("background_helper_run_create").resolvedRouteFile,
    "src/app/api/background/helper-runs/route.ts",
  );
  assert.equal(
    routeFinding("background_private_overlap_check").resolvedRouteFile,
    "src/app/api/background/private-overlap/check/route.ts",
  );
  assert.equal(
    routeFinding("background_source_connection_summary_approve_alias").resolvedRouteFile,
    "src/app/api/background/source-connections/[id]/summaries/[summaryId]/approve/route.ts",
  );
});

test("api contract implementation audit fails when a cataloged route lacks a Next route file", () => {
  const profile = getMoralTradeApiContractProfile();
  const weakenedProfile: MoralTradeApiContractProfile = {
    ...profile,
    routes: profile.routes.map((route) =>
      route.key === "moral_trade_health"
        ? { ...route, path: "/api/moral-trade/missing-route" }
        : route,
    ),
  };
  const audit = auditMoralTradeApiImplementationContract(weakenedProfile);
  const finding = audit.routeFindings.find((entry) => entry.routeKey === "moral_trade_health");

  assert.equal(audit.status, "fail");
  assert.deepEqual(audit.missingRouteFiles, [
    "moral_trade_health:/api/moral-trade/missing-route",
  ]);
  assert.ok(
    audit.blockers.includes("missing_route_file:moral_trade_health:/api/moral-trade/missing-route"),
  );
  assert.equal(finding?.status, "fail");
  assert.equal(finding?.routeFilePresent, false);
  assert.equal(finding?.resolvedRouteFile, null);
  assert.ok(
    finding?.candidateRouteFiles.includes("src/app/api/moral-trade/missing-route/route.ts"),
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
