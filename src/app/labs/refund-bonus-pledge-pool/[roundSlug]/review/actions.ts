"use server";

import { redirect } from "next/navigation";

export async function saveRefundBonusLabsHardPledgeAction(formData: FormData) {
  const rawRoundSlug = String(formData.get("roundSlug") ?? "demo-round");
  const roundSlug = rawRoundSlug.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80) || "demo-round";

  redirect(`/labs/refund-bonus-pledge-pool/${roundSlug}/review?saved=simulated#simulated-hard-pledge-result`);
}
