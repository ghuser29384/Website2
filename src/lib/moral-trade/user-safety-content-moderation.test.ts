import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceUserSafetyContentModeration } from "@/app/api/moral-trade/user-safety-content-moderation/enforce/route";

import {
  evaluateMoralTradeUserSafetyContentModeration,
  getMoralTradeUserSafetyContentModerationContract,
  validateMoralTradeUserSafetyContentModerationContract,
  type MoralTradeContentModerationRecord,
  type MoralTradeModeratedContentType,
  type MoralTradeUserSafetyDimension,
  type MoralTradeUserSafetyRecord,
} from "./user-safety-content-moderation";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function moderationRecord(
  contentType: MoralTradeModeratedContentType,
  overrides: Partial<MoralTradeContentModerationRecord> = {},
): MoralTradeContentModerationRecord {
  return {
    moderationId: `content-moderation:test:${contentType}`,
    subjectType: "pledge_swap",
    subjectRef: "pledge-swap:test",
    contentType,
    status: "approved",
    policySnapshotStatus: "resolved_immutable",
    contentHash: hashFor(`content:${contentType}`),
    moderationReasonCode: "none",
    prohibitedUseCategories: ["viewpoint_neutrality"],
    viewpointNeutralityStatus: "confirmed_neutral",
    viewpointRankedBool: false,
    reviewerQualityStatus: "authorized",
    userFacingReasonCategory: "Content safety and prohibited-use review",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-09-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function userSafetyRecord(
  dimension: MoralTradeUserSafetyDimension,
  overrides: Partial<MoralTradeUserSafetyRecord> = {},
): MoralTradeUserSafetyRecord {
  return {
    safetyRecordId: `user-safety:test:${dimension}`,
    interactionType: "contact_attempt",
    subjectRef: "pledge-swap:test",
    status: "non_blocking",
    policySnapshotStatus: "resolved_immutable",
    safetyDimensions: [dimension],
    contactConsentStatus: "consented",
    rateLimitStatus: "within_limit",
    blockDeclineWithdrawalStatus: "respected",
    abuseReportSeverity: "none",
    abuseReportResolutionStatus: "none",
    retaliationPreventionStatus: "non_blocking",
    contactRecordHash: hashFor(`safety:${dimension}`),
    userFacingReasonCategory: "Contact safety and abuse-report review",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-09-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function moderationBundle(contentTypes: MoralTradeModeratedContentType[]) {
  return contentTypes.map((contentType) => moderationRecord(contentType));
}

function safetyBundle(dimensions: MoralTradeUserSafetyDimension[]) {
  return dimensions.map((dimension) => userSafetyRecord(dimension));
}

test("user-safety/content-moderation contract validates first-class records", () => {
  const contract = getMoralTradeUserSafetyContentModerationContract();
  const validation =
    validateMoralTradeUserSafetyContentModerationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_user_safety_policies"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_contact_interaction_records",
    ),
  );
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_abuse_report_records"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_content_moderation_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_content_moderation_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("user_safety"));
  assert.ok(contract.policySnapshotSubjects.includes("content_moderation"));
  assert.ok(contract.moderationDimensions.includes("viewpoint_neutrality"));
  assert.ok(contract.userSafetyDimensions.includes("contact_consent"));
  assert.ok(contract.userSafetyDimensions.includes("abuse_report_resolution"));
  assert.ok(contract.contractNonClaims.some((claim) => /not moral ranking/i.test(claim)));
  assert.match(contract.privacyBoundary, /private messages/);
});

test("draft preview passes without moderation or user-safety records", () => {
  const result = evaluateMoralTradeUserSafetyContentModeration({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    moderationRecords: [],
    userSafetyRecords: [],
  });

  assert.equal(result.status, "pass");
  assert.equal(result.requiredContentTypeCount, 0);
  assert.equal(result.requiredUserSafetyDimensionCount, 0);
});

test("public publication requires approved viewpoint-neutral content moderation", () => {
  const contract = getMoralTradeUserSafetyContentModerationContract();
  const publication = contract.transitionDefinitions.find(
    (transition) => transition.key === "public_publication",
  );
  assert.ok(publication);

  const approved = evaluateMoralTradeUserSafetyContentModeration({
    transition: "public_publication",
    checkedAt: "2026-06-08T12:00:00.000Z",
    moderationRecords: moderationBundle(publication.requiredContentTypes),
    userSafetyRecords: [],
  });

  assert.equal(approved.status, "pass");
  assert.equal(approved.passingModerationCount, publication.requiredContentTypes.length);

  const blocked = evaluateMoralTradeUserSafetyContentModeration({
    transition: "public_publication",
    checkedAt: "2026-06-08T12:00:00.000Z",
    moderationRecords: [
      ...moderationBundle(
        publication.requiredContentTypes.filter(
          (contentType) => contentType !== "offer_text",
        ),
      ),
      moderationRecord("offer_text", {
        moderationReasonCode: "unpopular_moral_view",
        viewpointNeutralityStatus: "unpopular_view_blocked",
        viewpointRankedBool: true,
      }),
    ],
    userSafetyRecords: [],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "content_moderation_viewpoint_not_neutral:offer_text:unpopular_view_blocked",
    ),
  );
  assert.ok(blocked.blockers.includes("content_moderation_unpopular_view_blocked:offer_text"));
  assert.ok(blocked.blockers.includes("content_moderation_viewpoint_ranked:offer_text"));
});

test("contact introduction blocks missing consent, rate-limit violations, declines, and serious reports", () => {
  const contract = getMoralTradeUserSafetyContentModerationContract();
  const contact = contract.transitionDefinitions.find(
    (transition) => transition.key === "contact_introduction",
  );
  assert.ok(contact);

  const result = evaluateMoralTradeUserSafetyContentModeration({
    transition: "contact_introduction",
    checkedAt: "2026-06-08T12:00:00.000Z",
    moderationRecords: moderationBundle(contact.requiredContentTypes),
    userSafetyRecords: [
      ...safetyBundle(
        contact.requiredUserSafetyDimensions.filter(
          (dimension) => dimension !== "contact_consent",
        ),
      ),
      userSafetyRecord("contact_consent", {
        status: "serious_unresolved",
        contactConsentStatus: "withdrawn",
        rateLimitStatus: "exceeded",
        blockDeclineWithdrawalStatus: "violated",
        abuseReportSeverity: "serious",
        abuseReportResolutionStatus: "serious_unresolved",
        retaliationPreventionStatus: "retaliation_risk",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("user_safety_not_non_blocking:contact_consent:serious_unresolved"));
  assert.ok(
    result.blockers.includes(
      "user_safety_contact_consent_not_valid:contact_consent:withdrawn",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "user_safety_rate_limit_not_valid:contact_consent:exceeded",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "user_safety_decline_block_withdrawal_not_respected:contact_consent:violated",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "user_safety_unresolved_serious_abuse_report:contact_consent:serious_unresolved",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "user_safety_retaliation_prevention_not_non_blocking:contact_consent:retaliation_risk",
    ),
  );
});

test("records fail closed for stale, mutable, superseded, private, and prohibited-use states", () => {
  const result = evaluateMoralTradeUserSafetyContentModeration({
    transition: "reviewer_actionable",
    checkedAt: "2026-06-08T12:00:00.000Z",
    moderationRecords: [
      moderationRecord("offer_text"),
      moderationRecord("evidence_filename_preview"),
      moderationRecord("impact_claim_copy"),
      moderationRecord("reviewer_visible_note", {
        status: "under_review",
        policySnapshotStatus: "mutable",
        contentHash: "sha256:not-valid",
        prohibitedUseCategories: ["malware_cyber_abuse"],
        reviewerQualityStatus: "failed",
        reviewedAt: "2025-01-01T12:00:00.000Z",
        supersededBy: "content-moderation:superseding",
      }),
    ],
    userSafetyRecords: [],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "content_moderation_not_approved:reviewer_visible_note:under_review",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "content_moderation_policy_not_immutable:reviewer_visible_note:mutable",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "content_moderation_hash_invalid:reviewer_visible_note:content-moderation:test:reviewer_visible_note",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "content_moderation_review_stale:reviewer_visible_note:content-moderation:test:reviewer_visible_note",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "content_moderation_reviewer_quality_not_authorized:reviewer_visible_note:failed",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "content_moderation_record_superseded:reviewer_visible_note:content-moderation:test:reviewer_visible_note",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "content_moderation_prohibited_use_unresolved:reviewer_visible_note:malware_cyber_abuse",
    ),
  );
});

test("user-safety/content-moderation enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceUserSafetyContentModeration(
    new Request(
      "http://localhost/api/moral-trade/user-safety-content-moderation/enforce",
      {
        method: "POST",
        body: "{",
      },
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.userSafetyContentModerationGateStatus, "blocked");
  assert.equal(body.publicPublicationAllowed, false);
  assert.equal(body.reviewerActionableAllowed, false);
  assert.equal(body.contactIntroductionAllowed, false);
  assert.equal(body.inviteLinkCreationAllowed, false);
  assert.equal(body.relianceBearingPreviewAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.publicProfileAmplificationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_user_safety_content_moderation_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("user-safety/content-moderation contract is wired through route, health, spec, schema, and API profile", () => {
  const source = readRepoFile(
    "src/lib/moral-trade/user-safety-content-moderation.ts",
  );
  const route = readRepoFile(
    "src/app/api/moral-trade/user-safety-content-moderation/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/user-safety-content-moderation/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpecPage = readRepoFile(
    "src/app/moral-trade/technical-spec/page.tsx",
  );
  const migration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_user_safety_content_moderation.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_user_safety_content_moderation_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const apiContractProfile = readRepoFile(
    "config/moral-trade/api-contract-profile.json",
  );

  assert.match(source, /moral_trade_contact_interaction_records/);
  assert.match(source, /moral_trade_abuse_report_records/);
  assert.match(source, /viewpoint_neutrality/);
  assert.match(source, /unpopular_moral_view/);
  assert.match(route, /validateMoralTradeUserSafetyContentModerationContract/);
  assert.match(enforceRoute, /user_safety_content_moderation_enforce/);
  assert.match(enforceRoute, /moral_trade_user_safety_content_moderation_enforcement_records/);
  assert.match(enforceRoute, /publicPublicationAllowed: false/);
  assert.match(enforceRoute, /contactIntroductionAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:user_safety_content_moderation_enforce/);
  assert.match(enforceRoute, /authentication_required:user_safety_content_moderation_enforce/);
  assert.match(healthRoute, /userSafetyContentModerationValidation/);
  assert.match(healthRoute, /userSafetyContentModerationModerationDimensions/);
  assert.match(technicalSpecPage, /User safety and content moderation/);
  assert.match(
    technicalSpecPage,
    /\/api\/moral-trade\/user-safety-content-moderation\/contract/,
  );
  assert.match(migration, /moral_trade_user_safety_policies/);
  assert.match(migration, /moral_trade_contact_interaction_records/);
  assert.match(migration, /moral_trade_abuse_report_records/);
  assert.match(migration, /moral_trade_content_moderation_policies/);
  assert.match(migration, /moral_trade_content_moderation_records/);
  assert.match(migration, /user_safety/);
  assert.match(migration, /content_moderation/);
  assert.match(enforcementMigration, /moral_trade_user_safety_content_moderation_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /public_publication_allowed_bool = false/);
  assert.match(enforcementMigration, /contact_introduction_allowed_bool = false/);
  assert.match(enforcementMigration, /release_gate_promotion_allowed_bool = false/);
  assert.match(schema, /moral_trade_contact_interaction_records/);
  assert.match(schema, /moral_trade_content_moderation_records/);
  assert.match(schema, /moral_trade_user_safety_content_moderation_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_abuse_report_records/);
  assert.match(databaseTypes, /moral_trade_user_safety_content_moderation_enforcement_records/);
  assert.match(apiContract, /moral_trade_user_safety_content_moderation_contract/);
  assert.match(apiContract, /moral_trade_user_safety_content_moderation_enforce/);
  assert.match(apiRateLimit, /user_safety_content_moderation_enforce/);
  assert.match(operations, /user_safety_content_moderation_enforce/);
  assert.match(operationsProfile, /user_safety_content_moderation_enforce/);
  assert.match(apiContractProfile, /user_safety_content_moderation_contract_response/);
  assert.match(apiContractProfile, /user_safety_content_moderation_enforce_request/);
  assert.match(apiContractProfile, /user_safety_content_moderation_enforce_response/);
  assert.match(apiContractProfile, /moral_trade_user_safety_content_moderation_enforce/);
  assert.match(apiContractProfile, /private messages, reporter identities/);
});
