import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicSynthesis,
  evaluateDeterministicMatch,
  hasActiveProfileSourcePermission,
  type DeterministicSignals,
} from "@/lib/background-networking";

type DeterministicMatchInput = Parameters<typeof evaluateDeterministicMatch>[0];
type SynthesisInput = Parameters<typeof buildDeterministicSynthesis>[0];

const baseSignals = {
  askTerms: [],
  capabilityTags: [],
  confidenceScore: 80,
  constraintFlags: [],
  missingFields: [],
  offerTerms: [],
  sourceCount: 1,
  uncertaintyFlags: [],
} satisfies DeterministicSignals;

test("deterministic background matches do not return raw overlapping private terms", () => {
  const evaluation = evaluateDeterministicMatch({
    counterparty: {
      background_search_enabled: true,
      causes: ["Animal welfare"],
      collective_name: null,
      location_city: "New York",
      location_region: "New York",
      openness_to_payment: true,
      openness_to_pledges: true,
      participant_kind: "individual",
      privacy_stage: "broad",
      profile_id: "counterparty-profile",
      public_preview: "Can help with secretcalibration under reviewer-visible evidence.",
    } as DeterministicMatchInput["counterparty"],
    counterpartySignals: {
      ...baseSignals,
      offerTerms: ["secretcalibration"],
    },
    runLabel: "test",
    viewer: {
      askText: "I need secretcalibration help before I share any contact details.",
      askTerms: ["secretcalibration"],
      causes: ["Animal welfare"],
      locationCity: "New York",
      locationRegion: "New York",
      openToPayment: true,
      openToPledges: true,
      privacyStage: "broad",
      publicPreview: "Looking for broad moral trade compatibility.",
      signals: {
        ...baseSignals,
        askTerms: ["secretcalibration"],
      },
      sourceCount: 1,
      wishText: "secretcalibration should remain private",
    },
  });
  const serialized = JSON.stringify(evaluation);

  assert.ok(evaluation.sharedTokens.every((token) => token.startsWith("broad_language_overlap_")));
  assert.doesNotMatch(serialized, /secretcalibration/i);
  assert.match(evaluation.viewerReason, /broad ask\/offer compatibility signal/);
});

test("deterministic synthesis counts only active unexpired source permissions", () => {
  const connection = (
    overrides: Partial<SynthesisInput["connections"][number]>,
  ): SynthesisInput["connections"][number] =>
    ({
      access_status: "connected",
      allowed_field_keys: ["cause_priorities"],
      retention_expires_at: "2099-01-01T00:00:00.000Z",
      ...overrides,
    }) as SynthesisInput["connections"][number];
  const synthesis = buildDeterministicSynthesis({
    connections: [
      connection({ access_status: "revoked" }),
      connection({ retention_expires_at: "2000-01-01T00:00:00.000Z" }),
      connection({ allowed_field_keys: [] }),
      connection({ access_status: "needs_review" }),
    ],
    entries: [],
    profile: {
      capabilities: "",
      causes: [],
      constraints: "",
      location_city: null,
      location_region: null,
      public_preview: "",
      uncertainty_notes: "",
      verification_preferences: "",
    } as SynthesisInput["profile"],
    profileSources: [],
  });

  assert.equal(synthesis.source_count, 1);
  assert.equal(synthesis.confidence_breakdown.sources, 1);
});

test("deterministic synthesis ignores expired profile source notes", () => {
  const source = (
    overrides: Partial<SynthesisInput["profileSources"][number]>,
  ): SynthesisInput["profileSources"][number] =>
    ({
      is_active: true,
      notes: "Current source note",
      retention_expires_at: "2099-01-01T00:00:00.000Z",
      snapshot_excerpt: "Current source capability",
      ...overrides,
    }) as SynthesisInput["profileSources"][number];
  const expiredSource = source({
    notes: "Expired source note",
    retention_expires_at: "2000-01-01T00:00:00.000Z",
    snapshot_excerpt: "Expired source capability",
  });
  const synthesis = buildDeterministicSynthesis({
    connections: [],
    entries: [],
    profile: {
      brokerage_preference: "",
      capabilities: "",
      causes: [],
      constraints: "",
      location_city: null,
      location_region: null,
      public_preview: "",
      uncertainty_notes: "",
      verification_preferences: "",
    } as SynthesisInput["profile"],
    profileSources: [source({}), expiredSource, source({ is_active: false })],
  });

  assert.equal(hasActiveProfileSourcePermission(expiredSource), false);
  assert.equal(synthesis.source_count, 1);
  assert.match(synthesis.capabilities, /Current source capability/);
  assert.doesNotMatch(synthesis.capabilities, /Expired source capability/);
  assert.doesNotMatch(synthesis.uncertainty, /Expired source note/);
});

test("deterministic synthesis reads only approved active profile signals", () => {
  const signal = (
    overrides: Partial<NonNullable<SynthesisInput["profileSignals"]>[number]>,
  ): NonNullable<SynthesisInput["profileSignals"]>[number] =>
    ({
      allowed_field_key: "capability_tags",
      confidence_band: "medium",
      expires_at: "2099-01-01T00:00:00.000Z",
      sensitivity: "broad",
      signal_key: "capability_tag",
      signal_value: "grantmaking",
      source: "approved_source_summary",
      status: "active",
      ...overrides,
    }) as NonNullable<SynthesisInput["profileSignals"]>[number];
  const synthesis = buildDeterministicSynthesis({
    connections: [],
    entries: [],
    profile: {
      brokerage_preference: "",
      capabilities: "",
      causes: [],
      constraints: "",
      location_city: null,
      location_region: null,
      public_preview: "",
      uncertainty_notes: "",
      verification_preferences: "",
    } as SynthesisInput["profile"],
    profileSignals: [
      signal({}),
      signal({ signal_value: "expiredsignal", expires_at: "2000-01-01T00:00:00.000Z" }),
      signal({ signal_value: "revokedsignal", status: "revoked" }),
    ],
    profileSources: [],
  });

  assert.equal(synthesis.source_count, 1);
  assert.ok(synthesis.capability_tags.includes("grantmaking"));
  assert.doesNotMatch(synthesis.capabilities, /expiredsignal/);
  assert.doesNotMatch(synthesis.capabilities, /revokedsignal/);
});
