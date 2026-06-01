import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark, type IconName } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Browse Moral Trade's current project surfaces: worked examples, the Public Goods Fund pilot, and upcoming cohort-mediated workflows.",
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Moral Trade projects",
    description:
      "A plain-language hub for what Moral Trade is actually operating, testing, and preparing next.",
    url: getAbsoluteUrl("/projects"),
    type: "website",
  },
};

const projectCards: ReadonlyArray<{
  actionLabel: string;
  description: string;
  href: string;
  icon: IconName;
  status: string;
  title: string;
}> = [
  {
    title: "Worked examples",
    status: "Live learning surface",
    description:
      "Review seeded examples with terms, baselines, evidence rules, and manual-review notes before anyone relies on a real proposal.",
    href: "/worked-examples",
    icon: "example",
    actionLabel: "Browse examples",
  },
  {
    title: "Public Goods Fund",
    status: "Pilot mechanism",
    description:
      "Inspect candidate pools, contribution evidence, allocation rules, and the non-custodial public-good coordination workflow.",
    href: "/mpgf",
    icon: "fund",
    actionLabel: "Open the fund",
  },
  {
    title: "In pilot / upcoming",
    status: "Cohort first",
    description:
      "Track donation offsets, private matching, and paid-action formats that need more review, governance, and live evidence before scaling.",
    href: "/status",
    icon: "pilot",
    actionLabel: "Read pilot status",
  },
] as const;

const projectBoundaries = [
  "Worked examples are instructional records, not live demand.",
  "External payment routes stay outside Moral Trade; the site does not hold funds.",
  "Private matching remains consent-gated and manually reviewed.",
  "Inactive mechanisms stay clearly marked until there is real operating evidence.",
] as const;

export default async function ProjectsPage() {
  const viewer = await getViewer();

  const projectsStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade projects",
    url: getAbsoluteUrl("/projects"),
    description:
      "Current Moral Trade project surfaces across worked examples, public-good coordination, and pilot workflows.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: projectCards.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: project.title,
        url: getAbsoluteUrl(project.href),
        description: project.description,
      })),
    },
  };

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(projectsStructuredData),
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

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Projects</p>
            <h1>What Moral Trade is actually doing.</h1>
            <p className="hero-text">
              This hub gives visitors a conventional place to start: current examples, the public
              goods pilot, and the workflows that are still cohort-mediated or upcoming.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                See a worked example
              </Link>
              <Link className="button button-secondary" href="/mpgf">
                Public Goods Fund
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Project rule</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Show status plainly</strong>
                  <p>Every surface should say whether it is live, illustrative, or planned.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Prefer evidence to claims</strong>
                  <p>Projects earn more prominence as they accumulate reviewed public records.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="project-hub-heading">
          <div className="section-head">
            <p className="eyebrow">Current surfaces</p>
            <h2 id="project-hub-heading">Browse by what is live enough to inspect</h2>
            <p>
              These labels are intentionally plain. They help donors, partners, and participants
              understand the work without decoding internal mechanism names first.
            </p>
          </div>

          <div className="data-grid project-card-grid">
            {projectCards.map((project) => (
              <Link className="panel data-card project-card" href={project.href} key={project.title}>
                <div className="project-card-head">
                  <IconMark name={project.icon} />
                  <span className="badge">{project.status}</span>
                </div>
                <h3>{project.title}</h3>
                <p className="route-text">{project.description}</p>
                <span className="inline-link">{project.actionLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="project-boundaries-heading">
          <div className="section-head">
            <p className="eyebrow">Boundaries</p>
            <h2 id="project-boundaries-heading">How to read project status</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {projectBoundaries.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
