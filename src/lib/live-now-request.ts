import { resolveAuthenticatedUser } from "./auth-resolution";
import { createRequestScopedLoader } from "./request-scoped-loader";
import { createClient } from "./supabase/server";

// Route handlers cannot rely on React render caching. Both feed layers receive
// the same Request and reuse its verified identity and cookie-aware client.
// A read-only feed does not need getViewer's account repair/guest-claim writes.
export const getLiveNowRequestContext = createRequestScopedLoader(async () => {
  const supabase = await createClient();
  const auth = await resolveAuthenticatedUser(
    { getUser: () => supabase.auth.getUser() },
    { claimsPolicy: { mode: "disabled", reason: "active_session_required" } },
  );
  return { supabase, auth };
});
