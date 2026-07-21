import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { saveProfilePrioritySearchAction } from "@/app/profile/priorities/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { COHORT_CAUSES } from "@/lib/growth";
import { getSafeInternalPath } from "@/lib/paths";
import {
  NOW_PROFILE_PRIORITY_SEARCH_LABEL,
  normalizeNowProfilePriorityCauses,
} from "@/lib/profile-priority-search";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profile priorities",
  robots: {
    follow: false,
    index: false,
  },
};

interface ProfilePrioritiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePrioritiesPage({
  searchParams,
}: ProfilePrioritiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const returnTo = getSafeInternalPath(
    firstParam(resolvedSearchParams.returnTo),
    "/moral-trade-live.html#now",
  );
  const pagePath = `/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`;
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;

  if (!viewer) {
    redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`);
  }

  const supabase = await createClient();
  const [savedSearchResult, onboardingResult] = await Promise.all([
    supabase
      .from("saved_searches")
      .select("causes")
      .eq("profile_id", viewer.authUser.id)
      .eq("label", NOW_PROFILE_PRIORITY_SEARCH_LABEL)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from("cohort_onboarding_profiles")
      .select("cause_areas")
      .eq("profile_id", viewer.authUser.id)
      .maybeSingle(),
  ]);
  const savedCauses = normalizeNowProfilePriorityCauses(savedSearchResult.data?.causes ?? []);
  const onboardingCauses = normalizeNowProfilePriorityCauses(
    onboardingResult.data?.cause_areas ?? [],
  );
  const selectedCauses = new Set(savedCauses.length ? savedCauses : onboardingCauses);

  return (
    <div className="page-shell page-shell-focused">
      <header className="simple-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
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

        {savedSearchResult.error ? (
          <div className="status-banner status-banner-error">
            Existing priorities could not be loaded. You can still replace them below.
          </div>
        ) : null}

        <section className="cohort-hero onboarding-hero" aria-labelledby="priorities-heading">
          <div className="cohort-hero-copy">
            <p className="eyebrow">Profile priorities</p>
            <h1 id="priorities-heading">Choose what should shape Now.</h1>
            <p className="hero-text">
              Select at least one cause area. Moral Trade will use those priorities to filter live
              proposals instead of showing generic or fabricated suggestions.
            </p>
          </div>

          <aside className="panel cohort-demo-card">
            <p className="eyebrow">Private by default</p>
            <h2>This saves a manual cause search.</h2>
            <p>
              It does not publish your identity, contact another member, create an offer, or opt you
              into background outreach.
            </p>
          </aside>
        </section>

        <section className="section section-white" aria-labelledby="priority-form-heading">
          <div className="auth-grid onboarding-grid">
            <article className="panel auth-card">
              <div className="section-head auth-head">
                <p className="eyebrow">Personalize Now</p>
                <h2 id="priority-form-heading">Cause areas</h2>
                <p>Choose the broad priorities that should qualify a live proposal for your feed.</p>
              </div>

              <form action={saveProfilePrioritySearchAction} className="compact-form onboarding-form">
                <input name="return_to" type="hidden" value={pagePath} />
                <input name="success_to" type="hidden" value={returnTo} />

                <fieldset className="field onboarding-fieldset">
                  <legend>Select one or more</legend>
                  <div className="onboarding-inline-grid">
                    {COHORT_CAUSES.map((cause) => (
                      <label className="onboarding-radio" key={cause}>
                        <input
                          defaultChecked={selectedCauses.has(cause)}
                          name="cause_area"
                          type="checkbox"
                          value={cause}
                        />
                        <span>{cause}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Save priorities
                  </button>
                  <Link className="button button-secondary" href={returnTo}>
                    Cancel
                  </Link>
                </div>
              </form>
            </article>

            <article className="panel auth-side-card">
              <p className="eyebrow">What changes</p>
              <div className="clean-stack">
                <div>
                  <h3>Now becomes profile-driven</h3>
                  <p>Live proposals must overlap with at least one saved cause area to appear.</p>
                </div>
                <div>
                  <h3>No inferred commitments</h3>
                  <p>
                    Choosing a cause does not imply that you will pay, pledge, publish, or accept a
                    proposal.
                  </p>
                </div>
                <div>
                  <h3>Editable later</h3>
                  <p>Return here from Now whenever you want to replace this priority set.</p>
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
