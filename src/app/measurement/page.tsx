import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  MEASUREMENT_EVENT_SPECS,
  MEASUREMENT_GUARDRAILS,
  MEASUREMENT_PERFORMANCE_BASELINE,
  type MeasurementStage,
} from "@/lib/measurement-plan";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Measurement",
  description:
    "How Moral Trade measures activation, trust, safety, performance, and public-good use without ranking moral worth or storing raw private content.",
  alternates: {
    canonical: "/measurement",
  },
  openGraph: {
    title: "Moral Trade measurement",
    description:
      "Privacy-safe service metrics for activation, trust, safety, performance, and public-good coordination.",
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

const stages: MeasurementStage[] = [
  "orientation",
  "activation",
  "trust",
  "performance",
  "public_goods",
];

const outcomeMetrics = [
  {
    title: "Activated users",
    detail:
      "Accounts that complete onboarding and perform a concrete first action, not merely registered emails.",
  },
  {
    title: "Reviewable records",
    detail:
      "Offers, previews, invitations, public-good actions, evidence items, and agreements that create inspectable state.",
  },
  {
    title: "Safe progression",
    detail:
      "The share of users who reach a next step without a privacy, coercion, evidence, or externality blocker.",
  },
  {
    title: "Serious invitations",
    detail:
      "Invitations to plausible counterparties, researchers, organizers, donors, or builders rather than undifferentiated referrals.",
  },
  {
    title: "Review quality",
    detail:
      "Evidence-review timing, challenge outcomes, appeal reversals, unresolved disputes, and human-overrule rates.",
  },
  {
    title: "Service reliability",
    detail:
      "Route health, error rates, performance budgets, email delivery, job execution, and recovery behavior.",
  },
] as const;

const forbiddenData = [
  "Raw private wishes, asks, constraints, messages, or source notes in analytics events.",
  "Email addresses, phone numbers, contact details, receipts, or evidence bodies in public reports.",
  "A platform score purporting to rank people, causes, moral views, or overall moral worth.",
  "Small-sample public metrics that make private participants or cases easy to infer.",
  "Engagement metrics used as a substitute for mutually preferred outcomes or reviewed completion.",
] as const;

function specsFor(stage: MeasurementStage) {
  return MEASUREMENT_EVENT_SPECS.filter((spec) => spec.stage === stage);
}

export default async function MeasurementPage() {
  const viewer = await getViewer();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    name: "Moral Trade measurement",
    url: getAbsoluteUrl("/measurement"),
    description: metadata.description,
    about: [
      "privacy-safe analytics",
      "activation measurement",
      "trust and safety metrics",
      "service performance",
      "moral public goods",
    ],
  };

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
        <p className="eyebrow">Measurement</p>
        <h1>Measure useful cooperation, not moral worth.</h1>
        <p>
          Moral Trade measures whether people understand the service, complete a concrete first
          action, create reviewable records, progress safely, and return to meaningful work. It does
          not optimize for time-on-site or rank moral views.
        </p>

        <section className="panel data-card data-card-wide">
          <h2>Primary outcome metrics</h2>
          <div className="data-grid">
            {outcomeMetrics.map((metric) => (
              <article className="panel data-card" key={metric.title}>
                <h3>{metric.title}</h3>
                <p className="route-text">{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Privacy-safe event taxonomy</h2>
          <p>
            Events use route paths, coarse stages, bounded labels, booleans, counts, and buckets.
            Sensitive text is excluded or redacted before persistence.
          </p>
          {stages.map((stage) => (
            <details className="details-panel" key={stage}>
              <summary>{stageLabels[stage]}</summary>
              <div className="details-content">
                <div className="data-grid">
                  {specsFor(stage).map((spec) => (
                    <article className="panel data-card" key={spec.eventType}>
                      <h3>
                        <code>{spec.eventType}</code>
                      </h3>
                      <p className="route-text">{spec.question}</p>
                      <p className="route-text">
                        <strong>Allowed metadata:</strong> {spec.allowedMetadata.join(", ") || "none"}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Data the service refuses to use</h2>
          <ul className="trust-check-list">
            {forbiddenData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Measurement guardrails</h2>
          <ul className="trust-check-list">
            {MEASUREMENT_GUARDRAILS.map((guardrail) => (
              <li key={guardrail.title}>
                <strong>{guardrail.title}.</strong> {guardrail.rule}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Performance baseline</h2>
          <p>
            Route health is checked on mobile and desktop against explicit loading, content, and
            script budgets. The executable baseline command is{" "}
            <code>{MEASUREMENT_PERFORMANCE_BASELINE.command}</code>.
          </p>
          <p className="route-text">
            DOM content loaded target: {MEASUREMENT_PERFORMANCE_BASELINE.budgets.maxDomContentLoadedMs}ms.
            Load target: {MEASUREMENT_PERFORMANCE_BASELINE.budgets.maxLoadMs}ms. Minimum body text:{" "}
            {MEASUREMENT_PERFORMANCE_BASELINE.budgets.minBodyTextCharacters} characters.
          </p>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Accountability</h2>
          <p>
            Measurement is useful only when participants can inspect the surrounding privacy,
            reliability, validation, transparency, and update commitments.
          </p>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/privacy">
              Privacy
            </Link>
            <Link className="button button-secondary" href="/status">
              Service status
            </Link>
            <Link className="button button-secondary" href="/trust">
              Trust boundaries
            </Link>
            <Link className="button button-primary" href="/updates">
              Service updates
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
