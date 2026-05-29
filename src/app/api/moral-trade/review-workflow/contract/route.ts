import { NextResponse } from "next/server";

import {
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
} from "@/lib/proposal-review";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = getOfferReviewWorkflowContract();
  const validation = validateOfferReviewWorkflowContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      statuses: contract.statuses,
      detailWorkflowCards: contract.detailWorkflowCards,
      marketplaceFactorPriority: contract.marketplaceFactorPriority,
      participantCopyTemplates: contract.participantCopyTemplates,
      invariants: contract.invariants,
      sampleDetailCardKeys: contract.sampleDetailCards.map((card) => card.key),
      sampleMarketplaceFactorCodes: contract.sampleMarketplaceCard.factorCodes,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
