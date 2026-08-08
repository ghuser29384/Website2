const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function enabled(name: string) {
  return TRUE_VALUES.has(String(process.env[name] ?? "").trim().toLowerCase());
}

export type InstitutionalFeature = "trades" | "pools" | "enterprise_api" | "webhooks";

export function isInstitutionalFeatureEnabled(feature: InstitutionalFeature) {
  switch (feature) {
    case "trades":
      return enabled("INSTITUTIONAL_TRADES_ENABLED");
    case "pools":
      return enabled("INSTITUTIONAL_TRADES_ENABLED") && enabled("INSTITUTIONAL_POOLS_ENABLED");
    case "enterprise_api":
      return enabled("INSTITUTIONAL_TRADES_ENABLED") && enabled("INSTITUTIONAL_ENTERPRISE_API_ENABLED");
    case "webhooks":
      return enabled("INSTITUTIONAL_TRADES_ENABLED") && enabled("INSTITUTIONAL_WEBHOOKS_ENABLED");
  }
}

export function institutionalFeatureUnavailableMessage(feature: InstitutionalFeature) {
  const label = feature.replaceAll("_", " ");
  return `Institutional ${label} are not enabled in this environment.`;
}
