import type { SVGProps } from "react";

export type TradeFlowIconName =
  | "arrow"
  | "calendar"
  | "check"
  | "document"
  | "edit"
  | "evidence"
  | "exit"
  | "handshake"
  | "lock"
  | "privacy"
  | "route"
  | "shield"
  | "user";

interface TradeFlowIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: TradeFlowIconName;
}

export function TradeFlowIcon({ name, ...props }: TradeFlowIconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" {...props}>
      {name === "arrow" ? (
        <>
          <path d="M5 12h14" {...common} />
          <path d="m14 7 5 5-5 5" {...common} />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <rect height="16" rx="2" width="18" x="3" y="5" {...common} />
          <path d="M8 3v4M16 3v4M3 10h18" {...common} />
        </>
      ) : null}
      {name === "check" ? <path d="m5 13 4 4L19 7" {...common} strokeWidth="2" /> : null}
      {name === "document" ? (
        <>
          <path d="M7 3h7l4 4v14H7z" {...common} />
          <path d="M14 3v5h5M10 12h5M10 16h5" {...common} />
        </>
      ) : null}
      {name === "edit" ? (
        <>
          <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z" {...common} />
          <path d="m13.5 7 3.5 3.5" {...common} />
        </>
      ) : null}
      {name === "evidence" ? (
        <>
          <path d="M5 3h10l4 4v14H5z" {...common} />
          <path d="M14 3v5h5M8 14l2 2 5-5" {...common} />
        </>
      ) : null}
      {name === "exit" ? (
        <>
          <path d="M10 5H5v14h5" {...common} />
          <path d="M13 8l4 4-4 4M8 12h9" {...common} />
        </>
      ) : null}
      {name === "handshake" ? (
        <>
          <path d="M7.5 12.5 4 9l3.2-3.2c.8-.8 2-.8 2.8 0l1.2 1.2 1.3-1.3c.8-.8 2-.8 2.8 0L20 10.4l-6.1 6.1a2 2 0 0 1-2.8 0l-.6-.6" {...common} />
          <path d="m9 9 5.2 5.2M6 11l-2 2 4 4 2-2M18 9l2-2 3 3-2 2" {...common} />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <rect height="11" rx="2" width="14" x="5" y="10" {...common} />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} />
        </>
      ) : null}
      {name === "privacy" ? (
        <>
          <path d="M12 3 4.5 6v5.5c0 4.8 3 8.2 7.5 9.5 4.5-1.3 7.5-4.7 7.5-9.5V6z" {...common} />
          <path d="M9 12h6M12 9v6" {...common} />
        </>
      ) : null}
      {name === "route" ? (
        <>
          <circle cx="6" cy="18" r="2" {...common} />
          <circle cx="18" cy="6" r="2" {...common} />
          <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" {...common} />
        </>
      ) : null}
      {name === "shield" ? (
        <>
          <path d="M12 3 4.5 6v5.5c0 4.8 3 8.2 7.5 9.5 4.5-1.3 7.5-4.7 7.5-9.5V6z" {...common} />
          <path d="m8.5 12 2.2 2.2 4.8-5" {...common} />
        </>
      ) : null}
      {name === "user" ? (
        <>
          <circle cx="9" cy="8" r="4" {...common} />
          <path d="M2.5 21a6.5 6.5 0 0 1 13 0M16 13l2 2 4-4" {...common} />
        </>
      ) : null}
    </svg>
  );
}
