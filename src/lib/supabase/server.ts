import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

import { getSupabaseEnv, getSupabaseServiceEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

function createAuthAwareServerFetch() {
  let authUserRequestCount = 0;

  return function authAwareServerFetch(input: RequestInfo | URL, init?: RequestInit) {
    const requestUrl =
      input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    if (!new URL(requestUrl).pathname.endsWith("/auth/v1/user")) {
      return fetch(input, init);
    }

    authUserRequestCount += 1;
    if (authUserRequestCount === 1) {
      // Preserve Next's request-scoped GET deduplication for the normal path.
      return fetch(input, { ...init, cache: "no-store" });
    }

    return fetch(input, {
      ...init,
      // Next.js memoizes identical GET requests during a server render. An
      // explicit signal makes an actual retry reach Supabase instead of
      // replaying the first retryable response.
      cache: "no-store",
      signal:
        init?.signal ??
        (input instanceof Request ? input.signal : undefined) ??
        new AbortController().signal,
    });
  };
}

export async function createClient() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const requestHostname = requestHeaders.get("host");
  const { url, publishableKey } = getSupabaseEnv(requestHostname);

  return createServerClient<Database>(url, publishableKey, {
    global: {
      fetch: createAuthAwareServerFetch(),
    },
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
