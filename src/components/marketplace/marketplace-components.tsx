import Link from "next/link";
import type { CSSProperties, FormHTMLAttributes, ReactNode } from "react";

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
  type MarketplaceFilterKey,
  type MarketplaceQuery,
  type MarketplaceSurface,
} from "@/lib/marketplace-deals";
import {
  getPledgeFundingMechanismState,
  getPledgeFundingReceiptAtom,
  getPreferredCharityBonusCopy,
  shouldShowPreferredCharityBonus,
  type PledgeFundingRound,
} from "@/lib/moral-trade/pledge-funding-rounds";

function mechanismLabel(value: MarketplaceDeal["mechanismType"]) {
  const labels: Record<MarketplaceDeal["mechanismType"], string> = {
    action_for_donation: "Action-for-donation",
    cross_view_donation_swap: "Cross-view swap",
    local_pledge: "Pledge swap",
    offset_trade: "Offset trade",
    pledge_funding_round: "Pledge funding",
    public_goods_round: "Public-goods round",
    unknown: "Unknown mechanism",
  };

  return labels[value];
}

function mechanismIcon(value: MarketplaceDeal["mechanismType"]): IconName {
  if (value === "public_goods_round") return "fund";
  if (value === "pledge_funding_round") return "fund";
  if (value === "cross_view_donation_swap") return "swap";
  if (value === "offset_trade") return "offset";
  if (value === "action_for_donation") return "evidence";
  if (value === "local_pledge") return "swap";
  return "marketplace";
}

function counterVisualIcon(value: MarketplaceDeal["mechanismType"]): IconName {
  if (
    value === "pledge_funding_round" ||
    value === "cross_view_donation_swap" ||
    value === "local_pledge"
  ) {
    return "vector";
  }
  if (
    value === "public_goods_round" ||
    value === "action_for_donation"
  ) {
    return "fund";
  }

  return "evidence";
}

function browseVisualIcon(value: MarketplaceDeal["mechanismType"]): IconName {
  if (value === "public_goods_round") return "progress";
  if (value === "pledge_funding_round") return "meal";
  if (value === "local_pledge") return "meal";
  if (value === "cross_view_donation_swap") return "scale";
  if (value === "action_for_donation") return "checklist";
  return mechanismIcon(value);
}

function joinClassName(values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function receiptStateClass(value: string) {
  return `is-${value.toLowerCase().replaceAll(" ", "-")}`;
}

function dealVisualClassName(deal: MarketplaceDeal, state: string) {
  return joinClassName([
    "moral-deal-visual",
    `moral-deal-visual-${deal.mechanismType.replaceAll("_", "-")}`,
    receiptStateClass(state),
  ]);
}

function badgeClassName(value: string, role: "state" | "source" = "source") {
  return joinClassName([
    "badge",
    role === "source" && "badge-secondary",
    role === "state" && `badge-${value.toLowerCase().replaceAll(" ", "-")}`,
  ]);
}

function reviewStatusLabel(value: MarketplaceDeal["reviewStatus"]) {
  if (value === "verified_recipient") return "Verified recipient";
  if (value === "reviewer_approved") return "Reviewer approved";
  if (value === "review_pending") return "Review required";
  if (value === "unreviewed") return "Needs review";
  return "Review state unavailable";
}

function statusChipTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("verified") || normalized.includes("no charge")) return "is-good";
  if (normalized.includes("review") || normalized.includes("preview")) return "is-warn";
  if (normalized.includes("evidence")) return "is-info";
  return "";
}

function statusChipIcon(value: string): IconName {
  const normalized = value.toLowerCase();
  if (normalized.includes("verified") || normalized.includes("no charge")) return "safety";
  if (normalized.includes("evidence")) return "evidence";
  if (normalized.includes("review") || normalized.includes("preview")) return "review";
  return "source";
}

function getDealStatusChips(deal: MarketplaceDeal) {
  const receipt = getDealReceiptAtom(deal);
  const currentChargeState =
    /preview|no durable state changed|payment not connected/i.test(
      [receipt.state, receipt.conditionOrProtection, receipt.protection].join(" "),
    )
      ? "No charge now"
      : receipt.exposure;
  const chips = [
    currentChargeState,
    deal.verificationSummary ? "Evidence later" : null,
    reviewStatusLabel(deal.reviewStatus),
    deal.reviewStatus === "verified_recipient" ? "Verified recipient" : null,
  ];

  return uniqueVisibleStrings(chips).slice(0, 4);
}

function uniqueVisibleStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function getDealAmountLabel(deal: MarketplaceDeal) {
  const receipt = getDealReceiptAtom(deal);
  if (receipt.exposure.startsWith("Max ")) return receipt.exposure.replace("Max ", "");
  if (typeof deal.pledgeAmountCents === "number") {
    return centsToV72Exposure(deal.pledgeAmountCents).replace("Max ", "");
  }

  return receipt.exposure;
}

function getDealSubline(deal: MarketplaceDeal) {
  if (deal.mechanismType === "public_goods_round") return "Public good";
  if (deal.mechanismType === "pledge_funding_round") return "Threshold round";
  if (deal.mechanismType === "cross_view_donation_swap") return "Conditional swap";
  if (deal.mechanismType === "action_for_donation") return "Action pledge";
  if (deal.mechanismType === "offset_trade") return "Offset trade";
  if (deal.mechanismType === "local_pledge") return "Pledge swap";
  return mechanismLabel(deal.mechanismType);
}

function getDealActionFact(deal: MarketplaceDeal) {
  return deal.causeTags[0] ?? getDealSubline(deal);
}

function compactReceiptFact(value: string) {
  if (/no durable state changed|no commitment/i.test(value)) return "No commitment";
  if (/review/i.test(value)) return "Review required";
  if (/private/i.test(value)) return "Private planning";
  if (/not connected/i.test(value)) return "Not connected";
  return value;
}

function selectSecondaryDeals(
  deals: readonly MarketplaceDeal[],
  primaryDeal: MarketplaceDeal | null,
  limit = 4,
) {
  const targetRhythm: MarketplaceDeal["mechanismType"][] = [
    "cross_view_donation_swap",
    "public_goods_round",
    "action_for_donation",
    "public_goods_round",
  ];
  const mechanismOrder: MarketplaceDeal["mechanismType"][] = [
    "cross_view_donation_swap",
    "public_goods_round",
    "action_for_donation",
    "local_pledge",
    "offset_trade",
    "pledge_funding_round",
    "unknown",
  ];
  const mechanismRank = new Map(mechanismOrder.map((mechanism, index) => [mechanism, index]));
  const candidates = [...deals]
    .filter((deal) => deal.id !== primaryDeal?.id)
    .sort((a, b) => {
      const rankDelta =
        (mechanismRank.get(a.mechanismType) ?? mechanismOrder.length) -
        (mechanismRank.get(b.mechanismType) ?? mechanismOrder.length);

      return rankDelta || deals.indexOf(a) - deals.indexOf(b);
    });
  const selected: MarketplaceDeal[] = [];

  for (const mechanism of targetRhythm) {
    if (selected.length >= limit) break;
    const nextDeal = candidates.find(
      (deal) =>
        deal.mechanismType === mechanism &&
        !selected.some((selectedDeal) => selectedDeal.id === deal.id),
    );

    if (nextDeal) {
      selected.push(nextDeal);
    }
  }

  for (const deal of candidates) {
    if (selected.length >= limit) break;
    if (selected.some((selectedDeal) => selectedDeal.id === deal.id)) continue;
    selected.push(deal);
  }

  return selected;
}

function selectPrimaryBrowseDeal(deals: readonly MarketplaceDeal[], zeroLive: boolean) {
  if (!zeroLive) return deals[0] ?? null;

  return (
    deals.find((deal) => deal.id === "seed-paul") ??
    deals.find(
      (deal) =>
        deal.mechanismType === "local_pledge" &&
        /animal welfare|vegetarian|global poverty|public health/i.test(
          [deal.title, deal.subtitle, deal.actionDescription, ...deal.causeTags].filter(Boolean).join(" "),
        ),
    ) ??
    deals.find((deal) => deal.mechanismType === "local_pledge") ??
    deals.find((deal) => deal.mechanismType === "cross_view_donation_swap") ??
    deals.find((deal) => deal.mechanismType === "pledge_funding_round") ??
    deals[0] ??
    null
  );
}

function MarketplaceSideNav({ active = "browse" }: { active?: "browse" | "plan" | "track" | "messages" | "profile" }) {
  const items = [
    { key: "browse", href: "/offers", label: "Browse", icon: "search" },
    { key: "plan", href: "/saved-offers", label: "Planner", icon: "example" },
    { key: "track", href: "/commitments", label: "Track", icon: "evidence" },
    { key: "messages", href: "/messages", label: "Messages", icon: "review" },
    { key: "profile", href: "/profile", label: "Profile", icon: "profile" },
  ] as const;

  return (
    <aside className="mt-v75-side-nav" data-marketplace-left-nav aria-label="Marketplace sections">
      <Link className="mt-v75-side-brand" href="/offers">
        <IconMark name="meal" />
        <span>Moral Trade</span>
      </Link>
      <nav>
        {items.map((item) => (
          <Link
            aria-current={active === item.key ? "page" : undefined}
            className={joinClassName(["mt-v75-side-link", active === item.key && "is-active"])}
            href={item.href}
            key={item.key}
          >
            <IconMark name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-v75-side-plan">
        <strong>0 in planner</strong>
        <span>
          <em>Exposure</em>
          <b>$0.00</b>
        </span>
        <span>
          <em>Charged now</em>
          <b>$0.00</b>
        </span>
        <Link className="button button-primary button-mini" href="/saved-offers">
          Review & plan
        </Link>
      </div>
    </aside>
  );
}

export function MarketplaceRouteShell({
  active,
  children,
}: {
  active: "browse" | "plan" | "track" | "messages" | "profile";
  children: ReactNode;
}) {
  return (
    <div className="mt-v75-route-board">
      <MarketplaceSideNav active={active} />
      <div className="mt-v75-route-workspace">{children}</div>
    </div>
  );
}

function DealSemanticVisual({
  deal,
  icon,
  label,
}: {
  deal: MarketplaceDeal;
  icon?: IconName;
  label?: string;
}) {
  const receipt = getDealReceiptAtom(deal);

  return (
    <span
      aria-label={label ?? `${mechanismLabel(deal.mechanismType)} visual`}
      className={dealVisualClassName(deal, receipt.state)}
      role="img"
    >
      <IconMark name={icon ?? mechanismIcon(deal.mechanismType)} />
    </span>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className={joinClassName(["mt-v75-status-chip", statusChipTone(label)])}>
      <IconMark name={statusChipIcon(label)} />
      {label}
    </span>
  );
}

function FallbackLivestreamEvidencePill({ deal }: { deal: MarketplaceDeal }) {
  const evidence = deal.fallbackLivestreamEvidence;

  if (!evidence) {
    return null;
  }

  return <span className="source-pill">{evidence.observationLabel}</span>;
}

function FallbackLivestreamEvidenceSummary({ deal }: { deal: MarketplaceDeal }) {
  const evidence = deal.fallbackLivestreamEvidence;

  if (!evidence) {
    return null;
  }

  return (
    <section>
      <h2>{evidence.title}</h2>
      <dl>
        <div>
          <dt>Branch</dt>
          <dd>{evidence.branchLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{evidence.statusLabel}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>{evidence.scheduleLabel}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{evidence.providerLabel}</dd>
        </div>
      </dl>
      <p>{evidence.actionStatement}</p>
      <Link className="button button-secondary button-mini" href={evidence.href}>
        View evidence route
      </Link>
    </section>
  );
}

function FeaturedDealCard({ deal }: { deal: MarketplaceDeal }) {
  const receipt = getDealReceiptAtom(deal);
  const amountLabel = getDealAmountLabel(deal);
  const statusChips = getDealStatusChips(deal);
  const factRow = [
    { icon: "source", label: "Source", value: receipt.source },
    { icon: "review", label: "Action", value: getDealActionFact(deal) },
    { icon: "payment", label: "Exposure", value: amountLabel },
    { icon: "safety", label: "Protection", value: compactReceiptFact(receipt.conditionOrProtection) },
  ] as const;

  return (
    <article className="mt-v75-featured-deal" data-marketplace-featured>
      <div className="mt-v75-featured-visuals">
        <span className={badgeClassName(receipt.state, "state")}>{receipt.state}</span>
        <DealSemanticVisual deal={deal} icon={browseVisualIcon(deal.mechanismType)} />
        <span className="mt-v75-pair-arrow" aria-hidden="true">
          <IconMark name="swap" />
        </span>
        <span
          aria-label="Counterparty side visual"
          className="moral-deal-visual mt-v75-counter-visual"
          role="img"
        >
          <IconMark name={counterVisualIcon(deal.mechanismType)} />
        </span>
      </div>
      <div className="mt-v75-featured-copy">
        <div className="moral-deal-chip-row">
          <FallbackLivestreamEvidencePill deal={deal} />
          {deal.causeTags.slice(0, 2).map((tag) => (
            <span className="source-pill" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <h2>{deal.title}</h2>
        <p>{deal.subtitle ?? "Review terms, exposure, and evidence before any commitment."}</p>
        <div className="mt-v75-status-row">
          {statusChips.map((chip) => (
            <StatusChip label={chip} key={chip} />
          ))}
        </div>
      </div>
      <div className="mt-v75-featured-decision">
        <div className="mt-v75-featured-exposure" aria-label="Adjacent receipt facts">
          <span>Max exposure</span>
          <strong>{amountLabel}</strong>
          <small>{compactReceiptFact(receipt.conditionOrProtection)}</small>
        </div>
        <div className="mt-v75-featured-actions" aria-label="Primary action">
          <Link className="button button-primary" href={deal.href}>
            View details
          </Link>
          <span className="mt-v75-save-hint">
            <IconMark name="bookmark" />
            Save
          </span>
        </div>
      </div>
      <dl className="mt-v75-featured-facts" data-marketplace-featured-facts aria-label="Receipt facts">
        {factRow.map((fact) => (
          <div data-receipt-fact key={fact.label}>
            <IconMark name={fact.icon} />
            <dt className="sr-only">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function getDealProgressPercent(deal: MarketplaceDeal) {
  if (
    deal.mechanismType !== "public_goods_round" ||
    typeof deal.thresholdCurrentCents !== "number" ||
    typeof deal.thresholdTargetCents !== "number" ||
    deal.thresholdTargetCents <= 0
  ) {
    return null;
  }

  const rawProgress = Math.round((deal.thresholdCurrentCents / deal.thresholdTargetCents) * 100);
  return Math.max(0, Math.min(100, rawProgress));
}

function PublicGoodsProgressVisual({ deal }: { deal: MarketplaceDeal }) {
  const progress = getDealProgressPercent(deal);
  const receipt = getDealReceiptAtom(deal);

  if (progress === null) {
    return <DealSemanticVisual deal={deal} icon={browseVisualIcon(deal.mechanismType)} />;
  }

  return (
    <span
      aria-label={`${progress}% funded public-goods progress`}
      className={joinClassName([dealVisualClassName(deal, receipt.state), "mt-v75-progress-visual"])}
      role="img"
    >
      <span
        className="mt-v75-progress-ring"
        style={{ "--mt-v75-progress": `${progress * 3.6}deg` } as CSSProperties}
      >
        <strong>{progress}%</strong>
      </span>
    </span>
  );
}

function MiniDealTile({
  deal,
  publicGoodsVariant = "default",
}: {
  deal: MarketplaceDeal;
  publicGoodsVariant?: "default" | "repeat";
}) {
  const receipt = getDealReceiptAtom(deal);
  const visualIcon: IconName =
    deal.mechanismType === "public_goods_round" && publicGoodsVariant === "repeat"
      ? "publicGoods"
      : browseVisualIcon(deal.mechanismType);
  const chips = uniqueVisibleStrings([
    receipt.conditionOrProtection,
    deal.reviewStatus === "verified_recipient" ? reviewStatusLabel(deal.reviewStatus) : null,
    deal.fallbackLivestreamEvidence?.statusLabel,
  ]).slice(0, 2);

  return (
    <Link
      className={joinClassName([
        "mt-v75-mini-tile",
        `mt-v75-mini-tile-${deal.mechanismType.replaceAll("_", "-")}`,
        publicGoodsVariant === "repeat" && "is-public-good-repeat",
      ])}
      href={deal.href}
    >
      <div className="mt-v75-mini-head">
        <span className={badgeClassName(receipt.state, "state")}>{receipt.state}</span>
        {deal.mechanismType === "public_goods_round" && publicGoodsVariant === "default" ? (
          <PublicGoodsProgressVisual deal={deal} />
        ) : (
          <DealSemanticVisual deal={deal} icon={visualIcon} />
        )}
      </div>
      <strong>{deal.title}</strong>
      <span>{getDealSubline(deal)}</span>
      <span className="mt-v75-mini-amount">{receipt.exposure}</span>
      <div className="mt-v75-status-row">
        {chips.map((chip) => (
          <StatusChip label={chip} key={chip} />
        ))}
      </div>
    </Link>
  );
}

export function DealDetailObject({
  deal,
  headingId = "marketplace-detail-object-heading",
}: {
  deal: MarketplaceDeal;
  headingId?: string;
}) {
  const receipt = getDealReceiptAtom(deal);
  const statusChips = getDealStatusChips(deal);

  return (
    <article className="mt-v75-detail-object" aria-labelledby={headingId}>
      <div className="mt-v75-detail-breadcrumb">
        <Link href="/offers">Browse</Link>
        <span aria-hidden="true">/</span>
        <span>{getDealSubline(deal)}</span>
      </div>
      <div className="mt-v75-detail-visuals">
        <span className={badgeClassName(receipt.state, "state")}>{receipt.state}</span>
        <DealSemanticVisual deal={deal} />
        <span className="mt-v75-pair-arrow" aria-hidden="true">
          <IconMark name="swap" />
        </span>
        <span
          aria-label="Counterparty side visual"
          className="moral-deal-visual mt-v75-counter-visual"
          role="img"
        >
          <IconMark name={deal.mechanismType === "public_goods_round" ? "fund" : "evidence"} />
        </span>
      </div>
      <div className="mt-v75-detail-copy">
        <div className="moral-deal-chip-row">
          <FallbackLivestreamEvidencePill deal={deal} />
          {deal.causeTags.slice(0, 2).map((tag) => (
            <span className="source-pill" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <h1 id={headingId}>{deal.title}</h1>
        <p>{deal.subtitle ?? "Review exposure, terms, and evidence before any commitment."}</p>
        <div className="mt-v75-status-row">
          {statusChips.map((chip) => (
            <StatusChip label={chip} key={chip} />
          ))}
        </div>
        <dl className="mt-v75-detail-receipt" aria-label="Detail receipt facts">
          <div>
            <dt>State</dt>
            <dd>{receipt.source}</dd>
          </div>
          <div>
            <dt>Exposure</dt>
            <dd>{receipt.exposure}</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>{receipt.conditionOrProtection}</dd>
          </div>
          <div>
            <dt>Protection</dt>
            <dd>{receipt.protection}</dd>
          </div>
        </dl>
        <div className="mt-v75-detail-actions">
          <Link className="button button-primary" href={`${deal.href}#commitment-sheet`}>
            Add to planner
          </Link>
          <Link className="button button-secondary" href={`${deal.href}#commitment-sheet`}>
            Compare
          </Link>
          <Link className="button button-secondary" href="/saved-offers">
            Save
          </Link>
        </div>
      </div>
      <div className="mt-v75-detail-info">
        <section>
          <h2>Overview</h2>
          <p>{deal.actionDescription ?? "This route is reviewable only after current terms are checked."}</p>
        </section>
        <section>
          <h2>Key details</h2>
          <dl>
            <div>
              <dt>Your action</dt>
              <dd>{deal.executionCondition ?? receipt.conditionOrProtection}</dd>
            </div>
            <div>
              <dt>Charge timing</dt>
              <dd>{deal.chargeTiming ?? "Not connected"}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>
                {deal.fallbackLivestreamEvidence
                  ? deal.fallbackLivestreamEvidence.statusLabel
                  : deal.verificationSummary ?? "Evidence required where backed"}
              </dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>{receipt.source}</dd>
            </div>
          </dl>
        </section>
        <FallbackLivestreamEvidenceSummary deal={deal} />
        <details className="v72-explain-row mt-v75-unified-explain">
          <summary>Requirements & rules</summary>
          <p>
            Effect on this action: Requires adapter recheck. This is context, not a verdict.
          </p>
          {deal.fallbackLivestreamEvidence ? (
            <>
              <p>
                {deal.fallbackLivestreamEvidence.branchLabel}:{" "}
                {deal.fallbackLivestreamEvidence.observationLabel}.
              </p>
              <p>Recording due: {deal.fallbackLivestreamEvidence.recordingDueLabel}.</p>
            </>
          ) : null}
        </details>
      </div>
    </article>
  );
}

function QuickFilterRail({ deals }: { deals: readonly MarketplaceDeal[] }) {
  const quickFilters = [
    {
      count: deals.filter((deal) => getDealReceiptAtom(deal).exposure === "No charge now").length,
      icon: "source",
      label: "No charge now",
      tone: "good",
    },
    {
      count: deals.filter((deal) => reviewStatusLabel(deal.reviewStatus).includes("Review")).length,
      icon: "review",
      label: "Review required",
      tone: "warn",
    },
    {
      count: deals.filter((deal) => deal.reviewStatus === "verified_recipient").length,
      icon: "safety",
      label: "Verified recipient",
      tone: "good",
    },
    {
      count: deals.filter((deal) => Boolean(deal.verificationSummary)).length,
      icon: "evidence",
      label: "Evidence later",
      tone: "info",
    },
    {
      count: deals.filter((deal) => (deal.userMaxExposureCents ?? 0) <= 2_500).length,
      icon: "payment",
      label: "Low exposure",
      tone: "neutral",
    },
  ] as const;
  const categories = [
    {
      count: deals.filter((deal) => deal.causeTags.some((tag) => /health|poverty|malaria|public/i.test(tag)))
        .length,
      label: "Health",
    },
    {
      count: deals.filter((deal) => deal.causeTags.some((tag) => /animal/i.test(tag))).length,
      label: "Animals",
    },
    {
      count: deals.filter((deal) => deal.causeTags.some((tag) => /climate|environment/i.test(tag))).length,
      label: "Environment",
    },
    {
      count: deals.filter((deal) => deal.causeTags.some((tag) => /ai|existential|future/i.test(tag))).length,
      label: "AI Safety",
    },
    {
      count: deals.filter((deal) => deal.mechanismType === "public_goods_round").length,
      label: "Public goods",
    },
  ] as const;

  return (
    <aside className="mt-v75-quick-rail" data-marketplace-quick-rail aria-label="Quick filters">
      <div className="mt-v75-rail-head">
        <strong>Quick filters</strong>
        <Link href="/offers">Clear all</Link>
      </div>
      {quickFilters.map(({ count, icon, label, tone }) => (
        <Link
          className={joinClassName([
            "mt-v75-quick-link",
            `is-${tone}`,
            count === 0 && "is-muted",
          ])}
          href="/offers"
          key={label}
        >
          <IconMark name={icon} />
          <span>{label}</span>
          <strong>{count}</strong>
        </Link>
      ))}
      <div className="mt-v75-rail-section" aria-label="Categories">
        <strong>Categories</strong>
        {categories.map(({ count, label }) => (
          <Link
            className={joinClassName(["mt-v75-rail-category", count === 0 && "is-muted"])}
            href="/offers"
            key={label}
          >
            <span>{label}</span>
            <strong>{count}</strong>
          </Link>
        ))}
        <Link className="mt-v75-rail-show" href="/offers">
          Show more
        </Link>
      </div>
      <div className="mt-v75-rail-sort">
        <span>Sort by</span>
        <strong>Relevance</strong>
      </div>
    </aside>
  );
}

function PlannerTray({ deals }: { deals: readonly MarketplaceDeal[] }) {
  const selectedDeals = deals.slice(0, 3);
  const exposureTotal = selectedDeals.reduce((sum, deal) => sum + (deal.userMaxExposureCents ?? 0), 0);

  return (
    <section className="mt-v75-planner-tray" aria-labelledby="mt-v75-planner-heading">
      <div className="mt-v75-tray-head">
        <div>
          <h2 id="mt-v75-planner-heading">
            {selectedDeals.length ? `${selectedDeals.length} in planner preview` : "Planner preview"}
          </h2>
          <p>Compare exposure, timing, and terms before confirming.</p>
        </div>
        <Link href="/saved-offers">View planner</Link>
      </div>
      <div className="mt-v75-planner-list">
        {selectedDeals.length ? (
          selectedDeals.map((deal) => {
            const receipt = getDealReceiptAtom(deal);

            return (
              <div className="mt-v75-planner-row" key={deal.id}>
                <DealSemanticVisual deal={deal} />
                <div>
                  <strong>{deal.title}</strong>
                  <span>{receipt.state} · {receipt.conditionOrProtection}</span>
                </div>
                <em>{getDealAmountLabel(deal)}</em>
              </div>
            );
          })
        ) : (
          <p>No planner rows. Browse offers to select reviewable items.</p>
        )}
      </div>
      <dl className="mt-v75-planner-summary">
        <div>
          <dt>Total exposure</dt>
          <dd>{exposureTotal ? centsToV72Exposure(exposureTotal).replace("Max ", "") : "$0.00"}</dd>
        </div>
        <div>
          <dt>Charged now</dt>
          <dd>$0.00</dd>
        </div>
        <div>
          <dt>Next step</dt>
          <dd>Review details, add evidence preferences, then confirm.</dd>
        </div>
      </dl>
    </section>
  );
}

export function ReviewPlanPanel({ deal }: { deal: MarketplaceDeal }) {
  const receipt = getDealReceiptAtom(deal);
  const amountLabel = getDealAmountLabel(deal);

  return (
    <aside className="mt-v75-review-panel" aria-labelledby="mt-v75-review-heading">
      <div className="mt-v75-review-head">
        <h2 id="mt-v75-review-heading">Review your plan</h2>
        <Link aria-label="Back to offers" href="/offers">x</Link>
      </div>
      <div className="mt-v75-review-summary">
        <DealSemanticVisual deal={deal} />
        <div>
          <strong>{deal.title}</strong>
          <span>{receipt.exposure} · No charge now</span>
        </div>
      </div>
      <section className="mt-v75-amount-stepper" aria-label="Amount preview">
        <span>Amount (preview)</span>
        <div>
          <button aria-label="Decrease preview amount" type="button">-</button>
          <strong>{amountLabel}</strong>
          <button aria-label="Increase preview amount" type="button">+</button>
        </div>
      </section>
      <section className="mt-v75-review-card">
        <h3>What happens</h3>
        <ul>
          <li>Review current terms</li>
          <li>Upload evidence only if required</li>
          <li>Human review runs where backed</li>
          <li>No commitment was created in this preview</li>
        </ul>
      </section>
      {deal.fallbackLivestreamEvidence ? (
        <section className="mt-v75-review-card">
          <h3>{deal.fallbackLivestreamEvidence.title}</h3>
          <dl>
            <div>
              <dt>Branch</dt>
              <dd>{deal.fallbackLivestreamEvidence.branchLabel}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{deal.fallbackLivestreamEvidence.statusLabel}</dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd>{deal.fallbackLivestreamEvidence.scheduleLabel}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      <section className="mt-v75-review-card">
        <h3>Price & exposure</h3>
        <dl>
          <div>
            <dt>You commit</dt>
            <dd>{amountLabel}</dd>
          </div>
          <div>
            <dt>Potential max exposure</dt>
            <dd>{receipt.exposure}</dd>
          </div>
          <div>
            <dt>Charged now</dt>
            <dd>$0.00</dd>
          </div>
          <div>
            <dt>Moves if cleared</dt>
            <dd>{receipt.state === "Live" ? "Review required" : "No"}</dd>
          </div>
        </dl>
      </section>
      <section className="mt-v75-review-card">
        <h3>Your methods</h3>
        <dl>
          <div>
            <dt>Pay-in authorization</dt>
            <dd>Not connected</dd>
          </div>
          <div>
            <dt>Payout (if any)</dt>
            <dd>Not needed for this preview</dd>
          </div>
        </dl>
      </section>
      <Link className="button button-primary" href={deal.href}>
        {receipt.primaryCta}
        <span>No commitment created yet</span>
      </Link>
    </aside>
  );
}

const FILTER_GROUPS = [
  {
    id: "source",
    label: "Source",
    keys: ["source_live", "source_worked_example", "source_public_goods", "source_pledge_funding"],
  },
  {
    id: "cause",
    label: "Cause",
    keys: ["cause_health", "cause_animals", "cause_environment", "cause_ai_safety"],
  },
  {
    id: "mechanism",
    label: "Mechanism",
    keys: [
      "pledge_swap",
      "pledge_funding",
      "public_goods_round",
      "action_for_donation",
      "recurring_pledge",
    ],
  },
  {
    id: "exposure",
    label: "Exposure",
    keys: ["preview_only", "no_personal_exposure", "max_exposure_known", "exposure_unknown"],
  },
  {
    id: "burden",
    label: "Commitment burden",
    keys: ["lowest_effort", "beginner_friendly", "requires_evidence"],
  },
  {
    id: "verification",
    label: "Verification",
    keys: ["most_verified", "reviewer_approved_only"],
  },
  {
    id: "availability",
    label: "Availability",
    keys: ["clears_soon", "highest_match", "cross_cluster_trade"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  keys: readonly MarketplaceFilterKey[];
}>;

const FEATURED_CATEGORY_KEYS = [
  "recommended",
  "public_goods_rounds",
  "pledge_funding_rounds",
  "cross_view_swaps",
  "offset_trades",
  "pledge_swaps",
] as const satisfies readonly MarketplaceCategory["key"][];

function getVisibleFilterGroups({
  activeFilters,
  availableFilters,
  filterChips,
}: {
  activeFilters: readonly MarketplaceFilterKey[];
  availableFilters: ReadonlySet<MarketplaceFilterKey>;
  filterChips: readonly MarketplaceFilterChip[];
}) {
  const chipByKey = new Map(filterChips.map((chip) => [chip.key, chip]));

  return FILTER_GROUPS.map((group) => ({
    ...group,
    options: group.keys
      .map((key) => chipByKey.get(key))
      .filter((chip): chip is MarketplaceFilterChip => {
        if (!chip) return false;

        return availableFilters.has(chip.key) || activeFilters.includes(chip.key);
      }),
  })).filter((group) => group.options.length > 0);
}

function summarizeActiveFilters(activeChips: readonly MarketplaceFilterChip[]) {
  if (activeChips.length <= 2) {
    return activeChips.map((chip) => `Filter: ${chip.label}`);
  }

  return [`${activeChips.length} filters`];
}

function openBrowseFilterSheetHref(href: string) {
  return `${href}${href.includes("?") ? "&" : "?"}browse_filters=1`;
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
  if (deal.fundingRound) {
    const receipt = getPledgeFundingReceiptAtom(deal.fundingRound);

    return {
      conditionOrProtection: receipt.conditionOrProtection,
      exposure: receipt.exposure,
      primaryCta: receipt.primaryCta,
      protection: receipt.protection,
      source: "Pledge funding",
      state: receipt.state,
    };
  }

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

export function PledgeFundingPanel({ round }: { round: PledgeFundingRound }) {
  const mechanism = getPledgeFundingMechanismState(round);
  const receipt = getPledgeFundingReceiptAtom(round);
  const showCharityBonus = shouldShowPreferredCharityBonus(round);

  return (
    <section className="pledge-funding-panel panel" aria-labelledby="pledge-funding-panel-heading">
      <div className="deal-panel-head">
        <p className="detail-kicker">{mechanism.modeLabel}</p>
        <h3 id="pledge-funding-panel-heading">Funding terms</h3>
      </div>
      <dl className="deal-economics-grid">
        <div>
          <dt>State</dt>
          <dd>{receipt.state}</dd>
        </div>
        <div>
          <dt>Exposure</dt>
          <dd>{receipt.exposure}</dd>
        </div>
        <div>
          <dt>Round status</dt>
          <dd>{mechanism.progressLabel}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{mechanism.remainingLabel}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{round.deadlineAt ? new Date(round.deadlineAt).toLocaleDateString() : "Not connected"}</dd>
        </div>
        <div>
          <dt>Refund / release</dt>
          <dd>{receipt.protection}</dd>
        </div>
      </dl>
      <div className="deal-rule-list">
        <p>
          <strong>If the round clears:</strong>{" "}
          {round.mode === "capped_pivotal_cohort"
            ? "The capped cohort would fund the pledge after backend gates pass."
            : "The target would fund the pledge after backend gates pass."}
        </p>
        <p>
          <strong>If it does not clear:</strong> {round.refundPolicy}
        </p>
        <p>
          <strong>Baseline/review:</strong> {round.baselineStatement} {round.evidenceReviewStatus}
        </p>
        <p>
          <strong>Preferred charity:</strong>{" "}
          {showCharityBonus
            ? getPreferredCharityBonusCopy(round)
            : "Preferred-charity bonus not connected yet"}
        </p>
      </div>
    </section>
  );
}

export function PledgeFundingSheet({ round }: { round: PledgeFundingRound }) {
  const mechanism = getPledgeFundingMechanismState(round);
  const receipt = getPledgeFundingReceiptAtom(round);
  const sheetTitle = round.mode === "capped_pivotal_cohort" ? "Review your slot" : "Review your funding";

  return (
    <details className="commitment-sheet pledge-funding-sheet" id="funding-sheet">
      <summary>{receipt.primaryCta}</summary>
      <div className="commitment-sheet-body" role="group" aria-label={sheetTitle}>
        <div className="commitment-sheet-handle" aria-hidden="true" />
        <div className="commitment-sheet-header">
          <p className="detail-kicker">
            Pledge funding · {receipt.state}
          </p>
          <p>{sheetTitle}</p>
        </div>
        <dl className="v72-receipt-facts pledge-funding-sheet-facts">
          <div>
            <dt>Pledge</dt>
            <dd>{round.title}</dd>
          </div>
          <div>
            <dt>{round.mode === "capped_pivotal_cohort" ? "Slot amount" : "Contribution"}</dt>
            <dd>{mechanism.contributionLabel}</dd>
          </div>
          <div>
            <dt>Round state</dt>
            <dd>{mechanism.progressLabel}</dd>
          </div>
          <div>
            <dt>If cleared</dt>
            <dd>
              {round.mode === "capped_pivotal_cohort"
                ? "Cohort funds the pledge after live gates pass"
                : "Target funds the pledge after live gates pass"}
            </dd>
          </div>
          <div>
            <dt>If not cleared</dt>
            <dd>{round.refundPolicy}</dd>
          </div>
          <div>
            <dt>Preferred charity</dt>
            <dd>{getPreferredCharityBonusCopy(round)}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>Not connected</dd>
          </div>
        </dl>
        <p className="v72-sheet-result" role="status">
          {receipt.resultCopy}
        </p>
        <div className="v72-sheet-footer">
          <span>
            {receipt.state} · {receipt.exposure} · {receipt.conditionOrProtection}
          </span>
          <Link className="button button-primary" href={`/funding-rounds/${round.id}#funding-sheet`}>
            {receipt.primaryCta}
          </Link>
        </div>
      </div>
    </details>
  );
}

export function MarketplaceSearch({
  inputId = "marketplace-search-input",
  query,
  showButton = true,
  ...formProps
}: {
  inputId?: string;
  query: string;
  showButton?: boolean;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "method" | "role">) {
  return (
    <form
      {...formProps}
      action="/offers"
      className={joinClassName(["moral-marketplace-search", formProps.className])}
      method="get"
      role="search"
    >
      <span className="mt-v75-search-icon" aria-hidden="true">
        <IconMark name="search" />
      </span>
      {!showButton ? (
        <span className="mt-v75-search-tune" aria-hidden="true">
          <IconMark name="tune" />
        </span>
      ) : null}
      <label className="sr-only" htmlFor={inputId}>
        Search marketplace
      </label>
      <input
        defaultValue={query}
        id={inputId}
        name="search"
        placeholder="Search offers, funds, templates, rounds"
        type="search"
      />
      {showButton ? (
        <button className="button button-primary moral-marketplace-search-button" type="submit">
          Search
        </button>
      ) : null}
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
    <article
      className={joinClassName([
        "moral-deal-card panel",
        `moral-deal-card-${variant}`,
        receiptStateClass(receipt.state),
      ])}
    >
      <Link className="moral-deal-card-main" href={deal.href}>
        <span
          aria-label={`${mechanismLabel(deal.mechanismType)} visual for ${receipt.state.toLowerCase()} listing`}
          className={dealVisualClassName(deal, receipt.state)}
          role="img"
        >
          <IconMark name={mechanismIcon(deal.mechanismType)} />
        </span>
        <div className="moral-deal-card-copy">
          <div className="moral-deal-card-head">
            <span className={badgeClassName(receipt.state, "state")}>{receipt.state}</span>
            <span className={badgeClassName(receipt.source)}>{receipt.source}</span>
          </div>
          <h3>{deal.title}</h3>
          {deal.subtitle ? <p className="moral-deal-summary">{deal.subtitle}</p> : null}
          <p className="moral-deal-receipt-line">
            <strong>{receipt.exposure}</strong>
            <span>{receipt.conditionOrProtection}</span>
            <span>{receipt.protection}</span>
          </p>
          <div className="moral-deal-chip-row" aria-label="Listing tags">
            <FallbackLivestreamEvidencePill deal={deal} />
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
    { href: "/mpgf", label: "Public goods" },
  ];
  const availableFilters = new Set<MarketplaceFilterKey>(
    surface.deals.flatMap((deal) => deal.filterTags ?? []),
  );
  const activeFilterChips = surface.filterChips.filter((chip) => chip.active);
  const filterGroups = getVisibleFilterGroups({
    activeFilters: query.filters,
    availableFilters,
    filterChips: surface.filterChips,
  });
  const activeCategory = surface.categories.find((category) => category.key === surface.activeCategory);
  const activeRailLabels = [
    activeCategory && activeCategory.key !== "recommended" ? `Lane: ${activeCategory.label}` : null,
    ...summarizeActiveFilters(activeFilterChips),
  ].filter((label): label is string => Boolean(label));
  const compactRailLabels =
    activeRailLabels.length > 2 ? [`${activeRailLabels.length} filters`] : activeRailLabels;
  const clearFilterHref = buildMarketplaceHref({ query: surface.query });
  const currentFilterHref = buildMarketplaceHref({
    category: surface.activeCategory,
    filters: query.filters,
    query: surface.query,
  });
  const openFilterHref = openBrowseFilterSheetHref(currentFilterHref);
  const featuredCategories = FEATURED_CATEGORY_KEYS.map((key) =>
    surface.categories.find((category) => category.key === key),
  ).filter((category): category is MarketplaceCategory => {
    if (!category) return false;

    return category.availabilityLabel !== "Unavailable" || category.key === surface.activeCategory;
  });
  const primaryDeal = selectPrimaryBrowseDeal(visibleDeals, zeroLive);
  const secondaryDeals = selectSecondaryDeals(visibleDeals, primaryDeal);
  const secondaryDealIds = new Set(secondaryDeals.map((deal) => deal.id));
  const wideInventoryDeals = visibleDeals
    .filter((deal) => deal.id !== primaryDeal?.id && !secondaryDealIds.has(deal.id))
    .slice(0, 16);
  const tabLinks = [
    ["For you", buildMarketplaceHref({ query: surface.query })],
    ["Offers", "/offers?tab=live"],
    ["Templates", "/offers?tab=templates"],
    ["Public goods", "/mpgf"],
    ["Swaps", buildMarketplaceHref({ category: "cross_view_swaps", query: surface.query })],
    ["Offsets", buildMarketplaceHref({ category: "offset_trades", query: surface.query })],
  ] as const;
  const compactFilterLinks = [
    {
      active: surface.activeCategory === "recommended" && query.filters.length === 0,
      href: buildMarketplaceHref({ query: surface.query }),
      label: "All",
    },
    {
      active: query.filters.includes("cause_health"),
      href: buildMarketplaceHref({ filters: ["cause_health"], query: surface.query }),
      label: "Health",
    },
    {
      active: query.filters.includes("cause_animals"),
      href: buildMarketplaceHref({ filters: ["cause_animals"], query: surface.query }),
      label: "Animals",
    },
    {
      active: query.filters.includes("cause_environment"),
      href: buildMarketplaceHref({ filters: ["cause_environment"], query: surface.query }),
      label: "Environment",
    },
    {
      active: query.filters.includes("cause_ai_safety"),
      href: buildMarketplaceHref({ filters: ["cause_ai_safety"], query: surface.query }),
      label: "AI Safety",
    },
  ] as const;

  return (
    <section className="moral-marketplace-home" aria-labelledby="moral-marketplace-heading">
      <div className="mt-v75-desktop-board" aria-label="Moral Trade marketplace desktop">
        <MarketplaceSideNav active="browse" />
        <div className="mt-v75-workspace">
          <div className="mt-v75-toolbar">
            <MarketplaceSearch
              data-marketplace-search
              inputId="marketplace-desktop-search-input"
              query={surface.query}
              showButton={false}
            />
            <Link className="mt-v75-bell" href="/messages" aria-label="Lifecycle updates">
              <IconMark name="review" />
            </Link>
          </div>
          <nav className="mt-v75-tabs" data-marketplace-tabs aria-label="Marketplace tabs">
            {tabLinks.map(([label, href], index) => (
              <Link aria-current={index === 0 ? "page" : undefined} href={href} key={label}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-v75-browse-grid">
            <main className="mt-v75-browse-main">
              <div className="mt-v75-safety-strip" data-marketplace-safety>
                <IconMark name="lock" />
                <div>
                  <strong>Preview only until you confirm</strong>
                  <span>No commitment · No charge · You review every detail</span>
                </div>
                <Link href="/what-is-moral-trade">Learn how &gt;</Link>
              </div>
              <div className="mt-v75-filter-row" data-marketplace-filters aria-label="Compact filters">
                {compactFilterLinks.map(({ active, href, label }) => (
                  <Link aria-current={active ? "true" : undefined} href={href} key={label}>
                    {label}
                  </Link>
                ))}
                <Link className="mt-v75-filter-more" href={openFilterHref}>
                  More <IconMark name="filter" />
                </Link>
              </div>
              {primaryDeal ? (
                <FeaturedDealCard deal={primaryDeal} />
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
              <div className="mt-v75-secondary-grid" data-marketplace-secondary-grid>
                {secondaryDeals.map((deal, index) => {
                  const publicGoodsIndex =
                    deal.mechanismType === "public_goods_round"
                      ? secondaryDeals
                          .slice(0, index + 1)
                          .filter((candidate) => candidate.mechanismType === "public_goods_round").length - 1
                      : -1;

                  return (
                    <MiniDealTile
                      deal={deal}
                      key={deal.id}
                      publicGoodsVariant={publicGoodsIndex > 0 ? "repeat" : "default"}
                    />
                  );
                })}
              </div>
            </main>
            <QuickFilterRail deals={visibleDeals} />
            {wideInventoryDeals.length ? (
              <div className="mt-v75-browse-more" data-marketplace-wide-grid aria-label="More browse items">
                {wideInventoryDeals.map((deal, index) => {
                  const publicGoodsIndex =
                    deal.mechanismType === "public_goods_round"
                      ? wideInventoryDeals
                          .slice(0, index + 1)
                          .filter((candidate) => candidate.mechanismType === "public_goods_round").length - 1
                      : -1;

                  return (
                    <MiniDealTile
                      deal={deal}
                      key={deal.id}
                      publicGoodsVariant={publicGoodsIndex > 0 ? "repeat" : "default"}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="moral-marketplace-app-header">
        <div className="moral-marketplace-title-block">
          <span className="moral-marketplace-brand">Moral Trade</span>
          <h1 id="moral-marketplace-heading">Browse offers</h1>
        </div>
        <div className="moral-marketplace-header-actions" aria-label="Marketplace shortcuts">
          <Link className="moral-marketplace-icon-action" href="/dashboard" aria-label="Account">
            <IconMark name="profile" />
          </Link>
          <Link className="button button-primary button-mini" href={createHref}>
            Create
          </Link>
        </div>
      </div>
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
      <span id="browse-controls" className="v72-filter-anchor" aria-hidden="true" />
      <div className="moral-marketplace-filter-chips v72-control-rail" aria-label="Marketplace controls">
        {railLinks.map((link) => (
          <Link className="source-pill source-pill-link" href={link.href} key={link.label}>
            {link.label}
          </Link>
        ))}
        <Link className="source-pill source-pill-link v72-filter-trigger" href={openFilterHref}>
          Filter
        </Link>
        {compactRailLabels.map((label) => (
          <span className="source-pill v72-active-filter-chip" key={label}>
            {label}
          </span>
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
      <section
        aria-labelledby="browse-filter-title"
        className={joinClassName(["v72-filter-sheet-root", query.filterSheetOpen && "is-open"])}
        id="browse-filter-sheet"
      >
        <Link
          aria-label="Close filters"
          className="v72-filter-scrim"
          href={currentFilterHref}
        />
        <form action="/offers" className="v72-filter-sheet" method="get" role="dialog" aria-modal="true">
          <div className="v72-filter-sheet-header">
            <h2 id="browse-filter-title">All filters</h2>
            <Link aria-label="Close filters" className="v72-filter-close" href={currentFilterHref}>
              X
            </Link>
          </div>
          <p className="v72-filter-context">
            {zeroLive ? "Showing examples and templates" : "Review current terms before continuing"}
          </p>
          {surface.query ? <input name="search" type="hidden" value={surface.query} /> : null}
          <div className="v72-filter-sheet-body">
            <nav className="v72-filter-category-rail" aria-label="Filter categories">
              {featuredCategories.length ? <a href="#filter-lane">Lane</a> : null}
              {filterGroups.map((group) => (
                <a href={`#filter-${group.id}`} key={group.id}>
                  {group.label}
                </a>
              ))}
            </nav>
            <div className="v72-filter-options">
              {featuredCategories.length ? (
                <fieldset className="v72-filter-section" id="filter-lane">
                  <legend>Lane</legend>
                  <div className="v72-filter-option-grid">
                    {featuredCategories.map((category) => (
                      <label className="v72-filter-option-chip" key={category.key}>
                        <input
                          defaultChecked={category.key === surface.activeCategory}
                          name="marketplace_category"
                          type="radio"
                          value={category.key}
                        />
                        <span>
                          <strong>{category.label}</strong>
                          <small>{category.availabilityLabel}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {filterGroups.length ? (
                filterGroups.map((group) => (
                  <fieldset className="v72-filter-section" id={`filter-${group.id}`} key={group.id}>
                    <legend>{group.label}</legend>
                    <div className="v72-filter-option-grid">
                      {group.options.map((chip) => (
                        <label className="v72-filter-option-chip" key={chip.key}>
                          <input
                            defaultChecked={chip.active}
                            name="marketplace_filter"
                            type="checkbox"
                            value={chip.key}
                          />
                          <span>
                            <strong>{chip.label}</strong>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))
              ) : (
                <p className="v72-filter-empty">No backed filters are available for this view.</p>
              )}
            </div>
          </div>
          <div className="v72-filter-sheet-footer">
            <Link className="button button-secondary" href={clearFilterHref}>
              Clear all
            </Link>
            <button className="button button-primary" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

export function MarketplaceBottomNav({
  active = "browse",
}: {
  active?: "browse" | "plan" | "create" | "track" | "messages" | "profile" | "account";
}) {
  const normalizedActive = active === "account" ? "profile" : active;
  const items = [
    { key: "browse", href: "/offers", label: "Browse", icon: "marketplace" },
    { key: "plan", href: "/saved-offers", label: "Plan", icon: "example" },
    { key: "track", href: "/commitments", label: "Track", icon: "evidence" },
    { key: "messages", href: "/messages", label: "Messages", icon: "review" },
    { key: "profile", href: "/profile", label: "Profile", icon: "profile" },
  ] as const;

  return (
    <nav className="marketplace-bottom-nav" aria-label="Marketplace bottom navigation">
      {items.map((item) => (
        <Link
          aria-current={active === item.key ? "page" : undefined}
          className={joinClassName([
            "marketplace-bottom-nav-item",
            normalizedActive === item.key && "is-active",
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
