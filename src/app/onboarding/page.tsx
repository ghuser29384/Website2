import type { Metadata } from "next";
import { cookies } from "next/headers";
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
import {
  buildWalkthroughOnboardingPath,
  getWalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
} from "@/lib/walkthrough-profile";

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
  const cookieStore = await cookies();
  const walkthroughDraft = getWalkthroughProfileDraft({
    cookieValue: cookieStore.get(WALKTHROUGH_PROFILE_COOKIE_NAME)?.value,
    searchParams: resolvedSearchParams,
  });
  const isWalkthroughProfile = Boolean(walkthroughDraft);
  const onboardingReturnTo = walkthroughDraft
    ? buildWalkthroughOnboardingPath(walkthroughDraft)
    : "/onboarding";
  const signupHref = `/signup?returnTo=${encodeURIComponent(onboardingReturnTo)}`;
  const loginHref = `/login?returnTo=${encodeURIComponent(onboardingReturnTo)}`;
  const defaultGoal = walkthroughDraft?.primaryGoal ?? actionFirstGoals[0]?.value;
  const defaultParticipantKind = walkthroughDraft?.participantKind ?? PARTICIPANT_KINDS[0]?.value;
  const defaultCauseAreas = new Set(
    walkthroughDraft ? [walkthroughDraft.causeArea] : COHORT_CAUSES.slice(0, 2),
  );
  const defaultFirstAction = walkthroughDraft?.firstAction ?? actionFirstActions[0]?.value;

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
            <p className="eyebrow">
              {isWalkthroughProfile ? "Starter profile" : "Network onboarding"}
            </p>
            <h1 id="onboarding-heading">
              {isWalkthroughProfile
                ? "Your walkthrough profile is ready to complete."
                : "Pick one role, one cause, and one first action."}
            </h1>
            <p className="hero-text">
              {isWalkthroughProfile
                ? "Moral Trade inferred a cause area, an offer type, and a first action from the walkthrough. Confirm the structured fields and add any missing context before saving."
                : "A useful account starts with a concrete next step rather than a vague profile. Your choices are saved so Moral Trade can route you directly to the action you selected."}
            </p>
          </div>

          <aside
            className="panel cohort-demo-card"
            data-testid={isWalkthroughProfile ? "walkthrough-profile-summary" : undefined}
          >
            <IconMark name="review" />
            <h2>{isWalkthroughProfile ? "Already added" : "What gets saved"}</h2>
            {walkthroughDraft ? (
              <div className="clean-stack">
                <p>
                  <strong>Cause:</strong> {walkthroughDraft.causeArea}
                </p>
                <p>
                  <strong>Offer:</strong> {walkthroughDraft.offerType}
                </p>
                <p>
                  <strong>Illustrative match:</strong> {walkthroughDraft.matchName}
                </p>
                <p>Nothing is public until you review and save the completed profile.</p>
              </div>
            ) : (
              <p>
                Role, cause areas, referral context, and your chosen first action. This step does not
                publish your identity, exact wishes, or contact details.
              </p>
            )}
          </aside>
        </section>

        <section className="section section-white" aria-labelledby="onboarding-form-heading">
          <div className="auth-grid onboarding-grid">
            {viewer ? (
              <article className="panel auth-card">
                <div className="section-head auth-head">
                  <p className="eyebrow">
                    {isWalkthroughProfile ? "Complete your starter profile" : "Activation wizard"}
                  </p>
                  <h2 id="onboarding-form-heading">
                    {isWalkthroughProfile ? "Review the missing details" : "Choose your starting point"}
                  </h2>
                  <p>
                    Signed in as <strong>{viewer.displayName}</strong>. Confirm the selections below,
                    then save the profile to your account.
                  </p>
                </div>

                <form action={saveOnboardingAction} className="compact-form onboarding-form">
                  <input name="return_to" type="hidden" value={onboardingReturnTo} />

                  <fieldset className="field onboarding-fieldset">
                    <legend>Primary goal</legend>
                    <div className="onboarding-choice-grid">
                      {actionFirstGoals.map((goal) => (
                        <label className="onboarding-choice panel" key={goal.value}>
                          <input
                            defaultChecked={goal.value === defaultGoal}
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
                      {PARTICIPANT_KINDS.map((kind) => (
                        <label className="onboarding-radio" key={kind.value}>
                          <input
                            defaultChecked={kind.value === defaultParticipantKind}
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
                      {COHORT_CAUSES.map((cause) => (
                        <label className="onboarding-radio" key={cause}>
                          <input
                            defaultChecked={defaultCauseAreas.has(cause)}
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
                      {actionFirstActions.map((action) => (
                        <label className="onboarding-choice panel" key={action.value}>
                          <input
                            defaultChecked={action.value === defaultFirstAction}
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
                      defaultValue={isWalkthroughProfile ? "Moral Trade walkthrough" : undefined}
                      name="referral_source"
                      placeholder="Optional: who invited you or where you heard about Moral Trade"
                    />
                  </label>

                  <button className="button button-primary" type="submit">
                    {isWalkthroughProfile ? "Save completed profile" : "Save and start"}
                  </button>
                </form>
              </article>
            ) : (
              <article className="panel auth-side-card auth-gate-card">
                <p className="eyebrow">
                  {isWalkthroughProfile ? "Starter profile created" : "Account required"}
                </p>
                <h2 id="onboarding-form-heading">
                  {isWalkthroughProfile
                    ? "Create an account, then complete the missing details."
                    : "Create an account to save onboarding."}
                </h2>
                <p>
                  {isWalkthroughProfile
                    ? "Your private draft already contains a cause area, offer type, and suggested first action. After account creation, confirm your role and add any optional collaborator or referral context."
                    : "The wizard is persisted to your account so referral context, role, and next action stay connected."}
                </p>
                <div className="hero-actions">
                  <Link className="button button-primary" href={signupHref}>
                    Create account and continue
                  </Link>
                  <Link className="button button-secondary" href={loginHref}>
                    Sign in
                  </Link>
                </div>
              </article>
            )}

            <article className="panel auth-side-card">
              <p className="eyebrow">
                {isWalkthroughProfile ? "Still missing" : "Why this exists"}
              </p>
              <div className="clean-stack">
                <div>
                  <h3>{isWalkthroughProfile ? "Account identity" : "It is persisted"}</h3>
                  <p>
                    {isWalkthroughProfile
                      ? "Create or sign in to an account so the draft can become a durable profile."
                      : "Your selections are stored as an onboarding record, not just held in browser state."}
                  </p>
                </div>
                <div>
                  <h3>{isWalkthroughProfile ? "Role confirmation" : "It is attributable"}</h3>
                  <p>
                    {isWalkthroughProfile
                      ? "Confirm whether you are participating as an individual, collective, institution, or organizer."
                      : "Referral and partner context remain connected to the account when provided."}
                  </p>
                </div>
                <div>
                  <h3>{isWalkthroughProfile ? "Optional context" : "It points to action"}</h3>
                  <p>
                    {isWalkthroughProfile
                      ? "Add a collaborator, community, or referral source only when it is useful."
                      : "Submitting routes you directly to the first action you selected."}
                  </p>
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
