import type { Metadata } from "next";
import Link from "next/link";

import { createOfferAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  CAUSE_OPTIONS,
  COMPROMISE_CAUSE_OPTIONS,
  DURATION_OPTIONS,
  OFFER_MODE_OPTIONS,
  VERIFICATION_OPTIONS,
} from "@/lib/offers";
import { getFormMessage } from "@/lib/form-state";
import { requireViewer } from "@/lib/app-data";
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
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await requireViewer("/offers/new") : null;

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
            <article className="panel auth-card">
              <div className="section-head auth-head">
                <p className="eyebrow">Offer details</p>
                <h2>Create offer</h2>
                <p>
                  State the two sides, the expected gain, and the verification terms in one
                  public record.
                </p>
              </div>

              {!supabaseReady && (
                <div className="status-banner status-banner-error">
                  Supabase is not configured yet. Add environment variables before creating
                  live offers.
                </div>
              )}

              {formMessage && (
                <div
                  className={`status-banner ${
                    formMessage.tone === "error"
                      ? "status-banner-error"
                      : "status-banner-success"
                  }`}
                >
                  {formMessage.text}
                </div>
              )}

              <form action={createOfferAction} className="stack-form">
                <label className="field">
                  <span>Exchange mode</span>
                  <select defaultValue="pledge" name="mode">
                    {OFFER_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>What you&apos;re offering</span>
                    <select defaultValue="Animal welfare" name="offered_cause">
                      {CAUSE_OPTIONS.map((cause) => (
                        <option key={cause} value={cause}>
                          {cause}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>What you want in return</span>
                    <select defaultValue="Global poverty" name="requested_cause">
                      {CAUSE_OPTIONS.map((cause) => (
                        <option key={cause} value={cause}>
                          {cause}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>What will you do?</span>
                  <textarea
                    name="offer_action"
                    placeholder="e.g. Pay $600 on verified completion, donate 1% of my income, or redirect an opposed donation."
                    rows={4}
                  />
                </label>

                <label className="field">
                  <span>What do you want the other side to do?</span>
                  <textarea
                    name="request_action"
                    placeholder="e.g. Adopt a vegetarian diet for 12 months or redirect a matching donation."
                    rows={4}
                  />
                </label>

                <label className="field">
                  <span>Compromise destination (offset only)</span>
                  <select defaultValue="Not needed" name="compromise_cause">
                    {COMPROMISE_CAUSE_OPTIONS.map((cause) => (
                      <option key={cause} value={cause}>
                        {cause}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>Your impact estimate</span>
                    <input defaultValue={7} max={10} min={1} name="offer_impact" type="number" />
                  </label>

                  <label className="field">
                    <span>Minimum counterparty impact</span>
                    <input
                      defaultValue={6}
                      max={10}
                      min={1}
                      name="min_counterparty_impact"
                      type="number"
                    />
                  </label>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Verification preference</span>
                    <select defaultValue="Annual receipts" name="verification">
                      {VERIFICATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Review period</span>
                    <select defaultValue="6 months" name="duration">
                      {DURATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Trust intensity</span>
                  <input defaultValue={3} max={5} min={1} name="trust_level" type="number" />
                </label>

                <label className="field">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    placeholder="Add context that would help a counterparty evaluate the offer."
                    rows={4}
                  />
                </label>

                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Publish offer
                  </button>
                  <Link className="button button-secondary" href="/offers">
                    Back to offers
                  </Link>
                </div>
              </form>
            </article>

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
