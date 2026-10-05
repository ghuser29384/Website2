import "server-only";

import { createClient } from "@/lib/supabase/server";

interface PledgeImpactRpcError {
  message?: string;
}

interface PledgeImpactRpcClient {
  rpc(
    name: "get_mpgf_pledge_impact_bundle",
    args: { p_pool_public_key: string },
  ): Promise<{ data: unknown; error: PledgeImpactRpcError | null }>;
}

export async function loadPledgeImpactLiveBundle(poolPublicKey: string) {
  const supabase = (await createClient()) as unknown as PledgeImpactRpcClient;
  const { data, error } = await supabase.rpc("get_mpgf_pledge_impact_bundle", {
    p_pool_public_key: poolPublicKey,
  });
  if (error) {
    throw new Error(error.message || "Live pledge-impact bundle query failed.");
  }
  return data;
}
