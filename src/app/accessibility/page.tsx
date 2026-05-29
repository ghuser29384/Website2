import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const accessibilityDescription =
  "Moral Trade's accessibility statement, WCAG-oriented QA scope, known limitations, and support route for accessibility issues.";

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
  twitter: {
    card: "summary_large_image",
    title: "Accessibility | Moral Trade",
    description: accessibilityDescription,
  },
};

const qaScopes = [
  {
    title: "Navigation and search",
    detail:
      "Check skip links, menu disclosure, route labels, site search, focus order, and link purpose across public pages.",
  },
  {
    title: "Forms and filters",
    detail:
      "Check labels, instructions, validation messages, keyboard operation, and error recovery on offer, login, registry, and onboarding flows.",
  },
  {
    title: "Evidence workflows",
    detail:
      "Check review cards, factor-code lists, status badges, proof upload language, and challenge paths for understandable names and states.",
  },
  {
    title: "Mobile and loading states",
    detail:
      "Check that route-specific loading and recovery states do not trap keyboard users or hide the first meaningful content.",
  },
] as const;

const currentPractices = [
  "Public pages include a skip link target at main content.",
  "Core navigation uses consistent Understand, Explore, Join, and Trust buckets.",
  "Critical proposal states use visible text labels instead of color alone.",
  "Support, safety, privacy, and data-request routes are linked from public trust surfaces.",
] as const;

const knownLimitations = [
  "A full manual screen-reader pass has not yet been published for every authenticated workflow.",
  "Numeric Lighthouse accessibility scores are not treated as a substitute for manual keyboard and assistive-technology review.",
  "Some prototype workflows still depend on signed-in data states that require scenario-specific QA.",
] as const;

export default async function AccessibilityPage() {
  const viewer = await getViewer();
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/accessibility", label: "Accessibility" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/accessibility", label: "Accessibility" }]} />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Accessibility statement</p>
            <h1>Accessible review should be part of trust.</h1>
            <p className="hero-text">
              Moral Trade aims to make its public pages and core workflows usable with keyboard
              navigation, clear labels, predictable routes, and assistive technology. The working
              target is WCAG 2.1 AA-oriented QA, with known limitations tracked openly instead of
              hidden behind a broad conformance claim.
            </p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href="mailto:support@moraltrade.org?subject=Accessibility%20issue"
              >
                Report accessibility issue
              </a>
              <Link className="button button-secondary" href="/measurement">
                Review QA plan
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current commitment</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Predictable routes</strong>
                  <p>Navigation labels should lead to real destinations with descriptive titles.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Keyboard-first checks</strong>
                  <p>Menus, filters, forms, cards, and recovery states should be reachable without a pointer.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Plain recourse</strong>
                  <p>Visitors should know where to report access barriers and what details help operators triage.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">QA scope</p>
            <h2>What accessibility review should cover first</h2>
            <p>
              The audit called for manual keyboard and screen-reader QA on navigation, forms,
              filters, and evidence workflows. These are the first public checkpoints.
            </p>
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

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Current practices</p>
            <h2>What is already in place</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {currentPractices.map((practice) => (
                <li key={practice}>{practice}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Known limitations</p>
            <h2>What should not be overclaimed</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
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
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
