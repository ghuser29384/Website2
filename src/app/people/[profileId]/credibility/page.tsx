import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CredibilityPassport } from "@/components/credibility/credibility-passport";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { formatPublicProfileLocation, getPublicProfileSummary, getViewer } from "@/lib/app-data";
import {
  CREDIBILITY_CATEGORIES,
  CREDIBILITY_ROLES,
  type CredibilityCategory,
  type CredibilityRole,
} from "@/lib/credibility";
import { getPublicCredibilitySummary } from "@/lib/credibility-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface ProfileCredibilityPageProps {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function roleFrom(value: string | undefined): CredibilityRole | undefined {
  return value && (CREDIBILITY_ROLES as readonly string[]).includes(value)
    ? (value as CredibilityRole)
    : undefined;
}

function categoryFrom(value: string | undefined): CredibilityCategory | undefined {
  return value && (CREDIBILITY_CATEGORIES as readonly string[]).includes(value)
    ? (value as CredibilityCategory)
    : undefined;
}

function label(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function contextHref(profileId: string, role?: CredibilityRole, category?: CredibilityCategory) {
  const params = new URLSearchParams();
  if (role) {
    params.set("role", role);
  }
  if (category) {
    params.set("category", category);
  }
  const query = params.toString();
  return `/people/${profileId}/credibility${query ? `?${query}` : ""}`;
}

export async function generateMetadata({ params }: ProfileCredibilityPageProps): Promise<Metadata> {
  const { profileId } = await params;
  const profile = await getPublicProfileSummary(profileId);

  return {
    title: profile ? `${profile.resolvedName} credibility` : "Profile credibility",
    description: profile
      ? truncateDescription(
          `Context-specific transaction reliability and evidence confidence for ${profile.resolvedName}.`,
        )
      : "Context-specific Moral Trade credibility profile.",
    alternates: {
      canonical: `/people/${profileId}/credibility`,
    },
    openGraph: {
      title: profile ? `${profile.resolvedName} credibility` : "Profile credibility",
      description:
        "Evidence-weighted transaction reliability, explicit uncertainty, and separate safety status.",
      url: getAbsoluteUrl(`/people/${profileId}/credibility`),
      type: "profile",
    },
  };
}

export default async function ProfileCredibilityPage({
  params,
  searchParams,
}: ProfileCredibilityPageProps) {
  const { profileId } = await params;
  const resolvedSearchParams = await searchParams;
  const role = roleFrom(first(resolvedSearchParams.role));
  const category = categoryFrom(first(resolvedSearchParams.category));
  const [viewer, profile, summary] = await Promise.all([
    getViewer(),
    getPublicProfileSummary(profileId),
    getPublicCredibilitySummary(profileId, { role, category }),
  ]);

  if (!profile) {
    notFound();
  }

  const location = formatPublicProfileLocation(profile);

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
            <p className="eyebrow">Credibility passport</p>
            <h1>{profile.resolvedName}</h1>
            <p className="hero-text">
              {location || "Location not listed"}. This record estimates transaction reliability,
              not moral worth. Select a role or trade class to discount unrelated history.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={`/people/${profile.id}`}>
                Return to public profile
              </Link>
              <Link className="button button-secondary" href="/credibility">
                Calculation method
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Selected context</p>
            <h2>{role ? label(role) : "All roles"}</h2>
            <p className="route-text">{category ? label(category) : "All trade classes"}</p>
            <div className="tag-row">
              <span className="source-pill">{summary.level}</span>
              <span className="source-pill">{summary.confidence} confidence</span>
              {summary.score !== null ? (
                <span className="impact-pill">{summary.score}/100 conservative</span>
              ) : null}
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Role filter</p>
            <h2>Choose the kind of obligation</h2>
          </div>
          <div className="sort-tabs">
            <Link
              className={`sort-tab ${!role ? "is-active" : ""}`}
              href={contextHref(profile.id, undefined, category)}
            >
              All roles
            </Link>
            {CREDIBILITY_ROLES.map((option) => (
              <Link
                className={`sort-tab ${role === option ? "is-active" : ""}`}
                href={contextHref(profile.id, option, category)}
                key={option}
              >
                {label(option)}
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Trade-class filter</p>
            <h2>Choose the relevant commitment class</h2>
          </div>
          <div className="sort-tabs">
            <Link
              className={`sort-tab ${!category ? "is-active" : ""}`}
              href={contextHref(profile.id, role)}
            >
              All classes
            </Link>
            {CREDIBILITY_CATEGORIES.map((option) => (
              <Link
                className={`sort-tab ${category === option ? "is-active" : ""}`}
                href={contextHref(profile.id, role, option)}
                key={option}
              >
                {label(option)}
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <CredibilityPassport summary={summary} heading={`${profile.resolvedName}'s reliability`} />
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Interpretation</p>
            <h2>Use this record to set safeguards</h2>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Do not infer moral agreement</h3>
              <p className="route-text">
                Reliable performance says nothing about whether a participant&apos;s cause or moral
                view is correct.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Do not infer additionality</h3>
              <p className="route-text">
                The no-trade baseline must still be registered and reviewed for each proposal.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Do vary protection</h3>
              <p className="route-text">
                Limited evidence calls for smaller pilots, stronger verification, milestones, or
                external assurance—not permanent exclusion.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
