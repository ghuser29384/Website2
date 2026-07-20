"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type RefObject,
} from "react";
import { useFormStatus } from "react-dom";

import {
  DonationRedirectShareActions,
  type DonationRedirectReceiptImageContent,
} from "./donation-redirect-share-actions";
import styles from "./donation-redirect-impact-flow.module.css";

export type DonationRedirectStage = "choose" | "review" | "complete";
export type DonationRedirectViewerRole = "owner" | "counterparty";
export type DonationRedirectSettlementStatus =
  | "not_started"
  | "authorization_pending"
  | "authorized"
  | "settling"
  | "transferred"
  | "refunded"
  | "cancelled"
  | "disputed";

export interface DonationRedirectComparableMetric {
  /** A key may be shared only by estimates with the same unit, model/version, horizon, and basis. */
  aggregationKey?: string | null;
  unit: string;
  value: number;
}

export interface DonationRedirectImpactPreview {
  caveat?: string | null;
  comparableMetric?: DonationRedirectComparableMetric | null;
  effectiveLifeYears?: number | null;
  methodology?: string | null;
  modelVersion?: string | null;
  primaryOutput?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  status: "modeled" | "unavailable";
  unavailableReason?: string | null;
}

export interface DonationRedirectDestinationOption {
  causeArea: string;
  id: string;
  impact: DonationRedirectImpactPreview;
  name: string;
}

export interface DonationRedirectPartyPlan {
  amountCents: number;
  causeArea: string;
  destinationId: string | null;
  destinationName: string;
  impact: DonationRedirectImpactPreview;
  planVersion: number;
  updatedAtIso?: string | null;
}

export interface DonationRedirectStageUrls {
  choose?: string | null;
  complete?: string | null;
  review?: string | null;
}

export interface DonationRedirectPaymentAuthorizationPost {
  actionUrl: string;
  consentLabel: string;
  consentName?: string;
  disabledReason?: string | null;
  hiddenFields?: Record<string, string>;
  state: "required" | "pending" | "ready" | "unavailable";
  statusLabel?: string | null;
  submitLabel?: string;
  termsLabel?: string;
  termsUrl?: string | null;
  termsVersion?: string | null;
}

export interface DonationRedirectSettlementInfo {
  completedAtIso?: string | null;
  isLive: boolean;
  publicReceiptUrl?: string | null;
  receiptImageFileName?: string | null;
  status: DonationRedirectSettlementStatus;
  statusLabel?: string | null;
  verificationUrl?: string | null;
}

export interface DonationRedirectReceiptPublication {
  batchId?: string | null;
  disabledReason?: string | null;
  hiddenFields?: Record<string, string>;
  state: "private" | "public" | "unavailable";
  statusLabel?: string | null;
}

export type DonationRedirectPlanFormAction = (
  formData: FormData,
) => void | Promise<void>;

export interface DonationRedirectImpactFlowProps {
  availableDestinations: readonly DonationRedirectDestinationOption[];
  baselineCaveat?: string | null;
  baselineOutcomeLabel?: string;
  counterpartyOriginalBaselineLabel: string;
  counterpartyPlan: DonationRedirectPartyPlan;
  currentStage: DonationRedirectStage;
  matchId: string;
  ownerOriginalBaselineLabel: string;
  ownerPlan: DonationRedirectPartyPlan;
  paymentAuthorization: DonationRedirectPaymentAuthorizationPost;
  publishReceiptAction?: DonationRedirectPlanFormAction;
  receiptId?: string | null;
  receiptPublication?: DonationRedirectReceiptPublication;
  settlement: DonationRedirectSettlementInfo;
  stageUrls?: DonationRedirectStageUrls;
  updatePlanAction: DonationRedirectPlanFormAction;
  updatePlanHiddenFields?: Record<string, string>;
  unpublishReceiptAction?: DonationRedirectPlanFormAction;
  viewerRole: DonationRedirectViewerRole;
}

interface NormalizedMetric {
  aggregationKey: string | null;
  unit: string;
  value: number;
}

interface CombinedImpact {
  kind: "combined" | "separate";
  match: NormalizedMetric | null;
  matchText: string;
  unit?: string;
  value?: number;
  viewer: NormalizedMetric | null;
  viewerText: string;
}

const STAGE_ORDER: readonly DonationRedirectStage[] = ["choose", "review", "complete"];
const STAGE_LABELS: Record<DonationRedirectStage, string> = {
  choose: "Choose",
  review: "Review",
  complete: "Complete",
};

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}

function formatNumber(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  }
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(2);
  if (magnitude >= 0.1) return value.toFixed(2);
  if (magnitude >= 0.01) return value.toFixed(3);
  return value.toFixed(5);
}

function metricForImpact(impact: DonationRedirectImpactPreview): NormalizedMetric | null {
  if (impact.status !== "modeled") return null;

  if (Number.isFinite(impact.effectiveLifeYears ?? Number.NaN)) {
    const suppliedMetric = impact.comparableMetric;
    const suppliedUnit = suppliedMetric?.unit.trim().toLowerCase();
    let aggregationKey: string | null = null;
    if (suppliedUnit === "effective life-years saved") {
      aggregationKey = suppliedMetric?.aggregationKey?.trim() ?? null;
    } else if (impact.modelVersion) {
      aggregationKey = `effective-life-years:${impact.modelVersion}`;
    }
    return {
      aggregationKey,
      unit: "effective life-years saved",
      value: Number(impact.effectiveLifeYears),
    };
  }

  if (
    impact.comparableMetric &&
    Number.isFinite(impact.comparableMetric.value) &&
    impact.comparableMetric.unit.trim()
  ) {
    const unit = impact.comparableMetric.unit.trim();
    if (/\b(?:expected\s+)?lives?\s+saved\b/i.test(unit)) return null;
    return {
      aggregationKey: impact.comparableMetric.aggregationKey?.trim() || null,
      unit,
      value: impact.comparableMetric.value,
    };
  }

  return null;
}

function impactText(impact: DonationRedirectImpactPreview) {
  const metric = metricForImpact(impact);
  return metric ? `≈+${formatNumber(metric.value)} ${metric.unit}` : "Estimate unavailable";
}

function impactAriaLabel(impact: DonationRedirectImpactPreview) {
  const metric = metricForImpact(impact);
  return metric
    ? `approximately ${formatNumber(metric.value)} ${metric.unit}`
    : "Impact estimate unavailable";
}

function combineImpacts(
  viewerImpact: DonationRedirectImpactPreview,
  matchImpact: DonationRedirectImpactPreview,
): CombinedImpact {
  const viewer = metricForImpact(viewerImpact);
  const match = metricForImpact(matchImpact);
  const viewerText = impactText(viewerImpact);
  const matchText = impactText(matchImpact);

  if (
    viewer &&
    match &&
    viewer.aggregationKey &&
    viewer.aggregationKey === match.aggregationKey &&
    viewer.unit === match.unit
  ) {
    return {
      kind: "combined",
      match,
      matchText,
      unit: viewer.unit,
      value: viewer.value + match.value,
      viewer,
      viewerText,
    };
  }

  return { kind: "separate", match, matchText, viewer, viewerText };
}

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function LocalDateTime({ iso }: { iso: string }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const date = new Date(iso);
  const validDate = Number.isFinite(date.getTime());
  let label = validDate ? iso : "Completion time unavailable";
  if (hydrated && validDate) {
    label = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZoneName: "short",
      year: "numeric",
    }).format(date);
  }

  return <time dateTime={iso}>{label}</time>;
}

function Stepper({
  currentStage,
  stageUrls,
}: {
  currentStage: DonationRedirectStage;
  stageUrls?: DonationRedirectStageUrls;
}) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  return (
    <nav className={styles.stepper} aria-label="Donation Redirect progress">
      <ol>
        {STAGE_ORDER.map((stage, index) => {
          const current = stage === currentStage;
          const reached = index <= currentIndex;
          const href = stageUrls?.[stage];
          const content = (
            <>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span className={styles.stepLabel}>{STAGE_LABELS[stage]}</span>
            </>
          );
          return (
            <li
              aria-current={current ? "step" : undefined}
              className={current ? styles.stepCurrent : reached ? styles.stepReached : undefined}
              key={stage}
            >
              {href && reached && !current ? <a href={href}>{content}</a> : <span>{content}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StageHeader({
  badge,
  description,
  headingRef,
  step,
  title,
}: {
  badge: string;
  description: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  step: number;
  title: string;
}) {
  return (
    <header className={styles.stageHeader}>
      <div>
        <p className={styles.kicker}>Donation Redirect · Step {step} of 3</p>
        <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
        <p>{description}</p>
      </div>
      <span className={styles.stageBadge}>{badge}</span>
    </header>
  );
}

function BaselineStrip({
  baselineCaveat,
  baselineOutcomeLabel,
  matchAmountCents,
  matchOriginalLabel,
  viewerAmountCents,
  viewerOriginalLabel,
}: {
  baselineCaveat?: string | null;
  baselineOutcomeLabel: string;
  matchAmountCents: number;
  matchOriginalLabel: string;
  viewerAmountCents: number;
  viewerOriginalLabel: string;
}) {
  return (
    <section className={styles.baselineStrip} aria-label="No-redirection baseline">
      <div>
        <p className={styles.kicker}>Without redirection · matched baseline</p>
        <h3>
          {formatMoney(viewerAmountCents)} → {viewerOriginalLabel}
          <span aria-hidden="true"> + </span>
          <span className={styles.srOnly}> and </span>
          {formatMoney(matchAmountCents)} → {matchOriginalLabel}
        </h3>
        <p>
          The agreed matched amounts are modeled as approximately canceling on {baselineOutcomeLabel};{" "}
          {baselineCaveat ?? "other shared effects and unequal influence remain unmodeled."}
        </p>
      </div>
      <strong aria-label={`approximately zero modeled net opposed effect on ${baselineOutcomeLabel}`}>
        ≈0 modeled net opposed effect
      </strong>
    </section>
  );
}

function ImpactSource({ impact }: { impact: DonationRedirectImpactPreview }) {
  if (!impact.sourceLabel && !impact.caveat) return null;
  return (
    <p className={styles.sourceLine}>
      {impact.sourceLabel ? (
        impact.sourceUrl ? (
          <a href={impact.sourceUrl} rel="noreferrer" target="_blank">{impact.sourceLabel}</a>
        ) : (
          <span>{impact.sourceLabel}</span>
        )
      ) : null}
      {impact.sourceLabel && impact.caveat ? <span aria-hidden="true"> · </span> : null}
      {impact.caveat ? <span>{impact.caveat}</span> : null}
    </p>
  );
}

function PlanCard({
  label,
  plan,
  readOnly = false,
}: {
  label: string;
  plan: DonationRedirectPartyPlan;
  readOnly?: boolean;
}) {
  const hasDestination = Boolean(plan.destinationId && plan.destinationName);
  return (
    <article className={`${styles.planCard} ${readOnly ? styles.planCardReadOnly : styles.planCardSelected}`}>
      <div className={styles.planCardTop}>
        <span className={styles.kicker}>{label}</span>
        <span className={styles.amount}>{formatMoney(plan.amountCents)}</span>
      </div>
      <h3>{hasDestination ? plan.destinationName : "Awaiting destination"}</h3>
      <p>{hasDestination ? plan.causeArea : "The participant has not selected a current plan."}</p>
      {hasDestination ? (
        <div className={styles.outcomeBlock}>
          {plan.impact.primaryOutput ? <strong>{plan.impact.primaryOutput}</strong> : null}
          <span aria-label={impactAriaLabel(plan.impact)}>{impactText(plan.impact)}</span>
        </div>
      ) : null}
      <ImpactSource impact={plan.impact} />
      {readOnly ? (
        <p className={styles.readOnlyNote}>
          Read-only · synced from the matched agreement
          {plan.updatedAtIso ? <> · updated <LocalDateTime iso={plan.updatedAtIso} /></> : null}
        </p>
      ) : null}
    </article>
  );
}

function AttributedImpactCard({
  label,
  plan,
}: {
  label: string;
  plan: DonationRedirectPartyPlan;
}) {
  return (
    <article className={styles.attributedCard}>
      <p className={styles.kicker}>{label} attributable modeled impact</p>
      <h3 aria-label={impactAriaLabel(plan.impact)}>{impactText(plan.impact)}</h3>
      <p>
        Funded by {formatMoney(plan.amountCents)} redirected to {plan.destinationName}; no impact from
        the other party’s funds is credited here.
      </p>
    </article>
  );
}

function JointImpactBlock({
  combined,
  totalCents,
}: {
  combined: CombinedImpact;
  totalCents: number;
}) {
  return (
    <section className={styles.jointImpact} aria-label="Combined modeled impact of this match">
      <div>
        <p className={styles.kicker}>
          {combined.kind === "combined"
            ? "Combined modeled impact of this match"
            : "Together · different or unsupported outcome units"}
        </p>
        {combined.kind === "combined" && combined.value !== undefined && combined.unit ? (
          <h3 aria-label={`approximately ${formatNumber(combined.value)} ${combined.unit}`}>
            ≈+{formatNumber(combined.value)} {combined.unit}
          </h3>
        ) : (
          <h3>
            <span>{combined.viewerText}</span>
            <span aria-hidden="true"> + </span>
            <span className={styles.srOnly}> and </span>
            <span>{combined.matchText}</span>
          </h3>
        )}
        <p>
          {combined.kind === "combined"
            ? "Counted once because both estimates use the same outcome definition and compatible model version."
            : "Shown side by side, not added into a universal score."}
        </p>
      </div>
      <span className={styles.amount}>{formatMoney(totalCents)} redirected</span>
    </section>
  );
}

function PendingDestinationSubmit() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Saving destination…" : "Review both impacts"}
    </button>
  );
}

function ChooseStage({
  availableDestinations,
  baseline,
  headingRef,
  matchPlan,
  matchId,
  selectedDestinationId,
  setSelectedDestinationId,
  updatePlanAction,
  updatePlanHiddenFields,
  viewerPlan,
  viewerRole,
}: {
  availableDestinations: readonly DonationRedirectDestinationOption[];
  baseline: ComponentProps<typeof BaselineStrip>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  matchId: string;
  matchPlan: DonationRedirectPartyPlan;
  selectedDestinationId: string;
  setSelectedDestinationId: (value: string) => void;
  updatePlanAction: DonationRedirectPlanFormAction;
  updatePlanHiddenFields?: Record<string, string>;
  viewerPlan: DonationRedirectPartyPlan;
  viewerRole: DonationRedirectViewerRole;
}) {
  const selectedDestination = availableDestinations.find(
    (destination) => destination.id === selectedDestinationId,
  );
  const selectedPlan: DonationRedirectPartyPlan = selectedDestination
    ? {
        ...viewerPlan,
        causeArea: selectedDestination.causeArea,
        destinationId: selectedDestination.id,
        destinationName: selectedDestination.name,
        impact: selectedDestination.impact,
      }
    : viewerPlan;

  return (
    <>
      <StageHeader
        badge="Choose"
        description="Compare destinations before reviewing the matched pair’s full impact."
        headingRef={headingRef}
        step={1}
        title="Choose your redirection."
      />
      <BaselineStrip {...baseline} />
      <div className={styles.twoUp}>
        <PlanCard label="Your current choice" plan={selectedPlan} />
        <PlanCard label="Other party’s current plan" plan={matchPlan} readOnly />
      </div>

      <form action={updatePlanAction} className={styles.destinationForm}>
        <input name="match_id" type="hidden" value={matchId} />
        <input name="participant_role" type="hidden" value={viewerRole} />
        <input name="expected_plan_version" type="hidden" value={viewerPlan.planVersion} />
        {Object.entries(updatePlanHiddenFields ?? {}).map(([name, value]) => (
          <input key={name} name={name} type="hidden" value={value} />
        ))}
        <fieldset>
          <legend>Compare destinations for your {formatMoney(viewerPlan.amountCents)}</legend>
          <p className={styles.fieldHelp}>Different outcome units are not ranked against one another.</p>
          <div className={styles.destinationList}>
            {availableDestinations.map((destination) => {
              const selected = destination.id === selectedDestinationId;
              return (
                <label className={styles.destinationRow} key={destination.id}>
                  <input
                    checked={selected}
                    name="redirect_destination_id"
                    onChange={() => setSelectedDestinationId(destination.id)}
                    required
                    type="radio"
                    value={destination.id}
                  />
                  <span className={styles.destinationIdentity}>
                    <strong>{destination.name}</strong>
                    <span>{destination.causeArea} · {destination.impact.sourceLabel ?? "Source pending"}</span>
                  </span>
                  <span className={styles.destinationImpact}>
                    <strong>{destination.impact.primaryOutput ?? "Outcome model pending"}</strong>
                    <span aria-label={impactAriaLabel(destination.impact)}>{impactText(destination.impact)}</span>
                  </span>
                  <span className={styles.destinationChoice}>{selected ? "Your choice" : "Choose"}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <p className={styles.selectionAnnouncement} aria-live="polite">
          {selectedDestination
            ? `${selectedDestination.name} selected. ${impactText(selectedDestination.impact)}.`
            : "Choose a destination to continue."}
        </p>
        <div className={styles.stageActions}>
          <span>
            Your choice: {selectedDestination?.name ?? "not selected"} · Match’s plan:{" "}
            {matchPlan.destinationName || "awaiting destination"}
          </span>
          <PendingDestinationSubmit />
        </div>
      </form>
    </>
  );
}

function PaymentAuthorization({
  configuration,
}: {
  configuration: DonationRedirectPaymentAuthorizationPost;
}) {
  const statusLabel =
    configuration.statusLabel ??
    ({
      required: "Authorization required",
      pending: "Authorization pending",
      ready: "Payment authorization ready",
      unavailable: "Payment authorization unavailable",
    } as const)[configuration.state];

  if (configuration.state !== "required") {
    return (
      <section className={styles.authorizationStatus} aria-label="Payment authorization status">
        <p className={styles.kicker}>Payment authorization</p>
        <h3>{statusLabel}</h3>
        <p>{configuration.disabledReason ?? "The frozen payment state is shown here without changing it."}</p>
      </section>
    );
  }

  return (
    <form action={configuration.actionUrl} className={styles.authorizationForm} method="post">
      {Object.entries(configuration.hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <div>
        <p className={styles.kicker}>Payment authorization</p>
        <h3>{statusLabel}</h3>
        <p>
          {configuration.termsVersion ? `Frozen terms ${configuration.termsVersion}. ` : null}
          {configuration.termsUrl ? (
            <a href={configuration.termsUrl}>{configuration.termsLabel ?? "Review payment terms"}</a>
          ) : null}
        </p>
      </div>
      <label className={styles.consentControl}>
        <input name={configuration.consentName ?? "consent"} required type="checkbox" />
        <span>{configuration.consentLabel}</span>
      </label>
      <button
        className="button button-primary"
        disabled={Boolean(configuration.disabledReason)}
        type="submit"
      >
        {configuration.submitLabel ?? "Authorize payment method"}
      </button>
      {configuration.disabledReason ? <p role="alert">{configuration.disabledReason}</p> : null}
    </form>
  );
}

function MethodDetails({
  baselineCaveat,
  matchPlan,
  viewerPlan,
}: {
  baselineCaveat?: string | null;
  matchPlan: DonationRedirectPartyPlan;
  viewerPlan: DonationRedirectPartyPlan;
}) {
  return (
    <details className={styles.methodDetails}>
      <summary>Method and evidence</summary>
      <dl>
        <div>
          <dt>Cancellation model</dt>
          <dd>{baselineCaveat ?? "Matched opposed amounts are treated as approximately offsetting only on the named contested margin."}</dd>
        </div>
        <div>
          <dt>Your destination</dt>
          <dd>
            {viewerPlan.impact.methodology ?? "Methodology unavailable"}
            {viewerPlan.impact.modelVersion ? ` · ${viewerPlan.impact.modelVersion}` : ""}
          </dd>
        </div>
        <div>
          <dt>Other party’s destination</dt>
          <dd>
            {matchPlan.impact.methodology ?? "Methodology unavailable"}
            {matchPlan.impact.modelVersion ? ` · ${matchPlan.impact.modelVersion}` : ""}
          </dd>
        </div>
      </dl>
    </details>
  );
}

function ReviewStage({
  baseline,
  combined,
  headingRef,
  matchPlan,
  paymentAuthorization,
  stageUrls,
  viewerPlan,
}: {
  baseline: ComponentProps<typeof BaselineStrip>;
  combined: CombinedImpact;
  headingRef: RefObject<HTMLHeadingElement | null>;
  matchPlan: DonationRedirectPartyPlan;
  paymentAuthorization: DonationRedirectPaymentAuthorizationPost;
  stageUrls?: DonationRedirectStageUrls;
  viewerPlan: DonationRedirectPartyPlan;
}) {
  const plansComplete = Boolean(viewerPlan.destinationId && matchPlan.destinationId);
  return (
    <>
      <StageHeader
        badge="Review"
        description="The baseline is the matched opposing pair—not another high-impact charity."
        headingRef={headingRef}
        step={2}
        title="See the cancellation, then your gain."
      />
      {!plansComplete ? (
        <div className={styles.warning} role="alert">
          Both participants must select a destination before the matched terms can be confirmed.
        </div>
      ) : null}
      <BaselineStrip {...baseline} />
      <div className={styles.twoUp}>
        <PlanCard label="Your redirection" plan={viewerPlan} />
        <PlanCard label="Other party’s redirection" plan={matchPlan} readOnly />
      </div>
      <div className={styles.attributedGrid}>
        <AttributedImpactCard label="Your" plan={viewerPlan} />
        <AttributedImpactCard label="Other party’s" plan={matchPlan} />
      </div>
      <JointImpactBlock
        combined={combined}
        totalCents={viewerPlan.amountCents + matchPlan.amountCents}
      />
      <MethodDetails
        baselineCaveat={baseline.baselineCaveat}
        matchPlan={matchPlan}
        viewerPlan={viewerPlan}
      />
      <div className={styles.reviewFooter}>
        {stageUrls?.choose ? (
          <a className="button button-secondary" href={stageUrls.choose}>Edit your destination</a>
        ) : null}
        {plansComplete ? <PaymentAuthorization configuration={paymentAuthorization} /> : null}
      </div>
    </>
  );
}

function receiptShareText({
  combined,
  matchOriginalLabel,
  matchPlan,
  viewerOriginalLabel,
  viewerPlan,
  discloseOriginals,
}: {
  combined: CombinedImpact;
  discloseOriginals: boolean;
  matchOriginalLabel: string;
  matchPlan: DonationRedirectPartyPlan;
  viewerOriginalLabel: string;
  viewerPlan: DonationRedirectPartyPlan;
}) {
  const origins = discloseOriginals
    ? `${viewerOriginalLabel} and ${matchOriginalLabel}`
    : "two matched opposing political destinations";
  const joint =
    combined.kind === "combined" && combined.value !== undefined && combined.unit
      ? `Combined modeled impact: ≈+${formatNumber(combined.value)} ${combined.unit}.`
      : `Together: ${combined.viewerText} + ${combined.matchText}; not summed across unlike or unsupported units.`;
  return `Donation Redirect complete: ${formatMoney(viewerPlan.amountCents)} and ${formatMoney(matchPlan.amountCents)} were redirected from ${origins}. My funds → ${viewerPlan.destinationName}: ${impactText(viewerPlan.impact)}. My match’s funds → ${matchPlan.destinationName}: ${impactText(matchPlan.impact)}. ${joint} Estimates are modeled, not guaranteed.`;
}

function PendingPublicationSubmit({
  label,
  pendingLabel,
  variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`button button-${variant}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ReceiptPublicationControls({
  publication,
  publicUrl,
  publishReceiptAction,
  unpublishReceiptAction,
}: {
  publication: DonationRedirectReceiptPublication;
  publicUrl?: string | null;
  publishReceiptAction?: DonationRedirectPlanFormAction;
  unpublishReceiptAction?: DonationRedirectPlanFormAction;
}) {
  const sharedHiddenFields = Object.entries(publication.hiddenFields ?? {}).filter(
    ([name]) => name !== "batch_id",
  );

  if (publication.state === "public") {
    return (
      <section className={styles.publicationPanel} aria-label="Public receipt settings">
        <div>
          <p className={styles.kicker}>Shareable link · Public</p>
          <h3>{publication.statusLabel ?? "Your anonymized receipt is ready to share."}</h3>
          <p>
            The original political destinations stay private. The public page shows the completed
            redirected amounts, destinations, modeled impacts, and settlement status.
          </p>
        </div>
        <div className={styles.publicationActions}>
          {publicUrl ? (
            <a className="button button-primary" href={publicUrl} rel="noreferrer" target="_blank">
              Open shareable link
            </a>
          ) : (
            <button className="button button-primary" disabled type="button">
              Shareable link unavailable
            </button>
          )}
          {unpublishReceiptAction && publication.batchId ? (
            <form action={unpublishReceiptAction}>
              <input name="batch_id" type="hidden" value={publication.batchId} />
              {sharedHiddenFields.map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
              ))}
              <PendingPublicationSubmit
                label="Make receipt private"
                pendingLabel="Making private…"
                variant="secondary"
              />
            </form>
          ) : null}
        </div>
      </section>
    );
  }

  const canPublish = Boolean(
    publication.state === "private" &&
      publication.batchId &&
      publishReceiptAction &&
      !publication.disabledReason,
  );

  return (
    <section className={styles.publicationPanel} aria-label="Public receipt settings">
      <div>
        <p className={styles.kicker}>Shareable link · Private by default</p>
        <h3>
          {publication.statusLabel ??
            (publication.state === "unavailable"
              ? "A public link is unavailable for this receipt."
              : "Create an anonymized public receipt when you are ready.")}
        </h3>
        <p>
          Your original political destinations are excluded unless you separately choose to put
          them in shared text.
        </p>
      </div>
      {canPublish && publishReceiptAction && publication.batchId ? (
        <form action={publishReceiptAction} className={styles.publicationForm}>
          <input name="batch_id" type="hidden" value={publication.batchId} />
          {sharedHiddenFields.map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <PendingPublicationSubmit
            label="Create shareable link"
            pendingLabel="Creating link…"
          />
        </form>
      ) : (
        <button className="button button-primary" disabled type="button">
          Create shareable link
        </button>
      )}
      {publication.disabledReason ? (
        <p className={styles.publicationStatus} role="status">
          {publication.disabledReason}
        </p>
      ) : null}
    </section>
  );
}

function CompleteStage({
  baseline,
  combined,
  headingRef,
  matchId,
  matchPlan,
  publishReceiptAction,
  receiptId,
  receiptPublication,
  settlement,
  stageUrls,
  unpublishReceiptAction,
  viewerPlan,
}: {
  baseline: ComponentProps<typeof BaselineStrip>;
  combined: CombinedImpact;
  headingRef: RefObject<HTMLHeadingElement | null>;
  matchId: string;
  matchPlan: DonationRedirectPartyPlan;
  publishReceiptAction?: DonationRedirectPlanFormAction;
  receiptId?: string | null;
  receiptPublication?: DonationRedirectReceiptPublication;
  settlement: DonationRedirectSettlementInfo;
  stageUrls?: DonationRedirectStageUrls;
  unpublishReceiptAction?: DonationRedirectPlanFormAction;
  viewerPlan: DonationRedirectPartyPlan;
}) {
  const settled = settlement.status === "transferred";
  const hasReceipt = Boolean(settled && receiptId && settlement.completedAtIso);

  if (!hasReceipt || !receiptId || !settlement.completedAtIso) {
    return (
      <>
        <StageHeader
          badge="Locked"
          description="The public receipt is created only from a completed, frozen redirection record."
          headingRef={headingRef}
          step={3}
          title="Receipt unlocks after completion."
        />
        <div className={styles.lockedReceipt}>
          <h3>{settlement.statusLabel ?? "Settlement has not completed."}</h3>
          <p>Review both destinations and complete verified settlement before sharing a receipt.</p>
          {stageUrls?.review ? (
            <a className="button button-secondary" href={stageUrls.review}>Review both impacts</a>
          ) : null}
        </div>
      </>
    );
  }

  const isTest = !settlement.isLive;
  const totalCents = viewerPlan.amountCents + matchPlan.amountCents;
  const combinedLabel =
    combined.kind === "combined" && combined.value !== undefined && combined.unit
      ? `Together: ≈+${formatNumber(combined.value)} ${combined.unit}`
      : `Together: ${combined.viewerText} + ${combined.matchText}`;
  const image: DonationRedirectReceiptImageContent = {
    combinedImpact: combinedLabel,
    headline: isTest
      ? `${formatMoney(totalCents)} test flow simulated — no real donation completed.`
      : `${formatMoney(totalCents)} moved from opposition to measurable gains.`,
    matchDestination: matchPlan.destinationName,
    matchImpact: impactText(matchPlan.impact),
    originSummary: isTest
      ? "TEST MODE. No real charge, transfer, or donation occurred."
      : "Two matched opposing political donations were redirected instead of spent against one another.",
    receiptMeta: `Receipt ${receiptId} · Match ${matchId.slice(0, 8)}`,
    viewerDestination: viewerPlan.destinationName,
    viewerImpact: impactText(viewerPlan.impact),
  };
  const genericShareText = receiptShareText({
    combined,
    discloseOriginals: false,
    matchOriginalLabel: baseline.matchOriginalLabel,
    matchPlan,
    viewerOriginalLabel: baseline.viewerOriginalLabel,
    viewerPlan,
  });
  const disclosedShareText = receiptShareText({
    combined,
    discloseOriginals: true,
    matchOriginalLabel: baseline.matchOriginalLabel,
    matchPlan,
    viewerOriginalLabel: baseline.viewerOriginalLabel,
    viewerPlan,
  });
  const publication: DonationRedirectReceiptPublication = receiptPublication ?? {
    batchId: null,
    state: settlement.publicReceiptUrl ? "public" : "private",
  };

  return (
    <>
      <StageHeader
        badge={isTest ? "Test only" : "Completed"}
        description={
          isTest
            ? "A test-only rendering that cannot be mistaken for a real donation or settlement."
            : "A frozen completion record formatted for sharing without double-counting either party’s impact."
        }
        headingRef={headingRef}
        step={3}
        title={isTest ? "Test simulation complete." : "Redirection complete."}
      />
      {isTest ? (
        <div className={styles.testBanner} role="status">
          TEST MODE — no real charge, transfer, tax receipt, or charitable donation occurred.
        </div>
      ) : null}
      <article className={`${styles.socialReceipt} ${isTest ? styles.socialReceiptTest : ""}`}>
        <header className={styles.receiptHero}>
          <div>
            <p className={styles.kicker}>Moral Trade · Donation Redirect</p>
            <h2>
              {isTest
                ? `${formatMoney(totalCents)} test flow simulated — no real donation completed.`
                : `${formatMoney(totalCents)} moved from opposition to measurable gains.`}
            </h2>
            <p>
              {isTest
                ? "This is a test record only."
                : "Two matched opposing political donations were redirected instead of spent against one another."}
            </p>
          </div>
          <span className={styles.completeBadge}>{isTest ? "Test simulation" : "✓ Completed"}</span>
        </header>
        <div className={styles.receiptBody}>
          <div className={styles.receiptRoutes}>
            <article>
              <p className={styles.kicker}>Funded by you · {formatMoney(viewerPlan.amountCents)}</p>
              <h3>{viewerPlan.destinationName}</h3>
              <strong aria-label={impactAriaLabel(viewerPlan.impact)}>{impactText(viewerPlan.impact)}</strong>
              {viewerPlan.impact.primaryOutput ? <span>{viewerPlan.impact.primaryOutput}</span> : null}
            </article>
            <article>
              <p className={styles.kicker}>Funded by your match · {formatMoney(matchPlan.amountCents)}</p>
              <h3>{matchPlan.destinationName}</h3>
              <strong aria-label={impactAriaLabel(matchPlan.impact)}>{impactText(matchPlan.impact)}</strong>
              {matchPlan.impact.primaryOutput ? <span>{matchPlan.impact.primaryOutput}</span> : null}
            </article>
          </div>
          <JointImpactBlock combined={combined} totalCents={totalCents} />
        </div>
        <footer className={styles.receiptFooter}>
          <div className={styles.receiptMeta}>
            <span>Receipt {receiptId}</span>
            <LocalDateTime iso={settlement.completedAtIso} />
          </div>
          <strong>Agree on the deal, not the values.</strong>
          <span>Modeled estimates, not guarantees · moraltrade.org</span>
        </footer>
      </article>

      {!isTest ? (
        <ReceiptPublicationControls
          publication={publication}
          publicUrl={settlement.publicReceiptUrl}
          publishReceiptAction={publishReceiptAction}
          unpublishReceiptAction={unpublishReceiptAction}
        />
      ) : null}

      {!isTest && publication.state === "public" && settlement.publicReceiptUrl ? (
        <DonationRedirectShareActions
          disclosedShareText={disclosedShareText}
          downloadFileName={
            settlement.receiptImageFileName ?? `moral-trade-${receiptId}.png`
          }
          genericShareText={genericShareText}
          image={image}
          publicUrl={settlement.publicReceiptUrl}
          title="Moral Trade donation redirect completed"
        />
      ) : null}

      <details className={styles.privateDetails}>
        <summary>Private completion details</summary>
        <dl>
          <div>
            <dt>Original matched pair</dt>
            <dd>
              {formatMoney(viewerPlan.amountCents)} → {baseline.viewerOriginalLabel}<br />
              {formatMoney(matchPlan.amountCents)} → {baseline.matchOriginalLabel}
            </dd>
          </div>
          <div><dt>Modeled no-redirection result</dt><dd>≈0 net opposed effect</dd></div>
          <div><dt>Your completed redirect</dt><dd>{viewerPlan.destinationName}</dd></div>
          <div><dt>Match’s completed redirect</dt><dd>{matchPlan.destinationName}</dd></div>
          <div>
            <dt>Verification</dt>
            <dd>
              {settlement.verificationUrl ? (
                <a href={settlement.verificationUrl}>Open verification record</a>
              ) : (
                "Verification route unavailable"
              )}
            </dd>
          </div>
        </dl>
      </details>
    </>
  );
}

export function DonationRedirectImpactFlow({
  availableDestinations,
  baselineCaveat,
  baselineOutcomeLabel = "the contested margin",
  counterpartyOriginalBaselineLabel,
  counterpartyPlan,
  currentStage,
  matchId,
  ownerOriginalBaselineLabel,
  ownerPlan,
  paymentAuthorization,
  publishReceiptAction,
  receiptId,
  receiptPublication,
  settlement,
  stageUrls,
  updatePlanAction,
  updatePlanHiddenFields,
  unpublishReceiptAction,
  viewerRole,
}: DonationRedirectImpactFlowProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const viewerPlan = viewerRole === "owner" ? ownerPlan : counterpartyPlan;
  const matchPlan = viewerRole === "owner" ? counterpartyPlan : ownerPlan;
  const viewerOriginalLabel =
    viewerRole === "owner" ? ownerOriginalBaselineLabel : counterpartyOriginalBaselineLabel;
  const matchOriginalLabel =
    viewerRole === "owner" ? counterpartyOriginalBaselineLabel : ownerOriginalBaselineLabel;
  const [destinationSelection, setDestinationSelection] = useState({
    destinationId: viewerPlan.destinationId ?? "",
    planVersion: viewerPlan.planVersion,
  });
  const selectedDestinationId =
    destinationSelection.planVersion === viewerPlan.planVersion
      ? destinationSelection.destinationId
      : (viewerPlan.destinationId ?? "");

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStage]);

  const combined = useMemo(
    () => combineImpacts(viewerPlan.impact, matchPlan.impact),
    [matchPlan.impact, viewerPlan.impact],
  );
  const baseline = {
    baselineCaveat,
    baselineOutcomeLabel,
    matchAmountCents: matchPlan.amountCents,
    matchOriginalLabel,
    viewerAmountCents: viewerPlan.amountCents,
    viewerOriginalLabel,
  };

  return (
    <section className={styles.flow} aria-label="Donation Redirect impact and completion flow">
      <Stepper currentStage={currentStage} stageUrls={stageUrls} />
      {settlement.isLive ? null : (
        <div className={styles.testModeRail} role="status">
          TEST MODE · No real donation or settlement is represented by this workspace.
        </div>
      )}
      <div className={styles.stage}>
        {currentStage === "choose" ? (
          <ChooseStage
            availableDestinations={availableDestinations}
            baseline={baseline}
            headingRef={headingRef}
            matchId={matchId}
            matchPlan={matchPlan}
            selectedDestinationId={selectedDestinationId}
            setSelectedDestinationId={(destinationId) =>
              setDestinationSelection({
                destinationId,
                planVersion: viewerPlan.planVersion,
              })
            }
            updatePlanAction={updatePlanAction}
            updatePlanHiddenFields={updatePlanHiddenFields}
            viewerPlan={viewerPlan}
            viewerRole={viewerRole}
          />
        ) : null}
        {currentStage === "review" ? (
          <ReviewStage
            baseline={baseline}
            combined={combined}
            headingRef={headingRef}
            matchPlan={matchPlan}
            paymentAuthorization={paymentAuthorization}
            stageUrls={stageUrls}
            viewerPlan={viewerPlan}
          />
        ) : null}
        {currentStage === "complete" ? (
          <CompleteStage
            baseline={baseline}
            combined={combined}
            headingRef={headingRef}
            matchId={matchId}
            matchPlan={matchPlan}
            publishReceiptAction={publishReceiptAction}
            receiptId={receiptId}
            receiptPublication={receiptPublication}
            settlement={settlement}
            stageUrls={stageUrls}
            unpublishReceiptAction={unpublishReceiptAction}
            viewerPlan={viewerPlan}
          />
        ) : null}
      </div>
    </section>
  );
}
