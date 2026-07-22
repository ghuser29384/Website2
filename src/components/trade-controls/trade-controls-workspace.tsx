"use client";

import {
  ArrowRight,
  Bank,
  CaretDown,
  Check,
  CheckCircle,
  CirclesThreePlus,
  ClockCounterClockwise,
  Database,
  FileText,
  Fingerprint,
  Gavel,
  HandHeart,
  Info,
  LinkSimple,
  LockKey,
  MagnifyingGlass,
  Path,
  Scales,
  ShieldCheck,
  SlidersHorizontal,
  UsersFour,
  UserCircle,
  UserFocus,
  Warning,
  X,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MutualStepMark } from "@/components/brand/moral-trade-wordmark";

import styles from "./trade-controls-workspace.module.css";

export type TradeControlProtocolSummary = {
  status: "pass" | "fail";
  version: string;
  checks: number;
};

export type TradeControlProtocolMap = Record<string, TradeControlProtocolSummary>;

type FeatureId =
  | "integrity"
  | "circles"
  | "resolution"
  | "governance"
  | "settlement"
  | "verifiers"
  | "values"
  | "evidence"
  | "safeguards"
  | "authority";

type FeatureDefinition = {
  id: FeatureId;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: Icon;
  route: string;
  routeLabel: string;
  protocolKey: string;
  state: "reviewed handoff" | "workspace preview";
};

const FEATURES: readonly FeatureDefinition[] = [
  {
    id: "integrity",
    number: "01",
    title: "Did the trade cause the action?",
    shortTitle: "Cause check",
    description: "Check whether the promised action was already planned before the trade.",
    icon: Fingerprint,
    route: "/trades/new",
    routeLabel: "Apply to a trade draft",
    protocolKey: "integrity",
    state: "reviewed handoff",
  },
  {
    id: "circles",
    number: "02",
    title: "Trades with three or more people",
    shortTitle: "Group trades",
    description: "Try a chain where each person gives one thing and receives another.",
    icon: CirclesThreePlus,
    route: "/create",
    routeLabel: "Start from Create",
    protocolKey: "circles",
    state: "workspace preview",
  },
  {
    id: "resolution",
    number: "03",
    title: "Solve a problem",
    shortTitle: "Problems",
    description: "Describe a problem with the evidence, action, terms, or safety and send it for review.",
    icon: Gavel,
    route: "/commitments",
    routeLabel: "Open commitments",
    protocolKey: "resolution",
    state: "reviewed handoff",
  },
  {
    id: "governance",
    number: "04",
    title: "Change a shared fund",
    shortTitle: "Fund changes",
    description: "Try a vote before changing how a shared fund works.",
    icon: Scales,
    route: "/mpgf/governance",
    routeLabel: "Open pool governance",
    protocolKey: "governance",
    state: "reviewed handoff",
  },
  {
    id: "settlement",
    number: "05",
    title: "Check before money moves",
    shortTitle: "Payment checks",
    description: "See what happens when a funding goal, payment approval, or final condition changes.",
    icon: SlidersHorizontal,
    route: "/pools/radar",
    routeLabel: "Open threshold radar",
    protocolKey: "settlement",
    state: "reviewed handoff",
  },
  {
    id: "verifiers",
    number: "06",
    title: "Choose reviewers",
    shortTitle: "Reviewers",
    description: "Choose current reviewers who have no conflicts before asking for a review.",
    icon: ShieldCheck,
    route: "/validation",
    routeLabel: "Open validation policy",
    protocolKey: "verifiers",
    state: "reviewed handoff",
  },
  {
    id: "values",
    number: "07",
    title: "Keep your priorities private",
    shortTitle: "Private priorities",
    description: "Use private priorities and firm limits to find better matches.",
    icon: LockKey,
    route: "/complete-profile",
    routeLabel: "Edit private profile",
    protocolKey: "values",
    state: "reviewed handoff",
  },
  {
    id: "evidence",
    number: "08",
    title: "Share evidence safely",
    shortTitle: "Evidence sharing",
    description: "Choose exactly what evidence to share, with whom, and for how long.",
    icon: Database,
    route: "/background-networking",
    routeLabel: "Review source permissions",
    protocolKey: "evidence",
    state: "reviewed handoff",
  },
  {
    id: "safeguards",
    number: "09",
    title: "Protect people outside the trade",
    shortTitle: "People affected",
    description: "Check who else could be affected and how they can raise a concern.",
    icon: HandHeart,
    route: "/safety",
    routeLabel: "Open safety rules",
    protocolKey: "safeguards",
    state: "reviewed handoff",
  },
  {
    id: "authority",
    number: "10",
    title: "Set team permissions",
    shortTitle: "Team permissions",
    description: "Set what a team member may do, how much they may approve, and when access ends.",
    icon: UsersFour,
    route: "/team-and-governance",
    routeLabel: "Open team governance",
    protocolKey: "authority",
    state: "reviewed handoff",
  },
] as const;

const VALUE_OPTIONS = [
  "AI safety",
  "Global poverty",
  "Factory farming",
  "Wild animal suffering",
  "Biosecurity",
  "Open governance",
] as const;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function PreviewNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={classNames(styles.previewNotice, compact && styles.previewNoticeCompact)}>
      <Info aria-hidden="true" size={18} weight="bold" />
      <p>
        <strong>Try this tool.</strong> Nothing is saved. This preview cannot move money, make a
        commitment, approve evidence, or change permissions.
      </p>
    </div>
  );
}

function ProtocolBadge({ protocol }: { protocol?: TradeControlProtocolSummary }) {
  if (!protocol) {
    return <span className={styles.protocolBadge}>Safety checks unavailable</span>;
  }

  return (
    <span className={classNames(styles.protocolBadge, protocol.status === "pass" && styles.protocolPass)}>
      {protocol.status === "pass" ? <CheckCircle aria-hidden="true" size={15} weight="fill" /> : <Warning aria-hidden="true" size={15} weight="fill" />}
      Safety checks {protocol.status === "pass" ? "passed" : "need attention"} · {protocol.checks}
    </span>
  );
}

function FeatureHeader({ feature, protocol }: { feature: FeatureDefinition; protocol?: TradeControlProtocolSummary }) {
  const FeatureIcon = feature.icon;

  return (
    <header className={styles.featureHeader}>
      <div className={styles.featureTitleBlock}>
        <div className={styles.featureIcon}>
          <FeatureIcon aria-hidden="true" size={28} weight="regular" />
        </div>
        <div>
          <p className={styles.eyebrow}>{feature.number} · Trade safety tool</p>
          <h1>{feature.title}</h1>
          <p className={styles.featureDescription}>{feature.description}</p>
        </div>
      </div>
      <div className={styles.featureMeta}>
        <span className={feature.state === "workspace preview" ? styles.previewState : styles.handoffState}>
          {feature.state === "workspace preview" ? "Try it here" : "Uses live records"}
        </span>
        <ProtocolBadge protocol={protocol} />
      </div>
    </header>
  );
}

function FeatureActions({ feature, onReset }: { feature: FeatureDefinition; onReset?: () => void }) {
  return (
    <footer className={styles.featureActions}>
      <div>
        <p className={styles.actionLabel}>Use this with a real trade</p>
        <p>Check the real record and who can act before you save anything.</p>
      </div>
      <div className={styles.actionButtons}>
        {onReset ? (
          <button className={styles.secondaryButton} onClick={onReset} type="button">
            Reset preview
          </button>
        ) : null}
        <Link className={styles.primaryButton} href={feature.route}>
          {feature.routeLabel}
          <ArrowRight aria-hidden="true" size={19} weight="bold" />
        </Link>
      </div>
    </footer>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span className={styles.toggleCopy}>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span aria-hidden="true" className={styles.toggleTrack}>
        <span />
      </span>
    </label>
  );
}

function IntegrityPanel({ feature }: { feature: FeatureDefinition }) {
  const [answers, setAnswers] = useState({ predates: false, independent: false, evidence: false, noEscalation: false });
  const passed = Object.values(answers).every(Boolean);

  const setAnswer = (key: keyof typeof answers, value: boolean) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.splitGrid}>
        <section className={styles.surfaceCard}>
          <p className={styles.cardKicker}>Without the trade</p>
          <h2>Would this action happen without the offer?</h2>
          <div className={styles.controlList}>
            <ToggleRow checked={answers.predates} description="The plan existed before this offer was shown." label="The plan came first" onChange={(value) => setAnswer("predates", value)} />
            <ToggleRow checked={answers.independent} description="The person can explain why they would act without the trade." label="There is another reason to act" onChange={(value) => setAnswer("independent", value)} />
            <ToggleRow checked={answers.evidence} description="A reviewer can inspect dated evidence." label="The plan can be checked" onChange={(value) => setAnswer("evidence", value)} />
            <ToggleRow checked={answers.noEscalation} description="The harmful or costly action did not grow after the match." label="The action did not get worse" onChange={(value) => setAnswer("noEscalation", value)} />
          </div>
        </section>
        <aside className={classNames(styles.resultCard, passed ? styles.resultPass : styles.resultNeedsWork)}>
          <Fingerprint aria-hidden="true" size={36} weight="regular" />
          <p className={styles.cardKicker}>Readiness result</p>
          <h2>{passed ? "Ready for a person to review." : "Answer every question first."}</h2>
          <p>
            {passed
              ? "The answers are complete. A reviewer still decides whether the evidence is enough."
              : "This preview cannot approve a match, payment, or public claim."}
          </p>
          <div className={styles.miniLedger}>
            {Object.entries(answers).map(([key, value]) => (
              <span key={key}>
                {value ? <Check aria-hidden="true" size={15} weight="bold" /> : <X aria-hidden="true" size={15} weight="bold" />}
                {key === "noEscalation" ? "no escalation" : key}
              </span>
            ))}
          </div>
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => setAnswers({ predates: false, independent: false, evidence: false, noEscalation: false })} />
    </div>
  );
}

function TradeCirclesPanel({ feature }: { feature: FeatureDefinition }) {
  const [confirmations, setConfirmations] = useState([true, false, false]);
  const [ran, setRan] = useState(false);
  const allConfirmed = confirmations.every(Boolean);
  const members = [
    { name: "You", offer: "2 hours of review", receive: "$80 for AI-safety work" },
    { name: "Mina", offer: "$80 of research funding", receive: "8 verified transit trips" },
    { name: "Jordan", offer: "8 transit trips", receive: "2 hours of review" },
  ];

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <section className={styles.surfaceCard}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <p className={styles.cardKicker}>Example with three people</p>
            <h2>One set of terms. Everyone agrees.</h2>
          </div>
          <span className={styles.smallStatus}>{confirmations.filter(Boolean).length} of 3 confirmed</span>
        </div>
        <div className={styles.circleMembers}>
          {members.map((member, index) => (
            <article className={classNames(styles.memberCard, confirmations[index] && styles.memberConfirmed)} key={member.name}>
              <div className={styles.memberName}>
                <UserCircle aria-hidden="true" size={26} weight="regular" />
                <strong>{member.name}</strong>
              </div>
              <dl>
                <div><dt>Offers</dt><dd>{member.offer}</dd></div>
                <div><dt>Receives</dt><dd>{member.receive}</dd></div>
              </dl>
              <button
                aria-pressed={confirmations[index]}
                className={styles.confirmButton}
                onClick={() => {
                  setRan(false);
                  setConfirmations((current) => current.map((value, memberIndex) => memberIndex === index ? !value : value));
                }}
                type="button"
              >
                {confirmations[index] ? <CheckCircle aria-hidden="true" size={17} weight="fill" /> : <UserFocus aria-hidden="true" size={17} />}
                {confirmations[index] ? "Confirmed" : "Confirm terms"}
              </button>
            </article>
          ))}
        </div>
        <div className={styles.clearingStrip}>
          <Path aria-hidden="true" size={28} weight="regular" />
          <div>
            <strong>{ran && allConfirmed ? "The group trade can go ahead." : ran ? "The group trade is still waiting." : "Check whether the trade can go ahead."}</strong>
            <p>{ran && allConfirmed ? "Everyone gives, receives, and agrees to the same terms." : "The trade waits if anyone has not agreed or the terms change."}</p>
          </div>
          <button className={styles.darkButton} onClick={() => setRan(true)} type="button">Run preview</button>
        </div>
      </section>
      <FeatureActions feature={feature} onReset={() => { setConfirmations([true, false, false]); setRan(false); }} />
    </div>
  );
}

function ResolutionPanel({ feature }: { feature: FeatureDefinition }) {
  const [issue, setIssue] = useState("evidence");
  const [standing, setStanding] = useState(false);
  const [redacted, setRedacted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ready = standing && redacted;

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.resolutionGrid}>
        <section className={styles.surfaceCard}>
          <p className={styles.cardKicker}>Describe the problem</p>
          <h2>What changed?</h2>
          <div className={styles.segmented} role="group" aria-label="Issue type">
            {[
              ["evidence", "Evidence"],
              ["completion", "Completion"],
              ["terms", "Terms"],
              ["safety", "Safety"],
            ].map(([value, label]) => (
              <button aria-pressed={issue === value} key={value} onClick={() => { setIssue(value); setSubmitted(false); }} type="button">{label}</button>
            ))}
          </div>
          <label className={styles.textAreaLabel}>
            <span>Private case summary</span>
            <textarea defaultValue={`The ${issue} does not match what we agreed. Please review this claim and its evidence.`} key={issue} rows={4} />
          </label>
          <ToggleRow checked={standing} description="The person is involved, affected, reviewing, or handling safety." label="This person can raise the concern" onChange={(value) => { setStanding(value); setSubmitted(false); }} />
          <ToggleRow checked={redacted} description="Any notice shown outside the case leaves out private details." label="Private details are hidden" onChange={(value) => { setRedacted(value); setSubmitted(false); }} />
          <button className={styles.darkButton} disabled={!ready} onClick={() => setSubmitted(true)} type="button">Preview the review path</button>
        </section>
        <aside className={styles.timelineCard}>
          <p className={styles.cardKicker}>Resolution path</p>
          {[
            ["Problem described", true],
            ["Person can raise it", standing],
            ["Privacy notice checked", redacted],
            ["Human review queued", submitted],
          ].map(([label, active], index) => (
            <div className={classNames(styles.timelineStep, active && styles.timelineStepActive)} key={String(label)}>
              <span>{active ? <Check aria-hidden="true" size={14} weight="bold" /> : index + 1}</span>
              <p>{label}</p>
            </div>
          ))}
          <div className={styles.timelineOutcome}>
            <ClockCounterClockwise aria-hidden="true" size={24} />
            <p>{submitted ? "Preview complete. The live case remains operator-reviewed and non-retaliatory." : "No case has been submitted from this preview."}</p>
          </div>
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => { setIssue("evidence"); setStanding(false); setRedacted(false); setSubmitted(false); }} />
    </div>
  );
}

function GovernancePanel({ feature }: { feature: FeatureDefinition }) {
  const [allocations, setAllocations] = useState({ research: 45, direct: 35, infrastructure: 20 });
  const [consent, setConsent] = useState<"approve" | "reject" | "withdraw" | null>(null);
  const total = Object.values(allocations).reduce((sum, value) => sum + value, 0);

  const setAllocation = (key: keyof typeof allocations, value: number) => {
    setAllocations((current) => ({ ...current, [key]: value }));
    setConsent(null);
  };

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.splitGrid}>
        <section className={styles.surfaceCard}>
          <div className={styles.sectionHeadingRow}>
            <div><p className={styles.cardKicker}>Preview a fund change</p><h2>Change how the next round is split.</h2></div>
            <strong className={classNames(styles.totalPill, total === 100 ? styles.totalGood : styles.totalBad)}>{total}%</strong>
          </div>
          {Object.entries(allocations).map(([key, value]) => (
            <label className={styles.rangeRow} key={key}>
              <span><strong>{key === "direct" ? "Direct programs" : key[0].toUpperCase() + key.slice(1)}</strong><output>{value}%</output></span>
              <input max="100" min="0" onChange={(event) => setAllocation(key as keyof typeof allocations, Number(event.target.value))} type="range" value={value} />
            </label>
          ))}
          <p className={styles.helperText}>The people who can vote and the terms are fixed when voting starts. This slider changes only the preview.</p>
        </section>
        <aside className={styles.voteCard}>
          <Scales aria-hidden="true" size={34} weight="regular" />
          <p className={styles.cardKicker}>Your choice</p>
          <h2>{consent ? `Choice: ${consent}` : "Review the proposal."}</h2>
          <p>Changing the terms requires a new version and fresh contributor consent.</p>
          <div className={styles.voteButtons}>
            {(["approve", "reject", "withdraw"] as const).map((choice) => (
              <button aria-pressed={consent === choice} disabled={total !== 100} key={choice} onClick={() => setConsent(choice)} type="button">{choice}</button>
            ))}
          </div>
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => { setAllocations({ research: 45, direct: 35, infrastructure: 20 }); setConsent(null); }} />
    </div>
  );
}

function SettlementPanel({ feature }: { feature: FeatureDefinition }) {
  const [committed, setCommitted] = useState(82);
  const [authorizationCurrent, setAuthorizationCurrent] = useState(true);
  const [conditionCurrent, setConditionCurrent] = useState(false);
  const [revalidated, setRevalidated] = useState(false);
  const thresholdMet = committed >= 100;
  const releasable = thresholdMet && authorizationCurrent && conditionCurrent && revalidated;

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <section className={styles.settlementCard}>
        <div className={styles.settlementMeterBlock}>
          <p className={styles.cardKicker}>Worked example · $25,000 threshold</p>
          <h2>{committed}% of the goal is pledged.</h2>
          <label className={styles.rangeRow}>
            <span><strong>Commitment level</strong><output>{Math.round(25000 * committed / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</output></span>
            <input aria-label="Commitment level" max="110" min="0" onChange={(event) => { setCommitted(Number(event.target.value)); setRevalidated(false); }} type="range" value={committed} />
          </label>
          <div className={styles.thresholdMarkers}><span>$0</span><span>Threshold $25,000</span><span>$27,500</span></div>
        </div>
        <div className={styles.revalidationList}>
          <ToggleRow checked={authorizationCurrent} description="The payment provider must still show approval on the live record." label="Payment approval is still valid" onChange={(value) => { setAuthorizationCurrent(value); setRevalidated(false); }} />
          <ToggleRow checked={conditionCurrent} description="The stated job, delivery, or funding condition is still true." label="Release condition remains current" onChange={(value) => { setConditionCurrent(value); setRevalidated(false); }} />
          <button className={styles.darkButton} onClick={() => setRevalidated(true)} type="button">Check again</button>
        </div>
        <aside className={classNames(styles.settlementOutcome, releasable && styles.resultPass)}>
          {releasable ? <CheckCircle aria-hidden="true" size={30} weight="fill" /> : <LockKey aria-hidden="true" size={30} />}
          <div><strong>{releasable ? "All conditions are met." : "Money cannot move yet."}</strong><p>{releasable ? "The live payment record still controls any charge or release." : "The goal, payment approval, final condition, and latest check must all be current."}</p></div>
        </aside>
      </section>
      <FeatureActions feature={feature} onReset={() => { setCommitted(82); setAuthorizationCurrent(true); setConditionCurrent(false); setRevalidated(false); }} />
    </div>
  );
}

function VerifierPanel({ feature }: { feature: FeatureDefinition }) {
  const reviewers = [
    { id: "mina", name: "Mina P.", scope: "Receipts and transit records", current: true, conflict: false },
    { id: "sam", name: "Sam O.", scope: "Program and research evidence", current: true, conflict: false },
    { id: "priya", name: "Priya S.", scope: "Employment and salary-gap evidence", current: true, conflict: false },
    { id: "jordan", name: "Jordan K.", scope: "Policy deliverables", current: false, conflict: true },
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const quorum = selected.length >= 2;

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <section className={styles.surfaceCard}>
        <div className={styles.sectionHeadingRow}>
          <div><p className={styles.cardKicker}>Reviewer preview</p><h2>Select two current reviewers with no conflicts.</h2></div>
          <span className={classNames(styles.smallStatus, quorum && styles.smallStatusGood)}>{quorum ? "Two reviewers selected" : `${selected.length} of 2 selected`}</span>
        </div>
        <div className={styles.reviewerGrid}>
          {reviewers.map((reviewer) => {
            const active = selected.includes(reviewer.id);
            const blocked = !reviewer.current || reviewer.conflict;
            return (
              <button
                aria-pressed={active}
                className={classNames(styles.reviewerCard, active && styles.reviewerSelected, blocked && styles.reviewerBlocked)}
                disabled={blocked}
                key={reviewer.id}
                onClick={() => setSelected((current) => active ? current.filter((id) => id !== reviewer.id) : current.length < 2 ? [...current, reviewer.id] : current)}
                type="button"
              >
                <span className={styles.reviewerAvatar}><UserFocus aria-hidden="true" size={24} /></span>
                <span><strong>{reviewer.name}</strong><small>{reviewer.scope}</small></span>
                <span className={styles.reviewerState}>{blocked ? "Unavailable" : active ? "Selected" : "Available"}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.assignmentSummary}>
          <ShieldCheck aria-hidden="true" size={28} />
          <div><strong>{quorum ? "You can ask for a two-person review." : "Choose two reviewers."}</strong><p>The live page still checks what each reviewer may review, conflicts, end dates, workload, and challenges.</p></div>
        </div>
      </section>
      <FeatureActions feature={feature} onReset={() => setSelected([])} />
    </div>
  );
}

function ValuesPanel({ feature }: { feature: FeatureDefinition }) {
  const [selected, setSelected] = useState<string[]>(["AI safety", "Open governance"]);
  const [hardVeto, setHardVeto] = useState(true);
  const [privateByDefault, setPrivateByDefault] = useState(true);
  const [applied, setApplied] = useState(false);

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.valuesGrid}>
        <section className={styles.surfaceCard}>
          <p className={styles.cardKicker}>Only you can see this preview</p>
          <h2>What should matching protect?</h2>
          <div className={styles.valueChips}>
            {VALUE_OPTIONS.map((value) => {
              const active = selected.includes(value);
              return <button aria-pressed={active} key={value} onClick={() => { setApplied(false); setSelected((current) => active ? current.filter((item) => item !== value) : [...current, value]); }} type="button">{active && <Check aria-hidden="true" size={14} weight="bold" />}{value}</button>;
            })}
          </div>
          <ToggleRow checked={hardVeto} description="Do not recommend a match that crosses a private non-negotiable constraint." label="Respect hard constraints" onChange={(value) => { setHardVeto(value); setApplied(false); }} />
          <ToggleRow checked={privateByDefault} description="Use the values for matching without publishing a moral ranking or score." label="Keep exact values private" onChange={(value) => { setPrivateByDefault(value); setApplied(false); }} />
          <button className={styles.darkButton} onClick={() => setApplied(true)} type="button">Preview matching filters</button>
        </section>
        <aside className={styles.profilePreview}>
          <LockKey aria-hidden="true" size={34} weight="regular" />
          <p className={styles.cardKicker}>Private matching choices</p>
          <h2>{applied ? "Matching is more focused." : "Your matching choices are unchanged."}</h2>
          <dl>
            <div><dt>Priority areas selected</dt><dd>{selected.length}</dd></div>
            <div><dt>Hard constraints</dt><dd>{hardVeto ? "Protected" : "Not set"}</dd></div>
            <div><dt>Publication</dt><dd>{privateByDefault ? "Private" : "Review required"}</dd></div>
          </dl>
          <p>No public moral score is created.</p>
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => { setSelected(["AI safety", "Open governance"]); setHardVeto(true); setPrivateByDefault(true); setApplied(false); }} />
    </div>
  );
}

function EvidencePanel({ feature }: { feature: FeatureDefinition }) {
  const sources = [
    { id: "upload", name: "Reviewed document upload", icon: FileText, detail: "Share one named file with a reviewer." },
    { id: "receipt", name: "Receipt summary", icon: Bank, detail: "Share selected fields, not raw account access." },
    { id: "reference", name: "External reference link", icon: LinkSimple, detail: "Point to a public or permissioned record." },
  ];
  const [enabled, setEnabled] = useState<string[]>(["upload"]);
  const [retention, setRetention] = useState("30");
  const [previewed, setPreviewed] = useState(false);

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.evidenceGrid}>
        <section className={styles.surfaceCard}>
          <p className={styles.cardKicker}>Evidence sharing preview</p>
          <h2>Share the minimum evidence needed.</h2>
          <div className={styles.sourceList}>
            {sources.map((source) => {
              const SourceIcon = source.icon;
              const active = enabled.includes(source.id);
              return (
                <button aria-pressed={active} className={classNames(styles.sourceRow, active && styles.sourceRowActive)} key={source.id} onClick={() => { setPreviewed(false); setEnabled((current) => active ? current.filter((id) => id !== source.id) : [...current, source.id]); }} type="button">
                  <SourceIcon aria-hidden="true" size={23} />
                  <span><strong>{source.name}</strong><small>{source.detail}</small></span>
                  <span>{active ? "Included" : "Not shared"}</span>
                </button>
              );
            })}
          </div>
        </section>
        <aside className={styles.permissionCard}>
          <LockKey aria-hidden="true" size={30} />
          <p className={styles.cardKicker}>Sharing limits</p>
          <label><span>How long to keep it</span><select onChange={(event) => { setRetention(event.target.value); setPreviewed(false); }} value={retention}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
          <ul>
            <li><Check aria-hidden="true" size={14} /> Full source stays private</li>
            <li><Check aria-hidden="true" size={14} /> Reason for sharing is named</li>
            <li><Check aria-hidden="true" size={14} /> Permission can be revoked</li>
          </ul>
          <button className={styles.darkButton} onClick={() => setPreviewed(true)} type="button">Preview sharing</button>
          {previewed ? <p className={styles.permissionOutcome}>{enabled.length} source type{enabled.length === 1 ? "" : "s"} · expires after {retention} days · no connection created</p> : null}
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => { setEnabled(["upload"]); setRetention("30"); setPreviewed(false); }} />
    </div>
  );
}

function SafeguardsPanel({ feature }: { feature: FeatureDefinition }) {
  const [unrepresented, setUnrepresented] = useState(true);
  const [community, setCommunity] = useState(false);
  const [standing, setStanding] = useState(false);
  const [remedy, setRemedy] = useState(false);
  const hasTrigger = unrepresented || community;
  const clearedForReview = hasTrigger ? standing && remedy : true;

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.safeguardGrid}>
        <section className={styles.surfaceCard}>
          <p className={styles.cardKicker}>Who else is affected?</p>
          <h2>Who could bear a cost without being at the table?</h2>
          <ToggleRow checked={unrepresented} description="A person or group affected by the terms is not part of the trade." label="Someone affected is not included" onChange={setUnrepresented} />
          <ToggleRow checked={community} description="The activity could create a local, environmental, or community impact." label="Community or environmental impact" onChange={setCommunity} />
          <div className={styles.divider} />
          <ToggleRow checked={standing} description="A person who may be affected has a safe way to raise a concern." label="People affected can speak up" onChange={setStanding} />
          <ToggleRow checked={remedy} description="There is a clear response if the concern is supported by evidence." label="A response is planned" onChange={setRemedy} />
        </section>
        <aside className={classNames(styles.safeguardOutcome, clearedForReview ? styles.resultPass : styles.resultNeedsWork)}>
          {clearedForReview ? <ShieldCheck aria-hidden="true" size={38} weight="fill" /> : <Warning aria-hidden="true" size={38} weight="fill" />}
          <p className={styles.cardKicker}>Safety result</p>
          <h2>{clearedForReview ? "Ready for a person to review." : "The trade must stay paused."}</h2>
          <p>{clearedForReview ? "People affected can raise a concern, and a response is planned. A reviewer still checks the evidence." : "The trade cannot move ahead until people affected can speak up and a response is planned."}</p>
          <Link href="/contact">Report a safety concern <ArrowRight aria-hidden="true" size={16} /></Link>
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => { setUnrepresented(true); setCommunity(false); setStanding(false); setRemedy(false); }} />
    </div>
  );
}

function AuthorityPanel({ feature }: { feature: FeatureDefinition }) {
  const [limit, setLimit] = useState(250);
  const [scope, setScope] = useState("draft");
  const [firstApproval, setFirstApproval] = useState(true);
  const [secondApproval, setSecondApproval] = useState(false);
  const [checked, setChecked] = useState(false);
  const approved = firstApproval && secondApproval;

  return (
    <div className={styles.panelStack}>
      <PreviewNotice />
      <div className={styles.authorityGrid}>
        <section className={styles.surfaceCard}>
          <p className={styles.cardKicker}>Team permission preview</p>
          <h2>What may this role do?</h2>
          <div className={styles.formGrid}>
            <label><span>Role</span><select><option>Programs lead</option><option>Finance reviewer</option><option>Evidence reviewer</option></select></label>
            <label><span>Allowed actions</span><select onChange={(event) => { setScope(event.target.value); setChecked(false); }} value={scope}><option value="draft">Draft only</option><option value="publish">Draft and publish</option><option value="lock">Draft, publish, and ask to finalize</option></select></label>
            <label><span>Maximum amount</span><div className={styles.moneyInput}><span>$</span><input min="0" onChange={(event) => { setLimit(Number(event.target.value)); setChecked(false); }} type="number" value={limit} /></div></label>
            <label><span>Grant expires</span><input defaultValue="2026-08-31" type="date" /></label>
          </div>
          <div className={styles.approvalGrid}>
            <ToggleRow checked={firstApproval} description="The request creator cannot count twice." label="Approver one confirmed" onChange={(value) => { setFirstApproval(value); setChecked(false); }} />
            <ToggleRow checked={secondApproval} description="A different authorized person confirms the same terms." label="Approver two confirmed" onChange={(value) => { setSecondApproval(value); setChecked(false); }} />
          </div>
          <button className={styles.darkButton} onClick={() => setChecked(true)} type="button">Check authority preview</button>
        </section>
        <aside className={styles.authorityReceipt}>
          <UsersFour aria-hidden="true" size={34} />
          <p className={styles.cardKicker}>Permission summary</p>
          <h2>{checked ? approved ? "The request fits these permissions." : "A second approver is required." : "Permissions have not been checked."}</h2>
          <dl>
            <div><dt>Allowed actions</dt><dd>{scope.replaceAll("_", " ")}</dd></div>
            <div><dt>Limit</dt><dd>{limit.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</dd></div>
            <div><dt>Distinct approvals</dt><dd>{Number(firstApproval) + Number(secondApproval)} of 2</dd></div>
            <div><dt>Payment authority</dt><dd>None</dd></div>
          </dl>
        </aside>
      </div>
      <FeatureActions feature={feature} onReset={() => { setLimit(250); setScope("draft"); setFirstApproval(true); setSecondApproval(false); setChecked(false); }} />
    </div>
  );
}

function renderFeature(feature: FeatureDefinition) {
  switch (feature.id) {
    case "integrity": return <IntegrityPanel feature={feature} />;
    case "circles": return <TradeCirclesPanel feature={feature} />;
    case "resolution": return <ResolutionPanel feature={feature} />;
    case "governance": return <GovernancePanel feature={feature} />;
    case "settlement": return <SettlementPanel feature={feature} />;
    case "verifiers": return <VerifierPanel feature={feature} />;
    case "values": return <ValuesPanel feature={feature} />;
    case "evidence": return <EvidencePanel feature={feature} />;
    case "safeguards": return <SafeguardsPanel feature={feature} />;
    case "authority": return <AuthorityPanel feature={feature} />;
  }
}

export function TradeControlsWorkspace({ protocols }: { protocols: TradeControlProtocolMap }) {
  const [activeId, setActiveId] = useState<FeatureId>("integrity");
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeFeature = FEATURES.find((feature) => feature.id === activeId) ?? FEATURES[0];
  const filteredFeatures = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return FEATURES;
    return FEATURES.filter((feature) => `${feature.title} ${feature.description}`.toLowerCase().includes(normalized));
  }, [query]);

  const selectFeature = (id: FeatureId) => {
    setActiveId(id);
    setMobileMenuOpen(false);
    globalThis.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link aria-label="Moral Trade home" className={styles.brand} href="/">
          <MutualStepMark className={styles.brandMark} />
          <span>Moral Trade</span>
        </Link>
        <nav aria-label="Primary" className={styles.primaryNav}>
          <Link href="/">Now</Link>
          <Link href="/discover">Discover</Link>
          <Link href="/create">Offer</Link>
          <Link href="/commitments">Activity</Link>
          <Link href="/profile">Account</Link>
        </nav>
        <Link className={styles.accountLink} href="/profile" aria-label="Open account">
          <UserCircle aria-hidden="true" size={31} weight="thin" />
        </Link>
      </header>

      <div className={styles.mobileFeatureBar}>
        <button aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} type="button">
          <span><small>{activeFeature.number}</small>{activeFeature.shortTitle}</span>
          <CaretDown aria-hidden="true" size={17} />
        </button>
      </div>

      <div className={styles.workspace}>
        <aside className={classNames(styles.sidebar, mobileMenuOpen && styles.sidebarOpen)}>
          <div className={styles.sidebarHead}>
            <p className={styles.eyebrow}>Trade controls</p>
            <h2>Ten ways to make a deal safer.</h2>
            <label className={styles.searchField}>
              <MagnifyingGlass aria-hidden="true" size={17} />
              <span className="sr-only">Search controls</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Find a control" type="search" value={query} />
            </label>
          </div>
          <nav aria-label="Trade controls" className={styles.featureNav}>
            {filteredFeatures.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <button aria-current={activeId === feature.id ? "page" : undefined} className={activeId === feature.id ? styles.featureNavActive : undefined} key={feature.id} onClick={() => selectFeature(feature.id)} type="button">
                  <span className={styles.navNumber}>{feature.number}</span>
                  <FeatureIcon aria-hidden="true" size={19} weight="regular" />
                  <span>{feature.shortTitle}</span>
                  <ArrowRight aria-hidden="true" className={styles.navArrow} size={15} />
                </button>
              );
            })}
          </nav>
          <div className={styles.sidebarFoot}>
            <ShieldCheck aria-hidden="true" size={20} />
            <p>Controls fail closed. A preview never authorizes reliance.</p>
          </div>
        </aside>

        <main className={styles.main} id="main-content" tabIndex={-1}>
          <FeatureHeader feature={activeFeature} protocol={protocols[activeFeature.protocolKey]} />
          <div className={styles.featureBody}>{renderFeature(activeFeature)}</div>
          <div className={styles.workspaceFooter}>
            <p>Control {activeFeature.number} of {FEATURES.length.toString().padStart(2, "0")}</p>
            <div>
              <button disabled={activeFeature.id === FEATURES[0].id} onClick={() => {
                const index = FEATURES.findIndex((feature) => feature.id === activeFeature.id);
                selectFeature(FEATURES[Math.max(0, index - 1)].id);
              }} type="button">Previous</button>
              <button disabled={activeFeature.id === FEATURES[FEATURES.length - 1].id} onClick={() => {
                const index = FEATURES.findIndex((feature) => feature.id === activeFeature.id);
                selectFeature(FEATURES[Math.min(FEATURES.length - 1, index + 1)].id);
              }} type="button">Next <ArrowRight aria-hidden="true" size={15} /></button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
