export type CommitmentSummaryIconName =
  | "commitment"
  | "mechanism"
  | "action"
  | "activated"
  | "verified";

export function CommitmentSummaryIcon({ name }: { name: CommitmentSummaryIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  if (name === "commitment") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <rect {...common} height="17" rx="2" width="14" x="5" y="3.5" />
        <path {...common} d="M8.5 8h7M8.5 12h7M8.5 16h4.2" />
      </svg>
    );
  }

  if (name === "mechanism") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path
          {...common}
          d="M12.2 2.8h-.4a1.8 1.8 0 0 0-1.8 1.8v.2a1.8 1.8 0 0 1-.9 1.5l-.4.3a1.8 1.8 0 0 1-1.8 0l-.2-.1a1.8 1.8 0 0 0-2.5.7l-.2.3a1.8 1.8 0 0 0 .7 2.5l.2.1a1.8 1.8 0 0 1 .9 1.6v.5a1.8 1.8 0 0 1-.9 1.6l-.2.1a1.8 1.8 0 0 0-.7 2.5l.2.3a1.8 1.8 0 0 0 2.5.7l.2-.1a1.8 1.8 0 0 1 1.8 0l.4.3a1.8 1.8 0 0 1 .9 1.5v.2a1.8 1.8 0 0 0 1.8 1.8h.4a1.8 1.8 0 0 0 1.8-1.8v-.2a1.8 1.8 0 0 1 .9-1.5l.4-.3a1.8 1.8 0 0 1 1.8 0l.2.1a1.8 1.8 0 0 0 2.5-.7l.2-.3a1.8 1.8 0 0 0-.7-2.5l-.2-.1a1.8 1.8 0 0 1-.9-1.6v-.5a1.8 1.8 0 0 1 .9-1.6l.2-.1a1.8 1.8 0 0 0 .7-2.5l-.2-.3a1.8 1.8 0 0 0-2.5-.7l-.2.1a1.8 1.8 0 0 1-1.8 0l-.4-.3a1.8 1.8 0 0 1-.9-1.5v-.2a1.8 1.8 0 0 0-1.8-1.8Z"
        />
        <circle {...common} cx="12" cy="12" r="2.7" />
      </svg>
    );
  }

  if (name === "action") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <circle {...common} cx="12" cy="12" r="8.5" />
        <path {...common} d="M12 7.3v5l3.1 1.9" />
      </svg>
    );
  }

  if (name === "activated") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <circle {...common} cx="12" cy="12" r="8.5" />
        <path {...common} d="m8.2 12.2 2.5 2.5 5.2-5.4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path {...common} d="M12 3.3 18.2 6v4.9c0 4.2-2.4 7.6-6.2 9.8-3.8-2.2-6.2-5.6-6.2-9.8V6L12 3.3Z" />
    </svg>
  );
}
