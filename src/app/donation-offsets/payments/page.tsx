import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  DonationRedirectImpactFlow,
  type DonationRedirectImpactPreview,
  type DonationRedirectPartyPlan,
  type DonationRedirectSettlementStatus,
  type DonationRedirectStage,
} from "@/components/donation-offsets/donation-redirect-impact-flow";
import { Breadcrumbs, PageHero, SectionHeader } from "@/components/ui/page-primitives";
import {
  publishDonationRedirectReceiptAction,
  unpublishDonationRedirectReceiptAction,
  updateDonationRedirectPlanAction,
} from "@/app/donation-offsets/payments/actions";
import { isAdminEmail } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import {
  calculateDonationOffsetImpactSnapshot,
  type DonationOffsetImpactSnapshot,
} from "@/lib/donation-offset-impact";
import {
  CONDITIONAL_PAYMENT_TERMS_VERSION,
} from "@/lib/payments/conditional-mandates";
import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Conditional offset payments",
  description:
    "Save an eligible payment method through Stripe Checkout, inspect frozen donation-offset conditions, and monitor compensated settlement.",
  robots: {
    index: false,
    follow: false,
  },
};

const WORKSPACE_PATH = "/donation-offsets/payments";

interface PaymentWorkspacePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatMoney(amountCents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

function statusLabel(status: string | null | undefined) {
  return (status || "not started").replaceAll("_", " ");
}

function paymentModeEyebrow(mode: string) {
  if (mode === "live") return "Live conditional payments";
  if (mode === "test") return "Stripe test mode";
  return "Conditional payments unavailable";
}

function paymentPostureMessage(mode: string) {
  if (mode === "live") {
    return "Live mode moves real money and uses compensating refunds rather than claiming impossible payment-level atomicity.";
  }
  if (mode === "test") {
    return "TEST MODE — Stripe test objects only. No real charge, donation, tax receipt, or charitable transfer occurs.";
  }
  return "Stripe payments are disabled on the production site until a verified live account, live keys, signed webhook, recipient destination, and settlement gates are ready.";
}

function selectedStage(value: string): DonationRedirectStage | null {
  return value === "choose" || value === "review" || value === "complete" ? value : null;
}

function formatImpactCount(value: number) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

function impactPreview(snapshot: DonationOffsetImpactSnapshot): DonationRedirectImpactPreview {
  if (snapshot.status === "unavailable") {
    return {
      status: "unavailable",
      unavailableReason: snapshot.message,
      primaryOutput: null,
      effectiveLifeYears: null,
      caveat: "No reviewed effective-life-year estimate available; this is not zero impact.",
    };
  }

  const count = snapshot.programOutput.expectedCount;
  const unitLabel =
    Math.abs(count - 1) < Number.EPSILON
      ? snapshot.programOutput.unitLabelSingular
      : snapshot.programOutput.unitLabelPlural;
  return {
    status: "modeled",
    primaryOutput: `${formatImpactCount(count)} ${unitLabel}`,
    effectiveLifeYears: snapshot.effectiveLifeYears.estimate,
    comparableMetric: {
      aggregationKey: snapshot.aggregationCompatibility.compatibilityKey,
      unit: "effective life-years saved",
      value: snapshot.effectiveLifeYears.estimate,
    },
    methodology: `${formatMoney(snapshot.amountCents)} divided by the versioned program-output and modeled cost-per-death-averted inputs`,
    modelVersion: snapshot.model.modelVersion,
    sourceLabel: snapshot.model.sourceLabel,
    sourceUrl: "https://www.givewell.org/impact-estimates",
    caveat: snapshot.effectiveLifeYears.scenarioLabel,
  };
}

function settlementStatus(status: string | null | undefined): DonationRedirectSettlementStatus {
  if (status === "transferred") return "transferred";
  if (status === "refunded" || status === "refunding") return "refunded";
  if (status === "cancelled") return "cancelled";
  if (status === "disputed") return "disputed";
  if (status === "charging" || status === "charged" || status === "transferring") {
    return "settling";
  }
  if (status === "ready") return "authorized";
  if (status === "pending_authorizations" || status === "requires_action") {
    return "authorization_pending";
  }
  return "not_started";
}

function mandateMatchesCurrentPlans(
  mandate: Record<string, any> | undefined,
  ownerPlan: Record<string, any> | undefined,
  counterpartyPlan: Record<string, any> | undefined,
) {
  if (!mandate || !ownerPlan || !counterpartyPlan) return false;
  const snapshot = mandate.condition_snapshot as Record<string, any> | null;
  return (
    snapshot?.schemaVersion === "donation-offset-payment-condition-v2" &&
    Number(snapshot.redirects?.owner?.planVersion) === Number(ownerPlan.plan_version) &&
    Number(snapshot.redirects?.counterparty?.planVersion) ===
      Number(counterpartyPlan.plan_version)
  );
}

function latestByRole(rows: Array<Record<string, any>>) {
  const result = new Map<string, Record<string, any>>();
  for (const row of [...rows].sort((left, right) =>
    String(right.created_at).localeCompare(String(left.created_at)),
  )) {
    const role = String(row.participant_role);
    if (!result.has(role)) {
      result.set(role, row);
    }
  }
  return result;
}

export default async function PaymentWorkspacePage({
  searchParams,
}: PaymentWorkspacePageProps) {
  const viewer = await requireViewer("/donation-offsets/payments");
  const parameters = await searchParams;
  const errorMessage = queryValue(parameters.error);
  const statusMessage = queryValue(parameters.status);
  const settlementMessage = queryValue(parameters.message);
  const requestedMatchId = queryValue(parameters.match);
  const requestedStage = selectedStage(queryValue(parameters.stage));
  const readiness = await getConditionalPaymentReadiness();
  const supabase = createServiceClient() as any;
  const profileId = viewer.authUser.id;

  const { data: matches, error: matchesError } = await supabase
    .from("donation_offset_matches")
    .select("*")
    .or(`owner_profile_id.eq.${profileId},counterparty_profile_id.eq.${profileId}`)
    .in("status", ["matched", "completed"])
    .order("created_at", { ascending: false });

  const matchRows = (matches ?? []) as Array<Record<string, any>>;
  const matchIds = matchRows.map((match) => String(match.id));
  const offerIds = [...new Set(matchRows.map((match) => String(match.offer_id)))];

  const [
    offsetsResult,
    mandatesResult,
    batchesResult,
    redirectPlansResult,
    charitiesResult,
    destinationsResult,
  ] = await Promise.all([
    offerIds.length
      ? supabase.from("donation_offset_offers").select("*").in("offer_id", offerIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? supabase
          .from("conditional_payment_mandates")
          .select("*")
          .eq("purpose", "donation_offset")
          .eq("subject_type", "donation_offset_match")
          .in("subject_id", matchIds)
          .eq("livemode", readiness.livemode)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? supabase
          .from("conditional_settlement_batches")
          .select("*")
          .eq("purpose", "donation_offset")
          .eq("subject_type", "donation_offset_match")
          .in("subject_id", matchIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? supabase
          .from("donation_offset_redirect_plans")
          .select("*")
          .in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("registered_charities")
      .select("*")
      .eq("is_active", true)
      .eq("selectable", true)
      .eq("is_political_campaign", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("conditional_payment_destinations")
      .select("*")
      .eq("livemode", readiness.livemode)
      .eq("status", "active"),
  ]);

  const offsetRows = (offsetsResult.data ?? []) as Array<Record<string, any>>;
  const charities = (charitiesResult.data ?? []) as Array<Record<string, any>>;

  const pageErrors = [
    matchesError,
    offsetsResult.error,
    mandatesResult.error,
    batchesResult.error,
    redirectPlansResult.error,
    charitiesResult.error,
    destinationsResult.error,
  ]
    .filter(Boolean)
    .map((error) => error?.message)
    .filter(Boolean);

  const offsetsByOfferId = new Map(offsetRows.map((row) => [String(row.offer_id), row]));
  const charitiesById = new Map(
    charities.map((row) => [String(row.id), row]),
  );
  const redirectPlansByMatch = new Map<string, Map<string, Record<string, any>>>();
  for (const plan of (redirectPlansResult.data ?? []) as Array<Record<string, any>>) {
    const matchId = String(plan.match_id);
    const byRole = redirectPlansByMatch.get(matchId) ?? new Map();
    byRole.set(String(plan.participant_role), plan);
    redirectPlansByMatch.set(matchId, byRole);
  }
  const paymentDestinationByCharityId = new Map(
    ((destinationsResult.data ?? []) as Array<Record<string, any>>).map((row) => [
      String(row.registered_charity_id),
      row,
    ]),
  );
  const mandatesByMatch = new Map<string, Array<Record<string, any>>>();
  for (const mandate of (mandatesResult.data ?? []) as Array<Record<string, any>>) {
    const key = String(mandate.subject_id);
    const bucket = mandatesByMatch.get(key) ?? [];
    bucket.push(mandate);
    mandatesByMatch.set(key, bucket);
  }
  const batchesByMatch = new Map<string, Record<string, any>>();
  for (const batch of (batchesResult.data ?? []) as Array<Record<string, any>>) {
    const key = String(batch.subject_id);
    if (!batchesByMatch.has(key)) {
      batchesByMatch.set(key, batch);
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
        />
        <Breadcrumbs
          items={[
            { href: "/donation-offsets", label: "Donation offsets" },
            { href: "/donation-offsets/payments", label: "Payments" },
          ]}
        />
        <PageHero
          eyebrow={paymentModeEyebrow(readiness.mode)}
          title="Authorize now. Charge only when the frozen offset clears."
          description="Stripe Checkout dynamically offers Card, Apple Pay, Google Pay, and Link when eligible; PayPal appears only for supported Stripe account regions and flows. Moral Trade saves the selected method without charging it. When both participants have matching mandates and the reviewed terms are unchanged, the platform charges each side off-session and transfers both amounts to the approved destination. If paired capture or transfer fails, successful charges are reversed or refunded."
          actions={
            <>
              <Link className="button button-secondary" href="/donation-offsets">
                Donation offset overview
              </Link>
              <Link className="button button-secondary" href="/offers?mode=offset">
                Browse offsets
              </Link>
            </>
          }
        >
          <aside className="hero-panel panel">
            <p className="eyebrow">Settlement posture</p>
            <h2>{readiness.canSettle ? "Capture path ready" : "Capture path gated"}</h2>
            <p>{paymentPostureMessage(readiness.mode)}</p>
          </aside>
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        {errorMessage ? (
          <section className="section section-white">
            <div className="status-banner status-banner-error">{errorMessage}</div>
          </section>
        ) : null}
        {statusMessage || settlementMessage ? (
          <section className="section section-white">
            <div className="status-banner">
              {[statusMessage ? statusLabel(statusMessage) : "", settlementMessage]
                .filter(Boolean)
                .join(" — ")}
            </div>
          </section>
        ) : null}
        {pageErrors.length ? (
          <section className="section section-white">
            <div className="status-banner status-banner-error">
              Payment workspace data could not be loaded: {pageErrors.join(" ")}
            </div>
          </section>
        ) : null}

        <section className="section section-subtle" aria-labelledby="payment-readiness-heading">
          <SectionHeader
            eyebrow="Readiness"
            id="payment-readiness-heading"
            title="Provider, webhook, destination, and policy gates are explicit."
          />
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Environment</p>
              <h3>{readiness.mode}</h3>
              <p>Stripe account reachable: {readiness.accountReachable ? "yes" : "no"}</p>
              <p>Signed webhook seen: {readiness.signedWebhookSeen ? "yes" : "not yet"}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Money movement</p>
              <h3>{readiness.canSettle ? "Ready" : "Blocked"}</h3>
              <p>Charges enabled: {readiness.chargesEnabled ? "yes" : "no"}</p>
              <p>Active destinations: {readiness.activeDestinationCount}</p>
            </article>
            <article className="panel data-card data-card-wide">
              <p className="detail-kicker">Current blockers</p>
              <h3>{readiness.blockers.length ? `${readiness.blockers.length} unresolved` : "None"}</h3>
              {readiness.blockers.length ? (
                <ul>
                  {readiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p>The currently selected environment passes the operational checks.</p>
              )}
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="payment-matches-heading">
          <SectionHeader
            eyebrow="Your offsets"
            id="payment-matches-heading"
            title="Each authorization is bound to an immutable condition hash."
          >
            A changed amount, destination, deadline, moderation state, or participant pair invalidates
            the old mandate and requires fresh consent.
          </SectionHeader>

          {matchRows.length ? (
            <div className="form-stack">
              {matchRows.map((match) => {
                const matchId = String(match.id);
                const offset = offsetsByOfferId.get(String(match.offer_id));
                const viewerRole =
                  match.owner_profile_id === profileId ? "owner" : "counterparty";
                const plansByRole = redirectPlansByMatch.get(matchId);
                const ownerPlanRow = plansByRole?.get("owner");
                const counterpartyPlanRow = plansByRole?.get("counterparty");
                const batch = batchesByMatch.get(matchId);
                const frozenSnapshot = batch?.condition_snapshot as Record<string, any> | null;
                const useFrozenRedirects =
                  frozenSnapshot?.schemaVersion === "donation-offset-payment-condition-v2" &&
                  ["transferred", "refunded", "disputed"].includes(String(batch?.status));
                const frozenOwner = useFrozenRedirects ? frozenSnapshot?.redirects?.owner : null;
                const frozenCounterparty = useFrozenRedirects
                  ? frozenSnapshot?.redirects?.counterparty
                  : null;

                function makePartyPlan(
                  partyRole: "owner" | "counterparty",
                  planRow: Record<string, any> | undefined,
                  frozenRedirect: Record<string, any> | null,
                ): DonationRedirectPartyPlan {
                  const amountCents = Number(
                    partyRole === "owner"
                      ? match.matched_baseline_cents
                      : match.matched_counterparty_cents,
                  );
                  const profile = String(
                    partyRole === "owner"
                      ? match.owner_profile_id
                      : match.counterparty_profile_id,
                  );
                  const charityId = String(
                    frozenRedirect?.charityId ?? planRow?.registered_charity_id ?? "",
                  );
                  const charity = charitiesById.get(charityId);
                  const impactSnapshot = frozenRedirect?.impact
                    ? (frozenRedirect.impact as DonationOffsetImpactSnapshot)
                    : calculateDonationOffsetImpactSnapshot({
                        partyId: profile,
                        partyRole,
                        destinationId: charityId,
                        amountCents,
                      });
                  return {
                    amountCents,
                    causeArea: String(frozenRedirect?.causeArea ?? charity?.cause_area ?? ""),
                    destinationId: charityId || null,
                    destinationName: String(
                      frozenRedirect?.charityName ?? charity?.name ?? "",
                    ),
                    impact: impactPreview(impactSnapshot),
                    planVersion: Number(frozenRedirect?.planVersion ?? planRow?.plan_version ?? 0),
                    updatedAtIso: planRow?.updated_at ? String(planRow.updated_at) : null,
                  };
                }

                const ownerPlan = makePartyPlan("owner", ownerPlanRow, frozenOwner);
                const counterpartyPlan = makePartyPlan(
                  "counterparty",
                  counterpartyPlanRow,
                  frozenCounterparty,
                );
                const viewerPlan = viewerRole === "owner" ? ownerPlan : counterpartyPlan;
                const matchPlan = viewerRole === "owner" ? counterpartyPlan : ownerPlan;
                const currentMandateRows = (mandatesByMatch.get(matchId) ?? []).filter((mandate) =>
                  mandateMatchesCurrentPlans(mandate, ownerPlanRow, counterpartyPlanRow),
                );
                const roleMandates = latestByRole(currentMandateRows);
                const ownerMandate = roleMandates.get("owner");
                const counterpartyMandate = roleMandates.get("counterparty");
                const ownMandateForViewer = roleMandates.get(viewerRole);
                const authorizationReady = ownMandateForViewer?.status === "ready";
                const canCancel =
                  ownMandateForViewer &&
                  ["setup_pending", "ready", "failed", "requires_action"].includes(
                    String(ownMandateForViewer.status),
                  );
                const bothReady =
                  ["ready", "charge_pending", "charged"].includes(String(ownerMandate?.status)) &&
                  ["ready", "charge_pending", "charged"].includes(
                    String(counterpartyMandate?.status),
                  );
                const ownerPaymentDestination = ownerPlan.destinationId
                  ? paymentDestinationByCharityId.get(ownerPlan.destinationId)
                  : null;
                const counterpartyPaymentDestination = counterpartyPlan.destinationId
                  ? paymentDestinationByCharityId.get(counterpartyPlan.destinationId)
                  : null;
                const destinationsCanSettle = Boolean(
                  ownerPaymentDestination && counterpartyPaymentDestination,
                );
                const authorizationDisabledReason = !ownerPlan.destinationId || !matchPlan.destinationId
                  ? "Both participants must choose a destination before payment authorization."
                  : !destinationsCanSettle
                    ? "One or both selected organizations do not yet have an approved payment destination. You can save and compare the plan, but automated settlement remains gated."
                    : !readiness.canCreateMandates
                      ? readiness.blockers.join(" ") || paymentPostureMessage(readiness.mode)
                      : null;
                const authorizationState = authorizationReady
                  ? "ready" as const
                  : ownMandateForViewer?.status === "setup_pending"
                    ? "pending" as const
                    : authorizationDisabledReason
                      ? "unavailable" as const
                      : "required" as const;
                const isTransferred = String(batch?.status) === "transferred";
                const requestedStageForMatch =
                  requestedMatchId === matchId ? requestedStage : null;
                const currentStage: DonationRedirectStage =
                  isTransferred && batch?.livemode
                    ? "complete"
                    : requestedStageForMatch
                      ? requestedStageForMatch
                      : isTransferred
                        ? "complete"
                        : "choose";
                const stageHref = (stage: DonationRedirectStage) =>
                  `${WORKSPACE_PATH}?match=${encodeURIComponent(matchId)}&stage=${stage}`;
                const receiptToken = batch?.public_receipt_token
                  ? String(batch.public_receipt_token)
                  : null;
                const publicReceiptUrl =
                  batch?.public_receipt_enabled && receiptToken
                    ? `https://www.moraltrade.org/redirects/${receiptToken}`
                    : null;
                const availableDestinations = charities.map((charity) => ({
                  causeArea: String(charity.cause_area),
                  id: String(charity.id),
                  impact: impactPreview(
                    calculateDonationOffsetImpactSnapshot({
                      partyId: profileId,
                      partyRole: viewerRole,
                      destinationId: String(charity.id),
                      amountCents: viewerPlan.amountCents,
                    }),
                  ),
                  name: String(charity.name),
                }));

                return (
                  <article className="form-stack" key={matchId}>
                    <DonationRedirectImpactFlow
                      availableDestinations={availableDestinations}
                      baselineCaveat="Other shared effects, unequal influence per dollar, and effects outside the named contested margin are not modeled."
                      baselineOutcomeLabel="the contested margin"
                      counterpartyOriginalBaselineLabel={
                        offset?.requested_opposed_cause ?? "the other opposed destination"
                      }
                      counterpartyPlan={counterpartyPlan}
                      currentStage={currentStage}
                      matchId={matchId}
                      ownerOriginalBaselineLabel={
                        offset?.baseline_opposed_cause ?? "one opposed destination"
                      }
                      ownerPlan={ownerPlan}
                      paymentAuthorization={{
                        actionUrl: "/api/payments/conditional/mandates/donation-offset",
                        consentLabel: `I authorize Moral Trade to save this payment method and later charge exactly ${formatMoney(viewerPlan.amountCents)} only for this frozen two-destination condition. I understand the two charges and transfers are compensated with reversals or refunds if paired settlement fails, and I can revoke before capture.`,
                        disabledReason: authorizationDisabledReason,
                        hiddenFields: {
                          match_id: matchId,
                          terms_version: CONDITIONAL_PAYMENT_TERMS_VERSION,
                        },
                        state: authorizationState,
                        statusLabel: authorizationReady
                          ? "Your payment authorization is ready"
                          : statusLabel(ownMandateForViewer?.status),
                        submitLabel: ownMandateForViewer
                          ? "Replace payment authorization"
                          : "Authorize payment method",
                        termsVersion: CONDITIONAL_PAYMENT_TERMS_VERSION,
                      }}
                      publishReceiptAction={publishDonationRedirectReceiptAction}
                      receiptId={receiptToken ? receiptToken.slice(0, 8).toUpperCase() : null}
                      receiptPublication={{
                        batchId: batch?.id ? String(batch.id) : null,
                        disabledReason:
                          isTransferred && batch?.livemode
                            ? null
                            : "A shareable link requires a verified live transfer.",
                        state:
                          isTransferred && batch?.livemode
                            ? batch.public_receipt_enabled
                              ? "public"
                              : "private"
                            : "unavailable",
                        statusLabel: batch?.public_receipt_enabled
                          ? "Politics hidden · public link active"
                          : "Private by default · original political destinations stay hidden",
                      }}
                      settlement={{
                        completedAtIso: batch?.completed_at ? String(batch.completed_at) : null,
                        isLive: batch ? Boolean(batch.livemode) : readiness.mode !== "test",
                        publicReceiptUrl,
                        receiptImageFileName: receiptToken
                          ? `moral-trade-donation-redirect-${receiptToken.slice(0, 8)}.png`
                          : null,
                        status: settlementStatus(batch?.status),
                        statusLabel: statusLabel(batch?.status),
                      }}
                      stageUrls={{
                        choose: stageHref("choose"),
                        review: stageHref("review"),
                        complete: isTransferred ? stageHref("complete") : null,
                      }}
                      unpublishReceiptAction={unpublishDonationRedirectReceiptAction}
                      updatePlanAction={updateDonationRedirectPlanAction}
                      viewerRole={viewerRole}
                    />

                    {ownMandateForViewer?.failure_message ? (
                      <div className="status-banner status-banner-error">
                        {ownMandateForViewer.failure_message}
                      </div>
                    ) : null}
                    <div className="form-actions">
                      {canCancel ? (
                        <form action="/api/payments/conditional/mandates/cancel" method="post">
                          <input
                            name="mandate_id"
                            type="hidden"
                            value={String(ownMandateForViewer.id)}
                          />
                          <button className="button button-secondary button-mini" type="submit">
                            Revoke before capture
                          </button>
                        </form>
                      ) : null}
                      {isAdminEmail(viewer.authUser.email) && bothReady && batch?.status !== "transferred" ? (
                        <form
                          action="/api/payments/conditional/settlements/donation-offset"
                          method="post"
                        >
                          <input name="match_id" type="hidden" value={matchId} />
                          <button className="button button-secondary button-mini" type="submit">
                            Retry settlement with MFA
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <h3>No accepted donation-offset matches yet</h3>
                <p>
                  Payment authorization appears here only after a reviewed offset has two registered
                  participants and a concrete match record. Drafting an offer does not authorize a charge.
                </p>
              </div>
              <Link className="button button-primary" href="/offers/new?mode=offset">
                Draft a donation offset
              </Link>
            </div>
          )}
        </section>

        <section className="section section-subtle" aria-labelledby="payment-controls-heading">
          <SectionHeader
            eyebrow="Controls"
            id="payment-controls-heading"
            title="What this system does—and what it does not claim."
          />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Methods selected by Stripe</h3>
              <p>
                Card, Apple Pay, Google Pay, and Link appear when eligible. PayPal requires a
                supported Stripe account region and, for Connect, Stripe approval.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>No charge at setup</h3>
              <p>Stripe Checkout creates a reusable payment mandate. It does not reserve funds for months.</p>
            </article>
            <article className="panel concept-card">
              <h3>Compensated, not magically atomic</h3>
              <p>
                Payment networks cannot make two independent charges and two transfers one database
                transaction. Moral Trade uses idempotency, a settlement lock, transfer reversal, and
                compensating refunds.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>No tax claim</h3>
              <p>
                The payment ledger records operational settlement. It does not determine the donor of
                record, tax deductibility, or moral impact.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
