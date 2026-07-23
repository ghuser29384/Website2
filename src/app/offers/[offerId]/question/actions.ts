"use server";

import { revalidatePath } from "next/cache";

import { addOfferCommentAction } from "@/app/actions";

export async function addOfferQuestionAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "").trim();

  if (offerId) {
    revalidatePath(`/offers/${offerId}/question`);
  }

  return addOfferCommentAction(formData);
}
