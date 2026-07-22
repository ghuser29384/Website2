import type { ReactNode } from "react";

export type DealReceiptState =
  | "Draft"
  | "Matched"
  | "Authorized"
  | "Active"
  | "Completed"
  | "Challenged"
  | "Cancelled"
  | "Reversed";

export interface DealReceiptRow {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

interface DealReceiptProps {
  className?: string;
  eyebrow?: string;
  id?: string;
  note?: ReactNode;
  rows: readonly DealReceiptRow[];
  state: DealReceiptState;
  title: string;
}

function stateClassName(state: DealReceiptState) {
  return `is-${state.toLowerCase()}`;
}

export function DealReceipt({
  className,
  eyebrow = "Deal receipt",
  id,
  note,
  rows,
  state,
  title,
}: DealReceiptProps) {
  return (
    <article
      className={["mt-deal-receipt", stateClassName(state), className].filter(Boolean).join(" ")}
      id={id}
    >
      <header className="mt-deal-receipt-header">
        <div>
          <p>{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="mt-deal-receipt-state">{state}</span>
      </header>

      <dl className="mt-deal-receipt-rows">
        {rows.map((row) => (
          <div className={row.emphasis ? "is-emphasis" : undefined} key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <footer className="mt-deal-receipt-footer">
        <span>Terms</span>
        <span>Evidence</span>
        <span>Settlement</span>
        {note ? <p>{note}</p> : null}
      </footer>
    </article>
  );
}

export const VICTORIA_PAUL_RECEIPT_ROWS: readonly DealReceiptRow[] = [
  {
    label: "Without this deal",
    value: "Victoria keeps her present giving; Paul keeps his present diet.",
  },
  {
    label: "Victoria commits",
    value: "Donate 1% of income to an agreed global-poverty charity.",
  },
  {
    label: "Paul commits",
    value: "Follow a vegetarian diet for the stated term.",
  },
  {
    label: "Condition",
    value: "Both commitments remain active together; either side may use the published exit rule.",
  },
  {
    label: "Most this can cost",
    value: "The stated donation percentage and stated action term only.",
    emphasis: true,
  },
  {
    label: "Evidence",
    value: "Annual donation receipt and participant attestation.",
  },
  {
    label: "Exit",
    value: "Either participant may end future obligations; completed periods remain recorded.",
  },
];
