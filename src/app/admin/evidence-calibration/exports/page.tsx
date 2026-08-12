import type { Metadata } from "next";
import Link from "next/link";

import { createEvidenceCredibilityCalibrationExportAction } from "@/app/evidence-credibility-export-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Evidence calibration exports",
  robots: { index: false, follow: false },
};

interface CalibrationExportPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type CalibrationExport = Record<string, unknown>;

function utcMinuteInput(value = new Date()) {
  return value.toISOString().slice(0, 16);
}

function compactHash(value: unknown) {
  const text = String(value ?? "");
  return text.length > 20 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
}

function formatDate(value: unknown) {
  const text = String(value ?? "");
  return text ? <LocalDateTime value={text} fallback={text} /> : "Not set";
}

export default async function EvidenceCalibrationExportPage({
  searchParams,
}: CalibrationExportPageProps) {
  const [viewer, resolvedSearchParams, security] = await Promise.all([
    requireViewer("/admin/evidence-calibration/exports"),
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
        ? "Enroll a verified authenticator factor before creating calibration exports."
        : security?.currentLevel !== "aal2"
          ? "Verify the authenticator for this session before creating calibration exports."
          : "Profile-bound calibration export access verified at AAL2.",
  };
  const formMessage = getFormMessage(resolvedSearchParams);
  const exportResult = access.allowed
    ? await (supabase as any).rpc(
        "list_evidence_credibility_calibration_exports_v1",
        { p_limit: 100, p_offset: 0 },
      )
    : { data: [], error: null };
  const exports: CalibrationExport[] = Array.isArray(exportResult.data)
    ? exportResult.data
    : [];
  const exportError = exportResult.error?.message ?? "";

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

        <section className="section section-white" aria-labelledby="export-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private calibration data plane</p>
            <h1 id="export-heading">Freeze a de-identified analysis export.</h1>
            <p>
              Each export is an immutable JSON Lines snapshot of completed blind-audit labels
              and their frozen prediction features. It excludes raw evidence, storage paths,
              participant identifiers, private rationales, provider references, and exact payment
              amounts. It remains sensitive research data and is not suitable for public release.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Calibration export blocked</strong>
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
                  <p className="detail-kicker">Immutable exports</p>
                  <h2>{exports.length}</h2>
                  <p className="route-text">
                    Existing snapshots cannot be edited, deleted, or regenerated under changed
                    terms.
                  </p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Identity handling</p>
                  <h2>HMAC</h2>
                  <p className="route-text">
                    Grouping keys are export-scoped cryptographic tokens, not raw database IDs.
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
                    <p className="detail-kicker">Preregistration boundary</p>
                    <h2>Commit the analysis plan before freezing the data.</h2>
                    <p className="route-text">
                      Creating an export is irreversible and reveals the held-out labels to
                      authorized administrators. Enter the exact version and SHA-256 digest of
                      the frozen analysis plan, then choose a UTC cutoff. Repeating the same plan
                      hash and cutoff reuses the existing snapshot rather than creating a new one.
                    </p>
                  </div>
                </div>

                <form action={createEvidenceCredibilityCalibrationExportAction} className="stack-form">
                  <label className="field">
                    <span>Frozen analysis-plan version</span>
                    <input
                      maxLength={200}
                      name="analysis_plan_version"
                      placeholder="evidence-credibility-calibration-analysis-v1"
                      required
                      type="text"
                    />
                  </label>

                  <label className="field">
                    <span>SHA-256 of the frozen analysis plan</span>
                    <input
                      autoCapitalize="none"
                      autoComplete="off"
                      inputMode="text"
                      maxLength={64}
                      minLength={64}
                      name="analysis_plan_hash"
                      pattern="[0-9a-f]{64}"
                      placeholder="64 lowercase hexadecimal characters"
                      required
                      spellCheck={false}
                      type="text"
                    />
                  </label>

                  <label className="field">
                    <span>Source cutoff in UTC</span>
                    <input
                      defaultValue={utcMinuteInput()}
                      max={utcMinuteInput()}
                      name="source_cutoff_at"
                      required
                      type="datetime-local"
                    />
                  </label>

                  <label className="checkbox-field">
                    <input name="preregistered_acknowledgement" required type="checkbox" />
                    <span>
                      I confirm that the analysis plan was frozen before I inspected this export
                      and that the file will remain within the private calibration workspace.
                    </span>
                  </label>

                  <PendingSubmitButton pendingLabel="Freezing export…">
                    Create immutable export
                  </PendingSubmitButton>
                </form>
              </article>

              {exportError ? (
                <div className="status-banner status-banner-error">
                  <strong>Export registry unavailable</strong>
                  <p>{exportError}</p>
                </div>
              ) : null}

              <div className="section-head section-head-compact">
                <p className="eyebrow">Immutable registry</p>
                <h2>Download only the exact recorded snapshot.</h2>
                <p>
                  The first JSONL record is the manifest. Each later record contains one
                  de-identified observation plus its row hash. The database records a digest over
                  the ordered row hashes and a separate manifest hash.
                </p>
              </div>

              <div className="data-grid">
                {exports.map((exportRecord) => {
                  const exportId = String(exportRecord.export_id ?? "");
                  return (
                    <article className="panel data-card" key={exportId}>
                      <p className="detail-kicker">
                        {String(exportRecord.export_schema_version ?? "Export")}
                      </p>
                      <h3>{String(exportRecord.analysis_plan_version ?? "Unnamed plan")}</h3>
                      <dl className="detail-list">
                        <div>
                          <dt>Rows</dt>
                          <dd>{String(exportRecord.row_count ?? 0)}</dd>
                        </div>
                        <div>
                          <dt>Source cutoff</dt>
                          <dd>{formatDate(exportRecord.source_cutoff_at)}</dd>
                        </div>
                        <div>
                          <dt>Created</dt>
                          <dd>{formatDate(exportRecord.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Analysis-plan hash</dt>
                          <dd title={String(exportRecord.analysis_plan_hash ?? "")}>
                            <code>{compactHash(exportRecord.analysis_plan_hash)}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Rows digest</dt>
                          <dd title={String(exportRecord.rows_digest ?? "")}>
                            <code>{compactHash(exportRecord.rows_digest)}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Manifest hash</dt>
                          <dd title={String(exportRecord.manifest_hash ?? "")}>
                            <code>{compactHash(exportRecord.manifest_hash)}</code>
                          </dd>
                        </div>
                      </dl>
                      <a
                        className="button button-secondary"
                        href={`/api/admin/evidence-calibration/exports/${exportId}`}
                      >
                        Download immutable JSONL
                      </a>
                    </article>
                  );
                })}

                {!exports.length && !exportError ? (
                  <div className="empty-state">
                    <div>
                      <strong>No immutable calibration export exists.</strong>
                      <p>
                        Freeze the analysis plan before creating the first private snapshot.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="form-actions">
                <Link className="button button-secondary" href="/admin/evidence-calibration/audits">
                  Back to blind audits
                </Link>
                <Link className="button button-secondary" href="/admin/evidence-calibration">
                  Back to capture queue
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
