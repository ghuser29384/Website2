import type { WalkthroughCauseArea } from "@/lib/walkthrough-profile";

export const COMPLETE_PROFILE_SPARK_COUNT = 20;
export const COMPLETE_PROFILE_SPARK_VALUE = 5;

export interface ProfilePriorityOption {
  id: string;
  name: string;
  shortName: string;
  outcome: string;
  color: string;
  causeArea: WalkthroughCauseArea;
}

export const PROFILE_PRIORITY_OPTIONS = [
  {
    id: "ai-safety",
    name: "AI safety",
    shortName: "AI safety",
    outcome: "Keep advanced AI aligned and broadly beneficial.",
    color: "#ff5c1a",
    causeArea: "Existential risk",
  },
  {
    id: "global-health",
    name: "Global health",
    shortName: "Global health",
    outcome: "Prevent treatable illness and premature death.",
    color: "#e94216",
    causeArea: "Public health",
  },
  {
    id: "factory-farming",
    name: "End factory farming",
    shortName: "Factory farming",
    outcome: "End intensive confinement and reduce animal suffering.",
    color: "#f28237",
    causeArea: "Animal welfare",
  },
  {
    id: "future-flourishing",
    name: "Future flourishing",
    shortName: "Future flourishing",
    outcome: "Help future lives go extraordinarily well.",
    color: "#a9c400",
    causeArea: "Future flourishing",
  },
  {
    id: "biosecurity",
    name: "Biosecurity",
    shortName: "Biosecurity",
    outcome: "Prevent catastrophic biological events.",
    color: "#8da600",
    causeArea: "Existential risk",
  },
  {
    id: "democratic-institutions",
    name: "Democratic institutions",
    shortName: "Democracy",
    outcome: "Protect rights, accountability, and civic institutions.",
    color: "#1648ff",
    causeArea: "Cause prioritization",
  },
  {
    id: "wild-animal-welfare",
    name: "Wild animal welfare",
    shortName: "Wild animals",
    outcome: "Understand and reduce suffering in the wild.",
    color: "#4169e1",
    causeArea: "Animal welfare",
  },
  {
    id: "climate",
    name: "Climate & environment",
    shortName: "Climate",
    outcome: "Stabilize the climate and protect ecosystems.",
    color: "#198448",
    causeArea: "Climate",
  },
  {
    id: "global-poverty",
    name: "Global poverty",
    shortName: "Global poverty",
    outcome: "Expand health, income, and opportunity worldwide.",
    color: "#2468b4",
    causeArea: "Global poverty",
  },
  {
    id: "s-risks",
    name: "S-risk reduction",
    shortName: "S-risks",
    outcome: "Prevent futures containing suffering at vast scale.",
    color: "#6d6d6d",
    causeArea: "Future flourishing",
  },
  {
    id: "cause-prioritization",
    name: "Cause prioritization",
    shortName: "Prioritization",
    outcome: "Improve how resources find the most important problems.",
    color: "#7b42c3",
    causeArea: "Cause prioritization",
  },
  {
    id: "space-governance",
    name: "Space governance",
    shortName: "Space governance",
    outcome: "Establish fair and peaceful rules beyond Earth.",
    color: "#6f6a63",
    causeArea: "Future flourishing",
  },
] as const satisfies readonly ProfilePriorityOption[];

export type ProfilePriorityId = (typeof PROFILE_PRIORITY_OPTIONS)[number]["id"];
export type ProfilePriorityAllocation = Record<ProfilePriorityId, number>;

export const PROFILE_PRIORITY_RESOURCE_OPTIONS = [
  {
    id: "money",
    label: "Money",
    prompt:
      "How would you allocate 100 sparks across causes when deciding where your moral spending goes?",
  },
  {
    id: "ordinary_action",
    label: "Ordinary actions",
    prompt:
      "How would you allocate 100 sparks across causes when deciding which everyday behavior changes to make?",
  },
  {
    id: "skilled_work",
    label: "Skilled work",
    prompt:
      "How would you allocate 100 sparks across causes when deciding where to use your skills?",
  },
  {
    id: "career",
    label: "Career effort",
    prompt:
      "How would you allocate 100 sparks across causes when deciding which career paths or major projects to pursue?",
  },
] as const;

export type ProfilePriorityResourceType =
  (typeof PROFILE_PRIORITY_RESOURCE_OPTIONS)[number]["id"];
export type ProfilePriorityResourceAllocationMap = Partial<
  Record<ProfilePriorityResourceType, ProfilePriorityAllocation>
>;

export type ProfilePriorityOpportunityResourceType =
  | "donation"
  | "funding"
  | "payer_side"
  | "behavioral_commitment"
  | "research"
  | "software"
  | "analysis"
  | "operations"
  | "skilled_contribution"
  | "career"
  | "long_duration_project"
  | "other";

export interface ResolvedProfilePriorityAllocation {
  allocation: ProfilePriorityAllocation;
  resourceType: ProfilePriorityResourceType | null;
  source: "general" | "resource_override";
}

export interface PersistedProfilePriority {
  id: ProfilePriorityId;
  label: string;
  causeArea: WalkthroughCauseArea;
  sparks: number;
  share: number;
  rank: number;
}

const priorityById = new Map(
  PROFILE_PRIORITY_OPTIONS.map((priority) => [priority.id, priority]),
);
const priorityIds = PROFILE_PRIORITY_OPTIONS.map((priority) => priority.id);
const priorityIdSet = new Set<string>(priorityIds);
const profilePriorityResourceTypeSet = new Set<string>(
  PROFILE_PRIORITY_RESOURCE_OPTIONS.map((resource) => resource.id),
);

const opportunityResourceMap: Partial<
  Record<ProfilePriorityOpportunityResourceType, ProfilePriorityResourceType>
> = {
  donation: "money",
  funding: "money",
  payer_side: "money",
  behavioral_commitment: "ordinary_action",
  research: "skilled_work",
  software: "skilled_work",
  analysis: "skilled_work",
  operations: "skilled_work",
  skilled_contribution: "skilled_work",
  career: "career",
  long_duration_project: "career",
};

const walkthroughPriorityMap: Record<string, ProfilePriorityId> = {
  "Wild animal suffering": "wild-animal-welfare",
  "Factory farming": "factory-farming",
  "Global health": "global-health",
  Climate: "climate",
  "Existential risk": "ai-safety",
  "Future flourishing": "future-flourishing",
  "S-risks": "s-risks",
  "Global poverty": "global-poverty",
  "Concentration of power": "democratic-institutions",
  "Priorities research": "cause-prioritization",
  "Biological risks": "biosecurity",
  "AI safety": "ai-safety",
  "Space governance": "space-governance",
  "Building altruism": "cause-prioritization",
};

const causeAreaPriorityMap: Record<WalkthroughCauseArea, ProfilePriorityId> = {
  "Animal welfare": "factory-farming",
  Climate: "climate",
  "Existential risk": "ai-safety",
  "Future flourishing": "future-flourishing",
  "Global poverty": "global-poverty",
  "Public health": "global-health",
  "Cause prioritization": "cause-prioritization",
  "Community service": "cause-prioritization",
};

export function getProfilePriority(id: string) {
  return priorityById.get(id as ProfilePriorityId) ?? PROFILE_PRIORITY_OPTIONS[0];
}

export function getWalkthroughPriorityId(
  originalCause: string,
  causeArea: WalkthroughCauseArea,
) {
  return walkthroughPriorityMap[originalCause] ?? causeAreaPriorityMap[causeArea];
}

export function buildProfilePriorityOrder(
  originalCause: string,
  causeArea: WalkthroughCauseArea,
): ProfilePriorityId[] {
  const carriedPriority = getWalkthroughPriorityId(originalCause, causeArea);
  return [carriedPriority, ...priorityIds.filter((id) => id !== carriedPriority)];
}

export function buildInitialProfilePriorityAllocation(
  order: readonly ProfilePriorityId[] = priorityIds,
): ProfilePriorityAllocation {
  return Object.fromEntries(
    priorityIds.map((id) => {
      const index = order.indexOf(id);
      return [id, index < 0 ? 0 : index < 2 ? 3 : index < 6 ? 2 : index < 8 ? 1 : 0];
    }),
  ) as ProfilePriorityAllocation;
}

export function getAssignedProfilePrioritySparks(allocation: ProfilePriorityAllocation) {
  return priorityIds.reduce((sum, id) => sum + allocation[id], 0);
}

export function rankProfilePriorities(
  allocation: ProfilePriorityAllocation,
  stableOrder: readonly ProfilePriorityId[] = priorityIds,
) {
  return [...priorityIds].sort(
    (a, b) =>
      allocation[b] - allocation[a] || stableOrder.indexOf(a) - stableOrder.indexOf(b),
  );
}

export function normalizeProfilePriorityAllocation(
  value: unknown,
): ProfilePriorityAllocation | null {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(parsed) || parsed.length !== priorityIds.length) return null;

  const seen = new Set<string>();
  const allocation = Object.fromEntries(priorityIds.map((id) => [id, 0])) as ProfilePriorityAllocation;

  for (const candidate of parsed) {
    if (!candidate || typeof candidate !== "object") return null;
    const id = String((candidate as { id?: unknown }).id ?? "");
    const sparks = Number((candidate as { sparks?: unknown }).sparks);

    if (
      !priorityIdSet.has(id) ||
      seen.has(id) ||
      !Number.isInteger(sparks) ||
      sparks < 0 ||
      sparks > COMPLETE_PROFILE_SPARK_COUNT
    ) {
      return null;
    }

    seen.add(id);
    allocation[id as ProfilePriorityId] = sparks;
  }

  const assigned = getAssignedProfilePrioritySparks(allocation);
  return assigned > 0 && assigned <= COMPLETE_PROFILE_SPARK_COUNT ? allocation : null;
}

export function normalizePersistedProfilePriorityAllocation(
  value: unknown,
): ProfilePriorityAllocation | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > priorityIds.length) {
    return null;
  }

  const allocation = Object.fromEntries(
    priorityIds.map((id) => [id, 0]),
  ) as ProfilePriorityAllocation;
  const seen = new Set<string>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const id = String((candidate as { id?: unknown }).id ?? "");
    const sparks = Number((candidate as { sparks?: unknown }).sparks);
    if (
      !priorityIdSet.has(id) ||
      seen.has(id) ||
      !Number.isInteger(sparks) ||
      sparks <= 0 ||
      sparks > COMPLETE_PROFILE_SPARK_COUNT
    ) {
      return null;
    }
    seen.add(id);
    allocation[id as ProfilePriorityId] = sparks;
  }

  return getAssignedProfilePrioritySparks(allocation) <= COMPLETE_PROFILE_SPARK_COUNT
    ? allocation
    : null;
}

export function normalizeProfilePriorityResourceAllocations(
  value: unknown,
): ProfilePriorityResourceAllocationMap | null {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(parsed) || parsed.length > PROFILE_PRIORITY_RESOURCE_OPTIONS.length) {
    return null;
  }

  const normalized: ProfilePriorityResourceAllocationMap = {};
  const seen = new Set<string>();
  for (const candidate of parsed) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const resourceType = String(
      (candidate as { resourceType?: unknown }).resourceType ?? "",
    );
    if (!profilePriorityResourceTypeSet.has(resourceType) || seen.has(resourceType)) {
      return null;
    }
    const allocation = normalizeProfilePriorityAllocation(
      (candidate as { allocation?: unknown }).allocation,
    );
    if (!allocation) return null;
    seen.add(resourceType);
    normalized[resourceType as ProfilePriorityResourceType] = allocation;
  }

  return normalized;
}

export function serializeProfilePriorityResourceAllocations(
  allocations: ProfilePriorityResourceAllocationMap,
) {
  return JSON.stringify(
    PROFILE_PRIORITY_RESOURCE_OPTIONS.flatMap(({ id: resourceType }) => {
      const allocation = allocations[resourceType];
      return allocation
        ? [
            {
              resourceType,
              allocation: JSON.parse(serializeProfilePriorityAllocation(allocation)),
            },
          ]
        : [];
    }),
  );
}

export function getProfilePriorityResourceTypeForOpportunity(
  resourceType: ProfilePriorityOpportunityResourceType,
) {
  return opportunityResourceMap[resourceType] ?? null;
}

export function resolveProfilePriorityAllocationForOpportunity(
  general: ProfilePriorityAllocation,
  overrides: ProfilePriorityResourceAllocationMap,
  opportunityResourceType: ProfilePriorityOpportunityResourceType,
): ResolvedProfilePriorityAllocation {
  const resourceType = getProfilePriorityResourceTypeForOpportunity(
    opportunityResourceType,
  );
  const override = resourceType ? overrides[resourceType] : null;

  return {
    allocation: override ?? general,
    resourceType,
    source: override ? "resource_override" : "general",
  };
}

export function serializeProfilePriorityAllocation(allocation: ProfilePriorityAllocation) {
  return JSON.stringify(priorityIds.map((id) => ({ id, sparks: allocation[id] })));
}

export function buildPersistedProfilePriorities(
  allocation: ProfilePriorityAllocation,
  stableOrder: readonly ProfilePriorityId[] = priorityIds,
): PersistedProfilePriority[] {
  const ranking = rankProfilePriorities(allocation, stableOrder).filter(
    (id) => allocation[id] > 0,
  );

  return ranking.map((id, index) => {
    const priority = getProfilePriority(id);
    const previousId = ranking[index - 1];
    const rank = previousId && allocation[previousId] === allocation[id]
      ? index === 1
        ? 1
        : ranking
            .slice(0, index)
            .findIndex((candidate) => allocation[candidate] === allocation[id]) + 1
      : index + 1;

    return {
      id,
      label: priority.name,
      causeArea: priority.causeArea,
      sparks: allocation[id],
      share: allocation[id] * COMPLETE_PROFILE_SPARK_VALUE,
      rank,
    };
  });
}

export function getRankedProfilePriorityLabels(allocation: ProfilePriorityAllocation) {
  return buildPersistedProfilePriorities(allocation).map((priority) => priority.label);
}

export function getRankedProfileCauseAreas(allocation: ProfilePriorityAllocation) {
  const totals = new Map<WalkthroughCauseArea, number>();
  for (const priority of buildPersistedProfilePriorities(allocation)) {
    totals.set(priority.causeArea, (totals.get(priority.causeArea) ?? 0) + priority.sparks);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([causeArea]) => causeArea);
}
