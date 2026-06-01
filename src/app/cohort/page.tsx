import type { Metadata } from "next";
import Link from "next/link";

import { createNetworkInviteAction, createWebinarRsvpAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getFormMessage } from "@/lib/form-state";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { CANONICAL_WORKED_CASE_COUNT } from "@/lib/seed-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Founding cohort",
  description: truncateDescription(
    "Join the Moral Trade founding cohort, invite one serious counterparty, and help test privacy-first pledge swaps, donation offsets, and shared public-good commitments.",
  ),
  alternates: {
    canonical: "/cohort",
  },
  openGraph: {
    title: "Moral Trade founding cohort",
    description:
      "A partner and referral page for communities testing voluntary moral trade with explicit terms, privacy-first matching, and manual review.",
    url: getAbsoluteUrl("/cohort"),
    type: "website",
  },
};

interface CohortPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatOptionalCount(value: number | null) {
  return value === null ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

const cohortStartPaths = [
  {
    title: "Browse worked examples",
    description:
      "Inspect pledge swaps, donation offsets, and public-good commitments before drafting anything public.",
    href: "/worked-examples",
    icon: "example",
    actionLabel: "Open worked examples",
  },
  {
    title: "Request a private intro",
    description:
      "Use broad previews and concierge review before exact wishes, identities, or contact details are shared.",
    href: "/background-networking#concierge-intake",
    icon: "profile",
    actionLabel: "Request concierge intro",
  },
  {
    title: "Start a public-good action",
    description:
      "Coordinate around thresholded commitments and external evidence without platform custody claims.",
    href: "/mpgf",
    icon: "fund",
    actionLabel: "Open public-good flow",
  },
] as const;

const activationTargets = [
  {
    label: "Activated account",
    value: "One first action",
    detail: "Clone an example, create a broad preview, log a public-good action, or send an invite.",
  },
  {
    label: "Public proof",
    value: "Reviewable artifact",
    detail: "A worked example clone, public preview, submitted offer, or external-evidence record.",
  },
  {
    label: "Referral loop",
    value: "One serious invite",
    detail: "Invite a counterparty, organizer, or donor who is plausibly open to voluntary cooperation.",
  },
] as const;

export default async function CohortPage({ searchParams }: CohortPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const [viewer, overview] = await Promise.all([getViewer(), getMarketplaceOverview()]);
  const signupHref = viewer ? "/onboarding" : "/signup?returnTo=/onboarding";

  return (
    <div className="page-shell page-shell-focused cohort-shell">
      <header className="simple-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="cohort-hero" aria-labelledby="cohort-heading">
          <div className="cohort-hero-copy">
            <p className="eyebrow">Community partner cohort</p>
            <h1 id="cohort-heading">Grow cooperative impact in your community</h1>
            <p className="hero-text">
              Equip members to cooperate across moral disagreement through clear terms, private
              matching, and shared public goods.
            </p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href="#demo-rsvp"
              >
                RSVP for live demo
              </a>
              <Link className="button button-secondary" href={signupHref}>
                Join cohort
              </Link>
            </div>
          </div>

          <aside className="cohort-demo-card panel" aria-label="Live demo">
            <h2>RSVP for live demo</h2>
            <div className="cohort-demo-row">
              <IconMark name="review" />
              <div>
                <strong>Upcoming sessions</strong>
                <p>Small-group walkthroughs for organizers and serious early users.</p>
              </div>
            </div>
            <div className="cohort-demo-meta">
              <span>Weekly by request</span>
              <span>45 min</span>
            </div>
            <form action={createWebinarRsvpAction} className="compact-form" id="demo-rsvp">
              <input name="return_to" type="hidden" value="/cohort" />
              <label className="field">
                <span>Email</span>
                <input
                  defaultValue={viewer?.profile.email ?? ""}
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </label>
              <label className="field">
                <span>Role or community</span>
                <input
                  name="role"
                  placeholder="Organizer, donor, researcher, builder"
                />
              </label>
              <input name="session_preference" type="hidden" value="next_available" />
              <button className="button button-primary" type="submit">
                RSVP now
              </button>
            </form>
          </aside>
        </section>

        <section className="section section-white cohort-start-section" aria-labelledby="cohort-start-heading">
          <div className="section-head section-head-compact">
            <h2 id="cohort-start-heading">Start with one concrete action</h2>
            <p>
              Cohort members do not need a full trade on day one. Pick one low-risk action that
              creates a useful signal without overstating marketplace liquidity.
            </p>
          </div>
          <div className="growth-start-grid">
            {cohortStartPaths.map((path) => (
              <Link className="growth-path-card panel" href={path.href} key={path.title}>
                <IconMark name={path.icon} />
                <div>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                </div>
                <span className="inline-link">{path.actionLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle cohort-target-section" aria-labelledby="cohort-target-heading">
          <div className="section-head section-head-compact">
            <h2 id="cohort-target-heading">What counts as progress</h2>
            <p>
              These are cohort operating metrics, not impact claims. They make early learning
              visible while the live marketplace is still intentionally narrow.
            </p>
          </div>
          <div className="cohort-target-grid">
            {activationTargets.map((target) => (
              <article className="panel cohort-target-card" key={target.label}>
                <span>{target.label}</span>
                <strong>{target.value}</strong>
                <p>{target.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cohort-grid" aria-label="Founding cohort tools">
          <article className="cohort-card panel">
            <h2>Invite one serious counterparty</h2>
            <p>Invite a potential counterparty to your first public commitment.</p>
            <form action={createNetworkInviteAction} className="compact-form">
              <input name="return_to" type="hidden" value="/cohort" />
              <input name="target_kind" type="hidden" value="person" />
              <input name="desired_capability" type="hidden" value="Serious counterparty" />
              <label className="field">
                <span>Their email or short label</span>
                <input name="target_label" placeholder="name@example.com" required />
              </label>
              <label className="field">
                <span>Personal note</span>
                <textarea
                  name="suggested_message"
                  placeholder="Why you are inviting them"
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Context</span>
                <input name="target_context" placeholder="Cause, community, or relationship" />
              </label>
              <button className="button button-primary" type="submit">
                {viewer ? "Save invite draft" : "Sign in to save invite"}
              </button>
            </form>
          </article>

          <article className="cohort-card panel">
            <h2>Your referral link</h2>
            <p>Share this link with your community.</p>
            <label className="field">
              <span>Referral URL</span>
              <input readOnly value="https://moraltrade.org/cohort" />
            </label>
            <div className="cohort-how-it-works">
              <strong>How it works</strong>
              <p>
                People who join with your link help grow the founding cohort. No public stats,
                scraping, or outreach happens without consent.
              </p>
            </div>
          </article>

          <article className="cohort-card cohort-progress-card panel">
            <h2>Founding progress</h2>
            <div className="cohort-progress-list">
              <div>
                <IconMark name="marketplace" />
                <span>Live proposals</span>
                <strong>{formatOptionalCount(overview.openOfferCount)}</strong>
              </div>
              <div>
                <IconMark name="example" />
                <span>Worked examples</span>
                <strong>{CANONICAL_WORKED_CASE_COUNT}</strong>
              </div>
              <div>
                <IconMark name="profile" />
                <span>Public profiles</span>
                <strong>{formatOptionalCount(overview.publicProfileCount)}</strong>
              </div>
            </div>
          </article>

          <article className="cohort-card panel">
            <h2>Safety and privacy</h2>
            <div className="cohort-safety-list">
              <div>
                <IconMark name="safety" />
                <span>
                  <strong>Privacy-first matching</strong>
                  <small>We minimize what we collect and share.</small>
                </span>
              </div>
              <div>
                <IconMark name="fund" />
                <span>
                  <strong>No escrow or custody claim</strong>
                  <small>We do not hold or transfer funds.</small>
                </span>
              </div>
              <div>
                <IconMark name="evidence" />
                <span>
                  <strong>Explicit terms and review</strong>
                  <small>Manual review before reliance.</small>
                </span>
              </div>
            </div>
          </article>
        </section>

        <p className="cohort-disclaimer">
          This is a founding cohort. Numbers reflect true progress, not commitments or capital.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
