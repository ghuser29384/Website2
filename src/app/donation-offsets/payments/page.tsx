import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, SectionHeader } from "@/components/ui/page-primitives";
import { isAdminEmail } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
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
  const readiness = await getConditionalPaymentReadiness();
  const supabase = createServiceClient() as any;
  const profileId = viewer.authUser.id;

  const { data: matches, error: matchesError } = await supabase
    .from("donation_offset_matches")
    .select("*")
    .or(`owner_profile_id.eq.${profileId},counterparty_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  const matchRows = (matches ?? []) as Array<Record<string, any>>;
  const matchIds = matchRows.map((match) => String(match.id));
  const offerIds = [...new Set(matchRows.map((match) => String(match.offer_id)))];

  const [offersResult, offsetsResult, mandatesResult, batchesResult] = await Promise.all([
    offerIds.length
      ? supabase.from("offers").select("*").in("id", offerIds)
      : Promise.resolve({ data: [], error: null }),
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
          .eq("livemode", readiness.livemode)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const offsetRows = (offsetsResult.data ?? []) as Array<Record<string, any>>;
  const charityIds = [...new Set(offsetRows.map((offset) => String(offset.compromise_charity_id)))];
  const { data: charities, error: charitiesError } = charityIds.length
    ? await supabase.from("registered_charities").select("*").in("id", charityIds)
    : { data: [], error: null };

  const pageErrors = [
    matchesError,
    offersResult.error,
    offsetsResult.error,
    mandatesResult.error,
    batchesResult.error,
    charitiesError,
  ]
    .filter(Boolean)
    .map((error) => error?.message)
    .filter(Boolean);

  const offersById = new Map(
    ((offersResult.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), row]),
  );
  const offsetsByOfferId = new Map(offsetRows.map((row) => [String(row.offer_id), row]));
  const charitiesById = new Map(
    ((charities ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), row]),
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
          eyebrow={readiness.livemode ? "Live conditional payments" : "Stripe test mode"}
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
            <p>
              {readiness.livemode
                ? "Live mode moves real money and uses compensating refunds rather than claiming impossible card-level atomicity."
                : "TEST MODE — Stripe test objects only. No real card charge, donation, tax receipt, or charitable transfer occurs."}
            </p>
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
            <div className="data-grid">
              {matchRows.map((match) => {
                const matchId = String(match.id);
                const offer = offersById.get(String(match.offer_id));
                const offset = offsetsByOfferId.get(String(match.offer_id));
                const charity = offset
                  ? charitiesById.get(String(offset.compromise_charity_id))
                  : null;
                const role =
                  match.owner_profile_id === profileId ? "owner" : "counterparty";
                const yourAmountCents = Number(
                  role === "owner"
                    ? match.matched_baseline_cents
                    : match.matched_counterparty_cents,
                );
                const roleMandates = latestByRole(mandatesByMatch.get(matchId) ?? []);
                const ownMandate = roleMandates.get(role);
                const ownerMandate = roleMandates.get("owner");
                const counterpartyMandate = roleMandates.get("counterparty");
                const batch = batchesByMatch.get(matchId);
                const authorizationCanBeReplaced =
                  !ownMandate ||
                  ["setup_pending", "failed", "requires_action", "cancelled"].includes(
                    String(ownMandate.status),
                  );
                const authorizationReady = ownMandate?.status === "ready";
                const canCancel =
                  ownMandate &&
                  ["setup_pending", "ready", "failed", "requires_action"].includes(
                    String(ownMandate.status),
                  );
                const bothReady =
                  ["ready", "charge_pending", "charged"].includes(String(ownerMandate?.status)) &&
                  ["ready", "charge_pending", "charged"].includes(
                    String(counterpartyMandate?.status),
                  );

                return (
                  <article className="panel data-card data-card-wide" key={matchId}>
                    <p className="detail-kicker">
                      {role === "owner" ? "Offer owner" : "Counterparty"} · match {matchId.slice(0, 8)}
                    </p>
                    <h3>{charity?.name ?? "Compromise destination unavailable"}</h3>
                    <p>
                      Your maximum conditional charge: {formatMoney(yourAmountCents)}. Combined
                      destination amount: {formatMoney(Number(match.compromise_total_cents))}.
                    </p>
                    <p>
                      Baseline: {offset?.baseline_opposed_cause ?? "Unavailable"}. Counterparty
                      baseline: {offset?.requested_opposed_cause ?? "Unavailable"}.
                    </p>
                    <p>
                      Owner mandate: {statusLabel(ownerMandate?.status)} · Counterparty mandate:{" "}
                      {statusLabel(counterpartyMandate?.status)} · Settlement:{" "}
                      {statusLabel(batch?.status)}.
                    </p>
                    {ownMandate?.condition_hash ? (
                      <p className="route-text">
                        Frozen condition: {String(ownMandate.condition_hash).slice(0, 16)}… · Terms:{" "}
                        {ownMandate.consent_terms_version}
                      </p>
                    ) : null}
                    {ownMandate?.failure_message ? (
                      <div className="status-banner status-banner-error">
                        {ownMandate.failure_message}
                      </div>
                    ) : null}

                    {readiness.canCreateMandates && (authorizationCanBeReplaced || !authorizationReady) ? (
                      <form
                        action="/api/payments/conditional/mandates/donation-offset"
                        className="form-stack"
                        method="post"
                      >
                        <input name="match_id" type="hidden" value={matchId} />
                        <input
                          name="terms_version"
                          type="hidden"
                          value={CONDITIONAL_PAYMENT_TERMS_VERSION}
                        />
                        <label className="checkbox-field">
                          <input name="consent" required type="checkbox" />
                          <span>
                            I authorize Moral Trade to save this payment method and later charge
                            exactly {formatMoney(yourAmountCents)} off-session only for the frozen
                            condition shown here. I understand the first side may be charged before
                            the second and will be refunded if paired settlement or destination
                            transfer fails. I can revoke this mandate before capture.
                          </span>
                        </label>
                        <div className="form-actions">
                          <button className="button button-primary" type="submit">
                            {ownMandate ? "Replace payment authorization" : "Authorize payment method"}
                          </button>
                        </div>
                      </form>
                    ) : authorizationReady ? (
                      <div className="status-banner">Your payment authorization is ready.</div>
                    ) : null}

                    <div className="form-actions">
                      {canCancel ? (
                        <form action="/api/payments/conditional/mandates/cancel" method="post">
                          <input name="mandate_id" type="hidden" value={String(ownMandate.id)} />
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
