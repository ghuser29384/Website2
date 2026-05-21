import Link from "next/link";
import type { ReactNode } from "react";

type LinkLike = {
  href: string;
  label: string;
};

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
}

export function MetricCard({ action, detail, label, value }: MetricCardProps) {
  return (
    <article className="stat-card metric-card">
      <span>{label}</span>
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
}

export function EmptyState({ actions, children, title }: EmptyStateProps) {
  return (
    <div className="empty-state marketplace-empty-state">
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
  modeLabel: string;
  offeredAction: string;
  offeredScore?: number;
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
  modeLabel,
  offeredAction,
  offeredScore,
  requestedAction,
  requestedThreshold,
  reviewState,
  secondaryAction,
  sourceLabel,
  title,
}: OfferCardProps) {
  return (
    <article className="listing-card offer-card panel">
      <div className="listing-card-head">
        <StatusBadge tone={sourceLabel === "Live offer" ? "default" : "secondary"}>{sourceLabel}</StatusBadge>
        <StatusBadge tone="warning">Manual review required</StatusBadge>
      </div>
      <p className="detail-kicker">{modeLabel}</p>
      <h3>{title}</h3>
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
        <span>{duration}</span>
        <span>{evidence}</span>
        {typeof offeredScore === "number" ? <span>Offered score {offeredScore}</span> : null}
        {typeof requestedThreshold === "number" ? <span>Requested threshold {requestedThreshold}</span> : null}
      </div>
      <p className="review-state">{reviewState}</p>
      <div className="offer-card-actions">
        <Link className="text-button" href={ctaHref}>
          Inspect terms
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
