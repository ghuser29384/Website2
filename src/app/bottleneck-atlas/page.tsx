import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  BOTTLENECK_ATLAS_FIELDS,
  BOTTLENECK_ATLAS_REVIEWED_AT,
  OPPORTUNITY_SYNTHESIS_TEMPLATES,
} from "@/lib/bottleneck-atlas";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import {
  BottleneckAtlasMatcher,
  type AtlasMatcherTemplate,
} from "./bottleneck-atlas-matcher";
import styles from "./bottleneck-atlas.module.css";

export const metadata: Metadata = {
  title: "Bottleneck Atlas",
  description: "Match a resource you can offer with a bottleneck you need solved.",
  alternates: {
    canonical: "/bottleneck-atlas",
  },
  openGraph: {
    title: "Bottleneck Atlas",
    description: "A lightweight finder for potential cross-cause trades.",
    url: getAbsoluteUrl("/bottleneck-atlas"),
    type: "website",
  },
};

const MATCHER_TEMPLATES: readonly AtlasMatcherTemplate[] =
  OPPORTUNITY_SYNTHESIS_TEMPLATES.map((template) => ({
    id: template.id,
    title: template.title,
    classification: template.classification,
    actorScopes: template.actorScopes,
    candidateStructure: template.candidateStructures[0] ?? "Bounded pilot",
    confidence: template.confidence,
    generic: "generic" in template && template.generic === true,
  }));

export default async function BottleneckAtlasPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />

      <main className={styles.page} id="main-content" tabIndex={-1}>
        <header className={styles.hero}>
          <p className={styles.kicker}>Bottleneck Atlas</p>
          <h1>Find a potential trade.</h1>
          <p>Match one resource you have with one bottleneck you need solved.</p>
        </header>

        <BottleneckAtlasMatcher templates={MATCHER_TEMPLATES} />

        <section className={styles.researchBasis} aria-labelledby="research-basis-title">
          <div>
            <p className={styles.kicker}>Research basis</p>
            <h2 id="research-basis-title">18 field profiles power the matcher.</h2>
            <p>
              Reviewed {BOTTLENECK_ATLAS_REVIEWED_AT}. Public evidence suggests where to look; it
              does not confirm a counterparty or live organization-specific bottleneck.
            </p>
          </div>

          <details className={styles.fieldCoverage}>
            <summary>View covered fields</summary>
            <div>
              {BOTTLENECK_ATLAS_FIELDS.map((field) => (
                <span data-atlas-field={field.id} key={field.id}>
                  {field.name}
                </span>
              ))}
            </div>
          </details>

          <div className={styles.researchLinks}>
            <Link className="text-button" href="/feed">
              Open your personalized feed
            </Link>
            <Link className="text-button" href="/research">
              Research and governance
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
