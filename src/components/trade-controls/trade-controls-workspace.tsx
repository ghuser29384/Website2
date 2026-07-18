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
    title: "Counterfactual Integrity Check",
    shortTitle: "Integrity check",
    description: "Test whether the promised action existed before the trade and was not manufactured for leverage.",
    icon: Fingerprint,
    route: "/trades/new",
    routeLabel: "Apply to a trade draft",
    protocolKey: "integrity",
    state: "reviewed handoff",
  },
  {
    id: "circles",
    number: "02",
    title: "Multi-party Trade Circles",
    shortTitle: "Trade circles",
    description: "Preview a chain in which each person offers one thing and receives another without forcing a single bilateral swap.",
    icon: CirclesThreePlus,
    route: "/create",
    routeLabel: "Start from Create",
    protocolKey: "circles",
    state: "workspace preview",
  },
  {
    id: "resolution",
    number: "03",
    title: "Resolution Center",
    shortTitle: "Resolution center",
    description: "Scope an evidence, completion, or terms problem and route it to the existing challenge and review workflow.",
    icon: Gavel,
    route: "/commitments",
    routeLabel: "Open commitments",
    protocolKey: "resolution",
    state: "reviewed handoff",
  },
  {
    id: "governance",
    number: "04",
    title: "Pool Governance",
    shortTitle: "Pool governance",
    description: "Test a contributor ballot before a material public-good pool change is submitted.",
    icon: Scales,
    route: "/mpgf/governance",
    routeLabel: "Open pool governance",
    protocolKey: "governance",
    state: "reviewed handoff",
  },
  {
    id: "settlement",
    number: "05",
    title: "Threshold Settlement and Revalidation",
    shortTitle: "Threshold settlement",
    description: "Inspect what should happen when a threshold, authorization, or final condition changes before release.",
    icon: SlidersHorizontal,
    route: "/pools/radar",
    routeLabel: "Open threshold radar",
    protocolKey: "settlement",
    state: "reviewed handoff",
  },
  {
    id: "verifiers",
    number: "06",
    title: "Verifier Governance",
    shortTitle: "Verifier governance",
    description: "Preview scope, conflicts, expiry, quorum, and reassignment before relying on a review.",
    icon: ShieldCheck,
    route: "/validation",
    routeLabel: "Open validation policy",
    protocolKey: "verifiers",
    state: "reviewed handoff",
  },
  {
    id: "values",
    number: "07",
    title: "Private Values Profile",
    shortTitle: "Private values",
    description: "Keep priorities and hard constraints private while using them to narrow compatible opportunities.",
    icon: LockKey,
    route: "/complete-profile",
    routeLabel: "Edit private profile",
    protocolKey: "values",
    state: "reviewed handoff",
  },
  {
    id: "evidence",
    number: "08",
    title: "Evidence Integrations",
    shortTitle: "Evidence integrations",
    description: "Preview a consent grant for reviewed summaries, uploads, and references without exposing raw private data.",
    icon: Database,
    route: "/background-networking",
    routeLabel: "Review source permissions",
    protocolKey: "evidence",
    state: "reviewed handoff",
  },
  {
    id: "safeguards",
    number: "09",
    title: "Affected-party Safeguards",
    shortTitle: "Affected-party safeguards",
    description: "Identify unrepresented impacts, standing, and remedy requirements before a trade can be treated as safe to rely on.",
    icon: HandHeart,
    route: "/safety",
    routeLabel: "Open safety rules",
    protocolKey: "safeguards",
    state: "reviewed handoff",
  },
  {
    id: "authority",
    number: "10",
    title: "Team Authority",
    shortTitle: "Team authority",
    description: "Preview role scope, limits, and distinct-person approval before a team member acts for an organization.",
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
        <strong>Interactive workspace preview.</strong> No durable state, payment, commitment,
        verification, settlement, or authority change occurs here.
      </p>
    </div>
  );
}

function ProtocolBadge({ protocol }: { protocol?: TradeControlProtocolSummary }) {
  if (!protocol) {
    return <span className={styles.protocolBadge}>Protocol summary unavailable</span>;
  }

  return (
    <span className={classNames(styles.protocolBadge, protocol.status === "pass" && styles.protocolPass)}>
      {protocol.status === "pass" ? <CheckCircle aria-hidden="true" size={15} weight="fill" /> : <Warning aria-hidden="true" size={15} weight="fill" />}
      Protocol surface {protocol.status} · {protocol.checks} checks
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
          <p className={styles.eyebrow}>{feature.number} · Trade control</p>
          <h1>{feature.title}</h1>
          <p className={styles.featureDescription}>{feature.description}</p>
        </div>
      </div>
      <div className={styles.featureMeta}>
        <span className={feature.state === "workspace preview" ? styles.previewState : styles.handoffState}>
          {feature.state}
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
        <p className={styles.actionLabel}>Continue in the live product</p>
        <p>Review the actual record and permissions before creating any durable state.</p>
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
          <p className={styles.cardKicker}>No-trade baseline</p>
          <h2>Would this action happen without the offer?</h2>
          <div className={styles.controlList}>
            <ToggleRow checked={answers.predates} description="The plan existed before this proposal was shown." label="The intention predates the offer" onChange={(value) => setAnswer("predates", value)} />
            <ToggleRow checked={answers.independent} description="The participant can name a reason independent of marketplace leverage." label="There is an independent reason" onChange={(value) => setAnswer("independent", value)} />
            <ToggleRow checked={answers.evidence} description="A reviewer could inspect a dated, appropriately scoped artifact." label="Supporting evidence can be reviewed" onChange={(value) => setAnswer("evidence", value)} />
            <ToggleRow checked={answers.noEscalation} description="The harmful or costly baseline was not increased after matching." label="The baseline was not escalated" onChange={(value) => setAnswer("noEscalation", value)} />
          </div>
        </section>
        <aside className={classNames(styles.resultCard, passed ? styles.resultPass : styles.resultNeedsWork)}>
          <Fingerprint aria-hidden="true" size={36} weight="regular" />
          <p className={styles.cardKicker}>Readiness result</p>
          <h2>{passed ? "Ready for human review." : "More baseline evidence is needed."}</h2>
          <p>
            {passed
              ? "The declaration is internally complete. A reviewer still decides whether the evidence is sufficient."
              : "Incomplete answers fail closed. This preview cannot authorize matching, payment, or public claims."}
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
            <p className={styles.cardKicker}>Three-leg worked example</p>
            <h2>One frozen set of terms. Every member confirms.</h2>
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
            <strong>{ran && allConfirmed ? "A complete circle is available." : ran ? "The circle remains blocked." : "Run a clearing preview."}</strong>
            <p>{ran && allConfirmed ? "Every leg has a provider, recipient, and confirmation on the same worked-example terms." : "Any missing or changed confirmation blocks the complete circle."}</p>
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
          <p className={styles.cardKicker}>Scope a case</p>
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
            <textarea defaultValue={`The ${issue} record does not match the agreed scope. Please review the named claim and attached evidence only.`} key={issue} rows={4} />
          </label>
          <ToggleRow checked={standing} description="Participant, counterparty, affected party, reviewer, or safety operator." label="Standing is named" onChange={(value) => { setStanding(value); setSubmitted(false); }} />
          <ToggleRow checked={redacted} description="Private details are removed from any notice shown outside the case." label="Notice is privacy-safe" onChange={(value) => { setRedacted(value); setSubmitted(false); }} />
          <button className={styles.darkButton} disabled={!ready} onClick={() => setSubmitted(true)} type="button">Preview case routing</button>
        </section>
        <aside className={styles.timelineCard}>
          <p className={styles.cardKicker}>Resolution path</p>
          {[
            ["Case scoped", true],
            ["Standing checked", standing],
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
            <div><p className={styles.cardKicker}>Material-change ballot preview</p><h2>Rebalance the next pool cycle.</h2></div>
            <strong className={classNames(styles.totalPill, total === 100 ? styles.totalGood : styles.totalBad)}>{total}%</strong>
          </div>
          {Object.entries(allocations).map(([key, value]) => (
            <label className={styles.rangeRow} key={key}>
              <span><strong>{key === "direct" ? "Direct programs" : key[0].toUpperCase() + key.slice(1)}</strong><output>{value}%</output></span>
              <input max="100" min="0" onChange={(event) => setAllocation(key as keyof typeof allocations, Number(event.target.value))} type="range" value={value} />
            </label>
          ))}
          <p className={styles.helperText}>A live ballot uses an eligible-contributor snapshot and immutable open terms. This slider changes only the preview.</p>
        </section>
        <aside className={styles.voteCard}>
          <Scales aria-hidden="true" size={34} weight="regular" />
          <p className={styles.cardKicker}>Your reviewed choice</p>
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
          <h2>{committed}% conditionally pledged.</h2>
          <label className={styles.rangeRow}>
            <span><strong>Commitment level</strong><output>{Math.round(25000 * committed / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</output></span>
            <input aria-label="Commitment level" max="110" min="0" onChange={(event) => { setCommitted(Number(event.target.value)); setRevalidated(false); }} type="range" value={committed} />
          </label>
          <div className={styles.thresholdMarkers}><span>$0</span><span>Threshold $25,000</span><span>$27,500</span></div>
        </div>
        <div className={styles.revalidationList}>
          <ToggleRow checked={authorizationCurrent} description="Provider status must be checked in the live settlement record." label="Authorization remains current" onChange={(value) => { setAuthorizationCurrent(value); setRevalidated(false); }} />
          <ToggleRow checked={conditionCurrent} description="The stated job, delivery, or funding condition is still true." label="Release condition remains current" onChange={(value) => { setConditionCurrent(value); setRevalidated(false); }} />
          <button className={styles.darkButton} onClick={() => setRevalidated(true)} type="button">Revalidate preview</button>
        </div>
        <aside className={classNames(styles.settlementOutcome, releasable && styles.resultPass)}>
          {releasable ? <CheckCircle aria-hidden="true" size={30} weight="fill" /> : <LockKey aria-hidden="true" size={30} />}
          <div><strong>{releasable ? "All preview conditions align." : "Release remains blocked."}</strong><p>{releasable ? "A provider-backed live record would still control any charge or release." : "Threshold, authorization, condition, and revalidation must all be current."}</p></div>
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
          <div><p className={styles.cardKicker}>Assignment preview</p><h2>Select two in-scope, conflict-free reviewers.</h2></div>
          <span className={classNames(styles.smallStatus, quorum && styles.smallStatusGood)}>{quorum ? "Quorum previewed" : `${selected.length} of 2 selected`}</span>
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
                <span className={styles.reviewerState}>{blocked ? "Recused / expired" : active ? "Selected" : "Available"}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.assignmentSummary}>
          <ShieldCheck aria-hidden="true" size={28} />
          <div><strong>{quorum ? "Two-person review can be requested." : "Assignment is not ready."}</strong><p>Live reviewer assignment still checks scope, conflicts, expiry, capacity, and participant challenges.</p></div>
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
          <p className={styles.cardKicker}>Private recommendation lens</p>
          <h2>{applied ? "Compatible lanes are narrowed." : "Your private lens is unchanged."}</h2>
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
          <p className={styles.cardKicker}>Permission grant preview</p>
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
          <p className={styles.cardKicker}>Consent boundary</p>
          <label><span>Retention period</span><select onChange={(event) => { setRetention(event.target.value); setPreviewed(false); }} value={retention}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
          <ul>
            <li><Check aria-hidden="true" size={14} /> Raw ingestion stays off</li>
            <li><Check aria-hidden="true" size={14} /> Reviewer purpose is named</li>
            <li><Check aria-hidden="true" size={14} /> Permission can be revoked</li>
          </ul>
          <button className={styles.darkButton} onClick={() => setPreviewed(true)} type="button">Preview consent grant</button>
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
          <p className={styles.cardKicker}>Impact screen</p>
          <h2>Who could bear a cost without being at the table?</h2>
          <ToggleRow checked={unrepresented} description="A person or group affected by the terms is not a direct participant." label="Unrepresented third party" onChange={setUnrepresented} />
          <ToggleRow checked={community} description="The activity could create a local, environmental, or community impact." label="Community or environmental impact" onChange={setCommunity} />
          <div className={styles.divider} />
          <ToggleRow checked={standing} description="An affected party has a safe way to raise a scoped concern." label="Affected-party standing documented" onChange={setStanding} />
          <ToggleRow checked={remedy} description="A named response exists if the impact is substantiated." label="Remedy path documented" onChange={setRemedy} />
        </section>
        <aside className={classNames(styles.safeguardOutcome, clearedForReview ? styles.resultPass : styles.resultNeedsWork)}>
          {clearedForReview ? <ShieldCheck aria-hidden="true" size={38} weight="fill" /> : <Warning aria-hidden="true" size={38} weight="fill" />}
          <p className={styles.cardKicker}>Safety result</p>
          <h2>{clearedForReview ? "Ready for scoped human review." : "Reliance must remain blocked."}</h2>
          <p>{clearedForReview ? "The preview has a standing and remedy path. A live reviewer still evaluates the source evidence." : "A trigger without standing and remedy fails closed. It cannot be waived by the participants."}</p>
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
          <p className={styles.cardKicker}>Delegation preview</p>
          <h2>What may this role do?</h2>
          <div className={styles.formGrid}>
            <label><span>Role</span><select><option>Programs lead</option><option>Finance reviewer</option><option>Evidence reviewer</option></select></label>
            <label><span>Scope</span><select onChange={(event) => { setScope(event.target.value); setChecked(false); }} value={scope}><option value="draft">Draft only</option><option value="publish">Draft and publish</option><option value="lock">Draft, publish, and request lock</option></select></label>
            <label><span>Maximum amount</span><div className={styles.moneyInput}><span>$</span><input min="0" onChange={(event) => { setLimit(Number(event.target.value)); setChecked(false); }} type="number" value={limit} /></div></label>
            <label><span>Grant expires</span><input defaultValue="2026-08-31" type="date" /></label>
          </div>
          <div className={styles.approvalGrid}>
            <ToggleRow checked={firstApproval} description="The request creator cannot count twice." label="Approver one confirmed" onChange={(value) => { setFirstApproval(value); setChecked(false); }} />
            <ToggleRow checked={secondApproval} description="A distinct authorized person confirms the same terms hash." label="Approver two confirmed" onChange={(value) => { setSecondApproval(value); setChecked(false); }} />
          </div>
          <button className={styles.darkButton} onClick={() => setChecked(true)} type="button">Check authority preview</button>
        </section>
        <aside className={styles.authorityReceipt}>
          <UsersFour aria-hidden="true" size={34} />
          <p className={styles.cardKicker}>Authority receipt</p>
          <h2>{checked ? approved ? "Request is within the previewed grant." : "A second approver is required." : "No authority check run."}</h2>
          <dl>
            <div><dt>Scope</dt><dd>{scope.replaceAll("_", " ")}</dd></div>
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
