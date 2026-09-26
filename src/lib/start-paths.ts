/** Keep the existing account-aware Create handoff; an example never pre-fills it. */
export function getStartCreateHref(isAuthenticated: boolean) {
  return isAuthenticated ? "/create" : "/signup?returnTo=/create";
}
