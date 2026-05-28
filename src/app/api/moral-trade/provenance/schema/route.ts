import { NextResponse } from "next/server";

import { getMoralTradeProtocolProfile } from "@/lib/moral-trade/protocol";
import {
  getMoralTradeProvenanceContract,
  validateMoralTradeProvenanceContract,
} from "@/lib/moral-trade/provenance";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeProtocolProfile();
  const contract = getMoralTradeProvenanceContract();
  const validation = validateMoralTradeProvenanceContract(contract);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    schemaVersion: contract.schemaVersion,
    profileVersion: profile.version,
    purpose: contract.purpose,
    validation,
    publicContract: contract,
    objectSchemas: contract.objectSchemas,
    validationRules: contract.validationRules.map((rule) => rule.rule),
    validationRuleCodes: contract.validationRules.map((rule) => rule.key),
    sampleBundleSummary: contract.sampleBundleSummary,
    blockers: validation.blockers,
  });
}
