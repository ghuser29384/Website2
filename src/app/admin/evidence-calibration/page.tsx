import type { Metadata } from "next";
import Link from "next/link";

import {
  recordEvidenceCredibilityCaptureAction,
  recordSettlementCredibilityCaptureAction,
} from "@/app/evidence-credibility-capture-actions";
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
  title: "Evidence calibration capture",
  robots: { index: false, follow: false },
};

interface EvidenceCalibrationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type CaptureRow = Record<string, any>;

const PROVENANCE_OPTIONS = [
  ["platform_observed", "Platform-observed event"],
  ["authenticated_provider", "Authenticated-provider event"],
  ["independent_third_party", "Independent third-party evidence"],
  ["bilateral_confirmation", "Bilateral counterparty confirmation"],
  ["self_report", "Self-report or uncorroborated attestation"],
] as const;

const PROVIDER_STATUS_OPTIONS = [
  ["not_applicable", "Not applicable"],
  ["authenticated", "Authenticated"],
  ["unverified", "Unverified"],
  ["failed", "Failed authentication"],
  ["manual_review_required", "Manual review required"],
] as const;

function humanize(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMoney(cents: unknown, currency: unknown) {
  const numeric = Number(cents);
  if (!Number.isFinite(numeric)) return "Not set";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: String(currency || "USD"),
    }).format(numeric / 100);
  } catch {
    return `${String(currency || "USD")} ${(numeric / 100).toFixed(2)}`;
  }
}

function formatDate(value: unknown) {
  const text = String(value ?? "");
  return text ? <LocalDateTime value={text} fallback={text} /> : "Not set";
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter(Boolean)
    : [];
}

function evidenceTypes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "No evidence items";
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length
    ? entries.map(([type, count]) => `${humanize(type)}: ${String(count)}`).join(" · ")
    : "No evidence items";
}

function readRows(result: { data?: unknown; error?: { message?: string } | null }) {
  return {
    rows: Array.isArray(result.data) ? (result.data as CaptureRow[]) : [],
    error: result.error?.message ?? "",
  };
}

function HiddenCaptureContext({
  row,
  kind,
}: {
  row: CaptureRow;
  kind: "evidence" | "settlement";
}) {
  if (kind === "evidence") {
    return (
      <>
        <input name="milestone_id" type="hidden" value={String(row.milestone_id)} />
        <input name="review_id" type="hidden" value={String(row.final_review_id ?? "")} />
        <input
          name="supersedes_decision_id"
          type="hidden"
          value={String(row.current_decision_id ?? "")}
        />
      </>
    );
  }

  return (
    <>
      <input name="payout_id" type="hidden" value={String(row.payout_id)} />
      <input
        name="payment_review_decision_id"
        type="hidden"
        value={String(row.payment_review_decision_id ?? "")}
      />
      <input
        name="supersedes_decision_id"
        type="hidden"
        value={String(row.current_decision_id ?? "")}
      />
    </>
  );
}

function SharedEvidenceFields() {
  return (
    <>
      <label className="field">
        <span>Decision confidence</span>
        <select name="decision_confidence_band" defaultValue="" required>
          <option disabled value="">
            Choose a separate factual-confidence band
          </option>
          <option value="100">100 — very strong factual basis</option>
          <option value="75">75 — strong, materially uncertain</option>
          <option value="50">50 — substantial uncertainty</option>
          <option value="25">25 — weak but adjudicable</option>
          <option value="0">0 — no usable factual conclusion</option>
        </select>
      </label>

      <label className="field">
        <span>Relied-on provenance</span>
        <select name="primary_provenance_class" defaultValue="" required>
          <option disabled value="">
            Choose the source actually relied upon
          </option>
          {PROVENANCE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Provider authentication</span>
        <select
          name="provider_authentication_status"
          defaultValue="not_applicable"
          required
        >
          {PROVIDER_STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Private provider reference</span>
        <input
          autoComplete="off"
          maxLength={500}
          name="provider_authentication_ref"
          placeholder="Required only for authenticated-provider provenance"
          type="text"
        />
      </label>
    </>
  );
}

function EvidenceCaptureCard({ row }: { row: CaptureRow }) {
  const finalityReasons = asTextArray(row.allowed_finality_reasons);
  const returnTo = "/admin/evidence-calibration";

  return (
    <article className="panel data-card data-card-wide">
      <div className="profile-card-head">
        <div>
          <p className="detail-kicker">
            Evidence decision · milestone {String(row.position ?? "—")}
          </p>
          <h3>{humanize(row.action_category)}</h3>
          <p className="route-text">{String(row.description ?? "")}</p>
        </div>
        <span className="status-pill status-pill-neutral">
          {row.requires_supersession ? "Supersession required" : "Missing capture"}
        </span>
      </div>

      <dl className="detail-list">
        <div>
          <dt>Frozen obligation</dt>
          <dd>
            {String(row.units_total)} {String(row.unit_label)} ·{" "}
            {formatMoney(row.maximum_amount_cents, row.currency)}
          </dd>
        </div>
        <div>
          <dt>Frozen evidence rule</dt>
          <dd>{String(row.evidence_rule ?? "Not set")}</dd>
        </div>
        <div>
          <dt>No-trade baseline</dt>
          <dd>{String(row.no_trade_baseline ?? "Not set")}</dd>
        </div>
        <div>
          <dt>Submitted packet</dt>
          <dd>
            {String(row.evidence_item_count ?? 0)} item(s) ·{" "}
            {evidenceTypes(row.evidence_type_counts)}
          </dd>
        </div>
        <div>
          <dt>Current final review</dt>
          <dd>
            {row.final_review_id
              ? `${humanize(row.review_kind)} · ${humanize(
                  row.review_outcome,
                )} · ${String(row.completion_units)} / ${String(
                  row.units_total,
                )} units · payout factor ${String(row.payout_factor_band)}`
              : "No-review terminal lifecycle state"}
          </dd>
        </div>
        <div>
          <dt>Finalized</dt>
          <dd>{formatDate(row.review_finalized_at)}</dd>
        </div>
        {row.current_decision_id ? (
          <div>
            <dt>Current shadow decision</dt>
            <dd>
              {humanize(row.current_decision_finality_reason)} ·{" "}
              {humanize(row.current_decision_status)} · completion{" "}
              {String(row.current_completion_fraction ?? "not numerical")}
            </dd>
          </div>
        ) : null}
      </dl>

      <form action={recordEvidenceCredibilityCaptureAction} className="stack-form">
        <HiddenCaptureContext kind="evidence" row={row} />
        <input name="return_to" type="hidden" value={returnTo} />

        <SharedEvidenceFields />

        <label className="field">
          <span>Contradiction status</span>
          <select name="contradiction_status" defaultValue="not_assessed" required>
            <option value="not_assessed">Not assessed</option>
            <option value="none">None</option>
            <option value="innocent">Innocent contradiction</option>
            <option value="materially_reckless">Materially reckless</option>
            <option value="deliberate">Deliberate</option>
          </select>
        </label>

        <label className="field">
          <span>Evidence-integrity finding</span>
          <select name="integrity_finding" defaultValue="not_assessed" required>
            <option value="not_assessed">Not assessed</option>
            <option value="supported_honest">Supported honest conduct</option>
            <option value="reckless_misleading">Recklessly misleading</option>
            <option value="deliberate_fabrication">Deliberate fabrication</option>
          </select>
        </label>

        <label className="field">
          <span>Responsiveness finding</span>
          <select name="responsiveness_finding" defaultValue="not_assessed" required>
            <option value="not_assessed">Not assessed</option>
            <option value="on_time">On time</option>
            <option value="late_cure">Late cure</option>
            <option value="missed_deadline">Missed deadline</option>
            <option value="excused">Excused</option>
          </select>
        </label>

        <label className="field">
          <span>Dispute-conduct finding</span>
          <select name="dispute_conduct_finding" defaultValue="not_assessed" required>
            <option value="not_assessed">Not assessed</option>
            <option value="cooperative">Cooperative</option>
            <option value="obstructive">Obstructive</option>
            <option value="retaliatory">Retaliatory</option>
            <option value="evidence_destruction">Evidence destruction</option>
            <option value="abusive_appeal">Abusive appeal</option>
          </select>
        </label>

        <label className="field">
          <span>Finality reason</span>
          <select
            name="finality_reason"
            defaultValue={String(row.suggested_finality_reason ?? "")}
            required
          >
            {finalityReasons.map((reason) => (
              <option key={reason} value={reason}>
                {humanize(reason)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Private exclusion or review-required reason</span>
          <textarea
            maxLength={1000}
            name="exclusion_reason"
            placeholder="Required for excluded outcomes, unresolved disputes, and confidence 0"
            rows={3}
          />
        </label>

        <label className="field">
          <span>Private capture rationale</span>
          <textarea
            maxLength={4000}
            name="private_rationale"
            placeholder="Explain the factual basis for confidence, provenance, and explicit conduct findings. This is immutable and never public."
            required
            rows={5}
          />
        </label>

        <div className="form-actions">
          <PendingSubmitButton pendingLabel="Recording private capture…">
            {row.requires_supersession
              ? "Record superseding shadow decision"
              : "Record private shadow decision"}
          </PendingSubmitButton>
          <Link
            className="button button-secondary"
            href={`/trade-agreements/${String(row.agreement_id)}`}
          >
            Open frozen agreement
          </Link>
        </div>
      </form>
    </article>
  );
}

function SettlementCaptureCard({ row }: { row: CaptureRow }) {
  const finalityReasons = asTextArray(row.allowed_finality_reasons);
  const returnTo = "/admin/evidence-calibration";

  return (
    <article className="panel data-card data-card-wide">
      <div className="profile-card-head">
        <div>
          <p className="detail-kicker">Settlement decision</p>
          <h3>{humanize(row.action_category)}</h3>
          <p className="route-text">
            Final external amount: {formatMoney(row.amount_due_cents, row.currency)}
          </p>
        </div>
        <span className="status-pill status-pill-neutral">
          {row.requires_supersession ? "Supersession required" : "Missing capture"}
        </span>
      </div>

      <dl className="detail-list">
        <div>
          <dt>Payout state</dt>
          <dd>
            {humanize(row.payout_status)} · maximum{" "}
            {formatMoney(row.maximum_amount_cents, row.currency)}
          </dd>
        </div>
        <div>
          <dt>Payment adjudication</dt>
          <dd>
            {row.payment_review_decision_id
              ? `${humanize(row.payment_decision_kind)} · ${humanize(
                  row.payment_decision_outcome,
                )}`
              : humanize(row.derived_adjudication_class)}
          </dd>
        </div>
        <div>
          <dt>Finalized</dt>
          <dd>
            {formatDate(
              row.payment_decision_finalized_at ?? row.payout_finalized_at,
            )}
          </dd>
        </div>
        {row.current_decision_id ? (
          <div>
            <dt>Current shadow decision</dt>
            <dd>
              {humanize(row.current_decision_finality_reason)} ·{" "}
              {humanize(row.current_decision_status)} · outcome{" "}
              {String(row.current_outcome ?? "not numerical")}
            </dd>
          </div>
        ) : null}
      </dl>

      <form
        action={recordSettlementCredibilityCaptureAction}
        className="stack-form"
      >
        <HiddenCaptureContext kind="settlement" row={row} />
        <input name="return_to" type="hidden" value={returnTo} />

        <SharedEvidenceFields />

        <label className="field">
          <span>Finality reason</span>
          <select
            name="finality_reason"
            defaultValue={String(row.suggested_finality_reason ?? "")}
            required
          >
            {finalityReasons.map((reason) => (
              <option key={reason} value={reason}>
                {humanize(reason)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Private exclusion or review-required reason</span>
          <textarea
            maxLength={1000}
            name="exclusion_reason"
            placeholder="Required for not-due, permissible-cancellation, unresolved, and confidence 0 decisions"
            rows={3}
          />
        </label>

        <label className="field">
          <span>Private capture rationale</span>
          <textarea
            maxLength={4000}
            name="private_rationale"
            placeholder="Explain the factual basis for the settlement confidence and provenance. This is immutable and never public."
            required
            rows={5}
          />
        </label>

        <div className="form-actions">
          <PendingSubmitButton pendingLabel="Recording private capture…">
            {row.requires_supersession
              ? "Record superseding settlement decision"
              : "Record private settlement decision"}
          </PendingSubmitButton>
          <Link
            className="button button-secondary"
            href={`/trade-agreements/${String(row.agreement_id)}`}
          >
            Open frozen agreement
          </Link>
        </div>
      </form>
    </article>
  );
}

export default async function EvidenceCalibrationPage({
  searchParams,
}: EvidenceCalibrationPageProps) {
  const [viewer, resolvedSearchParams, security] = await Promise.all([
    requireViewer("/admin/evidence-calibration"),
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
      security?.verifiedTotpCount >= 1 &&
      security.currentLevel === "aal2",
    message: !hasAdministratorRole
      ? "This profile does not have an active Moral Trade administrator grant."
      : security?.verifiedTotpCount < 1
        ? "Enroll a verified authenticator factor before using private calibration capture."
        : security.currentLevel !== "aal2"
          ? "Verify the authenticator for this session before using private calibration capture."
          : "Profile-bound administrator access verified at AAL2.",
  };

  const formMessage = getFormMessage(resolvedSearchParams);
  const [evidenceQueue, settlementQueue] = access.allowed
    ? await Promise.all([
        (supabase as any).rpc("list_trade_evidence_shadow_capture_queue_v1", {
          p_limit: 100,
          p_offset: 0,
        }),
        (supabase as any).rpc("list_trade_settlement_shadow_capture_queue_v1", {
          p_limit: 100,
          p_offset: 0,
        }),
      ])
    : [{ data: [] }, { data: [] }];

  const evidence = readRows(evidenceQueue);
  const settlements = readRows(settlementQueue);
  const queueError = evidence.error || settlements.error;

  return (
    <div className="page-shell marketplace-app-shell trade-workflow-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
          showSearch={false}
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

        <section
          aria-labelledby="evidence-calibration-heading"
          className="section section-white"
        >
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private shadow instrumentation</p>
            <h1 id="evidence-calibration-heading">
              Capture final evidence and settlement decisions for calibration.
            </h1>
            <p>
              This AAL2-administrator surface records immutable private shadow
              observations. It does not change public credibility, discovery ranking,
              exposure, safeguards, eligibility, restrictions, payment movement, or
              causal-impact estimates.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Private capture access blocked</strong>
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
          ) : queueError ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Fail-closed queue read</strong>
                <p>{queueError}</p>
              </div>
            </article>
          ) : (
            <>
              <div className="pilot-metric-grid">
                <article className="panel data-card">
                  <p className="detail-kicker">Evidence captures due</p>
                  <h2>{evidence.rows.length}</h2>
                  <p className="route-text">
                    Final milestone outcomes without the current shadow observation.
                  </p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Settlement captures due</p>
                  <h2>{settlements.rows.length}</h2>
                  <p className="route-text">
                    Final noncustodial payment outcomes without the current shadow
                    observation.
                  </p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Activation boundary</p>
                  <h2>Fail closed</h2>
                  <p className="route-text">
                    Queue RPCs refuse service unless every active-effect switch remains
                    false.
                  </p>
                </article>
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Factual completion</p>
                <h2>Evidence decisions awaiting private capture.</h2>
                <p>
                  Record the final completion fraction separately from the operator’s
                  confidence and the source actually relied upon. Weak evidence is not
                  itself misconduct; integrity findings require an explicit basis.
                </p>
              </div>
              <div className="data-grid">
                {evidence.rows.map((row) => (
                  <EvidenceCaptureCard key={String(row.milestone_id)} row={row} />
                ))}
                {!evidence.rows.length ? (
                  <div className="empty-state">
                    <div>
                      <strong>No final evidence outcome needs capture.</strong>
                      <p>
                        Pending reviews and appeals are deliberately absent until they
                        become terminal.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Noncustodial settlement</p>
                <h2>Settlement decisions awaiting private capture.</h2>
                <p>
                  Moral Trade records whether the externally settled amount was paid; it
                  does not hold, release, refund, or transfer participant funds.
                </p>
              </div>
              <div className="data-grid">
                {settlements.rows.map((row) => (
                  <SettlementCaptureCard key={String(row.payout_id)} row={row} />
                ))}
                {!settlements.rows.length ? (
                  <div className="empty-state">
                    <div>
                      <strong>No final settlement outcome needs capture.</strong>
                      <p>
                        Due, disputed, and appeal-pending amounts remain outside this
                        terminal queue.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
