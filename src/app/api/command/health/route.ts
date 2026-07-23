import { NextResponse } from "next/server";

import { hasBackgroundFieldEncryptionKey } from "@/lib/background-field-encryption";
import { COMMAND_CAPABILITIES } from "@/lib/command/capabilities";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const modelEnabled = process.env.MORAL_TRADE_COMMAND_LLM_ENABLED?.trim().toLowerCase();
  return NextResponse.json(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      capabilityCount: COMMAND_CAPABILITIES.length,
      persistenceConfigured: hasSupabaseEnv() && hasBackgroundFieldEncryptionKey(),
      modelConfigured:
        Boolean(process.env.OPENAI_API_KEY?.trim()) && modelEnabled !== "false" && modelEnabled !== "0",
      modelName: process.env.MORAL_TRADE_COMMAND_MODEL?.trim() || "gpt-5-mini",
      directModelStateChanges: false,
      confirmationPolicy: "typed-capability-registry",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
