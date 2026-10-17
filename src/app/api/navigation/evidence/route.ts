import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { readPublicOutcomeAvailability } from "@/lib/public-outcome-availability";
import { getSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const available = await readPublicOutcomeAvailability(async () => {
    const { url, publishableKey } = getSupabaseEnv();
    // No session cookies, user JWT, service role, or private-table read.
    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return await client.rpc("list_public_moral_trade_outcomes_v2", {
      p_limit: 1,
      p_offset: 0,
    }).abortSignal(AbortSignal.timeout(2500));
  });
  return NextResponse.json({ available }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
