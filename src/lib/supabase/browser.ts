import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const hostname = typeof window === "undefined" ? undefined : window.location.hostname;
  const { url, publishableKey } = getSupabaseEnv(hostname);

  return createBrowserClient<Database>(url, publishableKey);
}
