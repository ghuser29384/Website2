"use client";

import { useEffect, useState, type FormEvent } from "react";

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

interface HomePageProps {
  isAuthenticated: boolean;
}

export function HomePage({ isAuthenticated }: HomePageProps) {
  const [draft, setDraft] = useState<OfferDraft>(createDefaultOfferDraft());
  const [filters, setFilters] = useState<OfferFilters>(DEFAULT_FILTERS);
  const [localOffers, setLocalOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState("seed-victoria");
  const [statusMessage, setStatusMessage] = useState("");
  const [hasLoadedLocalOffers, setHasLoadedLocalOffers] = useState(false);

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
    setStatusMessage(`Added ${offer.alias}'s offer to the local market.`);
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
    setStatusMessage("Reset the market to seeded examples.");
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
        <SiteTopbar
          brandHref="/"
          links={[
            { href: "/offers", label: "Offers" },
            { href: "#exchange", label: "Build a trade" },
            { href: "#trust", label: "Trust rails" },
            { href: "#safeguards", label: "Safeguards" },
          ]}
          authLink={
            isAuthenticated
              ? { href: "/dashboard", label: "Dashboard" }
              : { href: "/login", label: "Log in" }
          }
          primaryAction={
            isAuthenticated
              ? { href: "/offers/new", label: "Create offer" }
              : { href: "/signup", label: "Sign up" }
          }
          showLogout={isAuthenticated}
        />

        <div className="hero-grid">
          <section className="hero-copy" id="top">
            <p className="eyebrow">Reciprocal ethics, not zero-sum conflict</p>
            <h1>Turn moral disagreement into structured exchange.</h1>
            <p className="hero-text">
              This prototype turns Toby Ord&apos;s idea of moral trade into a usable market:
              people can publish reciprocal offers, set trust requirements, and find
              Pareto-improving matches across different causes.
            </p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href={isAuthenticated ? "/dashboard" : "/signup"}
              >
                {isAuthenticated ? "Open dashboard" : "Sign up"}
              </a>
              <a className="button button-secondary" href="/offers">
                Browse offers
              </a>
            </div>

            <div className="hero-metrics">
              <article className="metric-card">
                <span className="metric-value">3</span>
                <span className="metric-label">exchange modes</span>
              </article>
              <article className="metric-card">
                <span className="metric-value">4</span>
                <span className="metric-label">trust rails</span>
              </article>
              <article className="metric-card">
                <span className="metric-value">Local</span>
                <span className="metric-label">storage and matching</span>
              </article>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">How the product maps to the paper</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Pledge swap</strong>
                  <p>
                    Exchange recurring actions across causes, like vegetarianism for poverty
                    giving.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Donation offset</strong>
                  <p>
                    Cancel opposed spending and redirect matched funds to a compromise
                    destination.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Paid action offer</strong>
                  <p>
                    Pay someone to take a meaningful action when the world-improvement is
                    worth more to you than the cash.
                  </p>
                </div>
              </div>
            </div>

            <div className="mini-board">
              <div className="mini-chip">Animal welfare</div>
              <div className="mini-arrow">for</div>
              <div className="mini-chip">Global poverty</div>
              <div className="mini-arrow">or</div>
              <div className="mini-chip">Financial support</div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Product structure</p>
            <h2>A market for three main varieties of moral trade</h2>
            <p>
              The paper highlights recurring personal arrangements, matched cancellation of
              opposed donations, and direct incentive payments for action. This site
              supports all three, then layers on trust, counterfactual honesty, and simple
              matching rules.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Personal pledge swaps</h3>
              <p>
                Use when each side is willing to take on a new habit, donation, or recurring
                act only if the other side does something they deeply value.
              </p>
              <ul className="clean-list">
                <li>Vegetarian or low-meat commitments</li>
                <li>Recurring donations or volunteer hours</li>
                <li>Climate, poverty, public health, and local community actions</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>Donation offsets</h3>
              <p>
                Use when two sides would otherwise fund opposed advocacy. The site helps
                them cancel out those transfers and redirect the matched portion to a
                compromise cause.
              </p>
              <ul className="clean-list">
                <li>One-to-one or ratio-based matching</li>
                <li>Shared compromise destination</li>
                <li>Unmatched surplus stays visible instead of hidden</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>Paid action offers</h3>
              <p>
                Use when one party is willing to spend money to induce an action they value,
                and the other party would rationally accept because the payment outweighs
                the burden.
              </p>
              <ul className="clean-list">
                <li>Pay for vegetarian, giving, or volunteer commitments</li>
                <li>Useful when the other side is already somewhat persuadable</li>
                <li>Best with escrow, milestones, and visible completion rules</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-cream exchange-section" id="exchange">
          <div className="section-head">
            <p className="eyebrow">Interactive market</p>
            <h2>Publish an offer and see who can match it</h2>
            <p>
              Offers are stored in your browser only. Seeded examples mirror the paper&apos;s
              main use cases so the market has enough structure to explore immediately,
              including direct payment-for-action trades.
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
                  <p className="eyebrow">Live board</p>
                  <h3>Offer book</h3>
                </div>
                <div className="panel-note">
                  {visibleOffers.length} visible · {allOffers.length} total · {localOffers.length}{" "}
                  local · {exactMatches.length} reciprocal
                </div>
              </div>

              <div className="toolbar">
                <label className="field compact-field">
                  <span>Mode</span>
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
                  <span>Cause</span>
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
                  <span>Sort</span>
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

        <section className="section section-white" id="analysis">
          <div className="section-head">
            <p className="eyebrow">Matching and frontier view</p>
            <h2>Selected offers generate reciprocal matches and a simple Pareto map</h2>
            <p>
              The chart approximates the paper&apos;s idea of moving from a status quo point
              toward outcomes that are better for both parties. It is illustrative, not a
              moral calculus.
            </p>
          </div>

          <div className="analysis-grid">
            <OfferDetails
              matches={displayedMatches}
              selected={selectedOffer}
              onFocusOffer={setSelectedOfferId}
            />
          </div>

          <ParetoChart selected={selectedOffer} pairs={exactMatches.length ? exactMatches : scoredPairs.slice(0, 4)} />
        </section>

        <section className="section section-cream" id="trust">
          <div className="section-head">
            <p className="eyebrow">Trust rails</p>
            <h2>Built around the two trust problems Ord identifies</h2>
            <p>
              Factual trust asks whether the other side is actually complying. Counterfactual
              trust asks whether they would have done it anyway. The UI makes both visible.
            </p>
          </div>

          <div className="trust-grid">
            <article className="panel trust-card">
              <h3>Factual trust</h3>
              <p>
                Verification labels surface how the trade is checked: receipts, witnesses,
                public pledges, or escrow.
              </p>
            </article>
            <article className="panel trust-card">
              <h3>Counterfactual trust</h3>
              <p>
                Every user must attest that their offer depends on a trade, preventing empty
                signaling.
              </p>
            </article>
            <article className="panel trust-card">
              <h3>Review cadence</h3>
              <p>
                Shorter review periods make it easier to re-evaluate, which the paper
                suggests helps manage uncertainty.
              </p>
            </article>
            <article className="panel trust-card">
              <h3>Compromise destinations</h3>
              <p>
                Offset trades redirect moral conflict into shared good rather than mere
                cancellation.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" id="safeguards">
          <div className="section-head">
            <p className="eyebrow">Safeguards</p>
            <h2>This prototype narrows the market to reduce obvious failure modes</h2>
            <p>
              The paper discusses negative externalities and perverse incentives. A real
              deployment would need identity, moderation, legal review, and abuse handling.
              This prototype visibly constrains the domain.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>What is allowed</h3>
              <ul className="clean-list">
                <li>Habits, donations, volunteer time, and lifestyle commitments</li>
                <li>Offsetting opposed donations into a compromise destination</li>
                <li>Direct payments for verified actions or sustained behavior changes</li>
                <li>Locally negotiated trust and review periods</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>What is excluded</h3>
              <ul className="clean-list">
                <li>No election or ballot-vote swapping</li>
                <li>No illegal, deceptive, or coercive trades</li>
                <li>No harmful behaviors performed just to extract side payments</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>What a production version needs</h3>
              <ul className="clean-list">
                <li>Authentication and audit trails</li>
                <li>Escrow or bonded verification for larger trades</li>
                <li>Moderation, legal review, and jurisdiction-aware rules</li>
              </ul>
            </article>
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
