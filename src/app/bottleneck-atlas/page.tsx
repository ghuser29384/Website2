import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  BOTTLENECK_ATLAS_CLUSTERS,
  BOTTLENECK_ATLAS_FIELDS,
  BOTTLENECK_ATLAS_REVIEWED_AT,
  BOTTLENECK_ATLAS_VERSION,
  OPPORTUNITY_SYNTHESIS_TEMPLATES,
  atlasConfidenceLabel,
  synthesisClassificationLabel,
} from "@/lib/bottleneck-atlas";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./bottleneck-atlas.module.css";

export const metadata: Metadata = {
  title: "Bottleneck Atlas",
  description:
    "An evidence-linked map of bottlenecks, transferable capabilities, and potential cross-cause Moral Trade structures.",
  alternates: {
    canonical: "/bottleneck-atlas",
  },
  openGraph: {
    title: "Bottleneck Atlas",
    description:
      "Field-level bottlenecks and carefully qualified templates for generating potential moral-trade opportunities.",
    url: getAbsoluteUrl("/bottleneck-atlas"),
    type: "article",
  },
};

function sensitivityLabel(value: "standard" | "elevated" | "restricted") {
  if (value === "restricted") return "Restricted review";
  if (value === "elevated") return "Enhanced review";
  return "Standard review";
}

function clusterAnchor(cluster: string) {
  return cluster.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const PIPELINE_STEPS = [
  {
    title: "Start with evidence",
    body: "Use field bottlenecks, transferable capabilities, source dates, and uncertainty as search priors.",
  },
  {
    title: "Confirm a real need",
    body: "A person or organization must confirm the marginal project, available capacity, authority, and no-trade baseline.",
  },
  {
    title: "Generate a candidate",
    body: "Moral Trade proposes a possible structure without inventing a counterparty, consent, or agreement.",
  },
  {
    title: "Review safety and fit",
    body: "The parties check opportunity cost, additionality, externalities, privacy, and restricted-domain risks.",
  },
  {
    title: "Only then create terms",
    body: "A generated possibility reaches a private draft before it can become a live offer or moral trade.",
  },
] as const;

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
      <main className={`${styles.page} legal-page`} id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="atlas-title">
          <h1 id="atlas-title">Bottleneck Atlas</h1>
          <p className={styles.lede}>
            See where high-impact fields appear constrained, then review possible exchanges that
            could help one field unblock another.
          </p>
          <div className={styles.heroActions}>
            <a className="button button-primary" href="#opportunity-templates">
              Find a trade pattern
            </a>
            <a className="button button-secondary" href="#field-map">
              Browse field bottlenecks
            </a>
          </div>
          <dl className={styles.heroMeta} aria-label="Atlas scope">
            <div>
              <dt>Fields</dt>
              <dd>{BOTTLENECK_ATLAS_FIELDS.length}</dd>
            </div>
            <div>
              <dt>Trade patterns</dt>
              <dd>{OPPORTUNITY_SYNTHESIS_TEMPLATES.length}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{BOTTLENECK_ATLAS_REVIEWED_AT}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{BOTTLENECK_ATLAS_VERSION}</dd>
            </div>
          </dl>
        </section>

        <aside className={styles.boundaryNote} aria-labelledby="interpretation-title">
          <strong id="interpretation-title">Field evidence is a search prior, not a live claim.</strong>
          <span>
            A public source can suggest where to investigate. It cannot establish a current
            organization-specific bottleneck, spare capacity, consent, or willingness to trade.
          </span>
        </aside>

        <section
          className={styles.primarySection}
          id="opportunity-templates"
          aria-labelledby="templates-title"
        >
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.sectionNumber}>01</p>
              <h2 id="templates-title">Start with a potential trade pattern</h2>
            </div>
            <div>
              <p>
                Each pattern is a generated hypothesis. Open one to see what the two sides might
                exchange, the no-trade baseline, and the safeguards that must be confirmed before
                any live offer exists.
              </p>
              <Link className="text-button" href="/feed">
                Open your personalized feed
              </Link>
            </div>
          </div>

          <div className={styles.disclosureList}>
            {OPPORTUNITY_SYNTHESIS_TEMPLATES.map((template, index) => (
              <details
                className={styles.templateDisclosure}
                data-synthesis-template={template.id}
                key={template.id}
                open={index === 0}
              >
                <summary>
                  <div className={styles.summaryMain}>
                    <span className={styles.classification}>
                      {synthesisClassificationLabel(template.classification)}
                    </span>
                    <h3>{template.title}</h3>
                    <p>{template.summary}</p>
                  </div>
                  <span className={styles.summaryMeta}>{template.confidence}% evidence confidence</span>
                </summary>
                <div className={styles.templateBody}>
                  <dl className={styles.templateFacts}>
                    <div>
                      <dt>One side gives</dt>
                      <dd>{template.firstPartyGives}</dd>
                    </div>
                    <div>
                      <dt>One side receives</dt>
                      <dd>{template.firstPartyReceives}</dd>
                    </div>
                    <div>
                      <dt>No-trade baseline</dt>
                      <dd>{template.noTradeBaseline}</dd>
                    </div>
                  </dl>
                  <Link
                    className="button button-secondary"
                    href={`/suggested-opportunities/${encodeURIComponent(template.id)}`}
                  >
                    Inspect assumptions and safeguards
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.primarySection} id="field-map" aria-labelledby="field-map-title">
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.sectionNumber}>02</p>
              <h2 id="field-map-title">Explore evidence by field</h2>
            </div>
            <p>
              Choose a field group, then open only the field you need. Detailed bottlenecks,
              transferable assets, trade implications, and sources stay collapsed until requested.
            </p>
          </div>

          <div className={styles.clusterList}>
            {BOTTLENECK_ATLAS_CLUSTERS.map((cluster, clusterIndex) => {
              const fields = BOTTLENECK_ATLAS_FIELDS.filter((field) => field.cluster === cluster);
              const anchor = clusterAnchor(cluster);
              return (
                <details
                  className={styles.clusterDisclosure}
                  data-atlas-cluster={anchor}
                  id={anchor}
                  key={cluster}
                  open={clusterIndex === 0}
                >
                  <summary>
                    <span>{cluster}</span>
                    <small>{fields.length} fields</small>
                  </summary>
                  <div className={styles.fieldList}>
                    {fields.map((field) => (
                      <details
                        className={styles.fieldDisclosure}
                        data-atlas-field={field.id}
                        id={field.id}
                        key={field.id}
                      >
                        <summary>
                          <div className={styles.fieldTitleBlock}>
                            <h3>{field.name}</h3>
                            <p>{field.primaryBottlenecks.slice(0, 2).join(" · ")}</p>
                          </div>
                          <div className={styles.fieldMeta}>
                            <span className={styles.confidence}>
                              {atlasConfidenceLabel(field.confidence)} · {field.confidence}%
                            </span>
                            <span>{sensitivityLabel(field.sensitivity)}</span>
                          </div>
                        </summary>
                        <div className={styles.fieldBody}>
                          <p className={styles.fieldSummary}>{field.summary}</p>
                          <div className={styles.fieldColumns}>
                            <div>
                              <h4>Primary bottlenecks</h4>
                              <ul>
                                {field.primaryBottlenecks.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4>Transferable assets</h4>
                              <ul>
                                {field.transferableAssets.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className={styles.implication}>
                            <h4>Trade implication</h4>
                            <p>{field.tradeImplication}</p>
                          </div>
                          <details className={styles.sources}>
                            <summary>Evidence sources ({field.sources.length})</summary>
                            <ul>
                              {field.sources.map((source) => (
                                <li key={source.url}>
                                  <a href={source.url} rel="noreferrer" target="_blank">
                                    {source.organization}: {source.label}
                                  </a>
                                  <span>{source.evidenceType.replaceAll("_", " ")}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className={styles.methodSection} aria-labelledby="method-title">
          <details className={styles.methodDisclosure}>
            <summary>
              <div>
                <p className={styles.sectionNumber}>03</p>
                <h2 id="method-title">How an Atlas hypothesis reaches the feed</h2>
              </div>
              <span>View the five-step safety path</span>
            </summary>
            <ol>
              {PIPELINE_STEPS.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <aside className={styles.finalBoundary}>
          <div>
            <h2>Public atlas, private matches.</h2>
            <p>
              Organization-specific needs, staff availability, suggested counterparties, and
              sensitive capacities require permissioned confirmation before they affect a live
              recommendation.
            </p>
          </div>
          <div className={styles.boundaryActions}>
            <Link className="text-button" href="/anti-threat-rules">
              Anti-threat and baseline rules
            </Link>
            <Link className="text-button" href="/research">
              Research and governance
            </Link>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
