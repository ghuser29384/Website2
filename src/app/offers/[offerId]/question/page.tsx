import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/community/comment-thread";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getOfferById, getViewer, listOfferComments } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { formatMode } from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import { OfferQuestionForm } from "./offer-question-form";

interface OfferQuestionPageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Ask a question about a proposal",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OfferQuestionPage({
  params,
  searchParams,
}: OfferQuestionPageProps) {
  const [{ offerId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const offer = await getOfferById(offerId);

  if (!offer) {
    notFound();
  }

  const viewer = await getViewer();
  const comments = await listOfferComments(offer.id, viewer?.authUser.id);
  const formMessage = getFormMessage(resolvedSearchParams);
  const returnTo = `/offers/${offer.id}/question`;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const successfulResetToken =
    formMessage?.tone === "success" ? formMessage.text : "";

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">{formatMode(offer.mode)} · public question</p>
            <h1>Clarify the terms before proposing a match.</h1>
            <p className="hero-text">
              Ask about the action, request, no-trade baseline, evidence method, timing,
              or exit conditions. Questions are public; private contact details and
              sensitive evidence do not belong here.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href={`/offers/${offer.id}`}>
                Review full proposal
              </Link>
              <Link className="button button-secondary" href="/offers">
                Back to marketplace
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Selected route</p>
            <h2>
              {offer.offered_cause} for {offer.requested_cause}
            </h2>
            <dl className="listing-terms">
              <div>
                <dt>Participant commits</dt>
                <dd>{offer.offer_action}</dd>
              </div>
              <div>
                <dt>Counterparty commits</dt>
                <dd>{offer.request_action}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            aria-live="polite"
            className={`status-banner ${
              formMessage.tone === "error"
                ? "status-banner-error"
                : "status-banner-success"
            }`}
            role={formMessage.tone === "error" ? "alert" : "status"}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section
          className="section section-white"
          aria-labelledby="question-heading"
          id="question-thread"
        >
          <div className="section-head">
            <p className="eyebrow">Public discussion</p>
            <h2 id="question-heading">Ask a clarifying question</h2>
            <p>
              {comments.length
                ? `${comments.length} public question${comments.length === 1 ? "" : "s"} or discussion thread${comments.length === 1 ? "" : "s"} are recorded below.`
                : "The thread will appear after a real participant posts. Empty social counters are not presented as marketplace activity."}
            </p>
          </div>

          {viewer ? (
            <OfferQuestionForm
              offerId={offer.id}
              resetToken={successfulResetToken}
              returnTo={returnTo}
            />
          ) : (
            <div className="panel empty-state">
              <h3>Sign in to ask a public question.</h3>
              <p>
                You can review the proposal without an account. Posting, replying, and
                voting require a member profile.
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" href={loginHref}>
                  Sign in to ask
                </Link>
              </div>
            </div>
          )}

          {comments.length ? (
            <CommentThread
              comments={comments}
              offerId={offer.id}
              returnTo={returnTo}
              viewerId={viewer?.authUser.id}
            />
          ) : null}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
