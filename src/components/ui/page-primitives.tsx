import Link from "next/link";
import type { ReactNode } from "react";

type LinkLike = {
  href: string;
  label: string;
};

export type IconName =
  | "evidence"
  | "example"
  | "fund"
  | "marketplace"
  | "offset"
  | "payment"
  | "pilot"
  | "profile"
  | "review"
  | "safety"
  | "source"
  | "swap";

export function IconMark({ name }: { name: IconName }) {
  if (name === "swap") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 8h11" />
          <path d="m13 5 3 3-3 3" />
          <path d="M19 16H8" />
          <path d="m11 13-3 3 3 3" />
        </svg>
      </span>
    );
  }

  if (name === "offset") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 7h5a5 5 0 0 1 5 5v5" />
          <path d="m13 15 3 3 3-3" />
          <path d="M6 17h4" />
          <path d="M6 12h7" />
        </svg>
      </span>
    );
  }

  if (name === "fund") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 18h14" />
          <path d="M7 18V9" />
          <path d="M12 18V6" />
          <path d="M17 18v-5" />
          <path d="M7 9l5-3 5 7" />
        </svg>
      </span>
    );
  }

  if (name === "payment") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 6h12v12H6z" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
          <path d="M16 16l2 2" />
        </svg>
      </span>
    );
  }

  if (name === "safety") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 4 18 6v5c0 4-2.4 6.7-6 8-3.6-1.3-6-4-6-8V6z" />
          <path d="m9.5 12 1.7 1.7 3.5-4" />
        </svg>
      </span>
    );
  }

  if (name === "source") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 5h8a4 4 0 0 1 4 4v10h-8a4 4 0 0 0-4-4z" />
          <path d="M6 5v14" />
          <path d="M10 9h4" />
          <path d="M10 12h5" />
        </svg>
      </span>
    );
  }

  if (name === "review" || name === "evidence") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M8 5h8v14H8z" />
          <path d="M10 9h4" />
          <path d="M10 13h3" />
          <path d="m13.5 16 1.2 1.2 2.3-2.7" />
        </svg>
      </span>
    );
  }

  if (name === "profile") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      </span>
    );
  }

  if (name === "example") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 6h12v12H6z" />
          <path d="M9 9h6" />
          <path d="M9 12h4" />
          <path d="M9 15h6" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="icon-mark">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 7h14" />
        <path d="M5 12h14" />
        <path d="M5 17h14" />
        <path d="M8 7v10" />
        <path d="M16 7v10" />
      </svg>
    </span>
  );
}

interface BreadcrumbsProps {
  items: readonly LinkLike[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        <li>
          <Link href="/">Home</Link>
        </li>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={item.href}>
              {isCurrent ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface PageHeroProps {
  actions?: ReactNode;
  children?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
}

export function PageHero({ actions, children, description, eyebrow, title }: PageHeroProps) {
  return (
    <div className="page-hero-content">
      <section className="hero-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="hero-text">{description}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </section>
      {children}
    </div>
  );
}

export function MoralTradeHeroVisual() {
  return (
    <aside className="hero-marketplace-visual panel" aria-label="Moral trade workflow illustration">
      <div className="visual-card visual-card-left">
        <span>Pledge swap</span>
        <strong>Global health</strong>
        <p>Offers receipt-backed donation</p>
      </div>
      <div className="visual-exchange" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="visual-card visual-card-right">
        <span>Reciprocal action</span>
        <strong>Animal welfare</strong>
        <p>Requests 3-month diet trial</p>
      </div>
      <div className="visual-review-strip">
        <span>Voluntary terms</span>
        <span>Evidence rule</span>
        <span>Manual review</span>
      </div>
    </aside>
  );
}

export function TradeFlowDiagram({
  steps,
  title,
}: {
  steps: readonly string[];
  title: string;
}) {
  return (
    <div className="trade-flow-diagram panel" aria-label={title}>
      {steps.map((step, index) => (
        <div className="trade-flow-node" key={step}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  id?: string;
}

export function SectionHeader({ children, eyebrow, id, title }: SectionHeaderProps) {
  return (
    <div className="section-head section-head-compact">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  action?: LinkLike;
  icon?: IconName;
}

export function MetricCard({ action, detail, icon, label, value }: MetricCardProps) {
  return (
    <article className="stat-card metric-card">
      <div className="metric-card-head">
        {icon ? <IconMark name={icon} /> : null}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
      {action ? (
        <Link className="text-button" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </article>
  );
}

export function TrustChip({ children }: { children: ReactNode }) {
  return <span className="trust-chip">{children}</span>;
}

interface StatusBadgeProps {
  children: ReactNode;
  tone?: "default" | "secondary" | "warning";
}

export function StatusBadge({ children, tone = "default" }: StatusBadgeProps) {
  const className = tone === "default" ? "badge" : `badge badge-${tone}`;
  return <span className={className}>{children}</span>;
}

interface StepCardProps {
  index: number;
  title: string;
  children: ReactNode;
}

export function StepCard({ children, index, title }: StepCardProps) {
  return (
    <article className="panel step-card">
      <span className="step-index">{String(index).padStart(2, "0")}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

interface CauseCardProps {
  title: string;
  detail: string;
  href: string;
  count?: string;
}

export function CauseCard({ count, detail, href, title }: CauseCardProps) {
  return (
    <Link className="panel cause-card" href={href}>
      <h3>{title}</h3>
      <p>{detail}</p>
      {count ? <span>{count}</span> : null}
    </Link>
  );
}

interface EmptyStateProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  icon?: IconName;
}

export function EmptyState({ actions, children, icon, title }: EmptyStateProps) {
  return (
    <div className="empty-state marketplace-empty-state">
      {icon ? <IconMark name={icon} /> : null}
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SearchBar({
  action = "/offers",
  defaultValue = "",
  placeholder,
}: {
  action?: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <form action={action} className="marketplace-search marketplace-search-wide" role="search">
      <label className="field marketplace-search-field">
        <span>Search</span>
        <input defaultValue={defaultValue} name="search" placeholder={placeholder} type="search" />
      </label>
      <button className="button button-primary" type="submit">
        Search
      </button>
    </form>
  );
}

export function FilterSidebar({ children, title = "Filters" }: { children: ReactNode; title?: string }) {
  return (
    <details className="filter-sidebar panel" open>
      <summary className="filter-drawer-summary">{title}</summary>
      <div className="filter-sidebar-content" aria-label="Offer filters">
        {children}
      </div>
    </details>
  );
}

interface OfferCardProps {
  alias?: string;
  causeExchange: string;
  ctaHref: string;
  duration: string;
  evidence: string;
  modeIcon: IconName;
  modeLabel: string;
  offeredAction: string;
  offeredScore?: number;
  primaryActionLabel?: string;
  requestedAction: string;
  requestedThreshold?: number;
  reviewState: string;
  secondaryAction?: ReactNode;
  sourceLabel: "Live offer" | "Worked example";
  title: string;
}

export function OfferCard({
  alias,
  causeExchange,
  ctaHref,
  duration,
  evidence,
  modeIcon,
  modeLabel,
  offeredAction,
  offeredScore,
  primaryActionLabel = "Inspect terms",
  requestedAction,
  requestedThreshold,
  reviewState,
  secondaryAction,
  sourceLabel,
  title,
}: OfferCardProps) {
  return (
    <article className={`listing-card offer-card panel listing-card-${modeIcon}`}>
      <div className="listing-card-head">
        <IconMark name={modeIcon} />
        <div className="listing-status-stack">
          <StatusBadge tone={sourceLabel === "Live offer" ? "default" : "secondary"}>{sourceLabel}</StatusBadge>
          <StatusBadge tone="warning">Manual review required</StatusBadge>
        </div>
      </div>
      <div className="listing-title-block">
        <p className="detail-kicker">{modeLabel}</p>
        <h3>{title}</h3>
      </div>
      {alias ? <p className="listing-alias">{alias}</p> : null}
      <p className="cause-exchange">{causeExchange}</p>
      <dl className="listing-terms">
        <div>
          <dt>Offered action</dt>
          <dd>{offeredAction}</dd>
        </div>
        <div>
          <dt>Requested action</dt>
          <dd>{requestedAction}</dd>
        </div>
      </dl>
      <div className="listing-meta">
        <span>{modeLabel}</span>
        <span>{duration}</span>
        <span>{evidence}</span>
        {typeof offeredScore === "number" ? <span>Offered score {offeredScore}</span> : null}
        {typeof requestedThreshold === "number" ? <span>Requested threshold {requestedThreshold}</span> : null}
      </div>
      <p className="review-state">{reviewState}</p>
      <div className="offer-card-actions">
        <Link className="button button-primary button-mini" href={ctaHref}>
          {primaryActionLabel}
        </Link>
        {secondaryAction}
      </div>
    </article>
  );
}

export function FooterLinkGroup({ links, title }: { links: readonly LinkLike[]; title: string }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      <ul className="footer-links">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
