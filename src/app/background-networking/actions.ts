"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import {
  type BackgroundMfaActionState,
  normalizeBackgroundTotpCode,
} from "@/lib/background-account-security";
import {
  buildBackgroundNotificationPreferenceRows,
  getDataRightRequestDueAt,
  validateProfileDataRightRequest,
} from "@/lib/background-privacy-controls";
import { requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const DATA_RIGHT_REQUEST_STATUSES = [
  "open",
  "in_review",
  "fulfilled",
  "denied",
  "cancelled",
] as const;
type DataRightRequestStatus = (typeof DATA_RIGHT_REQUEST_STATUSES)[number];

function isDataRightRequestStatus(value: string): value is DataRightRequestStatus {
  return (DATA_RIGHT_REQUEST_STATUSES as readonly string[]).includes(value);
}

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readRepeatedStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);

  redirect(`${target.pathname}${target.search}${target.hash}`);
}

export async function saveBackgroundNotificationPreferencesAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const enabledKeys = new Set(readRepeatedStrings(formData, "enabled_preferences"));
  const rows = buildBackgroundNotificationPreferenceRows({
    enabledKeys,
    profileId: viewer.authUser.id,
  }).map((preference) => ({
    channel: preference.channel,
    digest_cadence: preference.digestCadence,
    enabled: preference.enabled,
    event_kind: preference.eventKind,
    profile_id: preference.profileId,
    updated_at: new Date().toISOString(),
  }));
  const supabase = await createClient();
  const { error } = await supabase.from("background_notification_preferences").upsert(rows, {
    onConflict: "profile_id,event_kind,channel",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", "Could not save notification preferences.");
  }

  const emailEnabled = rows.some((row) => row.channel === "email_digest" && row.enabled);
  const dashboardEnabled = rows.some((row) => row.channel === "in_app" && row.enabled);
  const { error: wishProfileError } = await supabase
    .from("wish_profiles")
    .update({
      notification_dashboard_enabled: dashboardEnabled,
      notification_email_enabled: emailEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", viewer.authUser.id);

  if (wishProfileError) {
    redirectWithMessage(returnTo, "error", "Notification preferences were saved, but the profile toggle was not updated.");
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Notification preferences saved.");
}

export async function createProfileDataRightRequestAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const validation = validateProfileDataRightRequest({
    requestDetails: readOptional(formData, "request_details"),
    requestType: readOptional(formData, "request_type"),
    scope: readOptional(formData, "scope"),
  });

  if (validation.errors.length) {
    redirectWithMessage(returnTo, "error", validation.errors.join(" "));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profile_data_right_requests").insert({
    due_at: getDataRightRequestDueAt(),
    profile_id: viewer.authUser.id,
    request_details: validation.requestDetails,
    request_type: validation.requestType,
    scope: validation.scope,
  });

  if (error) {
    redirectWithMessage(returnTo, "error", "Could not record the data-right request.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Data-right request recorded.");
}

export async function updateProfileDataRightRequestAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const viewer = await requireViewer(returnTo);

  if (!isAdminEmail(viewer.authUser.email)) {
    redirectWithMessage(returnTo, "error", "Admin access is required.");
  }

  const requestId = readOptional(formData, "request_id");
  const status = readOptional(formData, "status");
  const operatorNote = readOptional(formData, "operator_note").slice(0, 2000);

  if (!requestId || !isDataRightRequestStatus(status)) {
    redirectWithMessage(returnTo, "error", "Choose a valid data-right request and status.");
  }

  const resolvedAt = ["fulfilled", "denied", "cancelled"].includes(status)
    ? new Date().toISOString()
    : null;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profile_data_right_requests")
    .update({
      operator_note: operatorNote,
      reviewed_by: viewer.authUser.id,
      resolved_at: resolvedAt,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    redirectWithMessage(returnTo, "error", "Could not update the data-right request.");
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Data-right request updated.");
}

export async function enrollBackgroundNetworkingMfaAction(
  _previousState: BackgroundMfaActionState,
  formData: FormData,
): Promise<BackgroundMfaActionState> {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  await requireViewer(returnTo);

  const friendlyName = readOptional(formData, "friendly_name").slice(0, 80) || "Moral Trade";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
    issuer: "Moral Trade",
  });

  if (error) {
    return {
      error: error.message,
      status: "error",
    };
  }

  revalidatePath("/dashboard");

  return {
    factorId: data.id,
    message: "Authenticator setup created. Verify the code before relying on this factor.",
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    status: "enrolled",
  };
}

export async function verifyBackgroundNetworkingMfaAction(
  _previousState: BackgroundMfaActionState,
  formData: FormData,
): Promise<BackgroundMfaActionState> {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  await requireViewer(returnTo);

  const factorId = readOptional(formData, "factor_id");
  const normalizedCode = normalizeBackgroundTotpCode(readOptional(formData, "code"));

  if (!factorId) {
    return {
      error: "Choose an authenticator factor to verify.",
      status: "error",
    };
  }

  if (normalizedCode.error) {
    return {
      error: normalizedCode.error,
      status: "error",
    };
  }

  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });

  if (challenge.error || !challenge.data) {
    return {
      error: challenge.error?.message ?? "Could not start MFA verification.",
      status: "error",
    };
  }

  const verification = await supabase.auth.mfa.verify({
    challengeId: challenge.data.id,
    code: normalizedCode.code,
    factorId,
  });

  if (verification.error) {
    return {
      error: verification.error.message,
      status: "error",
    };
  }

  revalidatePath("/dashboard");

  return {
    message: "MFA verified for this session.",
    status: "verified",
  };
}

export async function removeBackgroundNetworkingMfaAction(
  _previousState: BackgroundMfaActionState,
  formData: FormData,
): Promise<BackgroundMfaActionState> {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  await requireViewer(returnTo);

  const factorId = readOptional(formData, "factor_id");

  if (!factorId) {
    return {
      error: "Choose an authenticator factor to remove.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return {
      error: error.message,
      status: "error",
    };
  }

  revalidatePath("/dashboard");

  return {
    message: "Authenticator factor removed.",
    status: "removed",
  };
}
