export type CoreHealthStatus = "ok" | "degraded" | "unavailable";

export interface CoreHealthChecks {
  authAvailable: boolean;
  databaseAvailable: boolean;
  encryptionConfigured: boolean;
  privilegedClientConfigured: boolean;
  requiredDatabaseContractReady: boolean;
  storageAvailable: boolean;
  supabasePublicConfigAvailable: boolean;
}

export function deriveCoreHealthStatus(checks: CoreHealthChecks): CoreHealthStatus {
  if (!checks.supabasePublicConfigAvailable || !checks.databaseAvailable) {
    return "unavailable";
  }

  if (
    !checks.authAvailable ||
    !checks.encryptionConfigured ||
    !checks.privilegedClientConfigured ||
    !checks.requiredDatabaseContractReady ||
    !checks.storageAvailable
  ) {
    return "degraded";
  }

  return "ok";
}
