/** Browser-only draft envelope. It is not authentication or a server profile record. */
export const PROFILE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const LEGACY_PROFILE_DRAFT_KEY = "mt_complete_profile_refinement";
const PREFIX = "mt_profile_setup_v1:";
const CONTEXT = "profile-setup-v1";

export const PROFILE_SETUP_LIMITS = {
  displayName: 80,
  username: 32,
  affiliation: 160,
  bio: 500,
  outcomes: 1000,
  capabilities: 1000,
  limits: 1000,
} as const;
export type ProfileSetupValues = Record<keyof typeof PROFILE_SETUP_LIMITS, string>;
export interface ProfileDraftEnvelope {
  version: 1;
  owner: string;
  context: typeof CONTEXT;
  savedAt: number;
  expiresAt: number;
  values: ProfileSetupValues;
}

export function profileDraftOwner(accountId: string | null): string {
  return accountId ? `member:${accountId}` : "guest";
}
export function profileDraftKey(accountId: string | null): string {
  return PREFIX + profileDraftOwner(accountId);
}
export function emptyProfileSetupValues(): ProfileSetupValues {
  return { displayName: "", username: "", affiliation: "", bio: "", outcomes: "", capabilities: "", limits: "" };
}
export function normalizeProfileSetupValues(value: unknown): ProfileSetupValues | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const values = emptyProfileSetupValues();
  for (const key of Object.keys(PROFILE_SETUP_LIMITS) as Array<keyof ProfileSetupValues>) {
    if (typeof candidate[key] !== "string" || candidate[key].length > PROFILE_SETUP_LIMITS[key]) return null;
    values[key] = candidate[key];
  }
  // Deliberately never persist email, authentication, publication consent, or arbitrary fields.
  return values;
}
export function encodeProfileDraft(accountId: string | null, values: ProfileSetupValues, now = Date.now()): string {
  const safe = normalizeProfileSetupValues(values);
  if (!safe || !Number.isFinite(now)) throw new Error("Invalid profile draft");
  return JSON.stringify({ version: 1, owner: profileDraftOwner(accountId), context: CONTEXT,
    savedAt: now, expiresAt: now + PROFILE_DRAFT_TTL_MS, values: safe } satisfies ProfileDraftEnvelope);
}
export function decodeProfileDraft(raw: string | null, accountId: string | null, now = Date.now()): ProfileDraftEnvelope | null {
  if (!raw || raw.length > 20_000 || !Number.isFinite(now)) return null;
  try {
    const draft = JSON.parse(raw) as Partial<ProfileDraftEnvelope>;
    if (draft.version !== 1 || draft.context !== CONTEXT || draft.owner !== profileDraftOwner(accountId)
      || typeof draft.savedAt !== "number" || typeof draft.expiresAt !== "number"
      || !Number.isFinite(draft.savedAt) || !Number.isFinite(draft.expiresAt)
      || draft.savedAt > now || draft.expiresAt <= now
      || draft.expiresAt !== draft.savedAt + PROFILE_DRAFT_TTL_MS) return null;
    const values = normalizeProfileSetupValues(draft.values);
    return values ? { ...draft, values } as ProfileDraftEnvelope : null;
  } catch { return null; }
}

export interface ProfileDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function readProfileDraft(storage: ProfileDraftStorage, accountId: string | null, now = Date.now()) {
  // This unscoped legacy value has no defensible owner. Never display or import it.
  storage.removeItem(LEGACY_PROFILE_DRAFT_KEY);
  const key = profileDraftKey(accountId);
  const raw = storage.getItem(key);
  const draft = decodeProfileDraft(raw, accountId, now);
  if (raw && !draft) storage.removeItem(key);
  return draft;
}
export function clearProfileDraft(storage: ProfileDraftStorage, accountId: string | null) {
  storage.removeItem(profileDraftKey(accountId));
  storage.removeItem(LEGACY_PROFILE_DRAFT_KEY);
}
/** An explicit guest import may supply notes, never replace a member's account identity. */
export function importGuestProfileNotes(current: ProfileSetupValues, guest: ProfileSetupValues): ProfileSetupValues {
  return { ...current, outcomes: guest.outcomes, capabilities: guest.capabilities, limits: guest.limits };
}
/** A stale tab must not submit the previous account's form into the next account. */
export function isProfileSetupOwner(submittedOwner: unknown, authenticatedId: string): boolean {
  return typeof submittedOwner === "string" && submittedOwner === authenticatedId;
}
