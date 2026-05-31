import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeTransparencyReportContract,
  loadMoralTradeTransparencyReportSnapshot,
  validateMoralTradeTransparencyReportContract,
  validateMoralTradeTransparencyReportSnapshot,
} from "@/lib/moral-trade/transparency-report";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transparency Report",
  description:
    "Aggregate-only Moral Trade transparency report for review outcomes, disclosures, appeals, safety reports, and operator timing.",
  alternates: {
    canonical: "/transparency",
  },
  openGraph: {
    title: "Moral Trade transparency report",
    description:
      "Quarterly, privacy-thresholded counts for review outcomes, disclosures, reports, appeals, and operator timing.",
    url: getAbsoluteUrl("/transparency"),
    type: "website",
  },
};

function formatSourceTables(tables: string[]) {
  return tables.map((table) => table.replaceAll("_", " ")).join(", ");
}

export default async function TransparencyPage() {
  const [viewer, report] = await Promise.all([
    getViewer(),
    loadMoralTradeTransparencyReportSnapshot(),
  ]);
  const contract = getMoralTradeTransparencyReportContract();
  const contractValidation = validateMoralTradeTransparencyReportContract(contract);
  const reportValidation = validateMoralTradeTransparencyReportSnapshot(report);
  const hasBlockers =
    contractValidation.blockers.length > 0 || reportValidation.blockers.length > 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Report",
    name: `Moral Trade transparency report ${report.periodLabel}`,
    url: getAbsoluteUrl("/transparency"),
    description: metadata.description,
    datePublished: report.generatedAt,
    measurementTechnique: "Aggregate-only thresholded operational counts",
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
            <p className="eyebrow">Transparency report</p>
            <h1>Public counts without public case files.</h1>
            <p className="hero-text">
              Moral Trade publishes aggregate review, disclosure, report, appeal, and operator
              timing metrics so the pilot can be inspected without exposing private wishes,
              counterparties, report bodies, source notes, or evidence artifacts.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/api/moral-trade/transparency/report">
                Open report JSON
              </Link>
              <Link className="button button-secondary" href="/measurement">
                Measurement plan
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">{report.reportMode.replaceAll("_", " ")}</p>
            <h2>{report.periodLabel}</h2>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Cadence</dt>
                <dd>{contract.publicationCadence}</dd>
              </div>
              <div>
                <dt>Threshold</dt>
                <dd>{contract.minimumPublicCount}</dd>
              </div>
              <div>
                <dt>Metrics</dt>
                <dd>{report.metrics.length}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{hasBlockers ? "Review" : "Pass"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Aggregate metrics</p>
            <h2>Review outcomes, disclosures, appeals, and timing</h2>
            <p>
              Counts below the publication threshold are intentionally suppressed. This
              small-sample suppression means a zero is shown as zero; a one- or two-case count is
              not made public.
            </p>
          </div>

          {report.metricErrors.length ? (
            <div className="status-banner status-banner-error">
              Live aggregate source unavailable for: {report.metricErrors.join("; ")}.
            </div>
          ) : null}

          <div className="data-grid">
            {report.metrics.map((metric) => (
              <article className="panel data-card" key={metric.key}>
                <p className="detail-kicker">{metric.kind.replaceAll("_", " ")}</p>
                <h3>{metric.label}</h3>
                <strong className="metric-value">{metric.displayValue}</strong>
                <p className="route-text">{metric.description}</p>
                <p className="route-text">
                  Source table(s): {formatSourceTables(metric.sourceTables)}. Sample size:{" "}
                  {metric.suppressed ? "suppressed" : metric.sampleSize}.
                </p>
                {metric.suppressionReason ? (
                  <p className="route-text">{metric.suppressionReason}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="section section-muted">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Privacy rules</p>
            <h2>What the report refuses to publish</h2>
            <p>{report.privacyNote}</p>
          </div>
          <div className="data-grid">
            {contract.privacyRules.map((rule) => (
              <article className="panel data-card" key={rule}>
                <h3>Rule</h3>
                <p className="route-text">{rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Validator</p>
              <h2>Report contract {contractValidation.status}</h2>
              <p>
                Contract blockers: {contractValidation.blockers.length}. Report blockers:{" "}
                {reportValidation.blockers.length}.
              </p>
            </div>
            <StatusBadge tone={hasBlockers ? "warning" : "default"}>
              {hasBlockers ? "review" : "pass"}
            </StatusBadge>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
