import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseEnv, getSupabaseServiceEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate cookies directly.
        }
      },
    },
  });
}

export function createServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
