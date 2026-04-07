import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { expressInterestAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  getInterestForOffer,
  getOfferById,
  getViewer,
  listOfferInterests,
} from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";

interface OfferPageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const { offerId } = await params;
  const offer = await getOfferById(offerId);

  if (!offer) {
    return {
      title: "Offer not found",
    };
  }

  return {
    title: `${offer.offered_cause} for ${offer.requested_cause}`,
  };
}

export default async function OfferPage({ params, searchParams }: OfferPageProps) {
  const { offerId } = await params;
  const resolvedSearchParams = await searchParams;
  const offer = await getOfferById(offerId);

  if (!offer) {
    notFound();
  }

  const viewer = await getViewer();
  const formMessage = getFormMessage(resolvedSearchParams);
  const myInterest = viewer ? await getInterestForOffer(offerId, viewer.authUser.id) : null;
  const incomingInterests =
    viewer && viewer.authUser.id === offer.owner_id ? await listOfferInterests(offerId) : [];
  const isOwner = viewer?.authUser.id === offer.owner_id;

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={[
            { href: "/", label: "Home" },
            { href: "/offers", label: "Offers" },
          ]}
          authLink={
            viewer
              ? { href: "/dashboard", label: "Dashboard" }
              : { href: "/login", label: "Log in" }
          }
          primaryAction={{
            href: viewer ? "/offers/new" : "/signup",
            label: viewer ? "Create offer" : "Sign up",
          }}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">{formatMode(offer.mode)}</p>
            <h1>
              {offer.offered_cause} for {offer.requested_cause}.
            </h1>
            <p className="hero-text">
              Posted by <strong>{offer.owner_alias}</strong>. This is the full offer view, with
              a live interest flow for signed-in users.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/offers">
                Back to offers
              </Link>
              {!viewer ? (
                <Link className="button button-primary" href={`/login?next=${encodeURIComponent(`/offers/${offerId}`)}`}>
                  Log in to express interest
                </Link>
              ) : null}
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Offer summary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Offer action</strong>
                  <p>{offer.offer_action}</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Requested action</strong>
                  <p>{offer.request_action}</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Trust frame</strong>
                  <p>
                    {offer.verification} · {offer.duration} · trust level {offer.trust_level}/5
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white">
          <div className="detail-grid detail-grid-wide">
            <article className="panel detail-block">
              <p className="detail-kicker">Core details</p>
              <h3>{offer.owner_alias}</h3>
              <p>{offer.notes || "No additional notes were provided for this offer."}</p>
              <div className="tag-row">
                <span className="badge">{offer.offered_cause}</span>
                <span className="badge badge-secondary">{offer.requested_cause}</span>
                <span className="impact-pill">{offer.offer_impact}/10 offered</span>
                <span className="impact-pill">{offer.min_counterparty_impact}+/10 needed</span>
              </div>
              <div className="clean-stack">
                <div>
                  <h3>Compromise destination</h3>
                  <p>{offer.compromise_cause}</p>
                </div>
                <div>
                  <h3>Status</h3>
                  <p>{offer.status}</p>
                </div>
              </div>
            </article>

            <article className="panel detail-block">
              <p className="detail-kicker">Express interest</p>
              {isOwner ? (
                <p>You own this offer, so the interest form is replaced with incoming interest below.</p>
              ) : viewer ? (
                <form action={expressInterestAction} className="stack-form">
                  <input name="offer_id" type="hidden" value={offer.id} />
                  <label className="field">
                    <span>Message</span>
                    <textarea
                      defaultValue={myInterest?.message ?? ""}
                      name="message"
                      placeholder="Add a short note explaining why this trade interests you."
                      rows={5}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="button button-primary" type="submit">
                      {myInterest ? "Update interest" : "Express interest"}
                    </button>
                    <Link className="button button-secondary" href="/dashboard">
                      Open dashboard
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="clean-stack">
                  <p>Log in or create an account before expressing interest in this offer.</p>
                  <div className="hero-actions">
                    <Link
                      className="button button-primary"
                      href={`/login?next=${encodeURIComponent(`/offers/${offer.id}`)}`}
                    >
                      Log in
                    </Link>
                    <Link className="button button-secondary" href="/signup">
                      Create account
                    </Link>
                  </div>
                </div>
              )}

              {myInterest ? (
                <div className="status-chip-row">
                  <span className="badge">Your interest is {myInterest.status}</span>
                </div>
              ) : null}
            </article>
          </div>
        </section>

        {isOwner ? (
          <section className="section section-cream">
            <div className="section-head">
              <p className="eyebrow">Incoming interest</p>
              <h2>People who responded to your offer</h2>
            </div>

            <div className="data-grid">
              {incomingInterests.length ? (
                incomingInterests.map((interest) => (
                  <article key={interest.id} className="panel data-card">
                    <p className="detail-kicker">Interest</p>
                    <h3>{interest.interested_alias}</h3>
                    <p className="route-text">{interest.message || "No message provided."}</p>
                    <div className="tag-row">
                      <span className="badge">{interest.status}</span>
                      <span className="source-pill">
                        {new Date(interest.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <div>
                    <strong>No interest yet.</strong>
                    <p>When people respond to your offer, they will appear here.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
