import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Moral Trade about safety concerns, reviewer questions, partnerships, network onboarding, and product support.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Moral Trade",
    description:
      "Reach Moral Trade for safety reports, reviewer questions, partnerships, network onboarding, and product support.",
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
    title: "Network or partner inquiry",
    detail:
      "Use this for a community, reading group, donor circle, research team, or organization that wants structured onboarding or a working session.",
    href: "mailto:support@moraltrade.org?subject=Network%20or%20partner%20inquiry",
    label: "Email a partner inquiry",
  },
] as const;

export default async function ContactPage() {
  const viewer = await getViewer();

  return (
    <div className={styles.page} data-mt-surface="contact">
      <header className={styles.masthead}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <section className={styles.intro} aria-labelledby="contact-heading">
          <p className={styles.kicker}>Contact</p>
          <h1 id="contact-heading">Reach the Moral Trade team.</h1>
          <p className={styles.description}>
            Use the route below that best matches what you need, especially if a proposal feels
            unsafe, a baseline looks coercive, or a review state appears incorrect.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="mailto:support@moraltrade.org">
              Email support@moraltrade.org
            </a>
            <Link className={styles.secondaryAction} href="/status">
              Check service status
            </Link>
          </div>
        </section>

        <div className={styles.content}>
          <section className={styles.routes} aria-labelledby="contact-routes-heading">
            <div className={styles.sectionHeading}>
              <h2 id="contact-routes-heading">Choose a specific contact path</h2>
              <p>
                Specific subjects help keep safety, review, partnership, and support requests from
                being treated like generic mail.
              </p>
            </div>
            <div className={styles.routeList}>
              {contactRoutes.map((route) => (
                <article className={styles.route} key={route.title}>
                  <h3>{route.title}</h3>
                  <p>{route.detail}</p>
                  <a className={styles.routeLink} href={route.href}>
                    {route.label}
                  </a>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.guidance} aria-labelledby="contact-recourse-heading">
            <h2 id="contact-recourse-heading">Recourse</h2>
            <ol className={styles.steps}>
              <li>
                <h3>Describe the proposal or page</h3>
                <p>Include links, screenshots, or public IDs when you can share them safely.</p>
              </li>
              <li>
                <h3>Name the risk</h3>
                <p>Threat, baseline, evidence, privacy, externality, or payment-route concern.</p>
              </li>
              <li>
                <h3>Ask for the next step</h3>
                <p>Request operator review, reviewer challenge, correction, or onboarding guidance.</p>
              </li>
            </ol>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
