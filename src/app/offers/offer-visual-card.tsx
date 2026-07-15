"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

import type { OfferPlaneItem } from "@/lib/offer-plane";

import styles from "./offer-visual-card.module.css";

export interface VisualOfferEntry {
  credibilityHref?: string;
  item: OfferPlaneItem;
  offeredCause: string;
  requestedCause: string;
}

type IconName =
  | "arrow"
  | "bridge"
  | "challenge"
  | "clock"
  | "evidence"
  | "get"
  | "globe"
  | "heart"
  | "leaf"
  | "review"
  | "return"
  | "scale"
  | "shield"
  | "spark"
  | "swap";

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

  return displayed.length > 34 ? `${displayed.slice(0, 31).trimEnd()}…` : displayed;
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
  if (/source[- ]linked/i.test(normalized)) return "Source-linked";
  if (/timestamped.*review|review memoranda/i.test(normalized)) return "Written review";
  if (/calendar attendance|attendance plus/i.test(normalized)) return "Attendance + terms";
  if (/manual review/i.test(normalized)) return "Manual review";
  if (/receipt/i.test(normalized)) return "Receipts";
  if (/witness/i.test(normalized)) return "Witnessed";
  if (/public pledge/i.test(normalized)) return "Public pledge";
  if (/payment/i.test(normalized)) return "Payment verified";
  if (/checklist/i.test(normalized)) return "Checklist";
  return normalized.length > 27 ? "Evidence specified" : normalized;
}

function countFromToken(token: string | undefined) {
  if (!token) return null;
  const numeric = Number.parseInt(token, 10);
  if (Number.isFinite(numeric)) return numeric;
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

function compactDuration(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const countPattern = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
  const minutes = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?minute`, "i"))?.[1]);
  const days = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?day`, "i"))?.[1]);
  const weeks = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?week`, "i"))?.[1]);
  const months = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?month`, "i"))?.[1]);
  const years = countFromToken(normalized.match(new RegExp(`${countPattern}[-\\s]?year`, "i"))?.[1]);

  const parts: string[] = [];
  if (minutes) parts.push(`${minutes} min`);
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (!days && weeks) parts.push(`${weeks} wk`);
  if (!days && !weeks && months) parts.push(`${months} mo`);
  if (!days && !weeks && !months && years) parts.push(`${years} yr`);

  if (parts.length) return parts.slice(0, 2).join(" · ");
  if (/open[- ]?ended|ongoing|indefinite/i.test(normalized)) return "Ongoing";
  return normalized.length > 24 ? "Timeline set" : normalized;
}

function compactParticipant(value: string) {
  const pieces = value.split(/\s+[—–]\s+/);
  const finalPiece = pieces.at(-1)?.trim() || value.trim();
  return finalPiece.length > 24 ? `${finalPiece.slice(0, 21).trimEnd()}…` : finalPiece;
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

function causeIcon(value: string): IconName {
  const normalized = value.toLowerCase();
  if (/animal|vegetarian|vegan|climate|environment|nature/.test(normalized)) return "leaf";
  if (/safety|recourse|protection|integrity/.test(normalized)) return "shield";
  if (/review|evidence|evaluation|dissent/.test(normalized)) return "review";
  if (/cooperation|disagreement|cross-view|mutual|compromise/.test(normalized)) return "bridge";
  if (/health|wellbeing|welfare/.test(normalized)) return "heart";
  if (/rights|control|policy|justice/.test(normalized)) return "scale";
  if (/public-good|poverty|global|future|community/.test(normalized)) return "globe";
  return "spark";
}

function causeTone(...values: string[]): CauseTone {
  const normalized = values.join(" ").toLowerCase();
  if (/animal|vegetarian|vegan|climate|environment|nature/.test(normalized)) return "green";
  if (/safety|recourse|review|evidence|evaluation|integrity/.test(normalized)) return "blue";
  if (/cooperation|disagreement|cross-view|mutual|compromise/.test(normalized)) return "violet";
  return "amber";
}

function Icon({ name }: { name: IconName }) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    focusable: false,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (name === "leaf") {
    return (
      <svg {...common}>
        <path d="M19.5 4.5C13 4.6 7.2 7.2 5.4 12.2c-1.1 3 .6 5.9 3.7 6.3 5.4.7 8.8-5.7 10.4-14Z" />
        <path d="M5.2 19.7c2.2-4 5.4-7 10.4-9.2" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6v5.3c0 4.4-2.7 7.7-7 9.2-4.3-1.5-7-4.8-7-9.2V6l7-2.5Z" />
        <path d="m8.7 12.1 2.1 2.1 4.5-4.6" />
      </svg>
    );
  }

  if (name === "review") {
    return (
      <svg {...common}>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m14.7 14.7 4.1 4.1M8.5 10.5h4M10.5 8.5v4" />
      </svg>
    );
  }

  if (name === "bridge") {
    return (
      <svg {...common}>
        <circle cx="6" cy="8" r="2.2" />
        <circle cx="18" cy="8" r="2.2" />
        <path d="M3.5 18c.5-3.1 2-4.8 4.5-4.8 1.6 0 2.8.7 4 2 1.2-1.3 2.4-2 4-2 2.5 0 4 1.7 4.5 4.8" />
        <path d="M8.8 9.5h6.4" />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.8 12h16.4M12 3.5c2.2 2.2 3.4 5 3.4 8.5S14.2 18.3 12 20.5M12 3.5C9.8 5.7 8.6 8.5 8.6 12s1.2 6.3 3.4 8.5" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M20.2 8.7c0 5.1-8.2 10-8.2 10s-8.2-4.9-8.2-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.2 2.7Z" />
      </svg>
    );
  }

  if (name === "scale") {
    return (
      <svg {...common}>
        <path d="M12 4v16M7 20h10M5 7h14M7 7l-3 6h6L7 7ZM17 7l-3 6h6l-3-6Z" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }

  if (name === "evidence") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l3 3V20H7V3.5Z" />
        <path d="M14 3.5V7h3M9.5 11h5M9.5 14h5M9.5 17h3" />
      </svg>
    );
  }

  if (name === "get") {
    return (
      <svg {...common}>
        <path d="M12 3.5v10M8.5 10l3.5 3.5 3.5-3.5M5 16.5h14v4H5z" />
      </svg>
    );
  }

  if (name === "challenge") {
    return (
      <svg {...common}>
        <path d="m4 18 5.2-9 3.2 5 2.3-3.5L20 18H4Z" />
        <path d="m8.2 10.8 1.1 1.6 1.2-2" />
      </svg>
    );
  }

  if (name === "return") {
    return (
      <svg {...common}>
        <path d="M4 18 10 12l4 3 6-8" />
        <path d="M15.5 7H20v4.5" />
      </svg>
    );
  }

  if (name === "swap") {
    return (
      <svg {...common}>
        <path d="M4 8h12M13 5l3 3-3 3M20 16H8M11 13l-3 3 3 3" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h13M14 7l5 5-5 5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}

function CauseNode({ label }: { label: string }) {
  return (
    <div className={styles.causeNode} title={label}>
      <span className={styles.causeGlyph}>
        <Icon name={causeIcon(label)} />
      </span>
      <strong>{compactCause(label)}</strong>
    </div>
  );
}

function MiniPlane({ challenge, returned }: { challenge: number; returned: number }) {
  const challengeScore = clampScore(challenge);
  const returnScore = clampScore(returned);
  const plotStyle = {
    "--challenge-x": `${Math.min(96, Math.max(4, challengeScore))}%`,
    "--return-y": `${Math.min(96, Math.max(4, 100 - returnScore))}%`,
  } as CSSProperties;

  return (
    <div
      aria-label={`Challenge ${challengeScore} out of 100. Return ${returnScore} out of 100.`}
      className={styles.scoreVisual}
      title={`Challenge ${challengeScore} · Return ${returnScore}`}
    >
      <div aria-hidden="true" className={styles.miniPlane} style={plotStyle}>
        <span className={styles.miniRegion} />
        <span className={styles.miniDot} />
      </div>
      <div aria-hidden="true" className={styles.scorePair}>
        <span>
          <Icon name="challenge" />
          <strong>{challengeScore}</strong>
        </span>
        <span>
          <Icon name="return" />
          <strong>{returnScore}</strong>
        </span>
      </div>
    </div>
  );
}

function Reliability({ entry }: { entry: VisualOfferEntry }) {
  const score = entry.item.creditScore === null ? null : clampScore(entry.item.creditScore);
  const ringStyle = { "--ring-value": `${score ?? 0}%` } as CSSProperties;
  const label = score === null ? "Unproven" : "Reliability";
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`${styles.reliabilityRing} ${score === null ? styles.reliabilityUnrated : ""}`}
        style={ringStyle}
      >
        <span>{score ?? "?"}</span>
      </span>
      <strong>{label}</strong>
    </>
  );
  const ariaLabel =
    score === null
      ? "Offerer reliability is unproven."
      : `Offerer reliability score ${score} out of 100.`;

  if (entry.credibilityHref) {
    return (
      <Link aria-label={`${ariaLabel} View score details.`} className={styles.reliability} href={entry.credibilityHref}>
        {content}
      </Link>
    );
  }

  return (
    <div aria-label={ariaLabel} className={styles.reliability} role="img">
      {content}
    </div>
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
      <h3 className={styles.srOnly} id={headingId}>
        {offeredCause} in exchange for {requestedCause}
      </h3>

      <div className={styles.topLine}>
        <span className={styles.mode}>
          <Icon name="swap" />
          {modeLabel(item.mode)}
        </span>
        <span className={`${styles.state} ${live ? styles.stateLive : styles.stateExample}`}>
          <span aria-hidden="true" />
          {live ? "Live" : "Example"}
        </span>
      </div>

      <div className={styles.causeFlow}>
        <CauseNode label={offeredCause} />
        <div aria-hidden="true" className={styles.connector}>
          <span />
          <span className={styles.connectorGlyph}>
            <Icon name="swap" />
          </span>
        </div>
        <CauseNode label={requestedCause} />
      </div>

      <div className={styles.visualMetrics}>
        <MiniPlane challenge={item.challengeScore} returned={item.returnScore} />
        <Reliability entry={entry} />
      </div>

      <dl className={styles.actionPair}>
        <div title={item.actionReturned}>
          <dt>
            <Icon name="get" />
            Get
          </dt>
          <dd>{compactAction(item.actionReturned)}</dd>
        </div>
        <div title={item.actionRequested}>
          <dt>
            <Icon name="challenge" />
            Do
          </dt>
          <dd>{compactAction(item.actionRequested)}</dd>
        </div>
      </dl>

      <div className={styles.factStrip}>
        <span title={item.duration}>
          <Icon name="clock" />
          {compactDuration(item.duration)}
        </span>
        <span title={item.verification}>
          <Icon name="evidence" />
          {compactEvidence(item.verification)}
        </span>
      </div>

      <div className={styles.footer}>
        <div className={styles.owner} title={participant}>
          <span aria-hidden="true" className={styles.avatar}>{participantInitials(participant)}</span>
          <span>{compactParticipant(participant)}</span>
        </div>
        <Link
          aria-label={live ? "Open full offer" : "Open worked example"}
          className={styles.openAction}
          href={item.href}
        >
          <span>Open</span>
          <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
