"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { MoralTradeAnimations } from "@/components/home/moral-trade-animations";
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
    title: "Resource-compatible views",
    text: "Some views can be jointly served with the same resources through hybrid goods or easily-satiable claims, so the gains from trade can be very large from each view's perspective.",
  },
  {
    title: "Realised gains need institutions",
    text: "What matters is not merely the hypothetical gains from frictionless trade, but which gains are actually realised, which depends on institutions, contracts, and whether parties take improving trades.",
  },
  {
    title: "Threats are different from trade",
    text: "A trade can leave both parties better off by their own lights. A threat can leave at least one side worse off whichever option it chooses.",
  },
  {
    title: "Blockers can seal off futures",
    text: "Concentration of power, majority rule, and badly chosen collective procedures can exclude minority-valued goods or activities even when trade would otherwise have been possible.",
  },
] as const;

const featuredDialogues = [
  {
    type: "Pledge swap",
    title: "A pledge swap",
    proposition:
      "Victoria gives to poverty-focused charities for a year if another person becomes vegetarian for the same period.",
    premise:
      "Each side prefers the other action to its own and judges the resulting world better than acting alone.",
    commitment: "A fixed term and a way of checking that the acts were done.",
  },
  {
    type: "Donation offset",
    title: "A compromise destination",
    proposition:
      "Two people who would have spent against one another redirect the matched amount to a compromise cause instead.",
    premise:
      "If opposed efforts would largely cancel out, a compromise can leave both moral views better served.",
    commitment: "Matched amounts, a named destination, and a rule for any unmatched funds.",
  },
  {
    type: "Paid action offer",
    title: "Paying for an action",
    proposition:
      "One person offers money for another to take up an action, such as vegetarianism, that the payer regards as important.",
    premise:
      "If the burden is low enough, payment can make the act worth doing for the actor while still looking morally worthwhile to the payer.",
    commitment: "Clear milestones and a way of checking performance.",
  },
] as const;

const faqItems = [
  {
    question: "Why can moral trade matter even if only some people aim at the good?",
    answer:
      "Because even partial convergence can leave room for bargaining and compromise. A minority with meaningful power can still trade with others if each side sees the result as better than acting alone.",
  },
  {
    question: "What decides whether hypothetical gains from trade are actually realised?",
    answer:
      "Institutions, contracts, transaction costs, and whether parties actually take improving trades. Possible gains are not enough on their own.",
  },
  {
    question: "Why are threats a separate problem from trade?",
    answer:
      "Because a threat can make at least one side worse off whichever option it chooses. That is different from a voluntary exchange that both sides regard as better.",
  },
  {
    question: "What can block a mostly-great future even if trade is possible?",
    answer:
      "Value-destroying threats, concentration of power, majority procedures that ban minority-valued goods, and other collective decision rules can all block the gains from trade.",
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
  return (
    <span className="opening-anchor-frame" style={style}>
      {prefix ? <span className="opening-prefix-slot">{prefix}</span> : null}
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
    const browserWindow = globalThis as unknown as {
      innerHeight?: number;
      requestAnimationFrame: (callback: () => void) => number;
      cancelAnimationFrame: (handle: number) => void;
      addEventListener: (type: string, listener: () => void, options?: { passive?: boolean }) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    };

    function updateOpeningProgress() {
      animationFrame = 0;

      if (!openingSequenceRef.current) {
        return;
      }

      const sequenceElement = openingSequenceRef.current as HTMLDivElement & {
        getBoundingClientRect: () => { top: number };
        offsetHeight: number;
      };
      const rect = sequenceElement.getBoundingClientRect();
      const viewportHeight = browserWindow.innerHeight || 1;
      const totalScrollableDistance = Math.max(sequenceElement.offsetHeight - viewportHeight, 1);
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
        animationFrame = browserWindow.requestAnimationFrame(updateOpeningProgress);
      }
    }

    requestUpdate();
    browserWindow.addEventListener("scroll", requestUpdate, { passive: true });
    browserWindow.addEventListener("resize", requestUpdate);

    return () => {
      if (animationFrame) {
        browserWindow.cancelAnimationFrame(animationFrame);
      }
      browserWindow.removeEventListener("scroll", requestUpdate);
      browserWindow.removeEventListener("resize", requestUpdate);
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
      setStatusMessage(validationError);
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

    const shouldReset =
      (globalThis as unknown as { confirm?: (message: string) => boolean }).confirm?.(
        "Remove all local offers and keep only the seeded examples?",
      ) ?? true;

    if (!shouldReset) {
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
              <p className="eyebrow">Trade and compromise under disagreement</p>
              <h1>There is another type of trade.</h1>
              <p className="hero-text">
                Even if only some people aim at the good, trade and compromise can still matter.
                People with different moral views may be able to make voluntary arrangements that
                each regards as morally better than acting alone.
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
                <li>Partial convergence</li>
                <li>Resource-compatible gains</li>
                <li>Threats are different</li>
              </ul>
              <p className="hero-followup">
                Review the <Link href="/offers">public offers</Link> and the safeguards below
                before taking part.
              </p>
            </section>

            <aside className="hero-panel panel">
              <p className="eyebrow">What has to be checked</p>
              <div className="flow-card">
                <div className="flow-step">
                  <span className="flow-number">01</span>
                  <div>
                    <strong>Where the gain comes from</strong>
                    <p>
                      State why each side regards the outcome as better than acting separately.
                    </p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">02</span>
                  <div>
                    <strong>Whether the views are resource-compatible</strong>
                    <p>
                      Some trades work because the same resources can satisfy both views unusually well.
                    </p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">03</span>
                  <div>
                    <strong>Why this is trade rather than threat</strong>
                    <p>
                      A bargain is not enough if one side would still see the world as worse either way.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="hero-proof-strip" aria-label="Credibility signals">
            <article className="proof-card">
              <p className="proof-label">Trade and compromise can matter</p>
              <p>
                Even without full moral convergence, bargaining and compromise may let different
                views reach futures that are much closer to what each values.
              </p>
              <a className="inline-link" href="#methodology">
                Review the method
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Resource-compatible views</p>
              <p>
                Some views can share the same resources unusually well through hybrid goods or
                easily-satiable claims, which can make the gains from trade very large.
              </p>
              <a className="inline-link" href="#standards">
                See the standards
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Threats and blockers can destroy value</p>
              <p>
                Even small risks of executed threats, concentrated power, or badly chosen
                collective procedures can wipe out much of the value that trade would otherwise create.
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
            <h2>Partial convergence can still leave room for trade and compromise</h2>
            <p>
              The key question is not whether everyone shares one moral view. It is whether some
              meaningful minority can still bargain and trade in ways that each side regards as
              better than acting alone.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Partial AM-convergence can still matter</h3>
              <p>
                A mostly-great future need not require full agreement. A minority with meaningful
                power can still matter if trade and compromise are available.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Trade does not depend on one single disagreement</h3>
              <p>
                Different groups can continue to value different natural resources, locations,
                times of use, and risk profiles, even in a technologically mature society.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Compromise can approach near-best futures</h3>
              <p>
                When different views can divide resources or agree on hybrid goods, both can end up
                much closer to what they each regard as best.
              </p>
            </article>
          </div>
        </section>

        <MoralTradeAnimations />

        <section className="section section-subtle" id="how-it-works">
          <div className="section-head">
            <p className="eyebrow">How Moral Trade works</p>
            <h2>Trade remains possible when the reasons for exchange are moral</h2>
            <p>
              The gains can be especially large when one side cares far more about an outcome than
              the other, or when the same resources can satisfy both views unusually well.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Personal pledge swaps</h3>
              <p>
                Two people each do something the other cares about more, so both can gain from the
                exchange if each side values the trade more than the cost it bears.
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
                If opposed spending would largely cancel out, both sides can redirect money to a
                compromise destination instead and each get a future closer to its own view.
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
                One person can pay another to take up an action that matters morally to the payer,
                especially when the actor's cost is low and the payer's moral stake is high.
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
            <p className="eyebrow">Reasoning standards</p>
            <h2>Make the gains, the compatibility, the threats, and the blockers visible</h2>
            <p>
              Sections 3.1 to 3.5 distinguish possible gains from realised gains, and trade from
              threats. Those distinctions should be explicit on the site.
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
              These are examples of the kinds of trade the paper discusses. They are not
              endorsements.
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
                    <dt>What has to be checked</dt>
                    <dd>{dialogue.commitment}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="commitments">
          <div className="section-head">
            <p className="eyebrow">Threats, limits, and safeguards</p>
            <h2>Trade is not enough if threats, power, or procedures destroy value</h2>
            <p>
              The optimistic case for trade is fragile. Threats, concentrated power, and collective
              procedures that seal off minority-valued futures can undo much of the value at stake.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Threats are value-destroying</h3>
              <ul className="clean-list">
                <li>Extortion is not just a hard bargain; it can leave at least one side worse off whichever option it chooses</li>
                <li>Even small risks of executed threats can eat into expected value</li>
                <li>Preventing value-destroying threats is itself a central design goal</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>Concentration of power</h3>
              <ul className="clean-list">
                <li>If only a few people control decisions, the right moral views may not be represented at all</li>
                <li>The bargaining outcome depends on who has power and what happens without agreement</li>
                <li>The platform should not assume that negotiation power is morally benign</li>
              </ul>
            </article>

            <article className="panel concept-card" id="transparency">
              <h3>Sealed-off futures</h3>
              <ul className="clean-list">
                <li>Majority rule can ban goods or activities that minorities value highly</li>
                <li>Decision rules can reward signaling or coalition behavior rather than good reasons</li>
                <li>The same procedure can produce very different outcomes depending on when bargaining happens</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="methodology">
          <div className="section-head">
            <p className="eyebrow">Methodology and sources</p>
            <h2>Trade and compromise are promising, but not self-executing</h2>
            <p>
              Forethought sections 3.1 to 3.5 ask not only whether trade is possible, but whether
              it is realised, whether it survives threats, and whether power and procedures leave
              the best futures reachable at all.
            </p>
          </div>

          <div className="editorial-grid editorial-grid-wide">
            <article className="panel editorial-card">
              <h3>How we reason</h3>
              <ul className="clean-list">
                <li>Ask which gains from frictionless trade are merely hypothetical</li>
                <li>Ask which gains would actually be realised under existing institutions</li>
                <li>Distinguish gains for many views from gains for the correct view</li>
                <li>Separate voluntary trade from value-destroying threats</li>
                <li>Check whether power distribution and decision rules block the best futures</li>
              </ul>
            </article>

            <article className="panel editorial-card">
              <h3>Reference materials</h3>
              <div className="reference-list">
                <a href="https://www.amirrorclear.net/files/moral-trade.pdf" rel="noreferrer" target="_blank">
                  Toby Ord, "Moral Trade"
                </a>
                <a
                  href="https://www.forethought.org/research/convergence-and-compromise#3-what-if-some-people-aim-at-the-good"
                  rel="noreferrer"
                  target="_blank"
                >
                  Forethought, "Convergence and Compromise", section 3
                </a>
              </div>
              <p className="editorial-note">
                These sections are optimistic about trade and compromise, but only under the right
                conditions: realised gains, low threat risk, and procedures that do not seal off
                minority-valued futures.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white exchange-section" id="workspace">
          <div className="section-head">
            <p className="eyebrow">Worked example</p>
            <h2>A local example for thinking through a trade</h2>
            <p>
              This local example lets you state the structure of a trade. It is not yet the wider
              market discussed in the paper.
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
                    onChange={(event) =>
                      handleFilterChange("mode", (event.target as HTMLSelectElement).value)
                    }
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
                    onChange={(event) =>
                      handleFilterChange("cause", (event.target as HTMLSelectElement).value)
                    }
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
                      handleFilterChange("sortOrder", (event.target as HTMLSelectElement).value)
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
            <p className="eyebrow">Gains from trade</p>
            <h2>Inspect the structure of a possible exchange</h2>
            <p>
              This view is only a heuristic. It helps compare reciprocal terms and minimum gains,
              but it cannot by itself tell you whether the gains will actually be realised.
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
            <h2>Open questions</h2>
            <p>
              The optimistic case depends on realised trade, not just hypothetical gains, and it
              remains vulnerable to threats, concentration of power, and poor collective procedures.
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
