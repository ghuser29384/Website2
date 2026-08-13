import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TradeDraftSignInGate } from "@/components/core-trade/trade-draft-workbench";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { OfferCreateForm } from "@/components/offers/offer-create-form";
import { getDonationOffsetOverview, getViewer } from "@/lib/app-data";
import { isPaymentBondsEnabled } from "@/lib/baseline-bonds";
import { getFormMessage } from "@/lib/form-state";
import { getReviewedMarketplaceSeedTemplate } from "@/lib/marketplace-seed-templates";
import { getMoralTradeProvenanceContract } from "@/lib/moral-trade/provenance";
import { getPerformanceBondConfig } from "@/lib/performance-bonds";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft a donation offset",
  description:
    "Start from reviewed donation-offset terms, then edit the baseline, matched amounts, destination, evidence, deadline, and fallback rule.",
  alternates: { canonical: "/offers/new?mode=offset" },
  openGraph: {
    title: "Draft a donation offset | Moral Trade",
    description:
      "Open a prefilled donation-offset draft and review every term before saving or submitting it.",
    url: getAbsoluteUrl("/offers/new?mode=offset"),
    type: "website",
  },
};

interface OfferCreatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function OfferCreatePage({ searchParams }: OfferCreatePageProps) {
  const resolved = await searchParams;
  const example = single(resolved.example);
  const requestedTemplateId = single(resolved.template);
  const requestedTemplate = getReviewedMarketplaceSeedTemplate(requestedTemplateId);
  const requestedOffsetTemplate =
    requestedTemplate?.format === "donation_offset" ? requestedTemplate : null;
  const mode = single(resolved.mode);
  const sourceOfferId = single(resolved.source_offer);
  const isOffsetRequest = Boolean(requestedOffsetTemplate) || mode === "offset";

  if (!isOffsetRequest) {
    if (mode === "pool") {
      redirect("/mpgf/pools/new?template=threshold-coalition");
    }

    if (!sourceOfferId) {
      if (example === "seed-victoria") {
        redirect("/trades/new?example=seed-victoria");
      }
      if (requestedTemplate?.format === "pledge_swap") {
        redirect(`/trades/new?template=${encodeURIComponent(requestedTemplate.id)}`);
      }
      redirect("/trades/new");
    }

    const tradeParams = new URLSearchParams({ source_offer: sourceOfferId });
    if (example === "seed-victoria") {
      tradeParams.set("example", "seed-victoria");
    }
    if (requestedTemplate?.format === "pledge_swap") {
      tradeParams.set("template", requestedTemplate.id);
    }
    redirect(`/trades/new?${tradeParams.toString()}`);
  }

  const requestedParticipationModeValue = single(resolved.offset_participation_mode);
  const requestedParticipationMode =
    requestedParticipationModeValue === "direct" || requestedParticipationModeValue === "pool"
      ? requestedParticipationModeValue
      : undefined;
  const initialParticipationMode =
    requestedParticipationMode ?? requestedOffsetTemplate?.prefill.offset?.participationMode ?? "direct";
  const initialPoolId = single(resolved.offset_pool_id);
  const requestedPoolSide = single(resolved.offset_pool_side);
  const initialPoolSide =
    requestedPoolSide === "side_a" || requestedPoolSide === "side_b" ? requestedPoolSide : "";
  const template =
    requestedOffsetTemplate
      ? requestedOffsetTemplate
      : getReviewedMarketplaceSeedTemplate(
          initialParticipationMode === "pool" ? "market-mediated" : "pure-opposed-cause",
        );

  if (!template || template.format !== "donation_offset") {
    redirect("/offers?view=templates");
  }

  const returnParams = new URLSearchParams({
    entry: "draft",
    template: template.id,
    mode: "offset",
  });
  returnParams.set("offset_participation_mode", initialParticipationMode);
  if (initialPoolId) {
    returnParams.set("offset_pool_id", initialPoolId);
  }
  if (initialPoolSide) {
    returnParams.set("offset_pool_side", initialPoolSide);
  }
  if (sourceOfferId) {
    returnParams.set("source_offer", sourceOfferId);
  }
  const returnTo = `/offers/new?${returnParams.toString()}`;
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;

  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  const donationOffsetOverview = await getDonationOffsetOverview().catch((error: unknown) => {
    console.error("[offers/new] Donation-offset pool options could not be loaded", error);
    return null;
  });
  const availablePools =
    donationOffsetOverview?.pools.map((pool) => ({
      id: pool.id,
      name: pool.name,
      compromiseCharityId: pool.compromise_charity_id,
      compromiseCharityName: pool.compromiseCharity?.name ?? "Compromise destination",
      offsetRatio: pool.offset_ratio,
      timeHorizon: pool.time_horizon,
      verificationMethod: pool.verification_method,
      unmatchedSurplusRule: pool.unmatched_surplus_rule,
      assuranceMinimumCents: pool.assurance_minimum_cents,
      maximumCapCents: pool.maximum_cap_cents ?? 0,
      assuranceDeadlineAt: pool.assurance_deadline_at,
      sideALabel: pool.side_a_label,
      sideBLabel: pool.side_b_label,
      sideATotalCents: pool.sideATotalCents,
      sideBTotalCents: pool.sideBTotalCents,
      matchedCompromiseCents: pool.matchedCompromiseCents,
      status: pool.status,
    })) ?? [];
  const performanceBondConfig = getPerformanceBondConfig();
  const provenanceValidationRules = getMoralTradeProvenanceContract().validationRules.map((rule) => ({
    key: rule.key,
    label: rule.label,
    rule: rule.rule,
  }));

  return (
    <div className="page-shell offer-create-shell marketplace-app-shell">
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
          showSearch={false}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Donation offset template</p>
            <h1>{template.prefill.title}</h1>
            <p>
              Template applied. Review and replace every factual claim, amount, destination,
              deadline, and evidence term before saving. Nothing is authorized by opening this
              draft.
            </p>
          </div>

          <div className="auth-grid offer-create-grid">
            <OfferCreateForm
              availablePools={availablePools}
              directTemplateEntry
              formMessage={getFormMessage(resolved)}
              initialMode="offset"
              initialOffsetParticipationMode={initialParticipationMode}
              initialOffsetPoolId={initialPoolId}
              initialOffsetPoolSide={initialPoolSide}
              initialTemplate={template.prefill}
              liveBondPaymentsEnabled={performanceBondConfig.livePaymentsEnabled}
              paymentBondsEnabled={isPaymentBondsEnabled()}
              performanceBondMaxCents={performanceBondConfig.maxAmountCents}
              performanceBondMinCents={performanceBondConfig.minAmountCents}
              pledgePerformanceBondsEnabled={performanceBondConfig.enabled}
              provenanceValidationRules={provenanceValidationRules}
              supabaseReady={supabaseReady}
              templateId={template.id}
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
