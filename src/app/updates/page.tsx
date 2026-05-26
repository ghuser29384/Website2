import type { Metadata } from "next";
import Link from "next/link";

import { subscribePilotUpdatesAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Pilot Updates",
  description:
    "Subscribe to Moral Trade pilot updates about founding cohorts, reviewer governance, public-goods tests, and transparency reports.",
  alternates: {
    canonical: "/updates",
  },
  openGraph: {
    title: "Moral Trade pilot updates",
    description:
      "Follow the Moral Trade pilot without assuming live marketplace liquidity: cohorts, governance, and public-goods coordination.",
    url: getAbsoluteUrl("/updates"),
    type: "website",
  },
};

interface UpdatesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const updateTopics = [
  "Founding cohort openings and small-group demos",
  "Reviewer rulebook changes and transparency reports",
  "Public Goods Fund threshold-commitment pilots",
  "New worked examples and safety case studies",
] as const;

export default async function UpdatesPage({ searchParams }: UpdatesPageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();

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
            <p className="eyebrow">Pilot updates</p>
            <h1>Follow the pilot without treating it as a liquid marketplace.</h1>
            <p className="hero-text">
              Updates focus on cohort openings, reviewer governance, public-goods experiments, and
              transparency reports rather than impact claims the pilot has not earned yet.
            </p>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Subscribe</p>
            {!supabaseReady ? (
              <div className="status-banner status-banner-error">
                Supabase is not configured yet. Email support@moraltrade.org for updates.
              </div>
            ) : null}
            {formMessage ? (
              <div
                className={`status-banner ${
                  formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
                }`}
              >
                {formMessage.text}
              </div>
            ) : null}
            <form action={subscribePilotUpdatesAction} className="stack-form">
              <input name="return_to" type="hidden" value="/updates" />
              <input name="segment" type="hidden" value="pilot_updates" />
              <input name="next_step" type="hidden" value="Receive pilot update digest" />
              <label className="field">
                <span>Email</span>
                <input name="email" placeholder="you@example.com" type="email" />
              </label>
              <button className="button button-primary" type="submit">
                Subscribe for pilot updates
              </button>
            </form>
            <Link className="text-button" href="/contact">
              Contact operators instead
            </Link>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">What you will receive</p>
            <h2>Updates are about trust-building work</h2>
            <p>
              The current stage needs public learning and careful review more than promotional
              marketplace language.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {updateTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
