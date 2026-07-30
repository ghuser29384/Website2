#!/usr/bin/env python3
from pathlib import Path


def replace_exact(path: str, old: str, new: str, label: str, expected: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} {label}; found {count}")
    file.write_text(text.replace(old, new))


replace_exact(
    "src/lib/discovery-ranking.test.ts",
    '''function offer(overrides: Partial<OfferDiscoveryLike> & Pick<OfferDiscoveryLike, "id">): OfferDiscoveryLike {
  return {
    id: overrides.id,
''',
    '''function offer(overrides: Partial<OfferDiscoveryLike> & Pick<OfferDiscoveryLike, "id">): OfferDiscoveryLike {
  const { id, ...rest } = overrides;
  return {
    id,
''',
    "offer override destructuring",
)
replace_exact(
    "src/lib/discovery-ranking.test.ts",
    '''    donationOffset: null,
    ...overrides,
''',
    '''    donationOffset: null,
    ...rest,
''',
    "offer rest spread",
)
replace_exact(
    "src/lib/discovery-ranking.test.ts",
    '''function profile(
  overrides: Partial<ProfileDiscoveryLike> & Pick<ProfileDiscoveryLike, "id" | "resolvedName">,
): ProfileDiscoveryLike {
  return {
    id: overrides.id,
    resolvedName: overrides.resolvedName,
    display_name: overrides.resolvedName,
''',
    '''function profile(
  overrides: Partial<ProfileDiscoveryLike> & Pick<ProfileDiscoveryLike, "id" | "resolvedName">,
): ProfileDiscoveryLike {
  const { id, resolvedName, ...rest } = overrides;
  return {
    id,
    resolvedName,
    display_name: resolvedName,
''',
    "profile override destructuring",
)
replace_exact(
    "src/lib/discovery-ranking.test.ts",
    '''    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
''',
    '''    created_at: "2026-07-01T00:00:00.000Z",
    ...rest,
''',
    "profile rest spread",
)

replace_exact(
    "src/lib/funding.test.ts",
    'getMoralTradeFundingReadiness({} as NodeJS.ProcessEnv)',
    'getMoralTradeFundingReadiness({ NODE_ENV: "test" } as NodeJS.ProcessEnv)',
    "empty funding environment",
)
replace_exact(
    "src/lib/funding.test.ts",
    '''  const readiness = getMoralTradeFundingReadiness({
    MORAL_TRADE_FUNDING_MODE:''',
    '''  const readiness = getMoralTradeFundingReadiness({
    NODE_ENV: "test",
    MORAL_TRADE_FUNDING_MODE:''',
    "funding NODE_ENV fields",
    expected=3,
)

replace_exact(
    "src/lib/mpgf/failure-bonus-operator.test.ts",
    '''  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.errors.join(" "));
''',
    '''  if (!result.ok) throw new Error(result.errors.join(" "));
  assert.equal(result.ok, true);
''',
    "failure-bonus result guard",
)

replace_exact(
    "src/lib/payments/conditional-state.test.ts",
    '''  const previewSandbox = getConditionalPaymentsEnvironment({
    VERCEL_ENV:''',
    '''  const previewSandbox = getConditionalPaymentsEnvironment({
    NODE_ENV: "test",
    VERCEL_ENV:''',
    "preview payment NODE_ENV",
)
replace_exact(
    "src/lib/payments/conditional-state.test.ts",
    '''  const productionSandbox = getConditionalPaymentsEnvironment({
    CONDITIONAL_PAYMENTS_MODE:''',
    '''  const productionSandbox = getConditionalPaymentsEnvironment({
    NODE_ENV: "test",
    CONDITIONAL_PAYMENTS_MODE:''',
    "production payment NODE_ENV",
)
replace_exact(
    "src/lib/payments/conditional-state.test.ts",
    '''  const disabled = getConditionalPaymentsEnvironment({
    CONDITIONAL_PAYMENTS_MODE:''',
    '''  const disabled = getConditionalPaymentsEnvironment({
    NODE_ENV: "test",
    CONDITIONAL_PAYMENTS_MODE:''',
    "disabled payment NODE_ENV",
)
replace_exact(
    "src/lib/payments/conditional-state.test.ts",
    '''  const invalidLive = getConditionalPaymentsEnvironment({
    CONDITIONAL_PAYMENTS_MODE:''',
    '''  const invalidLive = getConditionalPaymentsEnvironment({
    NODE_ENV: "test",
    CONDITIONAL_PAYMENTS_MODE:''',
    "invalid-live payment NODE_ENV",
)

replace_exact(
    "src/lib/public-route-smoke.test.ts",
    '''function flattenPrimaryNavHrefs() {
  return getPrimaryNavLinks(false).flatMap((link) =>
    "items" in link && link.items
      ? link.items.map((item) => item.href)
      : "href" in link && link.href
        ? [link.href]
        : [],
  );
}
''',
    '''function flattenPrimaryNavHrefs(): string[] {
  return getPrimaryNavLinks(false).map((link) => link.href);
}
''',
    "primary navigation flattening",
)

replace_exact(
    "src/lib/recommendation-training-execution.test.ts",
    '{ VERCEL_DEPLOYMENT_ID: "dpl_canonical" },',
    '{ NODE_ENV: "test", VERCEL_DEPLOYMENT_ID: "dpl_canonical" },',
    "deployment execution environment",
)
replace_exact(
    "src/lib/recommendation-training-execution.test.ts",
    '''    {},
    new Date(''',
    '''    { NODE_ENV: "test" },
    new Date(''',
    "manual execution environments",
    expected=2,
)

replace_exact(
    "src/lib/x-profile-connector.test.ts",
    '''const readyEnv = {
  X_PROFILE_CONNECTOR_ENABLED:''',
    '''const readyEnv = {
  NODE_ENV: "test",
  X_PROFILE_CONNECTOR_ENABLED:''',
    "ready X connector NODE_ENV",
)
replace_exact(
    "src/lib/x-profile-connector.test.ts",
    '''    getXProfileConnectorAvailability({
      env: {},
''',
    '''    getXProfileConnectorAvailability({
      env: { NODE_ENV: "test" },
''',
    "disabled X connector NODE_ENV",
)

replace_exact(
    "src/live-account-data.test.ts",
    r'/Cache-Control.*private, no-store/s',
    r'/Cache-Control[\s\S]*private, no-store/',
    "ES2017-compatible live-account regex",
)
replace_exact(
    "src/sitewide-account-identity.test.ts",
    r'/Cache-Control.*private, no-store/su',
    r'/Cache-Control[\s\S]*private, no-store/u',
    "ES2017-compatible sitewide identity regex",
)

print("Repaired the current-main TypeScript errors without suppressions or compiler relaxations.")
