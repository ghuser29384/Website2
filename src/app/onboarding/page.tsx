import type { Metadata } from "next";
import Link from "next/link";

import { saveOnboardingAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import {
  COHORT_CAUSES,
  FIRST_ACTIONS,
  ONBOARDING_GOALS,
  PARTICIPANT_KINDS,
} from "@/lib/growth";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: {
    index: false,
    follow: false,
  },
};

interface OnboardingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;

  return (
    <div className="page-shell page-shell-focused">
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

        {!supabaseReady ? (
          <div className="status-banner status-banner-error">
            Supabase is not configured yet. Add environment variables before saving onboarding.
          </div>
        ) : null}

        <section className="cohort-hero onboarding-hero" aria-labelledby="onboarding-heading">
          <div className="cohort-hero-copy">
            <p className="eyebrow">Founding cohort onboarding</p>
            <h1 id="onboarding-heading">Pick one role, one cause, and one first action.</h1>
            <p className="hero-text">
              This keeps the founding cohort focused on activation instead of a vague profile.
              The record is saved so the next page can point you at a concrete action.
            </p>
          </div>

          <aside className="panel cohort-demo-card">
            <IconMark name="review" />
            <h2>What gets saved</h2>
            <p>
              Role, cause areas, attribution, and your chosen first action. No public identity or
              exact wish is published from this step.
            </p>
          </aside>
        </section>

        <section className="section section-white" aria-labelledby="onboarding-form-heading">
          <div className="auth-grid onboarding-grid">
            {viewer ? (
              <article className="panel auth-card">
                <div className="section-head auth-head">
                  <p className="eyebrow">Activation wizard</p>
                  <h2 id="onboarding-form-heading">Save your cohort starting point</h2>
                  <p>
                    Signed in as <strong>{viewer.displayName}</strong>. Choose the path you are
                    willing to complete first.
                  </p>
                </div>

                <form action={saveOnboardingAction} className="compact-form onboarding-form">
                  <input name="return_to" type="hidden" value="/onboarding" />

                  <fieldset className="field onboarding-fieldset">
                    <legend>Primary goal</legend>
                    <div className="onboarding-choice-grid">
                      {ONBOARDING_GOALS.map((goal, index) => (
                        <label className="onboarding-choice panel" key={goal.value}>
                          <input
                            defaultChecked={index === 0}
                            name="primary_goal"
                            type="radio"
                            value={goal.value}
                          />
                          <span>
                            <strong>{goal.label}</strong>
                            <small>{goal.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="field onboarding-fieldset">
                    <legend>Role</legend>
                    <div className="onboarding-inline-grid">
                      {PARTICIPANT_KINDS.map((kind, index) => (
                        <label className="onboarding-radio" key={kind.value}>
                          <input
                            defaultChecked={index === 0}
                            name="participant_kind"
                            type="radio"
                            value={kind.value}
                          />
                          <span>{kind.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="field onboarding-fieldset">
                    <legend>Cause areas</legend>
                    <div className="onboarding-inline-grid">
                      {COHORT_CAUSES.map((cause, index) => (
                        <label className="onboarding-radio" key={cause}>
                          <input
                            defaultChecked={index < 2}
                            name="cause_area"
                            type="checkbox"
                            value={cause}
                          />
                          <span>{cause}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="field onboarding-fieldset">
                    <legend>First action</legend>
                    <div className="onboarding-choice-grid">
                      {FIRST_ACTIONS.map((action, index) => (
                        <label className="onboarding-choice panel" key={action.value}>
                          <input
                            defaultChecked={index === 0}
                            name="first_action"
                            type="radio"
                            value={action.value}
                          />
                          <span>
                            <strong>{action.label}</strong>
                            <small>{action.href}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="field">
                    <span>Invite target or community</span>
                    <input
                      name="invite_target"
                      placeholder="Optional: one person, list, meetup, or partner group"
                    />
                  </label>

                  <label className="field">
                    <span>Referral source</span>
                    <input
                      name="referral_source"
                      placeholder="Optional: who invited you or where you heard about this"
                    />
                  </label>

                  <button className="button button-primary" type="submit">
                    Save and start
                  </button>
                </form>
              </article>
            ) : (
              <article className="panel auth-side-card auth-gate-card">
                <p className="eyebrow">Account required</p>
                <h2>Create an account to save onboarding.</h2>
                <p>
                  The wizard is persisted to your account so attribution, cohort role, and next
                  action stay connected.
                </p>
                <div className="hero-actions">
                  <Link className="button button-primary" href="/signup?returnTo=/onboarding">
                    Create account
                  </Link>
                  <Link className="button button-secondary" href="/login?returnTo=/onboarding">
                    Sign in
                  </Link>
                </div>
              </article>
            )}

            <article className="panel auth-side-card">
              <p className="eyebrow">Why this exists</p>
              <div className="clean-stack">
                <div>
                  <h3>It is persisted</h3>
                  <p>Selections are saved to the cohort onboarding table, not just held in state.</p>
                </div>
                <div>
                  <h3>It is attributable</h3>
                  <p>UTM, referral, and partner context are tied to the account when present.</p>
                </div>
                <div>
                  <h3>It points to action</h3>
                  <p>The submit button redirects to the selected first-action route.</p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
