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

const standards = [
  {
    title: "Bounded commitments",
    text: "The platform focuses on specific actions, time horizons, and review periods rather than vague declarations of agreement.",
  },
  {
    title: "Counterfactual honesty",
    text: "Participants are asked to state whether the action really depends on the trade, reflecting one of the core trust problems in the paper.",
  },
  {
    title: "Visible verification",
    text: "Receipts, public pledges, witness checks, and escrow-style approaches are made explicit so outsiders can inspect what is and is not being verified.",
  },
  {
    title: "Open limitations",
    text: "The product states its own limits instead of pretending to settle all moral disagreement. It is a coordination tool, not a final arbiter.",
  },
] as const;

const featuredDialogues = [
  {
    type: "Pledge swap",
    title: "Vegetarianism in exchange for poverty giving",
    proposition:
      "Victoria offers a year of poverty-focused giving if another participant adopts a vegetarian diet for the same period.",
    premise:
      "Each side values the other action enough that the combined result looks better, from their own perspective, than acting alone.",
    commitment: "Reviewable receipts, a defined term, and a public or witnessed record of compliance.",
  },
  {
    type: "Donation offset",
    title: "Redirecting opposed advocacy into a compromise destination",
    proposition:
      "Two people who would have funded opposed advocacy redirect the matched portion into a mutually acceptable cause instead.",
    premise:
      "If the original spending would largely cancel out, coordinated redirection can create more moral value than the status quo.",
    commitment: "Matched amounts, a named destination, and clear rules for any unmatched surplus.",
  },
  {
    type: "Paid action offer",
    title: "Paying for a morally valued action",
    proposition:
      "A participant offers money for another person to take on a concrete action, such as a vegetarian commitment, when both regard the exchange as worthwhile.",
    premise:
      "Some actions are burdensome but not prohibitively so; a payment can make the trade prudentially attractive while still looking morally worthwhile to the payer.",
    commitment: "Milestones, verification, and a stated burden threshold so the offer does not become coercive or undefined.",
  },
] as const;

const faqItems = [
  {
    question: "Is Moral Trade a discussion forum or social feed?",
    answer:
      "No. The product is intentionally narrow. It is built around structured offers, explicit conditions, and reviewable commitments rather than open-ended debate or engagement loops.",
  },
  {
    question: "Does Moral Trade claim to resolve deep moral disagreement?",
    answer:
      "No. It provides a disciplined way to coordinate when people with different priorities can still identify mutually worthwhile commitments.",
  },
  {
    question: "What keeps the platform from becoming manipulative or shallow?",
    answer:
      "The interface avoids rankings, gamified incentives, and endless feeds. Instead it emphasizes bounded actions, evidence, review periods, and explicit limitations.",
  },
  {
    question: "What is still missing?",
    answer:
      "A production version would still need moderation, identity checks, legal review, and more robust verification or escrow for higher-stakes commitments.",
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
    transform: `translate3d(${(1 - safeProgress) * 34}px, 0, 0)`,
    clipPath: `inset(0 ${100 - safeProgress * 100}% 0 0)`,
  };
}

function getWordRevealStyle(progress: number): CSSProperties {
  const safeProgress = clamp(progress);

  return {
    opacity: safeProgress,
    transform: `translate3d(${(1 - safeProgress) * 24}px, 0, 0)`,
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
              <p className="eyebrow">Structured moral reflection and reciprocal commitment</p>
              <h1>A disciplined public framework for moral trade.</h1>
              <p className="hero-text">
                Moral Trade is a structured environment for people with different moral priorities
                to make bounded, reviewable commitments when each judges the resulting world to be
                better than the status quo. It is designed as a coordination mechanism, not a
                casual discussion forum or engagement-driven marketplace.
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
                <li>Paper-based framework</li>
                <li>Explicit verification terms</li>
                <li>Public limitations stated upfront</li>
              </ul>
              <p className="hero-followup">
                Review the <Link href="/offers">public offers directory</Link> and the
                methodology below before participating in a live exchange.
              </p>
            </section>

            <aside className="hero-panel panel">
              <p className="eyebrow">Operating discipline</p>
              <div className="flow-card">
                <div className="flow-step">
                  <span className="flow-number">01</span>
                  <div>
                    <strong>Defined commitments</strong>
                    <p>
                      Every proposal names the action, term, review cadence, and verification
                      approach instead of relying on vague moral aspiration.
                    </p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">02</span>
                  <div>
                    <strong>Reciprocal reasoning</strong>
                    <p>
                      The counterparty request, burden, and trust assumptions are visible from the
                      start so participants can inspect the structure of the exchange.
                    </p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">03</span>
                  <div>
                    <strong>Transparent limits</strong>
                    <p>
                      The interface keeps unresolved uncertainty in view and states plainly what
                      this prototype does not yet verify or institutionalize.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="hero-proof-strip" aria-label="Credibility signals">
            <article className="proof-card">
              <p className="proof-label">Grounded in existing reasoning</p>
              <p>
                The core workflow is drawn from moral trade as reciprocal gain under moral
                disagreement, not from social-feed habits or generic marketplace growth tactics.
              </p>
              <a className="inline-link" href="#methodology">
                Review the method
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Visible reasoning standards</p>
              <p>
                Counterfactual honesty, verification, review cadence, and bounded scope are
                treated as first-class constraints rather than buried implementation details.
              </p>
              <a className="inline-link" href="#standards">
                See the standards
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Institutional transparency</p>
              <p>
                No endorsements are claimed, and the current prototype openly states what it does
                not yet solve, verify, or govern.
              </p>
              <a className="inline-link" href="#transparency">
                Read the limitations
              </a>
            </article>
          </div>
        </div>
      </header>

      <main>
        <section className="section section-white" id="about">
          <div className="section-head">
            <p className="eyebrow">What Moral Trade is</p>
            <h2>A serious coordination mechanism for moral disagreement</h2>
            <p>
              Moral Trade is meant to support careful deliberation about mutually worthwhile
              commitments. It does not assume shared moral beliefs. Instead, it asks whether
              people with different values can still identify structured exchanges that each side
              regards as morally better than acting alone.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Structured instead of open-ended</h3>
              <p>
                The product is intentionally narrow. It focuses on explicit proposals, shared
                terms, and reviewable commitments rather than endless argument or reactive
                engagement.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Institutional rather than transactional</h3>
              <p>
                The goal is not price discovery or transaction volume. The goal is principled
                coordination under moral uncertainty, with visible safeguards and boundaries.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Reasoning-led by design</h3>
              <p>
                The site is grounded in Toby Ord&apos;s paper on moral trade and related work on
                moral public goods and coordination across worldviews.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="how-it-works">
          <div className="section-head">
            <p className="eyebrow">How Moral Trade works</p>
            <h2>Three structured exchange formats, one disciplined workflow</h2>
            <p>
              The paper emphasizes several recurring forms of mutually beneficial moral exchange.
              Moral Trade makes those forms legible by requiring explicit actions, reciprocal
              terms, and trust conditions.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Personal pledge swaps</h3>
              <p>
                Two people each take on a commitment they value less than the counterparty values
                it, creating room for reciprocal gain.
              </p>
              <ul className="clean-list">
                <li>Recurring donations, volunteering, or habit changes</li>
                <li>Defined time horizon and verification method</li>
                <li>Useful when each side can motivate the other more effectively than itself</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>Donation offsets</h3>
              <p>
                Where opposed spending would largely cancel out, both sides can redirect the
                matched amount into a compromise destination.
              </p>
              <ul className="clean-list">
                <li>Matched redirection instead of zero-sum spending</li>
                <li>Named compromise destination and visible unmatched surplus</li>
                <li>Especially relevant for public-goods style conflicts</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>Paid action offers</h3>
              <p>
                One person offers money for another person to take on a morally valued action when
                both see the exchange as worthwhile on their own terms.
              </p>
              <ul className="clean-list">
                <li>Appropriate for bounded actions with clear milestones</li>
                <li>Requires extra care around burden, clarity, and verification</li>
                <li>Most credible when the terms are highly specific</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-white" id="standards">
          <div className="section-head">
            <p className="eyebrow">Why this is epistemically serious</p>
            <h2>Designed to make assumptions, uncertainty, and trust visible</h2>
            <p>
              Moral disagreement does not disappear just because people reach an exchange. The
              platform therefore foregrounds the parts of the reasoning that most often stay
              implicit.
            </p>
          </div>

          <div className="trust-grid">
            {standards.map((item) => (
              <article key={item.title} className="panel trust-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" id="examples">
          <div className="section-head">
            <p className="eyebrow">Example propositions</p>
            <h2>Illustrative dialogues and commitments</h2>
            <p>
              These examples are not endorsements. They are structured examples of the kinds of
              propositions the paper and related discussion suggest are possible.
            </p>
          </div>

          <div className="proposition-grid">
            {featuredDialogues.map((dialogue) => (
              <article key={dialogue.title} className="panel proposition-card">
                <p className="detail-kicker">{dialogue.type}</p>
                <h3>{dialogue.title}</h3>
                <dl className="proposition-structure">
                  <div>
                    <dt>Proposition</dt>
                    <dd>{dialogue.proposition}</dd>
                  </div>
                  <div>
                    <dt>Underlying premise</dt>
                    <dd>{dialogue.premise}</dd>
                  </div>
                  <div>
                    <dt>What makes it credible</dt>
                    <dd>{dialogue.commitment}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="commitments">
          <div className="section-head">
            <p className="eyebrow">Public commitments and safeguards</p>
            <h2>Commitments should be reviewable, narrow, and openly constrained</h2>
            <p>
              A trustworthy moral trade institution should make both the commitments and the
              boundaries around them visible.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>What the platform is designed for</h3>
              <ul className="clean-list">
                <li>Specific habits, donations, volunteer time, and bounded lifestyle changes</li>
                <li>Transparent reciprocal terms rather than vague moral promises</li>
                <li>Structured review periods and legible verification expectations</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>What is deliberately excluded</h3>
              <ul className="clean-list">
                <li>No illegal, deceptive, or coercive arrangements</li>
                <li>No election or vote trading</li>
                <li>No harmful acts performed merely to extract side payments</li>
              </ul>
            </article>

            <article className="panel concept-card" id="transparency">
              <h3>What still requires institutional work</h3>
              <ul className="clean-list">
                <li>Robust moderation and dispute handling</li>
                <li>Escrow, audit trails, and stronger identity checks</li>
                <li>Legal review and clearer jurisdiction-specific policies</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="methodology">
          <div className="section-head">
            <p className="eyebrow">Methodology and sources</p>
            <h2>Public reasoning standards, reference materials, and limitations</h2>
            <p>
              The site should be trusted, if at all, because its method is inspectable. The
              references below are presented as sources of reasoning, not as endorsements.
            </p>
          </div>

          <div className="editorial-grid editorial-grid-wide">
            <article className="panel editorial-card">
              <h3>How we reason</h3>
              <ul className="clean-list">
                <li>State the action, counterparty request, and review period in concrete terms</li>
                <li>Keep counterfactual dependence explicit wherever possible</li>
                <li>Distinguish moral benefit claims from verification claims</li>
                <li>Be transparent when the interface is only illustrative or incomplete</li>
              </ul>
            </article>

            <article className="panel editorial-card">
              <h3>Reference materials</h3>
              <div className="reference-list">
                <a href="https://www.amirrorclear.net/files/moral-trade.pdf" rel="noreferrer" target="_blank">
                  Toby Ord, "Moral Trade"
                </a>
                <a
                  href="https://www.forethought.org/research/moral-public-goods-are-a-big-deal-for-whether-we-get-a-good-future"
                  rel="noreferrer"
                  target="_blank"
                >
                  Forethought, "Moral public goods are a big deal for whether we get a good future"
                </a>
              </div>
              <p className="editorial-note">
                The Forethought piece is relevant here because it highlights the importance of
                institutions that help people cooperate on shared moral goods despite deep moral
                uncertainty.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white exchange-section" id="workspace">
          <div className="section-head">
            <p className="eyebrow">Illustrative workspace</p>
            <h2>Prototype the structure before moving into live offers</h2>
            <p>
              This section is intentionally labeled as a client-side prototype. It is useful for
              understanding the shape of a trade, but it should not be confused with the
              account-backed public offers directory.
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
                  <p className="eyebrow">Illustrative offer book</p>
                  <h3>Structured proposals</h3>
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
            <p className="eyebrow">Reciprocity analysis</p>
            <h2>Inspect the structure of a candidate exchange</h2>
            <p>
              The matching view is illustrative. It does not claim to resolve all-value
              comparisons. It helps participants inspect whether reciprocal terms, trust, and
              minimum thresholds line up well enough to justify further discussion.
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
            <p className="eyebrow">FAQ</p>
            <h2>Transparency about scope and limitations</h2>
            <p>
              A trustworthy institution should make it easy to see what it is for, what it is not
              for, and what remains uncertain.
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
