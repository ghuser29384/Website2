import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { OfferCreateForm, type OfferTemplate } from "@/components/offers/offer-create-form";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { isPaymentBondsEnabled } from "@/lib/baseline-bonds";
import { getFormMessage } from "@/lib/form-state";
import { getDonationOffsetOverview, getOfferById, getViewer } from "@/lib/app-data";
import { getMoralTradeProvenanceContract } from "@/lib/moral-trade/provenance";
import {
  DONATION_OFFSET_PLAIN_LABELS,
  getReviewedMarketplaceSeedTemplate,
} from "@/lib/marketplace-seed-templates";
import { MARKETPLACE_INTAKE_TRIAGE_ROUTES } from "@/lib/moral-trade/marketplace-intake-triage";
import { MARKETPLACE_PUBLIC_GOODS_BOUNDARY } from "@/lib/moral-trade/marketplace-boundary";
import { buildCreateSimilarTemplateFromLiveOffer } from "@/lib/offer-create-similar";
import { isPublicLiveOfferId } from "@/lib/offer-follows";
import { getPerformanceBondConfig } from "@/lib/performance-bonds";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Draft a Moral Trade offer",
  description:
    "Draft a bounded Moral Trade proposal with explicit actions, reciprocal terms, no-trade baseline, exit conditions, and evidence rules.",
  alternates: {
    canonical: "/offers/new",
  },
  openGraph: {
    title: "Draft a Moral Trade offer",
    description:
      "Create a structured pledge swap or donation offset proposal with baselines, evidence, and review boundaries.",
    url: getAbsoluteUrl("/offers/new"),
    type: "website",
  },
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function buildOfferCreationReturnTo(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const key of ["mode", "example", "source_offer", "template"] as const) {
    const value = getSingleSearchParam(searchParams[key]);

    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `/offers/new?${query}` : "/offers/new";
}

const PARTICIPANT_SCREEN_FLOW = [
  {
    action: "Choose route",
    label: "Intake",
    summary:
      "Start by separating donation offsets and bounded pledge swaps from ordinary donations, services, self-offset bookkeeping, public-goods work, background networking, and unsupported requests.",
    title: "Route before drafting",
  },
  {
    action: "Create draft",
    label: "Template",
    summary:
      "Use reviewed donation-offset and micro-pledge defaults. Food-abstention pledges start with one meal, a few meals, one day, or a few days.",
    title: "Pick a bounded template",
  },
  {
    action: "Request review",
    label: "Preview",
    summary:
      "Compare no trade against the proposed trade, including maximum exposure, evidence burden, privacy change, deadlines, fallback, and remaining uncertainty.",
    title: "Check the draft preview",
  },
  {
    action: "Confirm locked terms",
    label: "Lock",
    summary:
      "A match candidate is not a deal. Final confirmation must show the participant-facing term sheet, exact clearing condition, payment or cancellation behavior, and disclosure state.",
    title: "Confirm only frozen terms",
  },
  {
    action: "Keep private",
    label: "Receipt",
    summary:
      "After completion, receipts stay private unless the participant opts in after verification, privacy review, claim hygiene, and correction or revocation checks.",
    title: "Share only by opt-in",
  },
] as const;

const MORAL_TRADE_TYPE_TEMPLATES: Record<string, OfferTemplate> = {
  "reciprocal-mixed": {
    title: "One-meal food-abstention pledge swap",
    description:
      "A short, reviewable food-abstention commitment in exchange for a reciprocal action.",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    compromiseCause: "Not needed",
    offerAction:
      "I will skip one covered animal-product meal after naming the meal context and an adequate substitute before lock.",
    requestAction:
      "The counterparty will make the bounded donation or pledge stated in the final preview after both sides lock terms.",
    baselineStatement:
      "Without this trade, I would eat the covered meal normally and would not make this specific micro-pledge on this date.",
    exitCondition:
      "Either side can pause before the pre-performance lock. After lock, missed self-attestation creates an unresolved record rather than a completed one.",
    notes:
      "Default to one meal, a few meals, one day, or a few days. Name covered food, adequate substitutes, health boundaries, self-attestation level, per-unit cap, and no auto rollover before relying on the pledge.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Public pledge",
    duration: "One meal",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "3",
  },
  "moral-for-prudential": {
    title: "Moral-for-prudential trade",
    description:
      "A moral agent pays or rewards a counterparty for a verified behavior change.",
    mode: "payment",
    offeredCause: "Animal welfare",
    requestedCause: "Financial support",
    compromiseCause: "Not needed",
    offerAction:
      "I will make the stated payment or reward only after the counterparty completes the verified behavior change.",
    requestAction:
      "The counterparty will adopt the specified pledge or habit change for the agreed review period.",
    baselineStatement:
      "Without this trade, I would not expect this counterparty to adopt the behavior on the stated timeline.",
    exitCondition:
      "If completion evidence is missing, disputed, or late, payment remains pending review and the trade is not marked complete.",
    notes:
      "Use this for incentive-backed moral trades. Keep payment external unless the platform explicitly supports the provider and review flow.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Payment pending verification",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
  },
  "pure-opposed-cause": {
    title: "Pure opposed-cause redirect",
    description:
      "Opposed efforts redirect into one mutually acceptable public-good destination.",
    mode: "offset",
    offeredCause: "Democracy",
    requestedCause: "Gun rights",
    compromiseCause: "Global poverty",
    offerAction:
      "I will redirect my planned opposed-cause donation into the named compromise destination if the match clears review.",
    requestAction:
      "The counterparty will redirect their planned opposed-cause donation into the same compromise destination.",
    baselineStatement:
      "Both parties should state a credible no-trade baseline for the opposed donation they would otherwise make.",
    exitCondition:
      "If the match does not clear by the deadline, the unmatched surplus rule controls and the offer remains unresolved until reviewed.",
    notes:
      "Use this for pure opposed-cause trades where two canceling efforts become one shared good. Campaign contribution offsets remain prohibited.",
    offerImpact: "7",
    minCounterpartyImpact: "7",
    verification: "Manual review required",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
    offset: {
      baselineAmountUsd: "1000",
      requestedMatchingAmountUsd: "1000",
      baselineOpposedCause: "Democracy",
      requestedOpposedCause: "Gun rights",
      participationMode: "direct",
      compromiseDestinationId: "givewell-top-charities-fund",
      offsetRatio: "1",
      timeHorizon: "one_off",
      verificationMethod: "receipts_uploaded",
      unmatchedSurplusRule: "donate_to_compromise_destination",
    },
  },
  intrapersonal: {
    title: "Intrapersonal trade",
    description:
      "A self-binding pledge bundles prudential desire with a moral concern.",
    mode: "pledge",
    offeredCause: "Climate",
    requestedCause: "Financial support",
    compromiseCause: "Climate resilience",
    offerAction:
      "I will take the lower-harm option and record the savings, inconvenience, or avoided action in a public pledge log.",
    requestAction:
      "A counterparty or reviewer will witness the pledge terms and optionally match the resulting donation or offset.",
    baselineStatement:
      "Without this pledge, I would probably choose the prudentially easier option and would not make the moral bundle explicit.",
    exitCondition:
      "If the action becomes impractical or evidence is missing, the pledge pauses rather than being counted as completed.",
    notes:
      "Use this for divided-self trades: travel versus climate, spending versus giving, convenience versus concern. Edit the witness or match request if no counterparty is needed.",
    offerImpact: "6",
    minCounterpartyImpact: "4",
    verification: "Peer witness",
    duration: "30 days",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "3",
  },
  "bargained-coordination": {
    title: "Few-day reciprocal micro-pledge sequence",
    description:
      "A capped few-day sequence with pre-performance locks, explicit substitutes, and no automatic rollover.",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Public health",
    compromiseCause: "Not needed",
    offerAction:
      "I will complete a few-day covered-food abstention sequence only after each day has a named substitute and lock confirmation.",
    requestAction:
      "The counterparty will complete the paired bounded action only for locked days that clear the self-attestation and safety checks.",
    baselineStatement:
      "Without this trade, I would not make this specific few-day abstention sequence and would not publicly claim the action.",
    exitCondition:
      "If either party misses attestation, hits a safety boundary, or rejects a day-specific lock, remaining days pause until both reconfirm.",
    notes:
      "Use this for short food-abstention sequences only. Record unit baseline, covered food, substitute, self-attestation ladder, per-unit amount band, sequence cap, and public receipt opt-in status. Thirty-day or longer pledges require manual exception review.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Peer witness",
    duration: "A few days",
    paymentIntervalUnit: "day",
    paymentIntervalValue: "1",
    trustLevel: "3",
  },
  "lottery-mediated": {
    title: "Lottery-mediated trade",
    description:
      "A public random draw chooses among acceptable projects according to agreed probabilities.",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    compromiseCause: "Future flourishing",
    offerAction:
      "I will honor the project selected by the agreed randomization rule and provide evidence after the draw.",
    requestAction:
      "The counterparty will accept the same probability rule and honor the selected project if their side wins the draw.",
    baselineStatement:
      "Without the lottery, the parties would stay stuck between projects and no mutually acceptable deterministic choice would clear.",
    exitCondition:
      "If the randomization method is not public, reproducible, or accepted before the draw, the trade expires unresolved.",
    notes:
      "Use this when chance can bridge a disagreement that certainty cannot. State the draw method, weights, seed, deadline, and evidence.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Evidence-gated",
    duration: "30 days",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
  },
  "side-payment": {
    title: "Side-payment trade",
    description:
      "Compensation moves a project across the counterparty's acceptability boundary.",
    mode: "payment",
    offeredCause: "Public health",
    requestedCause: "Financial support",
    compromiseCause: "Not needed",
    offerAction:
      "I will provide the stated side payment or compensation after the counterparty completes the agreed project support.",
    requestAction:
      "The counterparty will support, refrain from blocking, or participate in the specified project once compensation terms are accepted.",
    baselineStatement:
      "Without the side payment, the project would remain outside the counterparty's acceptable set.",
    exitCondition:
      "If payment evidence, project completion evidence, or consent is missing, the trade remains unresolved pending review.",
    notes:
      "Use this for compensation-backed cooperation without claiming the parties have the same moral values.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Payment pending verification",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
  },
  "market-mediated": {
    title: "Market-mediated moral barter",
    description:
      "A pooled or auditable offer lets many counterparties clear moral barter at a shared ratio.",
    mode: "offset",
    offeredCause: "Democracy",
    requestedCause: "Gun rights",
    compromiseCause: "Global poverty",
    offerAction:
      "I will join the clearing pool on my side and redirect the matched amount if the pool reaches its review threshold.",
    requestAction:
      "Counterparties on the other side will join the same clearing layer and redirect matched amounts under the published ratio.",
    baselineStatement:
      "The pool only counts commitments tied to genuine baseline intentions and reviewable external evidence.",
    exitCondition:
      "If the clearing threshold is not reached by the deadline, the pool closes or follows its published unmatched-surplus rule.",
    notes:
      "Use this for market-mediated moral barter: offers, ratios, receipts, and residual unmatched flows should be auditable.",
    offerImpact: "7",
    minCounterpartyImpact: "7",
    verification: "Manual review required",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
    offset: {
      baselineAmountUsd: "500",
      requestedMatchingAmountUsd: "500",
      baselineOpposedCause: "Democracy",
      requestedOpposedCause: "Gun rights",
      participationMode: "pool",
      compromiseDestinationId: "givewell-top-charities-fund",
      offsetRatio: "1",
      timeHorizon: "one_off",
      verificationMethod: "receipts_uploaded",
      unmatchedSurplusRule: "donate_to_compromise_destination",
    },
  },
};

function getMoralTradeTypeTemplate(templateId: string | undefined): OfferTemplate | null {
  if (!templateId) {
    return null;
  }

  const reviewedSeedTemplate = getReviewedMarketplaceSeedTemplate(templateId);

  if (reviewedSeedTemplate) {
    return reviewedSeedTemplate.prefill;
  }

  return MORAL_TRADE_TYPE_TEMPLATES[templateId] ?? null;
}

function getWorkedExampleTemplate(exampleId: string | undefined): OfferTemplate | null {
  if (!exampleId) {
    return null;
  }

  const offer = CANONICAL_WORKED_CASE_OFFERS.find((entry) => entry.id === exampleId);

  if (!offer) {
    return null;
  }

  return {
    title: `Clone ${offer.alias}`,
    description: `Prefilled from worked example ${offer.id}.`,
    mode: offer.mode,
    offeredCause: offer.offeredCause,
    requestedCause: offer.requestedCause,
    compromiseCause: offer.compromiseCause,
    offerAction: offer.offerAction,
    requestAction: offer.requestAction,
    baselineStatement:
      offer.mode === "offset"
        ? "I have a real baseline intention matching the opposed donation described below; this clone must be edited before publication."
        : "Without this trade, I would not expect this specific reciprocal action to happen on the stated timeline.",
    exitCondition:
      "If evidence is missing, either side declines, or the facts differ from the worked example, the proposal stays unresolved until edited or reviewed.",
    notes: `${offer.notes}\n\nCloned from worked example ${offer.id}. Edit amounts, dates, evidence, and counterparties before publishing.`,
    offerImpact: String(offer.offerImpact),
    minCounterpartyImpact: String(offer.minCounterpartyImpact),
    verification: offer.verification,
    duration: offer.duration,
    paymentIntervalUnit: offer.paymentIntervalUnit,
    paymentIntervalValue: String(offer.paymentIntervalValue ?? 1),
    trustLevel: String(offer.trustLevel),
    offset:
      offer.mode === "offset"
        ? {
            baselineAmountUsd: String(offer.baselineAmountUsd ?? 1000),
            requestedMatchingAmountUsd: String(offer.requestedMatchingAmountUsd ?? 1000),
            baselineOpposedCause: offer.baselineOpposedCause,
            requestedOpposedCause: offer.requestedOpposedCause,
            participationMode: offer.offsetParticipationMode,
            compromiseDestinationId: offer.compromiseDestinationId,
            offsetRatio: String(offer.offsetRatio ?? 1),
            timeHorizon: offer.offsetTimeHorizon,
            verificationMethod: offer.offsetVerificationMethod,
            unmatchedSurplusRule: offer.unmatchedSurplusRule,
          }
        : undefined,
  };
}

async function getLiveOfferTemplate(sourceOfferId: string | undefined): Promise<OfferTemplate | null> {
  if (!sourceOfferId || !isPublicLiveOfferId(sourceOfferId)) {
    return null;
  }

  const offer = await getOfferById(sourceOfferId);

  if (!offer || offer.status !== "open") {
    return null;
  }

  return buildCreateSimilarTemplateFromLiveOffer(offer);
}

interface NewOfferPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewOfferPage({ searchParams }: NewOfferPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const initialMode =
    typeof resolvedSearchParams.mode === "string" &&
    (resolvedSearchParams.mode === "pledge" ||
      resolvedSearchParams.mode === "offset" ||
      resolvedSearchParams.mode === "payment")
      ? resolvedSearchParams.mode
      : "pledge";
  const initialOffsetParticipationMode =
    typeof resolvedSearchParams.offset_participation_mode === "string" &&
    (resolvedSearchParams.offset_participation_mode === "direct" ||
      resolvedSearchParams.offset_participation_mode === "pool")
      ? resolvedSearchParams.offset_participation_mode
      : "direct";
  const initialOffsetPoolId =
    getSingleSearchParam(resolvedSearchParams.offset_pool_id) ?? "";
  const initialOffsetPoolSide =
    typeof resolvedSearchParams.offset_pool_side === "string" &&
    (resolvedSearchParams.offset_pool_side === "side_a" ||
      resolvedSearchParams.offset_pool_side === "side_b")
      ? resolvedSearchParams.offset_pool_side
      : "";
  const requestedTemplateId = getSingleSearchParam(resolvedSearchParams.template);
  const requestedExampleId = getSingleSearchParam(resolvedSearchParams.example);
  const requestedSourceOfferId = getSingleSearchParam(resolvedSearchParams.source_offer);
  const initialMoralTradeTypeTemplate = getMoralTradeTypeTemplate(requestedTemplateId);
  const initialExampleTemplate = getWorkedExampleTemplate(requestedExampleId);
  const offerCreationReturnTo = buildOfferCreationReturnTo(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const paymentBondsEnabled = isPaymentBondsEnabled();
  const performanceBondConfig = getPerformanceBondConfig();
  const provenanceContract = getMoralTradeProvenanceContract();
  const provenanceValidationRules = provenanceContract.validationRules.map((rule) => ({
    key: rule.key,
    label: rule.label,
    rule: rule.rule,
  }));
  const viewer = supabaseReady ? await getViewer() : null;
  const initialLiveOfferTemplate = viewer
    ? await getLiveOfferTemplate(requestedSourceOfferId)
    : null;
  const initialTemplate =
    initialMoralTradeTypeTemplate ?? initialExampleTemplate ?? initialLiveOfferTemplate;
  const signedOutOffsetPreviewTemplate =
    !viewer && (initialTemplate?.mode === "offset" || initialMode === "offset")
      ? initialTemplate?.mode === "offset"
        ? initialTemplate
        : getMoralTradeTypeTemplate("pure-opposed-cause")
      : null;
  const donationOffsetOverview = supabaseReady && viewer ? await getDonationOffsetOverview() : null;
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

  return (
    <div className="page-shell offer-create-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Offer creation</p>
            <h1>Draft one bounded, reviewable trade.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This page writes to the
                  shared record and asks you to state the act, reciprocal terms, no-trade
                  baseline, exit condition, and evidence rule plainly.
                </>
              ) : (
                <>Create an account to save and publish a structured trade proposal.</>
              )}
            </p>
            {!viewer ? (
              <div className="hero-actions">
                <Link className="button button-primary" href={`/signup?returnTo=${encodeURIComponent(offerCreationReturnTo)}`}>
                  Create account
                </Link>
                <Link className="button button-secondary" href={`/login?returnTo=${encodeURIComponent(offerCreationReturnTo)}`}>
                  Sign in
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Publishing guidelines</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Be concrete</strong>
                  <p>Describe the action you will take or fund, and the action you want in return.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Name the baseline</strong>
                  <p>Explain the no-trade default so counterfactual trust can be reviewed.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Keep it bounded</strong>
                  <p>State evidence, expiry, and what happens when proof remains unresolved.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-subtle" aria-labelledby="marketplace-intake-triage-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Marketplace intake triage</p>
            <h2 id="marketplace-intake-triage-heading">Route the request before drafting terms.</h2>
            <p>
              This page is for reviewed non-public-goods donation offsets and bounded pledge swaps.
              Public-goods CRECM work, ordinary paid services, autonomous outreach, and unsafe or
              pressure-bearing requests route elsewhere.
            </p>
          </div>
          <div className="teaser-grid">
            {MARKETPLACE_INTAKE_TRIAGE_ROUTES.map((route) => (
              <Link
                className="panel teaser-card"
                data-intake-route={route.key}
                data-route-eligible={route.routeEligible ? "true" : "false"}
                href={route.href}
                key={route.key}
              >
                <span className="detail-kicker">{route.status}</span>
                <h3>{route.label}</h3>
                <p>{route.summary}</p>
                <p className="panel-note">Next action: {route.nextAction}</p>
                <p className="panel-note">Correction path: {route.correctionPath}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="participant-screen-flow-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Participant flow</p>
            <h2 id="participant-screen-flow-heading">One primary action at each stage.</h2>
            <p>
              Drafting stays non-binding until a reviewed matched-trade lock proposal is shown and
              the participant separately confirms the frozen terms.
            </p>
          </div>
          <div className="teaser-grid">
            {PARTICIPANT_SCREEN_FLOW.map((step) => (
              <article className="panel teaser-card" key={step.label}>
                <span className="detail-kicker">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.summary}</p>
                <p className="panel-note">Primary action: {step.action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="auth-grid offer-create-grid">
            {signedOutOffsetPreviewTemplate ? (
              <article
                aria-labelledby="signed-out-offset-preview-heading"
                className="panel auth-side-card"
                data-signed-out-offset-preview="true"
              >
                <p className="eyebrow">Local offset preview</p>
                <h2 id="signed-out-offset-preview-heading">
                  Preview the donation-offset shape before sign-in.
                </h2>
                <p>
                  Signed-out users can inspect the offset shape here. Sign-in is required before
                  saving, publishing, requesting review, disclosing counterparties, authorizing
                  money, or creating a live offer.
                </p>
                <dl className="mpgf-summary-grid" aria-label="Donation offset local preview">
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[0]}</dt>
                    <dd>{signedOutOffsetPreviewTemplate.baselineStatement}</dd>
                  </div>
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[1]}</dt>
                    <dd>
                      {signedOutOffsetPreviewTemplate.offset
                        ? `$${signedOutOffsetPreviewTemplate.offset.baselineAmountUsd} matched at ${signedOutOffsetPreviewTemplate.offset.offsetRatio}:1`
                        : "Amount and ratio are set in the signed-in draft."}
                    </dd>
                  </div>
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[2]}</dt>
                    <dd>{signedOutOffsetPreviewTemplate.compromiseCause}</dd>
                  </div>
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[3]}</dt>
                    <dd>{signedOutOffsetPreviewTemplate.description}</dd>
                  </div>
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[4]}</dt>
                    <dd>{signedOutOffsetPreviewTemplate.verification}</dd>
                  </div>
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[5]}</dt>
                    <dd>{signedOutOffsetPreviewTemplate.duration}</dd>
                  </div>
                  <div>
                    <dt>{DONATION_OFFSET_PLAIN_LABELS[6]}</dt>
                    <dd>{signedOutOffsetPreviewTemplate.exitCondition}</dd>
                  </div>
                </dl>
                <details className="pilot-note">
                  <summary>What stays blocked while signed out</summary>
                  <p>
                    This preview cannot create reliance, contact a counterparty, disclose private
                    terms, reserve commitments, capture money, or publish an offer. It is only a
                    plain-language draft preview.
                  </p>
                </details>
                <div className="hero-actions">
                  <Link className="button button-primary" href={`/signup?returnTo=${encodeURIComponent(offerCreationReturnTo)}`}>
                    Save after sign-in
                  </Link>
                </div>
              </article>
            ) : null}

            {viewer ? (
              <OfferCreateForm
                availablePools={availablePools}
                formMessage={formMessage}
                initialMode={initialTemplate?.mode ?? initialMode}
                initialTemplate={initialTemplate}
                initialOffsetParticipationMode={initialOffsetParticipationMode}
                initialOffsetPoolId={initialOffsetPoolId}
                initialOffsetPoolSide={initialOffsetPoolSide}
                paymentBondsEnabled={paymentBondsEnabled}
                pledgePerformanceBondsEnabled={performanceBondConfig.enabled}
                liveBondPaymentsEnabled={performanceBondConfig.livePaymentsEnabled}
                performanceBondMinCents={performanceBondConfig.minAmountCents}
                performanceBondMaxCents={performanceBondConfig.maxAmountCents}
                supabaseReady={supabaseReady}
                provenanceValidationRules={provenanceValidationRules}
              />
            ) : (
              <article className="panel auth-side-card auth-gate-card">
                <p className="eyebrow">Account required</p>
                <h2>Create an account to save and publish a structured trade proposal.</h2>
                <p>
                  You can browse worked examples without signing in. Publishing a live offer needs
                  an account so the proposal can be saved, reviewed, edited, and returned to after
                  sign-in.
                </p>
                <div className="hero-actions">
                  <Link className="button button-primary" href={`/signup?returnTo=${encodeURIComponent(offerCreationReturnTo)}`}>
                    Create account
                  </Link>
                  <Link className="button button-secondary" href={`/login?returnTo=${encodeURIComponent(offerCreationReturnTo)}`}>
                    Sign in
                  </Link>
                </div>
              </article>
            )}

            <article className="panel auth-side-card">
              <p className="eyebrow">Current account</p>
              <div className="clean-stack">
                {viewer ? (
                  <div>
                    <h3>{viewer.displayName}</h3>
                    <p>{viewer.profile.email}</p>
                  </div>
                ) : (
                  <div>
                    <h3>Signed out</h3>
                    <p>Return to this page after account creation to publish the proposal.</p>
                  </div>
                )}
                <div>
                  <h3>Where this appears</h3>
                  <p>Your display name is saved as the visible alias on public offsets and pledge swaps.</p>
                </div>
                <div>
                  <h3>Next step</h3>
                  <p>Offsets with risk signals stay paused for review; paid action offers are deferred from the public creation path.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="public-receipt-preview-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Public receipt preview</p>
            <h2 id="public-receipt-preview-heading">Receipts are private by default and opt-in only.</h2>
            <p>
              A public receipt card can summarize a reviewed donation offset or pledge swap after
              final-lock evidence review, but it is not a ranking, badge, objective moral
              endorsement, tax record, or platform preference over direct donation.
            </p>
          </div>
          <div className="teaser-grid">
            <article className="panel teaser-card">
              <span className="detail-kicker">Default</span>
              <h3>Private preview</h3>
              <p>
                Participants see the receipt preview before publication. Public display requires
                explicit opt-in, reviewer approval, and a verification URL.
              </p>
            </article>
            <article className="panel teaser-card">
              <span className="detail-kicker">Claim hygiene</span>
              <h3>No ranking or endorsement</h3>
              <p>
                Receipt copy must avoid leaderboards, gamification, objective moral endorsement,
                and claims that Moral Trade prefers the trade over direct donation.
              </p>
            </article>
            <article className="panel teaser-card">
              <span className="detail-kicker">Privacy</span>
              <h3>Sensitive action redaction</h3>
              <p>
                Exact wishes, private notes, raw evidence, contact details, and sensitive action
                details stay out of public receipt cards.
              </p>
            </article>
            <article className="panel teaser-card">
              <span className="detail-kicker">Control</span>
              <h3>Correction and revocation</h3>
              <p>
                Public receipt cards need net attribution notes and a correction or revocation path
                if claim copy, evidence status, or participant consent changes.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
