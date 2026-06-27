import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  PageHero,
  SectionHeader,
  StepCard,
  TradeFlowDiagram,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  createDemoPledgeSwapManualReviewPreview,
  type PledgeSwapGateStatus,
} from "@/lib/pledge-swaps";
import { createOneMealNoMeatOpportunityDemo } from "@/lib/moral-trade/opportunity-constrained-meal-evidence";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pledge swaps",
  description:
    "Learn how to structure voluntary pledge swaps with reciprocal terms, evidence rules, duration, and review boundaries.",
  alternates: {
    canonical: "/pledge-swaps",
  },
  openGraph: {
    title: "Pledge swaps",
    description:
      "Structure voluntary reciprocal commitments with explicit evidence rules and safety review.",
    url: getAbsoluteUrl("/pledge-swaps"),
    type: "website",
  },
};

function formatPledgeGateStatus(status: PledgeSwapGateStatus) {
  return status.replaceAll("_", " ");
}

function pledgeGateStatusClass(status: PledgeSwapGateStatus) {
  if (status === "blocked") {
    return "blocked";
  }

  if (status === "needs_input" || status === "human_review") {
    return "human_review";
  }

  return "pass";
}

export default async function PledgeSwapsPage() {
  const viewer = await getViewer();
  const createHref = viewer ? "/offers/new?mode=pledge" : "/signup?returnTo=/offers/new%3Fmode%3Dpledge";
  const preview = createDemoPledgeSwapManualReviewPreview();
  const schedule = preview.performanceSchedule;
  const opportunityMealDemo = createOneMealNoMeatOpportunityDemo();
  const opportunityMealConfidence = Math.round(
    opportunityMealDemo.assessment.proposedCompletionConfidenceDecimal * 100,
  );

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/pledge-swaps", label: "Pledge swaps" }]} />

        <PageHero
          eyebrow="Trade format"
          title="Swap bounded pledges under explicit terms."
          description="A pledge swap lets two parties commit to actions each side values, while keeping the exchange voluntary, reviewable, and reversible under stated exit rules."
          actions={
            <>
              <Link className="button button-primary" href="/offers?mode=pledge">
                Browse pledge swaps
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create pledge swap
              </Link>
            </>
          }
        >
          <TradeFlowDiagram
            title="Pledge swap flow"
            steps={["State your pledge", "Name the reciprocal ask", "Set evidence and duration", "Review before reliance"]}
          />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="pledge-required-heading">
          <SectionHeader eyebrow="Required terms" id="pledge-required-heading" title="A good pledge swap is specific enough to inspect.">
            The listing should make it clear what each party is offering, what counts as fulfillment, and when either party can exit.
          </SectionHeader>
          <div className="step-card-grid">
            <StepCard index={1} title="Action and counter-action.">
              Describe both sides plainly, including scope, cadence, and any exclusions.
            </StepCard>
            <StepCard index={2} title="Duration and exit rule.">
              State when the pledge starts, when it ends, and how either side can stop relying on it.
            </StepCard>
            <StepCard index={3} title="Evidence standard.">
              Name whether receipts, public pledges, peer witness, or qualitative notes are expected.
            </StepCard>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="meal-context-evidence-heading">
          <SectionHeader
            eyebrow="Optional meal evidence"
            id="meal-context-evidence-heading"
            title="Add meal-context evidence"
          >
            For one-meal or one-day no-meat pledge-swaps, an opportunity-constrained meal
            bundle can help reviewers understand whether the participant had limited realistic
            opportunity to leave and secretly eat meat after an observed meal.
          </SectionHeader>

          <div className="step-card-grid">
            <StepCard index={1} title="Usual meal context.">
              Share where you usually eat this meal, whether the venue is swipe-based or
              otherwise access-limited, and whether you usually eat once for this meal.
            </StepCard>
            <StepCard index={2} title="Witness roles stay separate.">
              A co-diner/direct observer can support completion for the observed meal. A baseline
              witness can support additionality by estimating what would likely have happened
              without the pledge-swap.
            </StepCard>
            <StepCard index={3} title="Post-meal constraint.">
              A class, exam, work shift, meeting, travel, or appointment soon after the meal may
              support the opportunity constraint when it is reviewed without excessive privacy cost.
            </StepCard>
          </div>

          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Opportunity-constrained meal</p>
                <h3>Reviewed meal-context evidence can raise completion confidence.</h3>
                <p>
                  The seed no-meat lunch demo reaches about {opportunityMealConfidence}% completion
                  confidence under the frozen policy when a swipe-based cafeteria, direct co-diner
                  observation, baseline support, single-meal habit support, and a post-meal class
                  line up with no contrary report.
                </p>
              </div>
              <span className="protocol-review-status">optional</span>
            </div>

            <div className="protocol-review-grid">
              {opportunityMealDemo.reviewerPanel.sections.slice(0, 6).map((section) => (
                <div key={section.key}>
                  <strong>{section.label}</strong>
                  <p>{section.value}</p>
                  {section.score == null ? null : <small>Score {section.score}</small>}
                </div>
              ))}
            </div>

            <div className="protocol-provenance-preflight">
              <div className="protocol-provenance-head">
                <div>
                  <strong>Privacy warnings</strong>
                  <p>
                    Do not upload class schedules, IDs, location records, or meal-plan records
                    unless necessary. Redact unrelated personal information. Witness testimony is
                    private by default. Funders and public reports will not see witness names,
                    schedules, raw testimony, cafeteria names, or relationship details.
                  </p>
                </div>
                <span className="protocol-review-status">private</span>
              </div>
            </div>

            <form
              action="/api/moral-trade/opportunity-meal-evidence/enforce"
              className="stack-form"
              method="post"
            >
              <input name="operation" type="hidden" value="submit_bundle" />
              <input name="action_template_id" type="hidden" value="action-template:one-meal-no-meat" />
              <input name="participant_user_id" type="hidden" value="participant-preview" />
              <input name="pledge_swap_id" type="hidden" value="pledge-swap-preview" />
              <input name="meal_window_start_at" type="hidden" value="2026-07-02T17:10:00.000Z" />
              <input name="meal_window_end_at" type="hidden" value="2026-07-02T17:45:00.000Z" />
              <input name="post_meal_commitment_start_at" type="hidden" value="2026-07-02T18:00:00.000Z" />
              <div className="data-grid">
                <label className="field">
                  <span>What meal did this cover?</span>
                  <select defaultValue="lunch" name="meal_label">
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Where did you usually eat this meal?</span>
                  <select defaultValue="school_cafeteria" name="ordinary_meal_venue_type">
                    <option value="school_cafeteria">School cafeteria</option>
                    <option value="employer_cafeteria">Employer cafeteria</option>
                    <option value="dining_hall">Dining hall</option>
                    <option value="home">Home</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Was it swipe-based or access-limited?</span>
                  <select defaultValue="swipe_based" name="venue_access_model">
                    <option value="swipe_based">Swipe-based</option>
                    <option value="meal_plan">Meal plan</option>
                    <option value="cash_register">Cash register</option>
                    <option value="open_access">Open access</option>
                    <option value="unknown">Unknown</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="checkbox-row">
                  <input defaultChecked name="participant_claims_usual_venue_for_meal" type="checkbox" />
                  <span>This is where I usually eat this meal.</span>
                </label>
                <label className="checkbox-row">
                  <input defaultChecked name="participant_claims_usually_eats_once_for_meal" type="checkbox" />
                  <span>I usually do not eat more than once for this meal.</span>
                </label>
                <label className="checkbox-row">
                  <input name="post_meal_commitment_claimed" type="checkbox" />
                  <span>I had a class, exam, work shift, meeting, travel, or appointment soon after.</span>
                </label>
                <label className="field">
                  <span>Post-meal commitment type</span>
                  <select defaultValue="class" name="post_meal_commitment_type">
                    <option value="class">Class</option>
                    <option value="exam">Exam</option>
                    <option value="work_shift">Work shift</option>
                    <option value="meeting">Meeting</option>
                    <option value="travel">Travel</option>
                    <option value="appointment">Appointment</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <button className="button button-secondary" type="submit">
                Preview meal-context evidence
              </button>
            </form>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="pledge-manual-review-heading">
          <SectionHeader
            eyebrow="Manual-review preview"
            id="pledge-manual-review-heading"
            title="A match candidate is not a deal."
          >
            Pledge swaps stay non-reliance-bearing until a matched-trade lock proposal freezes the
            counterparties, volume, terms, evidence, schedule, and exit rules, then each participant
            gives a fresh final confirmation.
          </SectionHeader>

          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Lock boundary</p>
                <h3>Frozen proposal required before reliance.</h3>
                <p>
                  Preview status: match candidate creates deal {String(preview.matchCandidateCreatesDeal)};
                  capture allowed {String(preview.captureAllowed)}; reliance-bearing{" "}
                  {String(preview.relianceBearing)}.
                </p>
              </div>
              <span className="protocol-review-status">
                {preview.releaseStage.replaceAll("_", " ")}
              </span>
            </div>

            <div className="protocol-review-grid">
              <div>
                <strong>Required lock terms</strong>
                <ul className="clean-list">
                  <li>Fresh final confirmations: {preview.requiresFreshConfirmations ? "yes" : "no"}</li>
                  <li>Atomic settlement at lock: {preview.atomicSettlementAtLockBoundary ? "yes" : "no"}</li>
                  <li>Double counting allowed: {preview.doubleCountingAllowed ? "yes" : "no"}</li>
                  <li>Post-lock amendment required: {preview.requiresAgreementAmendmentForPostLockChanges ? "yes" : "no"}</li>
                </ul>
              </div>
              <div>
                <strong>Performance schedule</strong>
                <ul className="clean-list">
                  <li>Max obligation: {preview.maxObligationDays} days</li>
                  <li>Checkpoints: {schedule.checkpointCadence}</li>
                  <li>Challenge window: {schedule.challengeWindow}</li>
                  <li>Suspension: {schedule.suspensionRule}</li>
                </ul>
              </div>
              <div>
                <strong>Evidence rule</strong>
                <p>{schedule.evidenceDue}</p>
                <p>{schedule.reciprocalRelease}</p>
              </div>
            </div>

            <div className="protocol-provenance-preflight">
              <div className="protocol-provenance-head">
                <div>
                  <strong>Manual-review gates</strong>
                  <p>
                    These checks stay separate from moral ranking. They review baseline integrity,
                    safety, privacy, authenticity, transferability, and process integrity before
                    any final lock.
                  </p>
                </div>
                <span className="protocol-review-status">
                  {preview.humanReviewGateCount} review item
                  {preview.humanReviewGateCount === 1 ? "" : "s"}
                </span>
              </div>
              <ol className="protocol-provenance-list">
                {preview.gates.map((gate) => (
                  <li
                    className={`protocol-provenance-item protocol-provenance-item-${pledgeGateStatusClass(
                      gate.status,
                    )}`}
                    key={gate.key}
                  >
                    <span className="protocol-step-status">
                      {formatPledgeGateStatus(gate.status)}
                    </span>
                    <div>
                      <strong>{gate.label}</strong>
                      <p>{gate.detail}</p>
                      <small>{gate.nextAction}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="pledge-safety-heading">
          <SectionHeader eyebrow="Safety boundaries" id="pledge-safety-heading" title="Pledge swaps are trades, not pressure campaigns.">
            The platform blocks threats, harassment, illegal asks, deceptive baselines, and pressure on vulnerable people.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Voluntary only</h3>
              <p>Each side must be able to decline without penalty outside the stated proposal.</p>
            </article>
            <article className="panel concept-card">
              <h3>No hidden leverage</h3>
              <p>Do not use private information, intimidation, or reputational threats to induce acceptance.</p>
            </article>
            <article className="panel concept-card">
              <h3>Review before trust</h3>
              <p>Published terms remain subject to manual review before anyone should rely on them.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
