import type { Metadata } from "next";
import Link from "next/link";

import { saveAnalyticsPreferenceAction } from "@/app/privacy/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import {
  BACKGROUND_DATA_INVENTORY,
  BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION,
  BACKGROUND_SELF_SERVE_DELETION_SURFACES,
} from "@/lib/background-privacy-controls";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Moral Trade handles accounts, public profiles, private wishes, consent-gated matching, analytics, payments, retention, processors, export, and deletion.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Moral Trade privacy",
    description:
      "Public and private data boundaries, consent-gated disclosure, processors, retention, analytics controls, export, and deletion.",
    url: getAbsoluteUrl("/privacy"),
    type: "website",
  },
};

const dataCategories = [
  {
    title: "Account and profile data",
    purpose: "Authenticate users, maintain accounts, and display only profile fields chosen for publication.",
    processors: "Supabase supports authentication and database storage.",
    retention:
      "Kept while the account or a required review record remains active, subject to export, correction, deletion, and restriction rights.",
  },
  {
    title: "Private wishes and matching data",
    purpose:
      "Create broad previews, run controlled compatibility checks, support reviewed searches, and manage consented introductions.",
    processors: "Stored in Moral Trade records backed by Supabase; sensitive text may be encrypted before storage.",
    retention:
      "Limited by the relevant consent, expiry, review, safety, or deletion state. Exact wishes and source notes do not appear on public cards.",
  },
  {
    title: "Payment and donation references",
    purpose:
      "Reconcile external payments, contribution evidence, agreement payment state, refunds, disputes, and provider events.",
    processors: "Stripe handles supported payment objects; Every.org handles off-site donation routes.",
    retention:
      "Identifiers, amounts, status, cadence, and evidence references may be retained for reconciliation, disputes, audit integrity, and compliance.",
  },
  {
    title: "Analytics and attribution",
    purpose:
      "Measure whether people understand the service, complete onboarding, perform a concrete first action, and encounter errors or safety blockers.",
    processors: "Privacy-safe internal funnel records and route-level service telemetry.",
    retention:
      "Uses paths, event types, coarse labels, counts, buckets, referral codes, and campaign attribution. Raw private content is excluded.",
  },
  {
    title: "Notifications and support",
    purpose: "Deliver account, evidence, review, matching, security, and service communications.",
    processors: "An external email provider may deliver queued notifications.",
    retention:
      "Preference, delivery, failure, opt-out, and support records are retained as needed to honor choices and diagnose delivery.",
  },
] as const;

const privacyPrinciples = [
  "Broad previews are separate from exact wishes, asks, constraints, evidence bodies, and contact details.",
  "A compatibility signal does not authorize contact or disclosure.",
  "Disclosure grants are field-bound, purpose-bound, audience-bound, revocable, and may expire.",
  "Private matching does not autonomously scrape private feeds or send unsolicited outreach.",
  "Public reports use aggregate counts and suppress small samples rather than exposing case files.",
  "Analytics must not rank moral worth, causes, people, or worldviews.",
] as const;

function formatToken(value: string) {
  return value.replaceAll("_", " ");
}

export default async function PrivacyPage() {
  const viewer = await getViewer();
  const disclosureContract = getMoralTradeDisclosureContract();
  const disclosureValidation = validateMoralTradeDisclosureContract(disclosureContract);

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
            <p className="eyebrow">Privacy</p>
            <h1>Private details remain participant-controlled.</h1>
            <p className="hero-text">
              Moral Trade separates public account information, broad matching previews, exact
              wishes, sensitive evidence, and contact details. Moving information between those
              layers requires an explicit purpose and permission.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup?returnTo=/dashboard"}>
                {viewer ? "Open data controls" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/background-networking">
                Review private matching
              </Link>
              <Link className="button button-secondary" href="/contact">
                Contact privacy support
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Disclosure contract</p>
            <h2>{disclosureValidation.status}</h2>
            <p>
              {disclosureContract.disclosureFields.length} field types, {disclosureContract.audienceStages.length}{" "}
              audience stages, and {disclosureContract.searchPrivacyControls.length} search controls are
              covered by the current public contract.
            </p>
            <Link className="inline-link" href="/api/moral-trade/disclosure/contract">
              Open disclosure JSON
            </Link>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="privacy-principles-heading">
          <div className="section-head">
            <p className="eyebrow">Principles</p>
            <h2 id="privacy-principles-heading">The operating privacy model</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="trust-check-list">
              {privacyPrinciples.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="data-summary-heading">
          <div className="section-head">
            <p className="eyebrow">Data summary</p>
            <h2 id="data-summary-heading">Purpose, processors, and retention</h2>
          </div>
          <div className="data-grid">
            {dataCategories.map((category) => (
              <article className="panel data-card" key={category.title}>
                <h3>{category.title}</h3>
                <p className="route-text">
                  <strong>Purpose:</strong> {category.purpose}
                </p>
                <p className="route-text">
                  <strong>Processors:</strong> {category.processors}
                </p>
                <p className="route-text">
                  <strong>Retention:</strong> {category.retention}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="disclosure-heading">
          <div className="section-head">
            <p className="eyebrow">Consent-gated disclosure</p>
            <h2 id="disclosure-heading">Fields move through explicit stages</h2>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Audience stages</h3>
              <p className="route-text">{disclosureContract.audienceStages.map(formatToken).join(", ")}.</p>
            </article>
            <article className="panel data-card">
              <h3>Access levels</h3>
              <p className="route-text">{disclosureContract.accessLevels.map(formatToken).join(", ")}.</p>
            </article>
            <article className="panel data-card">
              <h3>Redacted by default</h3>
              <p className="route-text">{disclosureContract.redactedFields.map(formatToken).join(", ")}.</p>
            </article>
            <article className="panel data-card">
              <div className="protocol-workflow-card-head">
                <h3>Contract status</h3>
                <StatusBadge tone={disclosureValidation.status === "pass" ? "default" : "warning"}>
                  {disclosureValidation.status}
                </StatusBadge>
              </div>
              <Link className="text-button" href="/api/moral-trade/disclosure/contract">
                Inspect contract
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="analytics-preferences" aria-labelledby="analytics-heading">
          <div className="section-head">
            <p className="eyebrow">Optional analytics</p>
            <h2 id="analytics-heading">Control privacy-safe funnel measurement for this browser</h2>
            <p>
              Optional events use route paths, bounded event types, counts, buckets, and campaign
              attribution. They exclude exact wishes, private messages, evidence bodies, source notes,
              and contact details.
            </p>
          </div>
          <form action={saveAnalyticsPreferenceAction} className="panel compact-form">
            <input name="return_to" type="hidden" value="/privacy#analytics-preferences" />
            <div className="hero-actions">
              <button
                className="button button-secondary button-mini"
                name="analytics_preference"
                type="submit"
                value="off"
              >
                Turn off optional analytics
              </button>
              <button
                className="button button-secondary button-mini"
                name="analytics_preference"
                type="submit"
                value="on"
              >
                Allow minimal analytics
              </button>
            </div>
          </form>
        </section>

        <section className="section section-white" aria-labelledby="rights-heading">
          <div className="section-head">
            <p className="eyebrow">Your controls</p>
            <h2 id="rights-heading">Export, correct, restrict, revoke, or delete</h2>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Account data requests</h3>
              <p className="route-text">
                Use the member workspace to export profile data and begin correction, deletion, or restriction requests.
              </p>
              <Link className="text-button" href={viewer ? "/dashboard" : "/login?returnTo=/dashboard"}>
                Open data controls
              </Link>
            </article>
            <article className="panel data-card">
              <h3>Private matching deletion</h3>
              <p className="route-text">
                Enter <strong>{BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION}</strong> in the workspace to remove the participant-facing private matching layer.
              </p>
              <details className="details-panel">
                <summary>Records covered</summary>
                <div className="details-content">
                  <ul className="compact-list">
                    {BACKGROUND_SELF_SERVE_DELETION_SURFACES.map((surface) => (
                      <li key={surface}>{surface}</li>
                    ))}
                  </ul>
                </div>
              </details>
            </article>
            <article className="panel data-card">
              <h3>Data inventory</h3>
              <details className="details-panel">
                <summary>Inspect private matching categories</summary>
                <div className="details-content">
                  <ul className="clean-list">
                    {BACKGROUND_DATA_INVENTORY.map((item) => (
                      <li key={item.surface}>
                        <strong>{item.label}:</strong> {item.classification}; {item.retention}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="processors-heading">
          <div className="section-head">
            <p className="eyebrow">External services</p>
            <h2 id="processors-heading">Processors and provider boundaries</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <p>
              Supabase supports authentication and database storage. Stripe handles supported card,
              payment, and payout objects. Every.org handles direct donation routes. An external
              email provider may deliver queued notifications. Those providers operate under their
              own security and privacy obligations in addition to Moral Trade&apos;s controls.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
