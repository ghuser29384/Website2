"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import {
  buildDirectDonationUpgradeCheckoutUrl,
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
  type DirectDonationUpgradePrivacyMode,
} from "@/lib/direct-donation-upgrade";
import {
  buildDirectDonationUpgradeTermsHashV2,
  DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
  type DirectDonationUpgradeProposalRow,
  type PartialDirectDonationUpgradeOfferRow,
} from "@/lib/direct-donation-upgrade-negotiation";
import {
  calculateDirectDonationUpgradeSplit,
  parseDirectDonationUpgradeRedirectPercentage,
} from "@/lib/direct-donation-upgrade-split";
import { createServiceClient } from "@/lib/supabase/server";

const CREATE_PATH = "/trades/new?structure=conditional-donation&rail=direct";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class PublicDonationUpgradeError extends Error {}

const PUBLIC_SPLIT_ERRORS: ReadonlySet<string> = new Set([
  "The planned donation must be between $1.00 and $50,000.00.",
  "The redirect percentage must be greater than 0% and no more than 100%.",
  "The planned donation and redirect percentage exceed the exact arithmetic range.",
  "The redirected portion must be at least $1.00.",
  "Only an exact 100% redirect may create no retained obligation.",
  "The portion remaining with the original recipient must be either $0.00 or at least $1.00.",
]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function required(formData: FormData, key: string) {
  const value = read(formData, key);
  if (!value) {
    throw new PublicDonationUpgradeError(
      `${key.replaceAll("_", " ")} is required.`,
    );
  }
  return value;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function errorMessage(error: unknown) {
  return error instanceof PublicDonationUpgradeError
    ? error.message
    : "Unable to complete that request.";
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

function withMessage(
  path: string,
  key: "error" | "message",
  value: string,
) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function fail(path: string, error: unknown): never {
  redirect(withMessage(path, "error", errorMessage(error)));
}

function parseAmount(formData: FormData, key: string) {
  const cents = parseDirectDonationUpgradeUsd(required(formData, key));
  if (cents === null) {
    throw new PublicDonationUpgradeError(
      "Donation amounts must use no more than two decimal places.",
    );
  }
  if (
    cents < DIRECT_DONATION_UPGRADE_MIN_CENTS ||
    cents > DIRECT_DONATION_UPGRADE_MAX_CENTS
  ) {
    throw new PublicDonationUpgradeError(
      "Donation amounts must be between $1 and $50,000.",
    );
  }
  return cents;
}

function parseRedirectBasisPoints(formData: FormData, key: string) {
  const basisPoints = parseDirectDonationUpgradeRedirectPercentage(
    required(formData, key),
  );
  if (basisPoints === null) {
    throw new PublicDonationUpgradeError(
      "Redirect percentages must be greater than 0%, no more than 100%, and use at most two decimal places.",
    );
  }
  return basisPoints;
}

function requireValidSplit(
  creatorAmountCents: number,
  redirectBasisPoints: number,
) {
  try {
    return calculateDirectDonationUpgradeSplit(
      creatorAmountCents,
      redirectBasisPoints,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new PublicDonationUpgradeError(
      PUBLIC_SPLIT_ERRORS.has(message)
        ? message
        : "Choose a redirect percentage that creates valid donation legs.",
    );
  }
}

function parseDeadline(formData: FormData) {
  const date = new Date(required(formData, "match_deadline_at"));
  if (Number.isNaN(date.valueOf())) {
    throw new PublicDonationUpgradeError("Choose a valid matching deadline.");
  }
  const now = Date.now();
  if (date.valueOf() < now + 60 * 60 * 1000) {
    throw new PublicDonationUpgradeError(
      "The matching deadline must be at least one hour from now.",
    );
  }
  if (
    date.valueOf() >
    now +
      DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS * 24 * 60 * 60 * 1000
  ) {
    throw new PublicDonationUpgradeError(
      "The matching deadline cannot be more than 30 days from now.",
    );
  }
  return date.toISOString();
}

function parsePrivacyMode(
  formData: FormData,
): DirectDonationUpgradePrivacyMode {
  const value = read(formData, "privacy_mode");
  if (value === "public" || value === "private_until_completed") {
    return value;
  }
  throw new PublicDonationUpgradeError(
    "Choose a valid identity-visibility setting.",
  );
}

function requireUuid(formData: FormData, key: string) {
  const value = required(formData, key);
  if (!UUID_PATTERN.test(value)) {
    throw new PublicDonationUpgradeError(
      `A valid ${key.replaceAll("_", " ")} is required.`,
    );
  }
  return value;
}

function safeOfferPath(value: string) {
  return UUID_PATTERN.test(value)
    ? `/donation-upgrades/${value}`
    : "/donation-upgrades";
}

function requireChecked(formData: FormData, key: string, message: string) {
  if (formData.get(key) !== "on") {
    throw new PublicDonationUpgradeError(message);
  }
}

function cleanMessage(value: string, maximum = 600) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function baselineAttestation(formData: FormData) {
  requireChecked(
    formData,
    "baseline_confirmed",
    "Confirm that the original donation was already planned before publishing.",
  );
  const details = cleanMessage(read(formData, "baseline_details"), 1_200);
  if (details.length < 20) {
    throw new PublicDonationUpgradeError(
      "Briefly explain why the original donation was already planned.",
    );
  }
  return [
    "Before publishing this Donation Upgrade, I independently intended to make the stated creator donation to the original recipient even if nobody matched.",
    details,
  ].join(" ");
}

function serviceClient() {
  return createServiceClient() as any;
}

function revalidateOfferPaths(...offerIds: Array<string | null | undefined>) {
  revalidatePath("/donation-upgrades");
  revalidatePath(CREATE_PATH);
  for (const offerId of offerIds) {
    if (offerId && UUID_PATTERN.test(offerId)) {
      revalidatePath(`/donation-upgrades/${offerId}`);
    }
  }
}

async function loadOfferForAction(input: {
  offerId: string;
  environment: "staging" | "live";
}) {
  const { data, error } = await serviceClient()
    .from("direct_donation_upgrade_offers")
    .select("*")
    .eq("id", input.offerId)
    .eq("environment", input.environment)
    .maybeSingle();
  if (error || !data) {
    throw new PublicDonationUpgradeError("Donation Upgrade not found.");
  }
  return data as PartialDirectDonationUpgradeOfferRow;
}

export async function createDirectDonationUpgradeOfferAction(
  formData: FormData,
) {
  let destination = CREATE_PATH;
  try {
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(CREATE_PATH);
    const creatorAmountCents = parseAmount(formData, "creator_amount");
    const matcherAmountCents = parseAmount(formData, "matcher_amount");
    const redirectBasisPoints = parseRedirectBasisPoints(
      formData,
      "redirect_percentage",
    );
    requireValidSplit(
      creatorAmountCents,
      redirectBasisPoints,
    );
    const matchDeadlineAt = parseDeadline(formData);
    const privacyMode = parsePrivacyMode(formData);
    const attestation = baselineAttestation(formData);

    const [originalRecipient, upgradedRecipient] = await Promise.all([
      fetchEveryOrgNonprofitIdentity(
        required(formData, "original_recipient_identifier"),
        config,
      ),
      fetchEveryOrgNonprofitIdentity(
        required(formData, "upgraded_recipient_identifier"),
        config,
      ),
    ]);
    if (sameEveryOrgNonprofit(originalRecipient, upgradedRecipient)) {
      throw new PublicDonationUpgradeError(
        "The original and upgraded recipients must be different nonprofits.",
      );
    }

    const termsHash = buildDirectDonationUpgradeTermsHashV2({
      creatorProfileId: viewer.authUser.id,
      creatorAmountCents,
      redirectBasisPoints,
      matcherAmountCents,
      originalRecipient,
      upgradedRecipient,
      matchDeadlineAt,
      privacyMode,
      environment: config.environment,
      baselineAttestation: attestation,
    });
    const { data, error } = await serviceClient().rpc(
      "create_direct_donation_upgrade_offer",
      {
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
        p_redirect_basis_points: redirectBasisPoints,
      },
    );
    const offer = firstRow<PartialDirectDonationUpgradeOfferRow>(data);
    if (error || !offer) {
      throw new PublicDonationUpgradeError(
        "The Donation Upgrade was not created. Check the frozen terms and try again.",
      );
    }

    destination = withMessage(
      `/donation-upgrades/${offer.id}`,
      "message",
      "Donation Upgrade published with a frozen partial-redirection split. No payment method was collected.",
    );
    revalidateOfferPaths(offer.id);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(CREATE_PATH, error);
  }
  redirect(destination);
}

export async function joinDirectDonationUpgradeOfferAction(
  formData: FormData,
) {
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
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const { data, error } = await serviceClient().rpc(
      "join_direct_donation_upgrade_offer",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: offerId,
        p_commitment_version:
          DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
        p_expected_environment: config.environment,
      },
    );
    const candidate = firstRow<DirectDonationUpgradeCandidateRow>(data);
    if (error || !candidate) {
      throw new PublicDonationUpgradeError(
        "The matcher commitment was not recorded. The offer may no longer accept matchers.",
      );
    }
    const message =
      candidate.status === "backup"
        ? "You joined as a backup matcher. No payment method was collected."
        : "You are the primary matcher. The exact split and matcher donation obligations are now open.";
    destination = withMessage(returnPath, "message", message);
    revalidateOfferPaths(offerId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(destination);
}

export async function proposeDirectDonationUpgradeTermsAction(
  formData: FormData,
) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    requireChecked(
      formData,
      "proposal_commitment",
      "Confirm that the counteroffer becomes a binding matcher commitment if the creator accepts it.",
    );
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const offer = await loadOfferForAction({
      offerId,
      environment: config.environment,
    });
    if (offer.creator_profile_id === viewer.authUser.id) {
      throw new PublicDonationUpgradeError(
        "The creator cannot counteroffer to their own Donation Upgrade.",
      );
    }
    const redirectBasisPoints = parseRedirectBasisPoints(
      formData,
      "proposed_redirect_percentage",
    );
    const matcherAmountCents = parseAmount(
      formData,
      "proposed_matcher_amount",
    );
    const split = requireValidSplit(
      offer.creator_amount_cents,
      redirectBasisPoints,
    );
    const message = cleanMessage(read(formData, "proposal_message"));

    const { data, error } = await serviceClient().rpc(
      "propose_direct_donation_upgrade_terms",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: offerId,
        p_proposed_redirect_basis_points: redirectBasisPoints,
        p_proposed_redirected_amount_cents: split.redirectedAmountCents,
        p_proposed_retained_amount_cents: split.retainedAmountCents,
        p_proposed_matcher_amount_cents: matcherAmountCents,
        p_message: message,
        p_commitment_version:
          DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
        p_expected_environment: config.environment,
      },
    );
    const proposal = firstRow<DirectDonationUpgradeProposalRow>(data);
    if (error || !proposal) {
      throw new PublicDonationUpgradeError(
        "The counteroffer was not recorded. The offer may no longer be open or another proposal may still be pending.",
      );
    }
    revalidateOfferPaths(offerId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(
    withMessage(
      returnPath,
      "message",
      "Counteroffer sent. If the creator accepts, the proposed matcher donation becomes binding and a new immutable matched revision is created.",
    ),
  );
}

export async function withdrawDirectDonationUpgradeProposalAction(
  formData: FormData,
) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    const proposalId = requireUuid(formData, "proposal_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const { error } = await serviceClient().rpc(
      "withdraw_direct_donation_upgrade_proposal",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_proposal_id: proposalId,
        p_expected_environment: config.environment,
      },
    );
    if (error) {
      throw new PublicDonationUpgradeError(
        "The counteroffer could not be withdrawn. It may already be resolved.",
      );
    }
    revalidateOfferPaths(offerId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(withMessage(returnPath, "message", "Counteroffer withdrawn."));
}

export async function rejectDirectDonationUpgradeProposalAction(
  formData: FormData,
) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    const proposalId = requireUuid(formData, "proposal_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const responseMessage = cleanMessage(read(formData, "response_message"));
    const { error } = await serviceClient().rpc(
      "reject_direct_donation_upgrade_proposal",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_proposal_id: proposalId,
        p_response_message: responseMessage,
        p_expected_environment: config.environment,
      },
    );
    if (error) {
      throw new PublicDonationUpgradeError(
        "The counteroffer could not be rejected. It may already be resolved.",
      );
    }
    revalidateOfferPaths(offerId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(
    withMessage(
      returnPath,
      "message",
      "Counteroffer rejected. The proposer can submit revised terms while the offer remains open.",
    ),
  );
}

export async function acceptDirectDonationUpgradeProposalAction(
  formData: FormData,
) {
  const oldOfferPath = safeOfferPath(read(formData, "offer_id"));
  let destination = oldOfferPath;
  try {
    const oldOfferId = requireUuid(formData, "offer_id");
    const proposalId = requireUuid(formData, "proposal_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(oldOfferPath);
    const proposalResult = await serviceClient()
      .from("direct_donation_upgrade_proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("offer_id", oldOfferId)
      .maybeSingle();
    if (proposalResult.error || !proposalResult.data) {
      throw new PublicDonationUpgradeError("Counteroffer not found.");
    }
    const proposal = proposalResult.data as DirectDonationUpgradeProposalRow;
    const offer = await loadOfferForAction({
      offerId: oldOfferId,
      environment: config.environment,
    });
    if (offer.creator_profile_id !== viewer.authUser.id) {
      throw new PublicDonationUpgradeError(
        "Only the creator can accept this counteroffer.",
      );
    }
    const termsHash = buildDirectDonationUpgradeTermsHashV2({
      creatorProfileId: offer.creator_profile_id,
      creatorAmountCents: offer.creator_amount_cents,
      redirectBasisPoints: proposal.proposed_redirect_basis_points,
      matcherAmountCents: proposal.proposed_matcher_amount_cents,
      originalRecipient: offer.original_recipient,
      upgradedRecipient: offer.upgraded_recipient,
      matchDeadlineAt: offer.match_deadline_at,
      privacyMode: offer.privacy_mode,
      environment: offer.environment,
      baselineAttestation: offer.baseline_attestation,
    });

    const { data, error } = await serviceClient().rpc(
      "accept_direct_donation_upgrade_proposal",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_proposal_id: proposalId,
        p_new_terms_hash: termsHash,
        p_expected_environment: config.environment,
      },
    );
    const accepted = firstRow<{
      offer?: PartialDirectDonationUpgradeOfferRow;
      proposal?: DirectDonationUpgradeProposalRow;
    }>(data);
    const newOfferId = accepted?.offer?.id;
    if (error || !newOfferId) {
      throw new PublicDonationUpgradeError(
        "The counteroffer could not be accepted. Its terms, eligibility, or base offer may have changed.",
      );
    }
    destination = withMessage(
      `/donation-upgrades/${newOfferId}`,
      "message",
      "Counteroffer accepted. A new immutable matched revision and exact direct donation obligations were created.",
    );
    revalidateOfferPaths(oldOfferId, newOfferId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(oldOfferPath, error);
  }
  redirect(destination);
}

export async function withdrawDirectDonationUpgradeBackupAction(
  formData: FormData,
) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const { error } = await serviceClient().rpc(
      "withdraw_direct_donation_upgrade_backup",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: offerId,
        p_expected_environment: config.environment,
      },
    );
    if (error) {
      throw new PublicDonationUpgradeError(
        "The backup commitment could not be withdrawn.",
      );
    }
    revalidateOfferPaths(offerId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(
    withMessage(returnPath, "message", "Backup matcher commitment withdrawn."),
  );
}

export async function cancelDirectDonationUpgradeOfferAction(
  formData: FormData,
) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  try {
    const offerId = requireUuid(formData, "offer_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCommitments || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct Donation Upgrades are unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const { error } = await serviceClient().rpc(
      "cancel_direct_donation_upgrade_offer",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_offer_id: offerId,
        p_expected_environment: config.environment,
      },
    );
    if (error) {
      throw new PublicDonationUpgradeError(
        "The Donation Upgrade could not be cancelled. It may no longer be open.",
      );
    }
    revalidateOfferPaths(offerId);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(
    withMessage(
      returnPath,
      "message",
      "The unmatched Donation Upgrade and its pending counteroffers were cancelled.",
    ),
  );
}

export async function startDirectDonationUpgradeCheckoutAction(
  formData: FormData,
) {
  const returnPath = safeOfferPath(read(formData, "offer_id"));
  let destination = returnPath;
  try {
    const obligationId = requireUuid(formData, "obligation_id");
    const offerId = requireUuid(formData, "offer_id");
    const config = getDirectDonationUpgradeConfig();
    if (!config.readyForCheckout || !config.environment) {
      throw new PublicDonationUpgradeError(
        config.blockers[0] ?? "Direct donation checkout is unavailable.",
      );
    }
    const viewer = await requireViewer(returnPath);
    const { data, error } = await serviceClient().rpc(
      "start_direct_donation_upgrade_checkout",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_obligation_id: obligationId,
        p_expected_environment: config.environment,
      },
    );
    const obligation = firstRow<DirectDonationUpgradeObligationRow>(data);
    if (error || !obligation) {
      throw new PublicDonationUpgradeError(
        "The donation obligation could not be opened. It may no longer be active.",
      );
    }
    if (obligation.offer_id !== offerId) {
      throw new PublicDonationUpgradeError(
        "The donation obligation does not belong to this offer.",
      );
    }
    destination =
      obligation.status === "verified"
        ? withMessage(
            returnPath,
            "message",
            "This exact donation is already verified.",
          )
        : buildDirectDonationUpgradeCheckoutUrl({ obligation, config });
    revalidatePath(returnPath);
  } catch (error) {
    rethrowFrameworkNavigation(error);
    fail(returnPath, error);
  }
  redirect(destination);
}
