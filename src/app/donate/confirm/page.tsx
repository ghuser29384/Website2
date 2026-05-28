import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { EVERY_ORG_CURATED_TARGETS } from "@/lib/every-org";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Confirm Donation",
  description:
    "Optionally record an Every.org donation after completing payment off-site, so it can be reflected in a Moral Trade workflow.",
  alternates: {
    canonical: "/donate/confirm",
  },
  openGraph: {
    title: "Confirm an Every.org donation",
    description:
      "Return from Every.org and optionally record a gift for Moral Trade workflows without implying custody or escrow.",
    url: getAbsoluteUrl("/donate/confirm"),
    type: "website",
  },
};

interface DonationConfirmPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDonationLogHref(targetId: string, cause: string) {
  const params = new URLSearchParams({
    source: "every.org",
    target: targetId,
    cause,
  });

  return `/priority-correction-fund?${params.toString()}#record-gift`;
}

export default async function DonationConfirmPage({ searchParams }: DonationConfirmPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const targetId = readParam(resolvedSearchParams.target) ?? "";
  const target = EVERY_ORG_CURATED_TARGETS.find((item) => item.id === targetId);
  const cause = readParam(resolvedSearchParams.cause) ?? target?.causeAreas[0] ?? "Donation";
  const targetTitle = target?.title ?? "the Every.org route";
  const logHref = getDonationLogHref(targetId || "every-org", cause);
  const signedLogHref = viewer ? logHref : `/login?returnTo=${encodeURIComponent(logHref)}`;

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
            <p className="eyebrow">Donation confirmation</p>
            <h1>Back from Every.org?</h1>
            <p className="hero-text">
              If you completed a gift to {targetTitle}, you can optionally record it so Moral
              Trade workflows can reference the external evidence. This is bookkeeping, not
              custody, escrow, tax advice, or a payment guarantee.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={signedLogHref}>
                Record this gift
              </Link>
              <Link className="button button-secondary" href="/donate">
                Done for now
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">What gets recorded</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>External route</strong>
                  <p>{targetTitle}</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Cause area</strong>
                  <p>{cause}</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Evidence note</strong>
                  <p>You provide receipt or payment evidence only when a workflow needs review.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Optional step</p>
            <h2>Recording is only for Moral Trade workflows</h2>
            <p>
              If you simply wanted to donate, you can stop here. Return only when the gift should
              appear in a donation offset, public-goods contribution, or reviewable pilot history.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              <li>Every.org remains the payment processor and donation record source.</li>
              <li>Moral Trade can store a participant-submitted evidence note for review.</li>
              <li>No one should rely on the gift until evidence and scope are checked.</li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
