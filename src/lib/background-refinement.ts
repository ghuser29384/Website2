import {
  type BackgroundSourcePermissionField,
  normalizeBackgroundSourcePermissionFields,
} from "@/lib/background-source-permissions";

export const BACKGROUND_REFINEMENT_VERSION = "background-refinement-v1";

export type BackgroundRefinementStatus = "active" | "completed" | "dismissed" | "expired";

export interface BackgroundRefinementProfileInput {
  causeAreas?: string[];
  exclusions?: string[];
  offeredCapabilities?: string[];
  requestedCounterpartyKinds?: string[];
  verificationPreferences?: string[];
}

export interface BackgroundRefinementItem {
  answerKind: "checklist" | "short_text";
  confidenceBefore: "low" | "medium" | "high";
  fieldKey: BackgroundSourcePermissionField;
  options: string[];
  prompt: string;
  refinementVersion: typeof BACKGROUND_REFINEMENT_VERSION;
}

export interface BackgroundRefinementAnalyticsEvent {
  answerTextIncluded: false;
  fieldKeys: BackgroundSourcePermissionField[];
  itemCount: number;
  sessionStatus: BackgroundRefinementStatus;
  summaryOnly: true;
}

function cleanList(values: string[] = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildItem(
  item: Omit<BackgroundRefinementItem, "refinementVersion">,
): BackgroundRefinementItem {
  return {
    ...item,
    options: cleanList(item.options),
    refinementVersion: BACKGROUND_REFINEMENT_VERSION,
  };
}

export function buildBackgroundRefinementItems(
  profile: BackgroundRefinementProfileInput,
): BackgroundRefinementItem[] {
  const causeAreas = cleanList(profile.causeAreas);
  const exclusions = cleanList(profile.exclusions);
  const offeredCapabilities = cleanList(profile.offeredCapabilities);
  const requestedCounterpartyKinds = cleanList(profile.requestedCounterpartyKinds);
  const verificationPreferences = cleanList(profile.verificationPreferences);
  const items: BackgroundRefinementItem[] = [];

  if (causeAreas.length < 2) {
    items.push(
      buildItem({
        answerKind: "checklist",
        confidenceBefore: causeAreas.length ? "medium" : "low",
        fieldKey: "cause_priorities",
        options: ["Animal welfare", "Global health", "Climate", "AI safety", "Governance"],
        prompt:
          "Which other cause areas would still make a conversation worthwhile, even if they are not your top priority?",
      }),
    );
  }

  if (!offeredCapabilities.length) {
    items.push(
      buildItem({
        answerKind: "checklist",
        confidenceBefore: "low",
        fieldKey: "capability_tags",
        options: ["Time", "Donations", "Introductions", "Skills", "Institutional access"],
        prompt:
          "What can you realistically offer: time, donations, introductions, skills, institutional access, or something else?",
      }),
    );
  }

  if (!requestedCounterpartyKinds.length) {
    items.push(
      buildItem({
        answerKind: "short_text",
        confidenceBefore: "low",
        fieldKey: "offer_ask_terms",
        options: [],
        prompt:
          "What kind of counterparty would make a first reviewed introduction worth considering?",
      }),
    );
  }

  if (!verificationPreferences.length) {
    items.push(
      buildItem({
        answerKind: "checklist",
        confidenceBefore: "low",
        fieldKey: "verification_preferences",
        options: ["Receipts", "Public logs", "Attestations", "Payment records", "Operator review"],
        prompt: "What proof would you consider sufficient before relying on a commitment?",
      }),
    );
  }

  if (!exclusions.length) {
    items.push(
      buildItem({
        answerKind: "short_text",
        confidenceBefore: "medium",
        fieldKey: "safety_constraints",
        options: [],
        prompt:
          "What kinds of introductions, counterparties, or contexts should be excluded before any review?",
      }),
    );
  }

  return items;
}

export function buildBackgroundRefinementAnalyticsEvent({
  items,
  status,
}: {
  items: Array<Pick<BackgroundRefinementItem, "fieldKey">>;
  status: BackgroundRefinementStatus;
}): BackgroundRefinementAnalyticsEvent {
  return {
    answerTextIncluded: false,
    fieldKeys: normalizeBackgroundSourcePermissionFields(items.map((item) => item.fieldKey)),
    itemCount: items.length,
    sessionStatus: status,
    summaryOnly: true,
  };
}

export function buildApprovedRefinementSignalDraft({
  answerValues,
  fieldKey,
}: {
  answerValues: string[];
  fieldKey: string;
}) {
  const [normalizedFieldKey] = normalizeBackgroundSourcePermissionFields([fieldKey]);

  if (!normalizedFieldKey) {
    return null;
  }

  return cleanList(answerValues).slice(0, 8).map((value) => ({
    allowedFieldKey: normalizedFieldKey,
    confidenceBand: "medium" as const,
    signalKey: normalizedFieldKey,
    signalValue: value,
    source: "interview" as const,
  }));
}
