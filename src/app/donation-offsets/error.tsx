"use client";

import { PublicRouteError } from "@/components/layout/public-route-error";

export default function DonationOffsetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicRouteError
      description="The donation-offset explanation remains available elsewhere, but this route could not load its current marketplace data."
      error={error}
      eyebrow="Donation offsets"
      reset={reset}
      title="Live offset data is temporarily unavailable."
    />
  );
}
