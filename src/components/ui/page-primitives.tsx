import Link from "next/link";
import type { ReactNode } from "react";

type LinkLike = {
  href: string;
  label: string;
};

export type IconName =
  | "bookmark"
  | "checklist"
  | "evidence"
  | "example"
  | "fund"
  | "hands"
  | "filter"
  | "lock"
  | "marketplace"
  | "meal"
  | "offset"
  | "payment"
  | "pilot"
  | "progress"
  | "profile"
  | "publicGoods"
  | "review"
  | "safety"
  | "search"
  | "scale"
  | "source"
  | "swap"
  | "tune"
  | "vector";

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

  if (name === "progress") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 3.8a8.2 8.2 0 1 1-7.1 12.3" />
          <path d="M4.9 9.5V4.8h4.7" />
          <path d="M12 7.4a4.6 4.6 0 1 1-4.6 4.6" />
          <path d="M9.3 12h5.4" />
        </svg>
      </span>
    );
  }

  if (name === "publicGoods") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" />
          <path d="M4.8 12h14.4" />
          <path d="M12 4.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5" />
          <path d="M12 4.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5" />
          <path
            d="M12 15.7c-2.4-1.6-3.6-2.8-3.6-4.1 0-1 .7-1.7 1.7-1.7.7 0 1.3.3 1.9.9.6-.6 1.2-.9 1.9-.9 1 0 1.7.7 1.7 1.7 0 1.3-1.2 2.5-3.6 4.1z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      </span>
    );
  }

  if (name === "hands") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 12h3l2 2 3-4" />
          <path d="M5 15c2 2 4 3 7 3s5-1 7-3" />
          <path d="M6 9c1.5-2 3.4-3 6-3s4.5 1 6 3" />
        </svg>
      </span>
    );
  }

  if (name === "checklist") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 6h11" />
          <path d="M7 12h11" />
          <path d="M7 18h8" />
          <path d="m3.8 6 1 1 1.8-2" />
          <path d="m3.8 12 1 1 1.8-2" />
          <path d="m3.8 18 1 1 1.8-2" />
        </svg>
      </span>
    );
  }

  if (name === "filter") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 6h14l-5.5 6.2V18l-3 1.5v-7.3z" />
        </svg>
      </span>
    );
  }

  if (name === "tune") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 5.5v13" />
          <path d="M17 5.5v13" />
          <circle cx="7" cy="9" r="2.1" />
          <circle cx="17" cy="15" r="2.1" />
        </svg>
      </span>
    );
  }

  if (name === "bookmark") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 5.5h10v14l-5-3.1-5 3.1z" />
        </svg>
      </span>
    );
  }

  if (name === "search") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="10.7" cy="10.7" r="5.4" />
          <path d="m15 15 4 4" />
        </svg>
      </span>
    );
  }

  if (name === "meal") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M4.1 12.2h15.8c-.5 4.1-3.5 6.4-7.9 6.4s-7.4-2.3-7.9-6.4z"
            fill="currentColor"
            stroke="none"
          />
          <path d="M6.4 19.8h11.2" />
          <path
            d="M7.4 11c.9-4.4 3.5-6.8 7.8-7.2.1 4.4-2.6 6.7-7.8 7.2z"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M14 9.1c3-.9 5.2-.1 6.3 2.4-3.1.8-5.2 0-6.3-2.4z"
            fill="currentColor"
            stroke="none"
          />
          <circle cx="9.3" cy="14.8" r="0.7" fill="#ffffff" stroke="none" />
          <circle cx="12" cy="15.15" r="0.7" fill="#ffffff" stroke="none" />
          <circle cx="14.7" cy="14.8" r="0.7" fill="#ffffff" stroke="none" />
        </svg>
      </span>
    );
  }

  if (name === "lock") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 10h10v9H7z" />
          <path d="M9 10V8a3 3 0 0 1 6 0v2" />
        </svg>
      </span>
    );
  }

  if (name === "vector") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="5.25" r="0.78" fill="currentColor" stroke="none" />
          <path d="M11.65 6.65h.7c.46 2.35.46 5.6 0 9.75l-.35 2.35-.35-2.35c-.46-4.15-.46-7.4 0-9.75z" fill="currentColor" stroke="none" />
          <path d="M12 6.2v12.6" />
          <path
            d="M11 8.75C8.35 6.35 6 6 4.35 7.6c1.05 2.05 3.25 2.45 6.65 1.15z"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M13 8.75c2.65-2.4 5-2.75 6.65-1.15-1.05 2.05-3.25 2.45-6.65 1.15z"
            fill="currentColor"
            stroke="none"
          />
          <path d="m11.05 10.35-5.25 2.25" />
          <path d="m12.95 10.35 5.25 2.25" />
          <path d="m11.05 12.5-4.25 3.55" />
          <path d="m12.95 12.5 4.25 3.55" />
          <path d="m11.2 14.85-2.2 3.5" />
          <path d="m12.8 14.85 2.2 3.5" />
          <path d="M11.15 4.2 9.75 3.25" />
          <path d="m12.85 4.2 1.4-.95" />
        </svg>
      </span>
    );
  }

  if (name === "scale") {
    return (
      <span aria-hidden="true" className="icon-mark">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 4.8v14.6" />
          <path d="M7 19.4h10" />
          <path d="M5.1 8.2h13.8" />
          <path d="m7 8.2-3 6h6z" fill="currentColor" stroke="none" />
          <path d="m17 8.2-3 6h6z" fill="currentColor" stroke="none" />
          <path d="M4.5 14.2h5" stroke="#ffffff" strokeWidth="1.1" />
          <path d="M14.5 14.2h5" stroke="#ffffff" strokeWidth="1.1" />
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
  prefetch?: boolean;
}

export function Breadcrumbs({ items, prefetch }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        <li>
          <Link prefetch={prefetch} href="/">Home</Link>
        </li>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={item.href}>
              {isCurrent ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link prefetch={prefetch} href={item.href}>{item.label}</Link>
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
        <span>Evidence</span>
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

export function FilterSidebar({
  children,
  defaultOpen = false,
  title = "Filters",
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  title?: string;
}) {
  return (
    <details className="filter-sidebar panel" open={defaultOpen}>
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
  actionEvidence?: string;
  baselineBondBadge?: string | null;
  baselineBondTooltip?: string;
  baselineConfidence?: string;
  externalityReview?: string;
  modeIcon: IconName;
  modeLabel: string;
  offeredAction: string;
  offeredScore?: number;
  primaryActionLabel?: string;
  requestedAction: string;
  requestedThreshold?: number;
  reviewFactorCodes?: readonly string[];
  reviewNextStep?: string;
  reviewStatusReason?: string;
  reviewState: string;
  scoreConfidence?: string;
  secondaryAction?: ReactNode;
  sourceLabel: "Live offer" | "Live proposal" | "Worked example";
  summary?: string;
  title: string;
}

export function OfferCard({
  actionEvidence,
  alias,
  baselineBondBadge,
  baselineBondTooltip,
  baselineConfidence,
  causeExchange,
  ctaHref,
  duration,
  evidence,
  externalityReview,
  modeIcon,
  modeLabel,
  offeredAction,
  offeredScore,
  primaryActionLabel = "Inspect terms",
  requestedAction,
  requestedThreshold,
  reviewFactorCodes,
  reviewNextStep,
  reviewStatusReason,
  reviewState,
  scoreConfidence,
  secondaryAction,
  sourceLabel,
  summary,
  title,
}: OfferCardProps) {
  return (
    <article className={`listing-card offer-card panel listing-card-${modeIcon}`}>
      <div className="listing-card-head">
        <IconMark name={modeIcon} />
        <div className="listing-status-stack">
          <StatusBadge tone={sourceLabel === "Worked example" ? "secondary" : "default"}>{sourceLabel}</StatusBadge>
          <StatusBadge tone={evidence.toLowerCase().includes("payment") ? "warning" : "secondary"}>
            {evidence}
          </StatusBadge>
          <StatusBadge tone="warning">Manual review required</StatusBadge>
          {baselineBondBadge ? (
            <span className="badge badge-warning" title={baselineBondTooltip}>
              {baselineBondBadge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="listing-title-block">
        <p className="detail-kicker">{modeLabel}</p>
        <h3>
          <Link href={ctaHref}>{title}</Link>
        </h3>
      </div>
      {alias ? <p className="listing-alias">{alias}</p> : null}
      {summary ? <p className="listing-summary">{summary}</p> : null}
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
        {scoreConfidence ? <span>Confidence: {scoreConfidence}</span> : null}
      </div>
      {actionEvidence || baselineConfidence || externalityReview ? (
        <div className="listing-review-fields" aria-label="Review fields">
          {actionEvidence ? (
            <div>
              <strong>Action evidence</strong>
              <span>{actionEvidence}</span>
            </div>
          ) : null}
          {baselineConfidence ? (
            <div>
              <strong>Baseline confidence</strong>
              <span>{baselineConfidence}</span>
            </div>
          ) : null}
          {externalityReview ? (
            <div>
              <strong>Externality review</strong>
              <span>{externalityReview}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {typeof offeredScore === "number" ||
      typeof requestedThreshold === "number" ||
      reviewFactorCodes?.length ? (
        <details className="listing-factor-codes" aria-label="Offer review details">
          <summary>Why this is reviewable</summary>
          {typeof offeredScore === "number" || typeof requestedThreshold === "number" ? (
            <p className="score-disclaimer">
              Participant thresholds are private trade inputs, not platform moral rankings or
              public importance scores.
            </p>
          ) : null}
          <dl className="listing-terms">
            {typeof offeredScore === "number" ? (
              <div>
                <dt>Participant-stated offer threshold</dt>
                <dd>{offeredScore}/10</dd>
              </div>
            ) : null}
            {typeof requestedThreshold === "number" ? (
              <div>
                <dt>Counterparty acceptance threshold</dt>
                <dd>{requestedThreshold}/10</dd>
              </div>
            ) : null}
          </dl>
          {reviewFactorCodes?.length ? (
            <div aria-label="Technical review codes">
              <strong>Technical review codes</strong>
              <div>
                {reviewFactorCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            </div>
          ) : null}
        </details>
      ) : null}
      {reviewNextStep ? (
        <p className="listing-next-step">
          <strong>Next step:</strong> {reviewNextStep}
        </p>
      ) : null}
      {reviewStatusReason ? (
        <p className="listing-next-step">
          <strong>Why this status:</strong> {reviewStatusReason}
        </p>
      ) : null}
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
