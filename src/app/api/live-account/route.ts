import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { getDisplayNameParts } from "@/lib/display-name";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PaymentAccount = {
  charges_enabled: boolean;
  details_submitted: boolean;
  onboarding_completed_at: string | null;
  payouts_enabled: boolean;
};

type WishProfileSettings = {
  is_discoverable: boolean;
  notification_dashboard_enabled: boolean;
  notification_email_enabled: boolean;
  privacy_stage: "strict" | "broad" | "limited";
  share_public_preview: boolean;
};

function privateJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

function paymentAccountLabel(account: PaymentAccount | null) {
  if (!account) {
    return "Not configured";
  }

  if (account.charges_enabled && account.payouts_enabled) {
    return "Payments and payouts enabled";
  }

  if (account.details_submitted || account.onboarding_completed_at) {
    return "Details submitted; activation pending";
  }

  return "Setup incomplete";
}

function notificationLabel(settings: WishProfileSettings | null) {
  if (!settings) {
    return "Not configured";
  }

  const channels = [
    settings.notification_dashboard_enabled ? "In-app" : null,
    settings.notification_email_enabled ? "email" : null,
  ].filter((channel): channel is string => Boolean(channel));

  return channels.length ? channels.join(" and ") : "Off";
}

function publicTrustLabel(settings: WishProfileSettings | null) {
  if (!settings) {
    return "Not configured";
  }

  if (settings.is_discoverable && settings.share_public_preview) {
    return "Discoverable with public preview";
  }

  if (settings.is_discoverable) {
    return "Discoverable; preview hidden";
  }

  return "Private";
}

function privacyLabel(settings: WishProfileSettings | null) {
  if (!settings) {
    return "Not configured";
  }

  if (settings.privacy_stage === "broad") {
    return "Broad preview";
  }

  if (settings.privacy_stage === "limited") {
    return "Limited preview";
  }

  return "Strict";
}

export async function GET() {
  const cookieStore = await cookies();
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookie(cookieStore)) {
    return privateJson({ authenticated: false });
  }

  const viewer = await getViewer();

  if (!viewer) {
    return privateJson({ authenticated: false });
  }

  const supabase = await createClient();
  const userId = viewer.authUser.id;
  const [completedAgreementsResult, paymentAccountResult, wishProfileResult] = await Promise.all([
    supabase
      .from("agreements")
      .select("id", { count: "exact", head: true })
      .or(`proposer_id.eq.${userId},responder_id.eq.${userId}`)
      .eq("status", "completed"),
    supabase
      .from("profile_payment_accounts")
      .select("charges_enabled,payouts_enabled,details_submitted,onboarding_completed_at")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("wish_profiles")
      .select(
        "notification_email_enabled,notification_dashboard_enabled,is_discoverable,share_public_preview,privacy_stage",
      )
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  if (completedAgreementsResult.error) {
    console.error("[live-account] Failed to count completed agreements", {
      message: completedAgreementsResult.error.message,
      userId,
    });
  }

  if (paymentAccountResult.error) {
    console.error("[live-account] Failed to load payment account state", {
      message: paymentAccountResult.error.message,
      userId,
    });
  }

  if (wishProfileResult.error) {
    console.error("[live-account] Failed to load account preferences", {
      message: wishProfileResult.error.message,
      userId,
    });
  }

  const paymentAccount = (paymentAccountResult.data ?? null) as PaymentAccount | null;
  const wishProfile = (wishProfileResult.data ?? null) as WishProfileSettings | null;
  const displayName = viewer.displayName.trim();
  const { firstName, initials } = getDisplayNameParts(displayName);

  return privateJson({
    authenticated: true,
    account: {
      displayName,
      firstName,
      initials,
      memberSince: viewer.profile.created_at,
      completedCommitments: completedAgreementsResult.error
        ? null
        : (completedAgreementsResult.count ?? 0),
      currency: null,
      monthlySafeCap: null,
      paymentAccount: {
        configured: Boolean(paymentAccount),
        label: paymentAccountLabel(paymentAccount),
      },
      notifications: {
        enabled: wishProfile
          ? wishProfile.notification_dashboard_enabled || wishProfile.notification_email_enabled
          : null,
        label: notificationLabel(wishProfile),
      },
      publicTrustProfile: {
        enabled: wishProfile ? wishProfile.is_discoverable : null,
        label: publicTrustLabel(wishProfile),
      },
      defaultPrivacy: privacyLabel(wishProfile),
      disputeResolution: null,
      standardTerms: {
        href: "/terms",
        label: "Current site terms",
      },
    },
  });
}
