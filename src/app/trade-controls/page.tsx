import type { Metadata } from "next";

import {
  TradeControlsWorkspace,
  type TradeControlProtocolMap,
} from "@/components/trade-controls/trade-controls-workspace";
import {
  getMoralTradeAuthorityObligationContract,
  validateMoralTradeAuthorityObligationContract,
} from "@/lib/moral-trade/authority-obligations";
import {
  getMoralTradeBaselineIntegrityContract,
  validateMoralTradeBaselineIntegrityContract,
} from "@/lib/moral-trade/baseline-integrity";
import {
  getMoralTradeBatchClearingObjectiveContract,
  validateMoralTradeBatchClearingObjectiveContract,
} from "@/lib/moral-trade/batch-clearing-objective";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";
import {
  getMoralTradeCommitmentSettlementContract,
  validateMoralTradeCommitmentSettlementContract,
} from "@/lib/moral-trade/commitment-settlement";
import {
  getMoralTradePreferenceIntegrityContract,
  validateMoralTradePreferenceIntegrityContract,
} from "@/lib/moral-trade/preference-integrity";
import {
  getMoralTradePrivacyGovernanceContract,
  validateMoralTradePrivacyGovernanceContract,
} from "@/lib/moral-trade/privacy-governance";
import {
  getMoralTradeReviewerQualityContract,
  validateMoralTradeReviewerQualityContract,
} from "@/lib/moral-trade/reviewer-quality";
import {
  getMoralTradeUserSafetyContentModerationContract,
  validateMoralTradeUserSafetyContentModerationContract,
} from "@/lib/moral-trade/user-safety-content-moderation";
import { getMpgfPublicGoodsGovernanceApi } from "@/lib/mpgf/public-goods-governance";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Trade controls",
  description:
    "Review ten interactive controls for integrity, multi-party coordination, resolution, governance, verification, privacy, evidence, affected parties, and team authority.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: "/trade-controls",
  },
  openGraph: {
    title: "Trade controls | Moral Trade",
    description:
      "Interactive, fail-closed controls for building and reviewing safer moral trades.",
    type: "website",
    url: getAbsoluteUrl("/trade-controls"),
  },
};

type ContractValidation = {
  status: "pass" | "fail";
  contractVersion: string;
  checks: readonly unknown[];
};

function summarize(validation: ContractValidation) {
  return {
    status: validation.status,
    version: validation.contractVersion,
    checks: validation.checks.length,
  } as const;
}

function getProtocolSummaries(): TradeControlProtocolMap {
  const baseline = getMoralTradeBaselineIntegrityContract();
  const clearing = getMoralTradeBatchClearingObjectiveContract();
  const challenge = getMoralTradeChallengeAppealContract();
  const settlement = getMoralTradeCommitmentSettlementContract();
  const reviewers = getMoralTradeReviewerQualityContract();
  const preferences = getMoralTradePreferenceIntegrityContract();
  const privacy = getMoralTradePrivacyGovernanceContract();
  const safety = getMoralTradeUserSafetyContentModerationContract();
  const authority = getMoralTradeAuthorityObligationContract();
  const governance = getMpgfPublicGoodsGovernanceApi();

  return {
    integrity: summarize(validateMoralTradeBaselineIntegrityContract(baseline)),
    circles: summarize(validateMoralTradeBatchClearingObjectiveContract(clearing)),
    resolution: summarize(validateMoralTradeChallengeAppealContract(challenge)),
    governance: {
      status: governance.ok ? "pass" : "fail",
      version: governance.roundRules.formulaVersion,
      checks: governance.reviewerPanel.roleCount,
    },
    settlement: summarize(validateMoralTradeCommitmentSettlementContract(settlement)),
    verifiers: summarize(validateMoralTradeReviewerQualityContract(reviewers)),
    values: summarize(validateMoralTradePreferenceIntegrityContract(preferences)),
    evidence: summarize(validateMoralTradePrivacyGovernanceContract(privacy)),
    safeguards: summarize(validateMoralTradeUserSafetyContentModerationContract(safety)),
    authority: summarize(validateMoralTradeAuthorityObligationContract(authority)),
  };
}

export default function TradeControlsPage() {
  return <TradeControlsWorkspace protocols={getProtocolSummaries()} />;
}
