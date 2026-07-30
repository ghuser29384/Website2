import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Verified outcomes",
  description:
    "Privacy-safe Moral Trade outcome metadata. Evidence originals, identities, amounts, receipts, and exact timestamps stay private.",
};

const PAGE_SIZE = 24;
const CONFIDENCE_BANDS = new Set([0, 25, 50, 75, 100]);

interface PublicOutcome {
  actionCategory: string;
  lifecycleStatus: string;
  confidenceBand: 0 | 25 | 50 | 75 | 100;
  completionFraction: number;
  payoutPercentage: number;
  date: string;
}

interface PublicOutcomePage {
  records: PublicOutcome[];
  hasNext: boolean;
}

interface EvidencePageProps {
  params: Promise<{ recordId?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(single(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function isCalendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseOutcome(value: unknown): PublicOutcome | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const actionCategory = String(row.actionCategory ?? "").trim();
  const lifecycleStatus = String(row.lifecycleStatus ?? "").trim();
  const confidenceBand = Number(row.confidenceBand);
  const completionFraction = Number(row.completionFraction);
  const payoutPercentage = Number(row.payoutPercentage);
  const date = String(row.date ?? "");

  if (
    !actionCategory ||
    !lifecycleStatus ||
    !CONFIDENCE_BANDS.has(confidenceBand) ||
    !Number.isFinite(completionFraction) ||
    completionFraction < 0 ||
    completionFraction > 1 ||
    !Number.isFinite(payoutPercentage) ||
    payoutPercentage < 0 ||
    payoutPercentage > 100 ||
    !isCalendarDate(date)
  ) {
    return null;
  }

  return {
    actionCategory,
    lifecycleStatus,
    confidenceBand: confidenceBand as PublicOutcome["confidenceBand"],
    completionFraction,
    payoutPercentage,
    date,
  };
}

async function listPublicOutcomes(page: number): Promise<{
  data: PublicOutcomePage;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_moral_trade_outcomes_v2" as never, {
    p_limit: PAGE_SIZE + 1,
    p_offset: (page - 1) * PAGE_SIZE,
  } as never);

  if (error) {
    return {
      data: { records: [], hasNext: false },
      error: "Verified outcomes could not be loaded.",
    };
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as unknown as Record<string, unknown>)
      : {};
  const rawRecords = Array.isArray(payload.records) ? payload.records : [];
  const records = rawRecords
    .map(parseOutcome)
    .filter((row): row is PublicOutcome => Boolean(row));

  return {
    data: {
      records: records.slice(0, PAGE_SIZE),
      hasNext: records.length > PAGE_SIZE,
    },
    error: null,
  };
}

function percentage(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function EvidencePage({ params, searchParams }: EvidencePageProps) {
  const [resolvedParams, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const page = pageNumber(resolvedSearchParams.page);
  const { data, error } = await listPublicOutcomes(page);
  const hasRetiredRecordLink = Boolean(resolvedParams.recordId?.length);
  const isAuthenticated = Boolean(viewer);

  return (
    <div className="page-shell marketplace-app-shell evidence-outcomes-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
          showSearch
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="outcomes-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Privacy-safe outcome ledger</p>
            <h1 id="outcomes-heading">Verified outcomes, without public evidence dossiers.</h1>
            <p>
              Each row contains only the approved public metadata. Original evidence, participant
              identities, private descriptions, amounts, currency, payment provider, receipts,
              links, files, and exact timestamps remain private.
            </p>
          </div>

          {hasRetiredRecordLink ? (
            <div className="status-banner">
              <strong>Individual public dossier links have been retired.</strong>
              <p>
                The outcome ledger no longer exposes record identifiers or source artifacts. This
                page shows the privacy-safe aggregate record instead.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="status-banner status-banner-error" role="alert">
              <strong>Outcome ledger unavailable</strong>
              <p>{error} Private evidence remains inaccessible.</p>
            </div>
          ) : null}

          {!error && !data.records.length ? (
            <div className="empty-state">
              <div>
                <strong>No finalized public outcomes yet.</strong>
                <p>
                  A row appears only after neutral review and any appeal window have produced a
                  final result.
                </p>
              </div>
            </div>
          ) : null}

          {data.records.length ? (
            <div className="data-grid">
              {data.records.map((outcome, index) => (
                <article
                  className="panel data-card"
                  key={`${outcome.date}:${outcome.actionCategory}:${index}`}
                >
                  <div className="panel-head">
                    <div>
                      <p className="detail-kicker">{label(outcome.lifecycleStatus)}</p>
                      <h2>{label(outcome.actionCategory)}</h2>
                    </div>
                    <span className="badge">{outcome.confidenceBand}% confidence</span>
                  </div>
                  <dl className="detail-grid">
                    <div>
                      <dt>Completion fraction</dt>
                      <dd>{percentage(outcome.completionFraction * 100)}</dd>
                    </div>
                    <div>
                      <dt>Payout percentage</dt>
                      <dd>{percentage(outcome.payoutPercentage)}</dd>
                    </div>
                    <div>
                      <dt>Calendar date</dt>
                      <dd>
                        <LocalDateTime dateOnly fallback={outcome.date} value={outcome.date} />
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : null}

          {data.records.length || page > 1 ? (
            <nav aria-label="Outcome pages" className="form-actions">
              {page > 1 ? (
                <Link
                  className="button button-secondary button-mini"
                  href={`/evidence?page=${page - 1}`}
                >
                  Previous
                </Link>
              ) : null}
              {data.hasNext ? (
                <Link
                  className="button button-secondary button-mini"
                  href={`/evidence?page=${page + 1}`}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>

        <section className="section section-subtle" aria-labelledby="public-fields-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Published fields</p>
            <h2 id="public-fields-heading">Exactly six fields leave the private workflow.</h2>
          </div>
          <div className="tag-row">
            <span className="source-pill">Action category</span>
            <span className="source-pill">Lifecycle status</span>
            <span className="source-pill">Confidence band</span>
            <span className="source-pill">Completion fraction</span>
            <span className="source-pill">Payout percentage</span>
            <span className="source-pill">Calendar date</span>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
