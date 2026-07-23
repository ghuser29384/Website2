import type { Metadata } from "next";
import Link from "next/link";

import { createMatchConciergeRequestAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { formatLocation, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";
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
import {
  filterWishRegistryExamplePreviews,
  searchWishRegistryPreviews,
} from "@/lib/wish-registry";
import type { WishRegistrySearchResult } from "@/lib/wish-registry";
import {
  BACKGROUND_PUBLIC_REGISTRY_HERO,
  BACKGROUND_PUBLIC_TECHNICAL_LINKS,
} from "@/lib/background-public-pages";

export const metadata: Metadata = {
  title: "Wish registry",
  description:
    "Browse broad Moral Trade wish-profile previews while exact asks and contact details stay hidden.",
  alternates: {
    canonical: "/wish-registry",
  },
  openGraph: {
    title: "Wish registry",
    description:
      "Browse broad Moral Trade wish-profile previews while exact asks and contact details stay hidden.",
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
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const query = readParam(resolvedSearchParams, "q").trim().slice(0, 500);
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
          personalPriorities,
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
            <p className="eyebrow">Wish registry</p>
            <h1>{BACKGROUND_PUBLIC_REGISTRY_HERO}</h1>
            <p className="hero-text">
              Browse cause tags, broad trade-mode tags, and safe location hints. Exact wishes,
              private asks, and contact details stay hidden unless both sides approve more.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/wish-registry">
                Browse broad previews
              </Link>
              <Link className="button button-secondary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create profile"}
              </Link>
              <Link className="button button-secondary" href="#registry-technical-details">
                Technical details
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Privacy boundary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Broad preview only</strong>
                  <p>Cause areas, public summaries, and coarse location can be searched.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Ask to explore</strong>
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
            <h2>Browse broad previews without exposing private wishes</h2>
            <p>
              Describe a broad cause, location, participant type, or payment and pledge openness in
              ordinary language. Search operates only on opt-in public previews; exact asks, contact
              details, private text, and approval claims remain outside the query pipeline.
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
                  placeholder="e.g. civic collectives in Chicago open to pledges"
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

            <details className="details-panel">
              <summary>More filters</summary>
              <div className="details-content field-grid">
                <label className="check-row">
                  <input
                    defaultChecked={opennessToPayment}
                    name="payment"
                    type="checkbox"
                    value="1"
                  />
                  <span>Open to payment-mediated trades</span>
                </label>
                <label className="check-row">
                  <input
                    defaultChecked={opennessToPledges}
                    name="pledges"
                    type="checkbox"
                    value="1"
                  />
                  <span>Open to pledge-based trades</span>
                </label>
              </div>
            </details>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Browse previews
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
                ? "That view is too narrow for the current registry size, so previews are withheld until the search is broader."
                : "Each card is a broad preview only. Exact asks, exact wishes, and contact details stay hidden unless both sides explicitly approve the next stage."}
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
                    <span className="badge">Broad preview only</span>
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
                  <div className="offer-footer">
                    <div className="offer-actions">
                      <Link className="text-button" href={`/people/${result.profileId}`}>
                        View broad profile
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
                            value="I found this broad preview in the registry and want an operator to review whether consent-gated exploration is appropriate."
                          />
                          <input
                            name="ask_summary"
                            type="hidden"
                            value="Please check whether this broad-profile owner is open to a bounded moral trade before any exact wishes or contact details are shared."
                          />
                          <input
                            name="no_trade_baseline"
                            type="hidden"
                            value="No trade occurs; both participants keep their current plans and no private details are disclosed."
                          />
                          <button className="button button-secondary button-mini" type="submit">
                            Ask to explore
                          </button>
                        </form>
                      ) : viewer ? null : (
                        <Link
                          className="button button-secondary button-mini"
                          href="/signup?returnTo=/wish-registry"
                        >
                          Sign in to ask
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
                    <span className="badge">Broad preview only</span>
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
                    Demo preview. Exact asks, exact wishes, and contact details stay hidden unless
                    both sides explicitly approve the next stage.
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No broad previews are available for that view.</strong>
                  <p>
                    Try a wider cause term, clear a trade-mode filter, or add your own broad
                    profile from the dashboard.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
        <section className="section section-white" id="registry-technical-details">
          <details className="details-panel">
            <summary>Technical details</summary>
            <div className="details-content">
              <p>
                Registry searches use public preview fields and signed-in budget controls. Sparse
                result sets can be withheld so highly specific searches do not become a way to
                infer whether a single private profile exists.
              </p>
              <div className="hero-actions">
                {BACKGROUND_PUBLIC_TECHNICAL_LINKS.map((link) => (
                  <Link className="button button-secondary" href={link.href} key={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
