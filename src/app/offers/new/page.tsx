import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { OfferCreateForm } from "@/components/offers/offer-create-form";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getDonationOffsetOverview, getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "New offer",
  robots: {
    index: false,
    follow: false,
  },
};

interface NewOfferPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewOfferPage({ searchParams }: NewOfferPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const initialMode =
    typeof resolvedSearchParams.mode === "string" &&
    (resolvedSearchParams.mode === "pledge" ||
      resolvedSearchParams.mode === "offset" ||
      resolvedSearchParams.mode === "payment")
      ? resolvedSearchParams.mode
      : "pledge";
  const initialOffsetParticipationMode =
    typeof resolvedSearchParams.offset_participation_mode === "string" &&
    (resolvedSearchParams.offset_participation_mode === "direct" ||
      resolvedSearchParams.offset_participation_mode === "pool")
      ? resolvedSearchParams.offset_participation_mode
      : "direct";
  const initialOffsetPoolId =
    typeof resolvedSearchParams.offset_pool_id === "string"
      ? resolvedSearchParams.offset_pool_id
      : "";
  const initialOffsetPoolSide =
    typeof resolvedSearchParams.offset_pool_side === "string" &&
    (resolvedSearchParams.offset_pool_side === "side_a" ||
      resolvedSearchParams.offset_pool_side === "side_b")
      ? resolvedSearchParams.offset_pool_side
      : "";
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;
  const donationOffsetOverview = supabaseReady && viewer ? await getDonationOffsetOverview() : null;
  const availablePools =
    donationOffsetOverview?.pools.map((pool) => ({
      id: pool.id,
      name: pool.name,
      compromiseCharityId: pool.compromise_charity_id,
      compromiseCharityName: pool.compromiseCharity?.name ?? "Compromise destination",
      offsetRatio: pool.offset_ratio,
      timeHorizon: pool.time_horizon,
      verificationMethod: pool.verification_method,
      unmatchedSurplusRule: pool.unmatched_surplus_rule,
      assuranceMinimumCents: pool.assurance_minimum_cents,
      maximumCapCents: pool.maximum_cap_cents ?? 0,
      assuranceDeadlineAt: pool.assurance_deadline_at,
      sideALabel: pool.side_a_label,
      sideBLabel: pool.side_b_label,
      sideATotalCents: pool.sideATotalCents,
      sideBTotalCents: pool.sideBTotalCents,
      matchedCompromiseCents: pool.matchedCompromiseCents,
      status: pool.status,
    })) ?? [];

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
            <p className="eyebrow">Offer creation</p>
            <h1>Draft one bounded, reviewable trade.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This page writes to the
                  shared record and asks you to state the act, reciprocal terms, no-trade
                  baseline, exit condition, and evidence rule plainly.
                </>
              ) : (
                <>Create an account to save and publish a structured trade proposal.</>
              )}
            </p>
            {!viewer ? (
              <div className="hero-actions">
                <Link className="button button-primary" href="/signup?returnTo=/offers/new">
                  Create account
                </Link>
                <Link className="button button-secondary" href="/login?returnTo=/offers/new">
                  Sign in
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Publishing guidelines</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Be concrete</strong>
                  <p>Describe the action you will take or fund, and the action you want in return.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Name the baseline</strong>
                  <p>Explain the no-trade default so counterfactual trust can be reviewed.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Keep it bounded</strong>
                  <p>State evidence, expiry, and what happens when proof remains unresolved.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="auth-grid">
            {viewer ? (
              <OfferCreateForm
                availablePools={availablePools}
                formMessage={formMessage}
                initialMode={initialMode}
                initialOffsetParticipationMode={initialOffsetParticipationMode}
                initialOffsetPoolId={initialOffsetPoolId}
                initialOffsetPoolSide={initialOffsetPoolSide}
                supabaseReady={supabaseReady}
              />
            ) : (
              <article className="panel auth-side-card auth-gate-card">
                <p className="eyebrow">Account required</p>
                <h2>Create an account to save and publish a structured trade proposal.</h2>
                <p>
                  You can browse worked examples without signing in. Publishing a live offer needs
                  an account so the proposal can be saved, reviewed, edited, and returned to after
                  sign-in.
                </p>
                <div className="hero-actions">
                  <Link className="button button-primary" href="/signup?returnTo=/offers/new">
                    Create account
                  </Link>
                  <Link className="button button-secondary" href="/login?returnTo=/offers/new">
                    Sign in
                  </Link>
                </div>
              </article>
            )}

            <article className="panel auth-side-card">
              <p className="eyebrow">Current account</p>
              <div className="clean-stack">
                {viewer ? (
                  <div>
                    <h3>{viewer.displayName}</h3>
                    <p>{viewer.profile.email}</p>
                  </div>
                ) : (
                  <div>
                    <h3>Signed out</h3>
                    <p>Return to this page after account creation to publish the proposal.</p>
                  </div>
                )}
                <div>
                  <h3>Where this appears</h3>
                  <p>Your display name is saved as the visible alias on public offsets and pledge swaps.</p>
                </div>
                <div>
                  <h3>Next step</h3>
                  <p>Offsets with risk signals stay paused for review; paid action offers are deferred from the public creation path.</p>
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
