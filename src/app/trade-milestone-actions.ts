"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

const EVIDENCE_BUCKET = "trade-evidence";
// Vercel Functions cap request bodies at 4.5 MB. Keep room for multipart
// boundaries and the rest of the evidence form.
const MAX_EVIDENCE_UPLOAD_BYTES = 3 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);
const ALLOWED_ACTION_CATEGORIES = new Set([
  "donation",
  "service",
  "advocacy",
  "research",
  "lifestyle",
  "other",
]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeReturnTo(formData: FormData, agreementId: string) {
  const candidate = read(formData, "return_to");
  return candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : `/trade-agreements/${agreementId}`;
}

function withMessage(path: string, key: "error" | "message", message: string) {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  return `${target.pathname}${target.search}${target.hash}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parsePositiveNumber(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return parsed;
}

function parseMoneyToCents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Maximum amount must use no more than two decimal places.");
  }
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Maximum amount is outside the supported range.");
  }
  return cents;
}

function fileExtension(name: string) {
  return name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0].toLowerCase() ?? "";
}

async function rpcOrThrow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  functionName: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await (supabase as any).rpc(functionName, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function createTradeAgreementMilestoneAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const actionCategory = read(formData, "action_category");
    if (!ALLOWED_ACTION_CATEGORIES.has(actionCategory)) {
      throw new Error("Choose one of the supported public action categories.");
    }
    const completionKind = read(formData, "completion_kind");
    const indivisible = completionKind === "indivisible";
    const targetUnits = indivisible
      ? 1
      : parsePositiveNumber(read(formData, "target_units"), "Target units");
    const currency = read(formData, "currency").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Currency must be a three-letter code.");
    }

    await rpcOrThrow(supabase, "create_trade_agreement_milestone_v1", {
      p_action_category: actionCategory,
      p_agreement_version_id: read(formData, "agreement_version_id"),
      p_currency: currency,
      p_description: read(formData, "private_description"),
      p_evidence_rule: read(formData, "evidence_rule"),
      p_indivisible: indivisible,
      p_maximum_amount_cents: parseMoneyToCents(read(formData, "maximum_amount")),
      p_payer_id: read(formData, "payer_id"),
      p_performer_id: read(formData, "performer_id"),
      p_position: null,
      p_unit_label: read(formData, "unit_label"),
      p_units_total: targetUnits,
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", errorMessage(error, "Milestone could not be added.")));
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Milestone added to the proposed version. Finalize the manifest before either participant confirms it.",
    ),
  );
}

export async function finalizeTradeMilestoneManifestAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "finalize_trade_milestone_manifest_v1", {
      p_agreement_version_id: read(formData, "agreement_version_id"),
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", errorMessage(error, "Milestone terms could not be frozen.")));
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Milestone terms and payout rules are frozen. Both participants may now review and confirm this exact version.",
    ),
  );
}

export async function startTradeMilestoneAmendmentAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "start_trade_milestone_amendment_v1", {
      p_agreement_id: agreementId,
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "A fresh milestone version could not be started."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "A fresh proposed version is ready. Define and finalize its milestones; earlier confirmations do not carry forward.",
    ),
  );
}

export async function submitTradeEvidenceBundleAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    if (read(formData, "bundle_complete") !== "true") {
      throw new Error("Confirm that this is the complete evidence packet for this attempt.");
    }
    const bundleKind =
      read(formData, "submission_kind") === "replacement" ? "replacement" : "initial";
    const bundleId = String(
      await rpcOrThrow(supabase, "open_trade_evidence_bundle_v1", {
        p_bundle_kind: bundleKind,
        p_milestone_id: milestoneId,
      }),
    );
    const files = formData
      .getAll("evidence_files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.reduce((total, file) => total + file.size, 0) > MAX_EVIDENCE_UPLOAD_BYTES) {
      throw new Error("Private evidence files must be 3 MB or smaller in total.");
    }

    for (const file of files) {
      if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) {
        throw new Error("An evidence file has an unsupported type.");
      }
      const storagePath = `${viewer.authUser.id}/${milestoneId}/${bundleId}/${randomUUID()}${fileExtension(file.name)}`;
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      try {
        await rpcOrThrow(supabase, "add_trade_evidence_bundle_item_v1", {
          p_attestation: "",
          p_bundle_id: bundleId,
          p_evidence_type: "file",
          p_evidence_url: "",
          p_storage_path: storagePath,
        });
      } catch (error) {
        await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
        throw error;
      }
    }

    const evidenceUrl = read(formData, "evidence_url");
    if (evidenceUrl) {
      const url = new URL(evidenceUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Evidence links must use http or https.");
      }
      await rpcOrThrow(supabase, "add_trade_evidence_bundle_item_v1", {
        p_attestation: "",
        p_bundle_id: bundleId,
        p_evidence_type: "link",
        p_evidence_url: evidenceUrl,
        p_storage_path: "",
      });
    }

    const attestation = read(formData, "attestation");
    if (attestation) {
      await rpcOrThrow(supabase, "add_trade_evidence_bundle_item_v1", {
        p_attestation: attestation,
        p_bundle_id: bundleId,
        p_evidence_type: "attestation",
        p_evidence_url: "",
        p_storage_path: "",
      });
    }

    await rpcOrThrow(supabase, "submit_trade_evidence_bundle_v1", {
      p_bundle_id: bundleId,
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "Evidence packet could not be submitted.")),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Private evidence packet submitted for neutral review. No source file was published.",
    ),
  );
}

export async function nominateTradeMilestoneReviewerAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "nominate_trade_milestone_reviewer_v1", {
      p_milestone_id: read(formData, "milestone_id"),
      p_reviewer_id: read(formData, "reviewer_id"),
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "Reviewer nomination could not be recorded.")),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Reviewer nomination recorded. Assignment occurs only if both participants choose the same eligible reviewer.",
    ),
  );
}

export async function submitNeutralTradeMilestoneReviewAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const confidenceBand = Number(read(formData, "confidence_band"));
    if (![0, 25, 50, 75, 100].includes(confidenceBand)) {
      throw new Error("Choose one of the five fixed confidence bands.");
    }
    const completedUnits = Number(read(formData, "completed_units"));
    if (!Number.isFinite(completedUnits) || completedUnits < 0) {
      throw new Error("Completed units must be zero or greater.");
    }
    const { data: milestone, error } = await (supabase as any)
      .from("trade_agreement_milestones")
      .select("current_bundle_id")
      .eq("id", milestoneId)
      .maybeSingle();
    if (error || !milestone?.current_bundle_id) {
      throw new Error("The current evidence packet is unavailable.");
    }

    await rpcOrThrow(supabase, "grade_trade_milestone_v1", {
      p_bundle_id: String(milestone.current_bundle_id),
      p_completion_units: completedUnits,
      p_confidence_band: confidenceBand,
      p_milestone_id: milestoneId,
      p_outcome: confidenceBand === 0 ? "rejected" : "graded",
      p_private_reason: read(formData, "review_rationale"),
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "Neutral review could not be recorded.")),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Neutral review recorded with the fixed confidence band. The result remains provisional during the appeal window.",
    ),
  );
}

export async function finalizeTradeMilestoneReviewAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "finalize_trade_milestone_review_v1", {
      p_milestone_id: read(formData, "milestone_id"),
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "The review is not ready for finality.")),
    );
  }

  revalidatePath(returnTo);
  revalidatePath("/evidence");
  redirect(
    withMessage(
      returnTo,
      "message",
      "The unappealed review is final. Moral Trade now records the external amount as due or not due.",
    ),
  );
}

export async function requestTradeMilestoneAppealAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "open_trade_milestone_appeal_v1", {
      p_milestone_id: read(formData, "milestone_id"),
      p_reason: read(formData, "appeal_reason"),
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", errorMessage(error, "Appeal could not be opened.")));
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "The single appeal is open. The replacement clock is paused while a different neutral reviewer is selected.",
    ),
  );
}

export async function nominateTradeAppealReviewerAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "nominate_trade_appeal_reviewer_v1", {
      p_appeal_id: read(formData, "appeal_id"),
      p_reviewer_id: read(formData, "reviewer_id"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "Appeal-reviewer nomination could not be recorded."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Appeal-reviewer nomination recorded. The appeal requires a different reviewer chosen by both participants or the post-deadline administrator fallback.",
    ),
  );
}

export async function reportTradeExternalPaymentAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    if (read(formData, "payment_attested") !== "true") {
      throw new Error("Confirm that the final amount was sent through the named external method.");
    }
    const { data: payout, error } = await (supabase as any)
      .from("trade_milestone_payouts")
      .select("id,amount_due_cents,currency,status,is_final")
      .eq("milestone_id", milestoneId)
      .maybeSingle();
    if (
      error ||
      !payout?.id ||
      !payout.is_final ||
      !["due", "still_due", "correction_due"].includes(String(payout.status))
    ) {
      throw new Error("No final external amount is due for this milestone.");
    }

    const providerReference = read(formData, "external_reference");
    if (!providerReference) {
      throw new Error("Enter the external transaction or confirmation reference.");
    }

    let receiptStoragePath = "";
    const receiptFile = formData.get("receipt_file");
    if (receiptFile instanceof File && receiptFile.size > 0) {
      if (receiptFile.size > MAX_EVIDENCE_UPLOAD_BYTES) {
        throw new Error("The private receipt must be 3 MB or smaller.");
      }
      if (!ALLOWED_EVIDENCE_TYPES.has(receiptFile.type)) {
        throw new Error("The private receipt has an unsupported file type.");
      }
      receiptStoragePath = `${viewer.authUser.id}/${milestoneId}/payment/${randomUUID()}${fileExtension(receiptFile.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(receiptStoragePath, receiptFile, {
          contentType: receiptFile.type,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
    }

    try {
      await rpcOrThrow(supabase, "report_trade_external_payment_v1", {
        p_amount_cents: Number(payout.amount_due_cents),
        p_currency: String(payout.currency),
        p_paid_on: read(formData, "paid_at"),
        p_payout_id: String(payout.id),
        p_provider: read(formData, "payment_provider"),
        p_provider_reference: providerReference,
        p_receipt_storage_path: receiptStoragePath,
      });
    } catch (error) {
      if (receiptStoragePath) {
        await supabase.storage.from(EVIDENCE_BUCKET).remove([receiptStoragePath]);
      }
      throw error;
    }
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "External payment could not be recorded."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "External payment reported privately. The payee has seven days to confirm or dispute the receipt.",
    ),
  );
}

export async function respondTradeExternalPaymentAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const response = read(formData, "payment_response") === "dispute" ? "dispute" : "confirm";
    const { data: payout, error: payoutError } = await (supabase as any)
      .from("trade_milestone_payouts")
      .select("id")
      .eq("milestone_id", milestoneId)
      .maybeSingle();
    if (payoutError || !payout?.id) {
      throw new Error("External payment record is unavailable.");
    }
    const { data: receipt, error: receiptError } = await (supabase as any)
      .from("trade_external_payment_receipts")
      .select("id")
      .eq("payout_id", payout.id)
      .eq("status", "reported")
      .order("payment_cycle", { ascending: false })
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (receiptError || !receipt?.id) {
      throw new Error("No external payment report is awaiting a response.");
    }
    const note = read(formData, "confirmation_note");
    if (response === "dispute" && !note) {
      throw new Error("Explain the payment discrepancy before disputing the receipt.");
    }

    await rpcOrThrow(supabase, "respond_trade_external_payment_v1", {
      p_note: note,
      p_receipt_id: String(receipt.id),
      p_response: response,
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "External payment response could not be recorded."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      read(formData, "payment_response") === "dispute"
        ? "External payment marked disputed. The private receipt and history remain available for resolution."
        : "External payment confirmed. Moral Trade recorded the receipt without moving funds.",
    ),
  );
}

export async function nominateTradePaymentReviewerAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "nominate_trade_payment_reviewer_v1", {
      p_payout_id: read(formData, "payout_id"),
      p_reviewer_id: read(formData, "reviewer_id"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "Payment-reviewer nomination could not be recorded."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Payment-reviewer nomination recorded. Assignment requires both participants to choose the same eligible reviewer.",
    ),
  );
}

export async function finalizeTradePaymentReviewAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "finalize_trade_payment_review_v1", {
      p_case_id: read(formData, "payment_case_id"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "The payment decision is not ready for finality."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "The unappealed external-payment decision is final. The agreement completion state was recomputed atomically.",
    ),
  );
}

export async function requestTradePaymentAppealAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "open_trade_payment_appeal_v1", {
      p_case_id: read(formData, "payment_case_id"),
      p_reason: read(formData, "payment_appeal_reason"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "The single payment appeal could not be opened."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "The single payment appeal is open and requires a different neutral reviewer.",
    ),
  );
}

export async function nominateTradePaymentAppealReviewerAction(
  formData: FormData,
) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(
      supabase,
      "nominate_trade_payment_appeal_reviewer_v1",
      {
        p_appeal_id: read(formData, "payment_appeal_id"),
        p_reviewer_id: read(formData, "reviewer_id"),
      },
    );
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(
          error,
          "Payment-appeal reviewer nomination could not be recorded.",
        ),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Payment-appeal reviewer nomination recorded. The reviewer must differ from the original payment reviewer.",
    ),
  );
}

export async function resolveTradePaymentReviewAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const outcome = read(formData, "payment_review_outcome");
    if (!["confirm_paid", "still_due", "allow_correction"].includes(outcome)) {
      throw new Error("Choose one of the permitted payment-review decisions.");
    }
    await rpcOrThrow(supabase, "resolve_trade_payment_review_v1", {
      p_case_id: read(formData, "payment_case_id"),
      p_outcome: outcome,
      p_private_reason: read(formData, "payment_review_rationale"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "The external-payment review could not be decided."),
      ),
    );
  }

  revalidatePath(`/trade-review/${milestoneId}`);
  revalidatePath(`/trade-agreements/${agreementId}`);
  redirect(
    withMessage(
      returnTo,
      "message",
      "External-payment review recorded. A paid/still-due decision remains provisional for seven days; correction permission is not appealable.",
    ),
  );
}

export async function resolveTradePaymentAppealAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const outcome = read(formData, "payment_appeal_outcome");
    if (!["confirm_paid", "still_due"].includes(outcome)) {
      throw new Error("Choose paid or still due.");
    }
    await rpcOrThrow(supabase, "resolve_trade_payment_appeal_v1", {
      p_appeal_id: read(formData, "payment_appeal_id"),
      p_outcome: outcome,
      p_private_reason: read(formData, "payment_review_rationale"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "The external-payment appeal could not be decided."),
      ),
    );
  }

  revalidatePath(`/trade-review/${milestoneId}`);
  revalidatePath(`/trade-agreements/${agreementId}`);
  redirect(
    withMessage(
      returnTo,
      "message",
      "The different neutral reviewer recorded the final external-payment decision.",
    ),
  );
}

export async function resolveTradeMilestoneAppealAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, agreementId);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const resolution = read(formData, "appeal_resolution");
    const confidenceBand = Number(read(formData, "confidence_band"));
    if (![0, 25, 50, 75, 100].includes(confidenceBand)) {
      throw new Error("Choose one of the five fixed confidence bands.");
    }
    const completedUnits = Number(read(formData, "completed_units"));
    if (!Number.isFinite(completedUnits) || completedUnits < 0) {
      throw new Error("Completed units must be zero or greater.");
    }
    await rpcOrThrow(supabase, "resolve_trade_milestone_appeal_v1", {
      p_appeal_id: read(formData, "appeal_id"),
      p_completion_units: completedUnits,
      p_confidence_band: confidenceBand,
      p_outcome:
        resolution === "upheld"
          ? "upheld"
          : confidenceBand === 0
            ? "rejected"
            : "regraded",
      p_private_reason: read(formData, "review_rationale"),
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "Appeal decision could not be recorded.")),
    );
  }

  revalidatePath(`/trade-review/${milestoneId}`);
  revalidatePath(`/trade-agreements/${agreementId}`);
  revalidatePath("/evidence");
  redirect(
    withMessage(
      returnTo,
      "message",
      "The appeal decision is final. Any external amount is now recorded as due or not due; Moral Trade did not move funds.",
    ),
  );
}

export async function adminAssignTradeMilestoneReviewerAction(formData: FormData) {
  const milestoneId = read(formData, "milestone_id");
  const returnTo = safeReturnTo(formData, "");
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "admin_assign_trade_milestone_reviewer_v1", {
      p_milestone_id: milestoneId,
      p_reviewer_id: read(formData, "reviewer_id"),
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "Reviewer could not be assigned.")),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Neutral reviewer assigned after the seven-day participant-selection deadline.",
    ),
  );
}

export async function adminAssignTradeAppealReviewerAction(formData: FormData) {
  const returnTo = safeReturnTo(formData, "");
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "admin_assign_trade_appeal_reviewer_v1", {
      p_appeal_id: read(formData, "appeal_id"),
      p_reviewer_id: read(formData, "reviewer_id"),
    });
  } catch (error) {
    redirect(
      withMessage(returnTo, "error", errorMessage(error, "Appeal reviewer could not be assigned.")),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Different appeal reviewer assigned after the seven-day participant-selection deadline.",
    ),
  );
}

export async function adminAssignTradePaymentReviewerAction(
  formData: FormData,
) {
  const returnTo = safeReturnTo(formData, "");
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(supabase, "admin_assign_trade_payment_reviewer_v1", {
      p_payout_id: read(formData, "payout_id"),
      p_reviewer_id: read(formData, "reviewer_id"),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "Payment reviewer could not be assigned."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Neutral payment reviewer assigned after the seven-day participant-selection deadline.",
    ),
  );
}

export async function adminAssignTradePaymentAppealReviewerAction(
  formData: FormData,
) {
  const returnTo = safeReturnTo(formData, "");
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    await rpcOrThrow(
      supabase,
      "admin_assign_trade_payment_appeal_reviewer_v1",
      {
        p_appeal_id: read(formData, "payment_appeal_id"),
        p_reviewer_id: read(formData, "reviewer_id"),
      },
    );
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "Payment-appeal reviewer could not be assigned."),
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Different payment-appeal reviewer assigned after the seven-day selection deadline.",
    ),
  );
}
