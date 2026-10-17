import { validateProfileUsername } from "@/lib/profile-username";
import type { WalkthroughOfferType } from "@/lib/walkthrough-profile";
import {
  normalizeProfilePriorityAllocation,
  type ProfilePriorityAllocation,
} from "@/lib/profile-priorities";

export const COMPLETE_PROFILE_AFFILIATION_MAX_LENGTH = 160;
export const COMPLETE_PROFILE_MAX_COMMITMENTS = [25, 50, 100, 250, 500] as const;
export const COMPLETE_PROFILE_MONTHLY_TIMES = [
  "1 hour",
  "2 hours",
  "4 hours",
  "8+ hours",
] as const;
export const COMPLETE_PROFILE_CONTACT_RULES = [
  "Introductions only",
  "Verified members",
  "Open proposals",
] as const;

export type CompleteProfileMaxCommitment =
  (typeof COMPLETE_PROFILE_MAX_COMMITMENTS)[number];
export type CompleteProfileMonthlyTime = (typeof COMPLETE_PROFILE_MONTHLY_TIMES)[number];
export type CompleteProfileContactRule = (typeof COMPLETE_PROFILE_CONTACT_RULES)[number];

export interface CompleteProfileSubmission {
  displayName: string;
  username: string;
  publicInvitationMentionsEnabled: boolean;
  role: string;
  affiliation: string;
  bio: string;
  maxCommitment: CompleteProfileMaxCommitment;
  monthlyTime: CompleteProfileMonthlyTime;
  contactRule: CompleteProfileContactRule;
  privateProfile: boolean;
  offerType: WalkthroughOfferType;
  causeArea: string;
  matchGet: string;
  priorityAllocation: ProfilePriorityAllocation;
}

const offerTypeSet = new Set<WalkthroughOfferType>(["Money", "Time", "A pledge"]);
const maxCommitmentSet = new Set<number>(COMPLETE_PROFILE_MAX_COMMITMENTS);
const monthlyTimeSet = new Set<string>(COMPLETE_PROFILE_MONTHLY_TIMES);
const contactRuleSet = new Set<string>(COMPLETE_PROFILE_CONTACT_RULES);

function clean(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeCompleteProfileSubmission(input: {
  displayName?: unknown;
  username?: unknown;
  publicInvitationMentionsEnabled?: unknown;
  role?: unknown;
  affiliation?: unknown;
  bio?: unknown;
  maxCommitment?: unknown;
  monthlyTime?: unknown;
  contactRule?: unknown;
  privateProfile?: unknown;
  offerType?: unknown;
  causeArea?: unknown;
  matchGet?: unknown;
  priorityAllocation?: unknown;
}): CompleteProfileSubmission | null {
  const displayName = clean(input.displayName, 80);
  const usernameResult = validateProfileUsername(input.username);
  const role = clean(input.role, 100);
  const affiliation = clean(input.affiliation, COMPLETE_PROFILE_AFFILIATION_MAX_LENGTH);
  const bio = clean(input.bio, 500);
  const maxCommitmentNumber = Number(input.maxCommitment);
  const monthlyTime = clean(input.monthlyTime, 40);
  const contactRule = clean(input.contactRule, 40);
  const offerType = clean(input.offerType, 40);
  const causeArea = clean(input.causeArea, 80);
  const priorityAllocation = normalizeProfilePriorityAllocation(input.priorityAllocation);

  if (
    displayName.length < 2 ||
    !usernameResult.ok ||
    role.length < 2 ||
    !offerTypeSet.has(offerType as WalkthroughOfferType) ||
    !causeArea ||
    !priorityAllocation
  ) {
    return null;
  }

  return {
    displayName,
    username: usernameResult.username,
    publicInvitationMentionsEnabled:
      input.publicInvitationMentionsEnabled === true ||
      input.publicInvitationMentionsEnabled === "true" ||
      input.publicInvitationMentionsEnabled === "1" ||
      input.publicInvitationMentionsEnabled === "on",
    role,
    affiliation,
    bio,
    maxCommitment: (maxCommitmentSet.has(maxCommitmentNumber)
      ? maxCommitmentNumber
      : 100) as CompleteProfileMaxCommitment,
    monthlyTime: (monthlyTimeSet.has(monthlyTime)
      ? monthlyTime
      : "2 hours") as CompleteProfileMonthlyTime,
    contactRule: (contactRuleSet.has(contactRule)
      ? contactRule
      : "Introductions only") as CompleteProfileContactRule,
    privateProfile:
      input.privateProfile === true ||
      input.privateProfile === "true" ||
      input.privateProfile === "1" ||
      input.privateProfile === "on",
    offerType: offerType as WalkthroughOfferType,
    causeArea,
    matchGet: clean(input.matchGet, 180),
    priorityAllocation,
  };
}

export function getCompleteProfilePrivacyStage(
  privateProfile: boolean,
  contactRule: CompleteProfileContactRule,
): "strict" | "limited" | "broad" {
  if (privateProfile || contactRule === "Introductions only") return "strict";
  if (contactRule === "Verified members") return "limited";
  return "broad";
}

export function getCompleteProfileOfferOpenness(offerType: WalkthroughOfferType) {
  return {
    openToPayment: offerType === "Money",
    openToPledges: offerType === "A pledge",
  };
}

function buildRoleAndAffiliation(input: CompleteProfileSubmission) {
  return input.affiliation ? `${input.role} at ${input.affiliation}` : input.role;
}

export function buildCompleteProfileCapabilityText(
  input: CompleteProfileSubmission,
  options: { includeOfferType?: boolean } = {},
) {
  const identity = buildRoleAndAffiliation(input);
  if (options.includeOfferType === false) {
    return `${identity}. Has about ${input.monthlyTime} available each month for separately reviewed opportunities.`;
  }

  return `${identity}. Can contribute ${input.offerType.toLowerCase()} with about ${input.monthlyTime} available each month.`;
}

export function buildCompleteProfileConstraintText(input: CompleteProfileSubmission) {
  return `Maximum one-time commitment: $${input.maxCommitment}. Contact rule: ${input.contactRule}.`;
}

export function buildCompleteProfilePublicPreview(input: CompleteProfileSubmission) {
  const introduction = input.bio ? ` ${input.bio}` : "";
  return `${input.displayName} — ${buildRoleAndAffiliation(input)}. Prioritizes ${input.causeArea}.${introduction}`.slice(
    0,
    420,
  );
}
