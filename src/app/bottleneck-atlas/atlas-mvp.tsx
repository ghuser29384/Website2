"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import type {
  BottleneckAtlasField,
  OpportunitySynthesisTemplate,
  SynthesisActorScope,
  SynthesisClassification,
} from "@/lib/bottleneck-atlas";
import {
  ATLAS_RESOURCE_OPTIONS,
  type AtlasResourceKey,
  orientedTemplateTerms,
  rankAtlasTemplates,
} from "@/lib/bottleneck-atlas-matcher";

import styles from "./bottleneck-atlas.module.css";

interface AtlasMvpProps {
  fields: readonly BottleneckAtlasField[];
  templates: readonly OpportunitySynthesisTemplate[];
  reviewedAt: string;
}

type AtlasView = "match" | "evidence";

const ACTOR_OPTIONS: ReadonlyArray<{
  id: SynthesisActorScope;
  label: string;
}> = [
  { id: "individual", label: "Individual" },
  { id: "researcher", label: "Researcher" },
  { id: "team", label: "Team" },
  { id: "organization", label: "Organization" },
  { id: "funder", label: "Funder" },
  { id: "coalition", label: "Coalition" },
];

function classificationLabel(classification: SynthesisClassification) {
  switch (classification) {
    case "moral_trade_hypothesis":
      return "Potential moral trade";
    case "mixed_moral_trade_hypothesis":
      return "Potential mixed trade";
    case "moral_public_good_coordination":
      return "Public-good coordination";
    default:
      return "Operational exchange";
  }
}

function sensitivityLabel(value: BottleneckAtlasField["sensitivity"]) {
  if (value === "restricted") return "Restricted review";
  if (value === "elevated") return "Enhanced review";
  return "Standard review";
}

function fitLabel(value: "strong" | "good" | "broad") {
  if (value === "strong") return "Strong fit";
  if (value === "good") return "Good fit";
  return "Broader fit";
}

export function AtlasMvp({ fields, templates, reviewedAt }: AtlasMvpProps) {
  const [view, setView] = useState<AtlasView>("match");
  const [offer, setOffer] = useState<AtlasResourceKey | "">("");
  const [need, setNeed] = useState<AtlasResourceKey | "">("");
  const [actor, setActor] = useState<SynthesisActorScope | "">("");
  const [fieldId, setFieldId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [fieldQuery, setFieldQuery] = useState("");
  const [cluster, setCluster] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState("");

  const matches = useMemo(() => {
    if (!offer || !need) return [];
    return rankAtlasTemplates(templates, {
      offer,
      need,
      actor,
      fieldId: fieldId || undefined,
    });
  }, [actor, fieldId, need, offer, templates]);

  const fieldClusters = useMemo(
    () => [...new Set(fields.map((field) => field.cluster))],
    [fields],
  );

  const visibleFields = useMemo(() => {
    const query = fieldQuery.trim().toLowerCase();
    return fields.filter((field) => {
      if (cluster && field.cluster !== cluster) return false;
      if (!query) return true;
      return [
        field.name,
        field.summary,
        ...field.aliases,
        ...field.primaryBottlenecks,
        ...field.transferableAssets,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [cluster, fieldQuery, fields]);

  const selectedField =
    fields.find((field) => field.id === selectedFieldId) ?? null;
  const bestMatch = matches[0] ?? null;
  const bestTerms = bestMatch
    ? orientedTemplateTerms(bestMatch.template, bestMatch.orientation)
    : null;

  function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offer || !need) return;
    setHasSearched(true);
  }

  return (
    <section className={styles.workspace} data-atlas-mvp aria-label="Bottleneck Atlas workspace">
      <div className={styles.viewTabs} role="tablist" aria-label="Atlas views">
        <button
          aria-controls="atlas-match-panel"
          aria-selected={view === "match"}
          className={styles.viewTab}
          onClick={() => setView("match")}
          role="tab"
          type="button"
        >
          Find a match
        </button>
        <button
          aria-controls="atlas-evidence-panel"
          aria-selected={view === "evidence"}
          className={styles.viewTab}
          onClick={() => setView("evidence")}
          role="tab"
          type="button"
        >
          Browse evidence
        </button>
      </div>

      {view === "match" ? (
        <div className={styles.matchPanel} id="atlas-match-panel" role="tabpanel">
          <form className={styles.matchForm} onSubmit={submitMatch}>
            <div className={styles.coreInputs}>
              <label className={styles.inputGroup}>
                <span>What can you offer?</span>
                <select
                  aria-label="What you can offer"
                  data-atlas-offer-select
                  onChange={(event) => {
                    setOffer(event.target.value as AtlasResourceKey | "");
                    setHasSearched(false);
                  }}
                  value={offer}
                >
                  <option value="">Choose one</option>
                  {ATLAS_RESOURCE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <span className={styles.swapGlyph} aria-hidden="true">
                ↔
              </span>

              <label className={styles.inputGroup}>
                <span>What do you need?</span>
                <select
                  aria-label="What you need"
                  data-atlas-need-select
                  onChange={(event) => {
                    setNeed(event.target.value as AtlasResourceKey | "");
                    setHasSearched(false);
                  }}
                  value={need}
                >
                  <option value="">Choose one</option>
                  {ATLAS_RESOURCE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <details className={styles.moreFilters}>
              <summary>Optional filters</summary>
              <div className={styles.filterGrid}>
                <label className={styles.inputGroup}>
                  <span>Who are you?</span>
                  <select
                    aria-label="Actor type"
                    onChange={(event) => {
                      setActor(event.target.value as SynthesisActorScope | "");
                      setHasSearched(false);
                    }}
                    value={actor}
                  >
                    <option value="">Any actor</option>
                    {ACTOR_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.inputGroup}>
                  <span>Cause or field</span>
                  <select
                    aria-label="Cause focus"
                    onChange={(event) => {
                      setFieldId(event.target.value);
                      setHasSearched(false);
                    }}
                    value={fieldId}
                  >
                    <option value="">Any field</option>
                    {[...fields]
                      .sort((left, right) => left.name.localeCompare(right.name))
                      .map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </details>

            <div className={styles.formActions}>
              <button
                className={styles.primaryAction}
                data-atlas-find-matches
                disabled={!offer || !need}
                type="submit"
              >
                Find matches
              </button>
              <span>Uses {templates.length} reviewed trade patterns</span>
            </div>
          </form>

          {!hasSearched ? (
            <div className={styles.matchPrompt} data-atlas-empty-state>
              Choose two resources to see the strongest current pattern.
            </div>
          ) : bestMatch && bestTerms ? (
            <div className={styles.results} aria-live="polite">
              <article
                className={styles.bestMatch}
                data-atlas-match
                data-synthesis-template={bestMatch.template.id}
              >
                <div className={styles.resultTopline}>
                  <span className={styles.fitBadge}>{fitLabel(bestMatch.fit)}</span>
                  <span>{classificationLabel(bestMatch.template.classification)}</span>
                </div>
                <h2>{bestMatch.template.title}</h2>
                <div className={styles.exchange}>
                  <div>
                    <span>You offer</span>
                    <p>{bestTerms.gives}</p>
                  </div>
                  <span className={styles.exchangeArrow} aria-hidden="true">
                    →
                  </span>
                  <div>
                    <span>You receive</span>
                    <p>{bestTerms.receives}</p>
                  </div>
                </div>
                <div className={styles.resultFooter}>
                  <p>No counterparty is confirmed. This is a hypothesis, not an offer.</p>
                  <Link
                    className={styles.resultLink}
                    href={`/suggested-opportunities/${encodeURIComponent(bestMatch.template.id)}`}
                  >
                    Review this possibility
                  </Link>
                </div>
              </article>

              {matches.length > 1 ? (
                <div className={styles.alternatives} aria-label="Other possible matches">
                  <span>Other possible matches</span>
                  {matches.slice(1).map((match) => (
                    <Link
                      data-atlas-alternative
                      href={`/suggested-opportunities/${encodeURIComponent(match.template.id)}`}
                      key={match.template.id}
                    >
                      {match.template.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.matchPrompt} role="status">
              No strong pattern matches that combination yet. Try a broader resource or open your
              personalized feed.
              <Link href="/feed">Open feed</Link>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.evidencePanel} id="atlas-evidence-panel" role="tabpanel">
          <div className={styles.evidenceToolbar}>
            <label>
              <span>Search fields</span>
              <input
                aria-label="Search fields"
                onChange={(event) => setFieldQuery(event.target.value)}
                placeholder="AI governance, animal welfare, biosecurity…"
                type="search"
                value={fieldQuery}
              />
            </label>
            <label>
              <span>Group</span>
              <select
                aria-label="Field group"
                onChange={(event) => setCluster(event.target.value)}
                value={cluster}
              >
                <option value="">All groups</option>
                {fieldClusters.map((fieldCluster) => (
                  <option key={fieldCluster} value={fieldCluster}>
                    {fieldCluster}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.evidenceLayout}>
            <div className={styles.fieldMenu} aria-label="Atlas fields">
              <div className={styles.fieldMenuHeader}>
                <span>{visibleFields.length} fields</span>
                <small>Reviewed {reviewedAt}</small>
              </div>
              <div className={styles.fieldButtons}>
                {visibleFields.map((field) => (
                  <button
                    aria-pressed={selectedFieldId === field.id}
                    className={styles.fieldButton}
                    data-atlas-field={field.id}
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    type="button"
                  >
                    <strong>{field.name}</strong>
                    <span>{field.primaryBottlenecks[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <article className={styles.fieldDetail} data-atlas-field-detail={selectedField?.id ?? ""}>
              {selectedField ? (
                <>
                  <div className={styles.fieldDetailTopline}>
                    <span>{selectedField.confidence}% confidence</span>
                    <span>{sensitivityLabel(selectedField.sensitivity)}</span>
                  </div>
                  <h2>{selectedField.name}</h2>
                  <p className={styles.fieldSummary}>{selectedField.summary}</p>
                  <div className={styles.detailGrid}>
                    <div>
                      <h3>Bottlenecks</h3>
                      <ul>
                        {selectedField.primaryBottlenecks.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Can offer</h3>
                      <ul>
                        {selectedField.transferableAssets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={styles.tradeAngle}>
                    <span>Trade angle</span>
                    <p>{selectedField.tradeImplication}</p>
                  </div>
                  <div className={styles.sourceLinks}>
                    {selectedField.sources.map((source) => (
                      <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                        {source.organization}: {source.label}
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.fieldPlaceholder}>
                  <strong>Select one field.</strong>
                  <span>Only that field’s evidence will appear here.</span>
                </div>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
