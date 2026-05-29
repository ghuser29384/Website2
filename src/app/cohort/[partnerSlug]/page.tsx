import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createNetworkInviteAction, createWebinarRsvpAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { FIRST_ACTIONS, PARTNER_COHORTS, getPartnerCohort } from "@/lib/growth";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface PartnerCohortPageProps {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return PARTNER_COHORTS.map((partner) => ({
    partnerSlug: partner.slug,
  }));
}

export async function generateMetadata({ params }: PartnerCohortPageProps): Promise<Metadata> {
  const { partnerSlug } = await params;
  const partner = getPartnerCohort(partnerSlug);

  if (!partner) {
    return {
      title: "Partner cohort not found",
    };
  }

  const canonical = `/cohort/${partner.slug}`;
  const title = `${partner.name} | Moral Trade`;
  const description = truncateDescription(
    `A Moral Trade partner page for ${partner.audience}: ${partner.useCase}.`,
    155,
  );

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: getAbsoluteUrl(canonical),
    },
  };
}

export default async function PartnerCohortPage({
  params,
  searchParams,
}: PartnerCohortPageProps) {
  const { partnerSlug } = await params;
  const partner = getPartnerCohort(partnerSlug);
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = await getViewer();

  if (!partner) {
    notFound();
  }

  const canonicalPath = `/cohort/${partner.slug}`;
  const signupHref = viewer
    ? "/onboarding"
    : `/signup?partner=${partner.slug}&returnTo=${encodeURIComponent("/onboarding")}`;

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

        <section className="cohort-hero partner-hero" aria-labelledby="partner-heading">
          <div className="cohort-hero-copy">
            <p className="eyebrow">Partner cohort</p>
            <h1 id="partner-heading">{partner.name}</h1>
            <p className="hero-text">
              A focused onboarding path for {partner.audience}. Start with one concrete action:
              {` ${partner.useCase}.`}
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={signupHref}>
                Join this cohort
              </Link>
              <a className="button button-secondary" href="#partner-rsvp">
                RSVP for demo
              </a>
            </div>
          </div>

          <aside className="panel cohort-demo-card">
            <IconMark name="example" />
            <h2>Activation focus</h2>
            <p>{partner.useCase}.</p>
            <div className="cohort-demo-meta">
              <span>{partner.primaryCause}</span>
              <span>Manual review first</span>
            </div>
          </aside>
        </section>

        <section className="section section-white cohort-start-section" aria-labelledby="partner-actions-heading">
          <div className="section-head section-head-compact">
            <h2 id="partner-actions-heading">Three useful first actions</h2>
            <p>
              These are built for cohort learning, not broad liquidity claims. Each one creates a
              reviewable artifact operators can follow up on.
            </p>
          </div>
          <div className="growth-start-grid">
            {FIRST_ACTIONS.slice(0, 3).map((action) => (
              <Link className="growth-path-card panel" href={action.href} key={action.value}>
                <IconMark name={action.value === "clone_example" ? "example" : action.value === "log_public_good_action" ? "fund" : "profile"} />
                <div>
                  <h3>{action.label}</h3>
                  <p>{action.href}</p>
                </div>
                <span className="inline-link">{action.actionLabel}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="cohort-grid partner-cohort-grid" aria-label="Partner cohort conversion tools">
          <article className="cohort-card panel">
            <h2>Demo RSVP</h2>
            <p>Register interest in a small-group walkthrough for this community.</p>
            <form action={createWebinarRsvpAction} className="compact-form" id="partner-rsvp">
              <input name="return_to" type="hidden" value={canonicalPath} />
              <input name="community" type="hidden" value={partner.name} />
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
                <span>Name</span>
                <input defaultValue={viewer?.displayName ?? ""} name="display_name" />
              </label>
              <label className="field">
                <span>Role</span>
                <input name="role" placeholder="Organizer, donor, researcher, builder" />
              </label>
              <button className="button button-primary" type="submit">
                Save RSVP
              </button>
            </form>
          </article>

          <article className="cohort-card panel">
            <h2>Invite one counterparty</h2>
            <p>Draft an invite tied to this cohort so operators can track activation.</p>
            <form action={createNetworkInviteAction} className="compact-form">
              <input name="return_to" type="hidden" value={canonicalPath} />
              <input name="target_kind" type="hidden" value="person" />
              <input name="desired_capability" type="hidden" value={partner.name} />
              <label className="field">
                <span>Their email or short label</span>
                <input name="target_label" placeholder="name@example.com" required />
              </label>
              <label className="field">
                <span>Why them?</span>
                <textarea name="reason" rows={3} placeholder={partner.useCase} />
              </label>
              <button className="button button-primary" type="submit">
                {viewer ? "Save invite draft" : "Sign in to save invite"}
              </button>
            </form>
          </article>

          <article className="cohort-card panel">
            <h2>Referral link</h2>
            <p>Use this URL when inviting members so partner attribution is captured.</p>
            <label className="field">
              <span>Partner URL</span>
              <input readOnly value={`https://moraltrade.org${canonicalPath}`} />
            </label>
            <div className="cohort-how-it-works">
              <strong>Tracked privately</strong>
              <p>UTM, partner, RSVP, onboarding, and invite events are stored for operators.</p>
            </div>
          </article>

          <article className="cohort-card panel">
            <h2>Boundaries</h2>
            <div className="cohort-safety-list">
              <div>
                <IconMark name="safety" />
                <span>
                  <strong>No public liquidity claim</strong>
                  <small>This page is a focused cohort funnel.</small>
                </span>
              </div>
              <div>
                <IconMark name="review" />
                <span>
                  <strong>Review before reliance</strong>
                  <small>Operators still manually review risky proposals.</small>
                </span>
              </div>
            </div>
          </article>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
