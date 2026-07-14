interface BrandMarkProps {
  className?: string;
}

export function MutualStepMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={["mt-mutual-step-mark", className].filter(Boolean).join(" ")}
    >
      <span className="mt-mutual-step-line" />
      <span className="mt-mutual-step-point mt-mutual-step-point-start" />
      <span className="mt-mutual-step-point mt-mutual-step-point-end" />
    </span>
  );
}

export function MoralTradeWordmark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={["mt-wordmark", className].filter(Boolean).join(" ")}
    >
      <span className="mt-wordmark-word">Moral</span>
      <MutualStepMark className="mt-wordmark-step" />
      <span className="mt-wordmark-word mt-wordmark-trade">Trade</span>
    </span>
  );
}
