import assert from "node:assert/strict";
import test from "node:test";

import {
  BOTTLENECK_ATLAS_FIELDS,
  BOTTLENECK_ATLAS_REVIEWED_AT,
  OPPORTUNITY_SYNTHESIS_TEMPLATES,
  getAtlasField,
  getSynthesisTemplate,
} from "./bottleneck-atlas";

test("the public atlas has a complete, source-linked field inventory", () => {
  assert.equal(BOTTLENECK_ATLAS_FIELDS.length, 18);
  assert.match(BOTTLENECK_ATLAS_REVIEWED_AT, /^2026-\d{2}-\d{2}$/);

  const ids = new Set<string>();
  for (const field of BOTTLENECK_ATLAS_FIELDS) {
    assert.ok(!ids.has(field.id), `duplicate field id: ${field.id}`);
    ids.add(field.id);
    assert.ok(field.name.length >= 8);
    assert.ok(field.summary.length >= 80);
    assert.ok(field.primaryBottlenecks.length >= 3);
    assert.ok(field.transferableAssets.length >= 3);
    assert.ok(field.tradeImplication.length >= 80);
    assert.ok(field.confidence >= 50 && field.confidence <= 100);
    assert.ok(field.sources.length >= 1);
    for (const source of field.sources) {
      assert.match(source.url, /^https:\/\//);
      assert.ok(source.organization.length >= 2);
      assert.ok(source.label.length >= 4);
    }
    assert.equal(getAtlasField(field.id)?.id, field.id);
  }
});

test("every synthesis template is qualified, traceable, and safety-gated", () => {
  const ids = new Set<string>();
  for (const template of OPPORTUNITY_SYNTHESIS_TEMPLATES) {
    assert.ok(!ids.has(template.id), `duplicate template id: ${template.id}`);
    ids.add(template.id);
    assert.ok(template.title.length >= 8);
    assert.ok(template.summary.length >= 80);
    assert.ok(template.noTradeBaseline.length >= 80);
    assert.ok(template.candidateStructures.length >= 3);
    assert.ok(template.validationQuestions.length >= 3);
    assert.ok(template.safetyChecks.length >= 3);
    assert.ok(template.confidence >= 50 && template.confidence <= 100);
    assert.equal(getSynthesisTemplate(template.id)?.id, template.id);

    for (const fieldId of template.sourceFieldIds) {
      assert.ok(getAtlasField(fieldId), `missing source field ${fieldId} for ${template.id}`);
    }

    const safetyText = template.safetyChecks.join(" ").toLowerCase();
    assert.ok(
      safetyText.includes("no ") ||
        safetyText.includes("do not") ||
        safetyText.includes("screen") ||
        safetyText.includes("review") ||
        safetyText.includes("reject"),
      `template ${template.id} lacks a concrete safety constraint`,
    );
  }
});

test("moral-public-good synthesis does not automatically endorse assurance contracts", () => {
  const template = getSynthesisTemplate("moral-public-good-cofund");
  assert.ok(template);
  const combined = [
    ...template.candidateStructures,
    ...template.validationQuestions,
    ...template.safetyChecks,
  ].join(" ").toLowerCase();
  assert.match(combined, /free-rider/);
  assert.match(combined, /dominant-assurance/);
  assert.match(combined, /never recommend them automatically/);
});

test("the atlas contains individual as well as institutional synthesis paths", () => {
  const actorScopes = new Set<string>(
    OPPORTUNITY_SYNTHESIS_TEMPLATES.flatMap((template) => [...template.actorScopes]),
  );
  assert.equal(actorScopes.has("individual"), true);
  assert.equal(actorScopes.has("organization"), true);
  assert.equal(actorScopes.has("coalition"), true);
});
