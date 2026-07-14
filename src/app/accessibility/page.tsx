import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const accessibilityDescription =
  "Moral Trade's accessibility statement, WCAG-oriented QA scope, current practices, known limitations, and support route.";

export const metadata: Metadata = {
  title: "Accessibility",
  description: accessibilityDescription,
  alternates: {
    canonical: "/accessibility",
  },
  openGraph: {
    title: "Accessibility | Moral Trade",
    description: accessibilityDescription,
    url: getAbsoluteUrl("/accessibility"),
    type: "website",
  },
};

const qaScopes = [
  {
    title: "Navigation and search",
    detail:
      "Skip links, menu disclosure, route labels, site search, focus order, and descriptive link purpose across public pages.",
  },
  {
    title: "Forms and filters",
    detail:
      "Labels, instructions, validation messages, keyboard operation, and error recovery for account, offer, registry, matching, and onboarding flows.",
  },
  {
    title: "Evidence and review",
    detail:
      "Review cards, status badges, proof language, challenge paths, disputes, and appeal states with understandable names and text alternatives.",
  },
  {
    title: "Private matching controls",
    detail:
      "Opportunity cards, consent dialogs, source-summary review, notification settings, privacy grants, export, and deletion with keyboard and screen-reader scenarios.",
  },
  {
    title: "Mobile and recovery states",
    detail:
      "Responsive layouts, loading indicators, errors, and recovery controls that do not trap focus or hide the primary action.",
  },
] as const;

const currentPractices = [
  "Every main public route exposes a skip link target at the primary content.",
  "Primary navigation uses a small, consistent set of descriptive destinations.",
  "Critical proposal and review states use visible text rather than color alone.",
  "Forms use programmatic labels and preserve server-side error messages after redirects.",
  "Support, safety, privacy, data-request, and incident routes remain available from public trust surfaces.",
] as const;

const knownLimitations = [
  "A full manual screen-reader report has not yet been published for every authenticated workflow.",
  "Automated accessibility scores are not treated as a substitute for keyboard and assistive-technology testing.",
  "Some authenticated workflows require seeded account states to test every review, payment, dispute, and disclosure branch.",
] as const;

export default async function AccessibilityPage() {
  const viewer = await getViewer();
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/accessibility", label: "Accessibility" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
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
            <p className="eyebrow">Accessibility statement</p>
            <h1>Accessible review is part of trust.</h1>
            <p className="hero-text">
              Moral Trade aims to make public pages and core workflows usable with keyboard
              navigation, clear labels, predictable routes, visible status text, and assistive
              technology. The working target is WCAG 2.1 AA-oriented QA without making a blanket
              conformance claim before the relevant manual checks are published.
            </p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href="mailto:support@moraltrade.org?subject=Accessibility%20issue"
              >
                Report an accessibility issue
              </a>
              <Link className="button button-secondary" href="/measurement">
                Review measurement plan
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Support route</p>
            <h2>Include the page, task, device, and barrier.</h2>
            <p>
              A concise report helps operators reproduce the issue and distinguish content,
              keyboard, screen-reader, contrast, motion, mobile, and error-recovery problems.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="accessibility-scope-heading">
          <div className="section-head">
            <p className="eyebrow">QA scope</p>
            <h2 id="accessibility-scope-heading">What accessibility review covers first</h2>
          </div>
          <div className="data-grid">
            {qaScopes.map((scope) => (
              <article className="panel data-card" key={scope.title}>
                <h3>{scope.title}</h3>
                <p className="route-text">{scope.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="accessibility-current-heading">
          <div className="section-head">
            <p className="eyebrow">Current practices</p>
            <h2 id="accessibility-current-heading">Controls already in place</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="trust-check-list">
              {currentPractices.map((practice) => (
                <li key={practice}>{practice}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="accessibility-limitations-heading">
          <div className="section-head">
            <p className="eyebrow">Known limitations</p>
            <h2 id="accessibility-limitations-heading">What the service does not overclaim</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="trust-check-list">
              {knownLimitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/contact">
              Contact support
            </Link>
            <Link className="button button-secondary" href="/validation">
              Review validation standards
            </Link>
            <Link className="button button-secondary" href="/status">
              Check service status
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
