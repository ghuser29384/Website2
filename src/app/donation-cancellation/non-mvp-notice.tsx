import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  DONATION_CANCELLATION_FEATURE_CLASSIFICATION,
  DONATION_CANCELLATION_NON_MVP_WARNING,
  type DonationCancellationCapabilityDecision,
} from "@/lib/moral-trade/donation-cancellation-clearinghouse";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface DonationCancellationNonMvpNoticeProps {
  breadcrumbLabel?: string;
  decision: DonationCancellationCapabilityDecision;
  title?: string;
}

export function DonationCancellationNonMvpNotice({
  breadcrumbLabel = "Donation clearinghouse",
  decision,
  title = "Donation Cancellation Clearinghouse is not currently available.",
}: DonationCancellationNonMvpNoticeProps) {
  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs items={[{ href: "/donation-cancellation", label: breadcrumbLabel }]} />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="donation-cancellation-unavailable-heading">
          <SectionHeader
            eyebrow="Non-MVP labs mechanism"
            id="donation-cancellation-unavailable-heading"
            title={title}
          >
            {DONATION_CANCELLATION_NON_MVP_WARNING}
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Status</p>
              <h3>{DONATION_CANCELLATION_FEATURE_CLASSIFICATION.featureClassification}</h3>
              <p>Hidden from primary public MVP surfaces and ordinary marketplace discovery.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Deployment stage</p>
              <h3>{DONATION_CANCELLATION_FEATURE_CLASSIFICATION.deploymentStage}</h3>
              <p>Admin-reviewed drafts and simulations only unless later promoted.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Blocked reasons</p>
              <h3>{decision.reasons.slice(0, 3).join(", ") || "public_surface_disabled"}</h3>
              <p>Production public registration, payment authorization, capture, routing, and settlement are disabled.</p>
            </article>
          </div>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/mpgf">
              View current CGPP MVP
            </Link>
            <Link className="button button-secondary" href="/offers">
              Browse available routes
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
