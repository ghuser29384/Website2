import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_CANDIDATE_BUDGET_VERSION,
  BACKGROUND_CANDIDATE_EXPOSURE_VERSION,
  buildBackgroundCandidateBudgetRecord,
  buildBackgroundPurposeBindingRecord,
  evaluateBackgroundDelegatePurposeAuthorization,
  evaluateCandidateExposureForBackgroundRun,
  getBackgroundCandidateExposureExpiresAt,
  normalizeBackgroundCandidateAudienceScope,
  normalizeBackgroundInboundDelegateScope,
} from "@/lib/background-candidate-exposure";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

const baseCandidate = {
  allowed_cohort_ids: ["pilot-alpha"],
  candidate_exposure_version: BACKGROUND_CANDIDATE_EXPOSURE_VERSION,
  candidate_inbound_budget_version: BACKGROUND_CANDIDATE_BUDGET_VERSION,
  inbound_delegate_cooloff_until: null,
  inbound_delegate_confirmed_at: "2026-06-01T00:00:00.000Z",
  inbound_delegate_discovery: "cohort_only",
  inbound_delegate_expires_at: "2026-09-01T00:00:00.000Z",
  inbound_delegate_pending_intro_limit: 2,
  inbound_delegate_purpose_bindings: buildBackgroundPurposeBindingRecord(["moral_trade_offer"]),
  inbound_delegate_purpose_codes: ["moral_trade_offer"],
  inbound_delegate_surface_budget_per_window: buildBackgroundCandidateBudgetRecord({
    audienceScope: "cohort_only",
    purposeCodes: ["moral_trade_offer"],
    surfaceLimit: 3,
    windowDays: 30,
  }),
  inbound_delegate_surfaces: ["broad_profile"],
  is_discoverable: true,
  privacy_stage: "broad",
  profile_id: "candidate-1",
  safety_status: "clear",
  share_public_preview: true,
};

test("candidate inbound delegate discovery is default-off and strict about scopes", () => {
  assert.equal(normalizeBackgroundInboundDelegateScope("anything"), "off");
  assert.equal(normalizeBackgroundCandidateAudienceScope("anything"), "cohort_only");

  const decision = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: {
      ...baseCandidate,
      inbound_delegate_discovery: "off",
    },
    cohortScopeId: "pilot-alpha",
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.blockerCode, "candidate_inbound_delegate_off");
});

test("candidate exposure allows only matching purpose binding, surface, cohort, and budget", () => {
  const allowed = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: baseCandidate,
    cohortScopeId: "pilot-alpha",
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });

  assert.equal(allowed.allowed, true);
  assert.deepEqual(allowed.budgetConfig, { surfaceLimit: 3, windowDays: 30 });

  const wrongPurpose = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: baseCandidate,
    cohortScopeId: "pilot-alpha",
    purposeBinding: {
      purposeCode: "pledge_swap",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });

  assert.equal(wrongPurpose.allowed, false);
  assert.equal(wrongPurpose.blockerCode, "candidate_purpose_not_allowed");

  const wrongCohort = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: baseCandidate,
    cohortScopeId: "pilot-beta",
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });

  assert.equal(wrongCohort.allowed, false);
  assert.equal(wrongCohort.blockerCode, "candidate_cohort_mismatch");
});

test("candidate exposure fails closed without a confirmed pending intro limit", () => {
  const decision = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: {
      ...baseCandidate,
      inbound_delegate_pending_intro_limit: undefined,
    },
    cohortScopeId: "pilot-alpha",
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.blockerCode, "candidate_pending_intro_limit_missing");
});

test("candidate exposure requires finite current confirmation windows", () => {
  const missingConfirmation = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: {
      ...baseCandidate,
      inbound_delegate_confirmed_at: null,
    },
    cohortScopeId: "pilot-alpha",
    now: new Date("2026-06-14T00:00:00.000Z"),
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });
  const expired = evaluateCandidateExposureForBackgroundRun({
    audienceScope: "cohort_only",
    candidateProfile: {
      ...baseCandidate,
      inbound_delegate_expires_at: "2026-06-13T00:00:00.000Z",
    },
    cohortScopeId: "pilot-alpha",
    now: new Date("2026-06-14T00:00:00.000Z"),
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    surfaces: ["broad_profile"],
  });

  assert.match(getBackgroundCandidateExposureExpiresAt({ now: new Date("2026-06-14T00:00:00.000Z") }), /^2026-09-12T/);
  assert.equal(missingConfirmation.allowed, false);
  assert.equal(missingConfirmation.blockerCode, "candidate_exposure_confirmation_missing");
  assert.equal(expired.allowed, false);
  assert.equal(expired.blockerCode, "candidate_exposure_expired");
});

test("delegate purpose authorization fails closed on missing or wrong policy bindings", () => {
  const authorized = evaluateBackgroundDelegatePurposeAuthorization({
    allowedPurposeBindings: buildBackgroundPurposeBindingRecord(["moral_trade_offer"]),
    purposeBinding: {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
  });

  assert.equal(authorized, true);
  assert.equal(
    evaluateBackgroundDelegatePurposeAuthorization({
      allowedPurposeBindings: {},
      purposeBinding: {
        purposeCode: "moral_trade_offer",
        purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
      },
    }),
    false,
  );
});

test("candidate exposure schema is service-side and has an atomic reservation function", () => {
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260607_background_networking_bg50_purpose_receipts.sql",
    "utf8",
  );

  assert.match(schema, /create table if not exists public\.background_candidate_exposure_counters/);
  assert.match(schema, /create or replace function public\.reserve_background_candidate_exposure/);
  assert.match(schema, /inbound_delegate_confirmed_at timestamptz/);
  assert.match(schema, /inbound_delegate_expires_at timestamptz/);
  assert.match(schema, /revoke all on public\.background_candidate_exposure_counters from authenticated/);
  assert.match(migration, /inbound_delegate_discovery text not null default 'off'/);
  assert.match(migration, /inbound_delegate_expires_at timestamptz/);
  assert.match(migration, /on conflict \(candidate_profile_id, purpose_code, purpose_policy_version, audience_scope, cohort_scope_id, window_start\)/);
});

test("generated database types include candidate exposure settings and reservation rpc", () => {
  const types = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(types, /inbound_delegate_discovery:/);
  assert.match(types, /inbound_delegate_confirmed_at:/);
  assert.match(types, /inbound_delegate_expires_at:/);
  assert.match(types, /allowed_purpose_bindings:/);
  assert.match(types, /background_candidate_exposure_counters:/);
  assert.match(types, /reserve_background_candidate_exposure:/);
});

test("manual, saved-search, and delegate scans enforce candidate exposure gates", () => {
  const manualActions = readFileSync("src/app/actions.ts", "utf8");
  const backgroundActions = readFileSync("src/app/background-networking/actions.ts", "utf8");
  const savedSearchRoute = readFileSync("src/app/api/jobs/saved-searches/route.ts", "utf8");
  const delegateRoute = readFileSync("src/app/api/jobs/delegates/route.ts", "utf8");
  const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");

  assert.match(manualActions, /evaluateCandidateExposureForBackgroundRun/);
  assert.match(backgroundActions, /background\.candidate_exposure\.update/);
  assert.match(backgroundActions, /getBackgroundCandidateExposureExpiresAt/);
  assert.match(backgroundActions, /inbound_delegate_confirmed_at:\s*null/);
  assert.match(backgroundActions, /update\.inbound_delegate_confirmed_at\s*=\s*nowDate\.toISOString/);
  assert.match(backgroundActions, /update\.inbound_delegate_expires_at\s*=\s*getBackgroundCandidateExposureExpiresAt/);
  assert.match(manualActions, /reserveBackgroundCandidateExposureSurface/);
  assert.match(savedSearchRoute, /evaluateCandidateExposureForBackgroundRun/);
  assert.match(savedSearchRoute, /reserveCandidateExposureSurface/);
  assert.match(delegateRoute, /evaluateBackgroundDelegatePurposeAuthorization/);
  assert.match(delegateRoute, /delegate_purpose_not_authorized/);
  assert.match(delegateRoute, /reserveCandidateExposureSurface/);
  assert.match(delegateRoute, /purpose_code: purposeBinding\.purposeCode/);
  assert.match(dashboard, /saveCandidateInboundDelegateExposureAction/);
  assert.match(dashboard, /inbound_delegate_purpose_codes/);
});
