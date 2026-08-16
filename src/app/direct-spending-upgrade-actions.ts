"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import {
  buildDirectDonationUpgradeCheckoutUrl,
  DIRECT_DONATION_UPGRADE_MAX_CENTS,
  DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS,
  DIRECT_DONATION_UPGRADE_MIN_CENTS,
  fetchEveryOrgNonprofitIdentity,
  parseDirectDonationUpgradeUsd,
  type DirectDonationUpgradePrivacyMode,
} from "@/lib/direct-donation-upgrade";
import {
  buildDirectSpendingUpgradeBaselineHashes,
  buildDirectSpendingUpgradeEvidenceHash,
  buildDirectSpendingUpgradeTermsHash,
  calculateDirectSpendingUpgradeSplit,
  DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION,
  DIRECT_SPENDING_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
  getDirectSpendingUpgradeConfig,
  isDirectSpendingUpgradeAction,
  rejectBlockedDirectSpendingUpgradeCategory,
  validateDirectSpendingUpgradeBaseline,
  type DirectSpendingUpgradeBaselineRow,
  type DirectSpendingUpgradeObligationRow,
  type DirectSpendingUpgradePrivateOfferRow,
  type DirectSpendingUpgradeProposalRow,
} from "@/lib/direct-spending-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

const CREATE_PATH =
  "/trades/new?structure=conditional-donation&rail=direct&baseline=nonessential-spending";
const DIRECTORY_PATH = "/donation-upgrades";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class PublicSpendingUpgradeError extends Error {}

function serviceClient() {
  return createServiceClient() as any;
}

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function required(formData: FormData, key: string) {
  const value = read(formData, key);
  if (!value) {
    throw new PublicSpendingUpgradeError(
      `${key.replaceAll("_", " ")} is required.`,
    );
  }
  return value;
}

function cleanPrivateText(value: string, maximum: number) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function requireChecked(formData: FormData, key: string, message: string) {
  if (formData.get(key) !== "on") {
    throw new PublicSpendingUpgradeError(message);
  }
}

function requireUuid(formData: FormData, key: string) {
  const value = required(formData, key);
  if (!UUID_PATTERN.test(value)) {
    throw new PublicSpendingUpgradeError(
      `A valid ${key.replaceAll("_", " ")} is required.`,
    );
  }
  return value;
}

function parseAmount(formData: FormData, key: string) {
  const cents = parseDirectDonationUpgradeUsd(required(formData, key));
  if (
    cents === null ||
    cents < DIRECT_DONATION_UPGRADE_MIN_CENTS ||
    cents > DIRECT_DONATION_UPGRADE_MAX_CENTS
  ) {
    throw new PublicSpendingUpgradeError(
      "Amounts must be between $1.00 and $50,000.00 with no more than two decimal places.",
    );
  }
  return cents;
}

function parseDeadline(formData: FormData) {
  const value = new Date(required(formData, "match_deadline_at"));
  if (Number.isNaN(value.valueOf())) {
    throw new PublicSpendingUpgradeError("Choose a valid matching deadline.");
  }
  const now = Date.now();
  if (value.valueOf() < now + 60 * 60 * 1000) {
    throw new PublicSpendingUpgradeError(
      "The matching deadline must be at least one hour from now.",
    );
  }
  if (
    value.valueOf() >
    now + DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS * 24 * 60 * 60 * 1000
  ) {
    throw new PublicSpendingUpgradeError(
      "The matching deadline cannot be more than 30 days from now.",
    );
  }
  return value.toISOString();
}

function parsePrivacyMode(formData: FormData): DirectDonationUpgradePrivacyMode {
  const value = read(formData, "privacy_mode");
  if (value === "public" || value === "private_until_completed") return value;
  throw new PublicSpendingUpgradeError(
    "Choose a valid identity-visibility setting.",
  );
}

function safeOfferPath(value: string) {
  return UUID_PATTERN.test(value)
    ? `/donation-upgrades/spending/${value}`
    : DIRECTORY_PATH;
}

function withMessage(
  path: string,
  key: "error" | "message",
  value: string,
) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function publicMessage(error: unknown) {
  return error instanceof PublicSpendingUpgradeError
    ? error.message
    : "Unable to complete that Spending Upgrade request.";
}

function rethrowFrameworkNavigation(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    String(error.digest).startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

function fail(path: string, error: unknown): never {
  redirect(withMessage(path, "error", publicMessage(error)));
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function revalidateSpendingUpgrade(...offerIds: string[]) {
  revalidatePath(CREATE_PATH);
  revalidatePath(DIRECTORY_PATH);
  revalidatePath("/admin/donation-upgrades");
  for (const offerId of offerIds) {
    if (UUID_PATTERN.test(offerId)) {
      revalidatePath(`/donation-upgrades/spending/${offerId}`);
    }
  }
}

async function loadOffer(offerId: string, environment: "staging" | "live") {
  const { data, error } = await serviceClient()
    .from("direct_spending_upgrade_offers")
    .select("*")
    .eq("id", offerId)
    .eq("environment", environment)
    .maybeSingle();
  if (error || !data) {
    throw new PublicSpendingUpgradeError("Spending Upgrade not found.");
  }
  return data as DirectSpendingUpgradePrivateOfferRow;
}

async function loadBaseline(baselineId: string) {
  const { data, error } = await serviceClient()
    .from("direct_spending_upgrade_baselines")
    .select("*")
    .eq("id", baselineId)
    .maybeSingle();
  if (error || !data) {
    throw new PublicSpendingUpgradeError(
      "The private Spending Upgrade baseline is unavailable.",
    );
  }
  return data as DirectSpendingUpgradeBaselineRow;
}

export async function createDirectSpendingUpgradeOfferAction(
  formData: FormData,
) {
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCommitments || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(CREATE_PATH);
    const category = rejectBlockedDirectSpendingUpgradeCategory(
      required(formData, "category"),
    );
    const plannedActionValue = required(formData, "planned_action");
    if (!isDirectSpendingUpgradeAction(plannedActionValue)) {
      throw new PublicSpendingUpgradeError(
        "Choose a valid cancellation, reduction, or downgrade action.",
      );
    }
    const plannedSpendAmountCents = parseAmount(
      formData,
      "planned_spend_amount",
    );
    const creatorDiversionAmountCents = parseAmount(
      formData,
      "creator_diversion_amount",
    );
    const matcherAmountCents = parseAmount(formData, "matcher_amount");
    try {
      calculateDirectSpendingUpgradeSplit(
        plannedSpendAmountCents,
        creatorDiversionAmountCents,
      );
    } catch (error) {
      throw new PublicSpendingUpgradeError(
        error instanceof Error
          ? error.message
          : "The spending diversion amounts are invalid.",
      );
    }
    requireChecked(
      formData,
      "excluded_categories_confirmed",
      "Confirm that this is not an essential, safety, care, debt, food, health, housing, transport, education, work, or legal expense.",
    );
    const safetyAttestations = {
      nonessential: formData.get("nonessential_attested") === "on",
      noMaterialHarm: formData.get("no_material_harm_attested") === "on",
      planExistedBeforeOffer:
        formData.get("preexisting_plan_attested") === "on",
      notAlreadyCancelledOrAbandoned:
        formData.get("not_already_cancelled_attested") === "on",
      currentlyAvailableFunds:
        formData.get("available_funds_attested") === "on",
      notOtherwiseCommittedToDonate:
        formData.get("not_otherwise_donating_attested") === "on",
    };
    const privateMerchantLabel = cleanPrivateText(
      required(formData, "private_merchant_label"),
      180,
    );
    const privateDescription = cleanPrivateText(
      required(formData, "private_description"),
      1_200,
    );
    const privateReference = cleanPrivateText(
      read(formData, "private_reference"),
      500,
    );
    const evidenceCapturedAt = new Date().toISOString();
    const evidencePayload = {
      recordKind: "prospective_nonessential_expense",
      merchantLabel: privateMerchantLabel,
      description: privateDescription,
      privateReference,
      category,
      plannedAction: plannedActionValue,
      plannedSpendAmountCents,
    };
    const baseline = validateDirectSpendingUpgradeBaseline({
      creatorProfileId: viewer.authUser.id,
      category,
      privateMerchantLabel,
      privateDescription,
      plannedSpendAmountCents,
      creatorDiversionAmountCents,
      plannedAction: plannedActionValue,
      evidencePayload,
      evidenceCapturedAt,
      safetyAttestations,
    });
    const hashes = buildDirectSpendingUpgradeBaselineHashes({
      baseline,
      fingerprintSecret: config.fingerprintSecret,
    });
    const matchDeadlineAt = parseDeadline(formData);
    const privacyMode = parsePrivacyMode(formData);
    const upgradedRecipient = await fetchEveryOrgNonprofitIdentity(
      required(formData, "upgraded_recipient_identifier"),
      config.donationUpgrade,
    );
    const termsHash = buildDirectSpendingUpgradeTermsHash({
      creatorProfileId: viewer.authUser.id,
      category,
      plannedAction: plannedActionValue,
      plannedSpendAmountCents,
      creatorDiversionAmountCents,
      matcherAmountCents,
      upgradedRecipient,
      matchDeadlineAt,
      privacyMode,
      environment: config.donationUpgrade.environment,
      evidenceHash: hashes.evidenceHash,
      evidenceCapturedAt: baseline.evidenceCapturedAt,
      baselineFingerprint: hashes.baselineFingerprint,
    });
    const { data, error } = await serviceClient().rpc(
      "create_direct_spending_upgrade_offer",
      {
        p_creator_profile_id: viewer.authUser.id,
        p_environment: config.donationUpgrade.environment,
        p_category: category,
        p_private_merchant_label: baseline.privateMerchantLabel,
        p_private_description: baseline.privateDescription,
        p_planned_spend_amount_cents: plannedSpendAmountCents,
        p_creator_diversion_amount_cents: creatorDiversionAmountCents,
        p_planned_action: plannedActionValue,
        p_evidence_payload: evidencePayload,
        p_evidence_hash: hashes.evidenceHash,
        p_evidence_captured_at: baseline.evidenceCapturedAt,
        p_baseline_fingerprint: hashes.baselineFingerprint,
        p_matcher_amount_cents: matcherAmountCents,
        p_match_deadline_at: matchDeadlineAt,
        p_privacy_mode: privacyMode,
        p_upgraded_recipient: upgradedRecipient,
        p_upgraded_recipient_hash: upgradedRecipient.identityHash,
        p_terms_hash: termsHash,
        p_nonessential_attested: safetyAttestations.nonessential,
        p_no_material_harm_attested: safetyAttestations.noMaterialHarm,
        p_preexisting_plan_attested:
          safetyAttestations.planExistedBeforeOffer,
        p_not_already_cancelled_attested:
          safetyAttestations.notAlreadyCancelledOrAbandoned,
        p_available_funds_attested:
          safetyAttestations.currentlyAvailableFunds,
        p_not_otherwise_donating_attested:
          safetyAttestations.notOtherwiseCommittedToDonate,
      },
    );
    if (error) throw error;
    const result = firstRow<Record<string, any>>(data);
    const offerId = String(result?.offer?.id ?? "");
    if (!UUID_PATTERN.test(offerId)) {
      throw new PublicSpendingUpgradeError(
        "The Spending Upgrade was not created.",
      );
    }
    revalidateSpendingUpgrade(offerId);
    redirect(
      withMessage(
        safeOfferPath(offerId),
        "message",
        "Private baseline frozen. This offer remains review required and creates no donation obligation unless the scoped baseline review is accepted and someone matches.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(CREATE_PATH, error);
  }
}

export async function joinDirectSpendingUpgradeOfferAction(
  formData: FormData,
) {
  const offerId = read(formData, "offer_id");
  const path = safeOfferPath(offerId);
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCommitments || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(path);
    requireChecked(
      formData,
      "matcher_commitment",
      "Confirm the exact direct matcher donation commitment.",
    );
    const { error } = await serviceClient().rpc(
      "join_direct_spending_upgrade_offer",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: requireUuid(formData, "offer_id"),
        p_commitment_version:
          DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION,
        p_expected_environment: config.donationUpgrade.environment,
      },
    );
    if (error) throw error;
    revalidateSpendingUpgrade(offerId);
    redirect(
      withMessage(
        path,
        "message",
        "Matched. Exactly two separate direct Every.org donation obligations now exist; no purchase obligation or transfer through Moral Trade was created.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(path, error);
  }
}

export async function proposeDirectSpendingUpgradeTermsAction(
  formData: FormData,
) {
  const offerId = read(formData, "offer_id");
  const path = safeOfferPath(offerId);
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCommitments || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(path);
    requireChecked(
      formData,
      "proposal_commitment",
      "Confirm the exact counteroffer donation commitment.",
    );
    const { error } = await serviceClient().rpc(
      "propose_direct_spending_upgrade_terms",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: requireUuid(formData, "offer_id"),
        p_creator_diversion_amount_cents: parseAmount(
          formData,
          "creator_diversion_amount",
        ),
        p_matcher_amount_cents: parseAmount(formData, "matcher_amount"),
        p_message: cleanPrivateText(read(formData, "message"), 600),
        p_commitment_version:
          DIRECT_SPENDING_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
        p_expected_environment: config.donationUpgrade.environment,
      },
    );
    if (error) throw error;
    revalidateSpendingUpgrade(offerId);
    redirect(
      withMessage(
        path,
        "message",
        "Counteroffer recorded without creating a checkout or donation obligation.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(path, error);
  }
}

export async function acceptDirectSpendingUpgradeProposalAction(
  formData: FormData,
) {
  const currentOfferId = read(formData, "offer_id");
  const path = safeOfferPath(currentOfferId);
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCommitments || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(path);
    requireChecked(
      formData,
      "accept_proposal_commitment",
      "Confirm that accepting creates the two exact direct donation obligations.",
    );
    const proposalId = requireUuid(formData, "proposal_id");
    const { data: proposalData, error: proposalError } = await serviceClient()
      .from("direct_spending_upgrade_proposals")
      .select("*")
      .eq("id", proposalId)
      .maybeSingle();
    if (proposalError || !proposalData) {
      throw new PublicSpendingUpgradeError("Counteroffer not found.");
    }
    const proposal = proposalData as DirectSpendingUpgradeProposalRow;
    const offer = await loadOffer(
      proposal.offer_id,
      config.donationUpgrade.environment,
    );
    if (offer.creator_profile_id !== viewer.authUser.id) {
      throw new PublicSpendingUpgradeError(
        "Only the creator may accept this counteroffer.",
      );
    }
    const baseline = await loadBaseline(offer.baseline_id);
    const newTermsHash = buildDirectSpendingUpgradeTermsHash({
      creatorProfileId: offer.creator_profile_id,
      category: baseline.category,
      plannedAction: baseline.planned_action,
      plannedSpendAmountCents: baseline.planned_spend_amount_cents,
      creatorDiversionAmountCents:
        proposal.proposed_creator_diversion_amount_cents,
      matcherAmountCents: proposal.proposed_matcher_amount_cents,
      upgradedRecipient: offer.upgraded_recipient,
      matchDeadlineAt: offer.match_deadline_at,
      privacyMode: offer.privacy_mode,
      environment: offer.environment,
      evidenceHash: baseline.evidence_hash,
      evidenceCapturedAt: baseline.evidence_captured_at,
      baselineFingerprint: baseline.baseline_fingerprint,
    });
    const { data, error } = await serviceClient().rpc(
      "accept_direct_spending_upgrade_proposal",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_proposal_id: proposalId,
        p_new_terms_hash: newTermsHash,
        p_expected_environment: config.donationUpgrade.environment,
      },
    );
    if (error) throw error;
    const result = firstRow<Record<string, any>>(data);
    const successorId = String(result?.offer?.id ?? "");
    if (!UUID_PATTERN.test(successorId)) {
      throw new PublicSpendingUpgradeError(
        "The accepted Spending Upgrade revision was not created.",
      );
    }
    revalidateSpendingUpgrade(currentOfferId, successorId);
    redirect(
      withMessage(
        safeOfferPath(successorId),
        "message",
        "Counteroffer accepted as a new immutable matched revision with exactly two direct donation obligations.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(path, error);
  }
}

export async function submitDirectSpendingUpgradeEvidenceAction(
  formData: FormData,
) {
  const offerId = read(formData, "offer_id");
  const path = safeOfferPath(offerId);
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCommitments || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(path);
    requireChecked(
      formData,
      "privacy_acknowledged",
      "Confirm that the evidence is private and excludes unnecessary sensitive data.",
    );
    const changeKind = required(formData, "change_kind");
    if (![
      "subscription_cancelled",
      "reservation_or_service_cancelled",
      "order_cancelled_or_reduced",
      "upgrade_downgraded",
    ].includes(changeKind)) {
      throw new PublicSpendingUpgradeError(
        "Choose a valid cancellation or reduction evidence type.",
      );
    }
    const privateDescription = cleanPrivateText(
      required(formData, "private_change_description"),
      1_200,
    );
    if (privateDescription.length < 20) {
      throw new PublicSpendingUpgradeError(
        "Describe the cancellation or reduction in at least 20 characters.",
      );
    }
    const privateReference = cleanPrivateText(
      read(formData, "private_change_reference"),
      500,
    );
    const capturedAt = new Date().toISOString();
    const evidencePayload = {
      changeKind,
      privateDescription,
      privateReference,
      dataMinimizationAttested: true,
    };
    const evidenceHash = buildDirectSpendingUpgradeEvidenceHash({
      offerId: requireUuid(formData, "offer_id"),
      evidencePayload,
      capturedAt,
    });
    const idempotencyKey = `web:${viewer.authUser.id}:${evidenceHash}`;
    const { error } = await serviceClient().rpc(
      "submit_direct_spending_upgrade_change_evidence",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: offerId,
        p_private_payload: evidencePayload,
        p_evidence_hash: evidenceHash,
        p_captured_at: capturedAt,
        p_idempotency_key: idempotencyKey,
        p_expected_environment: config.donationUpgrade.environment,
      },
    );
    if (error) throw error;
    revalidateSpendingUpgrade(offerId);
    redirect(
      withMessage(
        path,
        "message",
        "Private cancellation or reduction evidence submitted. It remains review required; donation verification alone does not create converted-spending credit.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(path, error);
  }
}

export async function startDirectSpendingUpgradeCheckoutAction(
  formData: FormData,
) {
  const offerId = read(formData, "offer_id");
  const path = safeOfferPath(offerId);
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCheckout || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrade checkout is unavailable.",
      );
    }
    const viewer = await requireViewer(path);
    const obligationId = requireUuid(formData, "obligation_id");
    const { data, error } = await serviceClient().rpc(
      "start_direct_spending_upgrade_checkout",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_obligation_id: obligationId,
        p_expected_environment: config.donationUpgrade.environment,
      },
    );
    if (error) throw error;
    const obligation = firstRow<DirectSpendingUpgradeObligationRow>(data);
    if (!obligation || obligation.offer_id !== offerId) {
      throw new PublicSpendingUpgradeError(
        "The Spending Upgrade donation obligation is unavailable.",
      );
    }
    const checkoutUrl = buildDirectDonationUpgradeCheckoutUrl({
      obligation,
      config: config.donationUpgrade,
      returnPath: path,
      description:
        "Complete this separate direct Spending Upgrade donation. Moral Trade records the donation only after the exact Every.org partner webhook; spending conversion remains a separate private review.",
    });
    revalidateSpendingUpgrade(offerId);
    redirect(checkoutUrl);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(path, error);
  }
}

export async function cancelDirectSpendingUpgradeOfferAction(
  formData: FormData,
) {
  const offerId = read(formData, "offer_id");
  const path = safeOfferPath(offerId);
  try {
    const config = getDirectSpendingUpgradeConfig();
    if (!config.readyForCommitments || !config.donationUpgrade.environment) {
      throw new PublicSpendingUpgradeError(
        config.blockers[0] ?? "Spending Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(path);
    const { error } = await serviceClient().rpc(
      "cancel_direct_spending_upgrade_offer",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: requireUuid(formData, "offer_id"),
        p_expected_environment: config.donationUpgrade.environment,
      },
    );
    if (error) throw error;
    revalidateSpendingUpgrade(offerId);
    redirect(
      withMessage(
        CREATE_PATH,
        "message",
        "Unmatched Spending Upgrade cancelled. No donation, purchase, checkout, transfer, or impact credit was created.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(path, error);
  }
}
