import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_INTRO_REQUEST_OPEN_LIMIT,
  BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT,
  evaluateBackgroundIntroRequestCadence,
  isBackgroundIntroContactApprovalAllowed,
  summarizeBackgroundIntroContactApprovalStatus,
  validateBackgroundContactApprovalStepUp,
  validateBackgroundIntroAppealRequest,
} from "@/lib/background-intro-requests";
import type { BackgroundAccountSecuritySummary } from "@/lib/background-account-security";

const activeMfaSummary = {
  currentLevel: "aal2",
  error: null,
  factors: [],
  needsStepUp: false,
  nextLevel: "aal2",
  session: {
    accessTokenAgeSeconds: 120,
    accessTokenExpiresInSeconds: 3000,
    accessTokenLifetimeSeconds: 3600,
    accessTokenWindowStatus: "recommended",
    currentAal: "aal2",
    error: null,
    expiresAt: null,
    issuedAt: null,
    recommendedMaxAgeSeconds: 3600,
    reviewLabel: "",
    revocationSupported: true,
    sessionIdSuffix: "session1",
  },
  statusLabel: "MFA active for this session",
  statusTone: "secure",
  unverifiedTotpCount: 0,
  verifiedTotpCount: 1,
} satisfies BackgroundAccountSecuritySummary;

test("intro request cadence blocks repeated target probing with counts only", () => {
  const decision = evaluateBackgroundIntroRequestCadence({
    recentRequests: Array.from({ length: BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT }, (_, index) => ({
      created_at: `2026-06-0${index + 1}T00:00:00.000Z`,
      review_state: index < BACKGROUND_INTRO_REQUEST_OPEN_LIMIT ? "requested" : "declined",
    })),
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.openRequestCount, BACKGROUND_INTRO_REQUEST_OPEN_LIMIT);
  assert.equal(decision.recentRequestCount, BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT);
  assert.ok(decision.blockers.some((blocker) => /unresolved intro requests/i.test(blocker)));
  assert.ok(decision.blockers.some((blocker) => /this week/i.test(blocker)));
});

test("intro request appeals only reopen changed or declined reviewer decisions", () => {
  const valid = validateBackgroundIntroAppealRequest({
    appealStatus: "none",
    reason: "The reviewer missed that the requested fields were already consent-scoped.",
    reviewState: "declined",
  });
  const premature = validateBackgroundIntroAppealRequest({
    appealStatus: "none",
    reason: "Please check this.",
    reviewState: "requested",
  });
  const duplicate = validateBackgroundIntroAppealRequest({
    appealStatus: "under_review",
    reason: "Please recheck the operator decision.",
    reviewState: "declined",
  });

  assert.deepEqual(valid.errors, []);
  assert.ok(premature.errors.some((error) => /after reviewer changes or decline/i.test(error)));
  assert.ok(duplicate.errors.some((error) => /already has an appeal/i.test(error)));
});

test("contact approval requires reviewer approval and fresh MFA step-up", () => {
  assert.equal(isBackgroundIntroContactApprovalAllowed("approved"), true);
  assert.equal(isBackgroundIntroContactApprovalAllowed("sent"), true);
  assert.equal(isBackgroundIntroContactApprovalAllowed("requested"), false);
  assert.equal(
    summarizeBackgroundIntroContactApprovalStatus({
      counterpartyApprovedAt: "2026-06-01T00:05:00.000Z",
      requesterApprovedAt: "2026-06-01T00:00:00.000Z",
    }),
    "mutual_approved",
  );
  assert.deepEqual(validateBackgroundContactApprovalStepUp(activeMfaSummary).errors, []);
  assert.ok(
    validateBackgroundContactApprovalStepUp({
      ...activeMfaSummary,
      currentLevel: "aal1",
      session: { ...activeMfaSummary.session, accessTokenAgeSeconds: 7200 },
    }).errors.some((error) => /MFA step-up/i.test(error)),
  );
});
