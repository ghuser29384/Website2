"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  Bank,
  Barn,
  BookmarkSimple,
  Briefcase,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  type Icon,
  Info,
  LockSimple,
  LockSimpleOpen,
  Microscope,
  Pulse,
  ShieldCheck,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { MutualStepMark } from "@/components/brand/moral-trade-wordmark";
import { PledgeImpactEstimate } from "@/components/pools/pledge-impact-estimate";
import {
  PLEDGE_IMPACT_REACT_CAMPAIGN_KEYS,
  buildPledgeImpactContributionHref,
  type PledgeImpactPoolPublicKey,
} from "@/lib/mpgf/pledge-impact";

import styles from "./threshold-radar.module.css";

type CampaignId = "priya" | "wild" | "civic" | "factory";
type CampaignTone = "near" | "track" | "risk";
type CampaignView = "all" | "following" | "contributions";
type CauseArea = "all" | "animals" | "biosecurity" | "civic";
type Verification = "all" | "verified" | "review";
type Region = "all" | "global" | "us";

type CampaignDetail = {
  kind: "administrator" | "evidence" | "condition" | "release" | "refund";
  label: readonly string[];
  value: readonly string[];
  verified?: boolean;
};

type Campaign = {
  id: CampaignId;
  poolPublicKey: PledgeImpactPoolPublicKey;
  tone: CampaignTone;
  status: string;
  title: string;
  compactTitle: readonly string[];
  amountLabel: string;
  amount: string;
  pledged: string;
  remaining: string;
  remainingValue: number;
  contributors: number;
  deadline: string;
  icon: Icon;
  views: readonly Exclude<CampaignView, "all">[];
  cause: Exclude<CauseArea, "all">;
  verification: Exclude<Verification, "all">;
  region: Exclude<Region, "all">;
  met: boolean;
  details: readonly CampaignDetail[];
  noCharge: readonly string[];
};

const pledgeAmounts = [0, 10, 25, 50, 100, 250] as const;
const pledgePositions = [0, 18, 34, 51, 69, 100] as const;

const campaigns: Record<CampaignId, Campaign> = {
  priya: {
    id: "priya",
    poolPublicKey: PLEDGE_IMPACT_REACT_CAMPAIGN_KEYS.priya,
    tone: "near",
    status: "Near threshold",
    title: "Help Priya take the biosecurity role.",
    compactTitle: ["Help Priya take", "the biosecurity role."],
    amountLabel: "Verified salary gap",
    amount: "$25,000",
    pledged: "$23,640",
    remaining: "$1,360",
    remainingValue: 1360,
    contributors: 54,
    deadline: "Jul 22",
    icon: ShieldCheck,
    views: ["following", "contributions"],
    cause: "biosecurity",
    verification: "verified",
    region: "global",
    met: false,
    details: [
      { kind: "administrator", label: ["Administrator"], value: ["Global Health Careers"], verified: true },
      { kind: "evidence", label: ["Verified competing", "offers"], value: ["2 offers", "$97,000 – $111,000"] },
      { kind: "condition", label: ["Employment start", "condition"], value: ["Must start by", "Jul 31, 2026"] },
      { kind: "release", label: ["Release schedule", "(to candidate)"], value: ["100% at start"] },
      { kind: "refund", label: ["Refund condition"], value: ["Not employed in", "eligible role"] },
    ],
    noCharge: ["No charge unless the threshold", "and job condition are met."],
  },
  wild: {
    id: "wild",
    poolPublicKey: PLEDGE_IMPACT_REACT_CAMPAIGN_KEYS.wild,
    tone: "track",
    status: "On track",
    title: "Wild-animal suffering research pool",
    compactTitle: ["Wild-animal", "suffering research", "pool"],
    amountLabel: "Remaining",
    amount: "$8,200",
    pledged: "$16,800",
    remaining: "$8,200",
    remainingValue: 8200,
    contributors: 21,
    deadline: "Aug 15",
    icon: Microscope,
    views: ["following"],
    cause: "animals",
    verification: "review",
    region: "global",
    met: false,
    details: [
      { kind: "administrator", label: ["Administrator"], value: ["Wild Research Pool"], verified: true },
      { kind: "evidence", label: ["Research review"], value: ["Independent panel", "3 reviewers"] },
      { kind: "condition", label: ["Funding condition"], value: ["Pool reaches", "$25,000"] },
      { kind: "release", label: ["Release schedule"], value: ["Quarterly grants"] },
      { kind: "refund", label: ["Refund condition"], value: ["Threshold not", "reached"] },
    ],
    noCharge: ["No charge unless the funding", "threshold is met."],
  },
  civic: {
    id: "civic",
    poolPublicKey: PLEDGE_IMPACT_REACT_CAMPAIGN_KEYS.civic,
    tone: "track",
    status: "On track",
    title: "Open-source civic infrastructure",
    compactTitle: ["Open-source", "civic infrastructure"],
    amountLabel: "Remaining",
    amount: "$2,960",
    pledged: "$12,040",
    remaining: "$2,960",
    remainingValue: 2960,
    contributors: 37,
    deadline: "Aug 5",
    icon: Bank,
    views: ["following"],
    cause: "civic",
    verification: "verified",
    region: "us",
    met: false,
    details: [
      { kind: "administrator", label: ["Administrator"], value: ["Open Civic Fund"], verified: true },
      { kind: "evidence", label: ["Verification"], value: ["Public-benefit audit", "Complete"] },
      { kind: "condition", label: ["Funding condition"], value: ["Release at", "$15,000"] },
      { kind: "release", label: ["Release schedule"], value: ["Milestone-based"] },
      { kind: "refund", label: ["Refund condition"], value: ["Milestones not", "approved"] },
    ],
    noCharge: ["No charge unless the funding", "threshold is met."],
  },
  factory: {
    id: "factory",
    poolPublicKey: PLEDGE_IMPACT_REACT_CAMPAIGN_KEYS.factory,
    tone: "risk",
    status: "At risk",
    title: "Reduce factory farming suffering",
    compactTitle: ["Reduce factory", "farming suffering"],
    amountLabel: "Remaining",
    amount: "$22,200",
    pledged: "$11,800",
    remaining: "$22,200",
    remainingValue: 22200,
    contributors: 61,
    deadline: "Jul 18",
    icon: Barn,
    views: ["contributions"],
    cause: "animals",
    verification: "verified",
    region: "global",
    met: false,
    details: [
      { kind: "administrator", label: ["Administrator"], value: ["Farmed Animal Fund"], verified: true },
      { kind: "evidence", label: ["Program review"], value: ["Partner evidence", "Verified"] },
      { kind: "condition", label: ["Funding condition"], value: ["Release at", "$34,000"] },
      { kind: "release", label: ["Release schedule"], value: ["At program start"] },
      { kind: "refund", label: ["Refund condition"], value: ["Program not", "launched"] },
    ],
    noCharge: ["No charge unless the funding", "threshold is met."],
  },
};

const campaignOrder: CampaignId[] = ["priya", "wild", "civic", "factory"];

const detailIcons = {
  administrator: User,
  evidence: Briefcase,
  condition: CalendarBlank,
  release: LockSimple,
  refund: ArrowsClockwise,
} as const;

const satellitePositions: Array<{ id: Exclude<CampaignId, "priya">; className: string }> = [
  { id: "wild", className: styles.wildCampaign },
  { id: "civic", className: styles.civicCampaign },
  { id: "factory", className: styles.factoryCampaign },
];

export function ThresholdRadar() {
  const [selectedId, setSelectedId] = useState<CampaignId>("priya");
  const [view, setView] = useState<CampaignView>("all");
  const [causeArea, setCauseArea] = useState<CauseArea>("all");
  const [verification, setVerification] = useState<Verification>("all");
  const [region, setRegion] = useState<Region>("all");
  const [hideMet, setHideMet] = useState(false);
  const [pledgeIndex, setPledgeIndex] = useState(1);
  const [customPledge, setCustomPledge] = useState<number | null>(null);
  const [otherAmountOpen, setOtherAmountOpen] = useState(false);
  const [otherAmountDraft, setOtherAmountDraft] = useState("");
  const [watched, setWatched] = useState(false);
  const [invited, setInvited] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [artboardScale, setArtboardScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth <= 900) {
        setArtboardScale(1);
        return;
      }

      setArtboardScale(Math.min(window.innerWidth / 1487, window.innerHeight / 1058));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const visibleCampaignIds = useMemo(
    () => campaignOrder.filter((id) => {
      const campaign = campaigns[id];
      return (
        (view === "all" || campaign.views.includes(view))
        && (causeArea === "all" || campaign.cause === causeArea)
        && (verification === "all" || campaign.verification === verification)
        && (region === "all" || campaign.region === region)
        && (!hideMet || !campaign.met)
      );
    }),
    [causeArea, hideMet, region, verification, view],
  );

  const effectiveSelectedId = visibleCampaignIds.includes(selectedId)
    ? selectedId
    : (visibleCampaignIds[0] ?? "priya");

  const selected = campaigns[effectiveSelectedId];
  const pledgeAmount = customPledge ?? pledgeAmounts[pledgeIndex];
  const pledgePosition = customPledge === null
    ? pledgePositions[pledgeIndex]
    : Math.min(100, Math.max(0, (customPledge / 250) * 100));
  const detailTitle = useMemo(() => selected.title.replace(/\.$/, ""), [selected.title]);
  const pledgeContents = (
    <>
      <LockSimpleOpen aria-hidden="true" size={35} weight="thin" />
      <span>
        <strong>Make a conditional ${pledgeAmount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} pledge.</strong>
        <small>Moving the slider has not saved a pledge.</small>
      </span>
    </>
  );

  return (
    <div className={styles.viewport}>
    <div
      className={styles.shell}
      style={{ "--artboard-scale": artboardScale } as CSSProperties}
    >
      <header className={styles.topbar}>
        <Link aria-label="Moral Trade home" className={styles.brand} href="/">
          <MutualStepMark className={styles.brandMark} />
          <span>Moral Trade</span>
        </Link>

        <nav aria-label="Primary" className={styles.primaryNav}>
          <Link aria-current="page" className={styles.activeNav} href="/">
            Now
          </Link>
          <Link href="/offers">Discover</Link>
          <Link href="/create">Offer</Link>
          <Link href="/commitments">Activity</Link>
          <Link href="/profile">Account</Link>
        </nav>

        <div className={styles.accountWrap}>
          <button
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Open account menu"
            className={styles.accountButton}
            onClick={() => setAccountOpen((open) => !open)}
            type="button"
          >
            <span>AJ</span>
            <CaretDown aria-hidden="true" size={15} weight="regular" />
          </button>
          {accountOpen ? (
            <div className={styles.accountMenu} role="menu">
              <Link href="/profile" role="menuitem">Profile</Link>
              <Link href="/dashboard" role="menuitem">Account</Link>
              <Link href="/login" role="menuitem">Sign out</Link>
            </div>
          ) : null}
        </div>
      </header>

      <main className={styles.workspace} id="main-content" tabIndex={-1}>
        <aside className={styles.filterRail} aria-label="Campaign filters">
          <div className={styles.radarLabel}>
            <Pulse aria-hidden="true" size={27} weight="thin" />
            <span>Threshold radar</span>
          </div>
          <p className={styles.railIntro}>Campaigns are ordered by<br />distance from activation.</p>
          <Link className={styles.railLink} href="/how-it-works">
            Learn how this works <ArrowRight aria-hidden="true" size={14} />
          </Link>

          <fieldset className={styles.viewFieldset}>
            <legend>View</legend>
            {[
              ["all", "All campaigns"],
              ["following", "Following"],
              ["contributions", "My contributions"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  checked={view === value}
                  name="radar-view"
                  onChange={() => setView(value as CampaignView)}
                  type="radio"
                  value={value}
                />
                <span className={styles.radioMark} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <section className={styles.focusLegend} aria-labelledby="focus-heading">
            <h2 id="focus-heading">Focus</h2>
            <span><i className={styles.nearDot} />Near threshold</span>
            <span><i className={styles.trackDot} />On track</span>
            <span><i className={styles.riskDot} />At risk</span>
            <span><i className={styles.earlyDot} />Early</span>
          </section>

          <section className={styles.filters} aria-labelledby="filters-heading">
            <h2 id="filters-heading">Filters</h2>
            <label>
              <span>Cause area</span>
              <select
                aria-label="Cause area"
                onChange={(event) => setCauseArea(event.target.value as CauseArea)}
                value={causeArea}
              >
                <option value="all">All</option>
                <option value="animals">Animal welfare</option>
                <option value="biosecurity">Biosecurity</option>
                <option value="civic">Civic infrastructure</option>
              </select>
            </label>
            <label>
              <span>Verification</span>
              <select
                aria-label="Verification"
                onChange={(event) => setVerification(event.target.value as Verification)}
                value={verification}
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="review">In review</option>
              </select>
            </label>
            <label>
              <span>Region</span>
              <select
                aria-label="Region"
                onChange={(event) => setRegion(event.target.value as Region)}
                value={region}
              >
                <option value="all">All</option>
                <option value="global">Global</option>
                <option value="us">United States</option>
              </select>
            </label>
          </section>

          <label className={styles.toggleRow}>
            <input checked={hideMet} onChange={(event) => setHideMet(event.target.checked)} type="checkbox" />
            <span className={styles.toggleTrack}><span /></span>
            <span>Hide met</span>
          </label>

          <div className={styles.liveStatus}>
            <span><i />Campaigns updating in real time</span>
            <span>Data as of 10:45 AM <Info aria-hidden="true" size={13} /></span>
          </div>
        </aside>

        <section className={styles.radar} aria-label="Threshold campaign radar">
          <span className={styles.horizontalGuide} />
          <span className={styles.verticalGuide} />
          <span className={`${styles.orbit} ${styles.outerOrbit}`} />
          <span className={`${styles.orbit} ${styles.middleOrbit}`} />

          <div className={`${styles.ringCaption} ${styles.furthestCaption}`}>
            <strong>Furthest</strong>
            <span>12+ campaigns</span>
          </div>
          <span className={`${styles.orbitDot} ${styles.outerDot}`} />

          <div className={`${styles.ringCaption} ${styles.nextCaption}`}>
            <strong>Next ring</strong>
            <span>4–12 campaigns</span>
          </div>
          <span className={`${styles.orbitDot} ${styles.middleDot}`} />

          {satellitePositions.filter(({ id }) => visibleCampaignIds.includes(id)).map(({ id, className }) => {
            const campaign = campaigns[id];
            const Icon = campaign.icon;
            return (
              <button
                aria-pressed={effectiveSelectedId === id}
                className={`${styles.satellite} ${styles[campaign.tone]} ${className}`}
                key={id}
                onClick={() => setSelectedId(id)}
                type="button"
              >
                <span className={styles.satelliteIcon}><Icon aria-hidden="true" size={28} weight="thin" /></span>
                <span className={styles.campaignStatus}>{campaign.status}</span>
                <strong className={styles.satelliteTitle}>
                  {campaign.compactTitle.map((line) => <span key={line}>{line}</span>)}
                </strong>
                <span className={styles.satelliteAmount}>{campaign.remaining} <small>remaining</small></span>
                <span className={styles.satelliteMeta}>{campaign.contributors} contributors</span>
                <span className={styles.satelliteMeta}>Deadline {campaign.deadline}</span>
                <i className={styles.campaignAnchor} />
              </button>
            );
          })}

          {visibleCampaignIds.includes("priya") ? (
            <button
              aria-pressed={effectiveSelectedId === "priya"}
              className={`${styles.selectedCampaign} ${styles.near}`}
              onClick={() => setSelectedId("priya")}
              type="button"
            >
              <span className={styles.selectedStatus}>
                <strong>Near threshold</strong>
                <small>1–3 campaigns</small>
              </span>
              <strong className={styles.selectedTitle}>
                <span>Help Priya take</span>
                <span>the biosecurity role.</span>
              </strong>
              <span className={styles.selectedAmountLabel}>Verified salary gap</span>
              <span className={styles.selectedAmount}>$25,000</span>
              <span className={styles.selectedRule} />
              <span className={styles.selectedMetrics}>
                <span>
                  <small>Conditionally pledged</small>
                  <strong>$23,640</strong>
                </span>
                <i />
                <span>
                  <small>Remaining gap</small>
                  <strong>$1,360</strong>
                </span>
              </span>
              <span className={styles.selectedMeta}>54 contributors <i /> Deadline Jul 22</span>
              <span className={styles.selectedIcon}><ShieldCheck aria-hidden="true" size={31} weight="thin" /></span>
            </button>
          ) : null}
        </section>

        <aside className={styles.detailPanel} aria-label="Selected campaign details">
          <Link className={styles.backLink} href="/pools">
            <ArrowLeft aria-hidden="true" size={14} /> Back to all campaigns
          </Link>
          <span className={`${styles.detailStatus} ${styles[selected.tone]}`}>{selected.status}</span>
          <h1>{detailTitle}.</h1>
          <span className={styles.detailAmountLabel}>{selected.amountLabel}</span>
          <strong className={styles.detailAmount}>{selected.amount}</strong>

          <div className={styles.detailRows}>
            {selected.details.map((detail) => {
              const DetailIcon = detailIcons[detail.kind];
              return (
                <div className={styles.detailRow} key={detail.kind}>
                  <DetailIcon aria-hidden="true" size={22} weight="thin" />
                  <span>{detail.label.map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</span>
                  <strong>
                    {detail.value.map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}
                    {detail.verified ? <CheckCircle aria-hidden="true" size={14} weight="fill" /> : null}
                  </strong>
                  <Info aria-hidden="true" size={14} weight="thin" />
                </div>
              );
            })}
          </div>

          <div className={styles.noChargeCard}>
            <LockSimple aria-hidden="true" size={26} weight="thin" />
            <span>{selected.noCharge.map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</span>
          </div>

          <Link className={styles.reportLink} href="/trust">
            View full verification report <ArrowRight aria-hidden="true" size={14} />
          </Link>

          <div className={styles.detailActions}>
            <button aria-pressed={watched} onClick={() => setWatched((value) => !value)} type="button">
              <BookmarkSimple aria-hidden="true" size={18} weight={watched ? "fill" : "thin"} />
              {watched ? "Watching" : "Watch"}
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/pools/radar?campaign=${selected.id}`);
                  setInvited(true);
                } catch {
                  setInvited(false);
                }
              }}
              type="button"
            >
              <UsersThree aria-hidden="true" size={20} weight="thin" />
              {invited ? "Invite copied" : "Invite"}
            </button>
          </div>
        </aside>
      </main>

      <section className={styles.pledgeTester} aria-labelledby="pledge-heading">
        <div className={styles.pledgeIntro}>
          <h2 id="pledge-heading">Preview your pledge impact.</h2>
          <p>Compare the proposed amount with the latest released forecast.</p>
          <Link href="/how-it-works">How conditional pledging works <ArrowRight aria-hidden="true" size={14} /></Link>
        </div>

        <div className={styles.pledgeControl}>
          <div
            className={styles.sliderValue}
            style={{ left: `calc(21px + (100% - 63px) * ${pledgePosition / 100})` }}
          >
            ${pledgeAmount}
          </div>
          <div className={styles.majorTicks} aria-hidden="true">
            <span style={{ left: "49%" }}>$25</span>
            <span style={{ left: "70.5%" }}>$50</span>
          </div>
          <input
            aria-label="Conditional pledge amount"
            aria-valuetext={pledgeAmount === 250 ? "$250 or more" : `$${pledgeAmount}`}
            max={pledgeAmounts.length - 1}
            min={0}
            onChange={(event) => {
              setCustomPledge(null);
              setPledgeIndex(Number(event.currentTarget.value));
            }}
            step={1}
            style={{ "--pledge-progress": `${pledgePosition}%` } as CSSProperties}
            type="range"
            value={pledgeIndex}
          />
          <span
            aria-hidden="true"
            className={styles.sliderThumb}
            style={{ left: `calc(21px + (100% - 63px) * ${pledgePosition / 100})` }}
          />
          <div className={styles.amountTicks} aria-hidden="true">
            {pledgeAmounts.map((amount, index) => (
              <span key={amount} style={{ left: `${pledgePositions[index]}%` }}>
                {amount === 250 ? "$250+" : `$${amount}`}
              </span>
            ))}
          </div>
          <PledgeImpactEstimate
            onApplyRecommendation={(amountDollars) => {
              setCustomPledge(Math.round(amountDollars));
              setOtherAmountDraft(String(Math.round(amountDollars)));
            }}
            pledgeAmountDollars={pledgeAmount}
            poolPublicKey={selected.poolPublicKey}
          />
        </div>

        <div className={styles.pledgeActions}>
          {pledgeAmount > 0 ? (
            <Link
              className={styles.pledgeButton}
              href={buildPledgeImpactContributionHref({ amountCents: pledgeAmount * 100, poolPublicKey: selected.poolPublicKey, source: "threshold-radar" })}
            >
              {pledgeContents}
            </Link>
          ) : (
            <span aria-disabled="true" className={`${styles.pledgeButton} ${styles.disabledPledge}`}>
              {pledgeContents}
            </span>
          )}
          {otherAmountOpen ? (
            <form
              className={styles.otherAmountForm}
              onSubmit={(event) => {
                event.preventDefault();
                const amount = Number(otherAmountDraft);
                if (!Number.isFinite(amount) || amount <= 0) return;
                setCustomPledge(Math.round(amount));
                setOtherAmountOpen(false);
              }}
            >
              <input
                aria-label="Other conditional pledge amount"
                autoFocus
                inputMode="decimal"
                min="1"
                onChange={(event) => setOtherAmountDraft(event.target.value)}
                placeholder="$ Amount"
                step="1"
                type="number"
                value={otherAmountDraft}
              />
              <button type="submit">Use amount</button>
            </form>
          ) : (
            <button onClick={() => setOtherAmountOpen(true)} type="button">Other amount</button>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}
