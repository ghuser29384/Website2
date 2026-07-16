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

const actionFirstGoals = ONBOARDING_GOALS.filter((goal) => goal.value !== "browse_examples");
const actionFirstActions = FIRST_ACTIONS.filter((action) => action.value !== "clone_example");

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
            Account storage is unavailable. Contact support before continuing.
          </div>
        ) : null}

        <section className="cohort-hero onboarding-hero" aria-labelledby="onboarding-heading">
          <div className="cohort-hero-copy">
            <p className="eyebrow">Network onboarding</p>
            <h1 id="onboarding-heading">Pick one role, one cause, and one first action.</h1>
            <p className="hero-text">
              A useful account starts with a concrete next step rather than a vague profile. Your
              choices are saved so Moral Trade can route you directly to the action you selected.
            </p>
          </div>

          <aside className="panel cohort-demo-card">
            <IconMark name="review" />
            <h2>What gets saved</h2>
            <p>
              Role, cause areas, referral context, and your chosen first action. This step does not
              publish your identity, exact wishes, or contact details.
            </p>
          </aside>
        </section>

        <section className="section section-white" aria-labelledby="onboarding-form-heading">
          <div className="auth-grid onboarding-grid">
            {viewer ? (
              <article className="panel auth-card">
                <div className="section-head auth-head">
                  <p className="eyebrow">Activation wizard</p>
                  <h2 id="onboarding-form-heading">Choose your starting point</h2>
                  <p>
                    Signed in as <strong>{viewer.displayName}</strong>. Select the action you are
                    prepared to complete first.
                  </p>
                </div>

                <form action={saveOnboardingAction} className="compact-form onboarding-form">
                  <input name="return_to" type="hidden" value="/onboarding" />

                  <fieldset className="field onboarding-fieldset">
                    <legend>Primary goal</legend>
                    <div className="onboarding-choice-grid">
                      {actionFirstGoals.map((goal, index) => (
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
                    <legend>Your role</legend>
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
                      {actionFirstActions.map((action, index) => (
                        <label className="onboarding-choice panel" key={action.value}>
                          <input
                            defaultChecked={index === 0}
                            name="first_action"
                            type="radio"
                            value={action.value}
                          />
                          <span>
                            <strong>{action.label}</strong>
                            <small>{action.actionLabel}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="field">
                    <span>Counterparty, collaborator, or community</span>
                    <input
                      name="invite_target"
                      placeholder="Optional: one person, team, meetup, or partner group"
                    />
                  </label>

                  <label className="field">
                    <span>Referral source</span>
                    <input
                      name="referral_source"
                      placeholder="Optional: who invited you or where you heard about Moral Trade"
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
                  The wizard is persisted to your account so referral context, role, and next action
                  stay connected.
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
                  <p>Your selections are stored as an onboarding record, not just held in browser state.</p>
                </div>
                <div>
                  <h3>It is attributable</h3>
                  <p>Referral and partner context remain connected to the account when provided.</p>
                </div>
                <div>
                  <h3>It points to action</h3>
                  <p>Submitting routes you directly to the first action you selected.</p>
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
