"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { addOfferQuestionAction } from "@/app/offer-question-actions";

interface OfferQuestionFormProps {
  offerId: string;
  resetToken?: string;
  returnTo: string;
}

function QuestionSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="button button-primary"
      disabled={pending}
      type="submit"
    >
      {pending ? "Posting question…" : "Post public question"}
    </button>
  );
}

export function OfferQuestionForm({
  offerId,
  resetToken = "",
  returnTo,
}: OfferQuestionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetToken) formRef.current?.reset();
  }, [resetToken]);

  return (
    <form
      action={addOfferQuestionAction}
      className="stack-form comment-compose-form"
      ref={formRef}
    >
      <input name="offer_id" type="hidden" value={offerId} />
      <input name="return_to" type="hidden" value={returnTo} />
      <label className="field">
        <span>Ask a public question</span>
        <textarea
          name="body"
          placeholder="For example: What receipt or review would count as sufficient evidence?"
          required
          rows={4}
        />
      </label>
      <div aria-live="polite" className="form-actions">
        <QuestionSubmitButton />
      </div>
    </form>
  );
}
