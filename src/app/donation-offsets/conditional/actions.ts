"use server";

import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import {
  buildEveryOrgDetailsUrl,
  buildEveryOrgIdentitySnapshot,
  mapEveryOrgNonprofitDetails,
  normalizeEveryOrgIdentifier,
} from "@/lib/every-org-nonprofit";
import {
  cancelConditionalRedirectOffer,
  createConditionalRedirectOffer,
  joinConditionalRedirectOffer,
  reauthorizeConditionalRedirect,
  withdrawConditionalRedirectCandidate,
} from "@/lib/payments/conditional-redirect-service";
import { getDonationUpgradeDestinationEnvironment } from "@/lib/payments/donation-upgrade-destination-environment";
import { createServiceClient } from "@/lib/supabase/server";

const CREATE_PATH = "/trades/new";
const CONDITIONAL_STRUCTURE = "conditional-donation";
const RETURN_PATH = `${CREATE_PATH}?structure=${CONDITIONAL_STRUCTURE}`;
const EVERY_ORG_DETAILS_TIMEOUT_MS = 5_000;

function returnPath(values: Record<string, string>) {
  const params = new URLSearchParams({
    structure: CONDITIONAL_STRUCTURE,
    ...values,
  });
  return `${CREATE_PATH}?${params.toString()}`;
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key.replaceAll("_", " ")} is required.`);
  return value;
}

function cents(formData: FormData, key: string) {
  const raw = required(formData, key);
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Donation amounts must use no more than two decimal places.");
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0.5) {
    throw new Error("Donation amounts must be at least $0.50.");
  }
  return Math.round(amount * 100);
}

function requireConsent(formData: FormData) {
  if (formData.get("consent") !== "on") {
    throw new Error("Confirm the future-charge authorization before continuing.");
  }
}

function origin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.moraltrade.org";
  return new URL(siteUrl).origin;
}

function fail(error: unknown): never {
  const message = error instanceof Error ? error.message : "Unable to complete that request.";
  redirect(returnPath({ error: message }));
}

async function resolveEveryOrgNonprofit(identifierValue: string) {
  const apiKey = String(process.env.EVERY_ORG_PUBLIC_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("Every.org nonprofit search is not configured yet.");
  }

  const identifier = normalizeEveryOrgIdentifier(identifierValue);
  if (!identifier) {
    throw new Error("Choose a valid Every.org charity before requesting review.");
  }

  const response = await fetch(buildEveryOrgDetailsUrl(identifier, apiKey), {
    headers: {
      Accept: "application/json",
      "User-Agent": "MoralTrade.org Donation Upgrade destination verification",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(EVERY_ORG_DETAILS_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Every.org could not find that charity."
        : "Every.org could not verify that charity right now.",
    );
  }

  const nonprofit = mapEveryOrgNonprofitDetails(await response.json());
  if (!nonprofit) {
    throw new Error("Every.org returned an incomplete nonprofit identity.");
  }
  if (!nonprofit.isDisbursable) {
    throw new Error("That Every.org listing is not currently eligible to receive disbursements.");
  }
  return nonprofit;
}

export async function requestConditionalPaymentDestinationAction(formData: FormData) {
  try {
    const viewer = await requireViewer(RETURN_PATH);
    const nonprofit = await resolveEveryOrgNonprofit(
      required(formData, "every_org_identifier"),
    );
    const identitySnapshot = buildEveryOrgIdentitySnapshot(nonprofit);
    const environment = getDonationUpgradeDestinationEnvironment();
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase.rpc(
      "submit_conditional_payment_destination_request",
      {
        p_requester_profile_id: viewer.authUser.id,
        p_environment: environment,
        p_provider_nonprofit_id: nonprofit.id,
        p_nonprofit_slug: nonprofit.primarySlug,
        p_display_name: nonprofit.name,
        p_nonprofit_ein: nonprofit.ein ?? "",
        p_country_code: nonprofit.ein ? "US" : "",
        p_website_url: nonprofit.profileUrl,
        p_identity_snapshot: identitySnapshot,
      },
    );
    if (error || !data) {
      throw new Error(
        `Unable to request charity review: ${error?.message ?? "request was not stored"}`,
      );
    }
  } catch (error) {
    fail(error);
  }

  redirect(returnPath({ destination_request: "submitted" }));
}

export async function createConditionalRedirectOfferAction(formData: FormData) {
  let checkoutUrl: string | null = null;
  try {
    requireConsent(formData);
    const viewer = await requireViewer(RETURN_PATH);
    const deadline = new Date(required(formData, "deadline_at"));
    if (Number.isNaN(deadline.valueOf())) throw new Error("Choose a valid deadline.");
    const result = await createConditionalRedirectOffer({
      creatorProfileId: viewer.authUser.id,
      creatorAmountCents: cents(formData, "creator_amount"),
      matcherAmountCents: cents(formData, "matcher_amount"),
      fallbackDestinationId: required(formData, "fallback_destination_id"),
      matchedDestinationId: required(formData, "matched_destination_id"),
      deadlineAt: deadline.toISOString(),
      origin: origin(),
    });
    if (!result.checkoutUrl) throw new Error("Stripe did not return an authorization page.");
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    fail(error);
  }
  redirect(checkoutUrl!);
}

export async function joinConditionalRedirectOfferAction(formData: FormData) {
  let checkoutUrl: string | null = null;
  try {
    requireConsent(formData);
    const viewer = await requireViewer(RETURN_PATH);
    const result = await joinConditionalRedirectOffer({
      offerId: required(formData, "offer_id"),
      matcherProfileId: viewer.authUser.id,
      origin: origin(),
    });
    if (!result.checkoutUrl) throw new Error("Stripe did not return an authorization page.");
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    fail(error);
  }
  redirect(checkoutUrl!);
}

export async function reauthorizeConditionalRedirectAction(formData: FormData) {
  let checkoutUrl: string | null = null;
  try {
    requireConsent(formData);
    const viewer = await requireViewer(RETURN_PATH);
    const result = await reauthorizeConditionalRedirect({
      offerId: required(formData, "offer_id"),
      profileId: viewer.authUser.id,
      origin: origin(),
    });
    if (!result.checkoutUrl) throw new Error("Stripe did not return an authorization page.");
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    fail(error);
  }
  redirect(checkoutUrl!);
}

export async function cancelConditionalRedirectOfferAction(formData: FormData) {
  try {
    const viewer = await requireViewer(RETURN_PATH);
    await cancelConditionalRedirectOffer({
      offerId: required(formData, "offer_id"),
      creatorProfileId: viewer.authUser.id,
    });
  } catch (error) {
    fail(error);
  }
  redirect(returnPath({ change: "cancelled" }));
}

export async function withdrawConditionalRedirectCandidateAction(formData: FormData) {
  try {
    const viewer = await requireViewer(RETURN_PATH);
    await withdrawConditionalRedirectCandidate({
      offerId: required(formData, "offer_id"),
      matcherProfileId: viewer.authUser.id,
    });
  } catch (error) {
    fail(error);
  }
  redirect(returnPath({ change: "withdrawn" }));
}
