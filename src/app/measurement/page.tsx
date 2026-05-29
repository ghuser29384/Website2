import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  MEASUREMENT_BASELINE_ROUTES,
  MEASUREMENT_EVENT_SPECS,
  MEASUREMENT_GUARDRAILS,
  MEASUREMENT_ROADMAP,
  type MeasurementStage,
} from "@/lib/measurement-plan";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Measurement Plan",
  description:
    "The privacy-safe Moral Trade measurement plan: public funnel events, performance baselines, forbidden analytics data, and aggregate reporting roadmap.",
  alternates: {
    canonical: "/measurement",
  },
  openGraph: {
    title: "Moral Trade measurement plan",
    description:
      "How Moral Trade measures pilot clarity, trust, and performance without scoring moral worth or storing raw private content.",
    url: getAbsoluteUrl("/measurement"),
    type: "article",
  },
};

const stageLabels: Record<MeasurementStage, string> = {
  orientation: "Orientation",
  activation: "Activation",
  trust: "Trust and safety",
  performance: "Performance",
  public_goods: "Public goods",
};

const stageOrder: MeasurementStage[] = [
  "orientation",
  "activation",
  "trust",
  "performance",
  "public_goods",
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  name: "Moral Trade measurement plan",
  url: getAbsoluteUrl("/measurement"),
  description: metadata.description,
  about: [
    "privacy-safe analytics",
    "pilot measurement",
    "Lighthouse",
    "Search Console",
    "Web Vitals",
  ],
};

function getSpecsForStage(stage: MeasurementStage) {
  return MEASUREMENT_EVENT_SPECS.filter((spec) => spec.stage === stage);
}

export default async function MeasurementPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Measurement plan</p>
        <h1>Measure pilot clarity, not moral worth.</h1>
        <p>
          Moral Trade needs enough instrumentation to learn whether visitors understand the pilot,
          reach a safe first action, and trust the review workflow. It does not need analytics that
          rank moral views, expose exact wishes, or optimize for engagement.
        </p>

        <section>
          <h2>What we measure now</h2>
          <p>
            The current event taxonomy follows the same privacy limits as the product: public route
            paths, coarse stage labels, consent state, and bucketed performance signals. Query
            strings, hashes, raw search text, source notes, receipts, and private messages stay out
            of funnel events.
          </p>
          {stageOrder.map((stage) => (
            <div key={stage}>
              <h3>{stageLabels[stage]}</h3>
              <div className="data-grid">
                {getSpecsForStage(stage).map((spec) => (
                  <div className="panel data-card" key={spec.eventType}>
                    <h4>
                      <code>{spec.eventType}</code>
                    </h4>
                    <p className="route-text">{spec.question}</p>
                    <p className="route-text">
                      <strong>Allowed metadata:</strong> {spec.allowedMetadata.join(", ")}
                    </p>
                    <p className="route-text">
                      <strong>Used for:</strong> {spec.decisionUse}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Guardrails</h2>
          <ul className="trust-check-list">
            {MEASUREMENT_GUARDRAILS.map((guardrail) => (
              <li key={guardrail.title}>
                <strong>{guardrail.title}.</strong> {guardrail.rule}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Performance baseline</h2>
          <p>
            The first performance baseline should cover the routes people use before trusting the
            pilot. Web Vitals may be recorded as LCP, INP, and CLS buckets; Lighthouse or
            PageSpeed-style runs should stay aggregate and route-level.
          </p>
          <div className="data-grid">
            {MEASUREMENT_BASELINE_ROUTES.map((route) => (
              <article className="panel data-card" key={route}>
                <h3>
                  <code>{route}</code>
                </h3>
                <p className="route-text">Mobile and desktop route-level baseline.</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>Roadmap</h2>
          <div className="data-grid">
            {MEASUREMENT_ROADMAP.map((item) => (
              <article className="panel data-card" key={item.title}>
                <p className="eyebrow">{item.status}</p>
                <h3>{item.title}</h3>
                <p className="route-text">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Accountability links</h2>
          <p>
            Measurement is useful only if visitors can inspect the surrounding promises: privacy,
            pilot status, trust boundaries, validation, and public updates.
          </p>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/privacy">
              Privacy
            </Link>
            <Link className="button button-secondary" href="/status">
              Pilot status
            </Link>
            <Link className="button button-secondary" href="/trust">
              Trust boundaries
            </Link>
            <Link className="button button-primary" href="/updates">
              Pilot updates
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
