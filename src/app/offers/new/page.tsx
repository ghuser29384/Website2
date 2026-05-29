import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { OfferCreateForm, type OfferTemplate } from "@/components/offers/offer-create-form";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getDonationOffsetOverview, getOfferById, getViewer } from "@/lib/app-data";
import { getMoralTradeProvenanceContract } from "@/lib/moral-trade/provenance";
import { buildCreateSimilarTemplateFromLiveOffer } from "@/lib/offer-create-similar";
import { isPublicLiveOfferId } from "@/lib/offer-follows";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";

export const metadata: Metadata = {
  title: "New offer",
  robots: {
    index: false,
    follow: false,
  },
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function buildOfferCreationReturnTo(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const key of ["mode", "example", "source_offer"] as const) {
    const value = getSingleSearchParam(searchParams[key]);

    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `/offers/new?${query}` : "/offers/new";
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
  const requestedExampleId = getSingleSearchParam(resolvedSearchParams.example);
  const requestedSourceOfferId = getSingleSearchParam(resolvedSearchParams.source_offer);
  const initialExampleTemplate = getWorkedExampleTemplate(requestedExampleId);
  const offerCreationReturnTo = buildOfferCreationReturnTo(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
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
  const initialTemplate = initialExampleTemplate ?? initialLiveOfferTemplate;
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
    <div className="page-shell">
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
        <section className="section section-white">
          <div className="auth-grid">
            {viewer ? (
              <OfferCreateForm
                availablePools={availablePools}
                formMessage={formMessage}
                initialMode={initialTemplate?.mode ?? initialMode}
                initialTemplate={initialTemplate}
                initialOffsetParticipationMode={initialOffsetParticipationMode}
                initialOffsetPoolId={initialOffsetPoolId}
                initialOffsetPoolSide={initialOffsetPoolSide}
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
      </main>

      <SiteFooter />
    </div>
  );
}
