"use client";

import { useState } from "react";

export function ImpactShareButton({
  title,
  text,
  className,
}: {
  title: string;
  text: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "shared" | "copied" | "failed">("idle");

  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text });
        setState("shared");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setState("copied");
        return;
      }
      setState("failed");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setState("failed");
    }
  }

  const label =
    state === "shared"
      ? "Shared"
      : state === "copied"
        ? "Summary copied"
        : state === "failed"
          ? "Sharing unavailable"
          : "Share impact summary";

  return (
    <button className={className} type="button" onClick={share} disabled={state === "failed"}>
      {label}
    </button>
  );
}
