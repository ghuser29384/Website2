import type { Metadata } from "next";
import Link from "next/link";

import { CommitmentsDocumentLink } from "@/components/commitments/commitments-document-link";
import {
  CommitmentSummaryIcon,
  type CommitmentSummaryIconName,
} from "@/components/commitments/commitment-summary-icon";
import { CommitmentsLocalGreeting } from "@/components/commitments/commitments-local-greeting";
import { ImpactShareButton } from "@/components/commitments/impact-share-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import {
  aggregateRecordQuantities,
  groupCommitments,
  isActiveCommitment,
  loadCommitmentsPortfolioData,
  type CommitmentsTab,
  type CommitmentRecord,
  type PortfolioGroupMode,
  type ResourceQuantity,
} from "@/lib/commitments-portfolio";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

import redesignStyles from "./commitments-redesign.module.css";
import styles from "./commitments.module.css";

export const metadata: Metadata = {
  title: "Commitments",
  robots: {
    follow: false,
    index: false,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

const TAB_LABELS: Record<CommitmentsTab, string> = {
  portfolio: "Portfolio",
  ledger: "Ledger",
  completed: "Completed",
  calendar: "Calendar",
};

const GROUP_LABELS: Record<PortfolioGroupMode, string> = {
  cause: "Cause",
  mechanism: "Mechanism",
  resource: "Resource type",
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveTab(value: string | undefined): CommitmentsTab {
  return value === "ledger" || value === "completed" || value === "calendar" ? value : "portfolio";
}

function resolveGroup(value: string | undefined): PortfolioGroupMode {
  return value === "mechanism" || value === "resource" ? value : "cause";
}

function formatQuantity(quantity: ResourceQuantity) {
  if (quantity.kind === "money" && quantity.currency) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: quantity.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(quantity.value / 100);
  }
  return `${new Intl.NumberFormat().format(quantity.value)} ${quantity.unit ?? "units"}`;
}

function QuantityList({ quantities, empty = "—" }: { quantities: ResourceQuantity[]; empty?: string }) {
  if (!quantities.length) return <span className={styles.emptyValue}>{empty}</span>;
  return (
    <span className={styles.quantityList}>
      {quantities.map((quantity) => (
        <span key={`${quantity.kind}:${quantity.currency ?? quantity.unit}`}>{formatQuantity(quantity)}</span>
      ))}
    </span>
  );
}

function tabHref(tab: CommitmentsTab, group: PortfolioGroupMode) {
  const search = new URLSearchParams();
  if (tab !== "portfolio") search.set("tab", tab);
  if (group !== "cause") search.set("group", group);
  const query = search.toString();
  return query ? `/commitments?${query}` : "/commitments";
}

function groupHref(group: PortfolioGroupMode) {
  return group === "cause" ? "/commitments" : `/commitments?group=${group}`;
}

type SummaryTone = "blue" | "violet" | "amber" | "green" | "slate";

function SummaryMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: CommitmentSummaryIconName;
  label: string;
  value: React.ReactNode;
  tone: SummaryTone;
}) {
  return (
    <div className={redesignStyles.summaryCard} data-tone={tone}>
      <span className={redesignStyles.summaryIcon}>
        <CommitmentSummaryIcon name={icon} />
      </span>
      <strong className={redesignStyles.summaryValue}>{value}</strong>
      <span className={redesignStyles.summaryLabel}>{label}</span>
    </div>
  );
}

function lifecycleTone(record: CommitmentRecord) {
  if (record.lifecycle === "verified" || record.lifecycle === "completed") return "verified";
  if (record.lifecycle === "returned" || record.lifecycle === "cancelled" || record.lifecycle === "expired") return "terminal";
  if (record.lifecycle === "disputed") return "risk";
  return "active";
}

function RecordRow({ record }: { record: CommitmentRecord }) {
  return (
    <article className={styles.recordRow}>
      <div className={styles.recordIdentity}>
        <span className={styles.mechanismMark} data-mechanism={record.mechanism.replaceAll(" ", "-").toLowerCase()} aria-hidden="true" />
        <div>
          <div className={styles.recordHeadingLine}>
            <h3><Link href={record.href}>{record.title}</Link></h3>
            <span className={styles.statusBadge} data-tone={lifecycleTone(record)}>{record.lifecycleLabel}</span>
          </div>
          <p>{record.subtitle}</p>
          <div className={styles.recordMeta}>
            <span>{record.mechanism}</span>
            <span>{record.resourceType}</span>
            <span>{record.privacyLabel}</span>
            {record.counterpartyLabel ? <span>{record.counterpartyLabel}</span> : null}
          </div>
          {record.action ? (
            <Link className={styles.actionCallout} data-urgency={record.action.urgency} href={record.action.href}>
              <strong>{record.action.label}</strong>
              <span>{record.action.detail}</span>
            </Link>
          ) : null}
        </div>
      </div>
      <dl className={styles.recordEconomics}>
        <div>
          <dt>You committed</dt>
          <dd><QuantityList quantities={record.userCommitted} /></dd>
        </div>
        <div>
          <dt>Total coordinated</dt>
          <dd><QuantityList quantities={record.totalCoordinated} /></dd>
        </div>
        <div>
          <dt>Additional resources attributed</dt>
          <dd><QuantityList quantities={record.attributedAdditionalResources} empty="Not attributed" /></dd>
        </div>
        <div>
          <dt>Evidence / review</dt>
          <dd>{record.evidenceLabel}<small>{record.reviewLabel}</small></dd>
        </div>
      </dl>
    </article>
  );
}

function PortfolioView({
  data,
  group,
}: {
  data: Awaited<ReturnType<typeof loadCommitmentsPortfolioData>>;
  group: PortfolioGroupMode;
}) {
  const groups = groupCommitments(data.records, group);

  return (
    <>
      <section className={styles.sectionHeader}>
        <div>
          <span>Allocation</span>
          <h2>Where your commitments are allocated.</h2>
        </div>
        <nav className={styles.groupSwitch} aria-label="Group portfolio by">
          {(Object.keys(GROUP_LABELS) as PortfolioGroupMode[]).map((option) => (
            <CommitmentsDocumentLink aria-current={group === option ? "page" : undefined} href={groupHref(option)} key={option}>
              {GROUP_LABELS[option]}
            </CommitmentsDocumentLink>
          ))}
        </nav>
      </section>

      {groups.length ? (
        <div className={styles.groupList}>
          {groups.map((entry) => {
            const committed = aggregateRecordQuantities(entry.records, (record) => record.userCommitted);
            const coordinated = aggregateRecordQuantities(entry.records, (record) => record.totalCoordinated);
            const attributed = aggregateRecordQuantities(entry.records, (record) => record.attributedAdditionalResources);
            return (
              <section className={styles.groupSection} key={entry.label}>
                <header>
                  <div>
                    <span>{GROUP_LABELS[group]}</span>
                    <h2>{entry.label}</h2>
                  </div>
                  <dl>
                    <div><dt>Records</dt><dd>{entry.records.length}</dd></div>
                    <div><dt>You committed</dt><dd><QuantityList quantities={committed} /></dd></div>
                    <div><dt>Total coordinated</dt><dd><QuantityList quantities={coordinated} /></dd></div>
                    <div><dt>Attributed additional</dt><dd><QuantityList quantities={attributed} empty="Not attributed" /></dd></div>
                  </dl>
                </header>
                <div>{entry.records.map((record) => <RecordRow key={record.id} record={record} />)}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.guidedEmpty}>
          <div>
            <h2>No commitments yet.</h2>
            <p>Published examples, searches, and marketplace previews are not counted as commitments. Binding records appear after an accepted agreement, saved threshold pledge, or completed redirect creates a participant-scoped record.</p>
          </div>
          <div className={styles.emptyActions}>
            <Link className="button button-primary" href="/trades/new">Create an offer</Link>
            <Link className="button button-secondary" href="/discover">Discover opportunities</Link>
            <Link className={styles.textLink} href="/walkthrough">View how it works →</Link>
          </div>
        </div>
      )}

      {data.openOffers.length ? (
        <section className={styles.openOffers}>
          <div className={styles.sectionHeader}>
            <div><span>Open offers</span><h2>Published, not yet binding.</h2></div>
          </div>
          <div className={styles.offerRows}>
            {data.openOffers.map((offer) => (
              <Link href={offer.href} key={offer.id}>
                <div><strong>{offer.title}</strong><span>{offer.cause} · {offer.mechanism} · {offer.resourceType}</span></div>
                <span>{offer.inCart ? "In your cart" : "Open"} →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function LedgerView({ data }: { data: Awaited<ReturnType<typeof loadCommitmentsPortfolioData>> }) {
  return (
    <section>
      <div className={styles.sectionHeader}>
        <div><span>Double-entry record</span><h2>Every material commitment event.</h2></div>
      </div>
      {data.events.length ? (
        <ol className={styles.timeline}>
          {data.events.map((event) => (
            <li key={event.id} data-kind={event.kind}>
              <LocalDateTime value={event.at} fallback="Date unavailable" options={{ dateStyle: "medium", timeStyle: "short" }} />
              <div><strong>{event.title}</strong><p>{event.detail}</p></div>
              <Link href={event.href}>View →</Link>
            </li>
          ))}
        </ol>
      ) : <div className={styles.inlineEmpty}>No ledger events exist for this account.</div>}
    </section>
  );
}

function CompletedView({ data }: { data: Awaited<ReturnType<typeof loadCommitmentsPortfolioData>> }) {
  const completed = data.records.filter((record) => ["completed", "verified", "returned", "cancelled", "expired"].includes(record.lifecycle));
  const lifetime = data.impactWindows.find((window) => window.key === "lifetime")!;
  const shareSummary = [
    "My Moral Trade impact summary",
    ...lifetime.attributed.map((quantity) => `Attributed additional resources: ${formatQuantity(quantity)}`),
    `Verified outcomes: ${lifetime.verifiedOutcomeCount}`,
    "Only privacy-safe aggregate totals are included. Estimated and attributed resources are reported separately.",
  ].join("\n");

  return (
    <>
      <section className={styles.impactProfile}>
        <header>
          <div><span>Impact profile</span><h2>Additional resources attributed to your completed commitments.</h2></div>
          <ImpactShareButton className="button button-secondary" title="Moral Trade impact summary" text={shareSummary} />
        </header>
        <div className={styles.windowGrid}>
          {data.impactWindows.map((window) => (
            <article key={window.key}>
              <span>{window.label}</span>
              <strong><QuantityList quantities={window.attributed} empty="No attributed resources" /></strong>
              <small>{window.verifiedOutcomeCount} verified outcome{window.verifiedOutcomeCount === 1 ? "" : "s"}</small>
            </article>
          ))}
        </div>
        <p className={styles.methodNote}>Expected marginal effects may overlap and are never added into these totals. Attributed additional resources use only explicit matching or causal-credit records and are capped at realized resources.</p>
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <div><span>Completed</span><h2>Outcomes, returns, and causal accounting.</h2></div>
        </div>
        {completed.length ? (
          <div className={styles.completedList}>
            {completed.map((record) => (
              <article key={record.id}>
                <header>
                  <div><span>{record.mechanism}</span><h3><Link href={record.href}>{record.title}</Link></h3></div>
                  <span className={styles.statusBadge} data-tone={lifecycleTone(record)}>{record.lifecycleLabel}</span>
                </header>
                <dl>
                  <div><dt>Expected marginal effect</dt><dd><QuantityList quantities={record.expectedMarginalEffect} empty="Not estimated" /></dd></div>
                  <div><dt>Attributed additional resources</dt><dd><QuantityList quantities={record.attributedAdditionalResources} empty="Not attributed" /></dd></div>
                  <div><dt>Principal returned</dt><dd><QuantityList quantities={record.principalReturned} /></dd></div>
                  <div><dt>Failure bonus / carry-forward</dt><dd><QuantityList quantities={record.failureBonus} /></dd></div>
                </dl>
                <p>{record.causalMethod}</p>
              </article>
            ))}
          </div>
        ) : <div className={styles.inlineEmpty}>No completed, returned, cancelled, or expired commitments yet.</div>}
      </section>
    </>
  );
}

function CalendarView({ data, showAll }: { data: Awaited<ReturnType<typeof loadCommitmentsPortfolioData>>; showAll: boolean }) {
  const items = showAll ? data.calendar : data.calendar.filter((item) => item.requiresUserAction);
  return (
    <section>
      <div className={styles.sectionHeader}>
        <div><span>Calendar</span><h2>Deadlines and expected commitment events.</h2></div>
        <nav className={styles.groupSwitch} aria-label="Calendar scope">
          <CommitmentsDocumentLink aria-current={!showAll ? "page" : undefined} href="/commitments?tab=calendar">Action needed</CommitmentsDocumentLink>
          <CommitmentsDocumentLink aria-current={showAll ? "page" : undefined} href="/commitments?tab=calendar&calendar=all">All dates</CommitmentsDocumentLink>
        </nav>
      </div>
      {items.length ? (
        <ol className={styles.calendarList}>
          {items.map((item) => (
            <li key={item.id} data-action={item.requiresUserAction ? "true" : "false"}>
              <LocalDateTime
                value={item.at}
                fallback="Date unavailable"
                options={{ month: "short", day: "numeric", year: "numeric" }}
              />
              <div><strong>{item.label}</strong><p>{item.detail}</p></div>
              <Link href={item.href}>View →</Link>
            </li>
          ))}
        </ol>
      ) : <div className={styles.inlineEmpty}>No dates match this calendar view.</div>}
    </section>
  );
}

export default async function CommitmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab = resolveTab(firstValue(params.tab));
  const group = resolveGroup(firstValue(params.group));
  const showAllCalendar = firstValue(params.calendar) === "all";
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;
  const data = viewer
    ? await loadCommitmentsPortfolioData({ userId: viewer.authUser.id, displayName: viewer.displayName })
    : null;

  const activeRecords = data?.records.filter(isActiveCommitment) ?? [];
  const activeMechanisms = new Set(activeRecords.map((record) => record.mechanism)).size;
  const actionNeeded = activeRecords.filter((record) => record.action).length;
  const generatedAt = data ? new Date(data.generatedAt) : null;
  const activatedThisMonth = generatedAt
    ? activeRecords.filter((record) => {
        const created = new Date(record.createdAt);
        return (
          record.lifecycle !== "conditional" &&
          created.getUTCFullYear() === generatedAt.getUTCFullYear() &&
          created.getUTCMonth() === generatedAt.getUTCMonth()
        );
      })
    : [];
  const verifiedRecords = data?.records.filter((record) => record.verifiedOutcome) ?? [];

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showSearch={false}
          showLogout={Boolean(viewer)}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <MarketplaceRouteShell active="track">
          <section className={`${styles.page} ${redesignStyles.page} v72-private-surface commitments-center mt-v75-route-card`} aria-labelledby="commitments-heading">
            <header className={`${styles.hero} ${redesignStyles.hero}`}>
              <div>
                <h1 id="commitments-heading">Commitments</h1>
                <span aria-hidden="true" hidden>Additional resources you caused.</span>
                <p>Track your commitments, proof, outcomes, and impact.</p>
              </div>
              {data ? (
                <div className={`${styles.heroAside} ${redesignStyles.heroAside}`}>
                  <CommitmentsLocalGreeting className={`${styles.greeting} ${redesignStyles.greeting}`} name={data.displayName} />
                  <Link className="button button-primary" href="/trades/new">+ Create offer</Link>
                </div>
              ) : null}
            </header>

            <nav className={`${styles.tabs} ${redesignStyles.tabs}`} aria-label="Commitments sections">
              {(Object.keys(TAB_LABELS) as CommitmentsTab[]).map((option) => (
                <CommitmentsDocumentLink aria-current={tab === option ? "page" : undefined} href={tabHref(option, group)} key={option}>
                  {TAB_LABELS[option]}
                </CommitmentsDocumentLink>
              ))}
            </nav>

            {!supabaseReady ? (
              <div className={styles.unavailable}>
                <h2>Commitment data unavailable.</h2>
                <p>The authenticated data service is not configured in this environment. No sample values or synthetic commitments are substituted.</p>
              </div>
            ) : !viewer ? (
              <div className={styles.guidedEmpty}>
                <div><h2>Sign in to view your commitments.</h2><p>Commitments and causal-impact records are private to the participant unless a separate record has been explicitly made public.</p></div>
                <Link className="button button-primary" href="/login?returnTo=/commitments">Sign in to continue</Link>
              </div>
            ) : data ? (
              <>
                <section className={`${styles.summary} ${redesignStyles.summary}`} aria-label="Commitment summary">
                  <SummaryMetric
                    icon="commitment"
                    label={activeRecords.length === 1 ? "Active commitment" : "Active commitments"}
                    tone="blue"
                    value={activeRecords.length}
                  />
                  <SummaryMetric
                    icon="mechanism"
                    label={activeMechanisms === 1 ? "Active mechanism" : "Active mechanisms"}
                    tone="violet"
                    value={activeMechanisms}
                  />
                  <SummaryMetric icon="action" label="Action needed" tone="amber" value={actionNeeded} />
                  <SummaryMetric icon="activated" label="Activated this month" tone="green" value={activatedThisMonth.length} />
                  <SummaryMetric icon="verified" label="Verified to date" tone="slate" value={verifiedRecords.length} />
                </section>

                <section className={redesignStyles.projection}>
                  <div className={redesignStyles.projectionCopy}>
                    <span className={redesignStyles.projectionEyebrow}>If everything succeeds</span>
                    <strong className={redesignStyles.projectionValue}>
                      <QuantityList
                        quantities={data.cartProjection.projectedAdditionalResources}
                        empty={`${data.cartProjection.projectedCounterpartyActions} counterparty action${data.cartProjection.projectedCounterpartyActions === 1 ? "" : "s"}`}
                      />
                    </strong>
                    <span className={redesignStyles.projectionHint}>Projected if all conditions are met.</span>
                  </div>
                  <Link className={redesignStyles.projectionAction} href="/saved-offers">Review cart →</Link>
                </section>

                <details className={redesignStyles.detailsRow}>
                  <summary className={redesignStyles.detailsSummary}>
                    <span className={redesignStyles.detailsTitle}>Additional details</span>
                    <span className={redesignStyles.detailsMeta}>
                      Connected record types
                      <span aria-hidden="true" className={redesignStyles.detailsChevron} />
                    </span>
                  </summary>
                  <div className={redesignStyles.detailsContent}>
                    <p>{data.cartProjection.assumption}</p>
                    {data.warnings.length ? (
                      <ul>{data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                    ) : null}
                  </div>
                </details>

                <div className={styles.contentGrid}>
                  <div className={styles.primaryContent}>
                    {tab === "portfolio" ? <PortfolioView data={data} group={group} /> : null}
                    {tab === "ledger" ? <LedgerView data={data} /> : null}
                    {tab === "completed" ? <CompletedView data={data} /> : null}
                    {tab === "calendar" ? <CalendarView data={data} showAll={showAllCalendar} /> : null}
                  </div>
                  <aside className={styles.activityRail}>
                    <header><div><span>Recent activity</span><h2>Latest updates.</h2></div><CommitmentsDocumentLink href="/commitments?tab=ledger">View all →</CommitmentsDocumentLink></header>
                    {data.recentActivity.length ? (
                      <ol>
                        {data.recentActivity.map((event) => (
                          <li key={event.id} data-kind={event.kind}>
                            <LocalDateTime
                              value={event.at}
                              fallback="Date unavailable"
                              options={{ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }}
                            />
                            <div><strong>{event.title}</strong><span>{event.detail}</span><Link href={event.href}>View details →</Link></div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className={styles.inlineEmpty}>No activity yet.</p>}
                  </aside>
                </div>
              </>
            ) : null}
          </section>
        </MarketplaceRouteShell>
      </main>

      <MarketplaceBottomNav active="track" />
      <SiteFooter />
    </div>
  );
}
