export type MoralTradeFundingMode = "external_charities_only" | "fiscal_sponsor";
export type FiscalSponsorStatus = "not_configured" | "configuration_incomplete" | "active";

export interface FiscalSponsorDisclosure {
  legalName: string;
  jurisdiction: string;
  contributionUrl: string;
  feeDisclosure: string;
  taxReceiptDisclosure: string;
  refundPolicyUrl: string;
}

export interface MoralTradeFundingReadiness {
  mode: MoralTradeFundingMode;
  sponsorStatus: FiscalSponsorStatus;
  directToCharityAvailable: true;
  projectFundingAvailable: boolean;
  nativeCheckoutAvailable: false;
  conditionalFundingMode: "pledge_only_external_handoff";
  sponsor: FiscalSponsorDisclosure | null;
  blockers: string[];
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function requiredText(
  environment: NodeJS.ProcessEnv,
  key: string,
  label: string,
  blockers: string[],
) {
  const value = optionalTrimmed(environment[key]);
  if (!value) {
    blockers.push(`${label} is missing.`);
  }
  return value;
}

function requiredHttpsUrl(
  environment: NodeJS.ProcessEnv,
  key: string,
  label: string,
  blockers: string[],
) {
  const value = requiredText(environment, key, label, blockers);
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      blockers.push(`${label} must use HTTPS.`);
      return undefined;
    }
    return url.toString();
  } catch {
    blockers.push(`${label} must be a valid URL.`);
    return undefined;
  }
}

export function getMoralTradeFundingReadiness(
  environment: NodeJS.ProcessEnv = process.env,
): MoralTradeFundingReadiness {
  const configuredMode = optionalTrimmed(environment.MORAL_TRADE_FUNDING_MODE)?.toLowerCase();
  const sponsorRequested = configuredMode === "fiscal_sponsor";
  const blockers: string[] = [];

  if (configuredMode && configuredMode !== "external_charities_only" && configuredMode !== "fiscal_sponsor") {
    blockers.push(
      "MORAL_TRADE_FUNDING_MODE must be external_charities_only or fiscal_sponsor.",
    );
  }

  if (!sponsorRequested) {
    return {
      mode: "external_charities_only",
      sponsorStatus: "not_configured",
      directToCharityAvailable: true,
      projectFundingAvailable: false,
      nativeCheckoutAvailable: false,
      conditionalFundingMode: "pledge_only_external_handoff",
      sponsor: null,
      blockers,
    };
  }

  const legalName = requiredText(
    environment,
    "FISCAL_SPONSOR_LEGAL_NAME",
    "Fiscal sponsor legal name",
    blockers,
  );
  const jurisdiction = requiredText(
    environment,
    "FISCAL_SPONSOR_JURISDICTION",
    "Fiscal sponsor jurisdiction",
    blockers,
  );
  const contributionUrl = requiredHttpsUrl(
    environment,
    "FISCAL_SPONSOR_CONTRIBUTION_URL",
    "Fiscal sponsor contribution URL",
    blockers,
  );
  const feeDisclosure = requiredText(
    environment,
    "FISCAL_SPONSOR_FEE_DISCLOSURE",
    "Fiscal sponsor fee disclosure",
    blockers,
  );
  const taxReceiptDisclosure = requiredText(
    environment,
    "FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE",
    "Fiscal sponsor tax-receipt disclosure",
    blockers,
  );
  const refundPolicyUrl = requiredHttpsUrl(
    environment,
    "FISCAL_SPONSOR_REFUND_POLICY_URL",
    "Fiscal sponsor refund-policy URL",
    blockers,
  );

  if (
    blockers.length > 0 ||
    !legalName ||
    !jurisdiction ||
    !contributionUrl ||
    !feeDisclosure ||
    !taxReceiptDisclosure ||
    !refundPolicyUrl
  ) {
    return {
      mode: "external_charities_only",
      sponsorStatus: "configuration_incomplete",
      directToCharityAvailable: true,
      projectFundingAvailable: false,
      nativeCheckoutAvailable: false,
      conditionalFundingMode: "pledge_only_external_handoff",
      sponsor: null,
      blockers,
    };
  }

  return {
    mode: "fiscal_sponsor",
    sponsorStatus: "active",
    directToCharityAvailable: true,
    projectFundingAvailable: true,
    nativeCheckoutAvailable: false,
    conditionalFundingMode: "pledge_only_external_handoff",
    sponsor: {
      legalName,
      jurisdiction,
      contributionUrl,
      feeDisclosure,
      taxReceiptDisclosure,
      refundPolicyUrl,
    },
    blockers: [],
  };
}
