import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  BOTTLENECK_ATLAS_REVIEWED_AT,
  BOTTLENECK_ATLAS_VERSION,
  getAtlasField,
  getSynthesisTemplate,
  synthesisClassificationLabel,
} from "@/lib/bottleneck-atlas";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./suggested-opportunity.module.css";

interface SuggestedOpportunityPageProps {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function sensitivityLabel(value: "standard" | "elevated" | "restricted") {
  if (value === "restricted") return "Restricted specialist review required";
  if (value === "elevated") return "Enhanced human review required";
  return "Standard review required";
}

export async function generateMetadata({ params }: SuggestedOpportunityPageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = getSynthesisTemplate(templateId);
  if (!template) return { title: "Suggested Opportunity" };
  const title = `${template.title} — Potential Opportunity`;
  const description = truncateDescription(template.summary, 155);
  return {
    title,
    description,
    alternates: {
      canonical: `/suggested-opportunities/${encodeURIComponent(template.id)}`,
    },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(`/suggested-opportunities/${encodeURIComponent(template.id)}`),
      type: "article",
    },
  };
}

export default async function SuggestedOpportunityPage({
  params,
  searchParams,
}: SuggestedOpportunityPageProps) {
  const [{ templateId }, query, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const template = getSynthesisTemplate(templateId);
  if (!template) notFound();

  const matchedCause = firstString(query.cause).trim().slice(0, 120);
  const sourceFields = template.sourceFieldIds
    .map((fieldId) => getAtlasField(fieldId))
    .filter((field): field is NonNullable<typeof field> => Boolean(field));
  const createQuery = new URLSearchParams({
    source: "bottleneck_atlas_synthesis",
    template: template.id,
  });
  if (matchedCause) createQuery.set("cause", matchedCause);
  const firstPartyQuery = new URLSearchParams(createQuery);
  firstPartyQuery.set("role", "first_party");
  const counterpartyQuery = new URLSearchParams(createQuery);
  counterpartyQuery.set("role", "counterparty");

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className={`${styles.page} legal-page`} id="main-content" tabIndex={-1}>
        <div className={styles.breadcrumbs}>
          <Link href="/bottleneck-atlas">Bottleneck Atlas</Link>
          <span aria-hidden="true">/</span>
          <span>Potential opportunity</span>
        </div>

        <section className={styles.hero}>
          <div>
            <div className={styles.statusRow}>
              <span>Generated hypothesis</span>
              <span>No counterparty confirmed</span>
              <span>No live offer created</span>
            </div>
            <p className="eyebrow">{synthesisClassificationLabel(template.classification)}</p>
            <h1>{template.title}</h1>
            <p className={styles.lede}>{template.summary}</p>
            {matchedCause ? (
              <p className={styles.matchNote}>
                Appeared because your current profile includes <strong>{matchedCause}</strong>.
                This explains retrieval, not feasibility or acceptance.
              </p>
            ) : null}
            <p className={styles.matchNote}>
              Choose which side you may represent. Either route creates only a private, editable
              hypothesis with unresolved fields—not an offer or introduction.
            </p>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/trades/new?${firstPartyQuery.toString()}`}
              >
                Draft first-party terms
              </Link>
              <Link
                className="button button-secondary"
                href={`/trades/new?${counterpartyQuery.toString()}`}
              >
                Draft counterparty terms
              </Link>
              <Link className="button button-secondary" href="/feed">
                Return to feed
              </Link>
            </div>
          </div>
          <dl className={styles.metadata}>
            <div>
              <dt>Evidence confidence</dt>
              <dd>{template.confidence}%</dd>
            </div>
            <div>
              <dt>Review track</dt>
              <dd>{sensitivityLabel(template.sensitivity)}</dd>
            </div>
            <div>
              <dt>Atlas review</dt>
              <dd>{BOTTLENECK_ATLAS_REVIEWED_AT}</dd>
            </div>
            <div>
              <dt>Eligible actor types</dt>
              <dd>{template.actorScopes.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className={`${styles.warning} panel`} aria-labelledby="not-offer-title">
          <div>
            <p className="detail-kicker">Critical distinction</p>
            <h2 id="not-offer-title">This is not an offer and not yet a moral trade.</h2>
          </div>
          <p>
            The atlas can identify a plausible complementarity. It cannot establish that a specific
            need is currently binding, that capacity is available, that either side consents, or that
            differences in moral priorities materially create the deal. Those facts must be confirmed
            before a live recommendation, introduction, or moral-trade label.
          </p>
        </section>

        <section className={styles.exchange} aria-labelledby="exchange-title">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Proposed exchange</p>
            <h2 id="exchange-title">What each side might contribute and receive</h2>
          </div>
          <div className={styles.exchangeGrid}>
            <article className="panel">
              <p className="detail-kicker">First party gives</p>
              <h3>{template.requestedCause}</h3>
              <p>{template.firstPartyGives}</p>
            </article>
            <article className="panel">
              <p className="detail-kicker">First party receives</p>
              <h3>{template.offeredCause}</h3>
              <p>{template.firstPartyReceives}</p>
            </article>
            <article className="panel">
              <p className="detail-kicker">Counterparty gives</p>
              <h3>Reciprocal contribution</h3>
              <p>{template.counterpartyGives}</p>
            </article>
            <article className="panel">
              <p className="detail-kicker">Counterparty receives</p>
              <h3>Reciprocal benefit</h3>
              <p>{template.counterpartyReceives}</p>
            </article>
          </div>
        </section>

        <section className={`${styles.baseline} panel`} aria-labelledby="baseline-title">
          <p className="detail-kicker">No-trade baseline</p>
          <h2 id="baseline-title">What happens without the exchange?</h2>
          <p>{template.noTradeBaseline}</p>
          <p className={styles.muted}>
            This baseline is only a template. Each party must replace it with a dated, specific,
            attestable account of what they would otherwise do.
          </p>
        </section>

        <div className={styles.reviewGrid}>
          <section className="panel" aria-labelledby="structures-title">
            <p className="detail-kicker">Candidate structures</p>
            <h2 id="structures-title">Compare several Pareto-improving forms</h2>
            <ol>
              {template.candidateStructures.map((structure) => (
                <li key={structure}>{structure}</li>
              ))}
            </ol>
          </section>
          <section className="panel" aria-labelledby="validation-title">
            <p className="detail-kicker">Required confirmation</p>
            <h2 id="validation-title">Questions that can disqualify the match</h2>
            <ul>
              {template.validationQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </section>
          <section className="panel" aria-labelledby="safety-title">
            <p className="detail-kicker">Safety gate</p>
            <h2 id="safety-title">Threat, consent, and externality checks</h2>
            <ul>
              {template.safetyChecks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <Link className="text-button" href="/anti-threat-rules">
              Review anti-threat and baseline rules
            </Link>
          </section>
        </div>

        <section className={styles.sources} aria-labelledby="source-fields-title">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Evidence basis</p>
            <h2 id="source-fields-title">Atlas fields behind this suggestion</h2>
            <p>{template.evidenceLabel}</p>
          </div>
          {sourceFields.length ? (
            <div className={styles.sourceGrid}>
              {sourceFields.map((field) => (
                <article className="panel" key={field.id}>
                  <div className={styles.sourceTopline}>
                    <span>{field.confidence}% field confidence</span>
                    <span>{field.sources.length} sources</span>
                  </div>
                  <h3>{field.name}</h3>
                  <p>{field.summary}</p>
                  <Link className="text-button" href={`/bottleneck-atlas#${field.id}`}>
                    Inspect field evidence
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={`${styles.genericEvidence} panel`}>
              <h3>General moral-trade template</h3>
              <p>
                This structure is not tied to a single field diagnosis. It is generated from your
                stated priority and must be grounded in a specific need and capacity before use.
              </p>
            </div>
          )}
        </section>

        <section className={`${styles.finalGate} panel`}>
          <div>
            <p className="detail-kicker">Next state</p>
            <h2>Draft first. Introduce only after confirmation.</h2>
          </div>
          <div>
            <p>
              A draft may record assumptions and invite correction. It must not represent a named
              person, employee, team, or organization as available until the relevant authority and
              consent checks pass. Atlas version: {BOTTLENECK_ATLAS_VERSION}.
            </p>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/trades/new?${firstPartyQuery.toString()}`}
              >
                Draft first-party terms
              </Link>
              <Link
                className="button button-secondary"
                href={`/trades/new?${counterpartyQuery.toString()}`}
              >
                Draft counterparty terms
              </Link>
              <Link className="button button-secondary" href="/bottleneck-atlas">
                Back to atlas
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
