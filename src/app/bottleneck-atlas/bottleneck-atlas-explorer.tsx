"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  BOTTLENECK_ATLAS_CLUSTERS,
  BOTTLENECK_ATLAS_FIELDS,
  BOTTLENECK_ATLAS_REVIEWED_AT,
  BOTTLENECK_ATLAS_VERSION,
  OPPORTUNITY_SYNTHESIS_TEMPLATES,
  atlasConfidenceLabel,
  synthesisClassificationLabel,
} from "@/lib/bottleneck-atlas";

import styles from "./bottleneck-atlas.module.css";

type AtlasView = "trades" | "fields" | "method";
type Field = (typeof BOTTLENECK_ATLAS_FIELDS)[number];
type Template = (typeof OPPORTUNITY_SYNTHESIS_TEMPLATES)[number];

const METHOD_STEPS = [
  ["Start with evidence", "Treat public evidence as a search prior, not proof of a current need."],
  ["Confirm the bottleneck", "Verify the marginal project, available capacity, authority, and no-trade baseline."],
  ["Draft a possible exchange", "Propose terms without inventing a counterparty, consent, or willingness."],
  ["Test safety and additionality", "Check opportunity cost, externalities, privacy, and restricted-domain risks."],
  ["Create terms only after interest", "Move to a private draft before anything can become a live offer."],
] as const;

function sensitivityLabel(value: Field["sensitivity"]) {
  if (value === "restricted") return "Restricted review";
  if (value === "elevated") return "Enhanced review";
  return "Standard review";
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M5 16h20" />
      <path d="m19 9 7 7-7 7" />
    </svg>
  );
}

function TradeRail({
  templates,
  selectedId,
  onSelect,
}: {
  templates: readonly Template[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className={styles.rail} aria-label="Potential trade patterns">
      <div className={styles.railHeading}>
        <span>{templates.length}</span>
        <p>Potential trade patterns</p>
      </div>
      <select
        aria-label="Choose a potential trade pattern"
        className={styles.mobileSelect}
        onChange={(event) => onSelect(event.target.value)}
        value={selectedId}
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>
      <div className={styles.railList}>
        {templates.map((template, index) => {
          const selected = template.id === selectedId;
          return (
            <button
              aria-pressed={selected}
              className={styles.railItem}
              data-synthesis-template={template.id}
              key={template.id}
              onClick={() => onSelect(template.id)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{template.title}</strong>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function FieldRail({
  fields,
  selectedId,
  onSelect,
}: {
  fields: readonly Field[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className={styles.rail} aria-label="Fields in the Bottleneck Atlas">
      <div className={styles.railHeading}>
        <span>{fields.length}</span>
        <p>High-impact fields</p>
      </div>
      <select
        aria-label="Choose a field"
        className={styles.mobileSelect}
        onChange={(event) => onSelect(event.target.value)}
        value={selectedId}
      >
        {BOTTLENECK_ATLAS_CLUSTERS.map((cluster) => (
          <optgroup key={cluster} label={cluster}>
            {fields
              .filter((field) => field.cluster === cluster)
              .map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <div className={styles.railList}>
        {BOTTLENECK_ATLAS_CLUSTERS.map((cluster) => {
          const clusterFields = fields.filter((field) => field.cluster === cluster);
          if (clusterFields.length === 0) return null;
          return (
            <div className={styles.railGroup} key={cluster}>
              <p>{cluster}</p>
              {clusterFields.map((field) => {
                const selected = field.id === selectedId;
                return (
                  <button
                    aria-pressed={selected}
                    className={styles.railItem}
                    data-atlas-field={field.id}
                    key={field.id}
                    onClick={() => onSelect(field.id)}
                    type="button"
                  >
                    <strong>{field.name}</strong>
                    <span>{field.primaryBottlenecks[0]}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function TradeCanvas({ template }: { template: Template }) {
  return (
    <section className={styles.canvas} aria-labelledby="selected-trade-title">
      <div className={styles.canvasTopline}>
        <span>{synthesisClassificationLabel(template.classification)}</span>
        <span>Generated hypothesis</span>
      </div>
      <h2 id="selected-trade-title">{template.title}</h2>
      <p className={styles.canvasSummary}>{template.summary}</p>

      <div className={styles.exchangeMap} aria-label="Potential exchange structure">
        <div className={styles.exchangeSide}>
          <span>One side contributes</span>
          <strong>{template.firstPartyGives}</strong>
        </div>
        <div className={styles.exchangeArrow}>
          <ArrowIcon />
          <span>exchange</span>
        </div>
        <div className={`${styles.exchangeSide} ${styles.exchangeReceive}`}>
          <span>That side receives</span>
          <strong>{template.firstPartyReceives}</strong>
        </div>
      </div>

      <div className={styles.baseline}>
        <span>No-trade baseline</span>
        <p>{template.noTradeBaseline}</p>
      </div>

      <div className={styles.canvasActions}>
        <Link
          className="button button-primary"
          href={`/suggested-opportunities/${encodeURIComponent(template.id)}`}
        >
          Inspect this possibility
        </Link>
        <Link className="text-button" href="/feed">
          See personalized suggestions
        </Link>
      </div>
    </section>
  );
}

function TradeInspector({ template }: { template: Template }) {
  return (
    <aside className={styles.inspector} aria-label="Trade status and evidence">
      <p className={styles.inspectorLabel}>Status</p>
      <h3>Not a live offer</h3>
      <p>
        This pattern identifies a possible complementarity. It does not identify a willing
        counterparty or confirm that a trade is additional.
      </p>

      <dl className={styles.inspectorFacts}>
        <div>
          <dt>Evidence confidence</dt>
          <dd>{template.confidence}%</dd>
        </div>
        <div>
          <dt>Counterparty</dt>
          <dd>Unconfirmed</dd>
        </div>
        <div>
          <dt>Moral-trade status</dt>
          <dd>Unconfirmed</dd>
        </div>
      </dl>

      <div className={styles.inspectorRule} />
      <p className={styles.inspectorLabel}>Before terms exist</p>
      <ul>
        <li>Confirm a real marginal bottleneck.</li>
        <li>Price full opportunity cost and backfill.</li>
        <li>Verify authority, consent, and additionality.</li>
        <li>Screen threats and third-party effects.</li>
      </ul>
    </aside>
  );
}

function FieldCanvas({ field }: { field: Field }) {
  return (
    <section className={styles.canvas} aria-labelledby="selected-field-title">
      <div className={styles.canvasTopline}>
        <span>{field.cluster}</span>
        <span>{sensitivityLabel(field.sensitivity)}</span>
      </div>
      <h2 id="selected-field-title">{field.name}</h2>
      <p className={styles.canvasSummary}>{field.summary}</p>

      <div className={styles.fieldSplit}>
        <section>
          <div className={styles.splitHeading}>
            <span>01</span>
            <h3>What blocks progress</h3>
          </div>
          <ul>
            {field.primaryBottlenecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <div className={styles.splitHeading}>
            <span>02</span>
            <h3>What this field can offer</h3>
          </div>
          <ul>
            {field.transferableAssets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.implication}>
        <span>Most promising exchange direction</span>
        <p>{field.tradeImplication}</p>
      </div>
    </section>
  );
}

function FieldInspector({ field }: { field: Field }) {
  return (
    <aside className={styles.inspector} aria-label="Field evidence">
      <p className={styles.inspectorLabel}>Evidence quality</p>
      <h3>
        {atlasConfidenceLabel(field.confidence)} confidence · {field.confidence}%
      </h3>
      <p>
        This confidence describes the field-level bottleneck diagnosis, not the impact of the field
        or the willingness of a particular organization to trade.
      </p>

      <div className={styles.inspectorRule} />
      <p className={styles.inspectorLabel}>Sources</p>
      <ol className={styles.sourceList}>
        {field.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} rel="noreferrer" target="_blank">
              {source.organization}
              <span>{source.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function MethodView() {
  return (
    <section className={styles.methodView} aria-labelledby="method-title">
      <div className={styles.methodIntro}>
        <span>Safety path</span>
        <h2 id="method-title">A hypothesis is not a trade.</h2>
        <p>
          The Atlas helps identify where to investigate. Each stage adds information before the
          system may present negotiable private terms.
        </p>
      </div>
      <ol className={styles.methodSteps}>
        {METHOD_STEPS.map(([title, body], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function BottleneckAtlasExplorer() {
  const [view, setView] = useState<AtlasView>("trades");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    OPPORTUNITY_SYNTHESIS_TEMPLATES[0]?.id ?? "",
  );
  const [selectedFieldId, setSelectedFieldId] = useState(BOTTLENECK_ATLAS_FIELDS[0]?.id ?? "");

  const normalizedQuery = query.trim().toLocaleLowerCase();

  const templates = useMemo(() => {
    if (!normalizedQuery) return OPPORTUNITY_SYNTHESIS_TEMPLATES;
    return OPPORTUNITY_SYNTHESIS_TEMPLATES.filter((template) =>
      [template.title, template.summary, template.firstPartyGives, template.firstPartyReceives]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const fields = useMemo(() => {
    if (!normalizedQuery) return BOTTLENECK_ATLAS_FIELDS;
    return BOTTLENECK_ATLAS_FIELDS.filter((field) =>
      [
        field.name,
        field.cluster,
        field.summary,
        ...field.primaryBottlenecks,
        ...field.transferableAssets,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0] ?? null;

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <section className={styles.hero}>
        <div>
          <h1>Bottleneck Atlas</h1>
          <p>
            Explore where important fields are blocked and which cross-field exchanges may be worth
            investigating.
          </p>
        </div>
        <dl className={styles.scopeLine} aria-label="Atlas scope">
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

      <div className={styles.boundaryStrip}>
        <strong>Research signal, not a live claim.</strong>
        <span>
          Public evidence can suggest a match. It cannot establish a current bottleneck, spare
          capacity, consent, or willingness.
        </span>
      </div>

      <section className={styles.tool} aria-label="Bottleneck Atlas explorer">
        <header className={styles.toolHeader}>
          <nav aria-label="Atlas views" className={styles.viewTabs} role="tablist">
            {(
              [
                ["trades", "Trade map"],
                ["fields", "Field bottlenecks"],
                ["method", "How it works"],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-selected={view === value}
                key={value}
                onClick={() => setView(value)}
                role="tab"
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
          {view !== "method" ? (
            <label className={styles.search}>
              <SearchIcon />
              <span className={styles.srOnly}>Search the Bottleneck Atlas</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={view === "trades" ? "Search trade patterns" : "Search fields or bottlenecks"}
                type="search"
                value={query}
              />
            </label>
          ) : null}
        </header>

        {view === "trades" ? (
          templates.length > 0 && selectedTemplate ? (
            <div className={styles.workspace} role="tabpanel">
              <TradeRail
                onSelect={setSelectedTemplateId}
                selectedId={selectedTemplate.id}
                templates={templates}
              />
              <TradeCanvas template={selectedTemplate} />
              <TradeInspector template={selectedTemplate} />
            </div>
          ) : (
            <div className={styles.emptyState}>No trade pattern matches “{query}”.</div>
          )
        ) : null}

        {view === "fields" ? (
          fields.length > 0 && selectedField ? (
            <div className={styles.workspace} role="tabpanel">
              <FieldRail fields={fields} onSelect={setSelectedFieldId} selectedId={selectedField.id} />
              <FieldCanvas field={selectedField} />
              <FieldInspector field={selectedField} />
            </div>
          ) : (
            <div className={styles.emptyState}>No field or bottleneck matches “{query}”.</div>
          )
        ) : null}

        {view === "method" ? <MethodView /> : null}
      </section>

      <footer className={styles.pageFooter}>
        <p>
          Organization-specific needs, staff availability, and counterparties remain private until
          confirmed.
        </p>
        <div>
          <Link href="/anti-threat-rules">Anti-threat rules</Link>
          <Link href="/research">Research and governance</Link>
        </div>
      </footer>
    </main>
  );
}
