export function getSafeInternalPath(
  value: string | null | undefined,
  fallback = "/",
) {
  const candidate = (value ?? "").trim();

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}
