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
    "Return from Every.org to a webhook-first MPGF reconciliation state, with reviewed fallback only when provider metadata cannot match the gift.",
  alternates: {
    canonical: "/donate/confirm",
  },
  openGraph: {
    title: "Every.org return state",
    description:
      "MPGF-linked Every.org gifts stay pending for webhook import; reviewed fallback is available when provider metadata cannot match evidence.",
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
            <h1>Every.org return state</h1>
            <p className="hero-text">
              If you completed a gift to {targetTitle}, MPGF-linked routes stay pending until
              webhook import and review. Use the reviewed fallback only when provider metadata
              cannot match the gift. This is bookkeeping, not custody, escrow, tax advice, or a
              payment guarantee.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={signedLogHref}>
                Open reviewed fallback
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
                  <strong>Webhook or fallback</strong>
                  <p>Webhook import is preferred; fallback evidence is only for unmatched review.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Reviewed fallback</p>
            <h2>Manual recording is not the default path</h2>
            <p>
              If you simply wanted to donate, you can stop here. Use reviewed fallback when a
              donation offset, public-goods contribution, or reviewable pilot history cannot be
              matched from provider metadata.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              <li>Every.org remains the payment processor and donation record source.</li>
              <li>MPGF partner webhooks are preferred where partner metadata is available.</li>
              <li>Moral Trade can store fallback evidence only for review.</li>
              <li>No one should rely on the gift until evidence and scope are checked.</li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
