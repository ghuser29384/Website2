"use server";

import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import {
  cancelConditionalRedirectOffer,
  createConditionalRedirectOffer,
  joinConditionalRedirectOffer,
  reauthorizeConditionalRedirect,
  withdrawConditionalRedirectCandidate,
} from "@/lib/payments/conditional-redirect-service";

const PATH = "/donation-offsets/conditional";

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
  redirect(`${PATH}?error=${encodeURIComponent(message)}`);
}

export async function createConditionalRedirectOfferAction(formData: FormData) {
  let checkoutUrl: string | null = null;
  try {
    requireConsent(formData);
    const viewer = await requireViewer(PATH);
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
    const viewer = await requireViewer(PATH);
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
    const viewer = await requireViewer(PATH);
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
    const viewer = await requireViewer(PATH);
    await cancelConditionalRedirectOffer({
      offerId: required(formData, "offer_id"),
      creatorProfileId: viewer.authUser.id,
    });
  } catch (error) {
    fail(error);
  }
  redirect(`${PATH}?change=cancelled`);
}

export async function withdrawConditionalRedirectCandidateAction(formData: FormData) {
  try {
    const viewer = await requireViewer(PATH);
    await withdrawConditionalRedirectCandidate({
      offerId: required(formData, "offer_id"),
      matcherProfileId: viewer.authUser.id,
    });
  } catch (error) {
    fail(error);
  }
  redirect(`${PATH}?change=withdrawn`);
}
