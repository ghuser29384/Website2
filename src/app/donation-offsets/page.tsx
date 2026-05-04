import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getDonationOffsetOverview, getViewer } from "@/lib/app-data";
import {
  formatDonationOffsetPoolStatus,
  formatDonationOffsetRatio,
  formatDonationOffsetTimeHorizon,
  formatDonationOffsetUnmatchedRule,
  formatDonationOffsetVerificationMethod,
  getConsensusCharities,
  getSelectableRegisteredCharities,
} from "@/lib/donation-offsets";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const moralTradePaperUrl = "https://www.amirrorclear.net/files/moral-trade.pdf";
const forethoughtCompromiseUrl =
  "https://www.forethought.org/research/convergence-and-compromise";
const forethoughtPublicGoodsUrl =
  "https://www.forethought.org/research/moral-public-goods-are-a-big-deal-for-whether-we-get-a-good-future";

export const metadata: Metadata = {
  title: "Donation offsets",
  description:
    "Learn how donation offsets work on Moral Trade, how pools and assurance contracts are handled, and what trust, verification, moderation, and moral-public-goods safeguards apply.",
  alternates: {
    canonical: "/donation-offsets",
  },
  openGraph: {
    title: "Donation offsets",
    description:
      "Learn how donation offsets work on Moral Trade, how pools and assurance contracts are handled, and what trust, verification, moderation, and moral-public-goods safeguards apply.",
    url: getAbsoluteUrl("/donation-offsets"),
    type: "website",
  },
};

function formatUsdFromCents(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export default async function DonationOffsetsPage() {
  const viewer = await getViewer();
  const overview = hasSupabaseEnv() ? await getDonationOffsetOverview() : null;
  const charities = getSelectableRegisteredCharities();
  const consensusCharities = getConsensusCharities();

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Donation offsets</p>
            <h1>Redirect opposed giving toward a named compromise destination.</h1>
            <p className="hero-text">
              When donors would otherwise spend against one another, they can redirect the matched
              portion of those donations into a mutually valued charity instead of wasting resources
              in a zero-sum battle.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/offers/new" : "/signup"}>
                {viewer ? "Create a donation offset" : "Create an account"}
              </Link>
              <Link className="button button-secondary" href="/offers?mode=offset">
                Browse offset offers
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Core structure</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Matched redirection</strong>
                  <p>State what each side would otherwise have funded and what is to be redirected.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Named compromise destination</strong>
                  <p>Point the matched portion to one specific charity or fund, not a vague class of causes.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Rule for surplus</strong>
                  <p>Say where unmatched money goes before anyone relies on the arrangement.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">What a donation offset is</p>
            <h2>Stop opposed donations from cancelling out when a shared good is available</h2>
            <p>
              Toby Ord&apos;s basic point is practical: if two sides would otherwise fund opposed
              efforts, they can often do better, on their own views, by redirecting the matched
              portion into a compromise charity. Forethought&apos;s work on convergence and moral public
              goods adds a further lesson: compromise works especially well when the redirected
              destination is a broadly valued good that many different moral views can endorse.
            </p>
          </div>

          <div className="editorial-grid editorial-grid-wide">
            <article className="panel editorial-card">
              <h3>Rebecca and Christopher</h3>
              <p>
                Rebecca wants to donate to gun-rights advocacy. Christopher wants to donate to
                gun-control advocacy. If those donations mainly oppose one another, both can
                redirect the matched portion into a charity they each regard as worthwhile, such as
                a high-trust global poverty fund. That replaces cancelling-out spending with a
                mutually acknowledged good.
              </p>
              <p>
                <a className="inline-link" href={`${moralTradePaperUrl}#page=3`}>
                  See Ord&apos;s opposed-donation example
                </a>
                .
              </p>
            </article>

            <article className="panel editorial-card">
              <h3>Victoria and Paul</h3>
              <p>
                Victoria and Paul are not using an offset in the narrow sense; they are swapping
                different moral actions. But the example still shows the underlying logic: when one
                side cares much more about a given outcome than the other, moving another person&apos;s
                action can create more value for both than acting alone.
              </p>
              <p>
                <a className="inline-link" href={`${moralTradePaperUrl}#page=2`}>
                  See Ord&apos;s first vignette
                </a>
                .
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">What makes an offset valid</p>
            <h2>A serious offset should make three things explicit</h2>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Matched redirection</h3>
              <p>
                Name the baseline donation, the requested matching donation, and the ratio. This is
                the core move that distinguishes an offset from an ordinary gift.
              </p>
              <a className="inline-link" href={`${moralTradePaperUrl}#page=3`}>
                Related passage in Ord&apos;s paper
              </a>
            </article>

            <article className="panel concept-card">
              <h3>Named compromise destination</h3>
              <p>
                Choose one concrete destination both sides can recognize. The platform especially
                encourages compromise destinations that look like moral public goods: goods many
                different moral perspectives can affirm at once.
              </p>
              <a className="inline-link" href={forethoughtPublicGoodsUrl}>
                Forethought on moral public goods
              </a>
            </article>

            <article className="panel concept-card">
              <h3>Rule for unmatched surplus</h3>
              <p>
                If only part of the intended offset can be matched, say whether the remainder
                returns to donors, goes to the compromise destination, or goes back to the original
                cause.
              </p>
              <a className="inline-link" href={`${moralTradePaperUrl}#page=17`}>
                Practical implementation in Ord&apos;s paper
              </a>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Trust and safeguards</p>
            <h2>Offsets only work when the baseline intention is real and non-coercive</h2>
            <p>
              The two trust problems in Ord&apos;s paper matter directly here. Factual trust asks
              whether the claimed donation can be checked. Counterfactual trust asks whether the
              donor really would have made that donation absent the offset. Perverse incentives
              arise when people threaten harmful donations merely to extract a deal.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Factual trust</h3>
              <p>
                Participants should verify baseline intent through proof of past donations, escrow,
                or a third-party audit. On this platform, unverified offsets are paused for review
                rather than treated as trustworthy by default.
              </p>
            </article>

            <article className="panel editorial-card">
              <h3>Counterfactual trust</h3>
              <p>
                It is not enough to say, after the fact, that one would have donated to an opposed
                cause. The baseline must be credibly demonstrated. Offers that read like threats,
                extortion, or a bargaining chip built on deliberate harm are blocked.
              </p>
              <p>
                Moral Trade does not list offers where someone threatens to fund a harm cause solely
                to coerce others. That destroys value rather than creating a legitimate trade.
              </p>
            </article>

            <article className="panel editorial-card">
              <h3>Perverse incentives</h3>
              <p>
                Offsets should not reward performative threats. The moderation system flags offers
                whose baselines are unverifiable, whose destinations are legally prohibited, or
                whose descriptions suggest coercion.
              </p>
              <p>
                When compromise is possible, it is usually better to choose a destination that many
                moral views independently care about, especially widely shared public goods.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Pools and assurance contracts</p>
            <h2>Offsets do not have to be one-to-one</h2>
            <p>
              Moral Trade now supports pooled offsets: multiple donors on each side can join a
              larger pool, and the platform shows how much of the pool is currently matched. An
              assurance threshold lets donors commit on the condition that a minimum matching amount
              is reached by a deadline.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Pool mode</h3>
              <p>
                Choose a side, add a baseline donation, and join an existing pool or create a new
                one. The platform aggregates commitments and shows how much matched compromise
                funding exists so far.
              </p>
            </article>

            <article className="panel concept-card">
              <h3>Assurance threshold</h3>
              <p>
                Donors can say that redirection only goes forward if the pool reaches a minimum
                matched amount. Progress bars and deadlines make this legible to prospective
                participants.
              </p>
            </article>

            <article className="panel concept-card">
              <h3>Why public goods matter here</h3>
              <p>
                Forethought&apos;s work suggests that compromise is particularly promising when it
                channels resources toward goods widely valued across moral views, such as global
                health, anti-poverty, climate resilience, or other broad public goods.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Consensus destinations</p>
            <h2>Recommended moral-public-goods destinations</h2>
            <p>
              These registered charities are highlighted because they are the clearest current
              candidates for compromise destinations that many different views can value.
            </p>
          </div>

          <div className="data-grid">
            {consensusCharities.map((charity) => (
              <article className="panel data-card" key={charity.id}>
                <p className="detail-kicker">{charity.consensusLabel}</p>
                <h3>{charity.name}</h3>
                <p>{charity.summary}</p>
                <div className="offer-actions">
                  <a className="inline-link" href={charity.websiteUrl}>
                    Open charity
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Verification and fairness</p>
            <h2>Verification, ratios, and time horizons should be explicit</h2>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Verification methods</h3>
              <ul className="clean-list">
                <li>Proof of past donations</li>
                <li>Funds in escrow</li>
                <li>Third-party audit or attestation</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>One-off or recurring</h3>
              <p>
                Some offsets cover a single redirection. Others are ongoing. Recurring offsets need
                especially clear check-ins and stop rules.
              </p>
            </article>

            <article className="panel concept-card">
              <h3>Ratio and complexity</h3>
              <p>
                The platform supports non-1:1 ratios when donors think opposed charities differ in
                effectiveness, but it warns that those offers are harder to match and harder to
                explain cleanly.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Legal considerations</p>
            <h2>Political campaign contribution offsets are prohibited</h2>
            <p>
              Moral Trade blocks offsets involving political campaign contributions. Offsets are
              for redirection into legitimate compromise destinations, not for navigating campaign
              finance law or reproducing legally dubious donation swaps.
            </p>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Live marketplace picture</p>
            <h2>What donation offsets are doing on the platform now</h2>
            <p>
              These figures show redirected funds already recorded through direct offsets and the
              current scale of pooled commitments.
            </p>
          </div>

          {!hasSupabaseEnv() ? (
            <div className="status-banner status-banner-error">
              Supabase is not configured yet. Live offset statistics appear after the database is
              connected and the schema is applied.
            </div>
          ) : null}

          {overview ? (
            <>
              <div className="data-grid">
                <article className="panel data-card">
                  <p className="detail-kicker">Redirected so far</p>
                  <h3>{formatUsdFromCents(overview.totalRedirectedCents)}</h3>
                  <p>{overview.completedMatchCount} completed offset record(s).</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Moral public goods</p>
                  <h3>{formatUsdFromCents(overview.moralPublicGoodsRedirectedCents)}</h3>
                  <p>{overview.moralPublicGoodsMatchCount} completed offset(s) routed to broad public goods.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Active pooled commitments</p>
                  <h3>{formatUsdFromCents(overview.pooledCommitmentCents)}</h3>
                  <p>{overview.pools.length} active pool(s) currently visible.</p>
                </article>
              </div>

              <div className="editorial-grid editorial-grid-wide">
                <article className="panel editorial-card">
                  <h3>Top compromise destinations</h3>
                  {overview.topCompromiseDestinations.length ? (
                    <ul className="clean-list">
                      {overview.topCompromiseDestinations.map((entry) => (
                        <li key={entry.charity?.id ?? entry.totalRedirectedCents}>
                          <strong>{entry.charity?.name ?? "Unknown destination"}</strong>:{" "}
                          {formatUsdFromCents(entry.totalRedirectedCents)} across {entry.matchCount} offset(s)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No completed offset records have been logged yet.</p>
                  )}
                </article>

                <article className="panel editorial-card">
                  <h3>Available compromise destinations</h3>
                  <ul className="clean-list">
                    {charities.map((charity) => (
                      <li key={charity.id}>
                        <strong>{charity.name}</strong>: {charity.summary}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </>
          ) : null}
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Active pools</p>
            <h2>Pooled offsets currently gathering commitments</h2>
            <p>
              These pools aggregate donors across multiple participants on each side. The pool
              progress bars show the currently matched portion, not a claim that the underlying
              redirection has already been verified.
            </p>
          </div>

          <div className="data-grid">
            {overview?.pools.length ? (
              overview.pools.map((pool) => (
                <article className="panel data-card" key={pool.id}>
                  <p className="detail-kicker">{pool.compromiseCharity?.name ?? "Compromise destination"}</p>
                  <h3>{pool.name}</h3>
                  <p>
                    {pool.side_a_label} vs. {pool.side_b_label}
                  </p>
                  <div className="tag-row">
                    <span className="badge">{formatDonationOffsetRatio(pool.offset_ratio)}</span>
                    <span className="badge badge-secondary">
                      {formatDonationOffsetTimeHorizon(pool.time_horizon)}
                    </span>
                    <span className="badge badge-secondary">
                      {formatDonationOffsetVerificationMethod(pool.verification_method)}
                    </span>
                  </div>
                  <p>
                    {pool.commitmentCount} commitment(s) | matched so far{" "}
                    <strong>{formatUsdFromCents(pool.matchedCompromiseCents)}</strong>
                  </p>
                  <div className="offset-progress-track" aria-hidden="true">
                    <span
                      className="offset-progress-fill"
                      style={{ width: `${pool.progress.assuranceProgressPct}%` }}
                    />
                  </div>
                  <p>
                    Status: {formatDonationOffsetPoolStatus(pool.progress.status)} | Assurance target{" "}
                    {formatUsdFromCents(pool.assurance_minimum_cents)}
                  </p>
                  {pool.assurance_deadline_at ? (
                    <p>Deadline: {new Date(pool.assurance_deadline_at).toLocaleDateString()}</p>
                  ) : (
                    <p>No deadline has been set for this pool yet.</p>
                  )}
                  <p>{formatDonationOffsetUnmatchedRule(pool.unmatched_surplus_rule)}</p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No active pools yet.</strong>
                  <p>
                    Create the first pooled donation offset to let multiple donors on each side
                    converge on a shared compromise destination.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Further reading</p>
            <h2>The feature is grounded in a broader research picture</h2>
          </div>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Toby Ord, “Moral Trade”</h3>
              <p>
                The basic structure of offsetting opposed donations comes from Ord&apos;s argument that
                differences in moral views can make mutually beneficial trade possible.
              </p>
              <a className="inline-link" href={moralTradePaperUrl}>
                Open the paper
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Forethought on convergence and compromise</h3>
              <p>
                This work helps explain why compromise can sometimes approach outcomes many views
                regard as near-best when resources are divided well.
              </p>
              <a className="inline-link" href={forethoughtCompromiseUrl}>
                Open the article
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Forethought on moral public goods</h3>
              <p>
                These arguments motivate the platform&apos;s emphasis on broadly shared compromise
                destinations rather than thin, purely bilateral settlements.
              </p>
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
