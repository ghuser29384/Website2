import { NextResponse } from "next/server";

import { hasBackgroundFieldEncryptionKey } from "@/lib/background-field-encryption";
import {
  deriveCoreHealthStatus,
  type CoreHealthChecks,
} from "@/lib/core-health";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEALTH_TIMEOUT_MS = 4_000;
const EVIDENCE_BUCKET = "trade-evidence";

async function within<T>(promise: Promise<T>, timeoutMs = HEALTH_TIMEOUT_MS): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Health dependency timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function booleanEnv(name: string) {
  return ["1", "true", "yes", "on"].includes(
    String(process.env[name] ?? "").trim().toLowerCase(),
  );
}

export async function GET() {
  const supabasePublicConfigAvailable = hasSupabaseEnv();
  const privilegedClientConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const encryptionConfigured = hasBackgroundFieldEncryptionKey();

  let authAvailable = false;
  let databaseAvailable = false;
  let requiredDatabaseContractReady = false;
  let storageAvailable = false;

  if (supabasePublicConfigAvailable) {
    try {
      if (privilegedClientConfigured) {
        const service = createServiceClient() as any;
        const [databaseResult, contractResult, authResult, storageResult] = await within(
          Promise.all([
            service.from("offers").select("id", { count: "exact", head: true }).limit(1),
            service.rpc("get_core_release_health_v1"),
            service.auth.admin.listUsers({ page: 1, perPage: 1 }),
            service.storage.listBuckets(),
          ]),
        );

        databaseAvailable = !databaseResult.error;
        requiredDatabaseContractReady =
          !contractResult.error && Boolean(contractResult.data?.ready);
        authAvailable = !authResult.error;
        storageAvailable =
          !storageResult.error &&
          Array.isArray(storageResult.data) &&
          storageResult.data.some((bucket: { name?: string }) => bucket.name === EVIDENCE_BUCKET);
      } else {
        const publicClient = await createClient();
        const [databaseResult, authResult] = await within(
          Promise.all([
            publicClient
              .from("offers")
              .select("id", { count: "exact", head: true })
              .limit(1),
            publicClient.auth.getUser(),
          ]),
        );

        databaseAvailable = !databaseResult.error;
        authAvailable = !authResult.error;
      }
    } catch (error) {
      console.error("[health] Dependency check failed", {
        classification: "integration_unavailable",
        eventId: "health.dependency_check_failed",
        message: error instanceof Error ? error.message : "Unknown health dependency failure.",
      });
    }
  }

  const checks: CoreHealthChecks = {
    authAvailable,
    databaseAvailable,
    encryptionConfigured,
    privilegedClientConfigured,
    requiredDatabaseContractReady,
    storageAvailable,
    supabasePublicConfigAvailable,
  };
  const status = deriveCoreHealthStatus(checks);

  return NextResponse.json(
    {
      status,
      deployment: {
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "unknown",
      },
      checks,
      features: {
        everyOrgDonationConnector: booleanEnv("EVERY_ORG_PLEDGE_DONATIONS_ENABLED")
          ? process.env.EVERY_ORG_ENVIRONMENT ?? "configured"
          : "disabled",
        nativeMoneyMovement: "disabled",
        settlementAndPayouts: "disabled",
      },
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
      status: status === "unavailable" ? 503 : 200,
    },
  );
}
