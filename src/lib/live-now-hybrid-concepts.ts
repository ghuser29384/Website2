import type {
  LiveNowCauseSignal,
  LiveNowOfferCandidate,
  LiveNowProfileSignals,
} from "./live-now-recommendations";
import type { PublicEmbeddingInput } from "./public-semantic-embeddings";

export interface CanonicalConcept {
  id: string;
  label: string;
  aliases: readonly string[];
  publicDescription: string;
}

export interface MappedSignal {
  signal: LiveNowCauseSignal;
  concept: CanonicalConcept;
  mappingScore: number;
  effectiveWeight: number;
}

/**
 * Fixed public concepts are the privacy boundary. Only these descriptions and
 * public opportunity text can be sent to the embedding provider. Profile prose
 * is never embedded externally.
 */
export const LIVE_NOW_CANONICAL_CONCEPTS: readonly CanonicalConcept[] = [
  {
    id: "future-flourishing",
    label: "Future flourishing",
    aliases: ["future flourishing", "better long term future", "longtermism", "future generations"],
    publicDescription:
      "A future in which present and future beings flourish, avoid moral catastrophe, and retain the option to improve institutions and values.",
  },
  {
    id: "existential-risk",
    label: "Existential risk reduction",
    aliases: [
      "existential risk",
      "existential-risk reduction",
      "x risk",
      "x-risk",
      "ai safety",
      "ai alignment",
      "catastrophic risk",
      "long term survival",
    ],
    publicDescription:
      "Reducing risks that could permanently curtail humanity's potential, including unsafe advanced AI, engineered pandemics, nuclear catastrophe, and other global catastrophic risks.",
  },
  {
    id: "animal-welfare",
    label: "Animal welfare",
    aliases: [
      "animal welfare",
      "animal wellbeing",
      "factory farming",
      "farm animal welfare",
      "end factory farming",
      "wild animal welfare",
      "animal suffering",
    ],
    publicDescription:
      "Reducing suffering and improving the lives of farmed, wild, and other non-human animals, including reforms and alternatives to factory farming.",
  },
  {
    id: "global-health-poverty",
    label: "Global health and poverty reduction",
    aliases: [
      "global health",
      "global poverty",
      "poverty reduction",
      "malaria",
      "development",
      "humanitarian aid",
      "health equity",
    ],
    publicDescription:
      "Improving health and material wellbeing, especially for people facing preventable disease, extreme poverty, or weak access to essential services.",
  },
  {
    id: "climate-environment",
    label: "Climate and environmental protection",
    aliases: [
      "climate",
      "climate change",
      "environment",
      "environmental protection",
      "biodiversity",
      "conservation",
      "decarbonization",
      "clean energy",
    ],
    publicDescription:
      "Mitigating climate change, protecting ecosystems and biodiversity, reducing pollution, and supporting durable environmental stewardship.",
  },
  {
    id: "digital-minds",
    label: "Digital-mind welfare",
    aliases: [
      "digital minds",
      "digital mind welfare",
      "artificial sentience",
      "ai welfare",
      "machine consciousness",
      "sentient ai",
    ],
    publicDescription:
      "Protecting the interests and welfare of potentially conscious or morally significant digital beings and avoiding large-scale digital suffering.",
  },
  {
    id: "biosecurity",
    label: "Biosecurity and pandemic prevention",
    aliases: ["biosecurity", "pandemic prevention", "pandemic preparedness", "biorisk", "biological risk"],
    publicDescription:
      "Preventing and mitigating natural or engineered pandemics through surveillance, resilient health systems, safe research, and rapid response capacity.",
  },
  {
    id: "peace-security",
    label: "Peace and catastrophic-conflict prevention",
    aliases: ["peace", "nuclear risk", "nuclear war", "conflict prevention", "war prevention", "global security"],
    publicDescription:
      "Preventing war, nuclear catastrophe, coercive escalation, and other destructive conflicts while supporting durable peaceful cooperation.",
  },
  {
    id: "democracy-rights",
    label: "Democracy and human rights",
    aliases: ["democracy", "human rights", "civil liberties", "rule of law", "political freedom", "equal rights"],
    publicDescription:
      "Protecting rights, political agency, accountable government, equal treatment, and institutions that constrain domination and abuse.",
  },
  {
    id: "governance-cooperation",
    label: "Governance and cooperation",
    aliases: [
      "governance",
      "institutional reform",
      "cooperation",
      "coordination",
      "moral trade",
      "collective decision making",
      "social trust",
    ],
    publicDescription:
      "Building trustworthy institutions and bargaining mechanisms that help people with different values coordinate, trade, compromise, and avoid destructive threats.",
  },
  {
    id: "moral-public-goods",
    label: "Moral public goods",
    aliases: [
      "moral public goods",
      "public goods",
      "consensus goods",
      "shared moral goals",
      "assurance contract",
      "collective funding",
    ],
    publicDescription:
      "Shared moral goods that many people value but may underfund individually, including coordinated funding for widely valued welfare, knowledge, safety, and environmental outcomes.",
  },
  {
    id: "science-knowledge",
    label: "Science and knowledge",
    aliases: ["science", "scientific research", "knowledge", "research", "epistemics", "open science"],
    publicDescription:
      "Producing reliable knowledge, improving collective reasoning, supporting open inquiry, and making evidence available for consequential decisions.",
  },
  {
    id: "education-capability",
    label: "Education and capability building",
    aliases: ["education", "learning", "skills", "capability building", "training", "literacy"],
    publicDescription:
      "Expanding access to learning, useful skills, reflective capacity, and the ability to participate effectively in social and economic life.",
  },
  {
    id: "wellbeing-mental-health",
    label: "Wellbeing and mental health",
    aliases: ["wellbeing", "well-being", "mental health", "happiness", "quality of life", "flourishing"],
    publicDescription:
      "Improving mental health, reducing suffering, and enabling lives with wellbeing, connection, agency, meaning, and positive experience.",
  },
  {
    id: "fairness-opportunity",
    label: "Fairness and economic opportunity",
    aliases: ["fairness", "economic opportunity", "inequality", "labor rights", "worker welfare", "social mobility"],
    publicDescription:
      "Reducing unfair disadvantage and expanding access to dignified work, economic security, mobility, and broadly shared opportunity.",
  },
  {
    id: "community-care",
    label: "Community and care",
    aliases: ["community", "care", "mutual aid", "social connection", "loneliness", "local resilience"],
    publicDescription:
      "Strengthening supportive relationships, mutual aid, social connection, care infrastructure, and resilient communities.",
  },
];

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

export function normalizeHybridText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "be", "by", "for", "from", "in", "is", "of", "on", "or",
  "the", "to", "with", "your",
]);

function tokens(value: string) {
  return [...new Set(normalizeHybridText(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token)))];
}

export function phraseSimilarity(left: string, right: string) {
  const normalizedLeft = normalizeHybridText(left);
  const normalizedRight = normalizeHybridText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (
    ` ${normalizedLeft} `.includes(` ${normalizedRight} `) ||
    ` ${normalizedRight} `.includes(` ${normalizedLeft} `)
  ) {
    return 0.88;
  }
  const leftTokens = tokens(normalizedLeft);
  const rightTokens = new Set(tokens(normalizedRight));
  if (!leftTokens.length || !rightTokens.size) return 0;
  const overlap = leftTokens.filter((token) => rightTokens.has(token)).length;
  const containment = overlap / Math.min(leftTokens.length, rightTokens.size);
  const jaccard = overlap / (leftTokens.length + rightTokens.size - overlap);
  return clamp(0.68 * containment + 0.32 * jaccard);
}

export function effectiveCauseSignals(profile: LiveNowProfileSignals): LiveNowCauseSignal[] {
  if (profile.causeSignals?.length) return [...profile.causeSignals];
  return profile.causes.map((cause, index) => ({
    cause,
    weight: Math.max(42, 86 - index * 8),
    source: "profile_priority" as const,
    rank: index + 1,
  }));
}

function mapSignalToConcepts(signal: LiveNowCauseSignal) {
  const scored = LIVE_NOW_CANONICAL_CONCEPTS.map((concept) => ({
    concept,
    score: Math.max(
      phraseSimilarity(signal.cause, concept.label),
      ...concept.aliases.map((alias) => phraseSimilarity(signal.cause, alias)),
    ),
  }))
    .filter((item) => item.score >= 0.44)
    .sort((left, right) => right.score - left.score || left.concept.id.localeCompare(right.concept.id));

  const best = scored[0]?.score ?? 0;
  return scored.filter((item, index) => index < 2 && item.score >= Math.max(0.44, best - 0.16));
}

function mappedSignals(profile: LiveNowProfileSignals) {
  const result: MappedSignal[] = [];
  for (const signal of effectiveCauseSignals(profile)) {
    for (const mapped of mapSignalToConcepts(signal)) {
      result.push({
        signal,
        concept: mapped.concept,
        mappingScore: mapped.score,
        effectiveWeight: signal.weight * mapped.score,
      });
    }
  }
  return result;
}

function candidateOpportunityType(candidate: LiveNowOfferCandidate) {
  return candidate.opportunityType ?? (candidate.mode === "offset" ? "donation_redirect" : "offer");
}

export function candidateKey(candidate: LiveNowOfferCandidate) {
  return `${candidateOpportunityType(candidate)}:${candidate.id}`;
}

export function candidateEmbeddingKey(candidate: LiveNowOfferCandidate) {
  return `opportunity:${candidateKey(candidate)}`;
}

export function publicOpportunityText(candidate: LiveNowOfferCandidate) {
  const opportunityType = candidateOpportunityType(candidate).replaceAll("_", " ");
  return [
    `Public moral opportunity type: ${opportunityType}.`,
    `Outcome offered: ${candidate.offeredCause}.`,
    candidate.offerAction ? `Public offered action or benefit: ${candidate.offerAction}.` : "",
    `Action sought: ${candidate.requestedCause}.`,
    candidate.requestAction ? `Public requested action: ${candidate.requestAction}.` : "",
    candidate.compromiseCause && normalizeHybridText(candidate.compromiseCause) !== "not needed"
      ? `Compromise or shared outcome: ${candidate.compromiseCause}.`
      : "",
    candidate.verification ? `Verification: ${candidate.verification}.` : "",
    candidate.duration ? `Timing: ${candidate.duration}.` : "",
    candidate.benefitCauses?.length ? `Public benefit tags: ${candidate.benefitCauses.join(", ")}.` : "",
    candidate.actionCauses?.length ? `Public action tags: ${candidate.actionCauses.join(", ")}.` : "",
  ].filter(Boolean).join(" ").slice(0, 2_400);
}

export function buildPublicEmbeddingInputs(
  candidates: readonly LiveNowOfferCandidate[],
  profile: LiveNowProfileSignals,
) {
  const mapped = mappedSignals(profile);
  const concepts = new Map(mapped.map((item) => [item.concept.id, item.concept]));
  const inputs: PublicEmbeddingInput[] = [...concepts.values()].map((concept) => ({
    key: `concept:${concept.id}`,
    kind: "canonical",
    sourceId: concept.id,
    publicText: `${concept.label}. ${concept.publicDescription} Related public terms: ${concept.aliases.join(", ")}.`,
  }));
  candidates.forEach((candidate) => {
    inputs.push({
      key: candidateEmbeddingKey(candidate),
      kind: "opportunity",
      sourceId: candidate.id,
      publicText: publicOpportunityText(candidate),
    });
  });
  return { inputs, mapped };
}
