export const BACKGROUND_COLLECTIVE_ROLES = [
  "owner",
  "delegate",
  "reviewer",
  "viewer",
  "admin",
  "member",
] as const;

export const BACKGROUND_COLLECTIVE_PERMISSIONS = [
  "edit_broad_preview",
  "approve_source_summary",
  "request_intro",
  "approve_contact_disclosure",
  "revoke_grants",
  "change_discoverability",
] as const;

export type BackgroundCollectiveRole = (typeof BACKGROUND_COLLECTIVE_ROLES)[number];
export type BackgroundCollectivePermission = (typeof BACKGROUND_COLLECTIVE_PERMISSIONS)[number];

export interface BackgroundCollectiveMemberAuth {
  ownerStepUpConfirmed?: boolean;
  permissions?: readonly string[];
  role: string;
}

const PERMISSION_SET = new Set<string>(BACKGROUND_COLLECTIVE_PERMISSIONS);

export function normalizeBackgroundCollectivePermissions(values: readonly string[] = []) {
  return values
    .map((value) => value.trim())
    .filter((value): value is BackgroundCollectivePermission => PERMISSION_SET.has(value))
    .filter((value, index, entries) => entries.indexOf(value) === index);
}

export function getDefaultBackgroundCollectivePermissions(role: string) {
  switch (role) {
    case "owner":
      return [...BACKGROUND_COLLECTIVE_PERMISSIONS];
    case "delegate":
    case "admin":
      return ["edit_broad_preview", "approve_source_summary", "request_intro", "revoke_grants"];
    case "reviewer":
    case "member":
      return ["approve_source_summary", "request_intro"];
    case "viewer":
    default:
      return [];
  }
}

export function canBackgroundCollectiveMember(
  member: BackgroundCollectiveMemberAuth,
  action: BackgroundCollectivePermission,
) {
  if (member.role === "owner") {
    return true;
  }

  if (member.role === "viewer") {
    return false;
  }

  const permissions = normalizeBackgroundCollectivePermissions(member.permissions ?? []);

  if (action === "approve_contact_disclosure" || action === "change_discoverability") {
    return permissions.includes(action) && member.ownerStepUpConfirmed === true;
  }

  return permissions.includes(action);
}
