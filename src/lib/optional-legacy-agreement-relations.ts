export type OptionalLegacyAgreementRelation =
  | "agreement_evidence_items"
  | "agreement_review_cases";

interface RelationErrorLike {
  code?: string | null;
  details?: string | null;
  message?: string | null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isMissingOptionalLegacyAgreementRelation(
  error: RelationErrorLike | null | undefined,
  relation: OptionalLegacyAgreementRelation,
) {
  if (!error) {
    return false;
  }

  const errorText = [error.message, error.details].filter(Boolean).join("\n");
  const escapedRelation = escapeRegExp(relation);
  const namesTargetRelation =
    errorText.includes(`Could not find the table 'public.${relation}' in the schema cache`) ||
    new RegExp(
      `relation\\s+["']?(?:public\\.)?${escapedRelation}["']?\\s+does not exist`,
      "i",
    ).test(errorText);

  if (!namesTargetRelation) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    errorText.includes("in the schema cache") ||
    /relation\s+.+\s+does not exist/i.test(errorText)
  );
}
