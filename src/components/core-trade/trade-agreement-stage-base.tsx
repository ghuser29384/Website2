import Link from "next/link";
import type { ReactNode } from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { TradeFlowIcon, type TradeFlowIconName } from "@/components/core-trade/trade-flow-icons";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getTradeFlowStage } from "@/lib/trade-flow-stage";

import styles from "./trade-agreement-stage.module.css";

interface AgreementParty {
  action: string;
  cause: string;
  confirmed: boolean;
  label: string;
}

interface AgreementVersionSummary {
  evidenceDueDate: string;
  evidenceRule: string;
  exitConditions: string;
  id: string;
  maximumBurden: string;
  noTradeBaseline: string;
  privacyScope: string;
  version: number;
}

interface LiveCopy {
  detailHeading: string;
  detailRows: Array<[string, ReactNode]>;
  intro: string;
  kicker: string;
  title: string;
}

interface TradeAgreementStageProps {
  acceptedEvidenceCount: number;
  activatedAt: string | null;
  agreementId: string;
  canConfirm: boolean;
  completedAt: string | null;
  completionConfirmationCount: number;
  confirmAction: (formData: FormData) => void | Promise<void>;
  confirmationCount: number;
  counterpartLabel: string;
  declineAction: (formData: FormData) => void | Promise<void>;
  evidenceCount: number;
  evidenceDueAt: string | null;
  exitReason: string | null;
  formMessage?: { text: string; tone: "error" | "success" } | null;
  lifecycleStatus: string;
  offerHref?: string | null;
  proposer: AgreementParty;
  responder: AgreementParty;
  threadHref?: string | null;
  version: AgreementVersionSummary;
  viewerConfirmed: boolean;
}

const NODE_CONFIG: ReadonlyArray<{
  href: string;
  icon: TradeFlowIconName;
  label: string;
}> = [
  { href: "#terms", icon: "document", label: "Terms" },
  { href: "#terms", icon: "user", label: "Accepted" },
  { href: "#milestones", icon: "handshake", label: "Milestones" },
  { href: "#milestones", icon: "evidence", label: "Evidence" },
  { href: "#milestones", icon: "check", label: "Outcome" },
];

const NODE_POSITION_CLASSES = [
  styles.nodeOne,
  styles.nodeTwo,
  styles.nodeThree,
  styles.nodeFour,
  styles.nodeFive,
] as const;

function initialFor(label: string) {
  const normalized = label.trim();
  return normalized && normalized !== "You" ? normalized.slice(0, 1).toUpperCase() : "Y";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return <LocalDateTime value={value} fallback={value} />;
}

function nodeDetail(
  index: number,
  props: Pick<
    TradeAgreementStageProps,
    | "acceptedEvidenceCount"
    | "completionConfirmationCount"
    | "confirmationCount"
    | "evidenceCount"
    | "lifecycleStatus"
    | "version"
  >,
) {
  if (index === 0) return `Version ${props.version.version}`;
  if (index === 1) return `${props.confirmationCount} / 2 confirmed`;
  if (index === 2) {
    if (["cancelled", "expired"].includes(props.lifecycleStatus)) return "Ended";
    if (props.lifecycleStatus === "completed") return "Finished";
    return "Active terms";
  }
  if (index === 3) {
    if (props.lifecycleStatus === "disputed") return "Challenged";
    if (props.acceptedEvidenceCount) return `${props.acceptedEvidenceCount} accepted`;
    return `${props.evidenceCount} submitted`;
  }
  if (props.lifecycleStatus === "completed") return "Final";
  return "Awaiting final review";
}

function liveCopy(props: TradeAgreementStageProps): LiveCopy {
  if (props.lifecycleStatus === "completed") {
    return {
      detailHeading: "Trade completed by both parties.",
      detailRows: [
        ["Completed", formatDate(props.completedAt)],
        ["Accepted evidence", String(props.acceptedEvidenceCount)],
        ["Final graded milestones", String(props.acceptedEvidenceCount)],
      ],
      intro: "Frozen milestone terms, private evidence history, neutral decisions, and external-payment records are retained.",
      kicker: "Final record · Both completed",
      title: "Trade completed.",
    };
  }

  if (props.lifecycleStatus === "cancelled" || props.lifecycleStatus === "expired") {
    return {
      detailHeading: "Trade ended before completion.",
      detailRows: [
        ["State", props.lifecycleStatus.replaceAll("_", " ")],
        ["Reason", props.exitReason || "No additional reason recorded"],
        ["Evidence retained", String(props.evidenceCount)],
      ],
      intro: "Future obligations have ended. Frozen terms, evidence, and completed periods remain visible in the audit record.",
      kicker: "Agreement record · Ended",
      title: "Trade ended.",
    };
  }

  if (props.lifecycleStatus === "disputed") {
    return {
      detailHeading: "Evidence is challenged.",
      detailRows: [
        ["Evidence submitted", String(props.evidenceCount)],
        ["Accepted evidence", String(props.acceptedEvidenceCount)],
        ["Evidence due", formatDate(props.evidenceDueAt)],
      ],
      intro: "The agreement remains recorded while the evidence challenge is resolved under the published rule.",
      kicker: "Active deal · Evidence challenged",
      title: "Trade needs review.",
    };
  }

  if (props.lifecycleStatus === "evidence_due") {
    return {
      detailHeading: "Evidence is due.",
      detailRows: [
        ["Evidence due", formatDate(props.evidenceDueAt)],
        ["Evidence submitted", String(props.evidenceCount)],
        ["Accepted evidence", String(props.acceptedEvidenceCount)],
      ],
      intro: "The action period has reached its evidence checkpoint. Submit or review proof against the frozen rule.",
      kicker: "Active deal · Evidence due",
      title: "Proof is next.",
    };
  }

  return {
    detailHeading: "Commitments are active.",
    detailRows: [
      ["Activated", formatDate(props.activatedAt)],
      ["Evidence due", formatDate(props.evidenceDueAt)],
      ["Accepted evidence", String(props.acceptedEvidenceCount)],
    ],
    intro: "Both participants confirmed the same immutable version. Any resulting payment happens externally; Moral Trade does not hold funds.",
    kicker: "Active deal · Both accepted",
    title: "Trade is live.",
  };
}

function Header({
  activePhase,
  lifecycleStatus,
  offerHref,
  threadHref,
}: {
  activePhase: "confirm" | "live";
  lifecycleStatus: string;
  offerHref?: string | null;
  threadHref?: string | null;
}) {
  return (
    <header className={`${styles.header} ${activePhase === "live" ? styles.liveHeader : ""}`}>
      <Link aria-label="Moral Trade, home" className={styles.brandLink} href="/">
        <MoralTradeWordmark />
      </Link>
      <nav aria-label="Trade phases" className={styles.phaseTabs}>
        <span className={`${styles.phaseTab} ${styles.phaseDone}`}>1 · Build ✓</span>
        <span
          className={`${styles.phaseTab} ${
            activePhase === "confirm" ? styles.phaseActive : styles.phaseDone
          }`}
        >
          2 · Confirm{activePhase === "live" ? " ✓" : ""}
        </span>
        <span className={`${styles.phaseTab} ${activePhase === "live" ? styles.phaseActive : ""}`}>
          3 · Live
        </span>
      </nav>
      <div className={styles.headerActions}>
        {offerHref ? (
          <Link className={styles.headerLink} href={offerHref}>
            Source offer
          </Link>
        ) : null}
        {threadHref ? (
          <Link className={styles.headerLink} href={threadHref}>
            Private thread
          </Link>
        ) : null}
        {activePhase === "live" ? (
          <span className={styles.statePill}>
            <i className={styles.stateDot} />
            {lifecycleStatus.replaceAll("_", " ")}
          </span>
        ) : null}
      </div>
    </header>
  );
}

function PartyPanel({ party, side }: { party: AgreementParty; side: "offer" | "request" }) {
  return (
    <section className={styles.confirmSide}>
      <div className={styles.sideTopline}>
        <span className={styles.sideLabel}>{side === "offer" ? "Offer-maker commits" : "Counterparty commits"}</span>
        <span className={`${styles.acceptBadge} ${party.confirmed ? styles.accepted : ""}`}>
          {party.confirmed ? "Confirmed" : "Waiting"}
        </span>
      </div>
      <div className={styles.party}>
        <div className={styles.avatar}>{initialFor(party.label)}</div>
        <div>
          <strong>{party.label}</strong>
          <small>{party.confirmed ? "Confirmed this frozen version" : "Has not confirmed this version"}</small>
        </div>
      </div>
      <div className={styles.cause}>{party.cause}</div>
      <div className={styles.commitment}>
        <TradeFlowIcon name={side === "offer" ? "document" : "handshake"} />
        <div>
          <strong>{party.action}</strong>
          <span>Versioned commitment</span>
        </div>
      </div>
    </section>
  );
}

function SplitConfirmation(props: TradeAgreementStageProps) {
  return (
    <section className={`${styles.stage} ${styles.gridLight} ${styles.confirmStage}`}>
      <Header
        activePhase="confirm"
        lifecycleStatus={props.lifecycleStatus}
        offerHref={props.offerHref}
        threadHref={props.threadHref}
      />
      <div>
        {props.formMessage ? (
          <div
            className={`${styles.statusBanner} ${
              props.formMessage.tone === "error" ? styles.statusError : styles.statusSuccess
            }`}
            role="status"
          >
            {props.formMessage.text}
          </div>
        ) : null}
      </div>
      <main className={styles.confirmMain}>
        <PartyPanel party={props.proposer} side="offer" />
        <div className={styles.confirmBridge} aria-label={`Frozen agreement version ${props.version.version}`}>
          <div className={styles.versionRing}>
            <div>
              <strong>V{props.version.version}</strong>
              <span>Frozen terms</span>
            </div>
          </div>
          <div className={styles.bridgeLine}>
            <span className={styles.handshakeDisc}>
              <TradeFlowIcon name="handshake" />
            </span>
          </div>
          <div className={styles.noCustody}>
            <TradeFlowIcon name="shield" />
            No custody · external payment records only
          </div>
        </div>
        <PartyPanel party={props.responder} side="request" />
      </main>
      <footer className={styles.confirmFooter}>
        <div className={styles.guardrails}>
          <div className={styles.guardrail}>
            <TradeFlowIcon name="route" />
            <div>
              <span>Without this deal</span>
              <strong>{props.version.noTradeBaseline}</strong>
            </div>
          </div>
          <div className={styles.guardrail}>
            <TradeFlowIcon name="evidence" />
            <div>
              <span>Evidence</span>
              <strong>{props.version.evidenceRule}</strong>
            </div>
          </div>
          <div className={styles.guardrail}>
            <TradeFlowIcon name="privacy" />
            <div>
              <span>Privacy</span>
              <strong>{props.version.privacyScope}</strong>
            </div>
          </div>
          <div className={styles.guardrail}>
            <TradeFlowIcon name="exit" />
            <div>
              <span>Exit</span>
              <strong>{props.version.exitConditions}</strong>
            </div>
          </div>
        </div>
        <div className={styles.confirmActions}>
          {props.canConfirm ? (
            <form action={props.confirmAction} className={styles.confirmActions}>
              <input name="agreement_id" type="hidden" value={props.agreementId} />
              <input
                name="agreement_version_id"
                type="hidden"
                value={props.version.id}
              />
              <label className={styles.reviewCheck}>
                <input name="terms_reviewed" required type="checkbox" />
                <span>
                  I reviewed this frozen version, including the baseline, commitment limit, evidence, privacy, and exit terms.
                </span>
              </label>
              <PendingSubmitButton
                className={`${styles.actionButton} ${styles.actionPrimary}`}
                pendingLabel="Recording confirmation..."
              >
                Confirm version {props.version.version}
                <TradeFlowIcon name="arrow" />
              </PendingSubmitButton>
            </form>
          ) : props.viewerConfirmed ? (
            <span className={styles.waitingState}>You confirmed · waiting for {props.counterpartLabel}</span>
          ) : null}
          <form action={props.declineAction}>
            <input name="agreement_id" type="hidden" value={props.agreementId} />
            <PendingSubmitButton
              className={styles.actionButton}
              pendingLabel="Declining..."
            >
              Decline before activation
            </PendingSubmitButton>
          </form>
        </div>
      </footer>
    </section>
  );
}

function LiveDealMap(props: TradeAgreementStageProps) {
  const flow = getTradeFlowStage(props.lifecycleStatus, Boolean(props.activatedAt));
  const copy = liveCopy(props);

  return (
    <section className={`${styles.stage} ${styles.liveStage}`}>
      <Header
        activePhase="live"
        lifecycleStatus={props.lifecycleStatus}
        offerHref={props.offerHref}
        threadHref={props.threadHref}
      />
      <main className={styles.liveMap}>
        {props.formMessage ? (
          <div
            className={`${styles.statusBanner} ${
              props.formMessage.tone === "error" ? styles.statusError : styles.statusSuccess
            }`}
            role="status"
          >
            {props.formMessage.text}
          </div>
        ) : null}
        <div className={styles.liveIntro}>
          <div className={styles.kicker}>{copy.kicker}</div>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>

        <svg aria-hidden="true" className={styles.routeSvg} preserveAspectRatio="none" viewBox="0 0 1440 824">
          <path
            className={styles.routeBase}
            d="M120 660 C260 660 260 345 410 345 S625 650 735 650 S860 300 930 300 S1190 650 1335 650"
            pathLength="100"
          />
          <path
            className={styles.routeGlow}
            d="M120 660 C260 660 260 345 410 345 S625 650 735 650 S860 300 930 300 S1190 650 1335 650"
            pathLength="100"
            style={{ strokeDashoffset: flow.progressOffset }}
          />
          <path
            className={styles.routeProgress}
            d="M120 660 C260 660 260 345 410 345 S625 650 735 650 S860 300 930 300 S1190 650 1335 650"
            pathLength="100"
            style={{ strokeDashoffset: flow.progressOffset }}
          />
        </svg>

        <aside className={styles.liveDetail} aria-label="Current trade state">
          <div className={styles.kicker}>{props.lifecycleStatus.replaceAll("_", " ")}</div>
          <h2>{copy.detailHeading}</h2>
          <div className={styles.detailList}>
            {copy.detailRows.map(([label, value]) => (
              <div className={styles.detailRow} key={label}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
            <div className={styles.detailRow}>
              <strong>Evidence</strong>
              <span>{props.version.evidenceRule}</span>
            </div>
          </div>
          <div className={styles.detailActions}>
            <Link className={`${styles.actionButton} ${styles.actionDark}`} href={`/evidence/${props.agreementId}`}>
              Open evidence
              <TradeFlowIcon name="arrow" />
            </Link>
            <Link className={styles.actionButton} href="#terms">
              Inspect terms
            </Link>
          </div>
        </aside>

        <div className={styles.nodeRail}>
          {NODE_CONFIG.map((node, index) => {
            const isDone = index <= flow.completedThrough;
            const isCurrent = index === flow.currentIndex;
            const isEnded = flow.ended && index === flow.completedThrough + 1;
            return (
              <Link
                className={[
                  styles.node,
                  NODE_POSITION_CLASSES[index],
                  isDone ? styles.nodeDone : "",
                  isCurrent ? styles.nodeCurrent : "",
                  isEnded ? styles.nodeEnded : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                href={node.href}
                key={node.label}
              >
                <span>
                  <TradeFlowIcon name={node.icon} />
                  <strong>{node.label}</strong>
                  <small>{nodeDetail(index, props)}</small>
                </span>
              </Link>
            );
          })}
        </div>

        <div className={styles.liveLegend}>
          <span className={styles.legendItem}>Blue route = completed path</span>
          <span className={styles.legendItem}>Every stop uses persisted state</span>
          <span className={styles.legendItem}>No payment or custody</span>
        </div>
      </main>
    </section>
  );
}

export function TradeAgreementStage(props: TradeAgreementStageProps) {
  return props.lifecycleStatus === "proposed" ? (
    <SplitConfirmation {...props} />
  ) : (
    <LiveDealMap {...props} />
  );
}
