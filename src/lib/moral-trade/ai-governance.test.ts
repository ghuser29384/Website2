import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoralTradeAiGovernanceProfile,
  validateMoralTradeAiGovernanceProfile,
  type MoralTradeAiGovernanceProfile,
} from "@/lib/moral-trade/ai-governance";

test("AI governance profile requires documented, human-controlled, non-ranking automation", () => {
  const profile = getMoralTradeAiGovernanceProfile();
  const validation = validateMoralTradeAiGovernanceProfile(profile);

  assert.equal(validation.status, "pass");
  assert.equal(profile.mlEnabledForMatching, false);
  assert.equal(profile.mlEnabledForStateChanges, false);
  assert.ok(profile.requiredDocumentationBeforeMl.some((entry) => entry.key === "model_card"));
  assert.ok(profile.requiredDocumentationBeforeMl.some((entry) => entry.key === "dataset_datasheet"));
  assert.ok(profile.documentationTemplates.some((entry) => entry.key === "model_card"));
  assert.ok(profile.documentationTemplates.some((entry) => entry.key === "fairness_audit_report"));
  assert.ok(
    profile.documentationTemplates.every((entry) =>
      entry.redactedFields.includes("raw_private_wish_text"),
    ),
  );
  assert.ok(profile.prohibitedUses.some((entry) => entry.key === "global_moral_ranking"));
  assert.ok(profile.prohibitedUses.some((entry) => entry.key === "end_to_end_llm_matching"));
  assert.ok(profile.prohibitedUses.some((entry) => entry.key === "raw_private_feed_training"));
  assert.ok(profile.fairnessDocumentation.metrics.includes("subgroup_surfacing_parity"));
  assert.ok(profile.explanationControls.some((entry) => entry.key === "factor_codes_source_of_truth"));
  assert.ok(profile.explanationControls.some((entry) => entry.key === "uncertainty_and_redaction_notice"));
  assert.ok(profile.externalStandards.some((entry) => entry.key === "nist_ai_rmf"));
  assert.ok(profile.externalStandards.some((entry) => entry.key === "datasheets_for_datasets"));
  assert.ok(profile.humanControlledDecisions.includes("matching_disclosure"));
});

test("AI governance validation fails if ML can rank or mutate state without documentation", () => {
  const profile = getMoralTradeAiGovernanceProfile();
  const weakenedProfile: MoralTradeAiGovernanceProfile = {
    ...profile,
    decisioningMode: "learning_to_rank",
    mlEnabledForMatching: true,
    mlEnabledForStateChanges: true,
    requiredDocumentationBeforeMl: profile.requiredDocumentationBeforeMl.filter(
      (entry) => entry.key !== "model_card" && entry.key !== "dataset_datasheet",
    ),
    documentationTemplates: profile.documentationTemplates.filter(
      (entry) => entry.key !== "model_card",
    ),
    prohibitedUses: profile.prohibitedUses.filter(
      (entry) => entry.key !== "global_moral_ranking",
    ),
  };
  const validation = validateMoralTradeAiGovernanceProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("deterministic-decisioning")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("required-documentation-before-ml")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("documentation-templates")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("prohibited-uses")));
});

test("AI governance validation fails if documentation templates leak private inputs", () => {
  const profile = getMoralTradeAiGovernanceProfile();
  const weakenedProfile: MoralTradeAiGovernanceProfile = {
    ...profile,
    documentationTemplates: profile.documentationTemplates.map((template) =>
      template.key === "dataset_datasheet"
        ? {
            ...template,
            publicSummaryFields: ["collection_purpose", "raw_private_wish_text"],
            redactedFields: ["source_note_details"],
            reviewRule: "Publish automatically.",
          }
        : template,
    ),
  };
  const validation = validateMoralTradeAiGovernanceProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("documentation-templates")));
});

test("AI governance validation fails if fairness documentation or human control is missing", () => {
  const profile = getMoralTradeAiGovernanceProfile();
  const weakenedProfile: MoralTradeAiGovernanceProfile = {
    ...profile,
    fairnessDocumentation: {
      ...profile.fairnessDocumentation,
      requiredBeforeAnyMl: false,
      metrics: profile.fairnessDocumentation.metrics.filter(
        (metric) => metric !== "human_overrule_rate",
      ),
    },
    explanationControls: profile.explanationControls.filter(
      (control) => control.key !== "factor_codes_source_of_truth",
    ),
    humanControlledDecisions: profile.humanControlledDecisions.filter(
      (decision) => decision !== "dispute_resolution",
    ),
  };
  const validation = validateMoralTradeAiGovernanceProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("fairness-documentation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("explanation-controls")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("human-controlled-decisions")));
});
