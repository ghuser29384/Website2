const QA_PROJECT_REF = "hvmxfjjbdcgjjudmthdz";
const QA_PUBLIC_URL = `https://${QA_PROJECT_REF}.supabase.co`;
const FORBIDDEN_PRODUCTION_REF = "jnpoxvalyjtdghnperyu";

const EXPECTED_DISABLED_MODES = Object.freeze({
  CONDITIONAL_PAYMENTS_MODE: "disabled",
  TRADE_DONATION_POOL_ENABLED: "false",
  TRADE_DONATION_POOL_MODE: "disabled",
  DIRECT_DONATION_UPGRADES_ENABLED: "false",
  DIRECT_DONATION_UPGRADE_MODE: "disabled",
  MPGF_REAL_MONEY_ENABLED: "false",
  MPGF_REAL_MONEY_ACCEPTANCE_ENABLED: "false",
  MPGF_TEST_PAYMENT_ENABLED: "false",
  EVERY_ORG_PLEDGE_DONATIONS_ENABLED: "false",
});

const PROVIDER_CREDENTIAL_NAME =
  /(STRIPE|EVERY_?ORG|PAYMENT|CUSTODY|SETTLEMENT|RESERVE|PAYOUT|PAYPAL|BRAINTREE|ADYEN|SQUARE).*(SECRET|KEY|TOKEN|ACCOUNT|CREDENTIAL|URL|ID)$/i;

module.exports = async function runtimeAttestation(request, response) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    response.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  const environment = process.env;
  const publicUrl = String(environment.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const projectRefMatch = publicUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
  const qaProjectRef = projectRefMatch?.[1] ?? null;
  const productionProjectPresent = Object.values(environment).some(
    (value) => typeof value === "string" && value.includes(FORBIDDEN_PRODUCTION_REF),
  );
  const nonemptyProviderCredentialKeys = Object.entries(environment)
    .filter(
      ([key, value]) =>
        PROVIDER_CREDENTIAL_NAME.test(key) && typeof value === "string" && value.trim() !== "",
    )
    .map(([key]) => key)
    .sort();
  const paymentModesDisabled = Object.entries(EXPECTED_DISABLED_MODES).every(
    ([key, value]) => environment[key] === value,
  );
  const qaPublicUrlExact = publicUrl === QA_PUBLIC_URL;
  const qaPublishableKeyConfigured = Boolean(
    String(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim(),
  );
  const publishableKey = String(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const serviceRoleAbsent = !String(environment.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  let qaApiRead = false;

  if (qaPublicUrlExact && !productionProjectPresent && qaPublishableKeyConfigured) {
    try {
      const apiRead = await fetch(`${QA_PUBLIC_URL}/auth/v1/settings`, {
        headers: {
          apikey: publishableKey,
        },
        signal: AbortSignal.timeout(10_000),
      });
      qaApiRead = apiRead.ok;
    } catch {
      qaApiRead = false;
    }
  }

  const ok =
    environment.VERCEL_ENV === "preview" &&
    qaPublicUrlExact &&
    qaPublishableKeyConfigured &&
    serviceRoleAbsent &&
    qaApiRead &&
    paymentModesDisabled &&
    !productionProjectPresent &&
    nonemptyProviderCredentialKeys.length === 0;

  response.statusCode = ok ? 200 : 503;
  response.end(
    JSON.stringify({
      schemaVersion: 1,
      scope: "controller-only-protected-preview",
      ok,
      runtimeEnvironment: environment.VERCEL_ENV ?? null,
      qaProjectRef,
      qaPublicUrlExact,
      qaPublishableKeyConfigured,
      serviceRoleAbsent,
      qaApiRead,
      paymentModesDisabled,
      productionProjectPresent,
      nonemptyProviderCredentialKeys,
      secretValuesReturned: false,
    }),
  );
};
