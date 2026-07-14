import type { Metadata } from "next";
import Link from "next/link";

import { createMatchConciergeRequestAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Private matching",
  description:
    "Find possible Moral Trade counterparties through broad previews, operator review, and consent-gated disclosure of exact details.",
  alternates: {
    canonical: "/background-networking",
  },
  openGraph: {
    title: "Private matching | Moral Trade",
    description:
      "Find possible counterparties without publishing exact wishes, sensitive constraints, identities, or contact details.",
    url: getAbsoluteUrl("/background-networking"),
    type: "website",
  },
};

interface PrivateMatchingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const workflow = [
  {
    number: "01",
    title: "Create a broad preview",
    detail:
      "Describe cause areas, trade modes, capabilities, and verification preferences without exposing exact asks or private constraints.",
  },
  {
    number: "02",
    title: "Choose the audience",
    detail:
      "Control whether the preview is private, available to reviewed members, or visible in the broad registry.",
  },
  {
    number: "03",
    title: "Request a reviewed search",
    detail:
      "An accountable requester submits a use case, no-trade baseline, possible offer, ask, privacy constraints, and timeline.",
  },
  {
    number: "04",
    title: "Review a possible opportunity",
    detail:
      "A broad compatibility signal is a prompt for review, not an introduction, endorsement, or commitment.",
  },
  {
    number: "05",
    title: "Disclose only after consent",
    detail:
      "Exact wishes, identities, contact details, and sensitive constraints move only through explicit, revocable grants.",
  },
] as const;

const safeguards = [
  {
    title: "Broad first",
    detail:
      "Public and member discovery use broad summaries, tags, and safe location hints rather than exact private fields.",
  },
  {
    title: "No autonomous outreach",
    detail:
      "The service does not send surprise messages, scrape private feeds, or reveal contact details from a possible match.",
  },
  {
    title: "Mutual disclosure",
    detail:
      "Each side controls what is shared, with whom, for what purpose, and for how long.",
  },
  {
    title: "Review and recourse",
    detail:
      "Requests can be dismissed, reported, corrected, frozen, deleted, or appealed through scoped review routes.",
  },
] as const;

const suitableUseCases = [
  "A researcher seeking a serious counterparty with a different cause priority.",
  "A donor exploring a reciprocal pledge or donation-offset structure.",
  "An organizer seeking participants for a bounded, reviewed moral public-good action.",
  "A builder or institution looking for consented collaborators on a specific coordination problem.",
] as const;

export default async function PrivateMatchingPage({ searchParams }: PrivateMatchingPageProps) {
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
            <p className="eyebrow">Private matching</p>
            <h1>Find possible counterparties without exposing private details.</h1>
            <p className="hero-text">
              Moral Trade compares broad previews first. Exact wishes, sensitive constraints,
              identities, and contact details remain hidden until the relevant people explicitly
              approve disclosure.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#concierge-intake">
                Request a reviewed search
              </a>
              <Link className="button button-secondary" href="/wish-registry">
                Browse broad previews
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Review privacy rules
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Disclosure rule</p>
            <h2>Compatibility is not consent.</h2>
            <p>
              A possible opportunity can be shown as a broad card. It does not authorize contact,
              reveal exact terms, or create a commitment.
            </p>
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

        <section className="section section-white" aria-labelledby="private-matching-workflow-heading">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 id="private-matching-workflow-heading">Five controlled steps from preview to disclosure.</h2>
          </div>
          <div className="data-grid">
            {workflow.map((step) => (
              <article className="panel data-card" key={step.number}>
                <p className="detail-kicker">{step.number}</p>
                <h3>{step.title}</h3>
                <p className="route-text">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="private-matching-safeguards-heading">
          <div className="section-head">
            <p className="eyebrow">Safeguards</p>
            <h2 id="private-matching-safeguards-heading">Conservative disclosure by default.</h2>
            <p>
              The service reduces search costs without turning private moral preferences into a
              targeting, surveillance, or unsolicited-outreach system.
            </p>
          </div>
          <div className="data-grid">
            {safeguards.map((safeguard) => (
              <article className="panel data-card" key={safeguard.title}>
                <h3>{safeguard.title}</h3>
                <p className="route-text">{safeguard.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="private-matching-fit-heading">
          <div className="section-head">
            <p className="eyebrow">Good fit</p>
            <h2 id="private-matching-fit-heading">Use this route for a concrete coordination problem.</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="trust-check-list">
              {suitableUseCases.map((useCase) => (
                <li key={useCase}>{useCase}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-subtle" id="concierge-intake" aria-labelledby="concierge-intake-heading">
          <div className="section-head">
            <p className="eyebrow">Reviewed search request</p>
            <h2 id="concierge-intake-heading">Describe the introduction that would help.</h2>
            <p>
              The request enters an operator queue before any person receives contact details or
              exact wishes. Declined or closed decisions can be reviewed again through the member
              workspace.
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
                    <option value="mpgf">Moral public-good action</option>
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
              <label className="field">
                <span>No-trade baseline</span>
                <textarea
                  name="no_trade_baseline"
                  placeholder="What happens if no trade or introduction occurs?"
                  required
                  rows={3}
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>What you can offer</span>
                  <textarea
                    name="offer_summary"
                    placeholder="Pledge, donation redirect, expertise, institutional access, or another bounded action"
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>What you are asking for</span>
                  <textarea
                    name="ask_summary"
                    placeholder="The counterparty action, evidence, or conversation you want"
                    rows={3}
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Privacy and safety constraints</span>
                  <textarea
                    name="constraints"
                    placeholder="What should not be disclosed? What would make the introduction unsafe or premature?"
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Timeline</span>
                  <input name="desired_timeline" placeholder="For example: review within a week" />
                </label>
              </div>
              <button className="button button-primary" type="submit">
                Request reviewed search
              </button>
            </form>
          ) : (
            <div className="empty-state">
              <div>
                <strong>Create an account to request a reviewed search.</strong>
                <p>An accountable requester is required before an introduction can be triaged.</p>
              </div>
              <Link className="button button-primary" href="/signup?returnTo=/background-networking">
                Create account
              </Link>
            </div>
          )}
        </section>

        <section className="section section-white" aria-labelledby="private-matching-workspace-heading">
          <div className="section-head">
            <p className="eyebrow">Member workspace</p>
            <h2 id="private-matching-workspace-heading">Control previews, requests, grants, and deletion from one place.</h2>
            <p>
              Signed-in members can create a wish profile, manage broad previews, review possible
              opportunities, approve disclosures, export records, and delete the private matching
              layer.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup?returnTo=/dashboard"}>
                {viewer ? "Open workspace" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/trust">
                Review reliance rules
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
