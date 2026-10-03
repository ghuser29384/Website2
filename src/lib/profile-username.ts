const PROFILE_USERNAME_MIN_LENGTH = 2;
const PROFILE_USERNAME_MAX_LENGTH = 32;
const PROFILE_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;

const RESERVED_PROFILE_USERNAMES = new Set([
  "about",
  "account",
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "contact",
  "create",
  "dashboard",
  "discover",
  "docs",
  "help",
  "legal",
  "login",
  "logout",
  "moral-trade",
  "moraltrade",
  "moderator",
  "notifications",
  "people",
  "privacy",
  "profile",
  "root",
  "security",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
  "terms",
  "trade",
  "trades",
  "user",
  "users",
  "verification",
  "www",
]);

export type ProfileUsernameValidation =
  | { ok: true; username: string }
  | { ok: false; message: string };

export function normalizeProfileUsername(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^@+/u, "")
    .toLowerCase();
}

export function validateProfileUsername(value: unknown): ProfileUsernameValidation {
  const username = normalizeProfileUsername(value);

  if (!username) {
    return { ok: false, message: "Choose a public username before continuing." };
  }
  if (username.length < PROFILE_USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      message: `Usernames must contain at least ${PROFILE_USERNAME_MIN_LENGTH} characters.`,
    };
  }
  if (username.length > PROFILE_USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Usernames must contain at most ${PROFILE_USERNAME_MAX_LENGTH} characters.`,
    };
  }
  if (!PROFILE_USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      message:
        "Use lowercase letters, numbers, and single hyphens only; a username must start and end with a letter or number.",
    };
  }
  if (username.includes("--")) {
    return { ok: false, message: "Usernames cannot contain consecutive hyphens." };
  }
  if (RESERVED_PROFILE_USERNAMES.has(username)) {
    return { ok: false, message: "That username is reserved. Choose another username." };
  }

  return { ok: true, username };
}

export function profileNeedsUsername(profile: { username?: string | null } | null | undefined) {
  return !profile?.username || !validateProfileUsername(profile.username).ok;
}

export function buildUsernameCompletionPath(next: string) {
  const query = new URLSearchParams({
    username_required: "1",
    next,
  });
  return `/complete-profile?${query.toString()}`;
}
