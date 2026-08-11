from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one marker in {path}, found {count}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


synthesis = Path("src/lib/opportunity-synthesis.ts")
replace_once(
    synthesis,
    '''  getAtlasField,\n  synthesisClassificationLabel,\n''',
    '''  getAtlasField,\n  getSynthesisTemplate,\n  synthesisClassificationLabel,\n''',
)
replace_once(
    synthesis,
    '''export const OPPORTUNITY_SYNTHESIS_VERSION = "atlas-synthesis-v1";\n''',
    '''export const OPPORTUNITY_SYNTHESIS_VERSION = "atlas-synthesis-v1";\nexport const SYNTHESIZED_OPPORTUNITY_PREFIX = "synth:";\n''',
)
replace_once(
    synthesis,
    '''function slug(value: string) {\n  return normalizeRecommendationText(value).replace(/\\s+/g, "-").slice(0, 64) || "priority";\n}\n\nfunction tokens(value: string) {\n''',
    '''function slug(value: string) {\n  return normalizeRecommendationText(value).replace(/\\s+/g, "-").slice(0, 64) || "priority";\n}\n\nexport interface ParsedSynthesizedOpportunityId {\n  template: OpportunitySynthesisTemplate;\n  matchedCause: string;\n}\n\nexport function parseSynthesizedOpportunityId(\n  value: string,\n): ParsedSynthesizedOpportunityId | null {\n  const normalized = value.trim();\n  if (!normalized.startsWith(SYNTHESIZED_OPPORTUNITY_PREFIX)) return null;\n\n  const payload = normalized.slice(SYNTHESIZED_OPPORTUNITY_PREFIX.length);\n  const separator = payload.indexOf(":");\n  if (separator <= 0 || separator === payload.length - 1) return null;\n\n  const templateId = payload.slice(0, separator);\n  const causeSlug = payload.slice(separator + 1);\n  if (!causeSlug || causeSlug.length > 64 || /[\\s:]/.test(causeSlug)) return null;\n\n  const template = getSynthesisTemplate(templateId);\n  if (!template) return null;\n  const matchedCause = causeSlug.replace(/-/g, " ").trim();\n  return matchedCause ? { template, matchedCause } : null;\n}\n\nfunction tokens(value: string) {\n''',
)

synthesis_test = Path("src/lib/opportunity-synthesis.test.ts")
replace_once(
    synthesis_test,
    '''  mergeExistingAndSynthesizedRecommendations,\n  synthesizeBottleneckAtlasRecommendations,\n''',
    '''  mergeExistingAndSynthesizedRecommendations,\n  parseSynthesizedOpportunityId,\n  synthesizeBottleneckAtlasRecommendations,\n''',
)
replace_once(
    synthesis_test,
    '''test("the kill switch is explicit and fail-operational only when not disabled", () => {\n''',
    '''test("generated identifiers resolve only to known synthesis templates", () => {\n  const recommendation = synthesizeBottleneckAtlasRecommendations({\n    profile: { causes: ["AI governance"] },\n    now: checkedAt,\n    limit: 8,\n  }).recommendations.find(\n    (item) => item.metadata.templateId === "ai-governance-advocacy-operations",\n  );\n\n  assert.ok(recommendation);\n  const parsed = parseSynthesizedOpportunityId(recommendation.id);\n  assert.equal(parsed?.template.id, "ai-governance-advocacy-operations");\n  assert.equal(parsed?.matchedCause, "ai governance");\n  assert.equal(parseSynthesizedOpportunityId("synth:not-a-template:ai-governance"), null);\n  assert.equal(parseSynthesizedOpportunityId("offer:ai-governance"), null);\n  assert.equal(parseSynthesizedOpportunityId("synth:ai-governance-advocacy-operations:"), null);\n});\n\ntest("the kill switch is explicit and fail-operational only when not disabled", () => {\n''',
)

feedback = Path("src/app/api/live-now/feedback/route.ts")
replace_once(
    feedback,
    '''import { getViewer } from "@/lib/app-data";\n''',
    '''import { getViewer } from "@/lib/app-data";\nimport { getAtlasField } from "@/lib/bottleneck-atlas";\n''',
)
replace_once(
    feedback,
    '''} from "@/lib/recommendation-learning";\nimport { hasSupabaseEnv } from "@/lib/supabase/config";\n''',
    '''} from "@/lib/recommendation-learning";\nimport {\n  OPPORTUNITY_SYNTHESIS_VERSION,\n  SYNTHESIZED_OPPORTUNITY_PREFIX,\n  parseSynthesizedOpportunityId,\n} from "@/lib/opportunity-synthesis";\nimport { hasSupabaseEnv } from "@/lib/supabase/config";\n''',
)
replace_once(
    feedback,
    '''const MAX_EVENTS_PER_REQUEST = 20;\nconst MAX_DWELL_MS = 30 * 60 * 1_000;\n''',
    '''const MAX_EVENTS_PER_REQUEST = 20;\nconst MAX_DWELL_MS = 30 * 60 * 1_000;\nconst UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n''',
)
replace_once(
    feedback,
    '''const PASSIVE_EVENT_TYPES = new Set<RecommendationEventType>([\n  "impression",\n  "open",\n  "dwell",\n  "cause_view",\n]);\n''',
    '''const PASSIVE_EVENT_TYPES = new Set<RecommendationEventType>([\n  "impression",\n  "open",\n  "dwell",\n  "cause_view",\n]);\nconst SYNTHESIZED_CANDIDATE_EVENT_TYPES = new Set<RecommendationEventType>([\n  "impression",\n  "open",\n  "dwell",\n  "save",\n  "unsave",\n  "hide",\n  "not_for_me",\n  "easy",\n  "hard",\n]);\n''',
)
replace_once(
    feedback,
    '''  const offerIds = [...new Set(\n    normalizedEvents\n      .filter((event) => event.opportunityType === "offer" || event.opportunityType === "donation_redirect")\n      .map((event) => event.opportunityId),\n  )];\n  const poolIds = [...new Set(\n    normalizedEvents\n      .filter((event) => event.opportunityType === "donation_pool")\n      .map((event) => event.opportunityId),\n  )];\n''',
    '''  const offerIds = [...new Set(\n    normalizedEvents\n      .filter(\n        (event) =>\n          (event.opportunityType === "offer" || event.opportunityType === "donation_redirect") &&\n          !event.opportunityId.startsWith(SYNTHESIZED_OPPORTUNITY_PREFIX) &&\n          UUID_PATTERN.test(event.opportunityId),\n      )\n      .map((event) => event.opportunityId),\n  )];\n  const poolIds = [...new Set(\n    normalizedEvents\n      .filter(\n        (event) =>\n          event.opportunityType === "donation_pool" && UUID_PATTERN.test(event.opportunityId),\n      )\n      .map((event) => event.opportunityId),\n  )];\n''',
)
replace_once(
    feedback,
    '''    if (event.opportunityType === "donation_pool") {\n''',
    '''    const synthesized = parseSynthesizedOpportunityId(event.opportunityId);\n    if (synthesized) {\n      const canonicalType: RecommendationOpportunityType =\n        synthesized.template.id === "reciprocal-donation-redirect"\n          ? "donation_redirect"\n          : "offer";\n      if (event.opportunityType !== canonicalType) return [];\n      if (!SYNTHESIZED_CANDIDATE_EVENT_TYPES.has(event.eventType)) return [];\n\n      const sourceCauses = synthesized.template.sourceFieldIds.flatMap((fieldId) => {\n        const field = getAtlasField(fieldId);\n        return field ? [field.name, ...field.aliases.slice(0, 2)] : [];\n      });\n      const benefitCauses = uniqueCauses(\n        [synthesized.matchedCause, synthesized.template.offeredCause],\n        sourceCauses,\n      );\n      const actionCauses = uniqueCauses(\n        [synthesized.template.requestedCause],\n        sourceCauses,\n      );\n      const descriptor = getActionDescriptor({\n        actionText: synthesized.template.firstPartyGives,\n        actionCause: actionCauses[0] ?? synthesized.template.requestedCause,\n        mode: canonicalType === "donation_redirect" ? "offset" : "pledge",\n        opportunityType: canonicalType,\n      });\n      return [\n        {\n          profile_id: profileId,\n          opportunity_type: canonicalType,\n          opportunity_id: event.opportunityId,\n          event_type: event.eventType,\n          benefit_causes: benefitCauses,\n          action_causes: actionCauses,\n          action_key: descriptor.key,\n          action_label: descriptor.label,\n          inferred_difficulty: descriptor.defaultDifficulty,\n          dwell_ms: event.dwellMs,\n          idempotency_key: event.idempotencyKey,\n          metadata: {\n            ...event.metadata,\n            model_version: OPPORTUNITY_SYNTHESIS_VERSION,\n          },\n          occurred_at: occurredAt,\n        },\n      ];\n    }\n\n    if (event.opportunityType === "donation_pool") {\n''',
)

wiring_test = Path("src/bottleneck-atlas-feed-wiring.test.ts")
replace_once(
    wiring_test,
    '''test("the public atlas and candidate detail routes preserve the hypothesis boundary", () => {\n''',
    '''test("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {\n  const feedback = read("src/app/api/live-now/feedback/route.ts");\n  assert.match(feedback, /parseSynthesizedOpportunityId/);\n  assert.match(feedback, /SYNTHESIZED_OPPORTUNITY_PREFIX/);\n  assert.match(feedback, /SYNTHESIZED_CANDIDATE_EVENT_TYPES/);\n  assert.match(feedback, /UUID_PATTERN\\.test\\(event\\.opportunityId\\)/);\n  assert.match(feedback, /model_version: OPPORTUNITY_SYNTHESIS_VERSION/);\n});\n\ntest("the public atlas and candidate detail routes preserve the hypothesis boundary", () => {\n''',
)
