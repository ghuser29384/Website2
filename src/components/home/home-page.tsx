"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { OfferComposer } from "@/components/home/offer-composer";
import { OfferBoard } from "@/components/home/offer-board";
import { OfferDetails } from "@/components/home/offer-details";
import { ParetoChart } from "@/components/home/pareto-chart";
import {
  adjustDraftForMode,
  CAUSE_OPTIONS,
  createDefaultOfferDraft,
  createOfferFromDraft,
  DEFAULT_FILTERS,
  evaluatePair,
  FILTER_MODE_OPTIONS,
  filterOffers,
  getAllOffers,
  loadLocalOffers,
  persistLocalOffers,
  sortOffers,
  type Offer,
  type OfferDraft,
  type OfferFilters,
  type OfferMode,
  SORT_OPTIONS,
  validateOfferDraft,
} from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface HomePageProps {
  isAuthenticated: boolean;
}

const theoryCards = [
  {
    title: "A subcategory of trade",
    text: "From the perspective of economics, moral trade is not an extra kind of trade standing outside ordinary theory. It is a subcategory of trade in which differences in moral views do the work.",
  },
  {
    title: "Pure and mixed moral trade",
    text: "Ord distinguishes pure moral trade, where both parties see the result as morally better, from mixed moral trade, where moral and prudential gains are combined.",
  },
  {
    title: "Pareto improvement from a default option",
    text: "The point is to move from what the parties would have done independently to an option that each regards as better by the lights of their own moral view.",
  },
  {
    title: "A very incomplete market",
    text: "Ord notes that there is strikingly little trade based on variation in moral preferences and almost no mechanisms for facilitating it. Moral barter is only a beginning.",
  },
] as const;

const vignettes = [
  {
    type: "Compatible views",
    title: "Animals and the Poor",
    proposition:
      "Victoria agrees to donate 1 percent of her income to effective poverty charities each year if Paul becomes vegetarian.",
    premise:
      "Paul cares deeply about poverty and is morally neutral about animals; Victoria cares about both, but much more about animal suffering. Each therefore prefers the traded outcome to acting alone.",
    commitment: "They are close friends and simply ask each other, once each year, how they are keeping up.",
  },
  {
    type: "Opposed causes",
    title: "Gun Rights and Gun Control",
    proposition:
      "Rebecca and Christopher redirect opposed political donations to Oxfam instead of funding both sides of a zero-sum battle.",
    premise:
      "Even near-opposites can trade if there is some area where they are not diametrically opposed and both see a compromise destination as better than canceling out.",
    commitment: "Matched amounts, a named compromise destination, and a rule for any unmatched surplus.",
  },
  {
    type: "Another type of trade",
    title: "Paying for an action",
    proposition:
      "Victoria can offer another person a sum of money to become vegetarian.",
    premise:
      "For someone already on the fence, payment can make the act prudentially worthwhile while still looking like a moral improvement to the payer.",
    commitment: "A fixed payment, a fixed term, and a check on whether the action was taken.",
  },
] as const;

const varieties = [
  {
    title: "Pure moral trade",
    text: "Pure cases are those in which both parties view the result as morally superior. The Victoria-Paul and Rebecca-Christopher examples are meant to show that this can happen even when the moral views differ sharply.",
  },
  {
    title: "Mixed moral trade",
    text: "Ord includes cases where one side&apos;s gain is partly prudential and partly moral. Paying for an action, such as becoming vegetarian, is the clearest example.",
  },
  {
    title: "Edge cases",
    text: "The paper also notes agent-relative and intrapersonal cases. Different duties, or an ad hoc mixture of prudential and moral motives within one person, can also create room for trade.",
  },
] as const;

const trustIssues = [
  {
    title: "Insufficient trust",
    text: "Ord calls insufficient trust the major practical obstacle to the gains from moral trade. The problem is not unique to moral trade, but it is often harder here in practice.",
  },
  {
    title: "Factual trust",
    text: "One party must trust that the other really does what was promised, especially when the acts continue over time and are not performed in the other person&apos;s presence.",
  },
  {
    title: "Counterfactual trust",
    text: "Each party must also trust that the other would not have done the act anyway. This is often the harder problem, and contract law helps much less here.",
  },
  {
    title: "Ways to cope",
    text: "The paper points to friends, occasional checks, escrow, custom, and shorter timescales as practical ways of reducing these trust problems.",
  },
] as const;

const practicalCases = [
  {
    title: "Votes and legislation",
    text: "The paper points to vote trading and legislative bargaining as familiar practical cases. These arrangements can allow Pareto superior combinations of policies to be agreed upon.",
  },
  {
    title: "Cancelling opposed donations",
    text: "Sites such as Nader Trader, VotePair, and Repledge are treated as simple markets for moral trade, matching people who would otherwise spend against one another.",
  },
  {
    title: "Keep first efforts simple",
    text: "Ord argues that a first effort would probably do better if it kept things simple and only offered one-to-one exchanges before moving toward more complete markets.",
  },
] as const;

const faqItems = [
  {
    question: "What is the main practical obstacle?",
    answer:
      "Insufficient trust. Ord divides this into factual trust and counterfactual trust, and treats the second as especially hard.",
  },
  {
    question: "Is moral trade only for consequentialists?",
    answer:
      "No. The paper argues that deontological and virtue-ethical views can also have reasons to engage in moral trade, though the gains and constraints may look different.",
  },
  {
    question: "Can the gains be very large?",
    answer:
      "Ord argues that the potential gains can be large, especially where opposed charities or costly habits create major inefficiencies, though they are much harder to aggregate than gains from ordinary trade.",
  },
  {
    question: "Does moral trade guarantee a better world overall?",
    answer:
      "No. It guarantees only that the outcome is better according to the views of the parties to the trade. Externalities, objective moral truth, and perverse incentives can still make things worse overall.",
  },
] as const;

const OPENING_FIRST_DEFINITION =
  ": People with conflicting interests both satisfy their own interests at a higher cost-efficiency than they otherwise would have on their own.";

const OPENING_SECOND_DEFINITION =
  ": People with conflicting moral views make the world better, in both of their views, at a higher cost-efficiency than they otherwise would have on their own.";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getSegmentProgress(progress: number, start: number, end: number) {
  if (progress <= start) {
    return 0;
  }

  if (progress >= end) {
    return 1;
  }

  return (progress - start) / (end - start);
}

function getRevealStyle(progress: number): CSSProperties {
  const safeProgress = clamp(progress);

  return {
    opacity: safeProgress,
  };
}

function getWordRevealStyle(progress: number): CSSProperties {
  const safeProgress = clamp(progress);

  return {
    opacity: safeProgress,
  };
}

function OpeningWord({
  prefix,
  core,
  style,
}: {
  prefix?: string;
  core: string;
  style?: CSSProperties;
}) {
  if (!prefix) {
    return (
      <span className="opening-anchor-frame" style={style}>
        <span aria-hidden="true" className="opening-prefix-slot opening-prefix-slot-hidden">
          moral
        </span>
        <span className="opening-anchor-word">{core}</span>
      </span>
    );
  }

  return (
    <span className="opening-anchor-frame" style={style}>
      <span className="opening-prefix-slot">{prefix}</span>
      <span className="opening-anchor-word">{core}</span>
    </span>
  );
}

export function HomePage({ isAuthenticated }: HomePageProps) {
  const openingSequenceRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(createDefaultOfferDraft());
  const [filters, setFilters] = useState<OfferFilters>(DEFAULT_FILTERS);
  const [localOffers, setLocalOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState("seed-victoria");
  const [statusMessage, setStatusMessage] = useState("");
  const [hasLoadedLocalOffers, setHasLoadedLocalOffers] = useState(false);
  const [openingProgress, setOpeningProgress] = useState(0);
  const [openingRevealProgress, setOpeningRevealProgress] = useState(0);

  useEffect(() => {
    setLocalOffers(loadLocalOffers());
    setHasLoadedLocalOffers(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalOffers) {
      return;
    }

    persistLocalOffers(localOffers);
  }, [hasLoadedLocalOffers, localOffers]);

  useEffect(() => {
    let animationFrame = 0;

    function updateOpeningProgress() {
      animationFrame = 0;

      if (!openingSequenceRef.current) {
        return;
      }

      const rect = openingSequenceRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const totalScrollableDistance = Math.max(openingSequenceRef.current.offsetHeight - viewportHeight, 1);
      const distanceScrolled = clamp(-rect.top / totalScrollableDistance);

      setOpeningProgress((current) =>
        Math.abs(current - distanceScrolled) > 0.004 ? distanceScrolled : current,
      );
      setOpeningRevealProgress((current) => {
        const nextProgress = Math.max(current, distanceScrolled);

        return Math.abs(current - nextProgress) > 0.004 ? nextProgress : current;
      });
    }

    function requestUpdate() {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateOpeningProgress);
      }
    }

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const allOffers = getAllOffers(localOffers);
  const selectedOffer = allOffers.find((offer) => offer.id === selectedOfferId) ?? allOffers[0] ?? null;
  const scoredPairs = selectedOffer
    ? allOffers
        .filter((offer) => offer.id !== selectedOffer.id)
        .map((offer) => evaluatePair(selectedOffer, offer))
        .sort((left, right) => {
          if (left.exact !== right.exact) {
            return Number(right.exact) - Number(left.exact);
          }

          return right.score - left.score;
        })
    : [];
  const exactMatches = scoredPairs.filter((pair) => pair.exact);
  const displayedMatches = exactMatches.length ? exactMatches : scoredPairs.slice(0, 3);
  const visibleOffers = sortOffers(filterOffers(allOffers, filters), selectedOffer, filters.sortOrder);
  const firstDefinitionProgress = getSegmentProgress(openingRevealProgress, 0.08, 0.34);
  const secondWordProgress = getSegmentProgress(openingRevealProgress, 0.46, 0.68);
  const secondDefinitionProgress = getSegmentProgress(openingRevealProgress, 0.74, 1);
  const floatingTopbarProgress = getSegmentProgress(openingProgress, 0.84, 0.97);
  const showFloatingTopbar = floatingTopbarProgress > 0.01;
  const floatingTopbarStyle: CSSProperties = {
    opacity: floatingTopbarProgress,
    transform: `translate3d(-50%, ${(1 - floatingTopbarProgress) * -18}px, 0)`,
  };

  function handleDraftFieldChange(field: keyof OfferDraft, value: string | number | boolean) {
    setDraft(
      (current) =>
        ({
          ...current,
          [field]: value,
        }) as OfferDraft,
    );
  }

  function handleModeChange(mode: OfferMode) {
    setDraft((current) => adjustDraftForMode(current, mode));
  }

  function handleFilterChange(field: keyof OfferFilters, value: string) {
    setFilters(
      (current) =>
        ({
          ...current,
          [field]: value,
        }) as OfferFilters,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateOfferDraft(draft);
    if (validationError) {
      window.alert(validationError);
      return;
    }

    const offer = createOfferFromDraft(draft);
    setLocalOffers((current) => [offer, ...current]);
    setSelectedOfferId(offer.id);
    setDraft(createDefaultOfferDraft());
    setStatusMessage(`Added ${offer.alias}'s offer to the local workspace.`);
  }

  function handleResetLocalOffers() {
    if (!localOffers.length) {
      setStatusMessage("There are no local offers to reset.");
      return;
    }

    if (!window.confirm("Remove all local offers and keep only the seeded examples?")) {
      return;
    }

    setLocalOffers([]);
    setSelectedOfferId("seed-victoria");
    setStatusMessage("Reset the workspace to the seeded examples.");
  }

  function handleRemoveOffer(offerId: string) {
    const offer = localOffers.find((entry) => entry.id === offerId);
    if (!offer) {
      return;
    }

    setLocalOffers((current) => current.filter((entry) => entry.id !== offerId));
    if (selectedOfferId === offerId) {
      setSelectedOfferId("seed-victoria");
    }
    setStatusMessage(`Removed ${offer.alias}'s local offer.`);
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div
          aria-hidden={!showFloatingTopbar}
          className={`topbar-floating-shell${showFloatingTopbar ? " is-visible" : ""}`}
          style={floatingTopbarStyle}
        >
          <SiteTopbar
            brandHref="/"
            links={getPrimaryNavLinks(isAuthenticated)}
            {...getTopbarActions(isAuthenticated)}
            showLogout={isAuthenticated}
          />
        </div>

        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div
          ref={openingSequenceRef}
          className="opening-sequence"
          aria-label="Opening explanation of trade and moral trade"
        >
          <div className="opening-stage">
            <div className="opening-lines">
              <div className="opening-line">
                <div className="opening-line-anchor">
                  <OpeningWord core="trade" />
                </div>
                <div className="opening-line-definition">
                  <p style={getRevealStyle(firstDefinitionProgress)}>{OPENING_FIRST_DEFINITION}</p>
                </div>
              </div>

              <div className="opening-line">
                <div className="opening-line-anchor">
                  <OpeningWord core="trade" prefix="moral" style={getWordRevealStyle(secondWordProgress)} />
                </div>
                <div className="opening-line-definition">
                  <p style={getRevealStyle(secondDefinitionProgress)}>
                    {OPENING_SECOND_DEFINITION}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-stage panel">
          <div className="hero-grid hero-grid-editorial">
            <section className="hero-copy" id="top">
              <p className="eyebrow">Introduction</p>
              <h1>A different way forward for moral disagreement.</h1>
              <p className="hero-text">
                Ord&apos;s starting point is that there is a great diversity of moral views.
                People with different moral views often end up in antagonistic relationships, but
                they need not only oppose one another. They may be able to trade.
              </p>
              <div className="hero-actions">
                <Link
                  className="button button-primary"
                  href={isAuthenticated ? "/dashboard" : "/signup"}
                >
                  {isAuthenticated ? "Open dashboard" : "Create an account"}
                </Link>
                <Link className="button button-secondary" href="/offers">
                  Review public offers
                </Link>
              </div>
              <ul className="hero-signals" aria-label="Operating standards">
                <li>Moral barter</li>
                <li>Trust problems</li>
                <li>Incomplete market</li>
              </ul>
              <p className="hero-followup">
                Read the examples, the theory, and the trust problems below before reviewing the{" "}
                <Link href="/offers">public offers</Link>.
              </p>
            </section>

            <aside className="hero-panel panel">
              <p className="eyebrow">Order of argument</p>
              <div className="flow-card">
                <div className="flow-step">
                  <span className="flow-number">01</span>
                  <div>
                    <strong>Examples first</strong>
                    <p>Start with concrete cases before moving to theory.</p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">02</span>
                  <div>
                    <strong>Theory next</strong>
                    <p>Then ask how moral trade fits inside ordinary economic ideas.</p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">03</span>
                  <div>
                    <strong>Trust and practice</strong>
                    <p>Only then turn to obstacles, applications, and what a market might require.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="hero-proof-strip" aria-label="Credibility signals">
            <article className="proof-card">
              <p className="proof-label">A great diversity of moral views</p>
              <p>
                The paper begins from pluralism rather than consensus. Disagreement is the starting
                condition, not a defect to be removed first.
              </p>
              <a className="inline-link" href="#introduction">
                Read the introduction
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">A different way forward</p>
              <p>
                Instead of only remaining in antagonistic relationships, people with different
                moral views may sometimes make the world better in both of their views.
              </p>
              <a className="inline-link" href="#examples">
                Review the examples
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Potential gains can be large</p>
              <p>
                The paper argues that the gains from moral trade may be very large, but practical
                obstacles and externalities make the subject difficult.
              </p>
              <a className="inline-link" href="#gains">
                Read the limitations
              </a>
            </article>
          </div>
        </div>
      </header>

      <main>
        <section className="section section-white" id="introduction">
          <div className="section-head">
            <p className="eyebrow">Introduction</p>
            <h2>Moral trade begins from disagreement, not consensus</h2>
            <p>
              The basic question is whether people with different moral views can make exchanges
              such that the resulting world is better according to both of their moral views than
              the world that would have resulted if they had acted separately.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>A great diversity of moral views</h3>
              <p>
                The starting point is moral pluralism. People care about different things and do
                not rank them in the same way.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Antagonism is common, but not necessary</h3>
              <p>
                People with different moral views often end up in antagonistic relationships, but
                that need not be the whole story.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Moral barter and beyond</h3>
              <p>
                The paper starts with moral barter, but it does not stop there. It asks what
                bargaining, currency, professionalization, and markets for moral trade might add.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="examples">
          <div className="section-head">
            <p className="eyebrow">Examples</p>
            <h2>Ord begins with examples before turning to theory</h2>
            <p>
              The paper&apos;s method is concrete. It first shows examples that look morally odd at
              first glance, then argues that they are intelligible forms of trade.
            </p>
          </div>

          <div className="proposition-grid">
            {vignettes.map((dialogue) => (
              <article key={dialogue.title} className="panel proposition-card">
                <p className="detail-kicker">{dialogue.type}</p>
                <h3>{dialogue.title}</h3>
                <dl className="proposition-structure">
                  <div>
                    <dt>Case</dt>
                    <dd>{dialogue.proposition}</dd>
                  </div>
                  <div>
                    <dt>Why it works</dt>
                    <dd>{dialogue.premise}</dd>
                  </div>
                  <div>
                    <dt>Practical form</dt>
                    <dd>{dialogue.commitment}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="varieties">
          <div className="section-head">
            <p className="eyebrow">Varieties</p>
            <h2>The paper distinguishes pure, mixed, and edge cases</h2>
            <p>
              Moral trade is not one single pattern. Ord distinguishes cleaner cases from mixed
              ones and notes that some agent-relative or intrapersonal cases sit at the edge.
            </p>
          </div>

          <div className="concept-grid">
            {varieties.map((item) => (
              <article key={item.title} className="panel concept-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" id="theory">
          <div className="section-head">
            <p className="eyebrow">Some economic theory of moral trade</p>
            <h2>Ord then places moral trade inside ordinary economic ideas</h2>
            <p>
              The paper uses familiar economic ideas, but with moral views taking the place that
              differing preferences usually occupy.
            </p>
          </div>

          <div className="trust-grid">
            {theoryCards.map((item) => (
              <article key={item.title} className="panel trust-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="trust">
          <div className="section-head">
            <p className="eyebrow">Trust</p>
            <h2>The major practical obstacle is insufficient trust</h2>
            <p>
              After the theory, the paper turns to the main practical difficulty. The gains may be
              real, but they are often blocked by factual and counterfactual trust problems.
            </p>
          </div>

          <div className="trust-grid">
            {trustIssues.map((item) => (
              <article key={item.title} className="panel trust-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" id="cases">
          <div className="section-head">
            <p className="eyebrow">Practical cases</p>
            <h2>Only after trust does the paper turn to applications and markets</h2>
            <p>
              Vote trading, redirected donations, and simple matching mechanisms are treated as the
              nearest practical cases. More complete markets are presented as a later possibility.
            </p>
          </div>

          <div className="concept-grid">
            {practicalCases.map((item) => (
              <article key={item.title} className="panel concept-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="gains">
          <div className="section-head">
            <p className="eyebrow">Gains and limitations</p>
            <h2>The gains may be large, but they are not simple</h2>
            <p>
              The paper argues that the potential gains can be large, yet also warns that moral
              trade does not automatically align with what is best overall.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Large gains are plausible</h3>
              <p>
                When opposed efforts cancel out, or when one person can cheaply motivate what the
                other values greatly, the gains from trade may be substantial.
              </p>
            </article>

            <article className="panel concept-card">
              <h3>Aggregation is difficult</h3>
              <p>
                Unlike ordinary trade, the gains cannot be added up by a common currency in any
                simple way. Much depends on which moral view is correct and on what is left out.
              </p>
            </article>

            <article className="panel concept-card" id="transparency">
              <h3>Better for the parties is not always better overall</h3>
              <p>
                Externalities, objective morality, and perverse incentives can all drive a wedge
                between what the parties to a trade prefer and what is best overall.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="sources">
          <div className="section-head">
            <p className="eyebrow">Paper structure and sources</p>
            <h2>The site now follows the paper&apos;s argumentative order</h2>
            <p>
              The argument runs from examples, to varieties, to theory, to trust, to practical
              cases, and finally to the size and difficulty of the gains.
            </p>
          </div>

          <div className="editorial-grid editorial-grid-wide">
            <article className="panel editorial-card">
              <h3>How the site is organized</h3>
              <ul className="clean-list">
                <li>Introduction and examples first</li>
                <li>Varieties of moral trade second</li>
                <li>Economic theory after that</li>
                <li>Trust problems before applications</li>
                <li>Practical cases, gains, and objections last</li>
              </ul>
            </article>

            <article className="panel editorial-card">
              <h3>Primary source</h3>
              <div className="reference-list">
                <a href="https://www.amirrorclear.net/files/moral-trade.pdf" rel="noreferrer" target="_blank">
                  Toby Ord, "Moral Trade"
                </a>
              </div>
              <p className="editorial-note">
                This site uses the paper as the main structural guide: examples, theory, trust,
                practical cases, and then the larger question of what fuller markets might add.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white exchange-section" id="workspace">
          <div className="section-head">
            <p className="eyebrow">A first sketch</p>
            <h2>A simple local sketch of a very incomplete market</h2>
            <p>
              Ord suggests that first efforts would probably do better if they kept things simple.
              This section does exactly that: one-to-one examples with explicit terms.
            </p>
          </div>

          <div className="exchange-grid">
            <OfferComposer
              draft={draft}
              onFieldChange={handleDraftFieldChange}
              onModeChange={handleModeChange}
              onResetLocalOffers={handleResetLocalOffers}
              onSubmit={handleSubmit}
            />

            <section className="panel market-panel">
              <div className="panel-head market-head">
                <div>
                  <p className="eyebrow">Worked cases</p>
                  <h3>Possible trades</h3>
                </div>
                <div className="panel-note">
                  {visibleOffers.length} visible | {allOffers.length} total | {localOffers.length}{" "}
                  local | {exactMatches.length} strong reciprocal fit
                </div>
              </div>

              <div className="toolbar">
                <label className="field compact-field">
                  <span>Trade type</span>
                  <select
                    value={filters.mode}
                    onChange={(event) => handleFilterChange("mode", event.currentTarget.value)}
                  >
                    {FILTER_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field compact-field">
                  <span>Cause area</span>
                  <select
                    value={filters.cause}
                    onChange={(event) => handleFilterChange("cause", event.currentTarget.value)}
                  >
                    <option value="all">All causes</option>
                    {CAUSE_OPTIONS.map((cause) => (
                      <option key={cause} value={cause}>
                        {cause}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field compact-field">
                  <span>Ordering</span>
                  <select
                    value={filters.sortOrder}
                    onChange={(event) =>
                      handleFilterChange("sortOrder", event.currentTarget.value)
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <OfferBoard
                offers={visibleOffers}
                selected={selectedOffer}
                onRemoveOffer={handleRemoveOffer}
                onSelectOffer={setSelectedOfferId}
              />
            </section>
          </div>
        </section>

        <section className="section section-subtle" id="analysis">
          <div className="section-head">
            <p className="eyebrow">Comparing trades</p>
            <h2>Inspect a possible exchange from both points of view</h2>
            <p>
              This is still only a heuristic. It helps compare what each side says it would gain
              relative to the default option.
            </p>
          </div>

          <div className="analysis-grid">
            <OfferDetails
              matches={displayedMatches}
              selected={selectedOffer}
              onFocusOffer={setSelectedOfferId}
            />
          </div>

          <ParetoChart
            pairs={exactMatches.length ? exactMatches : scoredPairs.slice(0, 4)}
            selected={selectedOffer}
          />
        </section>

        <section className="section section-white" id="faq">
          <div className="section-head">
            <p className="eyebrow">Objections and open questions</p>
            <h2>The paper ends with practical and moral difficulties still in view</h2>
            <p>
              The gains may be large, but trust, incentives, and the relation between traded gains
              and what is actually best remain unresolved.
            </p>
          </div>

          <div className="faq-list">
            {faqItems.map((item) => (
              <details key={item.question} className="panel faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}
