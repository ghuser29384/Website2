"use server";

import { revalidatePath } from "next/cache";

import { addOfferCommentAction } from "@/app/actions";

export async function addOfferQuestionAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "").trim();
  const fallbackReturnTo = offerId ? `/offers/${offerId}/question` : "/offers";
  const requestedReturnTo = String(
    formData.get("return_to") ?? fallbackReturnTo,
  ).trim();
  const returnUrl = new URL(
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : fallbackReturnTo,
    "https://www.moraltrade.org",
  );

  returnUrl.searchParams.set("posted", String(Date.now()));
  returnUrl.hash = "question-thread";
  formData.set(
    "return_to",
    `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
  );

  if (offerId) {
    revalidatePath(`/offers/${offerId}/question`);
  }

  return addOfferCommentAction(formData);
}
