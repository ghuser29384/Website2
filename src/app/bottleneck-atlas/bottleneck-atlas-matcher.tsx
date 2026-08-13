"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import type {
  SynthesisActorScope,
  SynthesisClassification,
} from "@/lib/bottleneck-atlas";

import styles from "./bottleneck-atlas.module.css";

export interface AtlasMatcherTemplate {
  id: string;
  title: string;
  classification: SynthesisClassification;
  actorScopes: readonly SynthesisActorScope[];
  candidateStructure: string;
  confidence: number;
  generic: boolean;
}

type OfferKey =
  | "funding"
  | "skills"
  | "operations"
  | "access"
  | "infrastructure"
  | "demand"
  | "analysis"
  | "coordination";

type NeedKey =
  | "funding"
  | "talent"
  | "operations"
  | "access"
  | "infrastructure"
  | "demand"
  | "decisions"
  | "implementation"
  | "coordination";

interface TemplateFit {
  offers: readonly OfferKey[];
  needs: readonly NeedKey[];
}

const OFFER_OPTIONS: readonly { value: OfferKey; label: string }[] = [
  { value: "funding", label: "Funding" },
  { value: "skills", label: "Skilled work" },
  { value: "operations", label: "Advocacy or operations" },
  { value: "access", label: "Data or field access" },
  { value: "infrastructure", label: "Infrastructure or tools" },
  { value: "demand", label: "Purchasing power" },
  { value: "analysis", label: "Forecasting or analysis" },
  { value: "coordination", label: "Coalition coordination" },
];

const NEED_OPTIONS: readonly { value: NeedKey; label: string }[] = [
  { value: "funding", label: "Funding" },
  { value: "talent", label: "Specialist talent" },
  { value: "operations", label: "Advocacy or operations" },
  { value: "access", label: "Data or field access" },
  { value: "infrastructure", label: "Infrastructure or tools" },
  { value: "demand", label: "Customers or procurement" },
  { value: "decisions", label: "Better decision support" },
  { value: "implementation", label: "Implementation capacity" },
  { value: "coordination", label: "A coordinated coalition" },
];

const ACTOR_OPTIONS: readonly { value: SynthesisActorScope; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "researcher", label: "Researcher" },
  { value: "team", label: "Team" },
  { value: "organization", label: "Organization" },
  { value: "funder", label: "Funder" },
  { value: "coalition", label: "Coalition" },
];

const TEMPLATE_FIT: Readonly<Record<string, TemplateFit>> = {
  "digital-minds-animal-welfare-science": {
    offers: ["funding", "skills", "infrastructure", "analysis"],
    needs: ["talent", "analysis", "infrastructure", "funding"],
  },
  "biosecurity-global-health-delivery": {
    offers: ["funding", "infrastructure", "access"],
    needs: ["access", "implementation", "infrastructure", "coordination"],
  },
  "forecasting-live-decisions": {
    offers: ["analysis", "skills"],
    needs: ["decisions", "access", "funding"],
  },
  "gcr-funder-talent-pipeline": {
    offers: ["funding", "coordination"],
    needs: ["talent", "operations", "funding"],
  },
  "alternative-protein-procurement": {
    offers: ["demand", "funding", "operations", "coordination"],
    needs: ["demand", "implementation", "funding", "coordination"],
  },
  "ai-governance-advocacy-operations": {
    offers: ["funding", "operations", "skills"],
    needs: ["operations", "talent", "funding"],
  },
  "professional-time-for-cause-funding": {
    offers: ["skills", "operations", "analysis", "access"],
    needs: ["funding", "coordination"],
  },
  "reciprocal-donation-redirect": {
    offers: ["funding"],
    needs: ["funding", "coordination"],
  },
  "moral-public-good-cofund": {
    offers: ["funding", "coordination"],
    needs: ["funding", "coordination", "implementation"],
  },
};

function optionLabel<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function classificationLabel(value: SynthesisClassification) {
  if (value === "moral_trade_hypothesis") return "Potential moral trade";
  if (value === "mixed_moral_trade_hypothesis") return "Potential mixed moral trade";
  if (value === "moral_public_good_coordination") return "Potential Co-Fund";
  return "Operational exchange";
}

function strengthLabel(score: number) {
  if (score >= 12) return "Best fit";
  if (score >= 10) return "Strong fit";
  return "Possible fit";
}

export function BottleneckAtlasMatcher({
  templates,
}: {
  templates: readonly AtlasMatcherTemplate[];
}) {
  const [offer, setOffer] = useState<OfferKey | "">("");
  const [need, setNeed] = useState<NeedKey | "">("");
  const [actor, setActor] = useState<SynthesisActorScope | "">("");
  const [submitted, setSubmitted] = useState(false);

  const matches = useMemo(() => {
    if (!submitted || !offer || !need) return [];

    return templates
      .map((template) => {
        const fit = TEMPLATE_FIT[template.id] ?? { offers: [], needs: [] };
        const offerMatch = fit.offers.includes(offer);
        const needMatch = fit.needs.includes(need);
        const actorMatch = !actor || template.actorScopes.includes(actor);
        const score =
          (offerMatch ? 5 : 0) +
          (needMatch ? 5 : 0) +
          (actorMatch ? 2 : 0) +
          (template.generic ? 0 : 1);

        return { template, score, offerMatch, needMatch, actorMatch };
      })
      .filter((match) => match.offerMatch || match.needMatch)
      .sort((a, b) => b.score - a.score || b.template.confidence - a.template.confidence)
      .slice(0, 3);
  }, [actor, need, offer, submitted, templates]);

  function changeOffer(value: OfferKey | "") {
    setOffer(value);
    setSubmitted(false);
  }

  function changeNeed(value: NeedKey | "") {
    setNeed(value);
    setSubmitted(false);
  }

  function changeActor(value: SynthesisActorScope | "") {
    setActor(value);
    setSubmitted(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offer || !need) return;
    setSubmitted(true);
  }

  function reset() {
    setOffer("");
    setNeed("");
    setActor("");
    setSubmitted(false);
  }

  return (
    <section className={styles.matcher} aria-labelledby="matcher-title" data-atlas-matcher>
      <div className={styles.matcherHeading}>
        <div>
          <p className={styles.kicker}>Trade finder</p>
          <h2 id="matcher-title">What can you offer, and what do you need?</h2>
        </div>
        <p>Choose two inputs. Moral Trade returns up to three starting points.</p>
      </div>

      <form className={styles.matcherForm} onSubmit={submit}>
        <label>
          <span>You can offer</span>
          <select
            data-atlas-offer
            value={offer}
            onChange={(event) => changeOffer(event.target.value as OfferKey | "")}
            required
          >
            <option value="">Choose one</option>
            {OFFER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>You need</span>
          <select
            data-atlas-need
            value={need}
            onChange={(event) => changeNeed(event.target.value as NeedKey | "")}
            required
          >
            <option value="">Choose one</option>
            {NEED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>You are</span>
          <select
            data-atlas-actor
            value={actor}
            onChange={(event) => changeActor(event.target.value as SynthesisActorScope | "")}
          >
            <option value="">Any participant type</option>
            {ACTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button className="button button-primary" type="submit" disabled={!offer || !need}>
          Find matches
        </button>
      </form>

      <div className={styles.matcherStatus}>
        <span>Suggestions are hypotheses, not accepted offers.</span>
        {(offer || need || actor) && (
          <button type="button" onClick={reset}>
            Reset
          </button>
        )}
      </div>

      {submitted && (
        <div className={styles.results} aria-live="polite" data-atlas-match-results>
          <div className={styles.resultsHeading}>
            <h3>{matches.length ? `${matches.length} possible matches` : "No useful match found"}</h3>
            <span>No counterparty is confirmed.</span>
          </div>

          {matches.length ? (
            <ol className={styles.matchList}>
              {matches.map(({ template, score }, index) => (
                <li data-atlas-match={template.id} key={template.id}>
                  <span className={styles.matchNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.matchMain}>
                    <div className={styles.matchLabels}>
                      <span>{strengthLabel(score)}</span>
                      <span>{classificationLabel(template.classification)}</span>
                    </div>
                    <h4>{template.title}</h4>
                    <p>
                      {optionLabel(OFFER_OPTIONS, offer)} → {optionLabel(NEED_OPTIONS, need)}
                    </p>
                    <small>{template.candidateStructure}</small>
                  </div>
                  <Link
                    className="button button-secondary"
                    href={`/suggested-opportunities/${encodeURIComponent(template.id)}`}
                  >
                    Review match
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.noMatches}>Try a different need or participant type.</p>
          )}
        </div>
      )}
    </section>
  );
}
