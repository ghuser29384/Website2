import type { Metadata } from "next";

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

import { AtlasMvp } from "./atlas-mvp";
import styles from "./bottleneck-atlas.module.css";

export const metadata: Metadata = {
  title: "Bottleneck Atlas",
  description:
    "A compact match finder for evidence-backed cross-cause trades, with field research available on demand.",
  alternates: {
    canonical: "/bottleneck-atlas",
  },
  openGraph: {
    title: "Bottleneck Atlas",
    description:
      "Choose what you can offer and what you need to find plausible cross-cause trade patterns.",
    url: getAbsoluteUrl("/bottleneck-atlas"),
    type: "website",
  },
};

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
        <section className={styles.hero} aria-labelledby="atlas-title">
          <p className={styles.kicker}>Bottleneck Atlas</p>
          <h1 id="atlas-title">Find a cross-cause trade.</h1>
          <p>
            Choose what you can offer and what you need. The MVP returns the strongest current
            trade pattern, then lets you inspect the underlying evidence only when useful.
          </p>
        </section>

        <AtlasMvp
          fields={BOTTLENECK_ATLAS_FIELDS}
          reviewedAt={BOTTLENECK_ATLAS_REVIEWED_AT}
          templates={OPPORTUNITY_SYNTHESIS_TEMPLATES}
        />

        <aside className={styles.boundary} aria-label="Atlas evidence boundary">
          <strong>Field evidence is a search prior, not a live claim.</strong>
          <span>
            No public organization-specific weakness profiles. A suggested match does not confirm
            a counterparty, capacity, consent, or agreement.
          </span>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
