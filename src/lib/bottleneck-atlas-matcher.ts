import type {
  OpportunitySynthesisTemplate,
  SynthesisActorScope,
} from "./bottleneck-atlas";

export const ATLAS_RESOURCE_OPTIONS = [
  { id: "funding", label: "Funding or donations" },
  { id: "research", label: "Research or technical work" },
  { id: "operations", label: "Policy or operations" },
  { id: "access", label: "Data, access, or networks" },
  { id: "infrastructure", label: "Infrastructure or tools" },
  { id: "procurement", label: "Buyers or procurement" },
  { id: "forecasting", label: "Forecasting or evaluation" },
  { id: "talent", label: "Talent or recruiting" },
  { id: "coordination", label: "Coalition or coordination" },
] as const;

export type AtlasResourceKey = (typeof ATLAS_RESOURCE_OPTIONS)[number]["id"];
export type AtlasMatchOrientation = "first_party" | "counterparty";

export interface AtlasMatchInput {
  offer: AtlasResourceKey;
  need: AtlasResourceKey;
  actor?: SynthesisActorScope | "";
  fieldId?: string;
}

export interface RankedAtlasTemplate {
  template: OpportunitySynthesisTemplate;
  orientation: AtlasMatchOrientation;
  score: number;
  offerMatch: boolean;
  needMatch: boolean;
  actorMatch: boolean;
  fieldMatch: boolean;
  fit: "strong" | "good" | "broad";
}

interface OrientationHint {
  offers: readonly AtlasResourceKey[];
  needs: readonly AtlasResourceKey[];
}

interface TemplateHint {
  first_party: OrientationHint;
  counterparty: OrientationHint;
}

const NON_FUNDING_SKILLS = [
  "research",
  "operations",
  "access",
  "infrastructure",
  "forecasting",
  "talent",
] as const satisfies readonly AtlasResourceKey[];

const TEMPLATE_RESOURCE_HINTS: Record<string, TemplateHint> = {
  "digital-minds-animal-welfare-science": {
    first_party: {
      offers: ["funding", "infrastructure", "research"],
      needs: ["research"],
    },
    counterparty: {
      offers: ["research"],
      needs: ["funding", "infrastructure"],
    },
  },
  "biosecurity-global-health-delivery": {
    first_party: {
      offers: ["funding", "infrastructure", "research"],
      needs: ["access", "operations"],
    },
    counterparty: {
      offers: ["access", "operations"],
      needs: ["funding", "infrastructure"],
    },
  },
  "forecasting-live-decisions": {
    first_party: {
      offers: ["forecasting", "research"],
      needs: ["access"],
    },
    counterparty: {
      offers: ["access"],
      needs: ["forecasting"],
    },
  },
  "gcr-funder-talent-pipeline": {
    first_party: {
      offers: ["funding"],
      needs: ["talent"],
    },
    counterparty: {
      offers: ["talent", "operations"],
      needs: ["funding"],
    },
  },
  "alternative-protein-procurement": {
    first_party: {
      offers: ["research"],
      needs: ["procurement", "funding"],
    },
    counterparty: {
      offers: ["procurement", "funding"],
      needs: ["research"],
    },
  },
  "ai-governance-advocacy-operations": {
    first_party: {
      offers: ["funding"],
      needs: ["operations"],
    },
    counterparty: {
      offers: ["operations"],
      needs: ["funding"],
    },
  },
  "professional-time-for-cause-funding": {
    first_party: {
      offers: NON_FUNDING_SKILLS,
      needs: ["funding"],
    },
    counterparty: {
      offers: ["funding"],
      needs: NON_FUNDING_SKILLS,
    },
  },
  "reciprocal-donation-redirect": {
    first_party: {
      offers: ["funding"],
      needs: ["funding"],
    },
    counterparty: {
      offers: ["funding"],
      needs: ["funding"],
    },
  },
  "moral-public-good-cofund": {
    first_party: {
      offers: ["funding"],
      needs: ["coordination"],
    },
    counterparty: {
      offers: ["coordination"],
      needs: ["funding"],
    },
  },
};

const RESOURCE_KEYWORDS: Record<AtlasResourceKey, readonly string[]> = {
  funding: ["fund", "capital", "grant", "donation", "payment", "finance"],
  research: ["research", "science", "technical", "engineering", "analysis", "method"],
  operations: ["operations", "policy", "campaign", "management", "communications", "advocacy"],
  access: ["access", "data", "sample", "network", "government", "decision", "domain expert"],
  infrastructure: ["infrastructure", "compute", "laboratory", "logistics", "tool", "platform"],
  procurement: ["procurement", "purchase", "offtake", "buyer", "demand"],
  forecasting: ["forecast", "calibration", "evaluation", "decision threshold"],
  talent: ["talent", "candidate", "recruit", "placement", "hire", "fellowship"],
  coordination: ["coordination", "coalition", "consortium", "participant", "co-fund", "matching"],
};

function inferredResources(value: string) {
  const normalized = value.toLowerCase();
  return ATLAS_RESOURCE_OPTIONS.filter(({ id }) =>
    RESOURCE_KEYWORDS[id].some((keyword) => normalized.includes(keyword)),
  ).map(({ id }) => id);
}

function inferredHint(
  template: OpportunitySynthesisTemplate,
  orientation: AtlasMatchOrientation,
): OrientationHint {
  const gives =
    orientation === "first_party" ? template.firstPartyGives : template.counterpartyGives;
  const receives =
    orientation === "first_party" ? template.firstPartyReceives : template.counterpartyReceives;
  return {
    offers: inferredResources(gives),
    needs: inferredResources(receives),
  };
}

function templateHint(
  template: OpportunitySynthesisTemplate,
  orientation: AtlasMatchOrientation,
) {
  return TEMPLATE_RESOURCE_HINTS[template.id]?.[orientation] ?? inferredHint(template, orientation);
}

function scoreOrientation(
  template: OpportunitySynthesisTemplate,
  orientation: AtlasMatchOrientation,
  input: AtlasMatchInput,
): RankedAtlasTemplate {
  const hint = templateHint(template, orientation);
  const offerMatch = hint.offers.includes(input.offer);
  const needMatch = hint.needs.includes(input.need);
  const actorMatch = !input.actor || template.actorScopes.includes(input.actor);
  const fieldMatch = Boolean(input.fieldId && template.sourceFieldIds.includes(input.fieldId));

  let score = 0;
  if (offerMatch) score += 40;
  if (needMatch) score += 40;
  if (actorMatch) score += 10;
  else score -= 24;

  if (input.fieldId) {
    if (fieldMatch) score += 20;
    else if (template.generic) score += 2;
    else score -= 4;
  }

  if (!template.generic) score += 2;
  if (template.sensitivity === "restricted" && !fieldMatch) score -= 4;
  score += template.confidence / 10;

  return {
    template,
    orientation,
    score,
    offerMatch,
    needMatch,
    actorMatch,
    fieldMatch,
    fit:
      offerMatch && needMatch && actorMatch && (!input.fieldId || fieldMatch || template.generic)
        ? "strong"
        : offerMatch && needMatch
          ? "good"
          : "broad",
  };
}

export function rankAtlasTemplates(
  templates: readonly OpportunitySynthesisTemplate[],
  input: AtlasMatchInput,
  limit = 3,
) {
  const bestOrientation = templates.map((template) => {
    const firstParty = scoreOrientation(template, "first_party", input);
    const counterparty = scoreOrientation(template, "counterparty", input);
    return counterparty.score > firstParty.score ? counterparty : firstParty;
  });

  const exact = bestOrientation.filter(
    (match) => match.offerMatch && match.needMatch && match.actorMatch,
  );
  const candidates = exact.length
    ? exact
    : bestOrientation.filter(
        (match) => match.actorMatch && (match.offerMatch || match.needMatch),
      );

  return candidates
    .sort(
      (left, right) =>
        right.score - left.score || right.template.confidence - left.template.confidence,
    )
    .slice(0, Math.max(1, limit));
}

export function orientedTemplateTerms(
  template: OpportunitySynthesisTemplate,
  orientation: AtlasMatchOrientation,
) {
  if (orientation === "counterparty") {
    return {
      gives: template.counterpartyGives,
      receives: template.counterpartyReceives,
      role: "counterparty" as const,
    };
  }

  return {
    gives: template.firstPartyGives,
    receives: template.firstPartyReceives,
    role: "first_party" as const,
  };
}
