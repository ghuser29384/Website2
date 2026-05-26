import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Moral Trade about the pilot, safety concerns, reviewer questions, partnerships, and cohort updates.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Moral Trade",
    description:
      "Reach the Moral Trade pilot team for safety reports, reviewer questions, partnerships, and cohort updates.",
    url: getAbsoluteUrl("/contact"),
    type: "website",
  },
};

const contactRoutes = [
  {
    title: "Safety or coercion concern",
    detail:
      "Use this for suspected threats, coercive baselines, harassment, fraud, or pressure on vulnerable people.",
    href: "mailto:support@moraltrade.org?subject=Safety%20or%20baseline%20concern",
    label: "Email a safety concern",
  },
  {
    title: "Reviewer or evidence question",
    detail:
      "Ask about proof artifacts, baseline confidence, third-party objections, challenge windows, or reviewer conflicts.",
    href: "mailto:support@moraltrade.org?subject=Reviewer%20or%20evidence%20question",
    label: "Email a review question",
  },
  {
    title: "Cohort or partner inquiry",
    detail:
      "Use this for a community, reading group, donor circle, or organization that wants a small reviewed pilot.",
    href: "mailto:support@moraltrade.org?subject=Cohort%20or%20partner%20inquiry",
    label: "Email a cohort inquiry",
  },
] as const;

export default async function ContactPage() {
  const viewer = await getViewer();

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
            <p className="eyebrow">Contact</p>
            <h1>Reach the pilot operators.</h1>
            <p className="hero-text">
              Moral Trade is still a small reviewed pilot. Use the route below that best matches
              what you need, especially if a proposal feels unsafe or a baseline looks coercive.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="mailto:support@moraltrade.org">
                Email support@moraltrade.org
              </a>
              <Link className="button button-secondary" href="/status">
                Check pilot status
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Recourse</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Describe the proposal or page</strong>
                  <p>Include links, screenshots, or public IDs when you can share them safely.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Name the risk</strong>
                  <p>Threat, baseline, evidence, privacy, externality, or payment-route concern.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Ask for the next step</strong>
                  <p>Request operator review, reviewer challenge, correction, or cohort guidance.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Routes</p>
            <h2>Choose a specific contact path</h2>
            <p>
              Specific subjects help keep safety, review, and partnership requests from being
              treated like generic support mail.
            </p>
          </div>

          <div className="data-grid">
            {contactRoutes.map((route) => (
              <article className="panel data-card" key={route.title}>
                <h3>{route.title}</h3>
                <p className="route-text">{route.detail}</p>
                <a className="text-button" href={route.href}>
                  {route.label}
                </a>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
