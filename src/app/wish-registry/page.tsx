import type { Metadata } from "next";
import Link from "next/link";

import { createMatchConciergeRequestAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { formatLocation, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  countRegistrySearchSpecificity,
  getBackgroundQueryFingerprint,
  shouldApplySparseResultPrivacyFloor,
} from "@/lib/background-query-budget";
import {
  completeBackgroundQueryEvent,
  recordBackgroundQueryRiskSignal,
  reserveBackgroundQueryBudget,
} from "@/lib/background-operations";
import { createServiceClient } from "@/lib/supabase/server";
import { filterWishRegistryExamplePreviews, searchWishRegistryPreviews } from "@/lib/wish-registry";
import type { WishRegistrySearchResult } from "@/lib/wish-registry";

export const metadata: Metadata = {
  title: "Experimental wish registry",
  description:
    "Search broad Moral Trade wish-profile previews without exposing exact wishes, asks, contact details, or private source records.",
  alternates: {
    canonical: "/wish-registry",
  },
  openGraph: {
    title: "Wish registry",
    description:
      "Search broad Moral Trade wish-profile previews without exposing exact wishes, asks, contact details, or private source records.",
    url: getAbsoluteUrl("/wish-registry"),
    type: "website",
  },
};

interface WishRegistryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const EXAMPLE_WISH_PREVIEWS = [
  {
    id: "example-animal-poverty",
    participantKind: "individual",
    name: "Animal welfare and poverty donor",
    preview:
      "Interested in reciprocal pledge swaps between animal welfare actions and evidence-backed global poverty donations.",
    causes: ["Animal welfare", "Global poverty"],
    location: "Public preview",
    openness: ["Payment-open", "Pledge-open"],
  },
  {
    id: "example-xrisk-public-health",
    participantKind: "collective",
    name: "Risk and health working group",
    preview:
      "Looking for counterparties who value public health, biosecurity, and institution-building enough to test shared moral public goods.",
    causes: ["Existential risk", "Public health", "Institutions"],
    location: "Remote",
    openness: ["Pledge-open"],
  },
  {
    id: "example-climate-community",
    participantKind: "individual",
    name: "Climate and community-service participant",
    preview:
      "Open to bounded trades pairing climate-friendly habit changes with local public-health or community-service commitments.",
    causes: ["Climate", "Public health", "Community service"],
    location: "Regional preview",
    openness: ["Pledge-open"],
  },
] as const;

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readFlag(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  return readParam(searchParams, key) === "1";
}

function getResultLocation(result: WishRegistrySearchResult) {
  return formatLocation(result.locationCity, result.locationRegion) || "Location not listed";
}

export default async function WishRegistryPage({ searchParams }: WishRegistryPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const query = readParam(resolvedSearchParams, "q");
  const cause = readParam(resolvedSearchParams, "cause");
  const opennessToPayment = readFlag(resolvedSearchParams, "payment");
  const opennessToPledges = readFlag(resolvedSearchParams, "pledges");
  const hasFilters = Boolean(query || cause || opennessToPayment || opennessToPledges);
  let results: WishRegistrySearchResult[] = [];
  let searchError = "";
  let sparsePrivacyFloorApplied = false;
  const examplePreviews = filterWishRegistryExamplePreviews(EXAMPLE_WISH_PREVIEWS, {
    cause,
    opennessToPayment,
    opennessToPledges,
    query,
  });
  const registrySpecificity = countRegistrySearchSpecificity({
    cause,
    opennessToPayment,
    opennessToPledges,
    query,
  });

  if (hasSupabaseEnv()) {
    try {
      let serviceClient: ReturnType<typeof createServiceClient> | null = null;
      let budgetReservation:
        | Awaited<ReturnType<typeof reserveBackgroundQueryBudget>>
        | null = null;

      if (viewer) {
        try {
          serviceClient = createServiceClient();
          budgetReservation = await reserveBackgroundQueryBudget({
            metadata: { route: "/wish-registry" },
            profileId: viewer.authUser.id,
            queryFingerprint: getBackgroundQueryFingerprint({
              cause,
              opennessToPayment,
              opennessToPledges,
              query,
              route: "/wish-registry",
            }),
            scope: "registry_search",
            supabase: serviceClient,
          });

          if (budgetReservation.limited) {
            await recordBackgroundQueryRiskSignal({
              eventId: budgetReservation.eventId,
              metadata: {
                limit: budgetReservation.limit,
                route: "/wish-registry",
                used: budgetReservation.used,
              },
              profileId: viewer.authUser.id,
              signalType: "background_query_budget_pressure",
              summary:
                "Registry page search was blocked because this profile reached its daily background query budget.",
              supabase: serviceClient,
            });
            searchError =
              "Daily registry search budget reached. Try again after the budget window resets.";
          }
        } catch {
          serviceClient = null;
        }
      }

      if (!budgetReservation?.limited) {
        results = await searchWishRegistryPreviews({
          cause,
          limit: 24,
          opennessToPayment,
          opennessToPledges,
          query,
        });
      }
      sparsePrivacyFloorApplied = shouldApplySparseResultPrivacyFloor({
        resultCount: results.length,
        specificity: registrySpecificity,
      });

      if (serviceClient && budgetReservation) {
        await completeBackgroundQueryEvent({
          candidateCount: results.length,
          eventId: budgetReservation.eventId,
          metadata: {
            floorApplied: sparsePrivacyFloorApplied,
            resultBucket: results.length >= 10 ? "10+" : String(results.length),
            route: "/wish-registry",
            specificity: registrySpecificity,
          },
          resultCount: sparsePrivacyFloorApplied ? 0 : results.length,
          supabase: serviceClient,
        });

        if (sparsePrivacyFloorApplied && viewer) {
          await recordBackgroundQueryRiskSignal({
            eventId: budgetReservation.eventId,
            metadata: {
              route: "/wish-registry",
              specificity: registrySpecificity,
            },
            profileId: viewer.authUser.id,
            severity: "low",
            signalType: "sparse_registry_search",
            summary:
              "A highly specific registry page search returned too few broad previews, so results were withheld to reduce enumeration risk.",
            supabase: serviceClient,
          });
        }
      }

      if (sparsePrivacyFloorApplied) {
        results = [];
      }
    } catch (error) {
      searchError = error instanceof Error ? error.message : "Registry search failed.";
    }
  }

  const registryStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade wish registry",
    url: getAbsoluteUrl("/wish-registry"),
    description:
      "A broad-preview registry for privacy-preserving Moral Trade wishes and possible counterparties.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: results.slice(0, 20).map((result, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(`/people/${result.profileId}`),
        name: result.collectiveName ?? result.participantKind,
        description: result.publicPreview ?? "Broad wish-profile preview",
      })),
    },
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(registryStructuredData),
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
            <p className="eyebrow">Experimental wish registry</p>
            <h1>Search broad previews first.</h1>
            <p className="hero-text">
              Search broad previews first; exact asks and contact details require mutual consent.
              This prototype searches public preview fields only.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/people">
                Browse people
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Privacy boundary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Broad preview</strong>
                  <p>Cause areas, public summaries, and coarse location can be searched.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Consent before specifics</strong>
                  <p>Specific asks and contact details require explicit grants from participants.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Search</p>
            <h2>Find possible counterparties without exposing private wishes</h2>
            <p>
              Use a cause area, keyword query, or openness filter. Results are ranked by cause
              overlap, shared query terms, and payment/pledge openness.
            </p>
          </div>

          {!hasSupabaseEnv() ? (
            <div className="status-banner status-banner-error">
              Supabase is not configured yet. Add environment variables and apply the SQL schema
              before using the live registry.
            </div>
          ) : null}

          {searchError ? (
            <div className="status-banner status-banner-error">{searchError}</div>
          ) : null}

          <form action="/wish-registry" className="panel stack-form registry-search-form" method="get">
            <div className="field-grid">
              <label className="field">
                <span>Keyword search</span>
                <input
                  defaultValue={query}
                  name="q"
                  placeholder="vegetarian trial, digital minds, public health"
                  type="text"
                />
              </label>
              <label className="field">
                <span>Cause area</span>
                <input
                  defaultValue={cause}
                  name="cause"
                  placeholder="Animal welfare, S-risks, climate"
                  type="text"
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="check-row">
                <input
                  defaultChecked={opennessToPayment}
                  name="payment"
                  type="checkbox"
                  value="1"
                />
                <span>Only show previews open to payment-mediated trades</span>
              </label>
              <label className="check-row">
                <input
                  defaultChecked={opennessToPledges}
                  name="pledges"
                  type="checkbox"
                  value="1"
                />
                <span>Only show previews open to pledge-based trades</span>
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Search registry
              </button>
              {hasFilters ? (
                <Link className="button button-secondary" href="/wish-registry">
                  Clear filters
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Results</p>
            <h2>{hasFilters ? "Matching broad previews" : "Recent broad previews"}</h2>
            <p>
              {sparsePrivacyFloorApplied
                ? "That search was too specific for the current registry size, so results are withheld until the query is broader."
                : "Each card links to the public profile. Private details remain hidden until both sides consent to an introduction."}
            </p>
          </div>

          <div className="data-grid">
            {results.length ? (
              results.map((result) => (
                <article className="panel data-card" key={result.profileId}>
                  <div className="profile-card-head">
                    <div>
                      <p className="detail-kicker">{result.participantKind}</p>
                      <h3>{result.collectiveName || "Individual participant"}</h3>
                    </div>
                    <span className="badge">{result.score} match score</span>
                  </div>
                  <p className="route-text">
                    {result.publicPreview || "This participant has shared broad causes only."}
                  </p>
                  <div className="tag-row">
                    <span className="source-pill">{getResultLocation(result)}</span>
                    <span className="source-pill">{result.privacyStage}</span>
                    {result.opennessToPayment ? (
                      <span className="impact-pill">Payment-open</span>
                    ) : null}
                    {result.opennessToPledges ? (
                      <span className="impact-pill">Pledge-open</span>
                    ) : null}
                  </div>
                  {result.causes.length ? (
                    <div className="tag-row">
                      {result.causes.slice(0, 5).map((entry) => (
                        <span className="badge badge-secondary" key={`${result.profileId}-${entry}`}>
                          {entry}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {result.sharedTokens.length ? (
                    <p className="panel-note">
                      Broad language overlap count: {result.sharedTokens.length}
                    </p>
                  ) : null}
                  <div className="offer-footer">
                    <div className="offer-actions">
                      <Link className="text-button" href={`/people/${result.profileId}`}>
                        View public profile
                      </Link>
                      {viewer && viewer.authUser.id !== result.profileId ? (
                        <form action={createMatchConciergeRequestAction} className="compact-form">
                          <input name="return_to" type="hidden" value="/wish-registry" />
                          <input name="target_profile_id" type="hidden" value={result.profileId} />
                          <input
                            name="target_preview"
                            type="hidden"
                            value={result.publicPreview ?? ""}
                          />
                          <input
                            name="cause_areas_json"
                            type="hidden"
                            value={JSON.stringify(result.causes)}
                          />
                          <input name="route" type="hidden" value="private_match" />
                          <input
                            name="intent_summary"
                            type="hidden"
                            value="I found this broad preview in the registry and want an operator to review whether a consent-gated introduction is appropriate."
                          />
                          <input
                            name="ask_summary"
                            type="hidden"
                            value="Please check whether this possible counterparty is open to a bounded moral trade before any exact wishes or contact details are shared."
                          />
                          <input
                            name="no_trade_baseline"
                            type="hidden"
                            value="No trade occurs; both participants keep their current plans and no private details are disclosed."
                          />
                          <button className="button button-secondary button-mini" type="submit">
                            Request concierge intro
                          </button>
                        </form>
                      ) : viewer ? null : (
                        <Link
                          className="button button-secondary button-mini"
                          href="/signup?returnTo=/wish-registry"
                        >
                          Sign in for intro
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : examplePreviews.length ? (
              examplePreviews.map((preview) => (
                <article className="panel data-card" key={preview.id}>
                  <div className="profile-card-head">
                    <div>
                      <p className="detail-kicker">{preview.participantKind} example</p>
                      <h3>{preview.name}</h3>
                    </div>
                    <span className="badge">Example preview</span>
                  </div>
                  <p className="route-text">{preview.preview}</p>
                  <div className="tag-row">
                    <span className="source-pill">{preview.location}</span>
                    {preview.openness.map((entry) => (
                      <span className="impact-pill" key={`${preview.id}-${entry}`}>{entry}</span>
                    ))}
                  </div>
                  <div className="tag-row">
                    {preview.causes.map((entry) => (
                      <span className="badge badge-secondary" key={`${preview.id}-${entry}`}>
                        {entry}
                      </span>
                    ))}
                  </div>
                  <p className="panel-note">
                    Demo preview. Exact asks and contact details require mutual consent before
                    disclosure.
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No broad previews matched.</strong>
                  <p>
                    Try a wider cause term, clear an openness filter, or add your own wish
                    profile from the dashboard.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
