"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  buildQaProviderPayload,
  clearOnePersonIdentityCookies,
  getOnePersonVerificationSession,
  loadOnePersonAccountStatus,
  recordOnePersonProviderResult,
  startOnePersonVerification,
  synchronizeOnePersonCredentialInventory,
} from "@/lib/identity/server";
import {
  getOnePersonAccountConfig,
  isOnePersonRegistrationEnforced,
  type OnePersonAgeClass,
  type OnePersonVerificationPurpose,
} from "@/lib/identity/one-person-account";

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWith(path: string, key: "error" | "message", message: string): never {
  const url = new URL(path, "https://moraltrade.invalid");
  url.searchParams.set(key, message);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function normalizePurpose(value: string, signedIn: boolean): OnePersonVerificationPurpose {
  if (value === "recovery") return "recovery";
  if (signedIn) return "verify_existing";
  return "registration";
}

export async function startIdentityVerificationAction(formData: FormData) {
  const viewer = await getViewer();
  const requestedPurpose = formText(formData, "purpose");
  const purpose = normalizePurpose(requestedPurpose, Boolean(viewer));
  const returnTo = getSafeInternalPath(formText(formData, "return_to"),
    purpose === "registration" ? "/onboarding" : "/account/identity");

  if (viewer && purpose === "registration") {
    redirectWith("/account/identity", "error", "This signed-in account must be verified rather than registered again.");
  }
  if (!viewer && purpose === "verify_existing") {
    redirectWith("/login?returnTo=/identity", "error", "Sign in before verifying an existing account.");
  }

  const headerStore = await headers();
  const protocol = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const result = await startOnePersonVerification({
      origin,
      purpose,
      requestedProfileId: purpose === "verify_existing" ? viewer?.authUser.id ?? null : null,
      returnTo,
    });
    redirect(result.externalUrl || result.statusPath);
  } catch (error) {
    redirectWith(
      "/identity",
      "error",
      error instanceof Error ? error.message : "Unable to start identity verification.",
    );
  }
}

export async function continueIdentityRegistrationAction() {
  const { status } = await getOnePersonVerificationSession();
  if (!status.registrationReady || status.purpose !== "registration") {
    redirectWith("/identity/status", "error", "Identity verification is not ready for account creation.");
  }
  redirect(`/signup?returnTo=${encodeURIComponent(status.returnTo)}`);
}

export async function restartIdentityVerificationAction(formData: FormData) {
  await clearOnePersonIdentityCookies();
  const returnTo = getSafeInternalPath(formText(formData, "return_to"), "/onboarding");
  redirect(`/identity?returnTo=${encodeURIComponent(returnTo)}`);
}

export async function startOAuthIdentityLinkAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirectWith("/login?returnTo=/account/identity", "error", "Sign in to link another credential.");

  const config = getOnePersonAccountConfig();
  if (!config.manualIdentityLinkingEnabled) {
    redirectWith("/account/identity", "error", "Credential linking is not enabled for this deployment.");
  }

  const provider = formText(formData, "provider");
  if (!["google", "apple", "github"].includes(provider)) {
    redirectWith("/account/identity", "error", "Choose an approved sign-in provider.");
  }

  const signedInAt = Date.parse(viewer.authUser.last_sign_in_at ?? "");
  if (!Number.isFinite(signedInAt) || Date.now() - signedInAt > 10 * 60_000) {
    redirectWith("/login?returnTo=/account/identity", "error", "Sign in again before changing account credentials.");
  }

  const status = await loadOnePersonAccountStatus(viewer.authUser.id);
  if (status?.participationEnforcementEnabled && status.verificationStatus !== "verified") {
    redirectWith("/identity?returnTo=/account/identity", "error", "Verify this canonical account before linking credentials.");
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const protocol = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.linkIdentity({
    provider: provider as "google" | "apple" | "github",
    options: { redirectTo: `${origin}/auth/confirm?next=/account/identity` },
  });
  if (error || !data?.url) {
    redirectWith("/account/identity", "error", error?.message || "Unable to link that credential.");
  }
  redirect(data.url);
}

export async function unlinkIdentityCredentialAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirectWith("/login?returnTo=/account/identity", "error", "Sign in to change credentials.");
  const config = getOnePersonAccountConfig();
  if (!config.manualIdentityLinkingEnabled) {
    redirectWith("/account/identity", "error", "Credential linking is not enabled for this deployment.");
  }

  const signedInAt = Date.parse(viewer.authUser.last_sign_in_at ?? "");
  if (!Number.isFinite(signedInAt) || Date.now() - signedInAt > 10 * 60_000) {
    redirectWith("/login?returnTo=/account/identity", "error", "Sign in again before changing account credentials.");
  }

  const identityId = formText(formData, "identity_id");
  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const identities = userResult.user?.identities ?? [];
  if (userError || identities.length < 2) {
    redirectWith("/account/identity", "error", "At least two sign-in credentials are required before one can be removed.");
  }
  const identity = identities.find((candidate) => candidate.identity_id === identityId);
  if (!identity) redirectWith("/account/identity", "error", "That credential is no longer linked.");
  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) redirectWith("/account/identity", "error", error.message);
  await synchronizeOnePersonCredentialInventory(viewer.authUser.id);
  redirectWith("/account/identity", "message", "Credential removed from the canonical account.");
}

async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer) {
    redirectWith("/login?returnTo=/admin/identity", "error", "Sign in before using identity administration.");
  }

  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: await loadBackgroundAccountSecuritySummary(),
  });
  if (!access.allowed) {
    redirectWith("/dashboard", "error", access.message);
  }
  return viewer;
}

export async function completeManualIdentityReviewAction(formData: FormData) {
  const reviewer = await requireAdmin();
  const config = getOnePersonAccountConfig();
  if (config.providerMode !== "manual_review" && config.providerMode !== "qa_mock") {
    redirectWith("/admin/identity", "error", "Manual identity review is not enabled in this deployment.");
  }

  const sessionId = formText(formData, "session_id");
  const subjectReference = formText(formData, "subject_reference");
  const ageClass = formText(formData, "age_class") as OnePersonAgeClass;
  if (!sessionId || subjectReference.length < 6 || !["adult", "minor_13_17"].includes(ageClass)) {
    redirectWith("/admin/identity", "error", "Provide a valid session, opaque subject reference, and eligible age class.");
  }

  const payload = buildQaProviderPayload({ sessionId, subjectReference, ageClass });
  try {
    await recordOnePersonProviderResult({ exactBody: JSON.stringify(payload), payload });
    redirectWith("/admin/identity", "message", `Review recorded by ${reviewer.displayName}.`);
  } catch (error) {
    redirectWith(
      "/admin/identity",
      "error",
      error instanceof Error ? error.message : "Unable to record review.",
    );
  }
}

export async function configureQaIdentityReleaseAction(formData: FormData) {
  const reviewer = await requireAdmin();
  if (process.env.VERCEL_ENV === "production") {
    redirectWith("/admin/identity", "error", "QA identity release controls are unavailable in production.");
  }
  const config = getOnePersonAccountConfig();
  if (config.providerMode !== "qa_mock") {
    redirectWith("/admin/identity", "error", "QA mock provider mode is required.");
  }
  const registration = formText(formData, "registration_enforcement") === "true";
  const participation = formText(formData, "participation_enforcement") === "true";
  const service = createServiceClient() as any;
  const { error } = await service.rpc("configure_person_account_release_v1", {
    p_provider_mode: "qa_mock",
    p_provider_ready: true,
    p_registration_enforcement_enabled: registration,
    p_participation_enforcement_enabled: participation,
    p_updated_by: reviewer.authUser.id,
  });
  if (error) redirectWith("/admin/identity", "error", error.message);
  redirectWith("/admin/identity", "message", "QA-only identity release gates updated.");
}

export async function verifySignupGateAction() {
  if (!isOnePersonRegistrationEnforced()) redirect("/signup");
  const { status } = await getOnePersonVerificationSession();
  redirect(status.registrationReady ? "/signup" : "/identity/status");
}
