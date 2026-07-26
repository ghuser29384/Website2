import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  X_PROFILE_CONNECTOR_LABEL,
  X_PROFILE_CONNECTOR_PROVIDER,
  getSafeXProfileConnectorReturnPath,
  getXProfileConnectorRevocationConfig,
  readStoredXTokens,
  revokeXOAuthToken,
} from "@/lib/x-profile-connector";

export const dynamic = "force-dynamic";

function redirectWithBanner({
  message,
  request,
  returnTo,
  tone,
}: {
  message: string;
  request: NextRequest;
  returnTo: string;
  tone: "error" | "message";
}) {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.delete(tone === "error" ? "message" : "error");
  url.searchParams.set(tone, message);
  url.searchParams.set("sources", "x");
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Invalid request origin.", { status: 403 });
  }

  const formData = await request.formData();
  const returnTo = getSafeXProfileConnectorReturnPath(
    typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : "",
    "/complete-profile",
  );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl, 303);
  }

  const { data: connections, error: lookupError } = await supabase
    .from("source_connections")
    .select("id,sensitive_ciphertexts")
    .eq("profile_id", user.id)
    .eq("provider", X_PROFILE_CONNECTOR_PROVIDER)
    .eq("label", X_PROFILE_CONNECTOR_LABEL);

  if (lookupError) {
    return redirectWithBanner({
      message: "Moral Trade could not load the X connection.",
      request,
      returnTo,
      tone: "error",
    });
  }

  const config = getXProfileConnectorRevocationConfig();
  let providerRevocationConfirmed = true;

  for (const connection of connections ?? []) {
    const { accessToken, decryptionFailed, refreshToken } = readStoredXTokens(connection);
    const tokens = Array.from(new Set([refreshToken, accessToken].filter(Boolean)));

    if (decryptionFailed) providerRevocationConfirmed = false;

    if (tokens.length && !config) {
      providerRevocationConfirmed = false;
      continue;
    }

    if (config) {
      const results = await Promise.all(
        tokens.map((token) => revokeXOAuthToken({ config, token })),
      );
      if (results.some((result) => !result)) providerRevocationConfirmed = false;
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("source_connections")
    .update({
      access_status: "revoked",
      access_scope: "",
      ai_shadow_mode_allowed: false,
      allowed_field_keys: [],
      consent_notes: "",
      last_import_item_count: 0,
      last_imported_at: null,
      last_sync_summary: "",
      raw_ingestion_allowed: false,
      retention_expires_at: now,
      sensitive_ciphertexts: {},
      sensitive_encryption_version: "",
      updated_at: now,
      url: "",
    })
    .eq("profile_id", user.id)
    .eq("provider", X_PROFILE_CONNECTOR_PROVIDER)
    .eq("label", X_PROFILE_CONNECTOR_LABEL);

  if (updateError) {
    return redirectWithBanner({
      message: "Moral Trade could not disconnect X. Try again.",
      request,
      returnTo,
      tone: "error",
    });
  }

  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return redirectWithBanner({
    message: providerRevocationConfirmed
      ? "X disconnected and the stored authorization was revoked."
      : "X disconnected from Moral Trade. X could not confirm revocation, so also remove Moral Trade from X Connected Apps.",
    request,
    returnTo,
    tone: "message",
  });
}
