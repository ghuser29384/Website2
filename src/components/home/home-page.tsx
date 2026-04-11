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
    text: "A trade should say what each side does, for how long, and under what conditions it counts as completed.",
  },
  {
    title: "Counterfactual honesty",
    text: "The gains disappear if the act would have happened anyway, so the site asks whether the trade changes what the parties do.",
  },
  {
    title: "Resource-compatibility",
    text: "Some moral views can be largely satisfied with the same resources. Those cases deserve special attention because the gains from trade can be especially large.",
  },
  {
    title: "Threats are not trades",
    text: "Mutually beneficial exchange is one thing; coercive pressure is another. The site treats threats and destructive bargaining as a different problem from moral trade.",
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
    question: "Is Moral Trade a discussion forum or social feed?",
    answer:
      "No. It is for offers, reciprocal terms, and reviewable commitments, not for open-ended discussion.",
  },
  {
    question: "Does Moral Trade claim to resolve deep moral disagreement?",
    answer:
      "No. It asks whether people with different moral views can still find exchanges that each sees as morally better.",
  },
  {
    question: "What keeps this from becoming shallow or manipulative?",
    answer:
      "The site stays with offers, terms, counterfactual dependence, and verification.",
  },
  {
    question: "Why doesn't trade guarantee a mostly-great future?",
    answer:
      "Because trade can be blocked or undermined by threats, concentrated power, and collective procedures that seal off futures some views value highly.",
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
              <p className="eyebrow">People with different moral views</p>
              <h1>There is another type of trade.</h1>
              <p className="hero-text">
                People with different moral views need not only remain in antagonistic
                relationships. They may be able to exchange goods or services so that each regards
                the world as better than it otherwise would have been.
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
                <li>Different moral views</li>
                <li>Mutual moral gain</li>
                <li>Explicit terms</li>
              </ul>
              <p className="hero-followup">
                Review the <Link href="/offers">public offers</Link> and the method below before
                taking part.
              </p>
            </section>

            <aside className="hero-panel panel">
              <p className="eyebrow">What has to be stated</p>
              <div className="flow-card">
                <div className="flow-step">
                  <span className="flow-number">01</span>
                  <div>
                    <strong>What is traded</strong>
                    <p>
                      The offer should say what each side will do.
                    </p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">02</span>
                  <div>
                    <strong>Would it happen anyway?</strong>
                    <p>
                      The trade matters only if it changes what the parties do.
                    </p>
                  </div>
                </div>
                <div className="flow-step">
                  <span className="flow-number">03</span>
                  <div>
                    <strong>How is it checked?</strong>
                    <p>
                      Verification has to be stated rather than assumed.
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
                Forethought treats trade and compromise as &quot;the most likely way&quot; to a
                mostly-great future under partial convergence, but only under the right conditions.
              </p>
              <a className="inline-link" href="#methodology">
                Review the method
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Resource-compatible views</p>
              <p>
                Some values compete less than they first appear to. When views can share the same
                resources, the gains from trade or compromise can be much larger.
              </p>
              <a className="inline-link" href="#standards">
                See the standards
              </a>
            </article>
            <article className="proof-card">
              <p className="proof-label">Threats can destroy value</p>
              <p>
                The gains from trade are not automatic. Threats, concentrated power, and badly
                chosen collective procedures can wipe out much of the value at stake.
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
            <h2>People with different moral views need not only oppose one another</h2>
            <p>
              Moral trade begins from disagreement, not from consensus. The question is whether
              people with different moral views can find exchanges from which both gain, morally,
              in their own view.
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
                The paper begins with simple barter and then asks what currency, bargaining,
                professionalization, and markets for moral trade might add.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="how-it-works">
          <div className="section-head">
            <p className="eyebrow">How Moral Trade works</p>
            <h2>From moral barter to more organized exchange</h2>
            <p>
              The paper starts with direct exchange and then points toward richer forms of moral
              trade. The related Forethought discussion asks when trade and compromise are
              resource-compatible enough to preserve most of what different views care about.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Personal pledge swaps</h3>
              <p>
                Two people each do something the other cares about more, so both can gain from the
                exchange.
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
                compromise destination instead.
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
                One person can pay another to take up an action that matters morally to the payer.
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
            <h2>Make the gains, the compatibility, and the threat problem visible</h2>
            <p>
              A moral trade is not established just because both sides like the idea. The relevant
              acts, gains, compatibility conditions, and threat assumptions have to be stated.
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
            <p className="eyebrow">Public commitments and safeguards</p>
            <h2>A trade should say what each side does and when it counts</h2>
            <p>
              Ord&apos;s examples work because the acts are concrete enough to compare and, at
              least in principle, to verify.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Where direct trade is easiest</h3>
              <ul className="clean-list">
                <li>Specific habits, donations, volunteer time, and bounded lifestyle changes</li>
                <li>Transparent reciprocal terms rather than vague moral promises</li>
                <li>Cases where the parties can still preserve most of what they care about</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>What is deliberately excluded</h3>
              <ul className="clean-list">
                <li>No illegal, deceptive, coercive, or threatening arrangements</li>
                <li>No election or vote trading</li>
                <li>No harmful acts performed merely to extract side payments</li>
              </ul>
            </article>

            <article className="panel concept-card" id="transparency">
              <h3>What remains difficult</h3>
              <ul className="clean-list">
                <li>Preventing threats, hold-up, and other value-destroying bargaining</li>
                <li>Avoiding concentrated power over collective choices</li>
                <li>Robust moderation and dispute handling</li>
                <li>Escrow, audit trails, legal review, and stronger identity checks</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-subtle" id="methodology">
          <div className="section-head">
            <p className="eyebrow">Methodology and sources</p>
            <h2>Reference materials and open questions</h2>
            <p>
              The paper is the main reference point. It starts with moral barter and then asks
              what more organized forms of moral trade might look like. The Forethought essay asks
              when convergence, trade, and compromise are enough to keep society close to the best
              futures.
            </p>
          </div>

          <div className="editorial-grid editorial-grid-wide">
            <article className="panel editorial-card">
              <h3>How we reason</h3>
              <ul className="clean-list">
                <li>Specify the act on each side</li>
                <li>State why each side gains, in its own view</li>
                <li>Ask whether the views are resource-compatible</li>
                <li>Keep counterfactual dependence explicit</li>
                <li>Distinguish trade from threats, and the moral claim from the verification claim</li>
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
                Forethought calls trade and compromise &quot;the most likely way&quot; forward in
                many cases, while warning about threats, concentrated power, and badly chosen
                collective procedures.
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
            <p className="eyebrow">Gains from trade</p>
            <h2>Inspect the structure of a possible exchange</h2>
            <p>
              This view is only a heuristic. It helps compare reciprocal terms and minimum gains;
              it does not settle moral disagreement.
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
              The paper argues that the gains from moral trade can be large, but major practical
              questions remain about threats, compromise, and collective choice.
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
