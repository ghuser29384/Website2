interface BrandMarkProps {
  className?: string;
}

const WORDMARK_STYLE = {
  alignItems: "center",
  color: "inherit",
  display: "inline-flex",
  fontFamily:
    'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontWeight: 400,
  gap: "0.48em",
  letterSpacing: "-0.035em",
  lineHeight: 1,
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

const MARK_STYLE = {
  display: "block",
  flex: "0 0 auto",
  height: "1.24em",
  width: "1.24em",
} as const;

export function MutualStepMark({ className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={["mt-mutual-step-mark", className].filter(Boolean).join(" ")}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      style={MARK_STYLE}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className="mt-mutual-step-body" d="M160 784 784 160 864 240 240 864Z" fill="currentColor" />
      <path className="mt-mutual-step-base" d="M80 784h160v160H80z" fill="currentColor" />
      <path className="mt-mutual-step-accent" d="M784 80h160v160H784z" fill="#3158ff" />
    </svg>
  );
}

export function MoralTradeWordmark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={["mt-wordmark", className].filter(Boolean).join(" ")}
      style={WORDMARK_STYLE}
    >
      <MutualStepMark className="mt-wordmark-mark" />
      <span className="mt-wordmark-label">Moral Trade</span>
    </span>
  );
}
