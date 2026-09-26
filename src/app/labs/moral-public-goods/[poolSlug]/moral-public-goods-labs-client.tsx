"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import {
  MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE,
  MORAL_PUBLIC_GOODS_LABS_VIEWPOINT_OPTIONS,
  estimateLabsFeeCents,
  formatUsd,
  formatUsdInput,
  getMoralPublicGoodsLabsSidebarNotes,
  parseUsdInputToCents,
  roundHalfUpBasisPoints,
  type MoralPublicGoodsLabsActorRole,
  type MoralPublicGoodsLabsMechanism,
  type MoralPublicGoodsLabsPool,
  type MoralPublicGoodsLabsRuntimeEnvironment,
} from "@/lib/mpgf/moral-public-goods-labs-ui";
import type { ProjectRecommendationPublicView } from "@/lib/mpgf/public-goods-project-recommendations-non-mvp";
import styles from "./moral-public-goods-labs.module.css";

type DetailPanel = "refund_rules" | "tier_rules" | "project_details" | "audit_approach" | null;
type ReviewMechanism = MoralPublicGoodsLabsMechanism | null;
type RecommendationFlow = "recommend" | "concern" | null;

interface MoralPublicGoodsLabsClientProps {
  actorRole: MoralPublicGoodsLabsActorRole;
  atLeastTierGateReasons: readonly string[];
  environment: MoralPublicGoodsLabsRuntimeEnvironment;
  pool: MoralPublicGoodsLabsPool;
  projectRecommendationGateReasons: readonly string[];
  projectRecommendationViewsByProjectId: Record<string, ProjectRecommendationPublicView | null>;
  refundBonusGateReasons: readonly string[];
  simulationOnly: boolean;
}

function TinyIcon({ name }: { name: "pledge" | "match" | "lock" | "project" | "check" }) {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {name === "pledge" ? (
          <>
            <path d="M7 5h10v14H7z" />
            <path d="M9 9h6" />
            <path d="M9 13h4" />
            <path d="m14 17 1.2 1.2 2.5-3" />
          </>
        ) : null}
        {name === "match" ? (
          <>
            <path d="M5 17h14" />
            <path d="M7 17V9" />
            <path d="M12 17V6" />
            <path d="M17 17v-4" />
            <path d="m7 9 5-3 5 7" />
          </>
        ) : null}
        {name === "lock" ? (
          <>
            <path d="M7 10h10v9H7z" />
            <path d="M9 10V8a3 3 0 0 1 6 0v2" />
          </>
        ) : null}
        {name === "project" ? (
          <>
            <path d="M5 6h14v12H5z" />
            <path d="M8 10h8" />
            <path d="M8 14h5" />
          </>
        ) : null}
        {name === "check" ? <path d="m5 12.5 4.2 4L19 7.5" /> : null}
      </svg>
    </span>
  );
}

function formatPercent(basisPoints: number) {
  const value = basisPoints / 100;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2)}%`;
}

function normalizeAmountInput(value: string) {
  return formatUsdInput(parseUsdInputToCents(value));
}

function useAcknowledgements(keys: readonly string[]) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = keys.every((key) => checked[key]);
  return {
    allChecked,
    checked,
    reset: () => setChecked({}),
    toggle: (key: string) => setChecked((current) => ({ ...current, [key]: !current[key] })),
  };
}

export default function MoralPublicGoodsLabsClient({
  actorRole,
  atLeastTierGateReasons,
  environment,
  pool,
  projectRecommendationGateReasons,
  projectRecommendationViewsByProjectId,
  refundBonusGateReasons,
  simulationOnly,
}: MoralPublicGoodsLabsClientProps) {
  const [mechanism, setMechanism] = useState<MoralPublicGoodsLabsMechanism>("refund_bonus");
  const [pledgeAmount, setPledgeAmount] = useState(formatUsdInput(pool.refundBonus.defaultGrossCents));
  const [platformAmount, setPlatformAmount] = useState("25.00");
  const [selectedTierIndex, setSelectedTierIndex] = useState(3);
  const [viewpoint, setViewpoint] = useState<(typeof MORAL_PUBLIC_GOODS_LABS_VIEWPOINT_OPTIONS)[number]>("Humanitarian");
  const [activePanel, setActivePanel] = useState<DetailPanel>(null);
  const [reviewMechanism, setReviewMechanism] = useState<ReviewMechanism>(null);
  const [recommendationFlow, setRecommendationFlow] = useState<RecommendationFlow>(null);
  const [recommendationTargetId, setRecommendationTargetId] = useState(pool.projects[0]?.id ?? "");
  const [recommendationStance, setRecommendationStance] = useState("recommend_funding");
  const [recommendationSourceType, setRecommendationSourceType] = useState("expert_assessment");
  const [recommendationSummary, setRecommendationSummary] = useState("");
  const [recommendationSourceUrl, setRecommendationSourceUrl] = useState("");
  const [recommendationConflict, setRecommendationConflict] = useState("");
  const [recommendationVisibility, setRecommendationVisibility] = useState("aggregate_only");
  const [concernUrgency, setConcernUrgency] = useState("routine");
  const [simulationMessage, setSimulationMessage] = useState("");
  const refundAcks = useAcknowledgements(["not_charged_now", "charged_only_if_clears", "eligible_failure_only", "non_mvp"]);
  const platformAcks = useAcknowledgements(["own_excluded", "may_be_charged", "no_direct_payment", "non_mvp"]);
  const recommendationAcks = useAcknowledgements(["not_vote", "conflicts", "moderation"]);
  const concernAcks = useAcknowledgements(["moderated", "no_abuse", "serious_route"]);

  const pledgeCents = parseUsdInputToCents(pledgeAmount);
  const platformCents = parseUsdInputToCents(platformAmount);
  const selectedTier = pool.platformTiers.find((tier) => tier.tierIndex === selectedTierIndex) ?? pool.platformTiers[2]!;
  const platformMatchCents = roundHalfUpBasisPoints(platformCents, selectedTier.platformMatchRateBps);
  const pledgeFeesCents = estimateLabsFeeCents(pledgeCents);
  const pledgeNetCents = Math.max(0, pledgeCents - pledgeFeesCents);
  const successPremiumThreshold = MORAL_PUBLIC_GOODS_LABS_SUCCESS_PREMIUM_SCHEDULE.thresholds[0]!;
  const sidebarNotes = useMemo(() => getMoralPublicGoodsLabsSidebarNotes(mechanism), [mechanism]);

  useEffect(() => {
    if (!activePanel && !reviewMechanism && !recommendationFlow) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setActivePanel(null);
      setReviewMechanism(null);
      setRecommendationFlow(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activePanel, recommendationFlow, reviewMechanism]);

  function switchMechanism(nextMechanism: MoralPublicGoodsLabsMechanism) {
    setMechanism(nextMechanism);
    setSimulationMessage("");
    setReviewMechanism(null);
  }

  function handleMechanismKeyDown(event: KeyboardEvent<HTMLButtonElement>, nextMechanism: MoralPublicGoodsLabsMechanism) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      switchMechanism(nextMechanism);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      switchMechanism(mechanism === "refund_bonus" ? "at_least_tier" : "refund_bonus");
    }
  }

  function openReview(nextMechanism: MoralPublicGoodsLabsMechanism) {
    setSimulationMessage("");
    refundAcks.reset();
    platformAcks.reset();
    setReviewMechanism(nextMechanism);
  }

  function openRecommendationFlow(flow: Exclude<RecommendationFlow, null>, targetId: string) {
    setRecommendationTargetId(targetId);
    setRecommendationFlow(flow);
    setSimulationMessage("");
    recommendationAcks.reset();
    concernAcks.reset();
  }

  function recordSimulation(label: string) {
    setSimulationMessage(
      `Simulation only: ${label}. No production commitment, payment-method setup, authorization, capture, routing, platform match, or bonus payment was created.`,
    );
  }

  function recordRecommendationSimulation(label: string) {
    setSimulationMessage(
      `Simulation only: ${label}. The entry was not publicly displayed and did not affect clearing, thresholds, payment, allocation, review approval, or any ranking.`,
    );
    setRecommendationFlow(null);
  }

  return (
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <section className={styles.headerBlock} aria-labelledby="moral-public-goods-labs-heading">
        <a className={styles.backLink} href="/mpgf">
          &larr; Back to moral public goods
        </a>
        <div className={styles.titleRow}>
          <span className={styles.labsPill}>LABS</span>
          <h1 id="moral-public-goods-labs-heading">{pool.title}</h1>
        </div>
        <p className={styles.subtitle}>{pool.description}</p>
        <div className={styles.chipRow} aria-label="Pool review status">
          <span>Reviewed</span>
          <span>Routes verified</span>
          <span>Progress sealed</span>
          <span className={styles.reserveChip}>Reserve backed</span>
        </div>
        <div className={styles.labsBanner} role="status">
          Labs mechanism — Non-MVP. Real-money use is disabled unless this feature is explicitly promoted.
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.leftColumn} aria-label="Funding rule selection">
          <section className={styles.card} aria-labelledby="funding-rule-heading">
            <div className={styles.cardHeader}>
              <div>
                <h2 id="funding-rule-heading">Choose your funding rule</h2>
                <p>Two ways to support this pool. Learn more about how they work.</p>
              </div>
            </div>
            <div className={styles.mechanismTiles} role="radiogroup" aria-labelledby="funding-rule-heading">
              <button
                aria-checked={mechanism === "refund_bonus"}
                className={`${styles.mechanismTile} ${mechanism === "refund_bonus" ? styles.mechanismTileSelected : ""}`}
                role="radio"
                type="button"
                onClick={() => switchMechanism("refund_bonus")}
                onKeyDown={(event) => handleMechanismKeyDown(event, "refund_bonus")}
              >
                <span className={styles.tileIconWrap}>
                  <TinyIcon name="pledge" />
                </span>
                <span className={styles.tileCopy}>
                  <span className={styles.tileTitle}>Refund-Bonus Pledge</span>
                  <span className={styles.tileBadge}>Labs</span>
                  <span>If the pool misses the support threshold, eligible pledgers may receive a small backed bonus.</span>
                </span>
                <span className={styles.radioDot} aria-hidden="true" />
              </button>

              <button
                aria-checked={mechanism === "at_least_tier"}
                className={`${styles.mechanismTile} ${mechanism === "at_least_tier" ? styles.mechanismTileSelected : ""}`}
                role="radio"
                type="button"
                onClick={() => switchMechanism("at_least_tier")}
                onKeyDown={(event) => handleMechanismKeyDown(event, "at_least_tier")}
              >
                <span className={styles.tileIconWrap}>
                  <TinyIcon name="match" />
                </span>
                <span className={styles.tileCopy}>
                  <span className={styles.tileTitle}>At-Least-Tier Platform Match</span>
                  <span className={styles.tileBadge}>Labs</span>
                  <span>
                    If other eligible support reaches your chosen tier, Moral Trade contributes part of your amount.
                    Otherwise, you pay your amount.
                  </span>
                </span>
                <span className={styles.radioDot} aria-hidden="true" />
              </button>
            </div>
          </section>

          {mechanism === "refund_bonus" ? (
            <section className={styles.card} aria-labelledby="refund-form-heading">
              <div className={styles.formHead}>
                <div>
                  <h2 id="refund-form-heading">
                    <TinyIcon name="pledge" /> Your pledge
                  </h2>
                  <p>
                    You&apos;ll only be charged if the pool clears. If it misses the support threshold, you may receive a
                    small backed bonus.
                  </p>
                </div>
                <button
                  aria-controls="labs-detail-drawer"
                  aria-expanded={activePanel === "refund_rules"}
                  className={styles.linkButton}
                  type="button"
                  onClick={() => setActivePanel("refund_rules")}
                >
                  View rules and states
                </button>
              </div>

              <div className={styles.fieldsGrid}>
                <label className={styles.field}>
                  <span>Maximum pledge amount</span>
                  <span className={styles.inputShell}>
                    <input
                      inputMode="decimal"
                      min="10"
                      name="maximumPledgeAmount"
                      type="text"
                      value={pledgeAmount}
                      onBlur={() => setPledgeAmount(normalizeAmountInput(pledgeAmount))}
                      onChange={(event) => setPledgeAmount(event.target.value)}
                    />
                    <span>USD</span>
                  </span>
                  <small>Suggested: $10-$100</small>
                </label>
                <label className={styles.field}>
                  <span>Optional viewpoint tag</span>
                  <select value={viewpoint} onChange={(event) => setViewpoint(event.target.value as typeof viewpoint)}>
                    {MORAL_PUBLIC_GOODS_LABS_VIEWPOINT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <small>Shown in aggregate only.</small>
                </label>
              </div>

              <div className={styles.outcomeGrid} aria-live="polite">
                <article>
                  <h3>If the pool clears</h3>
                  <p>You may be charged up to {formatUsd(pledgeCents)}.</p>
                  <p>Net funds go to the reviewed projects.</p>
                  <p>Separately, the pool creator or sponsor pays the disclosed success premium into the common reserve.</p>
                </article>
                <article>
                  <h3>If the pool misses the support threshold</h3>
                  <p>You are charged $0.</p>
                  <p>Eligible pledgers may receive a small backed bonus.</p>
                </article>
              </div>

              <button className={styles.primaryButton} type="button" onClick={() => openReview("refund_bonus")}>
                Continue to review <span aria-hidden="true">&rarr;</span>
              </button>
              <p className={styles.footerNote}>
                Your payment method will be saved for potential future authorization. No charge now. Saving your payment
                method is not a charge, hold, escrow, custody, or authorization.
              </p>
            </section>
          ) : null}

          {mechanism === "at_least_tier" ? (
            <section className={styles.card} aria-labelledby="platform-form-heading">
              <div className={styles.formHead}>
                <div>
                  <h2 id="platform-form-heading">
                    <TinyIcon name="match" /> Your platform-match commitment
                  </h2>
                  <p>
                    Choose a tier and state the amount you would contribute if other eligible support does not reach
                    that tier.
                  </p>
                </div>
                <button
                  aria-controls="labs-detail-drawer"
                  aria-expanded={activePanel === "tier_rules"}
                  className={styles.linkButton}
                  type="button"
                  onClick={() => setActivePanel("tier_rules")}
                >
                  View tier rules
                </button>
              </div>

              <div className={styles.fieldsGrid}>
                <label className={styles.field}>
                  <span>At-least tier</span>
                  <select
                    value={selectedTierIndex}
                    onChange={(event) => setSelectedTierIndex(Number(event.target.value))}
                  >
                    {pool.platformTiers.map((tier) => (
                      <option key={tier.tierIndex} value={tier.tierIndex}>
                        Tier {tier.tierIndex} — {formatUsd(tier.thresholdCents)} —{" "}
                        {formatPercent(tier.platformMatchRateBps)} platform match
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Your stated contribution if the tier is not reached</span>
                  <span className={styles.inputShell}>
                    <input
                      inputMode="decimal"
                      name="statedContribution"
                      type="text"
                      value={platformAmount}
                      onBlur={() => setPlatformAmount(normalizeAmountInput(platformAmount))}
                      onChange={(event) => setPlatformAmount(event.target.value)}
                    />
                    <span>USD</span>
                  </span>
                </label>
                <label className={styles.field}>
                  <span>Optional viewpoint tag</span>
                  <select value={viewpoint} onChange={(event) => setViewpoint(event.target.value as typeof viewpoint)}>
                    {MORAL_PUBLIC_GOODS_LABS_VIEWPOINT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Visibility</span>
                  <select value="aggregate_only" onChange={() => undefined}>
                    <option value="aggregate_only">Aggregate only</option>
                  </select>
                </label>
              </div>

              <div className={styles.outcomeGrid} aria-live="polite">
                <article>
                  <h3>If your selected tier is reached by other eligible support</h3>
                  <p>Moral Trade contributes about {formatUsd(platformMatchCents)} to the projects.</p>
                  <p>You pay $0.</p>
                </article>
                <article>
                  <h3>If your selected tier is not reached</h3>
                  <p>You contribute {formatUsd(platformCents)} to the projects.</p>
                </article>
              </div>

              <ul className={styles.noteList}>
                <li>Your own commitment and same-control accounts do not count toward your forecast result.</li>
                <li>There is no direct user payout.</li>
              </ul>

              <button className={styles.primaryButton} type="button" onClick={() => openReview("at_least_tier")}>
                Continue to review <span aria-hidden="true">&rarr;</span>
              </button>
              <p className={styles.footerNote}>
                Your payment method will be saved for potential future authorization. No charge now. Saving your payment
                method is not a charge, hold, escrow, custody, or authorization.
              </p>
            </section>
          ) : null}
        </section>

        <aside className={styles.sidebar} aria-label="Pool details and mechanism status">
          <section className={styles.sidebarCard} aria-labelledby="about-pool-heading">
            <h2 id="about-pool-heading">About this pool</h2>
            <dl className={styles.poolFacts}>
              <div>
                <dt>Closes</dt>
                <dd>{pool.closesLabel}</dd>
              </div>
              <div>
                <dt>Minimum supporters</dt>
                <dd>Minimum supporters at least {pool.minVerifiedSupporters} verified people</dd>
              </div>
            </dl>
            <div className={styles.sidebarDivider} />
            <div className={styles.sidebarHeaderRow}>
              <h3>Projects (3)</h3>
              <button
                aria-controls="labs-detail-drawer"
                aria-expanded={activePanel === "project_details"}
                className={styles.linkButton}
                type="button"
                onClick={() => setActivePanel("project_details")}
              >
                View details
              </button>
            </div>
            <ul className={styles.projectList}>
              {pool.projects.map((project) => (
                <li key={project.id}>
                  <TinyIcon name="project" />
                  <span className={styles.projectNameBlock}>
                    <span>{project.name}</span>
                    {projectRecommendationViewsByProjectId[project.id] ? (
                      <small>{projectRecommendationViewsByProjectId[project.id]?.aggregate.publicSummaryText}</small>
                    ) : null}
                  </span>
                  <strong>{project.reviewState}</strong>
                </li>
              ))}
            </ul>
          </section>

          {mechanism === "refund_bonus" ? (
            <section className={styles.sidebarCard} aria-labelledby="failure-bonus-reserve-heading">
              <h2 id="failure-bonus-reserve-heading">Common Failure Bonus Reserve</h2>
              <p>Successful pools replenish the reserve. Failed pools do not owe a success premium.</p>
              <dl className={styles.poolFacts}>
                <div>
                  <dt>Net recipient threshold</dt>
                  <dd>{formatUsd(successPremiumThreshold.cumulativeNetRecipientThresholdCents)}</dd>
                </div>
                <div>
                  <dt>Illustrative success premium</dt>
                  <dd>
                    {formatPercent(successPremiumThreshold.premiumRateBps)} ({formatUsd(successPremiumThreshold.successPremiumCents)})
                  </dd>
                </div>
                <div>
                  <dt>Gross success requirement</dt>
                  <dd>{formatUsd(successPremiumThreshold.grossSuccessRequirementCents)}</dd>
                </div>
                <div>
                  <dt>Premium payer</dt>
                  <dd>Pool creator or sponsor</dd>
                </div>
              </dl>
              <p className={styles.footerNote}>
                The success premium is outside the net recipient threshold and excludes separately disclosed payment fees.
                This rate is a provisional Labs quote, not a live underwriting decision.
              </p>
            </section>
          ) : null}

          <section className={styles.sidebarCard} aria-labelledby="progress-heading">
            <div className={styles.sidebarHeaderRow}>
              <h2 id="progress-heading">Qualitative progress (sealed)</h2>
              <TinyIcon name="lock" />
            </div>
            <p className={styles.currentProgress}>Building support</p>
            <ol className={styles.progressSteps} aria-label="Qualitative progress">
              <li>Early</li>
              <li className={styles.activeStep}>Building</li>
              <li>Strong</li>
            </ol>
          </section>

          <section className={styles.sidebarCard} aria-labelledby="mechanism-status-heading">
            <h2 id="mechanism-status-heading">Labs mechanism</h2>
            <ul className={styles.statusList}>
              {sidebarNotes.map((note) => (
                <li key={note}>
                  <TinyIcon name="check" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <button
              aria-controls="labs-detail-drawer"
              aria-expanded={activePanel === "audit_approach"}
              className={styles.linkButton}
              type="button"
              onClick={() => setActivePanel("audit_approach")}
            >
              See rules, terms, and audit approach
            </button>
          </section>
        </aside>
      </div>

      <p className={styles.runtimeNote}>
        Runtime: {environment}; viewer role: {actorRole}; action mode:{" "}
        {simulationOnly ? "simulation-only, no provider side effects" : "live gates still require server review"}.
      </p>

      {activePanel ? (
        <DetailDrawer
          activePanel={activePanel}
          pool={pool}
          projectRecommendationGateReasons={projectRecommendationGateReasons}
          projectRecommendationViewsByProjectId={projectRecommendationViewsByProjectId}
          onClose={() => setActivePanel(null)}
          onOpenRecommendation={openRecommendationFlow}
        />
      ) : null}

      {reviewMechanism ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onKeyDown={(event) => {
            if (event.key === "Escape") setReviewMechanism(null);
          }}
        >
          <section
            aria-labelledby="final-review-heading"
            aria-modal="true"
            className={styles.reviewModal}
            role="dialog"
          >
            <div className={styles.modalHead}>
              <h2 id="final-review-heading">Final review</h2>
              <button className={styles.iconButton} type="button" onClick={() => setReviewMechanism(null)}>
                Close
              </button>
            </div>

            {reviewMechanism === "refund_bonus" ? (
              <>
                <p>You are saving a hard pledge, not making an immediate donation.</p>
                <dl className={styles.reviewList}>
                  <div>
                    <dt>Maximum gross charge if the pool clears</dt>
                    <dd>{formatUsd(pledgeCents)}</dd>
                  </div>
                  <div>
                    <dt>Estimated fees if charged</dt>
                    <dd>{formatUsd(pledgeFeesCents)}</dd>
                  </div>
                  <div>
                    <dt>Estimated net sent to projects if charged</dt>
                    <dd>{formatUsd(pledgeNetCents)}</dd>
                  </div>
                  <div>
                    <dt>Success premium paid by creator or sponsor</dt>
                    <dd>
                      {formatPercent(successPremiumThreshold.premiumRateBps)} — {formatUsd(successPremiumThreshold.successPremiumCents)}
                      into the common reserve if the threshold clears
                    </dd>
                  </div>
                  <div>
                    <dt>Net recipient threshold</dt>
                    <dd>{formatUsd(successPremiumThreshold.cumulativeNetRecipientThresholdCents)}</dd>
                  </div>
                  <div>
                    <dt>Gross success requirement</dt>
                    <dd>{formatUsd(successPremiumThreshold.grossSuccessRequirementCents)} before payment fees</dd>
                  </div>
                  <div>
                    <dt>Failure-participation bonus</dt>
                    <dd>conditional, backed, and not guaranteed outside eligible support-threshold failure</dd>
                  </div>
                  <div>
                    <dt>Bonus reserve</dt>
                    <dd>Backed / Labs simulation only</dd>
                  </div>
                  <div>
                    <dt>Sponsor match</dt>
                    <dd>None</dd>
                  </div>
                </dl>
                <AcknowledgementList
                  checked={refundAcks.checked}
                  items={[
                    ["not_charged_now", "I understand I am not being charged now."],
                    ["charged_only_if_clears", "I understand I may be charged only if the pool clears and all gates pass."],
                    [
                      "eligible_failure_only",
                      "I understand a failure bonus is paid only for eligible support-threshold failure states.",
                    ],
                    ["non_mvp", "I understand this is a non-MVP labs mechanism."],
                  ]}
                  onToggle={refundAcks.toggle}
                />
                <button
                  className={styles.primaryButton}
                  disabled={!refundAcks.allChecked || !simulationOnly}
                  type="button"
                  onClick={() => recordSimulation("Save hard pledge")}
                >
                  Save hard pledge
                </button>
                <p className={styles.gateCopy}>Production blockers: {refundBonusGateReasons.join(", ")}</p>
              </>
            ) : (
              <>
                <p>You are saving a hard, payment-backed platform-match commitment.</p>
                <dl className={styles.reviewList}>
                  <div>
                    <dt>Selected forecast</dt>
                    <dd>at least Tier {selectedTier.tierIndex}</dd>
                  </div>
                  <div>
                    <dt>Your stated contribution if your forecast is not met</dt>
                    <dd>{formatUsd(platformCents)}</dd>
                  </div>
                  <div>
                    <dt>Platform-match rate if your forecast is met</dt>
                    <dd>{formatPercent(selectedTier.platformMatchRateBps)}</dd>
                  </div>
                  <div>
                    <dt>Estimated platform contribution if your forecast is met</dt>
                    <dd>{formatUsd(platformMatchCents)} to projects</dd>
                  </div>
                </dl>
                <p>
                  If other eligible support reaches at least Tier {selectedTier.tierIndex}, Moral Trade contributes the
                  match amount and you are charged $0.
                </p>
                <p>
                  If other eligible support does not reach Tier {selectedTier.tierIndex}, you may be charged{" "}
                  {formatUsd(platformCents)} and funds go to projects.
                </p>
                <p>Your own commitment and same-control accounts do not count.</p>
                <p>
                  Platform-match payments, sponsor match, fees, drafts, and failed payments do not count toward forecast
                  results.
                </p>
                <p>Saving payment method is not a charge, hold, escrow, custody, or authorization.</p>
                <AcknowledgementList
                  checked={platformAcks.checked}
                  items={[
                    ["own_excluded", "I understand my own commitment does not count toward my forecast result."],
                    ["may_be_charged", "I understand that if I lose, I may be charged my stated contribution."],
                    [
                      "no_direct_payment",
                      "I understand that if I win, the platform contributes to the projects and I receive no direct payment.",
                    ],
                    ["non_mvp", "I understand this is non-MVP and may be simulation-only."],
                  ]}
                  onToggle={platformAcks.toggle}
                />
                <button
                  className={styles.primaryButton}
                  disabled={!platformAcks.allChecked || !simulationOnly}
                  type="button"
                  onClick={() => recordSimulation("Save hard commitment")}
                >
                  Save hard commitment
                </button>
                <p className={styles.gateCopy}>Production blockers: {atLeastTierGateReasons.join(", ")}</p>
              </>
            )}
            {simulationMessage ? (
              <p className={styles.simulationMessage} role="status">
                {simulationMessage}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}

      {recommendationFlow ? (
        <RecommendationSubmissionModal
          acks={recommendationFlow === "recommend" ? recommendationAcks : concernAcks}
          concernUrgency={concernUrgency}
          flow={recommendationFlow}
          projects={pool.projects}
          selectedTargetId={recommendationTargetId}
          sourceType={recommendationSourceType}
          sourceUrl={recommendationSourceUrl}
          stance={recommendationStance}
          summary={recommendationSummary}
          visibility={recommendationVisibility}
          conflictDisclosure={recommendationConflict}
          onClose={() => setRecommendationFlow(null)}
          onConcernUrgencyChange={setConcernUrgency}
          onConflictDisclosureChange={setRecommendationConflict}
          onSourceTypeChange={setRecommendationSourceType}
          onSourceUrlChange={setRecommendationSourceUrl}
          onStanceChange={setRecommendationStance}
          onSubmit={recordRecommendationSimulation}
          onSummaryChange={setRecommendationSummary}
          onVisibilityChange={setRecommendationVisibility}
        />
      ) : null}
    </main>
  );
}

function AcknowledgementList({
  checked,
  items,
  onToggle,
}: {
  checked: Record<string, boolean>;
  items: readonly (readonly [string, string])[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className={styles.ackList}>
      {items.map(([key, label]) => (
        <label key={key}>
          <input checked={Boolean(checked[key])} type="checkbox" onChange={() => onToggle(key)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function DetailDrawer({
  activePanel,
  onClose,
  onOpenRecommendation,
  pool,
  projectRecommendationGateReasons,
  projectRecommendationViewsByProjectId,
}: {
  activePanel: Exclude<DetailPanel, null>;
  onClose: () => void;
  onOpenRecommendation: (flow: Exclude<RecommendationFlow, null>, targetId: string) => void;
  pool: MoralPublicGoodsLabsPool;
  projectRecommendationGateReasons: readonly string[];
  projectRecommendationViewsByProjectId: Record<string, ProjectRecommendationPublicView | null>;
}) {
  const title =
    activePanel === "refund_rules"
      ? "Refund rules and states"
      : activePanel === "tier_rules"
        ? "Platform match tier rules"
        : activePanel === "project_details"
          ? "Project details"
          : "Rules, terms, and audit approach";

  return (
    <div
      className={styles.drawerBackdrop}
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <aside aria-labelledby="drawer-title" aria-modal="true" className={styles.drawer} id="labs-detail-drawer" role="dialog">
        <div className={styles.modalHead}>
          <h2 id="drawer-title">{title}</h2>
          <button className={styles.iconButton} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {activePanel === "refund_rules" ? (
          <div className={styles.drawerSections}>
            <section>
              <h3>When pool clears</h3>
              <p>You may be charged only after close and only if all review, payment, and safety gates pass.</p>
              <p>
                The creator or sponsor separately pays the disclosed success premium into the common Failure Bonus Reserve.
                It is not deducted from the net recipient threshold.
              </p>
            </section>
            <section>
              <h3>When support threshold is missed</h3>
              <p>Eligible pledgers are charged $0 and may receive the backed failure-participation bonus.</p>
            </section>
            <section>
              <h3>When no bonus is paid</h3>
              <p>
                No bonus is paid for blocked, canceled, unsafe, legal-blocked, review-blocked, payment-failed, Sybil,
                duplicate, or abuse-flagged states.
              </p>
            </section>
            <section>
              <h3>Payment method language</h3>
              <p>Saving your payment method is not a charge, hold, escrow, custody, or authorization.</p>
            </section>
            <section>
              <h3>Audit summary</h3>
              <p>Final audit separates user-paid amounts, fees, bonus reserve exposure, and project disbursement.</p>
            </section>
          </div>
        ) : null}

        {activePanel === "tier_rules" ? (
          <div className={styles.drawerSections}>
            <p>At-least-tier only.</p>
            <p>Higher tiers have higher platform-match rates because they are harder to reach.</p>
            <p>Rates are frozen before the round opens using a reviewed schedule.</p>
            <p>Own commitment and same-control accounts do not count.</p>
            <p>Platform match goes to projects; user receives no direct payment.</p>
            <p>Final project totals may differ from the forecast-resolution total.</p>
          </div>
        ) : null}

        {activePanel === "project_details" ? (
          <div className={styles.drawerSections}>
            {pool.projects.map((project) => (
              <section key={project.id}>
                <h3>{project.name}</h3>
                <span className={styles.reviewChip}>{project.reviewState}</span>
                <p>{project.description}</p>
                <RecommendationSection
                  gateReasons={projectRecommendationGateReasons}
                  projectId={project.id}
                  view={projectRecommendationViewsByProjectId[project.id] ?? null}
                  onOpenRecommendation={onOpenRecommendation}
                />
              </section>
            ))}
          </div>
        ) : null}

        {activePanel === "audit_approach" ? (
          <div className={styles.drawerSections}>
            <p>User-paid amounts are tracked separately from platform-paid match.</p>
            <p>Fees, sponsor match, reserve exposure, and final project disbursement are reported separately.</p>
            <p>Viewpoint tags and progress are aggregate-only before close.</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function RecommendationSection({
  gateReasons,
  onOpenRecommendation,
  projectId,
  view,
}: {
  gateReasons: readonly string[];
  onOpenRecommendation: (flow: Exclude<RecommendationFlow, null>, targetId: string) => void;
  projectId: string;
  view: ProjectRecommendationPublicView | null;
}) {
  if (!view) {
    return (
      <div className={styles.recommendationBlock}>
        <h4>Recommendations and concerns</h4>
        <p>Recommendations are hidden for this viewer or environment.</p>
        {gateReasons.length ? <p className={styles.gateCopy}>{gateReasons.join(", ")}</p> : null}
      </div>
    );
  }

  const recommendations = view.entries.filter((entry) => entry.kind !== "concern");
  const concerns = view.entries.filter((entry) => entry.kind === "concern");

  return (
    <div className={styles.recommendationBlock}>
      <h4>Recommendations and concerns</h4>
      <p className={styles.compactSignal}>{view.aggregate.publicSummaryText}</p>

      <section aria-label="Recommendations">
        <h5>Recommendations</h5>
        {recommendations.length ? (
          <ul className={styles.recommendationList}>
            {recommendations.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {entry.displayLabel} - &quot;{entry.publicSummary}&quot;
                </strong>
                <span>
                  Source: {entry.sourceLabel} · Conflict: {entry.conflictLabel}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No approved public recommendations.</p>
        )}
      </section>

      <section aria-label="Concerns">
        <h5>Concerns</h5>
        {concerns.length ? (
          <ul className={styles.recommendationList}>
            {concerns.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.displayLabel}</strong>
                <span>
                  Source: {entry.sourceLabel} · Conflict: {entry.conflictLabel}
                </span>
              </li>
            ))}
          </ul>
        ) : view.concernNotice ? (
          <p aria-label="concern under review status">{view.concernNotice}</p>
        ) : (
          <p>No unresolved public concerns.</p>
        )}
      </section>

      <div className={styles.recommendationActions}>
        <button className={styles.secondaryButton} type="button" onClick={() => onOpenRecommendation("recommend", projectId)}>
          Recommend funding
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onOpenRecommendation("concern", projectId)}>
          Record a concern
        </button>
      </div>
    </div>
  );
}

function RecommendationSubmissionModal({
  acks,
  concernUrgency,
  conflictDisclosure,
  flow,
  onClose,
  onConcernUrgencyChange,
  onConflictDisclosureChange,
  onSourceTypeChange,
  onSourceUrlChange,
  onStanceChange,
  onSubmit,
  onSummaryChange,
  onVisibilityChange,
  projects,
  selectedTargetId,
  sourceType,
  sourceUrl,
  stance,
  summary,
  visibility,
}: {
  acks: ReturnType<typeof useAcknowledgements>;
  concernUrgency: string;
  conflictDisclosure: string;
  flow: Exclude<RecommendationFlow, null>;
  onClose: () => void;
  onConcernUrgencyChange: (value: string) => void;
  onConflictDisclosureChange: (value: string) => void;
  onSourceTypeChange: (value: string) => void;
  onSourceUrlChange: (value: string) => void;
  onStanceChange: (value: string) => void;
  onSubmit: (label: string) => void;
  onSummaryChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  projects: readonly MoralPublicGoodsLabsPool["projects"][number][];
  selectedTargetId: string;
  sourceType: string;
  sourceUrl: string;
  stance: string;
  summary: string;
  visibility: string;
}) {
  const selectedProject = projects.find((project) => project.id === selectedTargetId) ?? projects[0];
  const sourceRequiresUrl = sourceType === "linked_public_source";
  const sourceRequiresEvidence = sourceType === "private_evidence_reviewed";
  const requiredFieldsPresent =
    Boolean(summary.trim()) &&
    Boolean(conflictDisclosure.trim()) &&
    Boolean(sourceType) &&
    (!sourceRequiresUrl || Boolean(sourceUrl.trim())) &&
    !sourceRequiresEvidence;
  const canSubmit = requiredFieldsPresent && acks.allChecked;
  const title = flow === "recommend" ? "Recommend funding" : "Record a concern";

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section aria-labelledby="recommendation-modal-heading" aria-modal="true" className={styles.reviewModal} role="dialog">
        <div className={styles.modalHead}>
          <h2 id="recommendation-modal-heading">{title}</h2>
          <button className={styles.iconButton} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.submissionForm}>
          <label className={styles.field}>
            <span>Target</span>
            <input readOnly value={selectedProject?.name ?? "Reviewed public-good project"} />
          </label>

          {flow === "recommend" ? (
            <>
              <label className={styles.field}>
                <span>Stance</span>
                <select value={stance} onChange={(event) => onStanceChange(event.target.value)}>
                  <option value="recommend_funding">Recommend funding</option>
                  <option value="support_with_caveats">Support with caveats</option>
                  <option value="donated">I donated</option>
                  <option value="reviewed_positive">Reviewed positively</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Source type</span>
                <select value={sourceType} onChange={(event) => onSourceTypeChange(event.target.value)}>
                  <option value="verified_donation">I donated to this.</option>
                  <option value="grant_review">I reviewed this.</option>
                  <option value="expert_assessment">I have relevant domain expertise.</option>
                  <option value="direct_experience">I have direct experience with this project.</option>
                  <option value="linked_public_source">I am linking a public source.</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className={styles.field}>
                <span>Source type</span>
                <select value={sourceType} onChange={(event) => onSourceTypeChange(event.target.value)}>
                  <option value="direct_experience">Direct experience</option>
                  <option value="linked_public_source">Linked public source</option>
                  <option value="expert_assessment">Expert assessment</option>
                  <option value="private_evidence_reviewed">Private evidence reviewed</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Urgency</span>
                <select value={concernUrgency} onChange={(event) => onConcernUrgencyChange(event.target.value)}>
                  <option value="routine">Routine</option>
                  <option value="material_before_funding">Material before funding</option>
                  <option value="safety_legal_review_concern">Safety/legal/review concern</option>
                </select>
              </label>
            </>
          )}

          <label className={styles.field}>
            <span>{flow === "recommend" ? "Public summary" : "Concern summary"}</span>
            <textarea
              maxLength={600}
              rows={5}
              value={summary}
              onChange={(event) => onSummaryChange(event.target.value)}
            />
            <small>Source-backed summary for moderator review. 600 characters max.</small>
          </label>
          <label className={styles.field}>
            <span>Source URL</span>
            <input
              placeholder={sourceRequiresUrl ? "Required for linked public source" : "Optional unless the source type requires it"}
              type="url"
              value={sourceUrl}
              onChange={(event) => onSourceUrlChange(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Conflict disclosure</span>
            <textarea rows={3} value={conflictDisclosure} onChange={(event) => onConflictDisclosureChange(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Visibility</span>
            <select value={visibility} onChange={(event) => onVisibilityChange(event.target.value)}>
              <option value="aggregate_only">Aggregate only</option>
              <option value="public">Public</option>
              <option value="reviewer_only">Reviewer only</option>
            </select>
          </label>

          {sourceRequiresEvidence ? (
            <p className={styles.gateCopy}>
              Private evidence upload is not enabled in this labs UI. Choose another source type or send evidence through reviewer handling.
            </p>
          ) : null}

          <AcknowledgementList
            checked={acks.checked}
            items={
              flow === "recommend"
                ? [
                    ["not_vote", "I understand this is not a vote, ranking, review approval, or clearing input."],
                    ["conflicts", "I have disclosed relevant conflicts."],
                    ["moderation", "I understand moderators may aggregate, redact, reject, or hide this signal."],
                  ]
                : [
                    ["moderated", "I understand concerns are moderated before public display."],
                    [
                      "no_abuse",
                      "I am not using this to harass, dox, threaten, or pressure a project or donor.",
                    ],
                    ["serious_route", "I understand serious concerns may route to reviewer/challenge handling."],
                  ]
            }
            onToggle={acks.toggle}
          />
          <button className={styles.primaryButton} disabled={!canSubmit} type="button" onClick={() => onSubmit("Submit for review")}>
            {flow === "recommend" ? "Submit for review" : "Submit concern"}
          </button>
        </div>
      </section>
    </div>
  );
}
