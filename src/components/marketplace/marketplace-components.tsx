import Link from "next/link";
import type { ReactNode } from "react";

import { IconMark, type IconName } from "@/components/ui/page-primitives";
import {
  buildCompatibleAdditions,
  buildDealEconomics,
  buildMarketplaceHref,
  getCommitmentStatusLabel,
  type CommitmentCenterStatus,
  type MarketplaceCategory,
  type MarketplaceDeal,
  type MarketplaceFilterChip,
  type MarketplaceQuery,
  type MarketplaceSurface,
} from "@/lib/marketplace-deals";

function mechanismLabel(value: MarketplaceDeal["mechanismType"]) {
  const labels: Record<MarketplaceDeal["mechanismType"], string> = {
    action_for_donation: "Action-for-donation",
    cross_view_donation_swap: "Cross-view swap",
    local_pledge: "Pledge swap",
    offset_trade: "Offset trade",
    public_goods_round: "Public-goods round",
    unknown: "Unknown mechanism",
  };

  return labels[value];
}

function mechanismIcon(value: MarketplaceDeal["mechanismType"]): IconName {
  if (value === "public_goods_round") return "fund";
  if (value === "cross_view_donation_swap") return "swap";
  if (value === "offset_trade") return "offset";
  if (value === "action_for_donation") return "payment";
  if (value === "local_pledge") return "evidence";
  return "marketplace";
}

function statusLabel(value: MarketplaceDeal["status"] | undefined) {
  if (!value) return "Status unavailable";
  return value.replaceAll("_", " ");
}

function reviewLabel(value: MarketplaceDeal["reviewStatus"] | undefined) {
  if (!value) return "Review unavailable";
  return value.replaceAll("_", " ");
}

function formatDate(value: string | undefined) {
  if (!value) return "Deadline unavailable";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Deadline unavailable";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function percentProgress(current?: number, target?: number) {
  if (!target || target <= 0 || typeof current !== "number") return null;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function joinClassName(values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function MarketplaceSearch({ query }: { query: string }) {
  return (
    <form action="/offers" className="moral-marketplace-search" role="search">
      <label className="sr-only" htmlFor="marketplace-search-input">
        Search marketplace
      </label>
      <input
        defaultValue={query}
        id="marketplace-search-input"
        name="search"
        placeholder="Search actions, causes, people, public goods."
        type="search"
      />
      <button className="button button-primary" type="submit">
        Search
      </button>
    </form>
  );
}

export function CategoryGrid({
  activeCategory,
  categories,
}: {
  activeCategory: string;
  categories: readonly MarketplaceCategory[];
}) {
  return (
    <nav className="moral-marketplace-category-grid" aria-label="Marketplace categories">
      {categories.map((category) => (
        <Link
          aria-current={activeCategory === category.key ? "page" : undefined}
          className={joinClassName([
            "moral-marketplace-category-tile",
            activeCategory === category.key && "is-active",
          ])}
          href={category.href}
          key={category.key}
        >
          <span>
            <strong>{category.label}</strong>
            <small>{category.availabilityLabel}</small>
          </span>
          <em>{category.description}</em>
          {category.exactCountSuppressed ? <small>Exact small counts hidden</small> : null}
        </Link>
      ))}
    </nav>
  );
}

export function MarketplaceFilterChips({ chips }: { chips: readonly MarketplaceFilterChip[] }) {
  return (
    <div className="moral-marketplace-filter-chips" aria-label="Marketplace filters">
      {chips.map((chip) => (
        <Link
          aria-current={chip.active ? "true" : undefined}
          className={joinClassName(["source-pill source-pill-link", chip.active && "is-active"])}
          href={chip.href}
          key={chip.key}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}

export function DealEconomicsPanel({ deal }: { deal: MarketplaceDeal }) {
  const economics = buildDealEconomics(deal);

  return (
    <section className="deal-economics-panel panel" aria-labelledby={`deal-economics-${deal.id}`}>
      <div className="deal-panel-head">
        <p className="detail-kicker">Deal economics</p>
        <h3 id={`deal-economics-${deal.id}`}>What moves if this clears</h3>
      </div>
      <dl className="deal-economics-grid">
        <div>
          <dt>Max exposure</dt>
          <dd>{economics.userMaxExposureLabel}</dd>
        </div>
        <div>
          <dt>Compatible counterparty volume</dt>
          <dd>{economics.counterpartyVolumeLabel}</dd>
        </div>
        <div>
          <dt>Estimated sponsor match</dt>
          <dd>{economics.sponsorMatchLabel}</dd>
        </div>
        <div>
          <dt>Total moved if cleared</dt>
          <dd>{economics.totalMovedIfClearedLabel}</dd>
        </div>
        <div>
          <dt>Effective multiplier</dt>
          <dd>{economics.effectiveMultiplierLabel}</dd>
        </div>
        <div>
          <dt>Threshold</dt>
          <dd>{economics.thresholdLabel}</dd>
        </div>
      </dl>
      <div className="deal-rule-list">
        <p>
          <strong>Execution condition:</strong> {economics.executionCondition}
        </p>
        <p>
          <strong>Charge timing:</strong> {economics.chargeTiming}
        </p>
        <p>
          <strong>Failure rule:</strong> {economics.failureRule}
        </p>
      </div>
    </section>
  );
}

export function CommitmentTermsPanel({ deal }: { deal: MarketplaceDeal }) {
  return (
    <section className="commitment-terms-panel panel" aria-labelledby={`commitment-terms-${deal.id}`}>
      <div className="deal-panel-head">
        <p className="detail-kicker">Terms before theory</p>
        <h3 id={`commitment-terms-${deal.id}`}>Guarantees and limits</h3>
      </div>
      <div className="commitment-terms-columns">
        <div>
          <h4>Guarantees / rules</h4>
          <ul className="trust-check-list">
            <li>Executes only if threshold, match, or mutual-acceptance conditions clear.</li>
            <li>Authorization is released or no obligation is created if conditions fail.</li>
            <li>Evidence is required before reliance when the route names a verification standard.</li>
            <li>Reviewer and challenge paths apply where the existing product supports them.</li>
            <li>No public exposure by default for private messages, raw evidence, or contact details.</li>
            <li>Anti-threat and safety policies apply before commitment reliance.</li>
          </ul>
        </div>
        <div>
          <h4>Limits</h4>
          <ul className="trust-check-list">
            <li>Moral value is not guaranteed.</li>
            <li>Downstream impact is uncertain.</li>
            <li>Counterfactual additionality is estimated, not proven.</li>
            <li>Sponsor match may be capped or unavailable.</li>
            <li>Tax treatment depends on jurisdiction.</li>
            <li>Some information may stay unavailable until review.</li>
          </ul>
        </div>
      </div>
      {deal.privacyNotes?.length ? (
        <div className="commitment-privacy-notes">
          {deal.privacyNotes.map((note) => (
            <span className="source-pill" key={note}>
              {note}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function MoralDealCard({
  deal,
  secondaryAction,
  variant = "feed",
}: {
  deal: MarketplaceDeal;
  secondaryAction?: ReactNode;
  variant?: "feed" | "compact" | "detail";
}) {
  const progress = percentProgress(deal.thresholdCurrentCents, deal.thresholdTargetCents);
  const economics = buildDealEconomics(deal);

  return (
    <article className={joinClassName(["moral-deal-card panel", `moral-deal-card-${variant}`])}>
      <div className="moral-deal-card-head">
        <IconMark name={mechanismIcon(deal.mechanismType)} />
        <div>
          <span className="badge">{mechanismLabel(deal.mechanismType)}</span>
          {deal.sourceLabel ? <span className="badge badge-secondary">{deal.sourceLabel}</span> : null}
        </div>
      </div>
      <div className="moral-deal-title-row">
        <div>
          <h3>
            <Link href={deal.href}>{deal.title}</Link>
          </h3>
          {deal.subtitle ? <p>{deal.subtitle}</p> : null}
        </div>
        <Link className="button button-primary button-mini" href={deal.href}>
          {deal.ctaLabel}
        </Link>
      </div>
      <div className="moral-deal-chip-row">
        {deal.causeTags.slice(0, 4).map((tag) => (
          <span className="source-pill" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <dl className="moral-deal-scan-grid">
        <div>
          <dt>Max exposure</dt>
          <dd>{economics.userMaxExposureLabel}</dd>
        </div>
        <div>
          <dt>Charge timing</dt>
          <dd>{economics.chargeTiming}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>{deal.verificationSummary ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>{reviewLabel(deal.reviewStatus)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{statusLabel(deal.status)}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{formatDate(deal.deadline)}</dd>
        </div>
      </dl>
      {progress !== null ? (
        <div className="moral-deal-progress" aria-label={`Threshold progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="moral-deal-foot">
        <p>{deal.executionCondition ?? "Conditions must clear before any commitment relies on this route."}</p>
        {secondaryAction}
      </div>
    </article>
  );
}

export function CommitmentSheet({
  commitHref,
  deal,
  paymentSupportAvailable,
}: {
  commitHref: string;
  deal: MarketplaceDeal;
  paymentSupportAvailable: boolean;
}) {
  const economics = buildDealEconomics(deal);
  const isPublicGoods = deal.mechanismType === "public_goods_round";

  return (
    <details className="commitment-sheet" id="commitment-sheet">
      <summary>{isPublicGoods ? "Preview this round" : "Join this trade"}</summary>
      <div className="commitment-sheet-body" role="group" aria-label="Conditional commitment preview">
        <div className="commitment-sheet-header">
          <p className="detail-kicker">{mechanismLabel(deal.mechanismType)}</p>
          <h3>{isPublicGoods ? "Preview this round" : "Join this trade"}</h3>
          <p>{deal.title}</p>
        </div>
        <label className="field">
          <span>{isPublicGoods ? "Preview budget" : "Amount selector"}</span>
          <input
            defaultValue={deal.userMaxExposureCents ? String(deal.userMaxExposureCents / 100) : ""}
            min="0"
            name="marketplace_commitment_amount"
            placeholder="Unavailable until flow step"
            step="1"
            type="number"
          />
        </label>
        <dl className="deal-economics-grid">
          <div>
            <dt>Max exposure</dt>
            <dd>{economics.userMaxExposureLabel}</dd>
          </div>
          <div>
            <dt>{isPublicGoods ? "Threshold" : "Execution condition"}</dt>
            <dd>{isPublicGoods ? economics.thresholdLabel : economics.executionCondition}</dd>
          </div>
          <div>
            <dt>Destination / counterparty</dt>
            <dd>{deal.causeTags.join(", ") || "Unavailable"}</dd>
          </div>
          <div>
            <dt>Verification deadline</dt>
            <dd>{formatDate(deal.deadline)}</dd>
          </div>
          <div>
            <dt>Refund / release rule</dt>
            <dd>{economics.failureRule}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>
              {isPublicGoods
                ? "No charge from this preview; MPGF payment gates still apply after final review."
                : paymentSupportAvailable
                  ? "Existing payment path required after review gates."
                  : "Payment path not connected yet"}
            </dd>
          </div>
        </dl>
        <Link className="button button-primary" href={commitHref}>
          {isPublicGoods ? "Preview budget" : "Commit conditionally"}
        </Link>
        <p className="panel-note">
          This preview does not create a completed commitment, send a message, capture funds, or
          publish private information.
        </p>
      </div>
    </details>
  );
}

export function CompatibleAdditions({
  additions,
}: {
  additions: ReturnType<typeof buildCompatibleAdditions>;
}) {
  if (!additions.length) {
    return null;
  }

  return (
    <section className="compatible-additions panel" aria-labelledby="compatible-additions-heading">
      <div className="deal-panel-head">
        <p className="detail-kicker">Optional additions</p>
        <h3 id="compatible-additions-heading">Compatible additions</h3>
      </div>
      <div className="compatible-addition-list">
        {additions.map((addition) => (
          <article className="compatible-addition" key={addition.deal.id}>
            <div>
              <strong>{addition.deal.title}</strong>
              <p>
                Changed max exposure: {addition.changedExposureLabel}. Verification duties:{" "}
                {addition.changedVerificationDuties}
              </p>
              <div className="moral-deal-chip-row">
                {addition.reasons.map((reason) => (
                  <span className="source-pill" key={reason}>
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            <Link className="button button-secondary button-mini" href={addition.deal.href}>
              Review only
            </Link>
          </article>
        ))}
      </div>
      <p className="panel-note">Nothing is auto-added. Exposure changes require explicit confirmation.</p>
    </section>
  );
}

export function DealScout({
  query,
  recommendations,
}: {
  query: MarketplaceQuery;
  recommendations: MarketplaceSurface["scoutRecommendations"];
}) {
  return (
    <section className="deal-scout panel" aria-labelledby="deal-scout-heading">
      <div className="deal-panel-head">
        <p className="detail-kicker">DealScout</p>
        <h2 id="deal-scout-heading">Find compatible trades</h2>
        <p>Deterministic matching over public deal data only. No autonomous outreach or negotiation.</p>
      </div>
      <form action="/offers" className="deal-scout-form">
        {query.query ? <input name="search" type="hidden" value={query.query} /> : null}
        <label className="field">
          <span>Cause area</span>
          <input defaultValue={query.scoutCause ?? ""} name="scout_cause" placeholder="Animal welfare" />
        </label>
        <label className="field">
          <span>Monthly pledge budget</span>
          <input
            defaultValue={query.scoutBudgetCents ? String(query.scoutBudgetCents / 100) : ""}
            min="0"
            name="scout_budget"
            placeholder="25"
            step="1"
            type="number"
          />
        </label>
        <label className="field">
          <span>Verification burden</span>
          <select defaultValue={query.scoutVerification ?? ""} name="scout_verification">
            <option value="">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">
          <span>Risk tolerance</span>
          <select defaultValue={query.scoutRisk ?? ""} name="scout_risk">
            <option value="">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="check-row">
          <input
            defaultChecked={query.reviewerApprovedOnly}
            name="scout_reviewer_approved"
            type="checkbox"
            value="1"
          />
          <span>Refund-protected / reviewer-approved preference</span>
        </label>
        <button className="button button-secondary" type="submit">
          Find matches
        </button>
      </form>
      {recommendations.length ? (
        <div className="deal-scout-results">
          {recommendations.map((entry) => (
            <article className="deal-scout-result" key={entry.deal.id}>
              <strong>{entry.deal.title}</strong>
              <div className="moral-deal-chip-row">
                {entry.reasons.map((reason) => (
                  <span className="source-pill" key={reason}>
                    {reason}
                  </span>
                ))}
              </div>
              <Link className="text-button" href={entry.deal.href}>
                Review deal
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="panel-note">
          Add preferences to see recommendations. Empty results mean no reliable public deal data
          matches, not that private counterparties are unavailable.
        </p>
      )}
    </section>
  );
}

export function MarketplaceHome({
  createHref,
  query,
  surface,
}: {
  createHref: string;
  query: MarketplaceQuery;
  surface: MarketplaceSurface;
}) {
  return (
    <section className="moral-marketplace-home" aria-labelledby="moral-marketplace-heading">
      <div className="moral-marketplace-hero">
        <div>
          <p className="detail-kicker">Marketplace</p>
          <h2 id="moral-marketplace-heading">Find commitments you can act on.</h2>
          <p>
            Search reviewed actions, threshold rounds, pledge swaps, and offset trades with max
            exposure and failure rules visible before the long mechanism text.
          </p>
        </div>
        <div className="moral-marketplace-context-row" aria-label="Proximity context">
          {["Near your community", "Same organization", "Compatible moral cluster", "Campus verification available", "Low verification cost"].map(
            (label) => (
              <span className="source-pill" key={label}>
                {label}
              </span>
            ),
          )}
        </div>
      </div>

      <MarketplaceSearch query={surface.query} />
      <CategoryGrid activeCategory={surface.activeCategory} categories={surface.categories} />
      <MarketplaceFilterChips chips={surface.filterChips} />

      <div className="moral-marketplace-layout">
        <div className="moral-marketplace-feed">
          <div className="moral-marketplace-feed-head">
            <h3>Recommended deals</h3>
            <Link className="button button-secondary button-mini" href={createHref}>
              Create
            </Link>
          </div>
          {surface.deals.length ? (
            surface.deals.map((deal) => <MoralDealCard deal={deal} key={deal.id} />)
          ) : (
            <div className="empty-state marketplace-empty-state">
              <div>
                <strong>No reliable public deals match.</strong>
                <p>{surface.emptyState}</p>
                <Link className="button button-primary" href={buildMarketplaceHref({})}>
                  Reset marketplace filters
                </Link>
              </div>
            </div>
          )}
        </div>
        <DealScout query={query} recommendations={surface.scoutRecommendations} />
      </div>
    </section>
  );
}

export function MarketplaceBottomNav({ active = "recommended" }: { active?: "recommended" | "matches" | "create" | "pledges" | "profile" }) {
  const items = [
    { key: "recommended", href: "/offers", label: "Recommended", icon: "marketplace" },
    { key: "matches", href: "/offers?marketplace_filter=cross_cluster_trade", label: "Matches", icon: "swap" },
    { key: "create", href: "/offers/new", label: "Create", icon: "payment" },
    { key: "pledges", href: "/commitments", label: "Pledges", icon: "evidence" },
    { key: "profile", href: "/dashboard", label: "Profile", icon: "profile" },
  ] as const;

  return (
    <nav className="marketplace-bottom-nav" aria-label="Marketplace bottom navigation">
      {items.map((item) => (
        <Link
          aria-current={active === item.key ? "page" : undefined}
          className={joinClassName([
            "marketplace-bottom-nav-item",
            active === item.key && "is-active",
            item.key === "create" && "is-create",
          ])}
          href={item.href}
          key={item.key}
        >
          <IconMark name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function CommitmentStatusBadge({ status }: { status: CommitmentCenterStatus }) {
  return <span className={`commitment-status commitment-status-${status}`}>{getCommitmentStatusLabel(status)}</span>;
}
