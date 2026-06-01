import type { Metadata } from "next";
import Link from "next/link";

import { signUpAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getSafeInternalPath } from "@/lib/paths";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Join the founding cohort",
  description:
    "Create a Moral Trade account, then start with one low-risk action: clone an example, create a broad wish preview, or log a public-good action.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const firstActions = [
  {
    title: "Clone a worked example",
    description: "Adapt a past example to your context and invite one counterparty.",
    href: "/worked-examples",
    icon: "example",
  },
  {
    title: "Create broad wish preview",
    description: "Draft a broad wish or need and preview how it might be matched.",
    href: "/dashboard#wish-profile",
    icon: "source",
  },
  {
    title: "Log public-good action",
    description: "Record a public-good action you are taking or plan to take.",
    href: "/mpgf",
    icon: "fund",
  },
] as const;

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const requestedReturnTo = Array.isArray(resolvedSearchParams.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams.returnTo;
  const returnTo = getSafeInternalPath(requestedReturnTo, "/onboarding");
  const supabaseReady = hasSupabaseEnv();
  const viewer = await getViewer();

  return (
    <div className="page-shell signup-growth-shell">
      <header className="simple-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="signup-growth-grid" aria-labelledby="signup-heading">
          <article className="signup-account-card panel">
            <div className="section-head auth-head">
              <h1 id="signup-heading">Create your account</h1>
              <p>Join the founding cohort. Keep the first step minimal.</p>
            </div>

            {!supabaseReady ? (
              <div className="status-banner status-banner-error">
                Supabase is not configured yet. Add the required environment variables before
                using live auth.
              </div>
            ) : null}

            {formMessage ? (
              <div
                className={`status-banner ${
                  formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
                }`}
              >
                {formMessage.text}
              </div>
            ) : null}

            <form action={signUpAction} className="stack-form">
              <input name="return_to" type="hidden" value={returnTo} />

              <label className="field">
                <span>Display name</span>
                <input name="display_name" placeholder="Your display name" type="text" />
              </label>

              <label className="field">
                <span>Email</span>
                <input name="email" placeholder="you@example.com" type="email" />
              </label>

              <label className="field">
                <span>Password</span>
                <input name="password" placeholder="At least 12 characters" type="password" />
              </label>

              <details className="signup-optional-details">
                <summary>Optional location</summary>
                <p>Location is hidden publicly by default. You can leave these fields blank.</p>
                <div className="field-grid">
                  <label className="field">
                    <span>City</span>
                    <input name="city" placeholder="e.g. Boston" type="text" />
                  </label>

                  <label className="field">
                    <span>Region</span>
                    <input name="region" placeholder="e.g. Massachusetts" type="text" />
                  </label>
                </div>

                <label className="field">
                  <span>Country</span>
                  <input name="country" placeholder="e.g. United States" type="text" />
                </label>
              </details>

              <label className="check-row signup-terms-row">
                <input required name="terms_acknowledged" type="checkbox" />
                <span>
                  I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
                  <Link href="/privacy">Privacy Policy</Link>.
                </span>
              </label>

              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Create account
                </button>
              </div>
            </form>

            <p className="signup-data-note">
              We do not sell your data. Exact wishes stay private unless both sides opt in.
            </p>
          </article>

          <aside className="first-action-panel panel" aria-labelledby="first-action-heading">
            <div className="first-action-head">
              <div>
                <h2 id="first-action-heading">Start with one low-risk action</h2>
                <p>Choose a path to take your first step on Moral Trade.</p>
              </div>
              <div className="first-action-progress" aria-label="Step 1 of 3">
                <span>Step 1 of 3</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>

            <div className="first-action-list">
              {firstActions.map((action) => (
                <Link className="first-action-choice" href={action.href} key={action.title}>
                  <IconMark name={action.icon} />
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>
                  <span aria-hidden="true" className="choice-arrow">
                    -&gt;
                  </span>
                </Link>
              ))}
            </div>

            <p className="first-action-footnote">
              You can change this later. Nothing is public by default.
            </p>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
