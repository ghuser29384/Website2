import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { ensureAccountRowsForUser, getViewer } from "@/lib/app-data";
import {
  ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
  getAccountActivationState,
  getPostAuthActivationDestination,
} from "@/lib/account-activation";
import { buildAuthPath, normalizeAuthMode } from "@/lib/auth-routes";
import { getSafeInternalPath } from "@/lib/paths";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const mode = normalizeAuthMode(searchParams.get("mode"));
  const next = getSafeInternalPath(
    searchParams.get("next"),
    mode === "signup" ? "/walkthrough" : "/feed",
  );
  const authPath = buildAuthPath({
    mode,
    returnTo: next,
    route: mode === "signup" ? "/signup" : "/login",
  });

  if (!hasSupabaseEnv()) {
    const loginUrl = new URL(authPath, origin);
    loginUrl.searchParams.set("error", "Supabase is not configured yet.");
    return NextResponse.redirect(loginUrl);
  }

  const authError = searchParams.get("error_description") || searchParams.get("error");
  if (authError) {
    const loginUrl = new URL(authPath, origin);
    loginUrl.searchParams.set(
      "error",
      authError.toLowerCase().includes("access_denied")
        ? "Sign-in was cancelled. Try again when you are ready."
        : "We could not complete that sign-in. Try again or use email.",
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      let destination = ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
      if (data.user) {
        const { profile, profileResult } = await ensureAccountRowsForUser(data.user, supabase);
        destination = getPostAuthActivationDestination(
          getAccountActivationState({
            authenticated: true,
            viewer: {
              profile,
              profileStatus: profileResult.profileStatus,
              profileSyncError: profileResult.profileSyncError,
            },
          }),
          next,
        );
      } else {
        const viewer = await getViewer();
        destination = getPostAuthActivationDestination(
          getAccountActivationState({ authenticated: Boolean(viewer), viewer }),
          next,
        );
      }
      return NextResponse.redirect(new URL(destination, origin));
    }

    const loginUrl = new URL(authPath, origin);
    loginUrl.searchParams.set(
      "error",
      "We could not complete that sign-in. Try again or use email.",
    );
    return NextResponse.redirect(loginUrl);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      let destination = ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
      if (data.user) {
        const { profile, profileResult } = await ensureAccountRowsForUser(data.user, supabase);
        destination = getPostAuthActivationDestination(
          getAccountActivationState({
            authenticated: true,
            viewer: {
              profile,
              profileStatus: profileResult.profileStatus,
              profileSyncError: profileResult.profileSyncError,
            },
          }),
          next,
        );
      } else {
        const viewer = await getViewer();
        destination = getPostAuthActivationDestination(
          getAccountActivationState({ authenticated: Boolean(viewer), viewer }),
          next,
        );
      }
      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  const loginUrl = new URL(authPath, origin);
  loginUrl.searchParams.set(
    "error",
    "We could not confirm that link. Please try signing in again.",
  );
  return NextResponse.redirect(loginUrl);
}
