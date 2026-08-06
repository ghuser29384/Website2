"use client";

import { PublicRouteError } from "@/components/layout/public-route-error";

export default function PriorityCorrectionFundError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicRouteError
      description="The Priority Correction Fund route could not load its current cycle, contribution, or reviewer data."
      eyebrow="Priority Correction Fund"
      reset={reset}
      title="Live priority-fund data is temporarily unavailable."
    />
  );
}
