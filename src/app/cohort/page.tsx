import type { Metadata } from "next";
import Link from "next/link";

import { createNetworkInviteAction, createWebinarRsvpAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { resolvePublicMarketplaceOverview } from "@/lib/public-marketplace-overview";
import { getFormMessage } from "@/lib/form-state";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Join the network",
  description: truncateDescription(
    "Join the Moral Trade network, choose one concrete first action, and use reviewed workflows for financial contributions, bounded trades, private matching, and moral public goods.",
  ),
  alternates: {
    canonical: "/cohort",
  },
  openGraph: {
    title: "Join the Moral Trade network",
    description:
      "A direct onboarding route for people using Moral Trade to structure voluntary cooperation across moral disagreement.",
    url: getAbsoluteUrl("/cohort"),
    type: "website",
  },
};

interface NetworkPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatOptionalCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

const startPaths = [
  {
    key: "fund",
    title: "Make a financial contribution",
    description:
      "Choose a reviewed Every.org destination and complete payment with the provider without Moral Trade taking custody.",
    href: "/donate",
    icon: "payment",
    actionLabel: "Choose a funding route",
  },
  {
    key: "create",
    title: "Create a bounded trade",
    description:
      "State the baseline, commitments, maximum exposure, deadline, evidence, and exit rule for a real proposal.",
    href: "/create",
    icon: "swap",
    actionLabel: "Create a proposal",
  },
  {
    key: "matching",
    title: "Request a private introduction",
    description:
      "Share a broad preview first. Exact wishes, identities, and contact details remain consent-gated.",
    href: "/background-networking#concierge-intake",
    icon: "profile",
    actionLabel: "Request an introduction",
  },
] as const;

const activationTargets = [
  {
    label: "Account activated",
    value: "One concrete action",
    detail: "Create, fund, log, or request something that produces a reviewable record.",
  },
  {
    label: "Terms made legible",
    value: "One bounded artifact",
    detail: "A submitted offer, provider payment record, broad preview, or evidence-backed action.",
  },
  {
    label: "Network expanded",
    value: "One serious invitation",
    detail: "Invite a plausible counterparty, researcher, organizer, donor, or builder.",
  },
] as const;

export default async function NetworkPage({ searchParams }: NetworkPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const [viewer, overview] = await Promise.all([
    getViewer(),
    resolvePublicMarketplaceOverview(getMarketplaceOverview()),
  ]);
  const signupHref = viewer ? "/onboarding" : "/signup?returnTo=/onboarding";
  const createHref = viewer ? "/create" : "/signup?returnTo=/create";

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

        <section className="cohort-hero" aria-labelledby="network-heading">
          <div className="cohort-hero-copy">
            <p className="eyebrow">Moral Trade network</p>
            <h1 id="network-heading">Put one real disagreement into a usable structure.</h1>
            <p className="hero-text">
              Make a financial contribution, create a bounded trade, request a consent-gated
              introduction, or coordinate a shared public-good action. Start with one concrete record
              rather than a general expression of interest.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={signupHref}>
                {viewer ? "Continue onboarding" : "Create account"}
              </Link>
              <a className="button button-secondary" href="#working-session">
                Book a working session
              </a>
            </div>
          </div>

          <aside className="cohort-demo-card panel" aria-label="Working session">
            <h2>Book a working session</h2>
            <div className="cohort-demo-row">
              <IconMark name="review" />
              <div>
                <strong>Direct product onboarding</strong>
                <p>Bring a concrete use case. Leave with a drafted next action and explicit terms.</p>
              </div>
            </div>
            <div className="cohort-demo-meta">
              <span>Scheduled by request</span>
              <span>25 min</span>
            </div>
            <form action={createWebinarRsvpAction} className="compact-form" id="working-session">
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
                <input name="role" placeholder="Researcher, builder, donor, organizer" />
              </label>
              <input name="session_preference" type="hidden" value="next_available" />
              <button className="button button-primary" type="submit">
                Request a session
              </button>
            </form>
          </aside>
        </section>

        <section className="section section-white cohort-start-section" aria-labelledby="network-start-heading">
          <div className="section-head section-head-compact">
            <h2 id="network-start-heading">Choose one first action</h2>
            <p>
              The fastest route to a useful account is a single completed record. Each path below
              is bounded, reviewable, and reversible before reliance.
            </p>
          </div>
          <div className="growth-start-grid">
            {startPaths.map((path) => (
              <Link
                className="growth-path-card panel"
                href={path.key === "create" ? createHref : path.href}
                key={path.title}
              >
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

        <section className="section section-subtle cohort-target-section" aria-labelledby="network-target-heading">
          <div className="section-head section-head-compact">
            <h2 id="network-target-heading">What activation means</h2>
            <p>
              A registered email is not an active user. Activation requires a concrete action that
              another person can inspect, respond to, or build on.
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

        <section className="cohort-grid" aria-label="Network tools">
          <article className="cohort-card panel" id="invite">
            <h2>Invite one serious counterparty</h2>
            <p>Save a concrete invitation target and the reason this person is relevant.</p>
            <form action={createNetworkInviteAction} className="compact-form">
              <input name="return_to" type="hidden" value="/cohort" />
              <input name="target_kind" type="hidden" value="person" />
              <input name="desired_capability" type="hidden" value="Serious counterparty" />
              <label className="field">
                <span>Their email or short label</span>
                <input name="target_label" placeholder="name@example.com" required />
              </label>
              <label className="field">
                <span>Why this person</span>
                <textarea
                  name="suggested_message"
                  placeholder="The concrete use case or disagreement you want to explore"
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Context</span>
                <input name="target_context" placeholder="Cause area, community, or relationship" />
              </label>
              <button className="button button-primary" type="submit">
                {viewer ? "Save invitation" : "Sign in to save invitation"}
              </button>
            </form>
          </article>

          <article className="cohort-card panel">
            <h2>Network link</h2>
            <p>Share the direct onboarding route with a serious prospective participant.</p>
            <label className="field">
              <span>URL</span>
              <input readOnly value="https://moraltrade.org/cohort" />
            </label>
            <div className="cohort-how-it-works">
              <strong>Privacy rule</strong>
              <p>
                Joining the network does not publish a profile, exact wish, or contact detail.
                Disclosure remains controlled by the participant.
              </p>
            </div>
          </article>

          <article className="cohort-card cohort-progress-card panel">
            <h2>Network activity</h2>
            <div className="cohort-progress-list">
              <div>
                <IconMark name="payment" />
                <span>Financial route</span>
                <strong>Available</strong>
              </div>
              <div>
                <IconMark name="marketplace" />
                <span>Open proposals</span>
                <strong>{formatOptionalCount(overview.openOfferCount)}</strong>
              </div>
              <div>
                <IconMark name="profile" />
                <span>Public profiles</span>
                <strong>{formatOptionalCount(overview.publicProfileCount)}</strong>
              </div>
            </div>
          </article>

          <article className="cohort-card panel">
            <h2>Operating safeguards</h2>
            <div className="cohort-safety-list">
              <div>
                <IconMark name="safety" />
                <span>
                  <strong>Consent-gated disclosure</strong>
                  <small>Private fields are shared only after an explicit grant.</small>
                </span>
              </div>
              <div>
                <IconMark name="fund" />
                <span>
                  <strong>No platform custody</strong>
                  <small>Moral Trade does not hold participant funds or commitments.</small>
                </span>
              </div>
              <div>
                <IconMark name="evidence" />
                <span>
                  <strong>Reviewable terms and evidence</strong>
                  <small>Claims remain distinguishable from verified records.</small>
                </span>
              </div>
            </div>
          </article>
        </section>

        <p className="cohort-disclaimer">
          Activity metrics count backed records. Invitations, explanatory material, and stated
          intentions are not counted as completed agreements.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
