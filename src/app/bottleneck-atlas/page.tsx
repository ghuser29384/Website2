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
          <div>
            <p className="eyebrow">Research infrastructure · {BOTTLENECK_ATLAS_VERSION}</p>
            <h1 id="atlas-title">Bottleneck Atlas</h1>
            <p className={styles.lede}>
              A dated, evidence-linked map of what appears to constrain high-impact fields, what
              those fields can transfer, and which new exchanges Moral Trade should investigate.
              It supplies hypotheses to the feed; it does not claim that a named person or
              organization has agreed to trade.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/feed">
                Open your feed
              </Link>
              <Link className="button button-secondary" href="#opportunity-templates">
                Review trade templates
              </Link>
            </div>
          </div>
          <dl className={styles.stats} aria-label="Atlas scope">
            <div>
              <dt>Fields mapped</dt>
              <dd>{BOTTLENECK_ATLAS_FIELDS.length}</dd>
            </div>
            <div>
              <dt>Synthesis templates</dt>
              <dd>{OPPORTUNITY_SYNTHESIS_TEMPLATES.length}</dd>
            </div>
            <div>
              <dt>Last reviewed</dt>
              <dd>{BOTTLENECK_ATLAS_REVIEWED_AT}</dd>
            </div>
          </dl>
        </section>

        <section className={`${styles.notice} panel`} aria-labelledby="interpretation-title">
          <div>
            <p className="detail-kicker">How to interpret this</p>
            <h2 id="interpretation-title">Field evidence is a search prior, not a live claim.</h2>
          </div>
          <p>
            A field may be constrained by funding in aggregate while a particular organization is
            at capacity. A live suggestion therefore needs a current marginal project, confirmed
            capacity, full opportunity cost, authority, consent, a no-trade baseline, and an
            externality review. Public evidence can generate a private draft hypothesis, but it
            cannot establish a counterparty&apos;s willingness.
          </p>
        </section>

        <section className={styles.pipeline} aria-labelledby="pipeline-title">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">From evidence to feed</p>
            <h2 id="pipeline-title">One synthesis pipeline, several actor types</h2>
          </div>
          <ol>
            <li>
              <strong>Atlas evidence</strong>
              <span>Field bottlenecks, assets, uncertainty, source dates, and sensitivity.</span>
            </li>
            <li>
              <strong>Needs and capacities</strong>
              <span>Individuals, researchers, teams, organizations, funders, and coalitions.</span>
            </li>
            <li>
              <strong>Candidate synthesis</strong>
              <span>New potential structures, generated locally from declared priorities.</span>
            </li>
            <li>
              <strong>Safety and confirmation</strong>
              <span>No threats, no invented consent, no live moral-trade label without attestation.</span>
            </li>
            <li>
              <strong>Unified feed</strong>
              <span>Existing opportunities and clearly marked generated possibilities.</span>
            </li>
          </ol>
        </section>

        <nav className={styles.clusterNav} aria-label="Atlas field groups">
          {BOTTLENECK_ATLAS_CLUSTERS.map((cluster) => (
            <a key={cluster} href={`#${cluster.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              {cluster}
            </a>
          ))}
        </nav>

        {BOTTLENECK_ATLAS_CLUSTERS.map((cluster) => {
          const fields = BOTTLENECK_ATLAS_FIELDS.filter((field) => field.cluster === cluster);
          const anchor = cluster.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <section className={styles.cluster} id={anchor} key={cluster} aria-labelledby={`${anchor}-title`}>
              <div className={styles.sectionHeading}>
                <p className="eyebrow">{fields.length} mapped fields</p>
                <h2 id={`${anchor}-title`}>{cluster}</h2>
              </div>
              <div className={styles.fieldGrid}>
                {fields.map((field) => (
                  <article className={`${styles.fieldCard} panel`} id={field.id} key={field.id}>
                    <div className={styles.cardTopline}>
                      <span className={styles.confidence}>
                        {atlasConfidenceLabel(field.confidence)} confidence · {field.confidence}%
                      </span>
                      <span className={styles.sensitivity}>{sensitivityLabel(field.sensitivity)}</span>
                    </div>
                    <h3>{field.name}</h3>
                    <p>{field.summary}</p>
                    <div className={styles.twoColumnLists}>
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
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <section className={styles.templates} id="opportunity-templates" aria-labelledby="templates-title">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Candidate-generation layer</p>
            <h2 id="templates-title">Potential trade structures</h2>
            <p>
              These templates are eligible to generate private feed suggestions. They remain
              hypotheses until the relevant needs, capacities, baselines, authority, consent, and
              moral-priority differences are confirmed.
            </p>
          </div>
          <div className={styles.templateGrid}>
            {OPPORTUNITY_SYNTHESIS_TEMPLATES.map((template) => (
              <article className={`${styles.templateCard} panel`} key={template.id}>
                <div className={styles.cardTopline}>
                  <span className={styles.classification}>
                    {synthesisClassificationLabel(template.classification)}
                  </span>
                  <span>{template.confidence}% evidence confidence</span>
                </div>
                <h3>{template.title}</h3>
                <p>{template.summary}</p>
                <dl>
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
                  className="text-button"
                  href={`/suggested-opportunities/${encodeURIComponent(template.id)}`}
                >
                  Inspect assumptions and safeguards
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.finalNotice} panel`}>
          <div>
            <p className="detail-kicker">Public-data boundary</p>
            <h2>No public organization-specific weakness profiles.</h2>
          </div>
          <p>
            The public atlas contains aggregated field evidence. Organization-specific bottlenecks,
            sensitive capacities, staff availability, and suggested counterparties belong in a
            permissioned workflow and require confirmation before they affect a live recommendation.
          </p>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/anti-threat-rules">
              Anti-threat and baseline rules
            </Link>
            <Link className="button button-secondary" href="/research">
              Research and governance
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
