export * from "@/lib/core-trade-base";

import { getCoreAgreementForUser as getCoreAgreementForUserBase } from "@/lib/core-trade-base";

export async function getCoreAgreementForUser(agreementId: string, userId: string) {
  const detail = await getCoreAgreementForUserBase(agreementId, userId);
  if (!detail) return detail;
  return {
    ...detail,
    evidence: detail.evidence.map((item: Record<string, any>) =>
      item.evidence_type === "provider_donation" && item.status === "accepted"
        ? { ...item, status: "provider_verified" }
        : item,
    ),
  };
}
