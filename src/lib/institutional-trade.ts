import { createHash } from "node:crypto";

export const INSTITUTIONAL_PARTY_CAPACITIES = [
  "organization",
  "individual",
  "service_provider",
  "verifier",
] as const;

export type InstitutionalPartyCapacity = (typeof INSTITUTIONAL_PARTY_CAPACITIES)[number];

export const PERSONAL_INSTITUTIONAL_PARTY_CAPACITIES = [
  "individual",
  "service_provider",
  "verifier",
] as const satisfies readonly InstitutionalPartyCapacity[];

export const ORGANIZATION_INSTITUTIONAL_NAV = [
  "Overview",
  "Programs",
  "Mandates",
  "Opportunities",
  "Matches",
  "Deal rooms",
  "Approvals",
  "Commitments",
  "Evidence",
  "Funds",
  "Reports",
  "Team",
  "Verification",
  "Audit",
  "Integrations",
] as const;

export const INDIVIDUAL_INSTITUTIONAL_NAV = [
  "Opportunities",
  "Matches",
  "Deals",
  "Obligations",
  "Evidence",
  "Consent and verification",
] as const;

export function isPersonalInstitutionalCapacity(value: unknown): value is Exclude<InstitutionalPartyCapacity, "organization"> {
  return PERSONAL_INSTITUTIONAL_PARTY_CAPACITIES.includes(value as Exclude<InstitutionalPartyCapacity, "organization">);
}

export function institutionalIndividualDealHref(dealId: string) {
  return `/institutions/individual/deals/${dealId}`;
}

export function institutionalOrganizationDealHref(organizationId: string, dealId: string) {
  return `/institutions/${organizationId}/deals/${dealId}`;
}

export function institutionalDealHref(deal: { id: string; lead_capacity?: unknown; lead_organization_id?: unknown }) {
  return isPersonalInstitutionalCapacity(deal.lead_capacity)
    ? institutionalIndividualDealHref(deal.id)
    : institutionalOrganizationDealHref(String(deal.lead_organization_id), deal.id);
}

export function canBindInstitutionalPartyAsSelf(
  actorProfileId: string,
  party: { party_capacity?: unknown; profile_id?: unknown },
) {
  return isPersonalInstitutionalCapacity(party.party_capacity) && String(party.profile_id ?? "") === actorProfileId;
}

export const INSTITUTIONAL_PERMISSIONS = [
  "organization:manage",
  "program:manage",
  "mandate:manage",
  "opportunity:manage",
  "deal:manage",
  "deal:approve",
  "deal:sign",
  "finance:manage",
  "finance:reserve",
  "finance:release",
  "risk:review",
  "evidence:review",
  "completion:confirm",
  "pool:manage",
  "pool:approve",
  "pool:activate",
  "integration:manage",
] as const;

export type InstitutionalPermission = (typeof INSTITUTIONAL_PERMISSIONS)[number];

export const INSTITUTIONAL_RESOURCE_TYPES = [
  "funding",
  "staff_time",
  "staff_secondment",
  "grantmaking_capacity",
  "research",
  "operations",
  "data",
  "compute",
  "infrastructure",
  "distribution",
  "introductions",
  "other",
] as const;

export const INSTITUTIONAL_RISK_CATEGORIES = [
  "authority",
  "conflict_of_interest",
  "legal_policy",
  "externality",
  "threat_or_coercion",
  "manufactured_baseline",
  "individual_autonomy",
  "sanctions",
  "privacy_security",
  "research_integrity",
  "financial",
  "operational",
  "other",
] as const;

export const INSTITUTIONAL_RISK_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const INSTITUTIONAL_WEBHOOK_EVENTS = [
  "deal.signed",
  "deal.stage_changed",
  "obligation.updated",
  "milestone.due",
  "evidence.submitted",
  "pool.activated",
  "pool.contribution.updated",
  "dispute.opened",
] as const;

export type InstitutionalWebhookEvent = (typeof INSTITUTIONAL_WEBHOOK_EVENTS)[number];

export const INSTITUTIONAL_DEAL_STAGES = [
  "draft",
  "exploratory",
  "authorized_for_negotiation",
  "proposed",
  "term_sheet_agreed",
  "pending_governance_approval",
  "signed",
  "execution",
  "evidence_review",
  "completed",
  "amended",
  "terminated",
  "disputed",
  "expired",
] as const;

const DEAL_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["exploratory", "authorized_for_negotiation", "terminated"],
  exploratory: ["authorized_for_negotiation", "terminated", "expired"],
  authorized_for_negotiation: ["proposed", "terminated", "expired"],
  proposed: ["term_sheet_agreed", "pending_governance_approval", "terminated", "expired"],
  term_sheet_agreed: ["pending_governance_approval", "terminated", "expired"],
  pending_governance_approval: ["signed", "terminated", "expired"],
  signed: ["execution", "amended", "terminated", "disputed"],
  execution: ["evidence_review", "amended", "terminated", "disputed"],
  evidence_review: ["completed", "amended", "terminated", "disputed"],
  amended: ["execution", "evidence_review", "terminated", "disputed"],
  disputed: ["execution", "evidence_review", "terminated", "completed"],
  completed: [],
  terminated: [],
  expired: [],
};

export function canTransitionInstitutionalDeal(from: string, to: string) {
  return from === to || (DEAL_TRANSITIONS[from] ?? []).includes(to);
}

export function stableInstitutionalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableInstitutionalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableInstitutionalJson(object[key])}`)
    .join(",")}}`;
}

export function hashInstitutionalTerms(value: unknown) {
  return createHash("sha256").update(stableInstitutionalJson(value)).digest("hex");
}

export function parseInstitutionalMoneyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a non-negative amount with no more than two decimal places.");
  }
  const [whole, fractional = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("The amount is outside the supported range.");
  return cents;
}

export function formatInstitutionalLabel(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export interface InstitutionalCommandDraft {
  intent: "search" | "compare" | "prepare_board_packet" | "draft_amendment" | "list_obligations" | "unknown";
  binding: false;
  requiresConfirmation: true;
  explanation: string;
  query: string;
}

export function interpretInstitutionalCommand(input: string): InstitutionalCommandDraft {
  const query = input.trim().slice(0, 2_000);
  const lower = query.toLowerCase();
  let intent: InstitutionalCommandDraft["intent"] = "unknown";
  if (/\b(find|search|match|show)\b/.test(lower)) intent = "search";
  else if (/\b(compare|difference|versions?)\b/.test(lower)) intent = "compare";
  else if (/\b(board|committee|approval packet)\b/.test(lower)) intent = "prepare_board_packet";
  else if (/\b(amend|amendment|revise terms)\b/.test(lower)) intent = "draft_amendment";
  else if (/\b(obligation|due|milestone)\b/.test(lower)) intent = "list_obligations";
  return {
    intent,
    binding: false,
    requiresConfirmation: true,
    explanation:
      intent === "unknown"
        ? "The command is ambiguous. No institutional state will be changed."
        : "This command may prepare or retrieve information, but it cannot approve, sign, reserve funds, activate a pool, change the acting identity, or release a secret.",
    query,
  };
}

export function validateSupportedInstitutionalWebhookEvents(events: readonly string[]) {
  const allowed = new Set<string>(INSTITUTIONAL_WEBHOOK_EVENTS);
  const normalized = [...new Set(events.map((event) => event.trim()).filter(Boolean))];
  const unsupported = normalized.filter((event) => !allowed.has(event));
  if (unsupported.length) throw new Error(`Unsupported institutional webhook event: ${unsupported.join(", ")}.`);
  if (!normalized.length) throw new Error("Select at least one supported institutional webhook event.");
  return normalized as InstitutionalWebhookEvent[];
}
