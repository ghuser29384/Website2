"use client";

import Link from "next/link";

import type { OfferPlaneItem } from "@/lib/offer-plane";

import styles from "./offer-visual-card.module.css";

export interface VisualOfferEntry {
  credibilityHref?: string;
  item: OfferPlaneItem;
  offeredCause: string;
  requestedCause: string;
}

type CauseTone = "amber" | "blue" | "green" | "violet";

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function compactCause(value: string) {
  const replacements: ReadonlyArray<readonly [RegExp, string]> = [
    [/^moral public-good coordination$/i, "Public-good coordination"],
    [/^candidate evaluation and dissent$/i, "Candidate review"],
    [/^proposal review and evidence integrity$/i, "Evidence review"],
    [/^safety and recourse feedback$/i, "Safety & recourse"],
    [/^a live moral disagreement$/i, "Moral disagreement"],
    [/^mutually acceptable cooperation$/i, "Mutual cooperation"],
    [/^common-ground funding$/i, "Common-ground funding"],
  ];
  const normalized = value.trim().replace(/\s+/g, " ");
  const replacement = replacements.find(([pattern]) => pattern.test(normalized));
  const displayed = replacement ? replacement[1] : normalized;
  return displayed.length > 48 ? `${displayed.slice(0, 45).trimEnd()}…` : displayed;
}

function compactAction(value: string) {
  return value
    .trim()
    .replace(/^(?:i|we|you)\s+(?:will|would)\s+/i, "")
    .replace(/^please\s+/i, "")
    .replace(/\s+/g, " ");
}

function compactEvidence(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "Not specified";
  if (/source[- ]linked/i.test(normalized)) return "Source-linked";
  if (/timestamped.*review|review memoranda/i.test(normalized)) return "Written review";
  if (/calendar attendance|attendance plus/i.test(normalized)) return "Attendance + terms";
  if (/manual review/i.test(normalized)) return "Manual review";
  if (/receipt/i.test(normalized)) return "Receipts";
  if (/witness/i.test(normalized)) return "Witnessed";
  if (/public pledge/i.test(normalized)) return "Public pledge";
  if (/payment/i.test(normalized)) return "Payment verified";
  if (/checklist/i.test(normalized)) return "Checklist";
  return normalized.length > 34 ? `${normalized.slice(0, 31).trimEnd()}…` : normalized;
}

function countFromToken(token: string | undefined) {
  if (!token) return null;
  const numeric = Number.parseInt(token, 10);
  if (Number.isFinite(numeric)) return numeric;
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

function compactDuration(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "Not specified";
  const countPattern = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
  const minutes = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?minute`, "i"))?.[1]);
  const days = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?day`, "i"))?.[1]);
  const weeks = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?week`, "i"))?.[1]);
  const months = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?month`, "i"))?.[1]);
  const years = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?year`, "i"))?.[1]);

  if (minutes) return `${minutes} min`;
  if (days) return `${days} day${days === 1 ? "" : "s"}`;
  if (weeks) return `${weeks} wk`;
  if (months) return `${months} mo`;
  if (years) return `${years} yr`;
  if (/open[- ]?ended|ongoing|indefinite/i.test(normalized)) return "Ongoing";
  return normalized.length > 28 ? `${normalized.slice(0, 25).trimEnd()}…` : normalized;
}

function compactParticipant(value: string) {
  const pieces = value.split(/\s+[—–]\s+/);
  const finalPiece = pieces.at(-1)?.trim() || value.trim();
  return finalPiece.length > 28 ? `${finalPiece.slice(0, 25).trimEnd()}…` : finalPiece;
}

function participantInitials(value: string) {
  const compact = compactParticipant(value);
  const words = compact.split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0]?.slice(0, 1).toUpperCase() || "?";
  return `${words[0]?.[0] ?? ""}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function modeLabel(mode: OfferPlaneItem["mode"]) {
  if (mode === "offset") return "Donation offset";
  if (mode === "payment") return "Paid action";
  return "Pledge swap";
}

function causeTone(...values: string[]): CauseTone {
  const normalized = values.join(" ").toLowerCase();
  if (/animal|vegetarian|vegan|climate|environment|nature/.test(normalized)) return "green";
  if (/safety|recourse|review|evidence|evaluation|integrity/.test(normalized)) return "blue";
  if (/cooperation|disagreement|cross-view|mutual|compromise/.test(normalized)) return "violet";
  return "amber";
}

function SwapIcon() {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d="M4 8h12" />
      <path d="m13 5 3 3-3 3" />
      <path d="M20 16H8" />
      <path d="m11 13-3 3 3 3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className={styles.arrowIcon} fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M5 12h13" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function ReliabilityValue({ entry }: { entry: VisualOfferEntry }) {
  const score = entry.item.creditScore === null ? null : clampScore(entry.item.creditScore);
  const label = score === null ? "Unproven" : `${score}/100`;

  if (!entry.credibilityHref) return <span>{label}</span>;

  return (
    <Link
      aria-label={score === null ? "Offerer reliability is unproven. View details." : `Offerer reliability is ${score} out of 100. View details.`}
      className={styles.reliabilityLink}
      href={entry.credibilityHref}
    >
      {label}
    </Link>
  );
}

export function VisualOfferCard({ entry }: { entry: VisualOfferEntry }) {
  const { item, offeredCause, requestedCause } = entry;
  const headingId = `visual-offer-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const live = item.source === "live";
  const tone = causeTone(offeredCause, requestedCause, ...item.causeAreas);
  const participant = live ? item.offererName : "Worked example";

  return (
    <article aria-labelledby={headingId} className={styles.card} data-tone={tone}>
      <div className={styles.topLine}>
        <span className={styles.mode}>{modeLabel(item.mode)}</span>
        <span className={`${styles.state} ${live ? styles.stateLive : styles.stateExample}`}>
          <span aria-hidden="true" />
          {live ? "Live" : "Example"}
        </span>
      </div>

      <div className={styles.exchange}>
        <p className={styles.exchangeLabel}>Proposed exchange</p>
        <h3 id={headingId}>
          <span className={styles.exchangeCause}>{compactCause(offeredCause)}</span>
          <span className={styles.srOnly}>in exchange for</span>
          <span aria-hidden="true" className={styles.exchangeMark}>
            <SwapIcon />
          </span>
          <span className={styles.exchangeCause}>{compactCause(requestedCause)}</span>
        </h3>
      </div>

      <dl className={styles.actionPair}>
        <div>
          <dt>Get</dt>
          <dd title={item.actionReturned}>{compactAction(item.actionReturned)}</dd>
        </div>
        <div>
          <dt>Do</dt>
          <dd title={item.actionRequested}>{compactAction(item.actionRequested)}</dd>
        </div>
      </dl>

      <dl className={styles.meta}>
        <div>
          <dt>Time</dt>
          <dd title={item.duration}>{compactDuration(item.duration)}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd title={item.verification}>{compactEvidence(item.verification)}</dd>
        </div>
        <div>
          <dt>Reliability</dt>
          <dd><ReliabilityValue entry={entry} /></dd>
        </div>
      </dl>

      <div className={styles.footer}>
        <div className={styles.owner} title={participant}>
          <span aria-hidden="true" className={styles.avatar}>{participantInitials(participant)}</span>
          <span>{compactParticipant(participant)}</span>
        </div>
        <Link
          aria-label={live ? "Open full proposal" : "Open worked example"}
          className={styles.openAction}
          href={item.href}
        >
          <span>{live ? "Open proposal" : "Open example"}</span>
          <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}
