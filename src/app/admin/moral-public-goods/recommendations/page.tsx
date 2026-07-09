import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  PROJECT_RECOMMENDATION_FEATURE_KEY,
  PROJECT_RECOMMENDATION_FEATURE_METADATA,
  PROJECT_RECOMMENDATION_INTERNAL_LABEL,
  PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER,
  buildMoralPublicGoodsRecommendationDevSeedData,
  buildProjectRecommendationModerationQueue,
  buildProjectRecommendationPublicReport,
  detectProjectRecommendationAbuseFlags,
  evaluateProjectRecommendationCapability,
} from "@/lib/mpgf/public-goods-project-recommendations-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/admin/moral-public-goods/recommendations",
  },
  description: "Read-only reviewer queue for non-MVP source-backed moral-public-goods recommendations.",
  openGraph: {
    description:
      "Inspect source-backed project recommendations and concerns without creating public reputation, ranking, or money movement.",
    title: "Moral Public Goods Recommendations Admin",
    type: "website",
    url: getAbsoluteUrl("/admin/moral-public-goods/recommendations"),
  },
  robots: {
    follow: false,
    index: false,
  },
  title: "Recommendations and Concerns Admin",
};

const reviewerActions = [
  "approve public",
  "approve aggregate-only",
  "request evidence",
  "mark source verified",
  "mark conflict nonblocking",
  "mark conflict blocking",
  "reject",
  "redact",
  "withdraw on user request",
  "escalate to project review/challenge",
] as const;

export default function MoralPublicGoodsRecommendationsAdminPage() {
  const entries = buildMoralPublicGoodsRecommendationDevSeedData();
  const queue = buildProjectRecommendationModerationQueue(entries);
  const report = buildProjectRecommendationPublicReport(entries);
  const abuseFlags = detectProjectRecommendationAbuseFlags(entries);
  const adminCapability = evaluateProjectRecommendationCapability({
    action: "moderate_entry",
    actorRole: "admin",
    environment: "development",
    featureEnabled: true,
    targetReviewed: true,
  });

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/admin", label: "Admin" },
            { href: "/admin/moral-public-goods/recommendations", label: "Recommendations and concerns" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="recommendations-admin-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Non-MVP reviewer queue</p>
            <h1 id="recommendations-admin-heading">Recommendations and concerns.</h1>
            <p>
              {PROJECT_RECOMMENDATION_INTERNAL_LABEL} is disabled by default in production and
              metadata-only. It creates no votes, review approval, clearing input, payment input,
              allocation weight, or public donor reputation.
            </p>
            <p>{PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER}</p>
          </div>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Feature key</dt>
              <dd>{PROJECT_RECOMMENDATION_FEATURE_KEY}</dd>
            </div>
            <div>
              <dt>Classification</dt>
              <dd>{PROJECT_RECOMMENDATION_FEATURE_METADATA.featureClassification}</dd>
            </div>
            <div>
              <dt>Production public display</dt>
              <dd>{PROJECT_RECOMMENDATION_FEATURE_METADATA.productionPublicEnabled ? "enabled" : "disabled"}</dd>
            </div>
            <div>
              <dt>Admin gate</dt>
              <dd>{adminCapability.allowed ? "labs moderation allowed" : adminCapability.reasons.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="queue-heading">
          <SectionHeader eyebrow="Queue" id="queue-heading" title="Pending recommendations and concerns are source-backed.">
            Reviewer actions do not authorize public display until moderation, source, conflict, and
            copy checks pass.
          </SectionHeader>
          <div className="mpgf-panel">
            <p>
              Queue buckets: pending recommendations, pending concerns, source verification needed,
              conflict review needed, redaction needed, and escalation to project review/challenge.
            </p>
          </div>
          <div className="data-grid">
            {queue.map((row) => (
              <article className="panel data-card" key={row.recommendationId}>
                <p className="detail-kicker">{row.moderationState}</p>
                <h3>{row.target}</h3>
                <p>
                  {row.stance} · {row.sourceType} · {row.recommenderRole}
                </p>
                <p>
                  Trust: {row.trustTier}; conflict: {row.conflictState}; submitted: {row.submittedDate}
                </p>
                <p>Recommended action: {row.recommendedAction.replaceAll("_", " ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="actions-heading">
          <SectionHeader eyebrow="Reviewer actions" id="actions-heading" title="Moderation can approve, reject, redact, or escalate.">
            Private evidence access is permission-gated and logged. Rejected and redacted entries
            never appear in public serializers.
          </SectionHeader>
          <div className="data-grid">
            {reviewerActions.map((action) => (
              <article className="panel data-card" key={action}>
                <p className="detail-kicker">Reviewer action</p>
                <h3>{action}</h3>
                <p>No provider calls, allocation change, payment change, or review-state approval.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="report-heading">
          <SectionHeader eyebrow="Public reporting" id="report-heading" title="Reports stay aggregate and privacy-thresholded.">
            Source and conflict breakdowns are coarsened when small cells appear.
          </SectionHeader>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Recommendations</dt>
              <dd>{report.aggregateRecommendationCount}</dd>
            </div>
            <div>
              <dt>Concerns</dt>
              <dd>{report.aggregateConcernCount}</dd>
            </div>
            <div>
              <dt>Privacy suppressed</dt>
              <dd>{report.privacySuppressed ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt>Abuse review</dt>
              <dd>{abuseFlags.length ? abuseFlags.join(", ") : "no demo flags"}</dd>
            </div>
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
