import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  combinedEffectiveLifeYears,
  formatPublicReceiptImpact,
  formatPublicReceiptMoney,
  getPublicDonationRedirectReceipt,
  type PublicDonationRedirectParty,
  type PublicDonationRedirectReceiptStatus,
} from "@/lib/payments/public-donation-redirect-receipt";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PublicReceiptPageProps {
  params: Promise<{ receiptId: string }>;
}

const statusContent: Record<
  PublicDonationRedirectReceiptStatus,
  { badge: string; heading: string; notice: string }
> = {
  completed: {
    badge: "Completed",
    heading: "Matched funds redirected into measurable gains.",
    notice: "This live Donation Redirect is recorded as transferred.",
  },
  disputed: {
    badge: "Disputed",
    heading: "This Donation Redirect is disputed.",
    notice:
      "A payment in this settlement is disputed. The frozen plan remains visible for traceability, but no current completed impact is claimed.",
  },
  reversed: {
    badge: "Reversed",
    heading: "This Donation Redirect was reversed.",
    notice:
      "The original settlement was later refunded or reversed. The frozen plan remains visible for traceability, but no current completed impact is claimed.",
  },
};

function statusClass(status: PublicDonationRedirectReceiptStatus) {
  if (status === "reversed") return styles.statusBadgeReversed;
  if (status === "disputed") return styles.statusBadgeDisputed;
  return "";
}

function noticeClass(status: PublicDonationRedirectReceiptStatus) {
  if (status === "reversed") return styles.statusNoticeReversed;
  if (status === "disputed") return styles.statusNoticeDisputed;
  return "";
}

function effectiveLifeYears(party: PublicDonationRedirectParty, claimIsCurrent: boolean) {
  const value = party.impact.effectiveLifeYears;
  if (value === null) return "Effective life-year estimate unavailable";
  const estimate = `≈${formatPublicReceiptImpact(value)} effective life-years saved`;
  return claimIsCurrent ? estimate : `Original frozen model: ${estimate}`;
}

function PartyCard({
  label,
  party,
  claimIsCurrent,
}: {
  claimIsCurrent: boolean;
  label: string;
  party: PublicDonationRedirectParty;
}) {
  return (
    <article className={styles.routeCard}>
      <div className={styles.routeTop}>
        <span className={styles.partyLabel}>{label}</span>
        <span className={styles.amount}>{formatPublicReceiptMoney(party.amountCents)}</span>
      </div>
      <h2>{party.charityName}</h2>
      <div className={styles.impact}>
        <strong>
          {party.impact.primaryOutput
            ? claimIsCurrent
              ? party.impact.primaryOutput
              : `Original frozen model: ${party.impact.primaryOutput}`
            : "Concrete outcome estimate unavailable"}
        </strong>
        <span>{effectiveLifeYears(party, claimIsCurrent)}</span>
      </div>
    </article>
  );
}

export async function generateMetadata({ params }: PublicReceiptPageProps): Promise<Metadata> {
  const { receiptId } = await params;
  const receipt = await getPublicDonationRedirectReceipt(receiptId);
  const path = `/redirects/${encodeURIComponent(receiptId)}`;

  if (!receipt) {
    return {
      title: "Donation Redirect receipt unavailable",
      robots: { index: false, follow: false },
    };
  }

  const status = statusContent[receipt.status];
  const title = `Donation Redirect ${status.badge.toLowerCase()}`;
  const description =
    receipt.status === "completed"
      ? `${formatPublicReceiptMoney(receipt.totalAmountCents)} was redirected across two independently selected charities.`
      : status.notice;

  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: `Moral Trade Donation Redirect — ${status.badge}`,
          height: 630,
          url: getAbsoluteUrl(`${path}/opengraph-image`),
          width: 1200,
        },
      ],
      siteName: "Moral Trade",
      title,
      type: "website",
      url: getAbsoluteUrl(path),
    },
    referrer: "no-referrer",
    robots: {
      follow: true,
      googleBot: { follow: true, index: false },
      index: false,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [getAbsoluteUrl(`${path}/opengraph-image`)],
      title,
    },
  };
}

export default async function PublicDonationRedirectReceiptPage({
  params,
}: PublicReceiptPageProps) {
  const { receiptId } = await params;
  const receipt = await getPublicDonationRedirectReceipt(receiptId);
  if (!receipt) notFound();

  const status = statusContent[receipt.status];
  const combined = combinedEffectiveLifeYears(receipt);
  const combinedIsCurrent = receipt.status === "completed";

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(false)}
        {...getTopbarActions(false)}
        showSearch={false}
      />
      <main className={styles.page} data-mt-surface="public-receipt" id="main-content" tabIndex={-1}>
        <article className={styles.receipt}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Moral Trade · Public Donation Redirect receipt</p>
              <h1>{status.heading}</h1>
              <p className={styles.heroCopy}>
                {receipt.status === "completed"
                  ? `${formatPublicReceiptMoney(receipt.totalAmountCents)} moved to two independently selected charitable destinations.`
                  : "The destinations and estimates below are the frozen record from the original settlement."}
              </p>
            </div>
            <span
              className={[styles.statusBadge, statusClass(receipt.status)]
                .filter(Boolean)
                .join(" ")}
            >
              {status.badge}
            </span>
          </header>

          <p
            className={[styles.statusNotice, noticeClass(receipt.status)]
              .filter(Boolean)
              .join(" ")}
            role="status"
          >
            {status.notice}
          </p>

          <div className={styles.body}>
            <div className={styles.routes}>
              <PartyCard
                claimIsCurrent={combinedIsCurrent}
                label="Party A"
                party={receipt.owner}
              />
              <PartyCard
                claimIsCurrent={combinedIsCurrent}
                label="Party B"
                party={receipt.counterparty}
              />
            </div>

            <section className={styles.combined} aria-label="Combined modeled impact">
              <div>
                <p className={styles.eyebrow}>
                  {combined === null
                    ? "Together · separate outcome models"
                    : combinedIsCurrent
                      ? "Combined modeled impact"
                      : "Original frozen combined model · not current impact"}
                </p>
                {combined === null ? (
                  <>
                    <h2>Impacts shown separately</h2>
                    <p>
                      The two estimates are not added because their comparable outcome definition
                      or model version is unavailable or different.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>≈+{formatPublicReceiptImpact(combined)} effective life-years saved</h2>
                    <p>
                      Counted once because both frozen estimates share the same effective-life-year
                      definition and compatible model version. Modeled estimates are not guarantees.
                    </p>
                  </>
                )}
              </div>
              <span className={styles.totalAmount}>
                {formatPublicReceiptMoney(receipt.totalAmountCents)} total
              </span>
            </section>

            <div className={styles.privacy}>
              <p>
                Privacy-safe public projection: participant identities, original destinations,
                payment identifiers, evidence, internal record IDs, and condition hashes are not
                included. Outcome estimates come from the frozen model attached to the completed
                settlement and are not guarantees or tax receipts.
              </p>
              <p className={styles.date}>
                Record date <LocalDateTime dateOnly fallback="Date unavailable" value={receipt.completedAtIso} />
                <br />
                <Link href="/donation-offsets">How Donation Redirect works</Link>
              </p>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
