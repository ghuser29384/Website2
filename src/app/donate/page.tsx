import type { Metadata } from "next";
import Link from "next/link";

import { EveryOrgDonateButton } from "@/components/donate/every-org-donate-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
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
    "Donate directly to established charities through vetted Every.org routes. These donations do not fund Moral Trade itself.",
  alternates: {
    canonical: "/donate",
  },
  openGraph: {
    title: "Donate directly through Every.org",
    description:
      "Choose a vetted external recipient and complete the donation on Every.org. Moral Trade does not receive the gift.",
    url: getAbsoluteUrl("/donate"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

interface DonatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getDonationConfirmHref(targetId: string, causeAreas: readonly string[]) {
  const params = new URLSearchParams({
    target: targetId,
    cause: causeAreas[0] ?? "Donation",
  });

  return `/donate/confirm?${params.toString()}`;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const returnedTarget = readParam(resolvedSearchParams.target);
  const fundingReadiness = getMoralTradeFundingReadiness();

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
            <h1>Donate directly to an existing charity through Every.org.</h1>
            <p className="hero-text">
              Choose a reviewed external recipient, complete payment on Every.org, and use optional
              evidence reconciliation only when a Moral Trade workflow needs it.
            </p>
            <p className="hero-followup">
              The recipient shown by Every.org receives the donation. These gifts do not fund Moral
              Trade itself, and Moral Trade does not hold funds or decide tax treatment.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="#direct-routes">
                Choose a donation route
              </Link>
              <Link className="button button-secondary" href="/support">
                Support Moral Trade
              </Link>
            </div>
            <ul className="hero-signals" aria-label="Donation trust notes">
              <li>Payment on Every.org</li>
              <li>Existing charity is the recipient</li>
              <li>No Moral Trade custody</li>
              <li>Not project-support funding</li>
            </ul>
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
                  <strong>Import or fallback</strong>
                  <p>Webhook import handles MPGF-linked gifts; use reviewed fallback only when provider metadata cannot match the gift.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {returnedTarget ? (
          <div className="status-banner status-banner-success">
            Ready to reconcile a donation route for {returnedTarget}. Use reviewed fallback only
            if webhook import cannot match this gift to a Moral Trade workflow.
          </div>
        ) : null}

        <section className="section section-subtle" aria-labelledby="funding-paths-heading">
          <div className="section-head">
            <p className="eyebrow">Separate funding paths</p>
            <h2 id="funding-paths-heading">Charity gifts and project support are not the same transaction</h2>
            <p>
              Direct gifts can proceed now. Moral Trade project support appears only after a fiscal
              sponsor is active and its legal and financial disclosures are configured.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <div className="protocol-workflow-card-head">
                <h3>Donate to an existing charity</h3>
                <StatusBadge>available</StatusBadge>
              </div>
              <p className="route-text">
                Every.org receives and processes the gift for the named external recipient.
              </p>
              <a className="text-button" href="#direct-routes">
                Choose a direct route
              </a>
            </article>
            <article className="panel data-card">
              <div className="protocol-workflow-card-head">
                <h3>Support Moral Trade operations</h3>
                <StatusBadge tone={fundingReadiness.projectFundingAvailable ? "default" : "warning"}>
                  {fundingReadiness.projectFundingAvailable ? "sponsor-backed" : "not accepting funds"}
                </StatusBadge>
              </div>
              <p className="route-text">
                Project support is available only through the legal fiscal sponsor disclosed on the
                support page. No personal or native checkout route is used.
              </p>
              <Link className="text-button" href="/support">
                Review project funding
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-white" id="direct-routes">
          <div className="section-head">
            <p className="eyebrow">Direct routes</p>
            <h2>Choose a vetted Every.org route</h2>
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
                      href={getDonationConfirmHref(target.id, target.causeAreas)}
                    >
                      I donated: record optional gift
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
