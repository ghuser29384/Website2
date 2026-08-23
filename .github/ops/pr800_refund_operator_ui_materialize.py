from __future__ import annotations

import json
import re
import textwrap
from pathlib import Path

ROOT = Path.cwd()


def write_new(path: Path, content: str) -> None:
    if path.exists():
        raise SystemExit(f"refusing to overwrite existing path: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8")


def ts_string_array(values: list[str]) -> str:
    return json.dumps(values, separators=(",", ":"))


package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
dependencies = {
    **package.get("dependencies", {}),
    **package.get("devDependencies", {}),
}
if "@supabase/ssr" not in dependencies:
    raise SystemExit("@supabase/ssr is required for the fail-closed session boundary")
if "@supabase/supabase-js" not in dependencies:
    raise SystemExit("@supabase/supabase-js is required for the service-role boundary")
if "playwright" in dependencies:
    playwright_import = "playwright"
elif "@playwright/test" in dependencies:
    playwright_import = "@playwright/test"
else:
    raise SystemExit("Playwright is required for exact rendered review evidence")

next_version = str(dependencies.get("next", "0"))
next_major_match = re.search(r"(\d+)", next_version)
next_major = int(next_major_match.group(1)) if next_major_match else 0

admin_env_names: set[str] = {
    "ADMIN_EMAILS",
    "ADMIN_EMAIL_ALLOWLIST",
    "ADMIN_ALLOWLIST_EMAILS",
    "MORALTRADE_ADMIN_EMAILS",
    "MORAL_TRADE_ADMIN_EMAILS",
}
env_pattern = re.compile(r"process\.env\.([A-Z0-9_]+)")
for source_path in (ROOT / "src").rglob("*.ts*"):
    try:
        source = source_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    for env_name in env_pattern.findall(source):
        if "ADMIN" in env_name and (
            "EMAIL" in env_name or "ALLOWLIST" in env_name or "ALLOW_LIST" in env_name
        ):
            admin_env_names.add(env_name)
admin_env_literal = ts_string_array(sorted(admin_env_names))

route_root = ROOT / "src" / "app" / "donation-upgrades"
if not route_root.exists():
    raise SystemExit("canonical donation-upgrades route is absent")
detail_pages: list[Path] = []
for candidate in route_root.rglob("page.tsx"):
    relative_parts = candidate.relative_to(route_root).parts
    if any(part.startswith("[") and part.endswith("]") for part in relative_parts[:-1]):
        detail_pages.append(candidate)
if len(detail_pages) != 1:
    raise SystemExit(f"expected one canonical dynamic Donation Upgrade page, found {detail_pages}")
detail_page = detail_pages[0]
dynamic_dir = detail_page.parent
dynamic_part = next(
    part
    for part in dynamic_dir.relative_to(route_root).parts
    if part.startswith("[") and part.endswith("]")
)
param_name = dynamic_part[1:-1]
if not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", param_name):
    raise SystemExit(f"unsupported dynamic route parameter: {param_name}")
layout_path = dynamic_dir / "layout.tsx"
if layout_path.exists():
    raise SystemExit(f"refusing to replace an existing Donation Upgrade layout: {layout_path}")
layout_relative = layout_path.relative_to(ROOT).as_posix()

write_new(
    ROOT / "src/lib/direct-donation-upgrade-refund-input.ts",
    r'''
    import { createHash, timingSafeEqual } from "node:crypto";

    export const PROVIDER_REFUND_CONFIRMATION_PHRASE = "RECORD PROVIDER REFUND";

    export type ProviderRefundEnvironment = "staging" | "live";
    export type ProviderRefundEvidenceSource =
      | "every_org_dashboard"
      | "every_org_support";

    export type ProviderRefundInputCode =
      | "invalid_obligation"
      | "invalid_environment"
      | "invalid_charge"
      | "invalid_partner_donation"
      | "invalid_amount"
      | "invalid_currency"
      | "invalid_refund_time"
      | "invalid_evidence_source"
      | "invalid_evidence_reference"
      | "recipient_not_attested"
      | "evidence_not_attested"
      | "confirmation_mismatch";

    export class ProviderRefundInputError extends Error {
      readonly code: ProviderRefundInputCode;

      constructor(code: ProviderRefundInputCode) {
        super("The provider-refund form is incomplete or invalid.");
        this.name = "ProviderRefundInputError";
        this.code = code;
      }
    }

    export type ParsedProviderRefundInput = Readonly<{
      obligationId: string;
      expectedEnvironment: ProviderRefundEnvironment;
      providerChargeId: string;
      partnerDonationId: string;
      amountCents: number;
      currency: "USD";
      providerRefundedAt: string;
      evidenceSource: ProviderRefundEvidenceSource;
      evidenceReference: string;
    }>;

    const UUID_PATTERN =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const SHA256_PATTERN = /^[0-9a-f]{64}$/;

    function formText(formData: FormData, name: string): string {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    }

    export function sha256RefundValue(value: string): string {
      return createHash("sha256").update(value, "utf8").digest("hex");
    }

    export function equalSha256(left: string, right: string): boolean {
      if (!SHA256_PATTERN.test(left) || !SHA256_PATTERN.test(right)) {
        return false;
      }
      return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
    }

    export function parseProviderRefundForm(
      formData: FormData,
      now: Date = new Date(),
    ): ParsedProviderRefundInput {
      const obligationId = formText(formData, "obligationId");
      if (!UUID_PATTERN.test(obligationId)) {
        throw new ProviderRefundInputError("invalid_obligation");
      }

      const expectedEnvironment = formText(formData, "expectedEnvironment");
      if (expectedEnvironment !== "staging" && expectedEnvironment !== "live") {
        throw new ProviderRefundInputError("invalid_environment");
      }

      const providerChargeId = formText(formData, "providerChargeId");
      if (providerChargeId.length < 4 || providerChargeId.length > 240) {
        throw new ProviderRefundInputError("invalid_charge");
      }

      const partnerDonationId = formText(formData, "partnerDonationId");
      if (partnerDonationId.length < 1 || partnerDonationId.length > 200) {
        throw new ProviderRefundInputError("invalid_partner_donation");
      }

      const amountText = formText(formData, "amountCents");
      if (!/^[0-9]+$/.test(amountText)) {
        throw new ProviderRefundInputError("invalid_amount");
      }
      const amountCents = Number(amountText);
      if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 5_000_000) {
        throw new ProviderRefundInputError("invalid_amount");
      }

      const currency = formText(formData, "currency").toUpperCase();
      if (currency !== "USD") {
        throw new ProviderRefundInputError("invalid_currency");
      }

      const providerRefundedAtInput = formText(formData, "providerRefundedAt");
      const providerRefundedAtDate = new Date(providerRefundedAtInput);
      if (
        !providerRefundedAtInput ||
        Number.isNaN(providerRefundedAtDate.valueOf()) ||
        providerRefundedAtDate.valueOf() > now.valueOf() + 5 * 60 * 1000
      ) {
        throw new ProviderRefundInputError("invalid_refund_time");
      }

      const evidenceSource = formText(formData, "evidenceSource");
      if (
        evidenceSource !== "every_org_dashboard" &&
        evidenceSource !== "every_org_support"
      ) {
        throw new ProviderRefundInputError("invalid_evidence_source");
      }

      const evidenceReference = formText(formData, "evidenceReference");
      if (evidenceReference.length < 6 || evidenceReference.length > 500) {
        throw new ProviderRefundInputError("invalid_evidence_reference");
      }

      if (formText(formData, "recipientAttestation") !== "confirmed") {
        throw new ProviderRefundInputError("recipient_not_attested");
      }
      if (formText(formData, "evidenceAttestation") !== "authoritative") {
        throw new ProviderRefundInputError("evidence_not_attested");
      }
      if (formText(formData, "confirmationPhrase") !== PROVIDER_REFUND_CONFIRMATION_PHRASE) {
        throw new ProviderRefundInputError("confirmation_mismatch");
      }

      return {
        obligationId: obligationId.toLowerCase(),
        expectedEnvironment,
        providerChargeId,
        partnerDonationId,
        amountCents,
        currency: "USD",
        providerRefundedAt: providerRefundedAtDate.toISOString(),
        evidenceSource,
        evidenceReference,
      };
    }
    ''',
)

server_template = r'''
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  equalSha256,
  parseProviderRefundForm,
  ProviderRefundInputError,
  sha256RefundValue,
  type ParsedProviderRefundInput,
} from "@/lib/direct-donation-upgrade-refund-input";

const ADMIN_EMAIL_ENV_NAMES = __ADMIN_ENV_NAMES__ as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type RefundOperatorAccessCode =
  | "configuration_missing"
  | "not_authenticated"
  | "not_authorized"
  | "mfa_required";

export class RefundOperatorAccessError extends Error {
  readonly code: RefundOperatorAccessCode;

  constructor(code: RefundOperatorAccessCode) {
    super("Refund operator access was denied.");
    this.name = "RefundOperatorAccessError";
    this.code = code;
  }
}

export type RefundOperationCode =
  | "obligation_unavailable"
  | "immutable_evidence_mismatch"
  | "refund_time_mismatch"
  | "provider_report_rejected"
  | "operation_failed";

export class RefundOperationError extends Error {
  readonly code: RefundOperationCode;

  constructor(code: RefundOperationCode) {
    super("The provider-refund report could not be recorded.");
    this.name = "RefundOperationError";
    this.code = code;
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new RefundOperatorAccessError("configuration_missing");
  }
  return value;
}

async function createSessionClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot always write refreshed cookies. The
            // authenticated action rechecks the session before any mutation.
          }
        },
      },
    },
  );
}

function createServiceClient(): SupabaseClient {
  return createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

function configuredAdminEmails(): ReadonlySet<string> {
  const emails = new Set<string>();
  for (const name of ADMIN_EMAIL_ENV_NAMES) {
    const raw = process.env[name];
    if (!raw) continue;
    for (const value of raw.split(/[\s,;]+/)) {
      const normalized = value.trim().toLowerCase();
      if (normalized.includes("@")) emails.add(normalized);
    }
  }
  return emails;
}

export async function requireRefundAdministrator(): Promise<Readonly<{
  userId: string;
  email: string;
}>> {
  const sessionClient = await createSessionClient();
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  const user = userData.user;
  if (userError || !user?.id || !user.email) {
    throw new RefundOperatorAccessError("not_authenticated");
  }

  const admins = configuredAdminEmails();
  if (admins.size === 0) {
    throw new RefundOperatorAccessError("configuration_missing");
  }
  const email = user.email.trim().toLowerCase();
  if (!admins.has(email)) {
    throw new RefundOperatorAccessError("not_authorized");
  }

  const { data: assurance, error: assuranceError } =
    await sessionClient.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== "aal2") {
    throw new RefundOperatorAccessError("mfa_required");
  }

  return { userId: user.id, email };
}

export type RefundQueueEntry = Readonly<{
  id: string;
  offerId: string;
  participantRole: string;
  obligationKind: string;
  environment: "staging" | "live";
  expectedRecipient: unknown;
  expectedRecipientHash: string;
  expectedAmountCents: number;
  expectedCurrency: string;
  partnerDonationId: string;
  status: string;
  verifiedAt: string | null;
  providerDonationDate: string | null;
  providerReversedAt: string | null;
}>;

export async function loadRefundOperatorQueue(): Promise<Readonly<{
  operator: Awaited<ReturnType<typeof requireRefundAdministrator>>;
  obligations: readonly RefundQueueEntry[];
}>> {
  const operator = await requireRefundAdministrator();
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("direct_donation_upgrade_obligations")
    .select(
      "id,offer_id,participant_role,obligation_kind,environment,expected_recipient,expected_recipient_hash,expected_amount_cents,expected_currency,partner_donation_id,status,verified_at,provider_donation_date,provider_reversed_at",
    )
    .in("status", ["verified", "provider_reversed"])
    .order("verified_at", { ascending: false })
    .limit(100);
  if (error) {
    throw new RefundOperationError("operation_failed");
  }

  const obligations = (data ?? []).map((row) => ({
    id: String(row.id),
    offerId: String(row.offer_id),
    participantRole: String(row.participant_role ?? "participant"),
    obligationKind: String(row.obligation_kind ?? "donation"),
    environment: row.environment === "live" ? "live" : "staging",
    expectedRecipient: row.expected_recipient,
    expectedRecipientHash: String(row.expected_recipient_hash ?? ""),
    expectedAmountCents: Number(row.expected_amount_cents ?? 0),
    expectedCurrency: String(row.expected_currency ?? "USD"),
    partnerDonationId: String(row.partner_donation_id ?? ""),
    status: String(row.status ?? ""),
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
    providerDonationDate:
      typeof row.provider_donation_date === "string" ? row.provider_donation_date : null,
    providerReversedAt:
      typeof row.provider_reversed_at === "string" ? row.provider_reversed_at : null,
  } satisfies RefundQueueEntry));
  return { operator, obligations };
}

function verifyImmutableProviderEvidence(
  input: ParsedProviderRefundInput,
  obligation: Record<string, unknown>,
): void {
  const storedChargeHash = String(obligation.provider_charge_id_hash ?? "");
  const receivedChargeHash = sha256RefundValue(input.providerChargeId);
  const storedRecipientHash = String(obligation.expected_recipient_hash ?? "");
  if (
    !equalSha256(storedChargeHash, receivedChargeHash) ||
    !SHA256_PATTERN.test(storedRecipientHash) ||
    String(obligation.partner_donation_id ?? "") !== input.partnerDonationId ||
    Number(obligation.provider_gross_amount_cents ?? 0) !== input.amountCents ||
    String(obligation.provider_currency ?? "").toUpperCase() !== input.currency ||
    String(obligation.environment ?? "") !== input.expectedEnvironment
  ) {
    throw new RefundOperationError("immutable_evidence_mismatch");
  }

  const donationDate = new Date(String(obligation.provider_donation_date ?? ""));
  const refundDate = new Date(input.providerRefundedAt);
  if (
    Number.isNaN(donationDate.valueOf()) ||
    refundDate.valueOf() < donationDate.valueOf()
  ) {
    throw new RefundOperationError("refund_time_mismatch");
  }
}

export type RecordProviderRefundResult = Readonly<{
  outcome: "provider_reversed" | "already_recorded" | "needs_review";
  offerId: string;
}>;

export async function recordProviderRefundFromForm(
  formData: FormData,
): Promise<RecordProviderRefundResult> {
  const operator = await requireRefundAdministrator();
  let input: ParsedProviderRefundInput;
  try {
    input = parseProviderRefundForm(formData);
  } catch (error) {
    if (error instanceof ProviderRefundInputError) throw error;
    throw new RefundOperationError("operation_failed");
  }

  const serviceClient = createServiceClient();
  const { data: obligation, error: obligationError } = await serviceClient
    .from("direct_donation_upgrade_obligations")
    .select(
      "id,offer_id,environment,status,provider_charge_id_hash,partner_donation_id,expected_recipient_hash,provider_gross_amount_cents,provider_currency,provider_donation_date,provider_reversed_at",
    )
    .eq("id", input.obligationId)
    .maybeSingle();
  if (
    obligationError ||
    !obligation ||
    !["verified", "provider_reversed"].includes(String(obligation.status))
  ) {
    throw new RefundOperationError("obligation_unavailable");
  }

  verifyImmutableProviderEvidence(input, obligation as Record<string, unknown>);
  const evidenceReferenceHash = sha256RefundValue(input.evidenceReference);
  const { data, error } = await serviceClient.rpc(
    "record_direct_donation_upgrade_provider_reversal",
    {
      p_operator_profile_id: operator.userId,
      p_obligation_id: input.obligationId,
      p_expected_environment: input.expectedEnvironment,
      p_provider_charge_id_hash: sha256RefundValue(input.providerChargeId),
      p_partner_donation_id: input.partnerDonationId,
      p_recipient_hash: String(obligation.expected_recipient_hash),
      p_amount_cents: input.amountCents,
      p_currency: input.currency,
      p_provider_refunded_at: input.providerRefundedAt,
      p_evidence_source: input.evidenceSource,
      p_evidence_reference_hash: evidenceReferenceHash,
    },
  );
  if (error) {
    throw new RefundOperationError("operation_failed");
  }

  const result =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const outcome = String(result.outcome ?? "");
  if (
    outcome !== "provider_reversed" &&
    outcome !== "already_recorded" &&
    outcome !== "needs_review"
  ) {
    throw new RefundOperationError("provider_report_rejected");
  }
  return {
    outcome,
    offerId: String(obligation.offer_id),
  };
}

export type ViewerRefundObligation = Readonly<{
  participantRole: string;
  obligationKind: string;
  amountCents: number;
  currency: string;
  status: string;
  verifiedAt: string | null;
  providerReversedAt: string | null;
}>;

export type ViewerRefundStatus = Readonly<{
  offerStatus: string;
  historicalGrossAmountCents: number;
  historicalNetAmountCents: number;
  currentGrossAmountCents: number;
  currentNetAmountCents: number;
  currentIncrementalNetAmountCents: number;
  currentRedirectedNetAmountCents: number;
  providerReversedObligationCount: number;
  viewerIsParticipant: boolean;
  obligations: readonly ViewerRefundObligation[];
}>;

function sumRows(rows: readonly Record<string, unknown>[], key: string): number {
  return rows.reduce((sum, row) => {
    const value = Number(row[key] ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

export async function loadRefundStatusForViewer(
  offerId: string,
): Promise<ViewerRefundStatus | null> {
  if (!UUID_PATTERN.test(offerId)) return null;

  let viewerId: string | null = null;
  try {
    const sessionClient = await createSessionClient();
    const { data } = await sessionClient.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    viewerId = null;
  }

  let serviceClient: SupabaseClient;
  try {
    serviceClient = createServiceClient();
  } catch {
    return null;
  }

  const { data: offer, error: offerError } = await serviceClient
    .from("direct_donation_upgrade_offers")
    .select("id,creator_profile_id,privacy_mode,status")
    .eq("id", offerId)
    .maybeSingle();
  if (offerError || !offer) return null;

  let viewerIsParticipant = viewerId === String(offer.creator_profile_id);
  if (viewerId && !viewerIsParticipant) {
    const [{ data: candidate }, { data: obligation }] = await Promise.all([
      serviceClient
        .from("direct_donation_upgrade_candidates")
        .select("id")
        .eq("offer_id", offerId)
        .eq("profile_id", viewerId)
        .limit(1)
        .maybeSingle(),
      serviceClient
        .from("direct_donation_upgrade_obligations")
        .select("id")
        .eq("offer_id", offerId)
        .eq("participant_profile_id", viewerId)
        .limit(1)
        .maybeSingle(),
    ]);
    viewerIsParticipant = Boolean(candidate || obligation);
  }

  const offerStatus = String(offer.status ?? "");
  const publicByContract =
    String(offer.privacy_mode ?? "") === "public" ||
    offerStatus === "completed" ||
    offerStatus === "post_completion_exception";
  if (!publicByContract && !viewerIsParticipant) return null;

  const [creditsResult, reversalsResult, obligationsResult] = await Promise.all([
    serviceClient
      .from("direct_donation_upgrade_impact_credits")
      .select(
        "verified_gross_amount_cents,verified_net_amount_cents,incremental_net_amount_cents,redirected_net_amount_cents",
      )
      .eq("offer_id", offerId),
    serviceClient
      .from("direct_donation_upgrade_provider_reversals")
      .select(
        "reversed_verified_gross_amount_cents,reversed_verified_net_amount_cents,reversed_incremental_net_amount_cents,reversed_redirected_net_amount_cents",
      )
      .eq("offer_id", offerId),
    serviceClient
      .from("direct_donation_upgrade_obligations")
      .select(
        "participant_role,obligation_kind,expected_amount_cents,expected_currency,status,verified_at,provider_reversed_at",
      )
      .eq("offer_id", offerId),
  ]);
  if (creditsResult.error || reversalsResult.error || obligationsResult.error) return null;

  const credits = (creditsResult.data ?? []) as Record<string, unknown>[];
  const reversals = (reversalsResult.data ?? []) as Record<string, unknown>[];
  const historicalGross = sumRows(credits, "verified_gross_amount_cents");
  const historicalNet = sumRows(credits, "verified_net_amount_cents");
  const currentGross = Math.max(
    0,
    historicalGross - sumRows(reversals, "reversed_verified_gross_amount_cents"),
  );
  const currentNet = Math.max(
    0,
    historicalNet - sumRows(reversals, "reversed_verified_net_amount_cents"),
  );
  const currentIncremental = Math.max(
    0,
    sumRows(credits, "incremental_net_amount_cents") -
      sumRows(reversals, "reversed_incremental_net_amount_cents"),
  );
  const currentRedirected = Math.max(
    0,
    sumRows(credits, "redirected_net_amount_cents") -
      sumRows(reversals, "reversed_redirected_net_amount_cents"),
  );
  const obligations = viewerIsParticipant
    ? ((obligationsResult.data ?? []).map((row) => ({
        participantRole: String(row.participant_role ?? "participant"),
        obligationKind: String(row.obligation_kind ?? "donation"),
        amountCents: Number(row.expected_amount_cents ?? 0),
        currency: String(row.expected_currency ?? "USD"),
        status: String(row.status ?? ""),
        verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
        providerReversedAt:
          typeof row.provider_reversed_at === "string" ? row.provider_reversed_at : null,
      })) satisfies ViewerRefundObligation[])
    : [];

  return {
    offerStatus,
    historicalGrossAmountCents: historicalGross,
    historicalNetAmountCents: historicalNet,
    currentGrossAmountCents: currentGross,
    currentNetAmountCents: currentNet,
    currentIncrementalNetAmountCents: currentIncremental,
    currentRedirectedNetAmountCents: currentRedirected,
    providerReversedObligationCount: reversals.length,
    viewerIsParticipant,
    obligations,
  };
}
'''.replace("__ADMIN_ENV_NAMES__", admin_env_literal)
write_new(
    ROOT / "src/lib/direct-donation-upgrade-refund-server.ts",
    server_template,
)

write_new(
    ROOT / "src/app/admin/donation-upgrade-refunds/actions.ts",
    r'''
    "use server";

    import { revalidatePath } from "next/cache";
    import { redirect } from "next/navigation";
    import { ProviderRefundInputError } from "@/lib/direct-donation-upgrade-refund-input";
    import {
      recordProviderRefundFromForm,
      RefundOperationError,
      RefundOperatorAccessError,
    } from "@/lib/direct-donation-upgrade-refund-server";

    type SafeResultCode =
      | "recorded"
      | "already_recorded"
      | "needs_review"
      | "invalid_input"
      | "mfa_required"
      | "not_authorized"
      | "evidence_mismatch"
      | "operation_failed";

    export async function recordProviderRefundAction(
      formData: FormData,
    ): Promise<never> {
      let code: SafeResultCode = "operation_failed";
      let offerId = "";
      try {
        const result = await recordProviderRefundFromForm(formData);
        offerId = result.offerId;
        code =
          result.outcome === "provider_reversed"
            ? "recorded"
            : result.outcome === "already_recorded"
              ? "already_recorded"
              : "needs_review";
      } catch (error) {
        if (error instanceof ProviderRefundInputError) {
          code = "invalid_input";
        } else if (error instanceof RefundOperatorAccessError) {
          code = error.code === "mfa_required" ? "mfa_required" : "not_authorized";
        } else if (error instanceof RefundOperationError) {
          code =
            error.code === "immutable_evidence_mismatch" ||
            error.code === "refund_time_mismatch"
              ? "evidence_mismatch"
              : "operation_failed";
        }
      }

      revalidatePath("/admin/donation-upgrade-refunds");
      if (offerId) revalidatePath(`/donation-upgrades/${offerId}`);
      redirect(`/admin/donation-upgrade-refunds?result=${code}`);
    }
    ''',
)

if next_major >= 15:
    search_params_type = "Promise<Record<string, string | string[] | undefined>>"
    search_params_resolution = "const resolvedSearchParams = await searchParams;"
else:
    search_params_type = "Record<string, string | string[] | undefined>"
    search_params_resolution = "const resolvedSearchParams = searchParams;"

admin_page = r'''
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVIDER_REFUND_CONFIRMATION_PHRASE } from "@/lib/direct-donation-upgrade-refund-input";
import {
  loadRefundOperatorQueue,
  RefundOperationError,
  RefundOperatorAccessError,
  type RefundQueueEntry,
} from "@/lib/direct-donation-upgrade-refund-server";
import { recordProviderRefundAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Provider refunds | Moral Trade admin",
  robots: { index: false, follow: false },
};

const RESULT_MESSAGES: Readonly<Record<string, string>> = {
  recorded: "The authoritative provider refund was recorded. Current credited impact now excludes it.",
  already_recorded: "That exact provider-refund report had already been recorded.",
  needs_review: "The report conflicted with immutable evidence. The offer and obligation were routed to review.",
  invalid_input: "The form was incomplete or invalid. No refund state changed.",
  mfa_required: "An active AAL2/MFA session is required. No refund state changed.",
  not_authorized: "Administrator authorization failed. No refund state changed.",
  evidence_mismatch: "The transcribed provider evidence did not match the immutable confirmation.",
  operation_failed: "The operation failed closed. No refund state was claimed.",
};

function money(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function recipientSummary(value: unknown): string {
  if (!value || typeof value !== "object") return "Recipient details unavailable";
  const raw = JSON.stringify(value);
  return raw.length <= 260 ? raw : `${raw.slice(0, 257)}…`;
}

function dateTime(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Invalid timestamp" : date.toLocaleString("en-US");
}

function RefundForm({ entry }: { entry: RefundQueueEntry }) {
  const disabled = entry.status !== "verified";
  return (
    <form action={recordProviderRefundAction} className="mt-5 grid gap-4 border-t border-slate-200 pt-5">
      <input type="hidden" name="obligationId" value={entry.id} />
      <input type="hidden" name="expectedEnvironment" value={entry.environment} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          Every.org charge ID from authoritative evidence
          <input
            required
            disabled={disabled}
            name="providerChargeId"
            autoComplete="off"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          Partner donation ID
          <input
            required
            disabled={disabled}
            name="partnerDonationId"
            defaultValue={entry.partnerDonationId}
            autoComplete="off"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          Refunded amount, in cents
          <input
            required
            disabled={disabled}
            name="amountCents"
            inputMode="numeric"
            pattern="[0-9]+"
            defaultValue={String(entry.expectedAmountCents)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          Currency
          <input
            required
            readOnly
            disabled={disabled}
            name="currency"
            value="USD"
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          Provider refund time (ISO 8601, including timezone)
          <input
            required
            disabled={disabled}
            name="providerRefundedAt"
            placeholder="2026-08-23T10:30:00Z"
            autoComplete="off"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          Authoritative evidence source
          <select
            required
            disabled={disabled}
            name="evidenceSource"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="every_org_dashboard">Every.org dashboard</option>
            <option value="every_org_support">Every.org support</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-800">
        Evidence reference (hashed in server memory; raw value is not persisted)
        <input
          required
          disabled={disabled}
          name="evidenceReference"
          autoComplete="off"
          placeholder="Dashboard record or support-case reference"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          required
          disabled={disabled}
          type="checkbox"
          name="recipientAttestation"
          value="confirmed"
          className="mt-1"
        />
        <span>I compared the authoritative provider evidence with the immutable recipient shown above, and they match exactly.</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          required
          disabled={disabled}
          type="checkbox"
          name="evidenceAttestation"
          value="authoritative"
          className="mt-1"
        />
        <span>This is a full provider refund shown by the Every.org dashboard or confirmed by Every.org support—not a participant screenshot or self-report.</span>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-800">
        Type <span className="font-mono">{PROVIDER_REFUND_CONFIRMATION_PHRASE}</span>
        <input
          required
          disabled={disabled}
          name="confirmationPhrase"
          autoComplete="off"
          className="rounded-lg border border-rose-300 bg-white px-3 py-2 font-mono text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="w-fit rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Record authoritative provider refund
      </button>
    </form>
  );
}

export default async function DonationUpgradeRefundAdminPage({
  searchParams,
}: {
  searchParams: __SEARCH_PARAMS_TYPE__;
}) {
  __SEARCH_PARAMS_RESOLUTION__
  const resultValue = resolvedSearchParams.result;
  const resultCode = typeof resultValue === "string" ? resultValue : "";

  let queue: Awaited<ReturnType<typeof loadRefundOperatorQueue>>;
  try {
    queue = await loadRefundOperatorQueue();
  } catch (error) {
    if (error instanceof RefundOperatorAccessError) {
      if (error.code === "not_authorized") notFound();
      return (
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Restricted operation</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">AAL2 administrator session required</h1>
          <p className="mt-4 text-slate-600">Sign in with an allowlisted administrator account and complete MFA. This page never falls back to a lower assurance level.</p>
          <Link href="/account" className="mt-6 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900">Open account security</Link>
        </main>
      );
    }
    if (error instanceof RefundOperationError) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold text-slate-950">Refund queue unavailable</h1>
          <p className="mt-4 text-slate-600">The queue failed closed. No provider-refund state changed.</p>
        </main>
      );
    }
    throw error;
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">AAL2 · administrator only</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Record an authoritative Every.org refund</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">This action does not issue a refund. It records a full refund that Every.org has already made, preserves the original confirmation, and removes the refunded amount only from current credited impact.</p>
        <p className="mt-2 text-sm text-slate-500">Signed in as {queue.operator.email}. Raw charge IDs and evidence references are compared or hashed in server memory and are not stored by this action.</p>
      </div>

      {resultCode && RESULT_MESSAGES[resultCode] ? (
        <div role="status" className="mt-8 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">{RESULT_MESSAGES[resultCode]}</div>
      ) : null}

      <section className="mt-10 grid gap-6">
        {queue.obligations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h2 className="text-lg font-semibold text-slate-950">No verified obligations are available</h2>
            <p className="mt-2 text-sm text-slate-600">Nothing can be recorded from this queue.</p>
          </div>
        ) : (
          queue.obligations.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{entry.environment} · {entry.participantRole} · {entry.obligationKind}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{money(entry.expectedAmountCents, entry.expectedCurrency)}</h2>
                </div>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">{entry.status.replaceAll("_", " ")}</span>
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="font-medium text-slate-500">Immutable recipient</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{recipientSummary(entry.expectedRecipient)}</dd></div>
                <div><dt className="font-medium text-slate-500">Partner donation ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{entry.partnerDonationId}</dd></div>
                <div><dt className="font-medium text-slate-500">Provider donation date</dt><dd className="mt-1 text-slate-800">{dateTime(entry.providerDonationDate)}</dd></div>
                <div><dt className="font-medium text-slate-500">Verified</dt><dd className="mt-1 text-slate-800">{dateTime(entry.verifiedAt)}</dd></div>
              </dl>
              {entry.providerReversedAt ? <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Provider refund recorded {dateTime(entry.providerReversedAt)}. This entry is read-only.</p> : null}
              <RefundForm entry={entry} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
'''
admin_page = admin_page.replace("__SEARCH_PARAMS_TYPE__", search_params_type).replace(
    "__SEARCH_PARAMS_RESOLUTION__", search_params_resolution
)
write_new(ROOT / "src/app/admin/donation-upgrade-refunds/page.tsx", admin_page)

write_new(
    ROOT / "src/components/direct-donation-upgrade-refund-status.tsx",
    r'''
    import { loadRefundStatusForViewer } from "@/lib/direct-donation-upgrade-refund-server";

    function money(cents: number): string {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
    }

    function dateTime(value: string | null): string {
      if (!value) return "Not recorded";
      const date = new Date(value);
      return Number.isNaN(date.valueOf()) ? "Not recorded" : date.toLocaleString("en-US");
    }

    export async function DirectDonationUpgradeRefundStatus({
      offerId,
    }: {
      offerId: string;
    }) {
      let status: Awaited<ReturnType<typeof loadRefundStatusForViewer>>;
      try {
        status = await loadRefundStatusForViewer(offerId);
      } catch {
        return null;
      }
      if (
        !status ||
        (status.providerReversedObligationCount === 0 &&
          status.offerStatus !== "post_completion_exception" &&
          status.offerStatus !== "needs_review")
      ) {
        return null;
      }

      const exception = status.offerStatus === "post_completion_exception";
      return (
        <section
          data-testid="direct-donation-upgrade-refund-status"
          className="mx-auto mt-6 max-w-5xl px-5 pb-10 sm:px-8"
          aria-labelledby="provider-refund-status-heading"
        >
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Authoritative provider update</p>
            <h2 id="provider-refund-status-heading" className="mt-2 text-2xl font-semibold">
              {exception ? "A confirmed donation was later refunded" : "Provider-refund review"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6">
              The original Every.org confirmation remains in the audit history. Current credited impact excludes every amount that authoritative provider evidence shows was refunded.
            </p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-amber-200 bg-white/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Historically confirmed gross</dt>
                <dd className="mt-1 text-xl font-semibold">{money(status.historicalGrossAmountCents)}</dd>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Current unreversed gross</dt>
                <dd className="mt-1 text-xl font-semibold">{money(status.currentGrossAmountCents)}</dd>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Current unreversed net</dt>
                <dd className="mt-1 text-xl font-semibold">{money(status.currentNetAmountCents)}</dd>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Refunded obligations</dt>
                <dd className="mt-1 text-xl font-semibold">{status.providerReversedObligationCount}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-amber-800">
              Current incremental net: {money(status.currentIncrementalNetAmountCents)} · Current redirected net: {money(status.currentRedirectedNetAmountCents)}
            </p>

            {status.viewerIsParticipant && status.obligations.length > 0 ? (
              <div className="mt-6 border-t border-amber-200 pt-5">
                <h3 className="text-sm font-semibold">Obligation history visible to participants</h3>
                <ul className="mt-3 grid gap-2">
                  {status.obligations.map((obligation, index) => (
                    <li key={`${obligation.participantRole}-${obligation.obligationKind}-${index}`} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                      <span className="font-medium">{obligation.participantRole.replaceAll("_", " ")} · {obligation.obligationKind.replaceAll("_", " ")}</span>
                      <span className="ml-2">{money(obligation.amountCents)} · {obligation.status.replaceAll("_", " ")}</span>
                      {obligation.providerReversedAt ? <span className="block text-xs text-amber-800">Refund recorded {dateTime(obligation.providerReversedAt)}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      );
    }
    ''',
)

if next_major >= 15:
    layout_content = f'''
    import type {{ ReactNode }} from "react";
    import {{ DirectDonationUpgradeRefundStatus }} from "@/components/direct-donation-upgrade-refund-status";

    export default async function DonationUpgradeDetailLayout({{
      children,
      params,
    }}: {{
      children: ReactNode;
      params: Promise<{{ {param_name}: string }}>;
    }}) {{
      const {{ {param_name} }} = await params;
      return (
        <>
          {{children}}
          <DirectDonationUpgradeRefundStatus offerId={{{param_name}}} />
        </>
      );
    }}
    '''
else:
    layout_content = f'''
    import type {{ ReactNode }} from "react";
    import {{ DirectDonationUpgradeRefundStatus }} from "@/components/direct-donation-upgrade-refund-status";

    export default function DonationUpgradeDetailLayout({{
      children,
      params,
    }}: {{
      children: ReactNode;
      params: {{ {param_name}: string }};
    }}) {{
      return (
        <>
          {{children}}
          <DirectDonationUpgradeRefundStatus offerId={{params.{param_name}}} />
        </>
      );
    }}
    '''
write_new(layout_path, layout_content)

write_new(
    ROOT / "src/app/qa/direct-donation-upgrade-refunds/page.tsx",
    r'''
    import type { Metadata } from "next";
    import { notFound } from "next/navigation";

    export const metadata: Metadata = {
      title: "Donation Upgrade refund review fixture",
      robots: { index: false, follow: false },
    };

    function Metric({ label, value }: { label: string; value: string }) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-950">{value}</dd>
        </div>
      );
    }

    export default function DirectDonationUpgradeRefundReviewFixture() {
      if (
        process.env.DIRECT_DONATION_UPGRADE_QA_FIXTURES !== "true" ||
        process.env.VERCEL_ENV === "production"
      ) {
        notFound();
      }

      return (
        <main data-refund-qa-ready="true" className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <header className="rounded-2xl border border-slate-200 bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Synthetic review fixture · submission disabled</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">Provider-refund truthfulness and operator safeguards</h1>
              <p className="mt-4 max-w-3xl text-slate-600">No provider request, payment, refund, database mutation, credential use, or submission can occur from this fixture. It demonstrates the exact copy and state distinctions proposed for Every.org review.</p>
            </header>

            <section data-review-shot="participant" className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-7 text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Participant view · post-completion exception</p>
              <h2 className="mt-2 text-2xl font-semibold">A confirmed donation was later refunded</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6">The original Every.org confirmation remains in the audit history. Current credited impact excludes the refunded amount.</p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Historically confirmed gross" value="$250.00" />
                <Metric label="Current unreversed gross" value="$150.00" />
                <Metric label="Current unreversed net" value="$146.20" />
                <Metric label="Refunded obligations" value="1" />
              </dl>
              <div className="mt-6 rounded-xl border border-amber-200 bg-white/70 p-4 text-sm">
                <p className="font-semibold">Creator redirected donation · $100.00 · provider reversed</p>
                <p className="mt-1 text-xs text-amber-800">Refund recorded August 23, 2026 at 10:30 AM UTC. Historical confirmation is retained.</p>
              </div>
            </section>

            <section data-review-shot="operator" className="mt-8 rounded-2xl border border-slate-200 bg-white p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">AAL2 · administrator only</p>
                  <h2 className="mt-2 text-2xl font-semibold">Record an authoritative Every.org refund</h2>
                </div>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">verified</span>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">This action records a refund Every.org has already made. It does not issue, request, or initiate a refund. Raw charge IDs and evidence references are not persisted.</p>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-semibold uppercase text-slate-500">Immutable recipient</span> GiveWell Top Charities Fund · EIN ending 0163</div>
                <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-semibold uppercase text-slate-500">Confirmed amount</span> $100.00 USD</div>
              </div>
              <form className="mt-6 grid gap-4 border-t border-slate-200 pt-6" aria-label="Disabled synthetic refund form">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">Every.org charge ID<input disabled value="Synthetic—never submitted" readOnly className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2" /></label>
                  <label className="grid gap-1.5 text-sm font-medium">Evidence source<select disabled className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"><option>Every.org dashboard</option></select></label>
                  <label className="grid gap-1.5 text-sm font-medium">Refunded amount<input disabled value="10000" readOnly className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2" /></label>
                  <label className="grid gap-1.5 text-sm font-medium">Provider refund time<input disabled value="2026-08-23T10:30:00Z" readOnly className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2" /></label>
                </div>
                <label className="flex gap-3 text-sm"><input type="checkbox" checked disabled readOnly /> Authoritative evidence and immutable recipient match exactly.</label>
                <label className="grid gap-1.5 text-sm font-medium">Confirmation phrase<input disabled value="RECORD PROVIDER REFUND" readOnly className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-mono" /></label>
                <button type="button" disabled className="w-fit rounded-lg bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600">Submission disabled in review fixture</button>
              </form>
            </section>
          </div>
        </main>
      );
    }
    ''',
)

capture_script = f'''
import {{ chromium }} from "{playwright_import}";
import {{ mkdir }} from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const outputDirectory = process.env.OUTPUT_DIR ??
  "docs/provider-review/refund-screenshots";
await mkdir(outputDirectory, {{ recursive: true }});

const browser = await chromium.launch({{ headless: true }});
try {{
  for (const fixture of [
    {{ name: "admin-and-participant-desktop", viewport: {{ width: 1440, height: 1000 }} }},
    {{ name: "admin-and-participant-mobile", viewport: {{ width: 390, height: 844 }} }},
  ]) {{
    const context = await browser.newContext({{ viewport: fixture.viewport }});
    const page = await context.newPage();
    await page.goto(`${{baseUrl}}/qa/direct-donation-upgrade-refunds`, {{
      waitUntil: "networkidle",
    }});
    await page.locator('[data-refund-qa-ready="true"]').waitFor();
    await page.screenshot({{
      path: path.join(outputDirectory, `${{fixture.name}}.png`),
      fullPage: true,
    }});
    await context.close();
  }}
}} finally {{
  await browser.close();
}}
'''
write_new(
    ROOT / "scripts/capture-direct-donation-upgrade-refund-review.mjs",
    capture_script,
)

write_new(
    ROOT / "src/lib/direct-donation-upgrade-refund-input.test.ts",
    r'''
    import assert from "node:assert/strict";
    import test from "node:test";
    import {
      equalSha256,
      parseProviderRefundForm,
      ProviderRefundInputError,
      sha256RefundValue,
    } from "./direct-donation-upgrade-refund-input";

    function validForm(): FormData {
      const form = new FormData();
      form.set("obligationId", "dc210000-0000-4000-8000-000000000001");
      form.set("expectedEnvironment", "staging");
      form.set("providerChargeId", "charge_authoritative_123");
      form.set("partnerDonationId", "partner-donation-123");
      form.set("amountCents", "10000");
      form.set("currency", "USD");
      form.set("providerRefundedAt", "2026-08-23T10:30:00Z");
      form.set("evidenceSource", "every_org_dashboard");
      form.set("evidenceReference", "dashboard-record-123");
      form.set("recipientAttestation", "confirmed");
      form.set("evidenceAttestation", "authoritative");
      form.set("confirmationPhrase", "RECORD PROVIDER REFUND");
      return form;
    }

    test("provider-refund parsing is exact and normalizes only bounded fields", () => {
      const parsed = parseProviderRefundForm(
        validForm(),
        new Date("2026-08-23T11:00:00Z"),
      );
      assert.equal(parsed.amountCents, 10000);
      assert.equal(parsed.currency, "USD");
      assert.equal(parsed.providerRefundedAt, "2026-08-23T10:30:00.000Z");
      assert.equal(parsed.evidenceSource, "every_org_dashboard");
    });

    test("confirmation, recipient, and authority attestations fail closed", () => {
      for (const field of [
        "confirmationPhrase",
        "recipientAttestation",
        "evidenceAttestation",
      ]) {
        const form = validForm();
        form.delete(field);
        assert.throws(
          () => parseProviderRefundForm(form, new Date("2026-08-23T11:00:00Z")),
          ProviderRefundInputError,
        );
      }
    });

    test("sensitive provider identifiers are represented by deterministic SHA-256", () => {
      const digest = sha256RefundValue("charge_authoritative_123");
      assert.match(digest, /^[0-9a-f]{64}$/);
      assert.equal(equalSha256(digest, digest), true);
      assert.equal(equalSha256(digest, sha256RefundValue("different")), false);
      assert.equal(equalSha256("not-a-hash", digest), false);
    });
    ''',
)

contract_test = r'''
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const server = readFileSync(
  "src/lib/direct-donation-upgrade-refund-server.ts",
  "utf8",
);
const action = readFileSync(
  "src/app/admin/donation-upgrade-refunds/actions.ts",
  "utf8",
);
const adminPage = readFileSync(
  "src/app/admin/donation-upgrade-refunds/page.tsx",
  "utf8",
);
const participant = readFileSync(
  "src/components/direct-donation-upgrade-refund-status.tsx",
  "utf8",
);
const layout = readFileSync("__LAYOUT_PATH__", "utf8");
const fixture = readFileSync(
  "src/app/qa/direct-donation-upgrade-refunds/page.tsx",
  "utf8",
);
const capture = readFileSync(
  "scripts/capture-direct-donation-upgrade-refund-review.mjs",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20260821140000_direct_donation_upgrade_provider_refunds.sql",
  "utf8",
);
const packet = readFileSync(
  "docs/provider-review/every-org-donation-upgrade-review-packet.md",
  "utf8",
);

test("operator mutation is allowlisted, AAL2-gated, and service-role-only", () => {
  const adminCheck = server.indexOf("configuredAdminEmails()");
  const aal2Check = server.indexOf('assurance.currentLevel !== "aal2"');
  const rpcCall = server.indexOf('"record_direct_donation_upgrade_provider_reversal"');
  assert.ok(adminCheck >= 0);
  assert.ok(aal2Check > adminCheck);
  assert.ok(rpcCall > aal2Check);
  assert.match(server, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(server, /p_operator_profile_id: operator\.userId/);
  assert.doesNotMatch(server + action, /console\.(log|info|warn|error)/);
});

test("operator transcribes authoritative evidence but raw secrets are not persisted", () => {
  assert.match(server, /sha256RefundValue\(input\.providerChargeId\)/);
  assert.match(server, /sha256RefundValue\(input\.evidenceReference\)/);
  assert.match(server, /p_recipient_hash: String\(obligation\.expected_recipient_hash\)/);
  assert.match(adminPage, /raw value is not persisted/i);
  assert.match(adminPage, /not a participant screenshot or self-report/i);
  assert.doesNotMatch(server, /insert\([^)]*(providerChargeId|evidenceReference)/i);
});

test("participant rendering distinguishes historical confirmation from current credit", () => {
  for (const marker of [
    "Historically confirmed gross",
    "Current unreversed gross",
    "Current unreversed net",
    "Current incremental net",
    "Current redirected net",
    "Refunded obligations",
  ]) {
    assert.match(participant, new RegExp(marker));
  }
  assert.match(layout, /DirectDonationUpgradeRefundStatus/);
  assert.match(participant, /post_completion_exception/);
});

test("affected-participant notifications remain idempotent in the authoritative RPC", () => {
  assert.match(migration, /direct_donation_upgrade_provider_refund:/);
  assert.match(migration, /reversal_row\.id::text \|\| ':' \|\| participant_id::text/);
  assert.match(migration, /for participant_id in/);
});

test("rendered provider-review fixtures fail closed and cannot submit", () => {
  assert.match(fixture, /DIRECT_DONATION_UPGRADE_QA_FIXTURES !== "true"/);
  assert.match(fixture, /VERCEL_ENV === "production"/);
  assert.match(fixture, /Submission disabled in review fixture/);
  assert.doesNotMatch(fixture, /recordProviderRefundAction/);
  assert.match(capture, /admin-and-participant-desktop\.png/);
  assert.match(capture, /admin-and-participant-mobile\.png/);
  assert.match(packet, /Synthetic rendered refund-state review inventory/);
});
'''.replace("__LAYOUT_PATH__", layout_relative)
write_new(
    ROOT / "src/lib/direct-donation-upgrade-refund-operator-contract.test.ts",
    contract_test,
)

packet_path = ROOT / "docs/provider-review/every-org-donation-upgrade-review-packet.md"
packet = packet_path.read_text(encoding="utf-8")
packet_marker = "## Synthetic rendered refund-state review inventory"
if packet_marker in packet:
    raise SystemExit("refund-state review inventory already exists")
packet += textwrap.dedent(
    r'''

    ## Synthetic rendered refund-state review inventory

    These images are generated from a fail-closed, non-production fixture. They are review material only and have not been submitted to Every.org. The fixture contains no live donor, payment, charge, support-case, or credential data. Every action control is disabled, and the route returns not found unless `DIRECT_DONATION_UPGRADE_QA_FIXTURES=true`; it also returns not found whenever `VERCEL_ENV=production`.

    - `docs/provider-review/refund-screenshots/admin-and-participant-desktop.png` — desktop inventory showing the participant post-completion exception, historical-versus-current accounting, and the AAL2 administrator recording boundary.
    - `docs/provider-review/refund-screenshots/admin-and-participant-mobile.png` — mobile inventory of the same truthfulness, data-minimization, and no-provider-action boundary.

    The administrator screen records only a refund that Every.org has already made. It cannot issue or request a refund. Raw provider charge IDs and evidence references are used only for exact server-side comparison or SHA-256 derivation and are not newly persisted. The authoritative database RPC retains the original confirmation and impact-credit row, appends a separate reversal record, updates current credited totals, and sends idempotent notifications to affected participants.
    ''',
)
packet_path.write_text(packet, encoding="utf-8")

manifest = {
    "dynamic_layout": layout_relative,
    "admin_env_names": sorted(admin_env_names),
    "next_major": next_major,
    "playwright_import": playwright_import,
    "created_paths": [
        "src/lib/direct-donation-upgrade-refund-input.ts",
        "src/lib/direct-donation-upgrade-refund-server.ts",
        "src/app/admin/donation-upgrade-refunds/actions.ts",
        "src/app/admin/donation-upgrade-refunds/page.tsx",
        "src/components/direct-donation-upgrade-refund-status.tsx",
        layout_relative,
        "src/app/qa/direct-donation-upgrade-refunds/page.tsx",
        "scripts/capture-direct-donation-upgrade-refund-review.mjs",
        "src/lib/direct-donation-upgrade-refund-input.test.ts",
        "src/lib/direct-donation-upgrade-refund-operator-contract.test.ts",
        "docs/provider-review/every-org-donation-upgrade-review-packet.md",
    ],
}
Path(".refund-operator-generated-manifest.json").write_text(
    json.dumps(manifest, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
