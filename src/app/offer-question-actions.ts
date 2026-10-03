"use server";

import { revalidatePath } from "next/cache";

import { addOfferCommentAction } from "@/app/actions";

export async function addOfferQuestionAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "").trim();
  const fallbackReturnTo = offerId ? `/offers/${offerId}#discussion` : "/offers";
  const requestedReturnTo = String(formData.get("return_to") ?? fallbackReturnTo).trim();
  const returnUrl = new URL(
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : fallbackReturnTo,
    "https://www.moraltrade.org",
  );

  returnUrl.searchParams.set("question_posted", String(Date.now()));
  returnUrl.hash = "discussion";
  formData.set("submission_kind", "question");
  formData.set(
    "return_to",
    `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
  );

  if (offerId) revalidatePath(`/offers/${offerId}`);
  return addOfferCommentAction(formData);
}
