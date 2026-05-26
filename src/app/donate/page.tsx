import type { Metadata } from "next";
import Link from "next/link";

import { EveryOrgDonateButton } from "@/components/donate/every-org-donate-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  EVERY_ORG_CURATED_TARGETS,
  EVERY_ORG_UNCURATED_CAUSES,
  getEveryOrgLearnMoreHref,
} from "@/lib/every-org";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Donate directly through Every.org from Moral Trade. Use verified Every.org routes for selected cause areas, then record the gift in your Moral Trade workflow if needed.",
  alternates: {
    canonical: "/donate",
  },
  openGraph: {
    title: "Donate through Every.org",
    description:
      "Use verified Every.org donation routes from inside Moral Trade for selected cause areas.",
    url: getAbsoluteUrl("/donate"),
    type: "website",
  },
};

interface DonatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getDonationLogHref(targetId: string, causeAreas: readonly string[]) {
  const params = new URLSearchParams({
    source: "every.org",
    target: targetId,
    cause: causeAreas[0] ?? "Donation",
  });

  return `/priority-correction-fund?${params.toString()}#record-gift`;
}

function getSignedDonationLogHref(
  targetId: string,
  causeAreas: readonly string[],
  isAuthenticated: boolean,
) {
  const logHref = getDonationLogHref(targetId, causeAreas);

  return isAuthenticated ? logHref : `/login?returnTo=${encodeURIComponent(logHref)}`;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const returnedTarget = readParam(resolvedSearchParams.target);

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
            <p className="eyebrow">Donate</p>
            <h1>Donate directly through Every.org.</h1>
            <p className="hero-text">
              These buttons open Every.org&apos;s donation flow for a small set of verified public
              funds and recipients that fit major cause areas already used on Moral Trade.
            </p>
            <p className="hero-followup">
              Use this page when you want a straightforward giving route inside the platform.
              If you also want the gift reflected in your Priority Correction Fund history, log
              it afterward on{" "}
              <Link className="inline-link" href="/priority-correction-fund">
                the Priority Correction Fund page
              </Link>
              .
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/priority-correction-fund">
                Open Priority Fund
              </Link>
              <Link className="button button-secondary" href="/donation-offsets">
                Review donation offsets
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">How this works</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Choose a route</strong>
                  <p>Pick a verified Every.org destination that roughly matches your cause area.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Donate securely</strong>
                  <p>Every.org handles the donation flow and the supported payment options for that recipient.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Record it if needed</strong>
                  <p>Log the gift on Moral Trade when you want it reflected in site governance and public reasoning.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {returnedTarget ? (
          <div className="status-banner status-banner-success">
            Ready to log a donation route for {returnedTarget}. Use the matching record link below
            if this gift should count toward a Moral Trade workflow.
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Direct routes</p>
            <h2>Verified Every.org donation buttons</h2>
            <p>
              These are starting points, not exhaustive endorsements. We configured only routes we
              could verify directly on Every.org.
            </p>
          </div>

          <div className="data-grid donate-card-grid">
            {EVERY_ORG_CURATED_TARGETS.map((target) => (
              <article key={target.id} className="panel data-card donate-card">
                <div className="clean-stack">
                  <p className="detail-kicker">{target.causeAreas.join(" | ")}</p>
                  <h3>{target.title}</h3>
                  <p className="route-text">{target.summary}</p>
                  {target.note ? <p className="donate-card-note">{target.note}</p> : null}
                  <div className="tag-row donate-card-tags">
                    {target.causeAreas.map((causeArea) => (
                      <span key={causeArea} className="badge">
                        {causeArea}
                      </span>
                    ))}
                  </div>
                  <div className="offer-actions">
                    <EveryOrgDonateButton
                      className="button button-primary"
                      label="Donate on Every.org"
                      target={target}
                    />
                    <Link
                      className="button button-secondary"
                      href={getSignedDonationLogHref(
                        target.id,
                        target.causeAreas,
                        Boolean(viewer),
                      )}
                    >
                      Log this gift afterward
                    </Link>
                    <a
                      className="text-button"
                      href={getEveryOrgLearnMoreHref(target)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Read the Every.org recipient page
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Still missing</p>
            <h2>Cause areas without a configured direct route yet</h2>
            <p>
              For these site cause areas, we have not yet configured a sufficiently clear Every.org
              route. We prefer an explicit gap to a misleading pseudo-recommendation.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            <div className="tag-row donate-card-tags">
              {EVERY_ORG_UNCURATED_CAUSES.map((causeArea) => (
                <span key={causeArea} className="badge badge-secondary">
                  {causeArea}
                </span>
              ))}
            </div>
            <p className="route-text">
              You can still browse the broader Every.org directory while we decide whether these
              should map to a direct giving route, a research fund, or no default route at all.
            </p>
            <div className="offer-actions">
              <a
                className="button button-secondary"
                href="https://www.every.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Browse Every.org
              </a>
              <Link className="button button-primary" href="/contact">
                Suggest a direct route
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
