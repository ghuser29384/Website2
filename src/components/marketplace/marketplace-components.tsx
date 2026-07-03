import Link from "next/link";

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

function joinClassName(values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function centsToV72Exposure(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Exposure unknown";
  }

  return `Max ${new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(value / 100)}`;
}

export function getDealReceiptAtom(deal: MarketplaceDeal) {
  const isExample = deal.sourceLabel === "Worked example";
  const isPublicGoods = deal.mechanismType === "public_goods_round";
  const isLive = deal.sourceLabel === "Live offer";
  const state = isExample ? "Example" : isPublicGoods ? "Preview" : isLive ? "Live" : "Preview";
  const exposure = isExample
    ? "Preview only"
    : isPublicGoods
      ? "No charge now"
      : centsToV72Exposure(deal.userMaxExposureCents);
  const conditionOrProtection = isExample
    ? "No commitment"
    : isPublicGoods
      ? "Reviewing"
      : "Reviewing";
  const primaryCta = isPublicGoods
    ? "Preview budget"
    : deal.ctaLabel === "Create from template"
      ? "Create from template"
      : "View details";
  const source = deal.sourceLabel ?? mechanismLabel(deal.mechanismType);

  return {
    conditionOrProtection,
    exposure,
    primaryCta,
    protection: isLive ? "Review current terms" : "No commitment will be created",
    source,
    state,
  };
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
        placeholder="Search causes, templates, rounds"
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
  variant = "feed",
}: {
  deal: MarketplaceDeal;
  variant?: "feed" | "compact" | "detail";
}) {
  const receipt = getDealReceiptAtom(deal);

  return (
    <article className={joinClassName(["moral-deal-card panel", `moral-deal-card-${variant}`])}>
      <Link className="moral-deal-card-main" href={deal.href}>
        <span className="moral-deal-visual" aria-hidden="true">
          <IconMark name={mechanismIcon(deal.mechanismType)} />
        </span>
        <div className="moral-deal-card-copy">
          <div className="moral-deal-card-head">
            <span className="badge">{receipt.state}</span>
            <span className="badge badge-secondary">{receipt.source}</span>
          </div>
          <h3>{deal.title}</h3>
          {deal.subtitle ? <p className="moral-deal-summary">{deal.subtitle}</p> : null}
          <p className="moral-deal-receipt-line">
            <strong>{receipt.exposure}</strong>
            <span>{receipt.conditionOrProtection}</span>
            <span>{receipt.protection}</span>
          </p>
          <div className="moral-deal-chip-row" aria-label="Listing tags">
            {deal.causeTags.slice(0, 2).map((tag) => (
              <span className="source-pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <Link className="button button-primary button-mini moral-deal-card-cta" href={deal.href}>
        {receipt.primaryCta}
      </Link>
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
  void commitHref;
  void paymentSupportAvailable;
  const receipt = getDealReceiptAtom(deal);
  const sheetCta = receipt.primaryCta === "View details" ? "Preview budget" : receipt.primaryCta;

  return (
    <details className="commitment-sheet" id="commitment-sheet">
      <summary>{sheetCta}</summary>
      <div className="commitment-sheet-body" role="group" aria-label="Conditional commitment preview">
        <div className="commitment-sheet-handle" aria-hidden="true" />
        <div className="commitment-sheet-header">
          <p className="detail-kicker">
            {receipt.source} · {receipt.state}
          </p>
          <p>{deal.title}</p>
        </div>
        <dl className="v72-receipt-facts">
          <div>
            <dt>Exposure</dt>
            <dd>{receipt.exposure}</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>{receipt.conditionOrProtection}</dd>
          </div>
          <div>
            <dt>Release</dt>
            <dd>{receipt.protection}</dd>
          </div>
        </dl>
        <p className="v72-sheet-result" role="status">
          No commitment was created.
        </p>
        <div className="v72-sheet-footer">
          <span>
            {receipt.state} · {receipt.exposure} · {receipt.conditionOrProtection}
          </span>
          <Link className="button button-primary" href={deal.href}>
            {sheetCta}
          </Link>
        </div>
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
  liveOfferCount,
  query,
  surface,
}: {
  createHref: string;
  liveOfferCount?: number;
  query: MarketplaceQuery;
  surface: MarketplaceSurface;
}) {
  void createHref;
  void query;
  const verifiedLiveCount =
    typeof liveOfferCount === "number"
      ? liveOfferCount
      : surface.deals.filter((deal) => deal.sourceLabel === "Live offer").length;
  const zeroLive = verifiedLiveCount === 0;
  const examples = surface.deals.filter((deal) => deal.sourceLabel === "Worked example");
  const nonExamples = surface.deals.filter((deal) => deal.sourceLabel !== "Worked example");
  const visibleDeals = zeroLive ? [...examples, ...nonExamples] : surface.deals;
  const railLinks = [
    { href: "/offers?tab=templates", label: "Reviewed templates" },
    { href: "/offers?tab=worked_examples", label: "Worked examples" },
    { href: "/offers?mode=offset&tab=worked_examples", label: "Donation offsets" },
    { href: "/offers?mode=pledge&tab=worked_examples", label: "Pledge swaps" },
    { href: "/mpgf", label: "Public goods" },
  ];

  return (
    <section className="moral-marketplace-home" aria-labelledby="moral-marketplace-heading">
      <h1 id="moral-marketplace-heading">Browse offers</h1>
      <MarketplaceSearch query={surface.query} />
      <nav className="v72-marketplace-tabs" aria-label="Marketplace tabs">
        {(zeroLive
          ? [
              ["Templates", "/offers?tab=templates"],
              ["Examples", "/offers?tab=worked_examples"],
              ["Public goods", "/mpgf"],
              ["Guides", "/worked-examples"],
            ]
          : [
              ["Live", "/offers?tab=live"],
              ["Preview", "/offers"],
              ["Templates", "/offers?tab=templates"],
              ["Examples", "/offers?tab=worked_examples"],
              ["Guides", "/worked-examples"],
            ]
        ).map(([label, href]) => (
          <Link href={href} key={label}>
            {label}
          </Link>
        ))}
      </nav>
      <p className="v72-marketplace-context">
        {zeroLive
          ? "No live offers yet · Showing examples and templates"
          : "Live offers available · Review current terms before continuing"}
      </p>
      <div className="moral-marketplace-filter-chips v72-control-rail" aria-label="Marketplace controls">
        {railLinks.map((link) => (
          <Link className="source-pill source-pill-link" href={link.href} key={link.label}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="moral-marketplace-feed">
        {visibleDeals.length ? (
          visibleDeals.slice(0, 8).map((deal) => <MoralDealCard deal={deal} key={deal.id} />)
        ) : (
          <div className="empty-state marketplace-empty-state">
            <div>
              <strong>No reliable public listings match.</strong>
              <p>{surface.emptyState ?? "No live offers yet. Reviewed templates and examples remain available."}</p>
              <Link className="button button-primary" href={buildMarketplaceHref({})}>
                Browse offers
              </Link>
            </div>
          </div>
        )}
        </div>
    </section>
  );
}

export function MarketplaceBottomNav({ active = "browse" }: { active?: "browse" | "plan" | "create" | "track" | "account" }) {
  const items = [
    { key: "browse", href: "/offers", label: "Browse", icon: "marketplace" },
    { key: "plan", href: "/saved-offers", label: "Plan", icon: "example" },
    { key: "create", href: "/create", label: "Create", icon: "payment" },
    { key: "track", href: "/commitments", label: "Track", icon: "evidence" },
    { key: "account", href: "/dashboard", label: "Account", icon: "profile" },
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
