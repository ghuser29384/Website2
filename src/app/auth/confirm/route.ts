import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { ensureAccountRowsForUser, getViewer } from "@/lib/app-data";
import { buildAuthPath, normalizeAuthMode } from "@/lib/auth-routes";
import { getSafeInternalPath } from "@/lib/paths";
import { buildUsernameCompletionPath, profileNeedsUsername } from "@/lib/profile-username";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const mode = normalizeAuthMode(searchParams.get("mode"));
  const next = getSafeInternalPath(searchParams.get("next"), "/dashboard");
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
      let destination = next;
      if (data.user) {
        const { profile } = await ensureAccountRowsForUser(data.user, supabase);
        if (profileNeedsUsername(profile)) {
          destination = buildUsernameCompletionPath(next);
        }
      } else {
        const viewer = await getViewer();
        if (viewer && profileNeedsUsername(viewer.profile)) {
          destination = buildUsernameCompletionPath(next);
        }
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
      let destination = next;
      if (data.user) {
        const { profile } = await ensureAccountRowsForUser(data.user, supabase);
        if (profileNeedsUsername(profile)) {
          destination = buildUsernameCompletionPath(next);
        }
      } else {
        const viewer = await getViewer();
        if (viewer && profileNeedsUsername(viewer.profile)) {
          destination = buildUsernameCompletionPath(next);
        }
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
