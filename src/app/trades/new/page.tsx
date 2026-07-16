import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";

import { saveCoreOfferAction } from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { listCoreOffersForOwner } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create a trade",
  description:
    "Save one bounded Moral Trade draft, submit it once, and track its review and publication state.",
  robots: { index: false, follow: false },
};

interface NewTradePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function NewTradePage({ searchParams }: NewTradePageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const formMessage = getFormMessage(resolvedSearchParams);
  const existingOffers = viewer ? await listCoreOffersForOwner(viewer.authUser.id) : [];
  const submissionKey = randomUUID();
  const example = valueOf(resolvedSearchParams.example);
  const useVictoriaExample = example === "seed-victoria";

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showSearch={false}
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

        <section className="section section-white" aria-labelledby="new-trade-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Create one bounded proposal</p>
            <h1 id="new-trade-heading">Draft, review, publish, then invite.</h1>
            <p>
              This is the operational non-financial path. A saved draft is private, submission is
              idempotent, publication is a distinct review state, and no agreement becomes active
              without both parties confirming the same version.
            </p>
          </div>

          {!viewer ? (
            <article className="panel data-card data-card-wide">
              <h2>Create an account before saving a private draft.</h2>
              <p className="route-text">
                Registration ties the draft, invitation, messages, confirmations, and evidence to a
                participant-controlled record.
              </p>
              <div className="form-actions">
                <Link className="button button-primary" href="/signup?returnTo=/trades/new">
                  Create account
                </Link>
                <Link className="button button-secondary" href="/login?returnTo=/trades/new">
                  Sign in
                </Link>
              </div>
            </article>
          ) : (
            <div className="detail-grid detail-grid-wide">
              <article className="panel detail-block">
                <p className="detail-kicker">Trade editor</p>
                <h2>Terms visible before reliance</h2>
                <form action={saveCoreOfferAction} className="stack-form">
                  <input name="submission_key" type="hidden" value={submissionKey} />

                  <div className="field-grid">
                    <label className="field">
                      <span>Priority you are advancing</span>
                      <input
                        defaultValue={useVictoriaExample ? "Global poverty reduction" : ""}
                        maxLength={180}
                        name="offered_cause"
                        placeholder="For example: global poverty reduction"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Priority you want advanced</span>
                      <input
                        defaultValue={useVictoriaExample ? "Animal welfare" : ""}
                        maxLength={180}
                        name="requested_cause"
                        placeholder="For example: animal welfare"
                        required
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>What you will do</span>
                    <textarea
                      defaultValue={
                        useVictoriaExample
                          ? "Donate 1% of income to an agreed global-poverty charity for the stated term."
                          : ""
                      }
                      name="proposed_action"
                      placeholder="A concrete action you are willing to take"
                      required
                      rows={4}
                    />
                  </label>

                  <label className="field">
                    <span>What the counterparty will do</span>
                    <textarea
                      defaultValue={
                        useVictoriaExample
                          ? "Follow a vegetarian diet for the stated term."
                          : ""
                      }
                      name="requested_action"
                      placeholder="A concrete reciprocal action"
                      required
                      rows={4}
                    />
                  </label>

                  <label className="field">
                    <span>No-trade baseline</span>
                    <textarea
                      defaultValue={
                        useVictoriaExample
                          ? "Without an agreement, I keep my current giving and the counterparty keeps their current diet."
                          : ""
                      }
                      name="no_trade_baseline"
                      placeholder="What each side would actually do if no agreement forms"
                      required
                      rows={3}
                    />
                  </label>

                  <div className="field-grid">
                    <label className="field">
                      <span>Duration</span>
                      <input
                        defaultValue={useVictoriaExample ? "12 months" : ""}
                        name="duration"
                        placeholder="For example: 12 months"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Start date</span>
                      <input name="start_date" type="date" />
                    </label>
                    <label className="field">
                      <span>Evidence due date</span>
                      <input name="evidence_due_date" type="date" />
                    </label>
                  </div>

                  <label className="field">
                    <span>Evidence rule</span>
                    <textarea
                      defaultValue={
                        useVictoriaExample
                          ? "Donation receipt for the giving commitment and participant attestation for the diet commitment."
                          : ""
                      }
                      name="evidence_rule"
                      placeholder="Receipt, external record, log, or participant attestation that will count"
                      required
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span>Maximum burden or exposure</span>
                    <textarea
                      defaultValue={
                        useVictoriaExample
                          ? "The stated 1% donation and the stated 12-month dietary commitment only."
                          : ""
                      }
                      name="maximum_burden"
                      placeholder="The maximum money, time, action burden, and duration"
                      required
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span>Exit conditions</span>
                    <textarea
                      defaultValue={
                        useVictoriaExample
                          ? "Either participant may end future obligations by notifying the other; completed periods remain recorded."
                          : ""
                      }
                      name="exit_conditions"
                      placeholder="How either side can end future obligations"
                      required
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span>Privacy scope</span>
                    <textarea
                      defaultValue="Participants and operator only. Public pages show the proposal terms but not private messages or evidence."
                      name="privacy_scope"
                      required
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span>Context or constraints</span>
                    <textarea
                      name="notes"
                      placeholder="Optional context that helps a counterparty evaluate the proposal"
                      rows={3}
                    />
                  </label>

                  <label className="radio-row">
                    <input name="voluntary_certification" type="checkbox" />
                    <span>
                      This proposal is voluntary. It does not threaten harm, retaliation, or a worse
                      baseline if the other person declines.
                    </span>
                  </label>

                  <div className="form-actions">
                    <PendingSubmitButton
                      className="button button-secondary"
                      name="intent"
                      pendingLabel="Saving draft..."
                      value="draft"
                    >
                      Save private draft
                    </PendingSubmitButton>
                    <PendingSubmitButton
                      name="intent"
                      pendingLabel="Submitting once..."
                      value="submit"
                    >
                      Submit for review
                    </PendingSubmitButton>
                  </div>
                  <p className="panel-note">
                    The submission key is unique to this form. Repeated clicks return the existing
                    draft instead of creating duplicate offers.
                  </p>
                </form>
              </article>

              <aside className="panel detail-block">
                <p className="detail-kicker">Your recent proposals</p>
                <h2>{existingOffers.length} saved record{existingOffers.length === 1 ? "" : "s"}</h2>
                {existingOffers.length ? (
                  <div className="mini-list">
                    {existingOffers.slice(0, 8).map((offer) => (
                      <div className="panel subtle-panel" key={offer.id}>
                        <strong>
                          {offer.offered_cause} ↔ {offer.requested_cause}
                        </strong>
                        <p className="route-text">
                          {offer.workflow_status.replaceAll("_", " ")} · version {offer.terms_version}
                        </p>
                        <Link className="text-button" href={`/trades/${offer.id}/manage`}>
                          Open lifecycle record
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="route-text">No saved proposals yet.</p>
                )}

                <div className="status-banner">
                  <strong>State model</strong>
                  <p>
                    Draft → pending review → published. An operator can request changes or reject
                    with a specific reason. You can revise, resubmit, pause, close, or delete.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
