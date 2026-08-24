"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess, isAdminEmail } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getDirectDonationUpgradeConfig } from "@/lib/direct-donation-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin/donation-upgrades";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const ALLOWED_EVIDENCE_SOURCES = new Set([
  "every_org_dashboard",
  "every_org_support",
]);
const REFUND_RECORDABLE_OBLIGATION_STATUSES = new Set([
  "verified",
  "provider_reversed",
]);

class PublicProviderRefundError extends Error {}

type ServiceClient = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function required(formData: FormData, key: string) {
  const value = read(formData, key);
  if (!value) {
    throw new PublicProviderRefundError(
      `${key.replaceAll("_", " ")} is required.`,
    );
  }
  return value;
}

function withMessage(key: "error" | "message", value: string) {
  return `${ADMIN_PATH}?${key}=${encodeURIComponent(value)}`;
}

function publicMessage(error: unknown) {
  return error instanceof PublicProviderRefundError
    ? error.message
    : "Unable to record that provider refund.";
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

function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function requireDonationUpgradeRefundOperator() {
  const viewer = await getViewer();
  if (!viewer || !isAdminEmail(viewer.authUser.email)) {
    throw new PublicProviderRefundError(
      "Provider-refund recording requires an authenticated administrator.",
    );
  }

  const security = await loadBackgroundAccountSecuritySummary();
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });
  if (!access.allowed) {
    throw new PublicProviderRefundError(access.message);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new PublicProviderRefundError(
      "Provider-refund recording is unavailable because the service-role boundary is not configured.",
    );
  }

  return viewer;
}

export async function recordDirectDonationUpgradeProviderRefundAction(
  formData: FormData,
) {
  try {
    const viewer = await requireDonationUpgradeRefundOperator();
    const obligationId = required(formData, "obligation_id");
    if (!UUID_PATTERN.test(obligationId)) {
      throw new PublicProviderRefundError("Choose a valid verified obligation.");
    }

    const evidenceSource = required(formData, "evidence_source").toLowerCase();
    if (!ALLOWED_EVIDENCE_SOURCES.has(evidenceSource)) {
      throw new PublicProviderRefundError(
        "Refund evidence must come from the Every.org dashboard or Every.org support.",
      );
    }
    if (read(formData, "authority_confirmation") !== "yes") {
      throw new PublicProviderRefundError(
        "Confirm that the report is based on authoritative Every.org evidence and records rather than executes a refund.",
      );
    }

    const evidenceReference = required(formData, "evidence_reference");
    if (evidenceReference.length < 8 || evidenceReference.length > 500) {
      throw new PublicProviderRefundError(
        "Enter a bounded authoritative evidence reference between 8 and 500 characters.",
      );
    }

    const refundedAtInput = required(formData, "provider_refunded_at");
    if (!ISO_INSTANT_PATTERN.test(refundedAtInput)) {
      throw new PublicProviderRefundError(
        "Enter the exact Every.org refund timestamp as ISO 8601 with Z or an explicit UTC offset.",
      );
    }
    const refundedAt = new Date(refundedAtInput);
    if (Number.isNaN(refundedAt.valueOf())) {
      throw new PublicProviderRefundError(
        "Enter a valid provider refund timestamp.",
      );
    }
    if (refundedAt.valueOf() > Date.now() + 5 * 60 * 1000) {
      throw new PublicProviderRefundError(
        "The provider refund timestamp cannot be in the future.",
      );
    }

    const config = getDirectDonationUpgradeConfig();
    if (!config.environment) {
      throw new PublicProviderRefundError(
        "The Donation Upgrade environment is disabled.",
      );
    }

    const supabase = createServiceClient() as ServiceClient;
    const { data: obligationData, error: obligationError } = await supabase
      .from("direct_donation_upgrade_obligations")
      .select(
        "id, offer_id, environment, status, partner_donation_id, provider_charge_id_hash, expected_recipient_hash, provider_gross_amount_cents, provider_currency, provider_donation_date",
      )
      .eq("id", obligationId)
      .maybeSingle();

    if (obligationError || !obligationData) {
      throw new PublicProviderRefundError(
        "The verified Donation Upgrade obligation could not be loaded.",
      );
    }

    const obligation = obligationData as Record<string, unknown>;
    if (
      !REFUND_RECORDABLE_OBLIGATION_STATUSES.has(String(obligation.status ?? ""))
    ) {
      throw new PublicProviderRefundError(
        "Only a verified obligation or an exact replay of a provider-reversed obligation can be recorded.",
      );
    }
    if (obligation.environment !== config.environment) {
      throw new PublicProviderRefundError(
        "The obligation does not belong to the active Donation Upgrade environment.",
      );
    }

    const chargeHash = String(obligation.provider_charge_id_hash ?? "");
    const recipientHash = String(obligation.expected_recipient_hash ?? "");
    const partnerDonationId = String(obligation.partner_donation_id ?? "");
    const providerCurrency = String(obligation.provider_currency ?? "");
    const providerAmountCents = Number(
      obligation.provider_gross_amount_cents ?? Number.NaN,
    );
    const providerDonationDate = new Date(
      String(obligation.provider_donation_date ?? ""),
    );

    if (
      !SHA256_PATTERN.test(chargeHash) ||
      !SHA256_PATTERN.test(recipientHash) ||
      !partnerDonationId ||
      !Number.isInteger(providerAmountCents) ||
      providerAmountCents < 100 ||
      providerCurrency !== "USD" ||
      Number.isNaN(providerDonationDate.valueOf())
    ) {
      throw new PublicProviderRefundError(
        "The immutable provider confirmation is incomplete and requires review.",
      );
    }
    if (refundedAt.valueOf() < providerDonationDate.valueOf()) {
      throw new PublicProviderRefundError(
        "The provider refund timestamp cannot precede the confirmed donation.",
      );
    }

    const result = await supabase.rpc(
      "record_direct_donation_upgrade_provider_reversal",
      {
        p_operator_profile_id: viewer.profile.id,
        p_obligation_id: obligationId,
        p_expected_environment: obligation.environment,
        p_provider_charge_id_hash: chargeHash,
        p_partner_donation_id: partnerDonationId,
        p_recipient_hash: recipientHash,
        p_amount_cents: providerAmountCents,
        p_currency: providerCurrency,
        p_provider_refunded_at: refundedAt.toISOString(),
        p_evidence_source: evidenceSource,
        p_evidence_reference_hash: sha256Text(evidenceReference),
      },
    );

    if (result.error) {
      throw new PublicProviderRefundError(
        "The authoritative refund report could not be reconciled exactly.",
      );
    }

    const response =
      firstRow<Record<string, unknown>>(result.data as any) ??
      (result.data as Record<string, unknown> | null);
    const outcome = String(response?.outcome ?? "");
    if (outcome === "needs_review") {
      throw new PublicProviderRefundError(
        "The report did not exactly match the immutable confirmation and was moved to review.",
      );
    }
    if (outcome !== "provider_reversed" && outcome !== "already_recorded") {
      throw new PublicProviderRefundError(
        "The provider-refund result was not recognized.",
      );
    }

    const offerId = String(obligation.offer_id ?? "");
    revalidatePath(ADMIN_PATH);
    revalidatePath("/donation-upgrades");
    if (UUID_PATTERN.test(offerId)) {
      revalidatePath(`/donation-upgrades/${offerId}`);
    }

    redirect(
      withMessage(
        "message",
        outcome === "already_recorded"
          ? "That exact Every.org provider refund was already recorded."
          : "Every.org provider refund recorded; historical confirmation was preserved and current credit was reversed.",
      ),
    );
  } catch (error) {
    rethrowFrameworkNavigation(error);
    redirect(withMessage("error", publicMessage(error)));
  }
}
