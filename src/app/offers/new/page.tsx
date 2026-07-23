import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TradeDraftSignInGate } from "@/components/core-trade/trade-draft-workbench";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  OfferCreateForm,
  type OfferTemplate,
} from "@/components/offers/offer-create-form";
import {
  getDonationOffsetOverview,
  getOfferById,
  getViewer,
} from "@/lib/app-data";
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
  const sourceOfferId = single(resolved.source_offer);
  const requestedTemplateId = single(resolved.template);
  const requestedTemplate = getReviewedMarketplaceSeedTemplate(requestedTemplateId);
  const requestedOffsetTemplate =
    requestedTemplate?.format === "donation_offset" ? requestedTemplate : null;
  const mode = single(resolved.mode);
  const isOffsetRequest = Boolean(requestedOffsetTemplate) || mode === "offset";

  if (!isOffsetRequest) {
    const destinationParams = new URLSearchParams();
    if (sourceOfferId) destinationParams.set("source_offer", sourceOfferId);

    if (example === "seed-victoria") {
      destinationParams.set("example", "seed-victoria");
    }

    if (requestedTemplate?.format === "pledge_swap") {
      destinationParams.set("template", requestedTemplate.id);
    }

    if (mode === "pool") {
      redirect("/mpgf/pools/new?template=threshold-coalition");
    }

    redirect(
      `/trades/new${destinationParams.size ? `?${destinationParams.toString()}` : ""}`,
    );
  }

  const supabaseReady = hasSupabaseEnv();
  const [viewer, sourceOffer] = await Promise.all([
    supabaseReady ? getViewer() : Promise.resolve(null),
    sourceOfferId ? getOfferById(sourceOfferId) : Promise.resolve(null),
  ]);
  const requestedParticipationModeValue = single(resolved.offset_participation_mode);
  const sourceParticipationMode =
    sourceOffer?.mode === "offset"
      ? sourceOffer.donationOffset?.participation_mode
      : undefined;
  const requestedParticipationMode =
    requestedParticipationModeValue === "direct" || requestedParticipationModeValue === "pool"
      ? requestedParticipationModeValue
      : undefined;
  const initialParticipationMode =
    requestedParticipationMode ??
    sourceParticipationMode ??
    requestedOffsetTemplate?.prefill.offset?.participationMode ??
    "direct";
  const initialPoolId =
    single(resolved.offset_pool_id) ||
    (sourceOffer?.mode === "offset" ? sourceOffer.donationOffset?.pool_id ?? "" : "");
  const requestedPoolSide = single(resolved.offset_pool_side);
  const sourcePoolSide =
    sourceOffer?.mode === "offset" && sourceOffer.donationOffset?.pool_side
      ? sourceOffer.donationOffset.pool_side === "side_a"
        ? "side_b"
        : "side_a"
      : "";
  const initialPoolSide =
    requestedPoolSide === "side_a" || requestedPoolSide === "side_b"
      ? requestedPoolSide
      : sourcePoolSide;
  const template =
    requestedOffsetTemplate
      ? requestedOffsetTemplate
      : getReviewedMarketplaceSeedTemplate(
          initialParticipationMode === "pool" ? "market-mediated" : "pure-opposed-cause",
        );

  if (!template || template.format !== "donation_offset") {
    redirect("/offers?view=templates");
  }

  const sourceCounterofferTemplate: OfferTemplate | null =
    sourceOffer?.mode === "offset"
      ? {
          title: `Counteroffer to ${sourceOffer.ownerProfile?.resolvedName ?? sourceOffer.owner_alias}`,
          description:
            "The original proposal is linked below. Its non-financial roles are reversed, while amounts remain blank so the counteroffer maker must state new terms explicitly.",
          mode: "offset",
          offeredCause: sourceOffer.requested_cause,
          requestedCause: sourceOffer.offered_cause,
          compromiseCause: sourceOffer.compromise_cause,
          offerAction: sourceOffer.request_action,
          requestAction: sourceOffer.offer_action,
          baselineStatement:
            "Without this counteroffer, the original offset remains unchanged and neither participant takes on a new commitment.",
          exitCondition:
            "Either participant may decline before acceptance. Any accepted offset must retain explicit cancellation, evidence, and unmatched-surplus terms.",
          notes: `Counteroffer to proposal ${sourceOffer.id}. Re-enter both financial amounts; no amount is inferred from the original proposal.`,
          offerImpact: String(sourceOffer.min_counterparty_impact),
          minCounterpartyImpact: String(sourceOffer.offer_impact),
          verification: sourceOffer.verification,
          duration: sourceOffer.duration,
          paymentIntervalUnit: "none",
          paymentIntervalValue: "",
          trustLevel: String(sourceOffer.trust_level),
          offset: {
            baselineAmountUsd: "",
            requestedMatchingAmountUsd: "",
            baselineOpposedCause:
              sourceOffer.donationOffset?.requested_opposed_cause ?? sourceOffer.requested_cause,
            requestedOpposedCause:
              sourceOffer.donationOffset?.baseline_opposed_cause ?? sourceOffer.offered_cause,
            participationMode: initialParticipationMode,
            compromiseDestinationId:
              sourceOffer.donationOffset?.compromise_charity_id ?? undefined,
            offsetRatio: "1",
            timeHorizon: sourceOffer.donationOffset?.time_horizon ?? "one_off",
            verificationMethod:
              sourceOffer.donationOffset?.verification_method ?? "receipts_uploaded",
            unmatchedSurplusRule:
              sourceOffer.donationOffset?.unmatched_surplus_rule ??
              "donate_to_compromise_destination",
          },
        }
      : null;
  const initialTemplate = sourceCounterofferTemplate ?? template.prefill;
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

  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  const sourceMessage =
    sourceOfferId && !sourceOffer
      ? {
          tone: "error" as const,
          text: "The source proposal is no longer available. No counteroffer terms were inferred.",
        }
      : null;
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
            <p className="eyebrow">
              {sourceCounterofferTemplate ? "Donation offset counteroffer" : "Donation offset template"}
            </p>
            <h1>{initialTemplate.title}</h1>
            <p>
              {sourceCounterofferTemplate
                ? "The source proposal is retained as context. Review the reversed actions and enter fresh amounts, destination, deadline, and evidence terms before saving."
                : "Template applied. Review and replace every factual claim, amount, destination, deadline, and evidence term before saving. Nothing is authorized by opening this draft."}
            </p>
          </div>

          <div className="auth-grid offer-create-grid">
            <OfferCreateForm
              availablePools={availablePools}
              directTemplateEntry
              formMessage={getFormMessage(resolved) ?? sourceMessage}
              initialMode="offset"
              initialOffsetParticipationMode={initialParticipationMode}
              initialOffsetPoolId={initialPoolId}
              initialOffsetPoolSide={initialPoolSide}
              initialTemplate={initialTemplate}
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
