import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeInternalPath(searchParams.get("next"), "/dashboard");

  if (!hasSupabaseEnv()) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "Supabase is not configured yet.");
    return NextResponse.redirect(loginUrl);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      await getViewer();
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set(
    "error",
    "We could not confirm your email. Please try signing in again.",
  );
  return NextResponse.redirect(loginUrl);
}
