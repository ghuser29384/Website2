import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrade campaign analytics",
  robots: { index: false, follow: false },
};

type CampaignSummary = {
  campaign: string;
  variant: string;
  unique_landing_views: number | string;
  unique_create_clicks: number | string;
  click_through_percent: number | string;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

async function loadCampaignSummary() {
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from("donation_upgrade_campaign_summary")
    .select("*")
    .order("variant");

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignSummary[];
}

export default async function DonationUpgradeCampaignAnalyticsPage() {
  const [viewer, security] = await Promise.all([
    requireViewer("/admin/donation-upgrade-campaign"),
    loadBackgroundAccountSecuritySummary(),
  ]);
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });

  let summary: CampaignSummary[] = [];
  let loadError = "";
  if (access.allowed) {
    try {
      summary = await loadCampaignSummary();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Campaign analytics are unavailable.";
    }
  }

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="campaign-analytics-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Donation Upgrade · billboard campaign</p>
            <h1 id="campaign-analytics-heading">Measure the handoff without collecting identity data.</h1>
            <p>
              Counts are idempotent per anonymous browser and variant. The campaign store omits
              IP addresses, user agents, email addresses, profile IDs, and raw browser identifiers.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Operator access blocked</strong>
                <p>{access.message}</p>
              </div>
              <Link className="button button-primary" href="/dashboard">
                Open account security
              </Link>
            </article>
          ) : loadError ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Campaign analytics unavailable</strong>
                <p>{loadError}</p>
              </div>
            </article>
          ) : summary.length ? (
            <div className="data-grid">
              {summary.map((row) => (
                <article className="panel data-card" key={`${row.campaign}:${row.variant}`}>
                  <p className="detail-kicker">{row.variant.replaceAll("_", " ")}</p>
                  <h2>{Number(row.unique_create_clicks)}</h2>
                  <p className="route-text">unique create clicks</p>
                  <dl className="detail-grid">
                    <div>
                      <dt>Landing views</dt>
                      <dd>{Number(row.unique_landing_views)}</dd>
                    </div>
                    <div>
                      <dt>Click-through</dt>
                      <dd>{Number(row.click_through_percent).toFixed(2)}%</dd>
                    </div>
                    <div>
                      <dt>First seen</dt>
                      <dd>
                        <LocalDateTime fallback="Not yet" value={row.first_seen_at} />
                      </dd>
                    </div>
                    <div>
                      <dt>Last seen</dt>
                      <dd>
                        <LocalDateTime fallback="Not yet" value={row.last_seen_at} />
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <strong>No campaign events recorded.</strong>
                <p>The first landing view or create click will appear after the campaign starts.</p>
              </div>
            </div>
          )}

          <div className="form-actions">
            <Link className="button button-primary" href="/donation-upgrade">
              Open landing page
            </Link>
            <Link className="button button-secondary" href="/admin">
              Back to admin
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
