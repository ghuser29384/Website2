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
    "Browse Moral Trade's operating surfaces: worked examples, live trade records, private matching, moral public goods, and public service controls.",
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Moral Trade projects",
    description:
      "A plain-language hub for the workflows Moral Trade operates and the controls that govern them.",
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
    status: "Public learning surface",
    description:
      "Review complete examples with terms, baselines, evidence rules, and review notes before drafting or relying on a participant record.",
    href: "/worked-examples",
    icon: "example",
    actionLabel: "Browse examples",
  },
  {
    title: "Trade and matching workflows",
    status: "Backed participant records",
    description:
      "Create pledge swaps or donation offsets, express interest, manage private wish previews, and use consent-gated introduction paths.",
    href: "/offers",
    icon: "marketplace",
    actionLabel: "Explore trades",
  },
  {
    title: "Moral public goods",
    status: "Operating coordination tools",
    description:
      "Inspect group-buying structures, contribution evidence, candidate pools, governance rules, and non-custodial donation routes.",
    href: "/moral-goods-group-buying",
    icon: "fund",
    actionLabel: "Open public-good tools",
  },
  {
    title: "Service controls",
    status: "Public and auditable",
    description:
      "Review service status, trust commitments, validation rules, safety boundaries, transparency reports, and machine-readable health endpoints.",
    href: "/status",
    icon: "review",
    actionLabel: "Read service status",
  },
] as const;

const projectBoundaries = [
  "Worked examples are instructional records, not live demand.",
  "External payment routes stay outside Moral Trade; the service does not hold funds.",
  "Private matching remains consent-gated and disclosure-limited.",
  "Capabilities and activity counts come from backed records rather than promotional estimates.",
] as const;

export default async function ProjectsPage() {
  const viewer = await getViewer();

  const projectsStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade projects",
    url: getAbsoluteUrl("/projects"),
    description:
      "Operating Moral Trade surfaces across examples, trade records, private matching, public-good coordination, and service controls.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectsStructuredData) }}
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
            <h1>What Moral Trade operates.</h1>
            <p className="hero-text">
              This hub groups the service by user outcome: learn from complete examples, create or
              find a trade, coordinate a moral public good, and inspect the controls governing the
              system.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                See a worked example
              </Link>
              <Link className="button button-secondary" href="/offers">
                Explore trades
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Project rule</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>State status plainly</strong>
                  <p>Every surface distinguishes worked examples, participant records, and public controls.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Prefer evidence to claims</strong>
                  <p>Prominence follows backed records, public contracts, and reviewed outcomes.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="project-hub-heading">
          <div className="section-head">
            <p className="eyebrow">Service surfaces</p>
            <h2 id="project-hub-heading">Browse by what you need to accomplish</h2>
            <p>
              These labels are deliberately user-facing. They help participants, partners, donors,
              and reviewers find the relevant workflow without decoding internal mechanism names.
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
            <h2 id="project-boundaries-heading">How to read service status</h2>
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
