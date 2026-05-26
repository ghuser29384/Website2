import type { Metadata } from "next";
import Link from "next/link";

import { isAdminEmail } from "@/lib/admin";
import { EveryOrgDonateButton } from "@/components/donate/every-org-donate-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { EVERY_ORG_CURATED_TARGETS } from "@/lib/every-org";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  finalizePriorityCorrectionCycleAction,
  logImpactContributionAction,
  publishPriorityCorrectionCycleAction,
  recordPriorityCauseAreaFeedbackAction,
  recordPriorityCauseAreaPositionAction,
  recordPrioritySpecificActionFeedbackAction,
  recordPrioritySpecificActionPositionAction,
  submitPriorityCauseAreaAllocationAction,
  submitPrioritySpecificActionReasoningAction,
} from "@/app/actions";
import { getPriorityCorrectionPageData } from "@/lib/priority-correction";

export const metadata: Metadata = {
  title: "Priority Correction Fund",
  description:
    "Monthly Moral Trade process for redirecting 10% of recent donations and member-to-member payments toward the likely best current cause area and specific actions.",
  alternates: {
    canonical: "/priority-correction-fund",
  },
};

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

interface PriorityCorrectionFundPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PriorityCorrectionFundPage({
  searchParams,
}: PriorityCorrectionFundPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;
  const pageData = supabaseReady
    ? await getPriorityCorrectionPageData(viewer?.authUser.id ?? null)
    : null;
  const isAdmin = Boolean(viewer?.authUser.email && isAdminEmail(viewer.authUser.email));
  const currentCycle = pageData?.currentCycle ?? null;
  const viewerSnapshot = pageData?.viewerSnapshot ?? null;
  const viewerAssignments = pageData?.viewerAssignments ?? [];
  const latestAllocation = pageData?.latestAllocation ?? null;
  const defaultContributionCause = readParam(resolvedSearchParams.cause) ?? "";
  const defaultContributionTarget = readParam(resolvedSearchParams.target) ?? "";
  const defaultContributionSource = readParam(resolvedSearchParams.source) ?? "";
  const defaultContributionTargetLabel =
    EVERY_ORG_CURATED_TARGETS.find((target) => target.id === defaultContributionTarget)?.title ??
    defaultContributionTarget;
  const causeAreaAssignmentSet = new Set(
    viewerAssignments
      .filter((assignment) => assignment.role === "specific_action_arbiter" && assignment.cause_area)
      .map((assignment) => assignment.cause_area ?? ""),
  );
  const isCauseAreaArbiter = viewerAssignments.some((assignment) => assignment.role === "cause_area_arbiter");

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
            <p className="eyebrow">Priority Correction Fund</p>
            <h1>Redirect a fixed share of recent money toward the most compelling current priority.</h1>
            <p className="hero-text">
              Moral Trade calculates this fund as 10% of each member&apos;s recent donations plus
              10% of each member&apos;s recent payments to other members. Each month then moves
              through a published two-stage reasoning process: first within cause areas, then
              across cause areas.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/methodology">
                Read methodology
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Monthly sequence</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Publish the month</strong>
                  <p>The fund is computed from the previous calendar month and published with any carryover.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Cause-specific action review</strong>
                  <p>Five cause-specific arbiters can publish a combination only after at least three agree.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Community-wide allocation</strong>
                  <p>Seven cycle-wide arbiters decide how much of the month&apos;s fund should go to each cause area.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!supabaseReady ? (
          <div className="status-banner status-banner-error">
            Supabase is not configured yet. Add environment variables and apply the SQL schema
            before using the live Priority Correction Fund workflow.
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

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Process record</p>
            <h2>Monthly cycles publish the calculation and the selection rule</h2>
            <p>
              The mechanism is not a hidden recommendation feed. A published cycle records the
              previous-month money base, any carryover, assigned arbiters, selection pools, support
              counts, reasoning, and dissent notes.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Fund calculation</h3>
              <p>
                The monthly base is 10% of verified donations plus 10% of verified member-to-member
                payments recorded for the previous month, then adjusted for any published carryover.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Specific-action arbiters</h3>
              <p>
                Each cause area can receive up to five randomly selected arbiters from members in
                the top 10% of karma for that cycle, excluding members who recently served.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Community-wide arbiters</h3>
              <p>
                Seven cycle-wide arbiters are selected from high-karma members with diverse cause
                priorities. Their allocation reasoning is recorded before a cycle is finalized.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Current month</p>
            <h2>Fund overview</h2>
            <p>
              The current cycle uses the previous month&apos;s donations and member-to-member
              payments, then publishes reasonings and dissent under fixed UTC deadlines.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            {currentCycle ? (
              <>
                <div className="tag-row">
                  <span className="badge">{currentCycle.status.replaceAll("_", " ")}</span>
                  <span className="source-pill">
                    Cycle month {formatDateOnly(currentCycle.cycle_month)}
                  </span>
                </div>
                <dl className="values-summary">
                  <div>
                    <dt>Previous-month calculation</dt>
                    <dd>{formatCurrency(currentCycle.calculated_fund_cents)}</dd>
                  </div>
                  <div>
                    <dt>Carryover in</dt>
                    <dd>{formatCurrency(currentCycle.carryover_in_cents)}</dd>
                  </div>
                  <div>
                    <dt>Published fund</dt>
                    <dd>{formatCurrency(currentCycle.published_fund_cents)}</dd>
                  </div>
                  <div>
                    <dt>Specific-action due</dt>
                    <dd>{formatDateTime(currentCycle.specific_actions_due_at)}</dd>
                  </div>
                  <div>
                    <dt>Specific-action revision due</dt>
                    <dd>{formatDateTime(currentCycle.specific_actions_revision_due_at)}</dd>
                  </div>
                  <div>
                    <dt>Cause-area due</dt>
                    <dd>{formatDateTime(currentCycle.cause_area_due_at)}</dd>
                  </div>
                  <div>
                    <dt>Cause-area revision due</dt>
                    <dd>{formatDateTime(currentCycle.cause_area_revision_due_at)}</dd>
                  </div>
                </dl>
                {currentCycle.reserve_reason ? (
                  <p className="route-text">{currentCycle.reserve_reason}</p>
                ) : null}
              </>
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No cycle has been published yet.</strong>
                  <p>Once a month is published, this page will show the fund, arbiters, and reasonings.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {viewer ? (
          <section className="section section-white">
            <div className="section-head">
              <p className="eyebrow">Your standing</p>
              <h2>Contribution share and priority snapshot</h2>
              <p>
                Your current priority cause is inferred from the largest share of your recorded
                monetary or money-equivalent contributions.
              </p>
            </div>

            <div className="field-grid">
              <article className="panel data-card">
                {viewerSnapshot ? (
                  <>
                    <div className="tag-row">
                      <span className="badge">
                        {viewerSnapshot.prioritized_cause_area ?? "No priority cause yet"}
                      </span>
                      <span className="source-pill">
                        {viewerSnapshot.prioritized_share_basis_points / 100}% of recorded contribution value
                      </span>
                    </div>
                    <dl className="values-summary">
                      <div>
                        <dt>Recent donations</dt>
                        <dd>{formatCurrency(viewerSnapshot.donation_cents)}</dd>
                      </div>
                      <div>
                        <dt>Recent member payments</dt>
                        <dd>{formatCurrency(viewerSnapshot.peer_payment_cents)}</dd>
                      </div>
                      <div>
                        <dt>Your fund contribution this month</dt>
                        <dd>{formatCurrency(viewerSnapshot.fund_share_cents)}</dd>
                      </div>
                      <div>
                        <dt>Lifetime recorded contribution value</dt>
                        <dd>{formatCurrency(viewerSnapshot.lifetime_contribution_cents)}</dd>
                      </div>
                    </dl>
                    {viewerAssignments.length ? (
                      <p className="route-text">
                        You are currently assigned to{" "}
                        {viewerAssignments
                          .map((assignment) =>
                            assignment.role === "specific_action_arbiter"
                              ? `${assignment.cause_area} specific-action review`
                              : "cycle-wide cause-area allocation"
                          )
                          .join(", ")}
                        .
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No current snapshot yet.</strong>
                      <p>Log donations or money-equivalent contributions to make your current priority visible.</p>
                    </div>
                  </div>
                )}
              </article>

              <article className="panel data-card" id="record-gift">
                <div className="section-head auth-head">
                  <p className="eyebrow">Contribution log</p>
                  <h3>Add a donation or money-equivalent contribution</h3>
                  <p>
                    Use this for off-platform charitable donations or other monetary contributions
                    you want included in cause-priority inference.
                  </p>
                </div>
                <div className="donation-inline-strip">
                  <p className="route-text">
                    Need a direct giving route first? Use Every.org, then log the donation below
                    so it enters the Priority Correction Fund calculation.
                  </p>
                  <div className="offer-actions">
                    {EVERY_ORG_CURATED_TARGETS.map((target) => (
                      <EveryOrgDonateButton
                        key={target.id}
                        className="button button-secondary button-mini"
                        label={`Donate: ${target.causeAreas[0]}`}
                        target={target}
                      />
                    ))}
                    <Link className="text-button" href="/donate">
                      See all donation routes
                    </Link>
                  </div>
                </div>
                <form action={logImpactContributionAction} className="stack-form">
                  <input name="return_to" type="hidden" value="/priority-correction-fund" />
                  <div className="field-grid">
                    <label className="field">
                      <span>Kind</span>
                      <select defaultValue="donation" name="contribution_kind">
                        <option value="donation">Donation</option>
                        <option value="money_equivalent">Money-equivalent contribution</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Cause area</span>
                      <input
                        defaultValue={defaultContributionCause}
                        name="cause_area"
                        placeholder="Animal welfare, S-risks, global poverty"
                      />
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Amount in USD</span>
                      <input min="0.01" name="amount_dollars" step="0.01" type="number" />
                    </label>
                    <label className="field">
                      <span>Date</span>
                      <input name="occurred_at" type="date" />
                    </label>
                  </div>
                  <label className="field">
                    <span>Specific action or recipient</span>
                    <input
                      defaultValue={defaultContributionTargetLabel}
                      name="action_label"
                      placeholder="GiveWell top charity, humane pesticides pilot, cage-free policy work"
                    />
                  </label>
                  <label className="field">
                    <span>Evidence notes</span>
                    <textarea
                      defaultValue={
                        defaultContributionSource
                          ? `Donation route source: ${defaultContributionSource}. Add receipt, transfer note, or Every.org confirmation details here.`
                          : undefined
                      }
                      name="evidence_note"
                      placeholder="Receipt, transfer note, public post, or other corroborating record."
                      rows={3}
                    />
                  </label>
                  <label className="field">
                    <span>Evidence URL</span>
                    <input name="evidence_url" placeholder="https://..." type="url" />
                  </label>
                  <div className="form-actions">
                    <button className="button button-primary" type="submit">
                      Log contribution
                    </button>
                  </div>
                </form>
              </article>
            </div>
          </section>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Stage one</p>
            <h2>Specific-action combinations inside each cause area</h2>
            <p>
              Five randomly selected arbiters from the top 10% of community karma, among members
              currently prioritizing the cause area, can publish a cause-specific combination once
              at least three agree.
            </p>
          </div>

          <div className="stack-cards">
            {(pageData?.causeAreaSummaries ?? []).map((summary) => {
              const latestSubmission = summary.latestSubmission;
              const latestSubmissionDissentNotes = (pageData?.specificActionPositions ?? [])
                .filter(
                  (position) =>
                    latestSubmission &&
                    position.submission_id === latestSubmission.id &&
                    position.stance === "dissent" &&
                    position.note,
                )
                .map((position) => position.note);
              const viewerPrioritizesThisCause =
                pageData?.viewerSnapshot?.prioritized_cause_area === summary.causeArea;

              return (
                <article key={summary.causeArea} className="panel data-card data-card-wide">
                  <div className="section-head auth-head">
                    <p className="eyebrow">{summary.causeArea}</p>
                    <h3>{summary.causeArea} review</h3>
                    <p>
                      Eligible members this month: {summary.eligibleMemberCount}. Assigned
                      arbiters: {summary.specificActionArbiters.length}. Anonymous support counts
                      are published below.
                    </p>
                  </div>

                  <div className="tag-row">
                    <span className="badge">
                      {latestSubmission ? latestSubmission.status.replaceAll("_", " ") : "Awaiting reasoning"}
                    </span>
                    <span className="source-pill">
                      {summary.agreeCount} agree | {summary.dissentCount} dissent | {summary.feedbackCount} community responses
                    </span>
                  </div>

                  {latestSubmission ? (
                    <>
                      <h4>{latestSubmission.title}</h4>
                      <p className="route-text">{latestSubmission.combination_summary}</p>
                      {latestSubmission.reasoning ? (
                        <p className="route-text">{latestSubmission.reasoning}</p>
                      ) : null}
                      {latestSubmission.allocation_schedule.length ? (
                        <div className="mini-list">
                          {latestSubmission.allocation_schedule.map((row) => (
                            <div key={`${summary.causeArea}-${row.label}-${row.text}`} className="mini-list-item">
                              <strong>{row.label || "Allocation"}</strong>
                              <span>{row.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {latestSubmission.effect_schedule.length ? (
                        <div className="mini-list">
                          {latestSubmission.effect_schedule.map((row) => (
                            <div key={`${summary.causeArea}-effect-${row.label}-${row.text}`} className="mini-list-item">
                              <strong>{row.label || "Expected effect"}</strong>
                              <span>{row.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {latestSubmissionDissentNotes.length ? (
                        <div className="mini-list">
                          {latestSubmissionDissentNotes.map((note, index) => (
                            <div key={`${summary.causeArea}-dissent-${index}`} className="mini-list-item">
                              <strong>Dissenting reasoning</strong>
                              <span>{note}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="route-text">
                      No cause-specific reasoning has been published yet for {summary.causeArea}.
                    </p>
                  )}

                  {viewer && currentCycle && causeAreaAssignmentSet.has(summary.causeArea) ? (
                    <div className="field-grid">
                      <form action={submitPrioritySpecificActionReasoningAction} className="stack-form panel">
                        <input name="return_to" type="hidden" value="/priority-correction-fund" />
                        <input name="cycle_id" type="hidden" value={currentCycle.id} />
                        <input name="cause_area" type="hidden" value={summary.causeArea} />
                        <label className="field">
                          <span>Reasoning title</span>
                          <input name="title" placeholder="Highest-impact combination for this month" />
                        </label>
                        <label className="field">
                          <span>Combination summary</span>
                          <textarea
                            name="combination_summary"
                            placeholder="State the combination of specific actions and why it dominates nearby alternatives."
                            rows={3}
                          />
                        </label>
                        <label className="field">
                          <span>Allocation schedule</span>
                          <textarea
                            name="allocation_schedule"
                            placeholder={"<=500: 40% action X | 30% action Y | 30% action Z\n501-4000: 50% action X | 25% action Y | 25% action Z\n4001+: 60% action X | 20% action Y | 20% action Z"}
                            rows={4}
                          />
                        </label>
                        <label className="field">
                          <span>Expected effects by spend level</span>
                          <textarea
                            name="effect_schedule"
                            placeholder={"5%: expected effect ...\n10%: expected effect ...\n20%: expected effect ...\n...\n100%: expected effect ..."}
                            rows={6}
                          />
                        </label>
                        <label className="field">
                          <span>Reasoning</span>
                          <textarea
                            name="reasoning"
                            placeholder="Summarize the empirical and moral case, uncertainties, and why this combination is the best use inside the cause area."
                            rows={5}
                          />
                        </label>
                        <div className="form-actions">
                          <button className="button button-primary button-mini" type="submit">
                            Submit draft
                          </button>
                        </div>
                      </form>

                      {latestSubmission ? (
                        <form action={recordPrioritySpecificActionPositionAction} className="stack-form panel">
                          <input name="return_to" type="hidden" value="/priority-correction-fund" />
                          <input name="cycle_id" type="hidden" value={currentCycle.id} />
                          <input name="cause_area" type="hidden" value={summary.causeArea} />
                          <input name="submission_id" type="hidden" value={latestSubmission.id} />
                          <label className="field">
                            <span>Arbiter stance</span>
                            <select defaultValue="agree" name="stance">
                              <option value="agree">Agree</option>
                              <option value="dissent">Dissent</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Anonymous note</span>
                            <textarea
                              name="note"
                              placeholder="Use this for a dissenting reasoning or a condition attached to agreement."
                              rows={4}
                            />
                          </label>
                          <div className="form-actions">
                            <button className="button button-secondary button-mini" type="submit">
                              Record stance
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  ) : null}

                  {viewer && currentCycle && latestSubmission && viewerPrioritizesThisCause ? (
                    <form action={recordPrioritySpecificActionFeedbackAction} className="stack-form">
                      <input name="return_to" type="hidden" value="/priority-correction-fund" />
                      <input name="cycle_id" type="hidden" value={currentCycle.id} />
                      <input name="cause_area" type="hidden" value={summary.causeArea} />
                      <input name="submission_id" type="hidden" value={latestSubmission.id} />
                      <label className="field">
                        <span>Community feedback</span>
                        <select defaultValue="object" name="stance">
                          <option value="object">Object</option>
                          <option value="agree_with_dissent">Agree after reading a dissenting reasoning</option>
                        </select>
                      </label>
                      <div className="form-actions">
                        <button className="button button-secondary button-mini" type="submit">
                          Record anonymous feedback
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Stage two</p>
            <h2>Community-wide cause-area allocation</h2>
            <p>
              Seven cycle-wide arbiters review the published cause-specific combinations and decide
              what fraction of the month&apos;s fund should go to each cause area.
            </p>
          </div>

          <div className="panel data-card data-card-wide">
            {latestAllocation ? (
              <>
                <div className="tag-row">
                  <span className="badge">
                    {latestAllocation.status.replaceAll("_", " ")}
                  </span>
                  <span className="source-pill">
                    {pageData?.latestAllocationAgreeCount ?? 0} agree | {pageData?.latestAllocationDissentCount ?? 0} dissent | {pageData?.latestAllocationFeedbackCount ?? 0} community responses
                  </span>
                </div>
                <p className="route-text">{latestAllocation.reasoning}</p>
                <p className="route-text">
                  <strong>Expected impact:</strong> {latestAllocation.expected_impact}
                </p>
                {latestAllocation.allocation_schedule.length ? (
                  <div className="mini-list">
                    {latestAllocation.allocation_schedule.map((row) => (
                      <div key={`allocation-${row.label}-${row.text}`} className="mini-list-item">
                        <strong>{row.label || "Allocation"}</strong>
                        <span>{row.text}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="route-text">
                No community-wide allocation reasoning has been published for this cycle yet.
              </p>
            )}

            {viewer && currentCycle && isCauseAreaArbiter ? (
              <div className="field-grid">
                <form action={submitPriorityCauseAreaAllocationAction} className="stack-form panel">
                  <input name="return_to" type="hidden" value="/priority-correction-fund" />
                  <input name="cycle_id" type="hidden" value={currentCycle.id} />
                  <label className="field">
                    <span>Allocation schedule</span>
                    <textarea
                      name="allocation_schedule"
                      placeholder={"Animal welfare: 35%\nGlobal poverty: 25%\nExistential risk: 20%\nS-risks: 10%\nFuture flourishing: 10%"}
                      rows={6}
                    />
                  </label>
                  <label className="field">
                    <span>Expected impact</span>
                    <textarea
                      name="expected_impact"
                      placeholder="State the expected impact of the chosen cross-cause allocation."
                      rows={4}
                    />
                  </label>
                  <label className="field">
                    <span>Reasoning</span>
                    <textarea
                      name="reasoning"
                      placeholder="Explain why this cross-cause allocation dominates the nearby alternatives and how it reflects the current published cause-specific combinations."
                      rows={5}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="button button-primary button-mini" type="submit">
                      Submit allocation draft
                    </button>
                  </div>
                </form>

                {latestAllocation ? (
                  <form action={recordPriorityCauseAreaPositionAction} className="stack-form panel">
                    <input name="return_to" type="hidden" value="/priority-correction-fund" />
                    <input name="cycle_id" type="hidden" value={currentCycle.id} />
                    <input name="allocation_id" type="hidden" value={latestAllocation.id} />
                    <label className="field">
                      <span>Arbiter stance</span>
                      <select defaultValue="agree" name="stance">
                        <option value="agree">Agree</option>
                        <option value="dissent">Dissent</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Anonymous note</span>
                      <textarea
                        name="note"
                        placeholder="Use this for a dissenting cross-cause reasoning or a condition attached to agreement."
                        rows={4}
                      />
                    </label>
                    <div className="form-actions">
                      <button className="button button-secondary button-mini" type="submit">
                        Record stance
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}

            {viewer && currentCycle && latestAllocation && viewerSnapshot?.prioritized_cause_area ? (
              <form action={recordPriorityCauseAreaFeedbackAction} className="stack-form">
                <input name="return_to" type="hidden" value="/priority-correction-fund" />
                <input name="cycle_id" type="hidden" value={currentCycle.id} />
                <input name="allocation_id" type="hidden" value={latestAllocation.id} />
                <label className="field">
                  <span>Community feedback</span>
                  <select defaultValue="object" name="stance">
                    <option value="object">Object</option>
                    <option value="agree_with_dissent">Agree after reading a dissenting reasoning</option>
                  </select>
                </label>
                <div className="form-actions">
                  <button className="button button-secondary button-mini" type="submit">
                    Record anonymous feedback
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>

        {isAdmin ? (
          <section className="section section-white">
            <div className="section-head">
              <p className="eyebrow">Admin controls</p>
              <h2>Publish or finalize a monthly cycle</h2>
              <p>
                Publishing computes the previous month&apos;s fund, applies any carryover, snapshots
                current cause priorities, and assigns arbiters. Finalizing marks the cycle either
                finalized or reserved.
              </p>
            </div>

            <div className="field-grid">
              <form action={publishPriorityCorrectionCycleAction} className="stack-form panel">
                <input name="return_to" type="hidden" value="/priority-correction-fund" />
                <label className="field">
                  <span>Cycle month</span>
                  <input name="cycle_month" type="month" />
                </label>
                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Publish cycle
                  </button>
                </div>
              </form>

              {currentCycle ? (
                <form action={finalizePriorityCorrectionCycleAction} className="stack-form panel">
                  <input name="return_to" type="hidden" value="/priority-correction-fund" />
                  <input name="cycle_id" type="hidden" value={currentCycle.id} />
                  <p className="route-text">
                    Finalizing checks whether too many cause areas were omitted or whether the
                    community-wide allocation was published. If not, the full month carries
                    forward.
                  </p>
                  <div className="form-actions">
                    <button className="button button-secondary" type="submit">
                      Finalize current cycle
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
