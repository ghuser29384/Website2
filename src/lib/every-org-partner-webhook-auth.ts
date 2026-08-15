import { timingSafeEqual } from "node:crypto";

export const EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN_ENV =
  "EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN" as const;
export const EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN_ENV =
  "EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN" as const;
export const EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS =
  "unconfirmed" as const;

export type EveryOrgRuntimeEnvironment = Readonly<
  Record<string, string | undefined>
>;

const UNSUPPORTED_EVERY_ORG_WEBHOOK_CREDENTIAL_ENV_NAMES = [
  "EVERY_ORG_WEBHOOK_TOKEN",
  "MPGF_EVERY_ORG_PUBLIC_WEBHOOK_TOKEN",
  "MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET",
] as const;

export interface EveryOrgCredentialConfiguration {
  donateLinkWebhookToken: string;
  donateLinkWebhookTokenConfigured: boolean;
  partnerWebhookAuthorizationTokenConfigured: boolean;
  partnerWebhookAuthorizationContract:
    typeof EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS;
  unsupportedCredentialEnvironmentNames: string[];
  publicAndPrivateTokensEqual: boolean;
  credentialConfigurationValid: boolean;
  partnerWebhookAuthorizationReady: boolean;
  blockers: string[];
}

export interface EveryOrgPartnerWebhookAuthorizationResult {
  authorized: boolean;
  status: "configuration_invalid" | "unconfirmed";
}

export interface EveryOrgSharedConnectorMechanism {
  mechanism: "direct_donation_upgrade" | "pledge_donation";
  enabled: boolean;
  ready: boolean;
  environment: "staging" | "live" | null;
  webhookPathSecret: string;
}

export interface EveryOrgSharedConnectorResolution {
  accepted: boolean;
  status:
    | "accepted"
    | "environment_ambiguous"
    | "mechanism_not_ready"
    | "no_enabled_mechanism"
    | "path_ambiguous"
    | "path_mismatch";
  mechanisms: Array<EveryOrgSharedConnectorMechanism["mechanism"]>;
  environment: "staging" | "live" | null;
}

function envText(environment: EveryOrgRuntimeEnvironment, name: string) {
  return String(environment[name] ?? "").trim();
}

function constantTimeTextEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    leftBuffer.length > 0 &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function getEveryOrgCredentialConfiguration(
  environment: EveryOrgRuntimeEnvironment = process.env,
): EveryOrgCredentialConfiguration {
  const donateLinkWebhookToken = envText(
    environment,
    EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN_ENV,
  );
  const partnerWebhookAuthorizationToken = envText(
    environment,
    EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN_ENV,
  );
  const unsupportedCredentialEnvironmentNames =
    UNSUPPORTED_EVERY_ORG_WEBHOOK_CREDENTIAL_ENV_NAMES.filter((name) =>
      Boolean(envText(environment, name)),
    );
  const publicAndPrivateTokensEqual =
    Boolean(donateLinkWebhookToken) &&
    Boolean(partnerWebhookAuthorizationToken) &&
    constantTimeTextEqual(
      donateLinkWebhookToken,
      partnerWebhookAuthorizationToken,
    );
  const blockers: string[] = [];

  if (!donateLinkWebhookToken) {
    blockers.push(`${EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN_ENV} is missing.`);
  }
  if (!partnerWebhookAuthorizationToken) {
    blockers.push(
      `${EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN_ENV} is missing.`,
    );
  }
  if (unsupportedCredentialEnvironmentNames.length > 0) {
    blockers.push(
      "Unsupported legacy Every.org webhook credential variables are configured; no alias is accepted.",
    );
  }
  if (publicAndPrivateTokensEqual) {
    blockers.push(
      "Every.org Donate Link and Partner Webhook authorization tokens must be distinct.",
    );
  }

  const credentialConfigurationValid =
    Boolean(donateLinkWebhookToken) &&
    Boolean(partnerWebhookAuthorizationToken) &&
    unsupportedCredentialEnvironmentNames.length === 0 &&
    !publicAndPrivateTokensEqual;

  blockers.push(
    "Every.org Partner Webhook authorization header contract is unconfirmed.",
  );

  return {
    // If both configured values are equal, the nominally public value is also the
    // private credential and must not be returned to any Donate Link builder.
    donateLinkWebhookToken: publicAndPrivateTokensEqual
      ? ""
      : donateLinkWebhookToken,
    donateLinkWebhookTokenConfigured: Boolean(donateLinkWebhookToken),
    partnerWebhookAuthorizationTokenConfigured: Boolean(
      partnerWebhookAuthorizationToken,
    ),
    partnerWebhookAuthorizationContract:
      EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_CONTRACT_STATUS,
    unsupportedCredentialEnvironmentNames: [
      ...unsupportedCredentialEnvironmentNames,
    ],
    publicAndPrivateTokensEqual,
    credentialConfigurationValid,
    partnerWebhookAuthorizationReady: false,
    blockers: [...new Set(blockers)],
  };
}

/**
 * Phase A deliberately accepts no request header. Every.org has confirmed that
 * a private token is sent in a header, but has not supplied the literal header
 * name or complete value format. Phase B must replace this fail-closed result
 * only with that exact provider contract.
 */
export function authenticateEveryOrgPartnerWebhookRequest(
  environment: EveryOrgRuntimeEnvironment = process.env,
): EveryOrgPartnerWebhookAuthorizationResult {
  const configuration = getEveryOrgCredentialConfiguration(environment);

  return {
    authorized: false,
    status: configuration.credentialConfigurationValid
      ? "unconfirmed"
      : "configuration_invalid",
  };
}

export function resolveEveryOrgSharedConnector(
  candidatePathSecret: string,
  mechanisms: EveryOrgSharedConnectorMechanism[],
): EveryOrgSharedConnectorResolution {
  const enabled = mechanisms.filter((mechanism) => mechanism.enabled);
  const mechanismNames = enabled.map((mechanism) => mechanism.mechanism);

  if (enabled.length === 0) {
    return {
      accepted: false,
      status: "no_enabled_mechanism",
      mechanisms: [],
      environment: null,
    };
  }

  if (enabled.some((mechanism) => !mechanism.ready)) {
    return {
      accepted: false,
      status: "mechanism_not_ready",
      mechanisms: mechanismNames,
      environment: null,
    };
  }

  const environments = new Set(enabled.map((mechanism) => mechanism.environment));
  if (environments.size !== 1 || enabled[0]?.environment === null) {
    return {
      accepted: false,
      status: "environment_ambiguous",
      mechanisms: mechanismNames,
      environment: null,
    };
  }

  const canonicalPathSecret = enabled[0]?.webhookPathSecret ?? "";
  if (
    canonicalPathSecret.length < 32 ||
    enabled.some(
      (mechanism) =>
        mechanism.webhookPathSecret.length < 32 ||
        !constantTimeTextEqual(
          mechanism.webhookPathSecret,
          canonicalPathSecret,
        ),
    )
  ) {
    return {
      accepted: false,
      status: "path_ambiguous",
      mechanisms: mechanismNames,
      environment: null,
    };
  }

  if (!constantTimeTextEqual(candidatePathSecret, canonicalPathSecret)) {
    return {
      accepted: false,
      status: "path_mismatch",
      mechanisms: mechanismNames,
      environment: null,
    };
  }

  return {
    accepted: true,
    status: "accepted",
    mechanisms: mechanismNames,
    environment: enabled[0]?.environment ?? null,
  };
}
