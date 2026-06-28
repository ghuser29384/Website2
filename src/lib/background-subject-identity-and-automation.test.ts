import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION,
  buildBackgroundSubjectIdentityProfileRow,
  evaluateBackgroundSubjectIdentityGate,
  getSanitizedBackgroundSubjectLabel,
  type BackgroundSubjectKind,
} from "@/lib/background-subject-identity";
import {
  evaluateBackgroundPolicyDecision,
  getBackgroundActionKindRegistry,
  getBackgroundArtifactTransitionPolicyBundle,
  getBackgroundOutputSchemaBundle,
  getBackgroundPolicyCompositionBundle,
  getBackgroundRetentionPolicyBundle,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

const PARTICIPANT_ID = "11111111-1111-4111-8111-111111111111";
const HUMAN_OWNER_ID = "22222222-2222-4222-8222-222222222222";
const FUTURE_EXPIRY = "2099-01-01T00:00:00.000Z";

function buildCurrentSubject(kind: BackgroundSubjectKind) {
  return buildBackgroundSubjectIdentityProfileRow({
    authorityExpiresAt: kind === "individual" ? null : FUTURE_EXPIRY,
    automationDisclosureState:
      kind === "automated_agent" || kind === "service_account"
        ? "disclosed_broadly"
        : "not_automated",
    humanAccountableOwnerId: kind === "individual" ? null : HUMAN_OWNER_ID,
    participantId: PARTICIPANT_ID,
    representativeAuthorityScope:
      kind === "individual"
        ? {}
        : {
            audienceScopes: ["pilot_pack"],
            cohorts: ["forethought_pilot"],
            exposureSettings: ["broad_preview"],
            partnerLanes: ["none"],
            purposeCodes: ["moral_trade_offer"],
            surfaces: ["opportunity_briefs"],
          },
    representativeAuthorityState: kind === "individual" ? "not_required" : "confirmed",
    subjectKind: kind,
  });
}

test("subject identity classifies all supported participant subject kinds with broad labels", () => {
  const kinds: BackgroundSubjectKind[] = [
    "individual",
    "organisation",
    "collective",
    "automated_agent",
    "service_account",
    "partner_operator",
  ];

  for (const kind of kinds) {
    const result = buildCurrentSubject(kind);

    assert.deepEqual(result.errors, []);
    assert.equal(result.row?.subject_kind, kind);
    assert.equal(result.row?.sanitized_subject_label, getSanitizedBackgroundSubjectLabel(kind));
    assert.match(result.row?.subject_identity_version ?? "", /^background-subject-identity-v1:/);

    const gate = evaluateBackgroundSubjectIdentityGate({
      purposeCode: kind === "individual" ? undefined : "moral_trade_offer",
      row: {
        authority_expires_at: result.row?.authority_expires_at ?? null,
        automation_disclosure_state:
          result.row?.automation_disclosure_state ?? "not_automated",
        human_accountable_owner_id: result.row?.human_accountable_owner_id ?? null,
        representative_authority_scope: result.row?.representative_authority_scope ?? {},
        representative_authority_state:
          result.row?.representative_authority_state ?? "not_required",
        sanitized_subject_label: result.row?.sanitized_subject_label ?? "",
        subject_identity_version: result.row?.subject_identity_version ?? "",
        subject_kind: result.row?.subject_kind ?? "individual",
      },
      surface: kind === "individual" ? undefined : "opportunity_briefs",
    });

    assert.equal(gate.allowed, true, `${kind} should pass current subject gate`);
  }
});

test("automation, organisation, service-account, partner, and collective subjects cannot masquerade as individuals", () => {
  const individualWithAutomation = buildBackgroundSubjectIdentityProfileRow({
    automationDisclosureState: "disclosed_broadly",
    humanAccountableOwnerId: HUMAN_OWNER_ID,
    participantId: PARTICIPANT_ID,
    representativeAuthorityState: "confirmed",
    subjectKind: "individual",
  });
  const organisationWithIndividualLabel = buildBackgroundSubjectIdentityProfileRow({
    authorityExpiresAt: FUTURE_EXPIRY,
    humanAccountableOwnerId: HUMAN_OWNER_ID,
    participantId: PARTICIPANT_ID,
    representativeAuthorityScope: {
      purposeCodes: ["moral_trade_offer"],
      surfaces: ["opportunity_briefs"],
    },
    representativeAuthorityState: "confirmed",
    sanitizedSubjectLabel: "individual",
    subjectKind: "organisation",
  });

  assert.ok(
    individualWithAutomation.errors.some((error) => error.includes("ordinary individuals")),
  );
  assert.ok(
    organisationWithIndividualLabel.errors.some((error) => error.includes("derived broad labels")),
  );
});

test("non-individual and automated subjects require current authority, accountable owner, scope, expiry, and broad disclosure", () => {
  const missingAuthority = buildBackgroundSubjectIdentityProfileRow({
    automationDisclosureState: "pending_review",
    participantId: PARTICIPANT_ID,
    representativeAuthorityScope: {},
    representativeAuthorityState: "pending",
    subjectKind: "automated_agent",
  });
  const expired = buildCurrentSubject("collective");
  const gate = evaluateBackgroundSubjectIdentityGate({
    now: new Date("2100-01-01T00:00:00.000Z"),
    purposeCode: "moral_trade_offer",
    row: {
      authority_expires_at: expired.row?.authority_expires_at ?? null,
      automation_disclosure_state: expired.row?.automation_disclosure_state ?? "not_automated",
      human_accountable_owner_id: expired.row?.human_accountable_owner_id ?? null,
      representative_authority_scope: expired.row?.representative_authority_scope ?? {},
      representative_authority_state:
        expired.row?.representative_authority_state ?? "pending",
      sanitized_subject_label: expired.row?.sanitized_subject_label ?? "collective",
      subject_identity_version: expired.row?.subject_identity_version ?? "",
      subject_kind: "collective",
    },
    surface: "opportunity_briefs",
  });

  assert.ok(missingAuthority.errors.includes("Automated agents and service accounts require broad automation disclosure before surfacing."));
  assert.ok(missingAuthority.errors.includes("Non-individual and automated subjects require a human accountable owner."));
  assert.ok(missingAuthority.errors.includes("Non-individual and automated subjects require an authority expiry."));
  assert.ok(missingAuthority.errors.includes("Non-individual and automated subjects require purpose and surface scope."));
  assert.equal(gate.allowed, false);
  assert.ok(gate.blockerCodes.includes("representative_authority_expired"));
});

test("subject identity records reject exact organisation names, staff identifiers, partner-seat ids, service-account ids, and contact details as labels or scope", () => {
  const exactLabel = buildBackgroundSubjectIdentityProfileRow({
    authorityExpiresAt: FUTURE_EXPIRY,
    humanAccountableOwnerId: HUMAN_OWNER_ID,
    participantId: PARTICIPANT_ID,
    representativeAuthorityScope: {
      purposeCodes: ["moral_trade_offer"],
      surfaces: ["opportunity_briefs"],
    },
    representativeAuthorityState: "confirmed",
    sanitizedSubjectLabel: "alice@example.org",
    subjectKind: "organisation",
  });
  const exactScope = buildBackgroundSubjectIdentityProfileRow({
    authorityExpiresAt: FUTURE_EXPIRY,
    humanAccountableOwnerId: HUMAN_OWNER_ID,
    participantId: PARTICIPANT_ID,
    representativeAuthorityScope: {
      partnerLanes: ["ops@example.org"],
      purposeCodes: ["moral_trade_offer"],
      surfaces: ["opportunity_briefs"],
    },
    representativeAuthorityState: "confirmed",
    subjectKind: "partner_operator",
  });

  assert.ok(exactLabel.errors.some((error) => error.includes("exact identities")));
  assert.ok(exactScope.errors.some((error) => error.includes("exact-looking token")));
});

test("subject identity versions change when authority, accountability, automation, kind, or scope changes", () => {
  const base = buildCurrentSubject("organisation");
  const narrowerScope = buildBackgroundSubjectIdentityProfileRow({
    authorityExpiresAt: FUTURE_EXPIRY,
    humanAccountableOwnerId: HUMAN_OWNER_ID,
    participantId: PARTICIPANT_ID,
    representativeAuthorityScope: {
      purposeCodes: ["moral_trade_offer"],
      surfaces: ["intro_requests"],
    },
    representativeAuthorityState: "confirmed",
    subjectKind: "organisation",
  });
  const differentKind = buildCurrentSubject("collective");

  assert.notEqual(base.row?.subject_identity_version, narrowerScope.row?.subject_identity_version);
  assert.notEqual(base.row?.subject_identity_version, differentKind.row?.subject_identity_version);
});

test("subject identity action is governed by manifest policy, retention, transitions, and output schema allowlists", () => {
  const registry = getBackgroundActionKindRegistry();
  const schemas = getBackgroundOutputSchemaBundle();
  const retention = getBackgroundRetentionPolicyBundle();
  const composition = getBackgroundPolicyCompositionBundle();
  const transitions = getBackgroundArtifactTransitionPolicyBundle();
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.subject_identity.update",
    actorRole: "participant",
    idempotencyKey: `${PARTICIPANT_ID}:subject-identity:v1`,
    laneKey: "subject_identity",
    outputSchemaVersion: BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION,
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const schema = schemas.find(
    (row) => row.schemaKey === BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION,
  );

  assert.equal(decision.verdict, "allow");
  assert.ok(
    registry.some((entry) => entry.actionKind === "background.subject_identity.update"),
  );
  assert.equal(schema?.schemaSurface, "requester_subject_identity");
  assert.ok(
    schema?.allowedKeys.every(
      (key) => !/(?:candidate|counterparty|profile_id|raw|exact|contact|private|debug|timing)/i.test(key),
    ),
  );
  assert.ok(retention.some((row) => row.artifactKind === "subject_identity_profile"));
  assert.ok(
    composition.some((row) => row.controlFamilies.includes("subject_identity_authority")),
  );
  assert.ok(
    transitions.some(
      (row) =>
        row.artifactKind === "subject_identity" &&
        row.requiredActionKind === "background.subject_identity.update" &&
        row.nonActionabilityGuarantee.includes("stale dependent artifacts"),
    ),
  );
});

test("subject identity route and migration enforce auth, admin authority, stale transitions, and privacy-safe storage", () => {
  const routeSource = readFileSync(
    "src/app/api/background/subject-identity/route.ts",
    "utf8",
  );
  const migrationSource = readFileSync(
    "supabase/migrations/20260615_background_subject_identity_profiles.sql",
    "utf8",
  );
  const typesSource = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(routeSource, /background_subject_identity_write/);
  assert.match(routeSource, /background\.subject_identity\.update/);
  assert.match(routeSource, /evaluateBackgroundPolicyDecision/);
  assert.match(routeSource, /isAdminEmail/);
  assert.match(routeSource, /collective_members/);
  assert.match(routeSource, /background_opportunity_briefs/);
  assert.match(routeSource, /background_intro_packets/);
  assert.match(routeSource, /background_delegate_receipts/);
  assert.match(routeSource, /email_outbox/);
  assert.doesNotMatch(routeSource, /candidate_profile_id|counterparty_profile_id|service_account_id|partner_seat_id/);
  assert.match(migrationSource, /background_subject_identity_profiles/);
  assert.match(migrationSource, /background_subject_identity_individual_shape_check/);
  assert.match(migrationSource, /background_subject_identity_automation_shape_check/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(typesSource, /background_subject_identity_profiles/);
  assert.match(typesSource, /partner_operator/);
});
