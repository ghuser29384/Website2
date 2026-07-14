import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Every.org Donation Pending",
  description: "Pending state for Every.org fast-route MPGF donations before partner webhook import and review.",
  alternates: {
    canonical: "/mpgf/contribute/every-org/pending",
  },
  openGraph: {
    title: "MPGF Every.org Donation Pending",
    description: "Pending state for Every.org fast-route MPGF donations before partner webhook import and review.",
    url: getAbsoluteUrl("/mpgf/contribute/every-org/pending"),
    type: "website",
  },
};

interface MpgfEveryOrgPendingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const everyOrgReviewStates = [
  {
    label: "Redirect returned",
    state: "pending_webhook_not_counted",
    detail: "Moral Trade records only that the donor came back from Every.org.",
  },
  {
    label: "Partner webhook imported",
    state: "provider_event_received",
    detail: "A signed partner webhook is deduped by hashed charge id and stored as provider evidence.",
  },
  {
    label: "Contribution evidence created",
    state: "pending_review",
    detail: "Webhook evidence creates a payment-proof record that remains under MPGF review.",
  },
  {
    label: "Counted for matching",
    state: "counted_after_review",
    detail: "Only approved evidence can affect verified supporters, thresholds, base match, or QF bonus.",
  },
];

export default async function MpgfEveryOrgPendingPage({ searchParams }: MpgfEveryOrgPendingPageProps) {
  const [viewer, realMoneyReadiness, resolvedSearchParams] = await Promise.all([
    getViewer(),
    loadMpgfRealMoneyReadiness(),
    searchParams,
  ]);
  const partnerDonationId = readParam(resolvedSearchParams, "partnerDonationId");

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/account/contributions">View contribution state</Link>}
      description="Every.org returned you to Moral Trade. This is a pending state until the partner webhook is imported and reviewed."
      title="Every.org donation pending verification."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <h2>Webhook import required before counting</h2>
        <p>
          The donation is not counted, matched, or treated as verified from redirect alone.
          MPGF waits for the Every.org partner webhook, dedupes it by charge hash, and keeps
          the evidence pending review before it can affect supporter or funding totals.
        </p>
        {partnerDonationId ? (
          <p>
            Partner donation reference: <code>{partnerDonationId}</code>
          </p>
        ) : null}
        <p>
          If the webhook cannot be matched automatically, the manual evidence fallback remains
          available without authorizing payout or changing allocation state.
        </p>
        <div className="mpgf-table" aria-label="Every.org review-state progression">
          <div className="mpgf-table-row mpgf-table-head">
            <span>Step</span>
            <span>State</span>
            <span>Counting boundary</span>
          </div>
          {everyOrgReviewStates.map((row) => (
            <div className="mpgf-table-row" key={row.state}>
              <span>{row.label}</span>
              <code>{row.state}</code>
              <span>{row.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </MpgfPageFrame>
  );
}
