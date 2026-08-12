import type { Metadata } from "next";
import Link from "next/link";

import {
  assignEvidenceCredibilityAuditAction,
  materializeEvidenceCredibilityAuditDrawsAction,
} from "@/app/evidence-credibility-audit-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { listTradeReviewerCandidates } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Evidence calibration audits",
  robots: { index: false, follow: false },
};

interface AuditAdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type AuditDraw = Record<string, any>;
type ReviewerCandidate = { id: string; label: string };

function formatDate(value: unknown) {
  const text = String(value ?? "");
  return text ? <LocalDateTime value={text} fallback={text} /> : "Not set";
}

function humanize(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("|", " · ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function asIdSet(value: unknown) {
  return new Set(
    Array.isArray(value)
      ? value.map((entry) => String(entry)).filter(Boolean)
      : [],
  );
}

export default async function EvidenceCalibrationAuditAdminPage({
  searchParams,
}: AuditAdminPageProps) {
  const [viewer, resolvedSearchParams, security] = await Promise.all([
    requireViewer("/admin/evidence-calibration/audits"),
    searchParams,
    loadBackgroundAccountSecuritySummary(),
  ]);
  const supabase = await createClient();
  const { data: administratorGrant } = await (supabase as any)
    .from("trade_review_role_grants")
    .select("profile_id")
    .eq("profile_id", viewer.authUser.id)
    .eq("role", "administrator")
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();
  const hasAdministratorRole = Boolean(administratorGrant?.profile_id);
  const access = {
    allowed:
      hasAdministratorRole &&
      (security?.verifiedTotpCount ?? 0) >= 1 &&
      security?.currentLevel === "aal2",
    message: !hasAdministratorRole
      ? "This profile does not have an active Moral Trade administrator grant."
      : (security?.verifiedTotpCount ?? 0) < 1
        ? "Enroll a verified authenticator factor before administering calibration audits."
        : security?.currentLevel !== "aal2"
          ? "Verify the authenticator for this session before administering calibration audits."
          : "Profile-bound calibration administration verified at AAL2.",
  };
  const formMessage = getFormMessage(resolvedSearchParams);

  const [drawResult, reviewerCandidates] = access.allowed
    ? await Promise.all([
        (supabase as any).rpc(
          "list_evidence_credibility_calibration_assignment_queue_v1",
          { p_limit: 200, p_offset: 0 },
        ),
        listTradeReviewerCandidates(),
      ])
    : [{ data: [], error: null }, []];
  const draws: AuditDraw[] = Array.isArray(drawResult.data) ? drawResult.data : [];
  const queueError = drawResult.error?.message ?? "";

  return (
    <div className="page-shell marketplace-app-shell trade-workflow-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error"
                ? "status-banner-error"
                : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="audit-admin-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private calibration control plane</p>
            <h1 id="audit-admin-heading">Assign blinded second reviews.</h1>
            <p>
              Every terminal shadow decision receives an immutable sampling draw. Selected
              cases can be assigned only to a different active reviewer who is not a party to
              the agreement. Assignment does not change the underlying decision or any active
              credibility output.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Calibration administration blocked</strong>
                <p>{access.message}</p>
              </div>
              <div className="form-actions">
                <Link className="button button-primary" href="/dashboard">
                  Open account security
                </Link>
                <Link className="button button-secondary" href="/admin">
                  Back to admin
                </Link>
              </div>
            </article>
          ) : (
            <>
              <div className="pilot-metric-grid">
                <article className="panel data-card">
                  <p className="detail-kicker">Unassigned selected draws</p>
                  <h2>{draws.length}</h2>
                  <p className="route-text">
                    Draws remain private and cannot affect participant-facing systems.
                  </p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Random floor</p>
                  <h2>10%</h2>
                  <p className="route-text">
                    Mandatory strata receive 100% inclusion; all probabilities are recorded.
                  </p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Admin gate</p>
                  <h2>Verified</h2>
                  <p className="route-text">{access.message}</p>
                </article>
              </div>

              <article className="panel data-card data-card-wide">
                <div className="profile-card-head">
                  <div>
                    <p className="detail-kicker">Sampling intake</p>
                    <h2>Draw every newly eligible terminal decision.</h2>
                    <p className="route-text">
                      The action records selected and nonselected cases, exact inclusion
                      probabilities, a committed random seed, and the frozen pre-audit
                      prediction snapshot. Re-running does not redraw existing decisions.
                    </p>
                  </div>
                </div>
                <form action={materializeEvidenceCredibilityAuditDrawsAction}>
                  <PendingSubmitButton pendingLabel="Materializing draws…">
                    Materialize new calibration draws
                  </PendingSubmitButton>
                </form>
              </article>

              {queueError ? (
                <div className="status-banner status-banner-error">
                  <strong>Assignment queue unavailable</strong>
                  <p>{queueError}</p>
                </div>
              ) : null}

              <div className="section-head section-head-compact">
                <p className="eyebrow">Independent reviewer assignment</p>
                <h2>Resolve conflicts before assignment.</h2>
                <p>
                  The database rejects the original reviewer, performer, payer, and any other
                  party encoded in the draw. Reviewers receive a blinded case code rather than
                  participant identifiers or the original calibration features.
                </p>
              </div>

              <div className="data-grid">
                {draws.map((draw) => {
                  const excluded = asIdSet(draw.excluded_reviewer_ids);
                  const eligibleReviewers = (reviewerCandidates as ReviewerCandidate[]).filter(
                    (reviewer) => !excluded.has(reviewer.id),
                  );

                  return (
                    <form
                      action={assignEvidenceCredibilityAuditAction}
                      className="panel stack-form"
                      key={String(draw.draw_id)}
                    >
                      <input name="draw_id" type="hidden" value={String(draw.draw_id)} />
                      <input
                        name="request_key"
                        type="hidden"
                        value={`admin-assignment:${String(draw.draw_id)}`}
                      />
                      <p className="detail-kicker">{String(draw.case_code)}</p>
                      <h3>
                        {humanize(draw.target_type)} · {humanize(draw.action_category)}
                      </h3>
                      <dl className="detail-list">
                        <div>
                          <dt>Sampling stratum</dt>
                          <dd>{humanize(draw.sampling_stratum)}</dd>
                        </div>
                        <div>
                          <dt>Inclusion probability</dt>
                          <dd>{(Number(draw.inclusion_probability) * 100).toFixed(2)}%</dd>
                        </div>
                        <div>
                          <dt>Selection basis</dt>
                          <dd>{humanize(draw.selected_reason)}</dd>
                        </div>
                        <div>
                          <dt>Decision finalized</dt>
                          <dd>{formatDate(draw.decision_finalized_at)}</dd>
                        </div>
                      </dl>

                      <label className="field">
                        <span>Independent active reviewer</span>
                        <select name="reviewer_id" defaultValue="" required>
                          <option disabled value="">
                            Choose a conflict-free reviewer
                          </option>
                          {eligibleReviewers.map((reviewer) => (
                            <option key={reviewer.id} value={reviewer.id}>
                              {reviewer.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <PendingSubmitButton
                        disabled={!eligibleReviewers.length}
                        pendingLabel="Assigning blind audit…"
                      >
                        Assign independent audit
                      </PendingSubmitButton>

                      {!eligibleReviewers.length ? (
                        <p className="form-hint">
                          No active reviewer remains after applying the party and original-reviewer
                          conflicts.
                        </p>
                      ) : null}
                    </form>
                  );
                })}

                {!draws.length && !queueError ? (
                  <div className="empty-state">
                    <div>
                      <strong>No selected draw is awaiting assignment.</strong>
                      <p>
                        Materialize newly eligible decisions or wait for additional terminal
                        shadow outcomes.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="form-actions">
                <Link className="button button-secondary" href="/admin/evidence-calibration">
                  Back to capture queue
                </Link>
                <Link className="button button-secondary" href="/admin">
                  Back to admin
                </Link>
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
