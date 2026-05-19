import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getViewer, listOpenOffersPage, listOpenOffersPreview, OFFERS_PAGE_SIZE } from "@/lib/app-data";
import type { OfferRecord } from "@/lib/app-data";
import { EveryOrgDonateButton } from "@/components/donate/every-org-donate-button";
import {
  formatDonationOffsetPoolStatus,
  formatDonationOffsetRatio,
  formatDonationOffsetTimeHorizon,
  formatDonationOffsetUnmatchedRule,
  formatDonationOffsetVerificationMethod,
} from "@/lib/donation-offsets";
import { findEveryOrgTargetForCauseArea } from "@/lib/every-org";
import { FILTER_MODE_OPTIONS, formatMode, formatPaymentCadence } from "@/lib/offers";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Offers",
  description:
    "Browse public offers for moral trade: what one side will do, what it asks in return, and how the trade is checked.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "Public offers",
    description:
      "Browse public offers for moral trade: what one side will do, what it asks in return, and how the trade is checked.",
    url: getAbsoluteUrl("/offers"),
    type: "website",
  },
};

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SPOTLIGHT_CAUSES = [
  {
    label: "Animal welfare",
    matches: (cause: string) => cause.includes("animal"),
  },
  {
    label: "Existential risk",
    matches: (cause: string) =>
      cause.includes("existential") || cause.includes("x-risk") || cause.includes("xrisk"),
  },
  {
    label: "Future flourishing",
    matches: (cause: string) => cause.includes("future flourishing") || cause.includes("future"),
  },
  {
    label: "Moral status of digital minds",
    matches: (cause: string) =>
      cause.includes("digital mind") || cause.includes("digital minds") || cause.includes("moral status"),
  },
  {
    label: "Extreme power concentration",
    matches: (cause: string) => cause.includes("power concentration") || cause.includes("concentrated power"),
  },
  {
    label: "S-risks",
    matches: (cause: string) =>
      cause.includes("s-risk") || cause.includes("s-risks") || cause.includes("suffering risk"),
  },
  {
    label: "Global poverty",
    matches: (cause: string) => cause.includes("global poverty") || cause.includes("poverty"),
  },
  {
    label: "Climate",
    matches: (cause: string) => cause.includes("climate"),
  },
  {
    label: "Public health",
    matches: (cause: string) => cause.includes("public health") || cause.includes("health"),
  },
] as const;

function normalizeCause(cause: string) {
  return cause.trim().toLowerCase();
}

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseMode(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === "pledge" || rawValue === "offset" || rawValue === "payment") {
    return rawValue;
  }

  return "all" as const;
}

function getCostEfficiencyScore(offer: OfferRecord) {
  if (offer.min_counterparty_impact <= 0) {
    return offer.offer_impact;
  }

  return offer.offer_impact / offer.min_counterparty_impact;
}

function compareByCostEfficiency(left: OfferRecord, right: OfferRecord) {
  const scoreDifference = getCostEfficiencyScore(right) - getCostEfficiencyScore(left);
  if (Math.abs(scoreDifference) > 0.001) {
    return scoreDifference;
  }

  if (right.offer_impact !== left.offer_impact) {
    return right.offer_impact - left.offer_impact;
  }

  if (right.trust_level !== left.trust_level) {
    return right.trust_level - left.trust_level;
  }

  return right.created_at.localeCompare(left.created_at);
}

function buildBestOffersByCause(offers: OfferRecord[]) {
  const normalizedOffers = offers.map((offer) => ({
    offer,
    normalizedCause: normalizeCause(offer.offered_cause),
  }));

  return SPOTLIGHT_CAUSES.map((cause) => {
    const matching = normalizedOffers
      .filter((entry) => cause.matches(entry.normalizedCause))
      .map((entry) => entry.offer)
      .sort(compareByCostEfficiency);

    return {
      label: cause.label,
      offer: matching[0] ?? null,
    };
  });
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const page = parsePage(resolvedSearchParams.page);
  const mode = parseMode(resolvedSearchParams.mode);
  const offersPage = hasSupabaseEnv()
    ? await listOpenOffersPage(page, OFFERS_PAGE_SIZE, mode)
    : { items: [], page, pageSize: OFFERS_PAGE_SIZE, hasNextPage: false, hasPreviousPage: page > 1 };
  const bestOfferCandidates = hasSupabaseEnv() ? await listOpenOffersPreview(120) : [];
  const offers = offersPage.items;
  const exampleOffers = CANONICAL_WORKED_CASE_OFFERS;
  const bestOffersByCause = buildBestOffersByCause(bestOfferCandidates);
  const formMessage = getFormMessage(resolvedSearchParams);
  const offersStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Public Moral Trade offers",
    url: getAbsoluteUrl(page === 1 ? "/offers" : `/offers?page=${page}`),
    description:
      "Public offers that state proposed actions, reciprocal requests, and verification terms.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: offers.slice(0, 20).map((offer, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(`/offers/${offer.id}`),
        name: `${offer.offered_cause} for ${offer.requested_cause}`,
        description: truncateDescription(
          `${offer.offer_action} Requested in return: ${offer.request_action}`,
          140,
        ),
      })),
    },
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offersStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Public offers</p>
            <h1>Review public offers for moral trade.</h1>
            <p className="hero-text">
              Each listing states what one side will do, what it asks in return, and how the trade
              is to be checked.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup"}>
                {viewer ? "Create an offer" : "Create an account"}
              </Link>
              <Link className="button button-secondary" href="/donation-offsets">
                Donation offsets guide
              </Link>
              <Link className="button button-secondary" href={viewer ? "/dashboard" : "/login"}>
                {viewer ? "Open dashboard" : "Log in"}
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">What an offer should show</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>The act</strong>
                  <p>What one side will do.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>The reciprocal act</strong>
                  <p>What is asked in return.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>The trust terms</strong>
                  <p>How the trade is meant to be checked.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Example structures</p>
            <h2>{exampleOffers.length} worked examples show what a usable trade record looks like</h2>
            <p>
              These examples are not live offers. They show the level of specificity a published
              trade should have: the action, the reciprocal request, the cause areas, and the
              verification terms.
            </p>
          </div>

          <div className="data-grid">
            {exampleOffers.map((offer) => (
              <article className="panel data-card" key={offer.id}>
                <p className="detail-kicker">{formatMode(offer.mode)} example</p>
                <h3>{offer.alias}: {offer.offeredCause} for {offer.requestedCause}</h3>
                <p className="route-text">{offer.offerAction}</p>
                <p className="route-text">Requests in return: {offer.requestAction}</p>
                <div className="tag-row">
                  <span className="badge">{offer.offeredCause}</span>
                  <span className="badge badge-secondary">{offer.requestedCause}</span>
                  <span className="impact-pill">{offer.offerImpact}/10 offered</span>
                  <span className="impact-pill">{offer.minCounterpartyImpact}+/10 needed</span>
                  <span className="impact-pill">{offer.verification}</span>
                  <span className="impact-pill">{offer.duration}</span>
                  {formatPaymentCadence(offer) ? (
                    <span className="impact-pill">{formatPaymentCadence(offer)}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="best-offers">
          <div className="section-head">
            <p className="eyebrow">Best Offers</p>
            <h2>Most cost-efficient published offers by cause area</h2>
            <p>
              This spotlight uses the fields already stored in each offer dossier: offered impact
              divided by minimum reciprocal impact requested. It is a bounded proxy for
              cost-efficiency, not a claim of moral truth.
            </p>
          </div>

          {!hasSupabaseEnv() ? (
            <div className="status-banner status-banner-error">
              Supabase is not configured yet. Add environment variables and apply the SQL
              schema before using live offers.
            </div>
          ) : null}

          <div className="data-grid">
            {bestOffersByCause.map((entry) => {
              const donationTarget = findEveryOrgTargetForCauseArea(entry.label);

              return entry.offer ? (
                <article key={entry.label} className="panel data-card">
                  <p className="detail-kicker">{entry.label}</p>
                  <h3>{entry.offer.offered_cause} for {entry.offer.requested_cause}</h3>
                  <p className="route-text">
                    <strong>
                      {entry.offer.ownerProfile ? (
                        <Link href={`/people/${entry.offer.ownerProfile.id}`}>
                          {entry.offer.ownerProfile.resolvedName}
                        </Link>
                      ) : (
                        entry.offer.owner_alias
                      )}
                    </strong>{" "}
                    proposes: {entry.offer.offer_action}
                  </p>
                  <p className="route-text">
                    Requests in return: {entry.offer.request_action}
                  </p>
                  <div className="tag-row">
                    <span className="impact-pill">
                      {getCostEfficiencyScore(entry.offer).toFixed(2)}x offered per 1 requested
                    </span>
                    <span className="badge">{formatMode(entry.offer.mode)}</span>
                    <span className="impact-pill">{entry.offer.offer_impact}/10 offered</span>
                    <span className="impact-pill">
                      {entry.offer.min_counterparty_impact}/10 requested
                    </span>
                  </div>
                  <div className="offer-footer">
                    <div className="tag-row">
                      <span>{entry.offer.verification}</span>
                      <span>{entry.offer.duration}</span>
                      {entry.offer.mode === "payment" ? (
                        <span>{formatPaymentCadence(entry.offer)}</span>
                      ) : null}
                    </div>
                    <div className="offer-actions">
                      {donationTarget ? (
                        <EveryOrgDonateButton
                          className="button button-secondary button-mini"
                          label="Donate on Every.org"
                          target={donationTarget}
                        />
                      ) : null}
                      <Link className="text-button" href={`/offers/${entry.offer.id}`}>
                        View offer
                      </Link>
                    </div>
                  </div>
                </article>
              ) : (
                <article key={entry.label} className="panel data-card">
                  <p className="detail-kicker">{entry.label}</p>
                  <h3>No published offer yet</h3>
                  <p className="route-text">
                    No live participant offer has been published in this cause area yet. The
                    examples above show the expected shape.
                  </p>
                  <div className="offer-footer">
                    <div className="offer-actions">
                      {donationTarget ? (
                        <EveryOrgDonateButton
                          className="button button-secondary button-mini"
                          label="Donate on Every.org"
                          target={donationTarget}
                        />
                      ) : (
                        <Link className="text-button" href="/donate">
                          See donation routes
                        </Link>
                      )}
                      <Link className="text-button" href={viewer ? "/offers/new" : "/signup"}>
                        {viewer ? "Create the first offer" : "Create an account"}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Offer directory</p>
            <h2>Published proposals</h2>
            <p>
              Each card links to a fuller dossier where visitors can inspect the terms and
              signed-in users can register interest.
            </p>
          </div>

          <div className="sort-tabs">
            {FILTER_MODE_OPTIONS.map((option) => {
              const href =
                option.value === "all"
                  ? "/offers"
                  : `/offers?mode=${encodeURIComponent(option.value)}`;

              return (
                <Link
                  key={option.value}
                  className={`sort-tab ${mode === option.value ? "is-active" : ""}`}
                  href={href}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          {formMessage ? (
            <div
              className={`status-banner ${
                formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
              }`}
            >
              {formMessage.text}
            </div>
          ) : null}

          <div className="data-grid">
            {offers.length ? (
              offers.map((offer) => (
                <article key={offer.id} className="panel data-card">
                  <p className="detail-kicker">{formatMode(offer.mode)}</p>
                  <h3>{offer.offered_cause} for {offer.requested_cause}</h3>
                  <p className="route-text">
                    <strong>
                      {offer.ownerProfile ? (
                        <Link href={`/people/${offer.ownerProfile.id}`}>
                          {offer.ownerProfile.resolvedName}
                        </Link>
                      ) : (
                        offer.owner_alias
                      )}
                    </strong>{" "}
                    proposes: {offer.offer_action}
                  </p>
                  <p className="route-text">Requests in return: {offer.request_action}</p>
                  <div className="tag-row">
                    <span className="badge">{offer.offered_cause}</span>
                    <span className="badge badge-secondary">{offer.requested_cause}</span>
                    <span className="impact-pill">{offer.offer_impact}/10 offered</span>
                    <span className="impact-pill">{offer.min_counterparty_impact}+/10 needed</span>
                    <span className="impact-pill">{offer.commentCount} comments</span>
                    <span className="impact-pill">{offer.recommendationCount} recommendations</span>
                  </div>
                  <div className="offer-footer">
                    {offer.mode === "offset" && offer.donationOffset ? (
                      <div className="clean-stack">
                        <p className="route-text">
                          {offer.donationOffset.baseline_opposed_cause}: $
                          {(offer.donationOffset.baseline_amount_cents / 100).toFixed(2)} | Requests $
                          {(offer.donationOffset.requested_matching_amount_cents / 100).toFixed(2)} from{" "}
                          {offer.donationOffset.requested_opposed_cause}
                        </p>
                        <p className="route-text">
                          {offer.donationOffset.compromiseCharity?.name ?? offer.compromise_cause} |{" "}
                          {formatDonationOffsetRatio(offer.donationOffset.offset_ratio)} |{" "}
                          {formatDonationOffsetVerificationMethod(
                            offer.donationOffset.verification_method,
                          )}
                        </p>
                        <p className="route-text">
                          {formatDonationOffsetTimeHorizon(offer.donationOffset.time_horizon)} |{" "}
                          {formatDonationOffsetUnmatchedRule(
                            offer.donationOffset.unmatched_surplus_rule,
                          )}
                        </p>
                        {offer.donationOffset.participation_mode === "pool" &&
                        offer.donationOffset.pool ? (
                          <>
                            <p className="route-text">
                              Pool: <strong>{offer.donationOffset.pool.name}</strong> |{" "}
                              {formatDonationOffsetPoolStatus(offer.donationOffset.pool.progress.status)}
                            </p>
                            <p className="route-text">
                              Matched so far: $
                              {(offer.donationOffset.pool.matchedCompromiseCents / 100).toFixed(2)} |{" "}
                              {offer.donationOffset.pool.commitmentCount} commitment(s)
                            </p>
                          </>
                        ) : null}
                        {offer.donationOffset.moderation_status === "flagged" ? (
                          <p className="route-text">
                            Warning: baseline evidence is incomplete, so this offset is flagged for
                            extra scrutiny.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="tag-row">
                        <span>{offer.verification}</span>
                        <span>{offer.duration}</span>
                        {offer.mode === "payment" ? (
                          <span>{formatPaymentCadence(offer)}</span>
                        ) : null}
                      </div>
                    )}
                    <div className="offer-actions">
                      {offer.mode === "offset" ? (
                        offer.donationOffset?.participation_mode === "pool" ? (
                          <Link
                            className="button button-secondary button-mini"
                            href={`/offers/new?mode=offset&offset_participation_mode=pool&offset_pool_id=${
                              offer.donationOffset.pool_id ?? ""
                            }&offset_pool_side=${
                              offer.donationOffset.pool_side === "side_a" ? "side_b" : "side_a"
                            }`}
                          >
                            Join pool
                          </Link>
                        ) : (
                          <Link className="button button-secondary button-mini" href={`/offers/${offer.id}#respond`}>
                            Accept offset
                          </Link>
                        )
                      ) : null}
                      <Link className="text-button" href={`/offers/${offer.id}`}>
                        View offer
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>Live participant offers will appear here.</strong>
                  <p>
                    Until then, use the seeded examples above to inspect the expected offer
                    structure, then create the first live offer from an account.
                  </p>
                </div>
              </div>
            )}
          </div>

          {offersPage.hasPreviousPage || offersPage.hasNextPage ? (
            <div className="offer-actions">
              {offersPage.hasPreviousPage ? (
                <Link
                  className="button button-secondary"
                  href={`/offers?page=${offersPage.page - 1}${mode !== "all" ? `&mode=${mode}` : ""}`}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}

              {offersPage.hasNextPage ? (
                <Link
                  className="button button-secondary"
                  href={`/offers?page=${offersPage.page + 1}${mode !== "all" ? `&mode=${mode}` : ""}`}
                >
                  Next page
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
