export const MPGF_THRESHOLD_VISIBILITY = "public_exact" as const;

export type MpgfThresholdVisibility = typeof MPGF_THRESHOLD_VISIBILITY;

export const MPGF_PROGRESS_VISIBILITY_VALUES = [
  "exact_amount",
  "progress_range",
  "threshold_status_only",
  "sealed_progress",
] as const;

export type MpgfProgressVisibility = (typeof MPGF_PROGRESS_VISIBILITY_VALUES)[number];

export const MPGF_DEFAULT_PROGRESS_VISIBILITY: MpgfProgressVisibility = "exact_amount";

/**
 * Higher numbers are more transparent. Keep this ordering aligned with
 * public.mpgf_progress_visibility_rank in the database migration.
 */
export const MPGF_PROGRESS_VISIBILITY_RANK: Readonly<Record<MpgfProgressVisibility, number>> = {
  sealed_progress: 1,
  threshold_status_only: 2,
  progress_range: 3,
  exact_amount: 4,
};

export function isMpgfProgressVisibility(value: unknown): value is MpgfProgressVisibility {
  return (
    typeof value === "string" &&
    (MPGF_PROGRESS_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}

export function canChangeMpgfProgressVisibility(input: {
  from: MpgfProgressVisibility;
  to: MpgfProgressVisibility;
  hasAcceptedPledge: boolean;
}): boolean {
  if (!input.hasAcceptedPledge) {
    return true;
  }

  return MPGF_PROGRESS_VISIBILITY_RANK[input.to] >= MPGF_PROGRESS_VISIBILITY_RANK[input.from];
}

export function assertMpgfProgressVisibilityChangeAllowed(input: {
  from: MpgfProgressVisibility;
  to: MpgfProgressVisibility;
  hasAcceptedPledge: boolean;
}): void {
  if (!canChangeMpgfProgressVisibility(input)) {
    throw new Error(
      `Progress visibility cannot become less transparent after the first accepted pledge (${input.from} → ${input.to}).`,
    );
  }
}
