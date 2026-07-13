import type { Metadata } from "next";
import Link from "next/link";

import { submitFallbackLivestreamRecordingAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import {
  getFallbackLivestreamEvidenceRouteForViewer,
  getViewer,
  type FallbackLivestreamEvidenceRouteRecord,
} from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { buildFallbackLivestreamEvidenceDisplay } from "@/lib/moral-trade/fallback-livestream-evidence";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Fallback livestream evidence",
  robots: {
    follow: false,
    index: false,
  },
};

interface FallbackLivestreamEvidencePageProps {
  params: Promise<{ routeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function SafeState({
  actionHref,
  actionLabel,
  body,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  title: string;
}) {
  return (
    <div className="empty-state marketplace-empty-state">
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
        {actionHref && actionLabel ? (
          <Link className="button button-primary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function FallbackLivestreamEvidencePage({
  params,
  searchParams,
}: FallbackLivestreamEvidencePageProps) {
  const { routeId } = await params;
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;
  let route: FallbackLivestreamEvidenceRouteRecord | null = null;
  let loadFailed = false;

  if (viewer) {
    try {
      route = await getFallbackLivestreamEvidenceRouteForViewer(routeId);
    } catch {
      loadFailed = true;
    }
  }

  const display = route ? buildFallbackLivestreamEvidenceDisplay(route) : null;
  const canSubmitRecording =
    Boolean(display?.canSubmitRecording) &&
    route?.creator_id === viewer?.authUser.id;

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
        <MarketplaceRouteShell active="track">
          <section
            className="v72-private-surface commitments-center mt-v75-route-card"
            aria-labelledby="fallback-livestream-evidence-heading"
          >
            <div className="v72-owner-strip">
              <h1 id="fallback-livestream-evidence-heading">Fallback livestream evidence</h1>
              <p>No-trade branch evidence for an external stream or recording.</p>
            </div>

            {!supabaseReady ? (
              <SafeState
                title="Evidence route unavailable."
                body="Supabase is not configured in this environment, so no live fallback livestream evidence can be loaded."
              />
            ) : !viewer ? (
              <SafeState
                title="Sign in required."
                body="Fallback livestream evidence is private to related participants and reviewers."
                actionHref={`/login?returnTo=/evidence/fallback-livestream/${routeId}`}
                actionLabel="Sign in"
              />
            ) : loadFailed || !display ? (
              <SafeState
                title="Evidence route unavailable."
                body="This fallback livestream evidence route is missing or not available to this viewer."
                actionHref="/commitments"
                actionLabel="Back to Track"
              />
            ) : (
              <article className="panel">
                {formMessage ? (
                  <div
                    className={`status-banner ${
                      formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
                    }`}
                  >
                    {formMessage.text}
                  </div>
                ) : null}

                <div className="section-head">
                  <div>
                    <p className="eyebrow">{display.branchLabel}</p>
                    <h2>{display.observationLabel}</h2>
                    <p>{display.actionStatement}</p>
                  </div>
                  <span className="badge badge-secondary">{display.statusLabel}</span>
                </div>

                <dl className="deal-economics-grid">
                  <div>
                    <dt>Schedule</dt>
                    <dd>{display.scheduleLabel}</dd>
                  </div>
                  <div>
                    <dt>Recording due</dt>
                    <dd>{display.recordingDueLabel}</dd>
                  </div>
                  <div>
                    <dt>Provider</dt>
                    <dd>{display.providerLabel}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>{display.visibilityLabel}</dd>
                  </div>
                </dl>

                <section className="panel subtle-panel">
                  <h3>No-trade branch claim</h3>
                  <p>{display.baselineClaim}</p>
                  <dl className="deal-economics-grid">
                    <div>
                      <dt>Clearance deadline</dt>
                      <dd>{display.clearingDeadlineLabel}</dd>
                    </div>
                    <div>
                      <dt>Challenge code</dt>
                      <dd>{display.challengeCode}</dd>
                    </div>
                  </dl>
                  <p className="panel-note">{display.challengeInstruction}</p>
                </section>

                <section className="panel subtle-panel">
                  <h3>External evidence</h3>
                  <dl className="deal-economics-grid">
                    <div>
                      <dt>Stream</dt>
                      <dd>
                        {display.streamUrl ? (
                          <a href={display.streamUrl} rel="noreferrer" target="_blank">
                            Open stream
                          </a>
                        ) : (
                          "Not submitted"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Recording</dt>
                      <dd>
                        {display.recordingUrl ? (
                          <a href={display.recordingUrl} rel="noreferrer" target="_blank">
                            Open recording
                          </a>
                        ) : (
                          "Not submitted"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Submitted</dt>
                      <dd>{display.submittedLabel ?? "Not submitted"}</dd>
                    </div>
                    <div>
                      <dt>Review</dt>
                      <dd>{display.reviewSummary ?? "Not reviewed"}</dd>
                    </div>
                  </dl>
                </section>

                {canSubmitRecording ? (
                  <form action={submitFallbackLivestreamRecordingAction} className="compact-form">
                    <input name="fallback_livestream_route_id" type="hidden" value={display.id} />
                    <input
                      name="return_to"
                      type="hidden"
                      value={`/evidence/fallback-livestream/${display.id}`}
                    />
                    <label className="field">
                      <span>Recording URL</span>
                      <input name="fallback_livestream_recording_url" required type="url" />
                    </label>
                    <button className="button button-primary" type="submit">
                      Submit recording
                    </button>
                  </form>
                ) : null}
              </article>
            )}
          </section>
        </MarketplaceRouteShell>
      </main>

      <MarketplaceBottomNav active="track" />
      <SiteFooter />
    </div>
  );
}
