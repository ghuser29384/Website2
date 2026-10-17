import { validateProfileUsername } from "../profile-username";

export type CreatorParticipation = "participating" | "organizer-only";
export type ParticipantAccountType = "individual" | "organization";
export type ParticipantVerification =
  | "none"
  | "identity-verified"
  | "organization-verified";
export type ParticipantInvitationState = "draft";

export interface AccountParticipantTarget {
  rowId: string;
  kind: "account";
  profileId: string;
  usernameSnapshot: string;
  displayNameSnapshot: string;
  accountType: ParticipantAccountType;
  verification: ParticipantVerification;
  publicMention: "username" | "pending-invitee";
  invitationState: ParticipantInvitationState;
  isCreator: boolean;
}

export interface ExternalClaimParticipantTarget {
  rowId: string;
  kind: "external-claim";
  displayNameSnapshot: string;
  deliveryChannel: "claim-link";
  publicMention: "unclaimed-invitee";
  invitationState: ParticipantInvitationState;
  isCreator: false;
}

export type ParticipantTarget = AccountParticipantTarget | ExternalClaimParticipantTarget;

export interface ParticipantOwnedFundingTerms {
  maximumBudgetMinor: number;
  noPoolDefault: string;
  participationBeatsDefault: true;
  preauthorizeExecutableFallback: false;
}

interface ParticipantTargetOptions {
  minimum: number;
  maximum: number;
  creatorParticipation: CreatorParticipation;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ROW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,79}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const URL_LIKE_PATTERN = /(?:https?:\/\/|www\.)/iu;
const PHONE_ONLY_PATTERN = /^[+0-9() .-]+$/u;
const SENSITIVE_OR_EXECUTABLE_KEYS = new Set([
  "accept",
  "accepted",
  "activate",
  "authorization",
  "authorizationId",
  "cardNumber",
  "clientSecret",
  "contactEmail",
  "contactPhone",
  "email",
  "inviteToken",
  "paymentIntent",
  "paymentMethodId",
  "phone",
  "privateValue",
  "routingNumber",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key) || SENSITIVE_OR_EXECUTABLE_KEYS.has(key)) {
      throw new Error(`${label} contains an unsupported or private field.`);
    }
  }
}

function cleanRequiredText(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const cleaned = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!cleaned || cleaned.length > maximum || CONTROL_CHARACTER_PATTERN.test(cleaned)) {
    throw new Error(`${label} must contain between 1 and ${maximum} safe characters.`);
  }
  return cleaned;
}

function containsContactLikeIdentity(value: string) {
  if (value.includes("@") || URL_LIKE_PATTERN.test(value)) return true;
  const digits = value.replace(/[^0-9]/gu, "");
  return digits.length >= 7 && PHONE_ONLY_PATTERN.test(value);
}

function validateRowId(value: unknown) {
  if (typeof value !== "string" || !ROW_ID_PATTERN.test(value)) {
    throw new Error("Each participant row requires a valid local row identifier.");
  }
  return value;
}

function validateProfileId(value: unknown) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("An account participant requires a valid profile ID.");
  }
  return value.toLowerCase();
}

const ACCOUNT_TARGET_KEYS = new Set([
  "rowId",
  "kind",
  "profileId",
  "usernameSnapshot",
  "displayNameSnapshot",
  "accountType",
  "verification",
  "publicMention",
  "invitationState",
  "isCreator",
]);
const EXTERNAL_TARGET_KEYS = new Set([
  "rowId",
  "kind",
  "displayNameSnapshot",
  "deliveryChannel",
  "publicMention",
  "invitationState",
  "isCreator",
]);

export function validateParticipantTarget(value: unknown): ParticipantTarget {
  if (!isRecord(value)) throw new Error("Each participant must be an explicitly selected target.");

  if (value.kind === "account") {
    assertAllowedKeys(value, ACCOUNT_TARGET_KEYS, "Account participant identity");
    const username = validateProfileUsername(value.usernameSnapshot);
    if (!username.ok) {
      throw new Error(`Account participant username is invalid: ${username.message}`);
    }
    const accountType = value.accountType;
    if (accountType !== "individual" && accountType !== "organization") {
      throw new Error("Account participant type is invalid.");
    }
    const verification = value.verification;
    if (
      verification !== "none" &&
      verification !== "identity-verified" &&
      verification !== "organization-verified"
    ) {
      throw new Error("Account participant verification state is invalid.");
    }
    if (
      (accountType === "individual" && verification === "organization-verified") ||
      (accountType === "organization" && verification === "identity-verified")
    ) {
      throw new Error("Account participant verification does not match the account type.");
    }
    if (value.publicMention !== "username" && value.publicMention !== "pending-invitee") {
      throw new Error("Account participant public-mention state is invalid.");
    }
    if (value.invitationState !== "draft") {
      throw new Error("Create accepts only draft participant invitation targets.");
    }
    if (typeof value.isCreator !== "boolean") {
      throw new Error("Account participant creator state is invalid.");
    }

    const displayName = cleanRequiredText(
      value.displayNameSnapshot,
      "Account participant display name",
      120,
    );
    if (containsContactLikeIdentity(displayName) && displayName !== `@${username.username}`) {
      throw new Error("Account participant display names cannot expose contact details.");
    }

    return {
      rowId: validateRowId(value.rowId),
      kind: "account",
      profileId: validateProfileId(value.profileId),
      usernameSnapshot: username.username,
      displayNameSnapshot: displayName,
      accountType,
      verification,
      publicMention: value.publicMention,
      invitationState: "draft",
      isCreator: value.isCreator,
    };
  }

  if (value.kind === "external-claim") {
    assertAllowedKeys(value, EXTERNAL_TARGET_KEYS, "External invitee identity");
    if (value.deliveryChannel !== "claim-link") {
      throw new Error("External invitees must use a private claim link at proposal stage.");
    }
    if (value.publicMention !== "unclaimed-invitee") {
      throw new Error("External invitees must remain publicly unclaimed.");
    }
    if (value.invitationState !== "draft") {
      throw new Error("Create accepts only draft external invitee targets.");
    }
    if (value.isCreator !== false) {
      throw new Error("The creator must be represented by their Moral Trade account.");
    }

    const displayName = cleanRequiredText(
      value.displayNameSnapshot,
      "External invitee display name",
      120,
    );
    if (containsContactLikeIdentity(displayName)) {
      throw new Error(
        "External invitee names cannot contain email addresses, phone numbers, or URLs.",
      );
    }

    return {
      rowId: validateRowId(value.rowId),
      kind: "external-claim",
      displayNameSnapshot: displayName,
      deliveryChannel: "claim-link",
      publicMention: "unclaimed-invitee",
      invitationState: "draft",
      isCreator: false,
    };
  }

  throw new Error("Each participant must be an explicitly selected Moral Trade account or external claim invitee.");
}

export function validateParticipantTargets(
  value: unknown,
  options: ParticipantTargetOptions,
): ParticipantTarget[] {
  if (!Array.isArray(value)) throw new Error("Participants must be an array.");
  if (
    !Number.isInteger(options.minimum) ||
    !Number.isInteger(options.maximum) ||
    options.minimum < 0 ||
    options.maximum < options.minimum ||
    options.maximum > 100
  ) {
    throw new Error("Participant validation limits are invalid.");
  }
  if (value.length < options.minimum || value.length > options.maximum) {
    throw new Error(
      `Select between ${options.minimum} and ${options.maximum} participants or invitees.`,
    );
  }

  const targets = value.map(validateParticipantTarget);
  const rowIds = new Set<string>();
  const profileIds = new Set<string>();
  let creatorCount = 0;

  for (const target of targets) {
    if (rowIds.has(target.rowId)) {
      throw new Error("Each participant row must have a unique identifier.");
    }
    rowIds.add(target.rowId);

    if (target.kind === "account") {
      if (profileIds.has(target.profileId)) {
        throw new Error("The same account cannot be added twice.");
      }
      profileIds.add(target.profileId);
    }

    if (target.isCreator) creatorCount += 1;
  }

  if (options.creatorParticipation === "participating") {
    if (creatorCount !== 1) {
      throw new Error("A participating creator must appear exactly once as an account participant.");
    }
  } else if (creatorCount !== 0) {
    throw new Error("An organizer-only creator cannot appear as a participant.");
  }

  return targets;
}

export function validateParticipantOwnedFundingTerms(
  value: unknown,
  label = "Participant funding terms",
): ParticipantOwnedFundingTerms {
  if (!isRecord(value)) throw new Error(`${label} are required.`);
  const allowed = new Set([
    "maximumBudgetMinor",
    "noPoolDefault",
    "participationBeatsDefault",
    "preauthorizeExecutableFallback",
  ]);
  assertAllowedKeys(value, allowed, label);

  if (
    typeof value.maximumBudgetMinor !== "number" ||
    !Number.isSafeInteger(value.maximumBudgetMinor) ||
    value.maximumBudgetMinor <= 0
  ) {
    throw new Error(`${label} require a positive private maximum contribution.`);
  }
  if (value.participationBeatsDefault !== true) {
    throw new Error(`${label} require the participant to attest that participation beats the stated default.`);
  }
  if (value.preauthorizeExecutableFallback !== false) {
    throw new Error(`${label} cannot preauthorize an executable fallback.`);
  }

  return {
    maximumBudgetMinor: value.maximumBudgetMinor,
    noPoolDefault: cleanRequiredText(value.noPoolDefault, `${label} fallback`, 500),
    participationBeatsDefault: true,
    preauthorizeExecutableFallback: false,
  };
}
