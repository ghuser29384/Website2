"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reviewCoreOfferAction as reviewCoreOfferActionBase } from "@/app/core-trade-actions-base";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { createServiceClient } from "@/lib/supabase/server";

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeInternalPath(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function redirectWithMessage(path: string, key: "message" | "error", message: string) {
  const url = new URL(path, "https://www.moraltrade.org");
  url.searchParams.set(key, message);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

export async function reviewFeedCreateAwareCoreOfferAction(formData: FormData) {
  const offerId = read(formData, "offer_id");
  const decision = read(formData, "decision");
  const returnTo = safeInternalPath(
    read(formData, "return_to"),
    "/admin/trade-review",
  );

  if (!offerId || decision !== "approve") {
    return reviewCoreOfferActionBase(formData);
  }

  const viewer = await requireViewer(returnTo);
  const mfaSummary = await loadBackgroundAccountSecuritySummary();
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary,
  });
  if (!access.allowed) {
    redirectWithMessage("/dashboard", "error", access.message);
  }

  const service = createServiceClient() as any;
  const { data: link, error: linkError } = await service
    .from("moral_trade_feed_create_links")
    .select("id,source_offer_id,delivered_thread_id,delivered_counterproposal_id")
    .eq("derived_offer_id", offerId)
    .maybeSingle();

  if (linkError) {
    redirectWithMessage(returnTo, "error", linkError.message);
  }
  if (!link) {
    return reviewCoreOfferActionBase(formData);
  }

  const { data, error } = await service.rpc(
    "moral_trade_feed_create_deliver_service",
    {
      p_reviewer_id: viewer.authUser.id,
      p_derived_offer_id: offerId,
    },
  );
  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const result = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const threadId = String(result.threadId ?? link.delivered_thread_id ?? "");
  const sourceOfferId = String(result.sourceOfferId ?? link.source_offer_id ?? "");

  revalidatePath("/admin/trade-review");
  revalidatePath(`/trades/${offerId}/manage`);
  revalidatePath("/messages");
  if (threadId) revalidatePath(`/messages/${threadId}`);
  if (sourceOfferId) revalidatePath(`/offers/${sourceOfferId}`);

  if (!threadId) {
    redirectWithMessage(
      returnTo,
      "message",
      "The Feed-derived counterproposal was already delivered privately.",
    );
  }
  redirectWithMessage(
    `/messages/${threadId}`,
    "message",
    "Counterproposal approved and delivered privately to the exact Feed counterparty.",
  );
}
