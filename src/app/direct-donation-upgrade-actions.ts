"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import {
  buildDirectDonationUpgradeCheckoutUrl,
  buildDirectDonationUpgradeTermsHash,
  DIRECT_DONATION_UPGRADE_BASELINE_VERSION,
  DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
  DIRECT_DONATION_UPGRADE_MAX_CENTS,
  DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS,
  DIRECT_DONATION_UPGRADE_MIN_CENTS,
  fetchEveryOrgNonprofitIdentity,
  getDirectDonationUpgradeConfig,
  parseDirectDonationUpgradeUsd,
  sameEveryOrgNonprofit,
  type DirectDonationUpgradeCandidateRow,
  type DirectDonationUpgradeObligationRow,
  type DirectDonationUpgradeOfferRow,
  type DirectDonationUpgradePrivacyMode,
} from "@/lib/direct-donation-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

const CREATE_PATH = "/trades/new?structure=conditional-donation";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function required(formData: FormData, key: string) {
  const value = read(formData, key);
  if (!value) throw new Error(`${key.replaceAll("_", " ")} is required.`);
  return value;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete that request.";
}

function withMessage(path: string, key: "error" | "message", value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function fail(path: string, error: unknown): never {
  redirect(withMessage(path, "error", errorMessage(error)));
}

function parseAmount(formData: FormData, key: string) {
  const cents = parseDirectDonationUpgradeUsd(required(formData, key));
  if (cents === null) {
    throw new Error("Donation amounts must use no more than two decimal places.");
  }
  if (cents < DIRECT_DONATION_UPGRADE_MIN_CENTS || cents > DIRECT_DONATION_UPGRADE_MAX_CENTS) {
    throw new Error("Donation amounts must be between $1 and $50,000.");
  }
  return cents;
}

function parseDeadline(formData: FormData) {
  const date = new Date(required(formData, "match_deadline_at"));
  if (Number.isNaN(date.valueOf())) throw new Error("Choose a valid matching deadline.");
  const now = Date.now();
  if (date.valueOf() < now + 60 * 60 * 1000) {
    throw new Error("The matching deadline must be at least one hour from now.");
  }
  if (date.valueOf() > now + DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error("The matching deadline cannot be more than 30 days from now.");
  }
  return date.toISOString();
}

function parsePrivacyMode(formData: FormData): DirectDonationUpgradePrivacyMode {
  const value = read(formData, "privacy_mode");
  if (value === "public" || value === "private_until_completed") return value;
  throw new Error("Choose a valid identity-visibility setting.");
}

function requireUuid(formData: FormData, key: string) {
  const value = required(formData, key);
  if (!UUID_PATTERN.test(value)) throw new Error(`A valid ${key.replaceAll("_", " ")} is required.`);
  return value;
}

function safeOfferPath(value: string) {
  return UUID_PATTERN.test(value) ? `/donation-upgrades/${value}` : "/donation-upgrades";
}

function requireChecked(formData: FormData, key: string, message: string) {
  if (formData.get(key) !== "on") throw new Error(message);
}

function baselineAttestation(formData: FormData) {
  requireChecked(
    formData,
    "baseline_confirmed",
    "Confirm that the original donation was already planned before publishing.",
  );
  const details = read(formData, "baseline_details")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 1_200);
  if (details.length < 20) {
    throw new Error("Briefly explain why the original donation was already planned.");
  }
  return [
    "Before publishing this Donation Upgrade, I independently intended to make the stated creator donation to the original recipient even if nobody matched.",
    details,
  ].join(" ");
}

function serviceClient() {
  return createServiceClient() as any;
}

export async function createDirectDonationUpgradeOfferAction(formData: FormData) {
  let destination = CREATE_PATH;
  try {
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new Error(config.blockers[0] ?? "Direct Donation Upgrades are unavailable.");
    }
    const viewer = await requireViewer(CREATE_PATH);
    const creatorAmountCents = parseAmount(formData, "creator_amount");
    const matcherAmountCents = parseAmount(formData, "matcher_amount");
    const matchDeadlineAt = parseDeadline(formData);
    const privacyMode = parsePrivacyMode(formData);
    const attestation = baselineAttestation(formData);

    const [originalRecipient, upgradedRecipient] = await Promise.all([
      fetchEveryOrgNonprofitIdentity(required(formData, "original_recipient_identifier"), config),
      fetchEveryOrgNonprofitIdentity(required(formData, "upgraded_recipient_identifier"), config),
    ]);
    if (sameEveryOrgNonprofit(originalRecipient, upgradedRecipient)) {
      throw new Error("The original and upgraded recipients must be different nonprofits.");
    }

    const termsHash = buildDirectDonationUpgradeTermsHash({
      creatorProfileId: viewer.authUser.id,
      creatorAmountCents,
      matcherAmountCents,
      originalRecipient,
      upgradedRecipient,
      matchDeadlineAt,
      privacyMode,
      environment: config.environment,
      baselineAttestation: attestation,
    });
    const { data, error } = await serviceClient().rpc("create_direct_donation_upgrade_offer", {
      p_creator_profile_id: viewer.authUser.id,
      p_environment: config.environment,
      p_creator_amount_cents: creatorAmountCents,
      p_matcher_amount_cents: matcherAmountCents,
      p_match_deadline_at: matchDeadlineAt,
      p_privacy_mode: privacyMode,
      p_original_recipient: originalRecipient,
      p_upgraded_recipient: upgradedRecipient,
      p_baseline_version: DIRECT_DONATION_UPGRADE_BASELINE_VERSION,
      p_baseline_attestation: attestation,
      p_terms_hash: termsHash,
    });
    const offer = firstRow<DirectDonationUpgradeOfferRow>(data);
    if (error || !offer) throw new Error(error?.message ?? "The Donation Upgrade was not created.");

    destination = withMessage(
      `/donation-upgrades/${offer.id}`,
      "message",
      "Donation Upgrade published. No payment method was collected.",
    );
    revalidatePath("/donation-upgrades");
    revalidatePath(CREATE_PATH);
  } catch (error) {
    fail(CREATE_PATH, error);
  }
  redirect(destination);
}

export async function joinDirectDonationUpgradeOfferAction(formData: FormData) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  let destination = returnPath;
  try {
    const offerId = requireUuid(formData, "offer_id");
    requireChecked(
      formData,
      "matcher_commitment",
      "Accept the exact matcher commitment before joining.",
    );
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new Error(config.blockers[0] ?? "Direct Donation Upgrades are unavailable.");
    }
    const viewer = await requireViewer(returnPath);
    const { data, error } = await serviceClient().rpc("join_direct_donation_upgrade_offer", {
      p_actor_profile_id: viewer.authUser.id,
      p_offer_id: offerId,
      p_commitment_version: DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
    });
    const candidate = firstRow<DirectDonationUpgradeCandidateRow>(data);
    if (error || !candidate) throw new Error(error?.message ?? "The matcher commitment was not recorded.");
    const message = candidate.status === "backup"
      ? "You joined as a backup matcher. No payment method was collected."
      : "You are the primary matcher. Both direct donation obligations are now open.";
    destination = withMessage(returnPath, "message", message);
    revalidatePath(returnPath);
    revalidatePath("/donation-upgrades");
    revalidatePath(CREATE_PATH);
  } catch (error) {
    fail(returnPath, error);
  }
  redirect(destination);
}

export async function withdrawDirectDonationUpgradeBackupAction(formData: FormData) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    const viewer = await requireViewer(returnPath);
    const { error } = await serviceClient().rpc("withdraw_direct_donation_upgrade_backup", {
      p_actor_profile_id: viewer.authUser.id,
      p_offer_id: offerId,
    });
    if (error) throw new Error(error.message);
    revalidatePath(returnPath);
    revalidatePath("/donation-upgrades");
  } catch (error) {
    fail(returnPath, error);
  }
  redirect(withMessage(returnPath, "message", "Backup matcher commitment withdrawn."));
}

export async function cancelDirectDonationUpgradeOfferAction(formData: FormData) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    const viewer = await requireViewer(returnPath);
    const { error } = await serviceClient().rpc("cancel_direct_donation_upgrade_offer", {
      p_actor_profile_id: viewer.authUser.id,
      p_offer_id: offerId,
    });
    if (error) throw new Error(error.message);
    revalidatePath(returnPath);
    revalidatePath("/donation-upgrades");
    revalidatePath(CREATE_PATH);
  } catch (error) {
    fail(returnPath, error);
  }
  redirect(withMessage(returnPath, "message", "The unmatched Donation Upgrade was cancelled."));
}

export async function startDirectDonationUpgradeCheckoutAction(formData: FormData) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  let destination = returnPath;
  try {
    const obligationId = requireUuid(formData, "obligation_id");
    const offerId = requireUuid(formData, "offer_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCheckout || !config.environment) {
      throw new Error(config.blockers[0] ?? "Direct donation checkout is unavailable.");
    }
    const viewer = await requireViewer(returnPath);
    const { data, error } = await serviceClient().rpc("start_direct_donation_upgrade_checkout", {
      p_actor_profile_id: viewer.authUser.id,
      p_obligation_id: obligationId,
    });
    const obligation = firstRow<DirectDonationUpgradeObligationRow>(data);
    if (error || !obligation) throw new Error(error?.message ?? "The donation obligation could not be opened.");
    if (obligation.offer_id !== offerId) throw new Error("The donation obligation does not belong to this offer.");
    destination = obligation.status === "verified"
      ? withMessage(returnPath, "message", "This exact donation is already verified.")
      : buildDirectDonationUpgradeCheckoutUrl({ obligation, config });
    revalidatePath(returnPath);
  } catch (error) {
    fail(returnPath, error);
  }
  redirect(destination);
}
