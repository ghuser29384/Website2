import {
  buildSupabaseAuthCallbackUrl,
  getEnabledOAuthProvidersFromSettings,
  type OAuthProvider,
} from "@/lib/auth-routes";
import { getSiteUrl, getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/config";

type SupabaseAuthSettingsResponse = {
  external?: Partial<Record<OAuthProvider, boolean>>;
};

const PRODUCT_DISABLED_OAUTH_PROVIDERS = new Set<OAuthProvider>(["apple"]);

async function isXProviderEnabled(url: string, publishableKey: string) {
  const target = new URL(`${url}/auth/v1/authorize`);
  target.searchParams.set("provider", "x");
  target.searchParams.set(
    "redirect_to",
    buildSupabaseAuthCallbackUrl(getSiteUrl(), "/dashboard", "login"),
  );

  const response = await fetch(target, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
    },
    redirect: "manual",
    next: { revalidate: 60 },
  });

  return response.status >= 300 && response.status < 400;
}

export async function getEnabledOAuthProviders(): Promise<OAuthProvider[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  try {
    const { publishableKey, url } = getSupabaseEnv();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const settings = (await response.json()) as SupabaseAuthSettingsResponse;
    const providers = getEnabledOAuthProvidersFromSettings(settings.external).filter(
      (provider) => !PRODUCT_DISABLED_OAUTH_PROVIDERS.has(provider),
    );
    if (!providers.includes("x") && settings.external?.twitter !== true) {
      try {
        if (await isXProviderEnabled(url, publishableKey)) {
          return [...providers, "x"];
        }
      } catch {
        return providers;
      }
    }

    return providers;
  } catch {
    return [];
  }
}

export async function isOAuthProviderEnabled(provider: OAuthProvider) {
  return (await getEnabledOAuthProviders()).includes(provider);
}
