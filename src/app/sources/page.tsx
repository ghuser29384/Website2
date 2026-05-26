import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "Conceptual sources and internal reference pages for Moral Trade's pilot framing, safety model, and public-goods thesis.",
  alternates: {
    canonical: "/sources",
  },
  openGraph: {
    title: "Moral Trade sources",
    description:
      "Reference points for the Moral Trade pilot, including moral trade, moral public goods, anti-threat design, and validation standards.",
    url: getAbsoluteUrl("/sources"),
    type: "article",
  },
};

const sourceGroups = [
  {
    title: "Moral trade concept",
    detail:
      "The site draws on Toby Ord's moral trade framing: cooperation can become possible because parties value actions differently by their own moral lights.",
  },
  {
    title: "Moral public goods",
    detail:
      "Forethought-style public-goods framing informs the Public Goods Fund: many people may value some goods for moral reasons even when they disagree deeply elsewhere.",
  },
  {
    title: "Threats and blockers",
    detail:
      "The anti-threat baseline rules are meant to avoid value-destroying threats, coercive baselines, and incentives to worsen behavior before asking for compensation.",
  },
] as const;

export default async function SourcesPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Sources</p>
        <h1>Reference points for the pilot.</h1>
        <p>
          This page gives “Sources” a direct destination instead of sending visitors to a
          methodology anchor. It separates conceptual references from product claims, legal
          posture, and reviewer operations.
        </p>

        <section className="panel data-card data-card-wide">
          <h2>Conceptual sources</h2>
          <div className="data-grid">
            {sourceGroups.map((group) => (
              <article className="panel data-card" key={group.title}>
                <h3>{group.title}</h3>
                <p className="route-text">{group.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Internal reference pages</h2>
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/moral-trade">
              <h3>Primer</h3>
              <p>Plain-language definition, examples, limits, and trust problems.</p>
            </Link>
            <Link className="panel teaser-card" href="/methodology#sources">
              <h3>Methodology sources note</h3>
              <p>How the current public product language summarizes its references.</p>
            </Link>
            <Link className="panel teaser-card" href="/research">
              <h3>Research and governance</h3>
              <p>What the pilot is testing and what would make it unsafe.</p>
            </Link>
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Boundary</h2>
          <p>
            Source references do not make the site a charity evaluator, legal advisor, escrow
            service, or objective moral ranking system. They explain the pilot's research lineage
            and the safety problems its product design tries to address.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
