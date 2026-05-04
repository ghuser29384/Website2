import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { OfferCreateForm } from "@/components/offers/offer-create-form";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { getDonationOffsetOverview, requireViewer } from "@/lib/app-data";
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
  const viewer = supabaseReady ? await requireViewer("/offers/new") : null;
  const donationOffsetOverview = supabaseReady ? await getDonationOffsetOverview() : null;
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
            <h1>Publish a structured public commitment.</h1>
            <p className="hero-text">
              {viewer ? (
                <>
                  Signed in as <strong>{viewer.displayName}</strong>. This page writes to the
                  shared record rather than browser storage and asks you to state the act, the
                  reciprocal terms, and the trust conditions plainly.
                </>
              ) : (
                <>Configure Supabase to enable live offer creation.</>
              )}
            </p>
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
                  <strong>State trust expectations</strong>
                  <p>Verification, duration, and trust level should be legible to others.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Keep it bounded</strong>
                  <p>Start with offers someone else can plausibly evaluate, verify, and accept.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-white">
          <div className="auth-grid">
            <OfferCreateForm
              availablePools={availablePools}
              formMessage={formMessage}
              initialMode={initialMode}
              initialOffsetParticipationMode={initialOffsetParticipationMode}
              initialOffsetPoolId={initialOffsetPoolId}
              initialOffsetPoolSide={initialOffsetPoolSide}
              supabaseReady={supabaseReady}
            />

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
                    <h3>Supabase setup required</h3>
                    <p>Add the environment variables and apply the SQL schema to enable live publishing.</p>
                  </div>
                )}
                <div>
                  <h3>Where this appears</h3>
                  <p>Your display name is saved as the visible alias on public offers across all three trade modes.</p>
                </div>
                <div>
                  <h3>Next step</h3>
                  <p>Once published, the offer appears in the public directory and on your dashboard.</p>
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
