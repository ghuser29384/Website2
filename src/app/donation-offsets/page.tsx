import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { MetricCard, PageHero, SectionHeader, StepCard } from "@/components/ui/page-primitives";
import { getDonationOffsetOverview, getViewer } from "@/lib/app-data";
import { getConsensusCharities } from "@/lib/donation-offsets";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const moralTradePaperUrl = "https://www.amirrorclear.net/files/moral-trade.pdf";
const forethoughtCompromiseUrl =
  "https://www.forethought.org/research/convergence-and-compromise";
const forethoughtPublicGoodsUrl =
  "https://www.forethought.org/research/moral-public-goods-are-a-big-deal-for-whether-we-get-a-good-future";

export const metadata: Metadata = {
  title: "Donation offsets",
  description:
    "Redirect opposed donations into a shared good with explicit baseline, destination, evidence, surplus, and expiry rules.",
  alternates: {
    canonical: "/donation-offsets",
  },
  openGraph: {
    title: "Donation offsets",
    description:
      "Redirect opposed donations into a shared good with explicit baseline, destination, evidence, surplus, and expiry rules.",
    url: getAbsoluteUrl("/donation-offsets"),
    type: "website",
  },
};

const checklistItems = [
  "Baseline intention",
  "Match ratio",
  "Destination",
  "Surplus rule",
  "Evidence method",
  "Expiry",
  "Anti-threat certification",
] as const;

function formatUsdFromCents(amountCents: number | null | undefined) {
  if (amountCents === null || amountCents === undefined) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export default async function DonationOffsetsPage() {
  const viewer = await getViewer();
  const overview = hasSupabaseEnv() ? await getDonationOffsetOverview() : null;
  const consensusCharities = getConsensusCharities();
  const createOffsetHref = viewer
    ? "/offers/new?mode=offset"
    : "/signup?returnTo=/offers/new%3Fmode%3Doffset";

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <PageHero
          eyebrow="Donation offsets"
          title="Redirect opposed donations into shared good."
          description="When two donors would otherwise fund opposing efforts, they can redirect matched funds to a mutually acceptable destination."
          actions={
            <>
              <Link className="button button-primary" href="/offers?mode=offset">
                Browse offset offers
              </Link>
              <Link className="button button-secondary" href={createOffsetHref}>
                Create offset
              </Link>
            </>
          }
        >
          <aside className="hero-panel panel">
            <p className="eyebrow">Legal posture</p>
            <h2>No custody / no escrow / no tax advice</h2>
            <p>
              Offset records use external-payment evidence and reviewer notes. The platform does
              not hold money or certify tax treatment.
            </p>
          </aside>
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="offset-steps-heading">
          <SectionHeader eyebrow="Offset flow" id="offset-steps-heading" title="Three steps make an offset reviewable." />
          <div className="step-card-grid">
            <StepCard index={1} title="State the baseline donations.">
              Say what each side would otherwise fund, and why that baseline is credible.
            </StepCard>
            <StepCard index={2} title="Choose a compromise destination.">
              Pick one named charity or fund both sides can regard as a shared good.
            </StepCard>
            <StepCard index={3} title="Set rules before reliance.">
              Record match, surplus, evidence, expiry, and anti-threat certification.
            </StepCard>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="valid-offset-heading">
          <SectionHeader eyebrow="Valid offset checklist" id="valid-offset-heading" title="A public offset should expose every core term." />
          <div className="checklist-card-grid">
            {checklistItems.map((item) => (
              <article className="panel checklist-card" key={item}>
                <span aria-hidden="true">OK</span>
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-trust-heading">
          <SectionHeader eyebrow="Trust block" id="offset-trust-heading" title="Offsets fail if the baseline is fake or coercive." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Factual trust</h3>
              <p>Receipts, prior giving records, or third-party attestations can support review.</p>
            </article>
            <article className="panel concept-card">
              <h3>Counterfactual trust</h3>
              <p>The donor must credibly show they would have made the opposed donation anyway.</p>
            </article>
            <article className="panel concept-card">
              <h3>Perverse-incentive screening</h3>
              <p>Threat-like baselines, coercive copy, and prohibited destinations are blocked.</p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="destination-heading">
          <SectionHeader eyebrow="Destinations" id="destination-heading" title="Available compromise destinations." />
          <div className="data-grid">
            {consensusCharities.map((charity) => (
              <article className="panel data-card" key={charity.id}>
                <p className="detail-kicker">{charity.consensusLabel}</p>
                <h3>{charity.name}</h3>
                <p>{charity.summary}</p>
                <a className="inline-link" href={charity.websiteUrl}>
                  Open destination
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-snapshot-heading">
          <SectionHeader eyebrow="Marketplace snapshot" id="offset-snapshot-heading" title="Current offset activity." />
          {!hasSupabaseEnv() ? (
            <div className="status-banner status-banner-error">
              Live offset statistics appear after the database is configured.
            </div>
          ) : null}
          <div className="pilot-metric-grid">
            <MetricCard
              label="Redirected so far"
              value={formatUsdFromCents(overview?.totalRedirectedCents)}
              detail="Reviewed direct offset records only."
            />
            <MetricCard
              label="Public-good routed amount"
              value={formatUsdFromCents(overview?.moralPublicGoodsRedirectedCents)}
              detail="Completed offsets routed to broad public goods."
            />
            <MetricCard
              label="Active pooled commitments"
              value={formatUsdFromCents(overview?.pooledCommitmentCents)}
              detail="Committed pool amount, not verified redirection."
            />
            <MetricCard
              label="Active pools"
              value={overview ? String(overview.pools.length) : "Unavailable"}
              detail="Pools gathering commitments before verification."
            />
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="legal-offset-heading">
          <SectionHeader eyebrow="Safeguards" id="legal-offset-heading" title="Political campaign contribution offsets are prohibited." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>No campaign offsets</h3>
              <p>Offsets are not for campaign finance workarounds or candidate contributions.</p>
            </article>
            <article className="panel concept-card">
              <h3>External evidence only</h3>
              <p>Receipts are evidence for review, not platform custody or legal escrow.</p>
            </article>
            <article className="panel concept-card">
              <h3>Manual review for risk</h3>
              <p>Unverifiable baselines and coercive proposals remain paused or blocked.</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="offset-reading-heading">
          <SectionHeader eyebrow="Further reading" id="offset-reading-heading" title="Research sources for the offset structure." />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Toby Ord, &quot;Moral Trade&quot;</h3>
              <p>Ord&apos;s examples motivate opposed-donation redirection and reciprocal moral trade.</p>
              <a className="inline-link" href={moralTradePaperUrl}>
                Open the paper
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Forethought on convergence</h3>
              <p>Compromise can work when different views value overlapping outcomes.</p>
              <a className="inline-link" href={forethoughtCompromiseUrl}>
                Open the article
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Forethought on public goods</h3>
              <p>Shared goods can make compromise more robust than thin bilateral settlements.</p>
              <a className="inline-link" href={forethoughtPublicGoodsUrl}>
                Open the article
              </a>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
