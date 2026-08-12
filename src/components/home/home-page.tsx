"use client";

import {
  ArrowRight,
  ArrowsLeftRight,
  Bank,
  BookmarkSimple,
  CaretDown,
  CheckCircle,
  Clock,
  Flask,
  Plus,
  PuzzlePiece,
  ShieldCheck,
  Train,
  UserCircle,
  UserCircleCheck,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { MutualStepMark } from "@/components/brand/moral-trade-wordmark";
import { getDisplayNameParts } from "@/lib/display-name";

import { LocalDateGreeting } from "./local-date-greeting";
import styles from "./returning-home.module.css";

const focusAreas = [
  "Transit access",
  "Open governance",
  "Climate action",
  "Animal welfare",
  "Economic equity",
] as const;

const commitmentTypes = ["Behavior change", "Financial contribution", "Advocacy"] as const;

const matchReasons = [
  {
    icon: PuzzlePiece,
    tone: "lime",
    title: "Complementary priorities",
    lines: ["Transit access ↔", "Open governance"],
  },
  {
    icon: CheckCircle,
    tone: "lime",
    title: "Both terms within rated ranges",
    lines: ["6–10 trips", "$15–$25"],
  },
  {
    icon: UserCircleCheck,
    tone: "orange",
    title: "Mina’s track record",
    lines: ["11 completed", "commitments"],
  },
  {
    icon: ShieldCheck,
    tone: "gray",
    title: "96% on-time verification",
    lines: ["Verified by", "Counteroffer"],
  },
  {
    icon: Flask,
    tone: "blue",
    title: "Proof method",
    lines: ["Transit receipts", "• Platform audit", "Project receipts"],
  },
  {
    icon: Clock,
    tone: "ink",
    title: "Expires",
    lines: ["Jul 23, 2026", "7 days left"],
  },
] as const;

interface HomePageProps {
  displayName: string | null;
}

export function HomePage({ displayName }: HomePageProps) {
  const { firstName, initials } = getDisplayNameParts(displayName);
  const [trips, setTrips] = useState(8);
  const [amount, setAmount] = useState(20);
  const [saved, setSaved] = useState(false);
  const [remainingMatches, setRemainingMatches] = useState(14);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [selectedCommitment, setSelectedCommitment] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [pairActive, setPairActive] = useState(true);

  const passMatch = () => {
    setRemainingMatches((count) => Math.max(0, count - 1));
    setSaved(false);
  };

  return (
    <div className={styles.shell} data-mt-canonical-home="true">
      <header className={styles.topbar}>
        <Link aria-label="Moral Trade home" className={styles.brand} href="/">
          <MutualStepMark className={styles.brandMark} />
          <span>Moral Trade</span>
        </Link>

        <nav aria-label="Primary" className={styles.primaryNav}>
          <Link href="/feed">Feed</Link>
          <Link aria-current="page" className={styles.activeNav} href="/">
            Now
          </Link>
          <Link href="/offers">Discover</Link>
          <Link href="/commitments">Activity</Link>
          <Link href="/evidence">Evidence</Link>
          <Link href="/profile">Account</Link>
        </nav>

        <div className={styles.topbarActions}>
          <Link
            aria-label="Offer a trade"
            className={styles.offerButton}
            data-testid="home-offer-trade"
            href="/offers?view=templates"
          >
            <Plus aria-hidden="true" size={18} weight="bold" />
            <span className={styles.offerButtonLabel}>Offer a trade</span>
            <span className={styles.offerButtonCompactLabel}>Offer</span>
          </Link>
          <div className={styles.accountWrap}>
            <button
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
              className={styles.accountButton}
              data-testid="account-menu"
              onClick={() => setAccountOpen((open) => !open)}
              type="button"
            >
              <span aria-hidden="true" data-testid="account-avatar">
                {initials ?? <UserCircle size={24} weight="thin" />}
              </span>
              <CaretDown aria-hidden="true" size={17} weight="regular" />
            </button>
            {accountOpen ? (
              <div className={styles.accountMenu} role="menu">
                <Link href="/profile" role="menuitem">
                  Profile
                </Link>
                <Link href="/settings" role="menuitem">
                  Settings
                </Link>
                <Link href="/logout" role="menuitem">
                  Sign out
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <section className={styles.intro}>
          <div>
            <p>Your best match right now, based on your commitments and priorities.</p>
          </div>
          <LocalDateGreeting name={firstName} />
        </section>

        <section className={styles.tradePair} aria-label="Recommended moral trade">
          <article className={styles.tradeCard}>
            <div className={styles.cardDark}>
              <header className={styles.cardHeader}>
                <span className={styles.blueLabel}>You could offer</span>
                <span className={styles.personLabel}>
                  You
                  <UserCircle aria-hidden="true" size={31} weight="thin" />
                </span>
              </header>
              <div className={styles.cardBody}>
                <div className={styles.cardTitleBlock}>
                  <h2>
                    Replace eight
                    <br />
                    car trips with transit.
                  </h2>
                  <p>Verifiable behavior change</p>
                </div>
                <div className={styles.cardControlsLeft}>
                  <span className={`${styles.iconTile} ${styles.transitTile}`}>
                    <Train aria-hidden="true" size={67} weight="regular" />
                  </span>
                  <div className={styles.valueBlock}>
                    <span className={styles.controlEyebrow}>Trips</span>
                    <strong>{trips}</strong>
                    <span>per month</span>
                  </div>
                  <div className={styles.sliderBlock}>
                    <div className={styles.sliderEndpoints}>
                      <span>4</span>
                      <span>12</span>
                    </div>
                    <div className={`${styles.rangeShell} ${styles.limeRange}`}>
                      <span className={styles.rangeDash} />
                      <span className={styles.rangeAgreement} />
                      <input
                        aria-label="Trips per month"
                        data-testid="trips-range"
                        max="12"
                        min="4"
                        onChange={(event) => setTrips(Number(event.target.value))}
                        type="range"
                        value={trips}
                      />
                    </div>
                    <span className={`${styles.agreementLabel} ${styles.limeText}`}>
                      Both say yes
                    </span>
                    <strong className={styles.limeText}>6 – 10 trips</strong>
                  </div>
                </div>
              </div>
            </div>
            <footer className={styles.cardFooter}>
              <div>
                <span className={styles.footerEyebrow}>Your range</span>
                <strong className={styles.limeText}>4 – 12 trips</strong>
              </div>
              <div className={styles.priorityBlock}>
                <ShieldCheck aria-hidden="true" className={styles.limeText} size={37} weight="fill" />
                <span>
                  <span className={styles.footerEyebrow}>Your priority</span>
                  <strong>High</strong>
                  <small>Transit access</small>
                </span>
              </div>
            </footer>
          </article>

          <div className={styles.connector}>
            <span className={styles.connectorLine} />
            <button
              aria-label="Toggle the paired exchange"
              aria-pressed={pairActive}
              className={pairActive ? styles.connectorButton : styles.connectorButtonInactive}
              onClick={() => setPairActive((active) => !active)}
              type="button"
            >
              <ArrowsLeftRight aria-hidden="true" size={31} weight="thin" />
            </button>
          </div>

          <article className={styles.tradeCard}>
            <div className={styles.cardDark}>
              <header className={styles.cardHeader}>
                <span className={styles.personLabel}>
                  <UserCircle aria-hidden="true" size={31} weight="thin" />
                  Mina
                </span>
                <span className={styles.blueLabel}>Mina would offer</span>
              </header>
              <div className={styles.cardBody}>
                <div className={styles.cardTitleBlock}>
                  <h2>
                    Fund $20 of open
                    <br />
                    civic infrastructure.
                  </h2>
                  <p>Verifiable financial contribution</p>
                </div>
                <div className={styles.cardControlsRight}>
                  <div className={styles.valueBlock}>
                    <span className={styles.controlEyebrow}>Amount</span>
                    <strong>${amount}</strong>
                    <span>one-time</span>
                  </div>
                  <div className={styles.sliderBlock}>
                    <div className={styles.sliderEndpoints}>
                      <span>$10</span>
                      <span>$30</span>
                    </div>
                    <div className={`${styles.rangeShell} ${styles.orangeRange}`}>
                      <span className={styles.rangeDash} />
                      <span className={styles.rangeAgreement} />
                      <input
                        aria-label="Funding amount"
                        data-testid="amount-range"
                        max="30"
                        min="10"
                        onChange={(event) => setAmount(Number(event.target.value))}
                        type="range"
                        value={amount}
                      />
                    </div>
                    <span className={`${styles.agreementLabel} ${styles.orangeText}`}>
                      Both say yes
                    </span>
                    <strong className={styles.orangeText}>$15 – $25</strong>
                  </div>
                  <span className={`${styles.iconTile} ${styles.civicTile}`}>
                    <Bank aria-hidden="true" size={69} weight="regular" />
                  </span>
                </div>
              </div>
            </div>
            <footer className={styles.cardFooter}>
              <div>
                <span className={styles.footerEyebrow}>Mina’s range</span>
                <strong className={styles.orangeText}>$10 – $30</strong>
              </div>
              <div className={styles.priorityBlock}>
                <ShieldCheck aria-hidden="true" className={styles.orangeText} size={37} weight="fill" />
                <span>
                  <span className={styles.footerEyebrow}>Mina’s priority</span>
                  <strong>High</strong>
                  <small>Open governance</small>
                </span>
              </div>
            </footer>
          </article>
        </section>

        <section className={styles.matchReasons} aria-label="Why this match exists">
          <div className={styles.reasonsLabel}>
            Why this
            <br />
            match exists
          </div>
          {matchReasons.map((reason) => {
            const ReasonIcon = reason.icon;
            return (
              <div className={styles.reason} key={reason.title}>
                <ReasonIcon
                  aria-hidden="true"
                  className={styles[`${reason.tone}Icon`]}
                  size={34}
                  weight="regular"
                />
                <span>
                  <strong>{reason.title}</strong>
                  {reason.lines.map((line) => (
                    <small key={line}>{line}</small>
                  ))}
                </span>
              </div>
            );
          })}
        </section>

        <section className={styles.actions} aria-label="Trade actions">
          <Link className={`${styles.actionButton} ${styles.primaryAction}`} href="/create?mode=trade">
            <span>Offer this trade</span>
            <ArrowRight aria-hidden="true" size={25} weight="thin" />
          </Link>
          <Link className={`${styles.actionButton} ${styles.counterAction}`} href="/create?mode=trade">
            <span>Counter this trade</span>
            <ArrowsLeftRight aria-hidden="true" size={25} weight="thin" />
          </Link>
          <button
            aria-pressed={saved}
            className={`${styles.actionButton} ${styles.saveAction} ${saved ? styles.actionSelected : ""}`}
            data-testid="save-match"
            onClick={() => setSaved((isSaved) => !isSaved)}
            type="button"
          >
            <span>{saved ? "Saved" : "Save"}</span>
            <BookmarkSimple aria-hidden="true" size={24} weight={saved ? "fill" : "thin"} />
          </button>
          <button
            className={`${styles.actionButton} ${styles.passAction}`}
            data-testid="pass-match"
            onClick={passMatch}
            type="button"
          >
            <span>Pass</span>
            <X aria-hidden="true" size={25} weight="thin" />
          </button>
        </section>
      </main>

      <aside className={styles.filterRail} aria-label="More matches and filters">
        <div className={styles.matchCount}>
          <UsersThree aria-hidden="true" size={38} weight="thin" />
          <span>
            <strong>{remainingMatches} more matches</strong>
            <small>New matches refresh daily.</small>
            <Link href="/offers">View all matches →</Link>
          </span>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Focus areas</span>
          <div className={styles.chips}>
            {focusAreas.map((area) => (
              <button
                aria-pressed={selectedFocus === area}
                className={selectedFocus === area ? styles.chipSelected : styles.chip}
                key={area}
                onClick={() => setSelectedFocus((selected) => (selected === area ? null : area))}
                type="button"
              >
                {area}
              </button>
            ))}
            <button aria-label="Add a focus area" className={styles.addChip} type="button">
              <Plus aria-hidden="true" size={16} weight="regular" />
            </button>
          </div>
        </div>
        <div className={`${styles.filterGroup} ${styles.commitmentGroup}`}>
          <span className={styles.filterLabel}>Commitment types</span>
          <div className={styles.chips}>
            {commitmentTypes.map((type) => (
              <button
                aria-pressed={selectedCommitment === type}
                className={selectedCommitment === type ? styles.chipSelected : styles.chip}
                key={type}
                onClick={() =>
                  setSelectedCommitment((selected) => (selected === type ? null : type))
                }
                type="button"
              >
                {type}
              </button>
            ))}
            <button aria-label="Add a commitment type" className={styles.addChip} type="button">
              <Plus aria-hidden="true" size={16} weight="regular" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
