export interface SupabaseAuthErrorLike {
  code?: string | null;
  message?: string | null;
  name?: string | null;
}

const MISSING_SESSION_MESSAGES = new Set([
  "auth session missing",
  "auth session missing!",
  "session missing",
]);

export function isExpectedMissingSessionError(
  error: SupabaseAuthErrorLike | null | undefined,
) {
  if (!error) {
    return false;
  }

  const normalizedName = String(error.name ?? "").trim().toLowerCase();
  const normalizedCode = String(error.code ?? "").trim().toLowerCase();
  const normalizedMessage = String(error.message ?? "").trim().toLowerCase();

  return (
    normalizedName === "authsessionmissingerror" ||
    normalizedCode === "auth_session_missing" ||
    MISSING_SESSION_MESSAGES.has(normalizedMessage)
  );
}
