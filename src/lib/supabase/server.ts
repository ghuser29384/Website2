import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isExpectedMissingSessionError } from "@/lib/supabase/auth-errors";
import { getSupabaseEnv, getSupabaseServiceEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
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

  const getUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = (async (jwt?: string) => {
    const result = await getUser(jwt);

    if (isExpectedMissingSessionError(result.error)) {
      return {
        data: { user: null },
        error: null,
      };
    }

    return result;
  }) as typeof supabase.auth.getUser;

  return supabase;
}

export function createServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
