import type { ReactNode } from "react";

import { LocalDateTime } from "@/components/ui/local-date-time";
import styles from "@/app/institutions/institutions.module.css";

export type InstitutionalStatusTone = "neutral" | "good" | "warn" | "danger" | "info";

export function formatInstitutionalLabel(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatInstitutionalMoney(value: unknown, currency = "usd") {
  const cents = Number(value ?? 0);
  if (!Number.isFinite(cents)) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function institutionalStatusTone(value: unknown): InstitutionalStatusTone {
  const status = String(value ?? "").toLowerCase();
  if (/^(verified|active|accepted|affirmed|approved|committed|completed|paid|ready|signed|selected|published)$/.test(status)) return "good";
  if (/^(pending|invited|draft|proposed|exploratory|submitted|in_progress|needs_information|tentative)$/.test(status)) return "warn";
  if (/^(rejected|declined|revoked|failed|blocked|disputed|terminated|expired|cancelled|overdue)$/.test(status)) return "danger";
  if (/^(execution|evidence_review|term_sheet_agreed|authorized_for_negotiation)$/.test(status)) return "info";
  return "neutral";
}

export function InstitutionalStatus({ children, tone = "neutral" }: { children: ReactNode; tone?: InstitutionalStatusTone }) {
  return <span className={`${styles.status} ${styles[`status_${tone}`]}`}>{children}</span>;
}

export function InstitutionalDate({ value }: { value: unknown }) {
  const normalized =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string" || typeof value === "number"
        ? value
        : null;

  return (
    <LocalDateTime
      value={normalized}
      fallback="Not set"
      options={{ dateStyle: "medium", timeStyle: "short" }}
    />
  );
}

export function InstitutionalSectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  );
}

export function InstitutionalMetric({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>;
}

export function InstitutionalKeyValue({ entries }: { entries: Array<[string, ReactNode]> }) {
  return <dl className={styles.keyValue}>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function InstitutionalEmpty({ children }: { children: ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

export function InstitutionalDisclosure({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className={styles.disclosure} open={open}><summary>{title}</summary><div className={styles.disclosureBody}>{children}</div></details>;
}
