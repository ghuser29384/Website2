import assert from "node:assert/strict";
import test from "node:test";

import { OPPORTUNITY_SYNTHESIS_TEMPLATES } from "./bottleneck-atlas";
import {
  orientedTemplateTerms,
  rankAtlasTemplates,
} from "./bottleneck-atlas-matcher";

test("funding for operations surfaces the AI-governance operations exchange", () => {
  const [match] = rankAtlasTemplates(OPPORTUNITY_SYNTHESIS_TEMPLATES, {
    offer: "funding",
    need: "operations",
    actor: "organization",
    fieldId: "ai-governance",
  });

  assert.ok(match);
  assert.equal(match.template.id, "ai-governance-advocacy-operations");
  assert.equal(match.orientation, "first_party");
  assert.equal(match.fit, "strong");
});

test("operations for funding reverses the same exchange coherently", () => {
  const [match] = rankAtlasTemplates(OPPORTUNITY_SYNTHESIS_TEMPLATES, {
    offer: "operations",
    need: "funding",
    actor: "organization",
    fieldId: "ai-governance",
  });

  assert.ok(match);
  assert.equal(match.template.id, "ai-governance-advocacy-operations");
  assert.equal(match.orientation, "counterparty");
  const terms = orientedTemplateTerms(match.template, match.orientation);
  assert.match(terms.gives, /transferable capability/i);
  assert.match(terms.receives, /opportunity-cost coverage/i);
});

test("forecasting and decision access match in either direction", () => {
  const [forecastingSide] = rankAtlasTemplates(OPPORTUNITY_SYNTHESIS_TEMPLATES, {
    offer: "forecasting",
    need: "access",
    actor: "team",
  });
  const [decisionSide] = rankAtlasTemplates(OPPORTUNITY_SYNTHESIS_TEMPLATES, {
    offer: "access",
    need: "forecasting",
    actor: "organization",
  });

  assert.ok(forecastingSide);
  assert.ok(decisionSide);
  assert.equal(forecastingSide.template.id, "forecasting-live-decisions");
  assert.equal(forecastingSide.orientation, "first_party");
  assert.equal(decisionSide.template.id, "forecasting-live-decisions");
  assert.equal(decisionSide.orientation, "counterparty");
});

test("funding for funding surfaces the canonical reciprocal redirect", () => {
  const [match] = rankAtlasTemplates(OPPORTUNITY_SYNTHESIS_TEMPLATES, {
    offer: "funding",
    need: "funding",
    actor: "individual",
  });

  assert.ok(match);
  assert.equal(match.template.id, "reciprocal-donation-redirect");
});
