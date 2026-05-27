import type { Metadata } from "next";
import Link from "next/link";

import { createMatchConciergeRequestAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { BACKGROUND_DATA_INVENTORY } from "@/lib/background-privacy-controls";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Background networking",
  description:
    "How Moral Trade surfaces possible counterparties without scraping private feeds, revealing exact wishes, or sending autonomous outreach.",
  alternates: {
    canonical: "/background-networking",
  },
  openGraph: {
    title: "Background networking",
    description:
      "How Moral Trade surfaces possible counterparties without scraping private feeds, revealing exact wishes, or sending autonomous outreach.",
    url: getAbsoluteUrl("/background-networking"),
    type: "website",
  },
};

interface BackgroundNetworkingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BackgroundNetworkingPage({
  searchParams,
}: BackgroundNetworkingPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = await getViewer();

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
            <p className="eyebrow">Background networking</p>
            <h1>Find possible trades without turning people into targets.</h1>
            <p className="hero-text">
              Background networking is a conservative matching layer. It compares broad public
              previews, saved preferences, and manual source notes so a participant can decide
              whether an introduction is worth exploring.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/wish-registry">
                Search broad previews
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Boundary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Broad previews first</strong>
                  <p>Cause areas and high-level aims can be compared before exact wishes are shared.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Consent before detail</strong>
                  <p>Contact details and private constraints remain gated until both sides opt in.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>No autonomous outreach</strong>
                  <p>The platform records suggestions; it does not message strangers on a user&apos;s behalf.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
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

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Match suggestions are staged, reviewable, and reversible</h2>
            <p>
              The dashboard stores private wish profiles, manual source notes, saved searches, and
              broad registry previews. A deterministic scan can suggest possible counterparties,
              but a suggestion is not an introduction and does not reveal private data by itself.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Manual sources</h3>
              <p>
                Users can add notes about public pages or conversations they choose to record. The
                current prototype does not ingest private feeds, scrape profiles at scale, or mine
                email and chat histories.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Deterministic matching</h3>
              <p>
                Candidate matches are scored from declared cause areas, trade modes, constraints,
                location sensitivity, and verification preferences. Scores are prompts for human
                review, not automatic rankings of people.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Consent gates</h3>
              <p>
                A participant can request more detail, decline, or report a suggestion. Exact
                wishes, contact information, and sensitive constraints should only move forward
                after staged disclosure and mutual consent.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Match explanations</h3>
              <p>
                Match cards show coarse factor codes, confidence bands, scanned surfaces, and
                redacted surfaces. They explain why a suggestion exists without exposing raw wish
                text, contact details, or source notes.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Purpose-bound grants</h3>
              <p>
                Private facts should be shared for a narrow decision and, by default, a time box.
                Grants can expire or be revoked instead of becoming permanent background access.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Minimal telemetry</h3>
              <p>
                Operational metrics use buckets and counts, such as scan runs and request states.
                Analytics should not store exact wishes, private constraints, report bodies, or
                message text.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Anti-enumeration budgets</h3>
              <p>
                Manual scans, helper jobs, saved searches, and signed-in registry searches are
                budgeted and logged with hashed query fingerprints. Highly specific sparse
                registry searches are withheld until the user broadens the query.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Privacy controls</p>
            <h2>What the current pilot stores and how it is bounded</h2>
            <p>
              The signed-in dashboard now exposes the background-networking data map, active
              grants, notification channel choices, local drafts, and data-right requests.
            </p>
          </div>

          <div className="data-grid">
            {BACKGROUND_DATA_INVENTORY.map((item) => (
              <article className="panel data-card" key={item.surface}>
                <p className="detail-kicker">{item.classification}</p>
                <h3>{item.label}</h3>
                <p className="route-text">{item.use}</p>
                <p className="route-text">
                  <strong>Retention:</strong> {item.retention}
                </p>
                <p className="route-text">
                  <strong>Control:</strong> {item.control}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" id="concierge-intake">
          <div className="section-head">
            <p className="eyebrow">Concierge intake</p>
            <h2>Turn a broad preview into a reviewed introduction request</h2>
            <p>
              This request goes to an operator queue first. It records intent, proposed trade
              shape, privacy constraints, and an SLA before anyone receives contact details or
              exact wishes.
            </p>
          </div>

          {viewer ? (
            <form action={createMatchConciergeRequestAction} className="panel stack-form">
              <input name="return_to" type="hidden" value="/background-networking" />
              <div className="field-grid">
                <label className="field">
                  <span>Route</span>
                  <select name="route" defaultValue="private_match">
                    <option value="private_match">Private counterparty search</option>
                    <option value="pledge_swap">Bounded pledge swap</option>
                    <option value="donation_offset">Donation offset</option>
                    <option value="mpgf">Moral public-good cycle</option>
                    <option value="other">Other reviewed request</option>
                  </select>
                </label>
                <label className="field">
                  <span>Cause areas</span>
                  <input
                    name="cause_areas_json"
                    placeholder="Animal welfare, global poverty, public health"
                  />
                </label>
              </div>
              <label className="field">
                <span>Structured intent</span>
                <textarea
                  name="intent_summary"
                  placeholder="What introduction would help you decide whether a real trade is possible?"
                  required
                  rows={4}
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>What you can offer</span>
                  <textarea
                    name="offer_summary"
                    placeholder="Pledge, donation redirect, expertise, institutional access, or another bounded action."
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>What you are asking for</span>
                  <textarea
                    name="ask_summary"
                    placeholder="The counterparty action, evidence, or conversation you want."
                    rows={3}
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Privacy and safety constraints</span>
                  <textarea
                    name="constraints"
                    placeholder="What should not be disclosed yet? What would make the intro unsafe or premature?"
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Timeline</span>
                  <input name="desired_timeline" placeholder="e.g. Review within a week" />
                </label>
              </div>
              <button className="button button-primary" type="submit">
                Request concierge review
              </button>
            </form>
          ) : (
            <div className="empty-state">
              <div>
                <strong>Sign in to request concierge review.</strong>
                <p>
                  The operator queue needs an accountable requester before it can triage an
                  introduction.
                </p>
              </div>
              <Link className="button button-primary" href="/signup?returnTo=/background-networking">
                Create account
              </Link>
            </div>
          )}
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Safety posture</p>
            <h2>Background networking is not a private-feed automation product</h2>
            <p>
              Moral trade needs trust and permission. The matching layer is therefore designed to
              reduce search costs without creating pressure, doxxing risk, harassment, or surprise
              exposure of sensitive values.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>What can be public</h3>
              <p>
                Broad cause areas, public offers, and voluntarily written previews can help people
                discover overlap without revealing exact asks or bargaining constraints.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>What stays private</h3>
              <p>
                Exact wishes, sensitive evidence, contact information, and negotiation details are
                private unless the relevant parties choose to disclose them through the dashboard.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>What is not automated</h3>
              <p>
                The prototype does not perform autonomous outreach, mass scraping, or dark-pattern
                matching. It records possible introductions for human review.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Where to use it</p>
            <h2>The dashboard is the working surface</h2>
            <p>
              Signed-in members can create a wish profile, save search constraints, add manual
              source notes, export their profile data, and review suggestions from one place.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Review privacy rules
              </Link>
              <Link className="button button-secondary" href="/safety">
                Review safety rules
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
