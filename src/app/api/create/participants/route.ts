import {
  buildMoralTradeApiJsonResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { getViewer } from "@/lib/app-data";
import { validateProfileUsername } from "@/lib/profile-username";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

interface ParticipantDirectoryRow {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  account_type: "individual" | "organization";
  verification: "none" | "identity-verified" | "organization-verified";
  public_invitation_mentions_enabled: boolean;
}

function publicMention(enabled: boolean) {
  return enabled ? "username" as const : "pending-invitee" as const;
}

function publicIdentity(row: ParticipantDirectoryRow) {
  return {
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    affiliation: "",
    avatarUrl: row.avatar_url,
    accountType: row.account_type,
    verification: row.verification,
    publicMention: publicMention(row.public_invitation_mentions_enabled),
  };
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      { ok: false, message: "Participant search is unavailable." },
      "private_no_store",
      { status: 503 },
    );
  }

  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "participant_directory_search");
  if (rateLimit.limited) {
    return buildMoralTradeApiJsonResponse(
      { ok: false, message: "Too many participant searches. Try again shortly." },
      "private_no_store",
      {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        status: 429,
      },
    );
  }

  const viewer = await getViewer();
  if (!viewer) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        requiresAuth: true,
        message: "Sign in before searching Moral Trade participants.",
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const requestUrl = new URL(request.url);
  const query = (requestUrl.searchParams.get("q") ?? "").normalize("NFKC").trim();
  if (query.length > 80) {
    return buildMoralTradeApiJsonResponse(
      { ok: false, message: "Participant searches must contain at most 80 characters." },
      "private_no_store",
      { status: 400 },
    );
  }
  const requestedLimit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "12", 10);
  const limit = Math.min(12, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 12));
  const username = validateProfileUsername(viewer.profile.username);
  const usernameRequired = !username.ok;

  let service;
  try {
    service = createServiceClient();
  } catch {
    return buildMoralTradeApiJsonResponse(
      { ok: false, message: "Participant search is unavailable." },
      "private_no_store",
      { status: 503 },
    );
  }

  let viewerVerification: ParticipantDirectoryRow["verification"] = "none";
  if (!usernameRequired) {
    const { data: viewerRows, error: viewerError } = await service.rpc(
      "resolve_create_participants_v2",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_profile_ids: [viewer.authUser.id],
      },
    );
    if (viewerError) {
      console.error("[create-participants] viewer identity resolution failed", {
        code: viewerError.code,
        message: viewerError.message,
        userId: viewer.authUser.id,
      });
      return buildMoralTradeApiJsonResponse(
        { ok: false, message: "Your participant identity could not be verified." },
        "private_no_store",
        { status: 500 },
      );
    }
    viewerVerification = ((viewerRows ?? [])[0] as ParticipantDirectoryRow | undefined)?.verification ?? "none";
  }

  let results: ParticipantDirectoryRow[] = [];
  if (!usernameRequired && query.length >= 2) {
    const { data, error } = await service.rpc("search_create_participants_v2", {
      p_actor_profile_id: viewer.authUser.id,
      p_query: query,
      p_limit: limit,
    });
    if (error) {
      console.error("[create-participants] search failed", {
        code: error.code,
        message: error.message,
        userId: viewer.authUser.id,
      });
      return buildMoralTradeApiJsonResponse(
        { ok: false, message: "Participant search failed. Try again." },
        "private_no_store",
        { status: 500 },
      );
    }
    results = (data ?? []) as ParticipantDirectoryRow[];
  }

  return buildMoralTradeApiJsonResponse(
    {
      ok: true,
      query,
      viewer: {
        profileId: viewer.authUser.id,
        username: username.ok ? username.username : "",
        displayName: viewer.displayName,
        affiliation: viewer.profile.affiliation,
        avatarUrl: viewer.profile.avatar_url,
        accountType: viewer.profile.account_kind,
        verification: viewerVerification,
        publicMention: publicMention(
          viewer.profile.public_invitation_mentions_enabled,
        ),
        usernameRequired,
      },
      results: results.map(publicIdentity),
    },
    "private_no_store",
    {
      headers: {
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
