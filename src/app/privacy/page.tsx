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
import {
  BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS,
  BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS,
} from "@/lib/background-source-permissions";
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
    "Privacy practices for Moral Trade profiles, wish previews, source connections, analytics, cookies, processors, retention, and data requests.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Moral Trade privacy practices",
    description:
      "How Moral Trade handles public profiles, private wishes, analytics, cookies, processors, retention, and user data requests.",
    url: getAbsoluteUrl("/privacy"),
    type: "website",
  },
};

const transparencyRows = [
  {
    title: "Account and profile data",
    purpose: "Authenticate users, show opt-in public profiles, and preserve profile portability.",
    processors: "Supabase for authentication and database storage.",
    retention:
      "Kept while the account or review record needs it; export, correction, deletion, and restriction requests start from the dashboard or contact route.",
  },
  {
    title: "Private wish and source data",
    purpose: "Support broad previews, consent-gated introductions, and manual source summaries.",
    processors:
      "Stored in Moral Trade records backed by Supabase; new sensitive wish/source text is app-level encrypted before storage.",
    retention:
      "Kept only for the consent scope or review workflow that needs it, with exact wishes and source notes excluded from public cards and analytics.",
  },
  {
    title: "Payment and donation references",
    purpose: "Reconcile agreement payments, donation-route handoffs, and optional evidence records.",
    processors: "Stripe for participant payment objects; Every.org for off-site donation routes.",
    retention:
      "Payment identifiers, status, amount, cadence, and evidence notes may be retained for reconciliation, disputes, audit integrity, and compliance needs.",
  },
  {
    title: "Analytics and attribution",
    purpose: "Measure whether visitors understand the pilot and reach the right next step.",
    processors: "Internal funnel records; future analytics tools must follow the same redaction rules.",
    retention:
      "Uses path, event type, coarse counts, buckets, partner codes, and attribution cookies; exact wishes, contact details, report bodies, and raw source notes are excluded.",
  },
  {
    title: "Notifications",
    purpose: "Send account, evidence, review, background-networking, and digest updates.",
    processors: "Email delivery may use an external provider; in-app and web-push preferences live in Moral Trade records.",
    retention:
      "Preference rows and delivery records are retained to honor opt-outs, diagnose failed delivery, and avoid exposing private wish text by email.",
  },
] as const;

function formatPrivacyToken(value: string) {
  return value.replaceAll("_", " ");
}

export default async function PrivacyPage() {
  const viewer = await getViewer();
  const disclosureContract = getMoralTradeDisclosureContract();
  const disclosureValidation = validateMoralTradeDisclosureContract(disclosureContract);

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Privacy</p>
        <h1>Privacy for semi-private moral matching</h1>
        <p>
          Moral Trade separates public profile data from private wish-profile data. Exact wishes,
          asks, constraints, and verification preferences should stay private unless a user chooses
          to share more.
        </p>
        <section className="privacy-transparency-section">
          <h2>Data, processors, and retention summary</h2>
          <p>
            This pilot uses a small set of operational data categories. The summary below is meant
            to make the processor, purpose, and retention story readable before users create
            private wishes, payment records, or evidence notes.
          </p>
          <div className="privacy-transparency-grid">
            {transparencyRows.map((row) => (
              <article className="panel data-card" key={row.title}>
                <h3>{row.title}</h3>
                <p className="route-text">
                  <strong>Purpose:</strong> {row.purpose}
                </p>
                <p className="route-text">
                  <strong>Processors:</strong> {row.processors}
                </p>
                <p className="route-text">
                  <strong>Retention:</strong> {row.retention}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Public and private fields</h2>
          <p>
            Public pages may show profile names, broad cause areas, public offers, comments,
            recommendations, ratings, and follower counts. Private wish profiles are used for match
            suggestions and consent-gated introductions.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Surveillance and total secrecy are both bad defaults</h2>
          <p>
            Background networking creates a real trade-off. If exact wishes are broadly visible,
            they can be used for surveillance, harassment, or exploitation. If everything is hidden
            absolutely, harmful collusion can become harder to detect. The current design aims for
            a middle layer: broad previews, field-level grants, manual review, and narrow
            disclosure tied to specific counterparties or stages.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Source connections and manual imports</h2>
          <p>
            The dashboard can record possible links to blogs, email, calendar records, chatbot
            history, search profiles, and other sources. For now, these records store consent
            scope, import mode, reviewed summaries, and approved derived profile signals only. The
            app does not automatically ingest, scrape, or search raw external data.
          </p>
          <p className="route-text">
            Active external connectors require a separate source permission, consent notes, one of
            the supported retention windows ({BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS.join(", ")}
            days), and a field list chosen from broad matching categories.
          </p>
          <p className="route-text">
            Optional AI shadow-mode review is a separate source-level consent. It may use approved
            summaries only and cannot change live matching, ranking, disclosure, or outreach.
            Live source connectors, AI assist mode, and private-overlap computation require a DPIA,
            lawful-basis record, privacy-design review, and external security/privacy review before
            expansion. Private overlap checks are not live; any future pilot must not use free text
            and must not reveal raw tags.
          </p>
          <ul className="compact-list">
            {BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS.map((option) => (
              <li key={option.value}>{option.label}</li>
            ))}
          </ul>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Field-level grants and portability</h2>
          <p>
            Privacy grants let a participant decide whether a fact stays hidden, becomes broad,
            becomes specific, or becomes contact-level for a particular introduction workflow. The
            app also exposes portable profile export and import endpoints so wish data can move
            later if a more decentralized registry becomes preferable.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <div className="protocol-workflow-card-head">
            <div>
              <p className="eyebrow">Disclosure contract</p>
              <h2>Disclosure is stage-bound, field-bound, and non-mutating.</h2>
            </div>
            <StatusBadge tone={disclosureValidation.status === "pass" ? "default" : "warning"}>
              {disclosureValidation.status}
            </StatusBadge>
          </div>
          <p>
            The public disclosure contract defines which fields can move from registry preview to
            consent and introduced stages. It names redacted fields, search privacy controls,
            owner approval, expiry windows, and the rule that evaluation cannot reveal private
            fields or change grants by itself.
          </p>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Audience stages</h3>
              <p className="route-text">
                {disclosureContract.audienceStages.map(formatPrivacyToken).join(", ")}.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Access levels</h3>
              <p className="route-text">
                {disclosureContract.accessLevels.map(formatPrivacyToken).join(", ")}.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Redacted by default</h3>
              <p className="route-text">
                {disclosureContract.redactedFields.map(formatPrivacyToken).join(", ")}.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Search privacy controls</h3>
              <ul className="compact-list">
                {disclosureContract.searchPrivacyControls.map((control) => (
                  <li key={control.key}>{control.label}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/api/moral-trade/disclosure/contract">
              Open disclosure JSON
            </Link>
            <Link className="button button-secondary" href="/trust">
              Review trust boundaries
            </Link>
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Payment data</h2>
          <p>
            Stripe handles card and payout details. Moral Trade stores payment status, Stripe object
            identifiers, amount, currency, cadence, and agreement references so participants can
            reconcile commitments.
          </p>
        </section>
        <section className="panel data-card data-card-wide" id="analytics-preferences">
          <h2>Analytics and attribution</h2>
          <p>
            Moral Trade may record lightweight product events such as page views, worked-example
            opens, cohort interest, donation-route clicks, onboarding steps, and invite actions.
            The purpose is to understand whether visitors find the right pilot path, not to score
            moral value or automate outreach. UTM parameters, referral codes, partner cohort
            slugs, first path, last path, and referrer may be stored in a short-lived attribution
            cookie and copied into internal funnel records. Background networking events should use
            counts, buckets, and state labels; they should not copy exact wish text, private
            constraints, report bodies, source notes, or notification message text into analytics.
          </p>
          <p className="route-text">
            Optional funnel analytics can be turned off for this browser. Turning it off clears the
            attribution cookie, prevents middleware from recreating it, and makes optional funnel
            event ingestion return without storing a row. Account, safety, security, payment,
            abuse-prevention, and rights-request records remain governed by their own purposes and
            retention rules.
          </p>
          <form action={saveAnalyticsPreferenceAction} className="compact-form">
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
        <section className="panel data-card data-card-wide">
          <h2>Cookies and local state</h2>
          <p>
            The app uses authentication cookies through Supabase, an attribution cookie for cohort
            and campaign measurement, and ordinary browser state needed for interactive forms. The
            public pilot should not use cookies to mine private feeds, infer exact wishes, or send
            surprise counterparty exposure.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Processors and external services</h2>
          <p>
            Supabase supports authentication and database storage. Stripe handles card, payout, and
            payment objects when payment workflows are enabled. Every.org handles direct donation
            routes opened from the donation page. Email delivery may use an external provider for
            queued notifications. Those services have their own security and privacy obligations
            outside Moral Trade&apos;s direct control.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Background networking data inventory</h2>
          <ul className="clean-list">
            {BACKGROUND_DATA_INVENTORY.map((item) => (
              <li key={item.surface}>
                <strong>{item.label}:</strong> {item.classification}; {item.retention}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Self-serve background-networking deletion</h2>
          <p>
            Signed-in participants can delete the background-networking layer without deleting the
            whole account by typing{" "}
            <strong>{BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION}</strong> in the dashboard.
            The action removes participant-facing matching records while retaining only redacted
            or anonymized safety, budget, and operator audit rows where review integrity requires
            it.
          </p>
          <ul className="compact-list">
            {BACKGROUND_SELF_SERVE_DELETION_SURFACES.map((surface) => (
              <li key={surface}>{surface}</li>
            ))}
          </ul>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Retention and deletion</h2>
          <p>
            Pilot records are retained while they are needed for account access, safety review,
            evidence reconciliation, disputes, legal compliance, and abuse prevention. Participants
            can use the dashboard to export profile data or record export, correction, deletion,
            and restriction requests, with the caveat that some public records, audit events,
            payment references, or safety records may need to be retained to preserve review
            integrity.
          </p>
          <div className="offer-actions">
            <Link className="button button-primary" href={viewer ? "/dashboard" : "/login?returnTo=/dashboard"}>
              Open data request tools
            </Link>
            <Link className="button button-secondary" href="/contact">
              Contact privacy support
            </Link>
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Notifications</h2>
          <p>
            The dashboard exposes in-app, digest email, and web-push preference rows by event type.
            Discovery alerts default to digest cadence with quiet hours and source cooldowns. Email
            copy for background networking stays generic and leaves exact wishes, contact details,
            private asks, source notes, and sensitive constraints in the dashboard.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Administrative access</h2>
          <p>
            Admin review should be limited to safety, abuse, payment, and delivery operations.
            Private wish details should not be disclosed to other participants unless the product
            has a consent gate for that disclosure.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Contact and recourse</h2>
          <p>
            For privacy, safety, or processor questions, use the contact page or email
            support@moraltrade.org with the relevant page, proposal, or workflow reference. Safety
            and coercive-baseline concerns should be routed as review issues rather than ordinary
            support questions.
          </p>
          <ul className="compact-list">
            <li>Export or import profile data from the dashboard portability tools.</li>
            <li>Ask for correction, deletion, restriction, or processor clarification through the contact route.</li>
            <li>Escalate coercion, harassment, fraud, or unsafe disclosure through safety review.</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
