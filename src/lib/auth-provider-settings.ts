import {
  getEnabledOAuthProvidersFromSettings,
  type OAuthProvider,
} from "@/lib/auth-routes";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/config";

type SupabaseAuthSettingsResponse = {
  external?: Partial<Record<OAuthProvider, boolean>>;
};

export async function getEnabledOAuthProviders() {
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
    return getEnabledOAuthProvidersFromSettings(settings.external);
  } catch {
    return [];
  }
}

export async function isOAuthProviderEnabled(provider: OAuthProvider) {
  return (await getEnabledOAuthProviders()).includes(provider);
}
