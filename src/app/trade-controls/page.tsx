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
  title: "Safeguard demonstrations",
  description:
    "Optional learning demonstrations of trade safeguards. Exercises do not change a real trade, consent, verification, payment, or authority.",
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
    title: "Safeguard demonstrations | Moral Trade",
    description:
      "Learning examples only; not operational trade settings or safety certification.",
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
