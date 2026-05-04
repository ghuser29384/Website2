import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getSelectableRegisteredCharities } from "@/lib/donation-offsets";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl } from "@/lib/seo";

const moralTradePaperUrl = "https://www.amirrorclear.net/files/moral-trade.pdf";
const ordLinks = {
  introduction: `${moralTradePaperUrl}#page=2`,
  varieties: `${moralTradePaperUrl}#page=5`,
  trust: `${moralTradePaperUrl}#page=15`,
  practical: `${moralTradePaperUrl}#page=17`,
};

export const metadata: Metadata = {
  title: "Donation offsets",
  description:
    "Learn how donation offsets work on Moral Trade, what makes an offset valid, and what trust, verification, and legal safeguards apply.",
  alternates: {
    canonical: "/donation-offsets",
  },
  openGraph: {
    title: "Donation offsets",
    description:
      "Learn how donation offsets work on Moral Trade, what makes an offset valid, and what trust, verification, and legal safeguards apply.",
    url: getAbsoluteUrl("/donation-offsets"),
    type: "website",
  },
};

export default async function DonationOffsetsPage() {
  const viewer = await getViewer();
  const charities = getSelectableRegisteredCharities();

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
            <h1>Redirect opposed giving toward a named compromise charity.</h1>
            <p className="hero-text">
              When two or more donors intend to give to opposed causes, they can redirect the
              matched portion of their donations to a compromise charity, eliminating zero-sum
              spending.
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
            <p className="eyebrow">The premise</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Two opposed donations cancel</strong>
                  <p>If each side funds an opposed effort, the net result may be mostly zero-sum.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Match the redirect</strong>
                  <p>Each side redirects the matched portion to a compromise destination instead.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>State the fallback rule</strong>
                  <p>Any unmatched surplus should already have a named rule before anyone agrees.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">What this means</p>
            <h2>A donation offset is a way of stopping opposed efforts from washing each other out</h2>
            <p>
              If two people expect to spend against one another, both can often do better, on
              their own views, by redirecting the matched portion to a compromise charity. That is
              the basic structure Rebecca and Christopher use in Toby Ord&apos;s gun-rights and
              gun-control example. Victoria and Paul illustrate the nearby idea that one side can
              trade money for a moral action that matters far more to it than to the other side.
            </p>
          </div>

          <div className="editorial-grid editorial-grid-wide">
            <article className="panel editorial-card">
              <h3>Rebecca and Christopher</h3>
              <p>
                Rebecca plans to fund gun-rights advocacy. Christopher plans to fund gun-control
                advocacy. If those donations mainly oppose one another, both can instead redirect
                the matched portion to a compromise charity such as an effective global poverty fund.
              </p>
              <p>
                Ord uses this structure to show that offsetting opposed donations can leave each side
                closer to its own view than a simple zero-sum fight would.{" "}
                <a className="inline-link" href={ordLinks.introduction}>
                  See the Rebecca and Christopher vignette
                </a>
                .
              </p>
            </article>

            <article className="panel editorial-card">
              <h3>Victoria and Paul</h3>
              <p>
                Victoria cares far more about animal welfare. Paul cares far more about global
                poverty. Their original vignette is a pledge swap rather than a donation offset,
                but it helps explain why redirection can work: one side can buy far more of what it
                morally values by moving another person&apos;s action than by acting alone.
              </p>
              <p>
                That same logic is what makes offsets credible when opposed donations would mostly
                cancel out.{" "}
                <a className="inline-link" href={ordLinks.introduction}>
                  See the Victoria and Paul vignette
                </a>
                .
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Valid offset</p>
            <h2>Three elements every valid offset should state up front</h2>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Matched redirection</h3>
              <p>
                State the baseline donation, the requested matching donation, and the ratio. This is
                the core offset structure: the matched portion is redirected away from opposed causes
                and into a compromise destination.
              </p>
              <a className="inline-link" href={ordLinks.practical}>
                See the practical cases in Ord&apos;s paper
              </a>
            </article>

            <article className="panel concept-card">
              <h3>Named compromise destination</h3>
              <p>
                Both sides need one specific charity or fund they can recognise as the redirected
                endpoint. A vague promise to &ldquo;donate somewhere good&rdquo; is not enough.
              </p>
              <a className="inline-link" href={ordLinks.varieties}>
                See the varieties of moral trade
              </a>
            </article>

            <article className="panel concept-card">
              <h3>Rule for unmatched surplus</h3>
              <p>
                If only part of the intended offset is matched, the surplus has to go somewhere by an
                agreed rule: back to the donors, onward to the compromise destination, or split evenly.
              </p>
              <a className="inline-link" href={ordLinks.practical}>
                See how Ord discusses incomplete matching and practical implementation
              </a>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Trust and safeguards</p>
            <h2>Offsets need both factual trust and counterfactual trust</h2>
            <p>
              Ord&apos;s trust section is not a side issue. Donation offsets only work when each side can
              tell that the baseline intention was real and that the trade is not just a disguised threat.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Factual trust</h3>
              <p>
                Participants should show that the baseline donation and the redirected donation can be
                checked. Acceptable methods include receipts, previous donation records, escrow
                confirmation, or a third-party audit.
              </p>
              <p>
                That is why Moral Trade asks offset offers to name a verification method and, where
                possible, provide a link to evidence.
              </p>
            </article>

            <article className="panel editorial-card">
              <h3>Counterfactual trust</h3>
              <p>
                The offer must describe a real trade-dependent intention, not a threat. Ord writes that{" "}
                <q>Counterfactual trust appears to be a big problem for realising the full gains from moral trade.</q>{" "}
                <a className="inline-link" href={ordLinks.trust}>
                  See the Trust section
                </a>
                .
              </p>
              <p>
                This platform will not list offers where someone threatens to fund a harm cause solely
                to coerce others. Threat-based offers are value-destroying, not legitimate trade.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Verification and fairness</p>
            <h2>Show how the offset will be checked, and over what horizon</h2>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Acceptable verification methods</h3>
              <ul className="clean-list">
                <li>Receipts uploaded or linked</li>
                <li>Funds placed in escrow</li>
                <li>Third-party audit or attestation</li>
              </ul>
            </article>

            <article className="panel concept-card">
              <h3>One-off or recurring</h3>
              <p>
                Some offsets are single donations. Others are monthly or annual patterns. The time
                horizon should be explicit so both sides know what is being matched.
              </p>
            </article>

            <article className="panel concept-card">
              <h3>Offset ratio</h3>
              <p>
                If one side believes the opposed charities differ in effectiveness, it can ask for a
                ratio other than 1:1. The site supports that, but simple 1:1 offsets are easier to
                understand and easier to match.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Legal considerations</p>
            <h2>Political campaign contribution offsets are prohibited here</h2>
            <p>
              Ord notes that donation-swapping involving election contributions can raise unresolved
              legal questions. Moral Trade therefore does not allow offsets involving political campaign
              contributions or other clearly prohibited destinations.{" "}
              <a className="inline-link" href={ordLinks.practical}>
                See Ord&apos;s practical cases discussion
              </a>
              .
            </p>
          </div>

          <div className="panel editorial-card">
            <h3>Registered compromise destinations on Moral Trade</h3>
            <ul className="clean-list">
              {charities.map((charity) => (
                <li key={charity.id}>
                  <strong>{charity.name}</strong>: {charity.summary}{" "}
                  <a className="inline-link" href={charity.websiteUrl}>
                    Visit site
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
