import type {
  MpgfPublicGoodsAllocationLine,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsDestinationType,
  MpgfPublicGoodsPaymentProof,
} from "./types";

export type MpgfPublicGoodsPaymentAdapterMode =
  | "external_destination_redirect"
  | "provider_webhook_required"
  | "signed_intent_review_required"
  | "blocked";

export type MpgfPublicGoodsPaymentRail =
  | "charity_external_checkout"
  | "fiscal_host_external_checkout"
  | "provider_managed_payment_intent"
  | "signed_sponsor_intent"
  | "unavailable";

export interface MpgfPublicGoodsPaymentAdapterInput {
  campaign: MpgfPublicGoodsCampaign;
  captureMode?: MpgfPublicGoodsCaptureMode;
  paymentIntentRef?: string;
  externalDestinationUrl?: string;
  fiscalHostUrl?: string;
}

export interface MpgfPublicGoodsPaymentAdapterResult {
  adapterName: "mpgf_public_goods_no_custody_payment_adapter_v1";
  campaignId: string;
  captureMode: MpgfPublicGoodsCaptureMode;
  destinationType: MpgfPublicGoodsDestinationType;
  mode: MpgfPublicGoodsPaymentAdapterMode;
  paymentRail: MpgfPublicGoodsPaymentRail;
  destinationUrl?: string;
  opensExternalDestination: boolean;
  requiresProviderWebhook: boolean;
  requiresSignedIntentReview: boolean;
  createsCustody: false;
  proofRequired: MpgfPublicGoodsAllocationLine["proofRequired"];
  reconciliationSource: MpgfPublicGoodsPaymentProof["reconciliationSource"];
  warnings: string[];
  blockers: string[];
  publicInstructions: string;
}

const supportedCaptureModes = new Set<MpgfPublicGoodsCaptureMode>([
  "external_handoff",
  "stored_payment_method",
  "signed_intent",
]);

const externalHandoffDestinations = new Set<MpgfPublicGoodsDestinationType>([
  "external_charity",
  "fiscal_host",
]);

function trimmedOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function isPrivateOrLocalHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".local") ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

function resolveHttpsDestinationUrl(
  input: {
    externalDestinationUrl?: string;
    fiscalHostUrl?: string;
    destinationType: MpgfPublicGoodsDestinationType;
  },
  blockers: string[],
) {
  const rawUrl =
    input.destinationType === "fiscal_host"
      ? trimmedOrUndefined(input.fiscalHostUrl) ?? trimmedOrUndefined(input.externalDestinationUrl)
      : trimmedOrUndefined(input.externalDestinationUrl);

  if (!rawUrl) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    blockers.push("External payment destinations must be valid HTTPS URLs.");
    return undefined;
  }

  if (url.protocol !== "https:") {
    blockers.push("External payment destinations must use HTTPS.");
  }

  if (url.username || url.password) {
    blockers.push("External payment destinations must not embed credentials.");
  }

  if (isPrivateOrLocalHost(url.hostname)) {
    blockers.push("External payment destinations must not point at local or private hosts.");
  }

  return url.toString();
}

function sourceForDestination(
  destinationType: MpgfPublicGoodsDestinationType,
): MpgfPublicGoodsPaymentProof["reconciliationSource"] {
  return destinationType === "fiscal_host" ? "fiscal_host_webhook" : "external_receipt";
}

function blockedResult(input: {
  campaign: MpgfPublicGoodsCampaign;
  captureMode: MpgfPublicGoodsCaptureMode;
  destinationType: MpgfPublicGoodsDestinationType;
  proofRequired: MpgfPublicGoodsPaymentAdapterResult["proofRequired"];
  reconciliationSource: MpgfPublicGoodsPaymentProof["reconciliationSource"];
  warnings: string[];
  blockers: string[];
}): MpgfPublicGoodsPaymentAdapterResult {
  return {
    adapterName: "mpgf_public_goods_no_custody_payment_adapter_v1",
    campaignId: input.campaign.id,
    captureMode: input.captureMode,
    destinationType: input.destinationType,
    mode: "blocked",
    paymentRail: "unavailable",
    opensExternalDestination: false,
    requiresProviderWebhook: false,
    requiresSignedIntentReview: false,
    createsCustody: false,
    proofRequired: input.proofRequired,
    reconciliationSource: input.reconciliationSource,
    warnings: input.warnings,
    blockers: input.blockers,
    publicInstructions: "This route is blocked until the payment destination and proof path pass review.",
  };
}

export function resolveMpgfPublicGoodsPaymentAdapter(
  input: MpgfPublicGoodsPaymentAdapterInput,
): MpgfPublicGoodsPaymentAdapterResult {
  const captureMode = input.captureMode ?? "external_handoff";
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!input.campaign.id.trim()) {
    blockers.push("MPGF public-goods payment adapter requires a campaign id.");
  }

  if (!supportedCaptureModes.has(captureMode)) {
    blockers.push("MPGF public-goods payment adapter received an unsupported capture mode.");
  }

  if (!input.campaign.destinationRef.trim()) {
    blockers.push("MPGF public-goods payment adapter requires a reviewed destination reference.");
  }

  if (/escrow|custody guaranteed|tax receipt guaranteed|token/i.test(input.campaign.destinationRef)) {
    blockers.push("Destination references must not make escrow, token, custody, or tax claims.");
  }

  if (captureMode === "signed_intent") {
    return blockers.length > 0
      ? blockedResult({
          campaign: input.campaign,
          captureMode,
          destinationType: input.campaign.destinationType,
          proofRequired: "signed_intent_review",
          reconciliationSource: "sponsor_signed_intent",
          warnings,
          blockers,
        })
      : {
          adapterName: "mpgf_public_goods_no_custody_payment_adapter_v1",
          campaignId: input.campaign.id,
          captureMode,
          destinationType: input.campaign.destinationType,
          mode: "signed_intent_review_required",
          paymentRail: "signed_sponsor_intent",
          opensExternalDestination: false,
          requiresProviderWebhook: false,
          requiresSignedIntentReview: true,
          createsCustody: false,
          proofRequired: "signed_intent_review",
          reconciliationSource: "sponsor_signed_intent",
          warnings,
          blockers,
          publicInstructions:
            "Record a signed sponsor intent; reviewers must verify it before it can count toward public-goods proof.",
        };
  }

  if (captureMode === "stored_payment_method") {
    if (!trimmedOrUndefined(input.paymentIntentRef)) {
      blockers.push("Stored-payment-method public-goods pledges require a provider payment intent reference.");
    }

    if (input.campaign.destinationType === "signed_sponsor_route") {
      blockers.push("Signed sponsor routes must use signed-intent review instead of a stored payment method.");
    }

    const reconciliationSource = sourceForDestination(input.campaign.destinationType);

    return blockers.length > 0
      ? blockedResult({
          campaign: input.campaign,
          captureMode,
          destinationType: input.campaign.destinationType,
          proofRequired: "provider_webhook_and_review",
          reconciliationSource,
          warnings,
          blockers,
        })
      : {
          adapterName: "mpgf_public_goods_no_custody_payment_adapter_v1",
          campaignId: input.campaign.id,
          captureMode,
          destinationType: input.campaign.destinationType,
          mode: "provider_webhook_required",
          paymentRail: "provider_managed_payment_intent",
          opensExternalDestination: false,
          requiresProviderWebhook: true,
          requiresSignedIntentReview: false,
          createsCustody: false,
          proofRequired: "provider_webhook_and_review",
          reconciliationSource,
          warnings,
          blockers,
          publicInstructions:
            "Use a provider or fiscal-host payment intent; MoralTrade records webhook proof and reviewer status without taking custody.",
        };
  }

  const destinationUrl = resolveHttpsDestinationUrl(
    {
      externalDestinationUrl: input.externalDestinationUrl,
      fiscalHostUrl: input.fiscalHostUrl,
      destinationType: input.campaign.destinationType,
    },
    blockers,
  );

  if (!externalHandoffDestinations.has(input.campaign.destinationType)) {
    blockers.push("External handoff requires an external charity or fiscal-host destination.");
  }

  if (!destinationUrl) {
    warnings.push("Configure an HTTPS destination URL before opening an external handoff redirect.");
  }

  const reconciliationSource = sourceForDestination(input.campaign.destinationType);

  return blockers.length > 0
    ? blockedResult({
        campaign: input.campaign,
        captureMode,
        destinationType: input.campaign.destinationType,
        proofRequired: "external_destination_receipt",
        reconciliationSource,
        warnings,
        blockers,
      })
    : {
        adapterName: "mpgf_public_goods_no_custody_payment_adapter_v1",
        campaignId: input.campaign.id,
        captureMode,
        destinationType: input.campaign.destinationType,
        mode: "external_destination_redirect",
        paymentRail:
          input.campaign.destinationType === "fiscal_host"
            ? "fiscal_host_external_checkout"
            : "charity_external_checkout",
        destinationUrl,
        opensExternalDestination: Boolean(destinationUrl),
        requiresProviderWebhook: input.campaign.destinationType === "fiscal_host",
        requiresSignedIntentReview: false,
        createsCustody: false,
        proofRequired: "external_destination_receipt",
        reconciliationSource,
        warnings,
        blockers,
        publicInstructions:
          "Open the reviewed external destination; only receipt or fiscal-host proof can later count toward MPGF public-goods funding.",
      };
}
