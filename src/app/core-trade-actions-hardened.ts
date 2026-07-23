"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_TEXT_LENGTH = 5_000;
const MAX_MESSAGE_LENGTH = 4_000;
const EVIDENCE_BUCKET = "trade-evidence";

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptional(formData: FormData, key: string) {
  const value = read(formData, key);
  return value || null;
}

function readCheckbox(formData: FormData, key: string) {
  return ["1", "on", "true", "yes"].includes(read(formData, key).toLowerCase());
}

function safePath(path: string, fallback: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

function redirectWithMessage(path: string, key: "error" | "message", message: string): never {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  redirect(`${target.pathname}${target.search}${target.hash}`);
}

function rpcRow<T extends Record<string, unknown>>(data: unknown): T {
  if (Array.isArray(data)) {
    return (data[0] ?? {}) as T;
  }
  return (data ?? {}) as T;
}

async function callCoreRpc<T extends Record<string, unknown>>(
  name: string,
  params: Record<string, unknown>,
) {
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc(name, params);
  if (error) {
    throw new Error(error.message);
  }
  return rpcRow<T>(data);
}

function bounded(value: string, label: string, maxLength = MAX_TEXT_LENGTH) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} is too long.`);
  }
  return value;
}

function termsFrom(formData: FormData) {
  return {
    p_duration: bounded(read(formData, "duration"), "Duration"),
    p_evidence_due_date: readOptional(formData, "evidence_due_date"),
    p_evidence_rule: bounded(read(formData, "evidence_rule"), "Evidence rule"),
    p_exit_conditions: bounded(read(formData, "exit_conditions"), "Exit conditions"),
    p_maximum_burden: bounded(read(formData, "maximum_burden"), "Commitment limit"),
    p_no_trade_baseline: bounded(read(formData, "no_trade_baseline"), "No-trade baseline"),
    p_privacy_scope: bounded(read(formData, "privacy_scope"), "Privacy scope"),
    p_proposed_action: bounded(read(formData, "proposed_action"), "Offer-maker action"),
    p_requested_action: bounded(read(formData, "requested_action"), "Counterparty action"),
    p_start_date: readOptional(formData, "start_date"),
  };
}

export async function sendTradeMessageAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);

  try {
    await callCoreRpc("send_trade_message_v3", {
      p_actor_id: viewer.authUser.id,
      p_body: bounded(read(formData, "body"), "Message", MAX_MESSAGE_LENGTH),
      p_submission_key: read(formData, "submission_key") || randomUUID(),
      p_thread_id: threadId,
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Message failed.");
  }

  revalidatePath(returnTo);
  redirectWithMessage(returnTo, "message", "Message sent.");
}

export async function createCounterproposalAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);

  try {
    const result = await callCoreRpc<{ version?: number }>("create_counterproposal_v3", {
      p_actor_id: viewer.authUser.id,
      p_submission_key: read(formData, "submission_key") || randomUUID(),
      p_thread_id: threadId,
      ...termsFrom(formData),
    });
    revalidatePath(returnTo);
    redirectWithMessage(
      returnTo,
      "message",
      `Counterproposal v${Number(result.version ?? 1)} sent.`,
    );
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Counterproposal failed.",
    );
  }
}

export async function withdrawTradeResponseAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);

  try {
    await callCoreRpc("withdraw_trade_response_v3", {
      p_actor_id: viewer.authUser.id,
      p_interest_id: readOptional(formData, "interest_id"),
      p_thread_id: threadId,
    });
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Withdrawal failed.",
    );
  }

  revalidatePath("/messages");
  redirectWithMessage("/messages", "message", "Response withdrawn and thread closed.");
}

export async function proposeAgreementAmendmentAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);

  try {
    const result = await callCoreRpc<{ version?: number }>("propose_agreement_version_v3", {
      p_actor_id: viewer.authUser.id,
      p_agreement_id: agreementId,
      p_submission_key: read(formData, "submission_key") || randomUUID(),
      ...termsFrom(formData),
    });
    revalidatePath(returnTo);
    redirectWithMessage(
      returnTo,
      "message",
      `Amendment v${Number(result.version ?? 1)} proposed. Prior confirmations do not carry forward.`,
    );
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Amendment failed.",
    );
  }
}

export async function declineProposedAgreementAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);

  try {
    await callCoreRpc("decline_proposed_agreement_v3", {
      p_actor_id: viewer.authUser.id,
      p_agreement_id: agreementId,
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Decline failed.");
  }

  revalidatePath(returnTo);
  redirectWithMessage(returnTo, "message", "Agreement declined before activation.");
}

function evidenceExtension(file: File) {
  return file.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0].toLowerCase() ?? "";
}

function validateEvidenceFile(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Evidence files must be 10 MB or smaller.");
  }
  const allowedTypes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
  ]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Unsupported evidence file type.");
  }
}

export async function submitTradeEvidenceAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  const file = formData.get("evidence_file");
  const evidenceUrl = read(formData, "evidence_url");
  const attestation = read(formData, "attestation").slice(0, MAX_TEXT_LENGTH);
  let evidenceType: "attestation" | "file" | "link";
  let storagePath = "";

  try {
    if (file instanceof File && file.size > 0) {
      validateEvidenceFile(file);
      evidenceType = "file";
      storagePath = `${agreementId}/${viewer.authUser.id}/private/${randomUUID()}-private-evidence${evidenceExtension(file)}`;
      const upload = await supabase.storage.from(EVIDENCE_BUCKET).upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upload.error) {
        throw new Error(upload.error.message);
      }
    } else if (evidenceUrl) {
      const parsed = new URL(evidenceUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error("Evidence link must use http or https.");
      }
      evidenceType = "link";
    } else if (attestation) {
      evidenceType = "attestation";
    } else {
      throw new Error("Upload a file, provide an evidence link, or write an attestation.");
    }

    await callCoreRpc("register_trade_evidence_v3", {
      p_actor_id: viewer.authUser.id,
      p_agreement_id: agreementId,
      p_attestation: attestation,
      p_evidence_type: evidenceType,
      p_evidence_url: evidenceUrl,
      p_replaces_evidence_id: readOptional(formData, "replaces_evidence_id"),
      p_storage_path: storagePath,
      p_submission_key: read(formData, "submission_key") || randomUUID(),
    });
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]).catch(() => undefined);
    }
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Evidence submission failed.",
    );
  }

  revalidatePath(returnTo);
  revalidatePath(`/evidence/${agreementId}`);
  redirectWithMessage(
    returnTo,
    "message",
    "Evidence submitted privately. The other participant can review it; public release requires a separate redacted copy.",
  );
}

export async function publishTradeEvidenceAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const evidenceId = read(formData, "evidence_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  const publicFile = formData.get("public_evidence_file");
  let publicStoragePath = "";
  let publicFilename = "";
  let publicMimeType = "";

  try {
    if (!readCheckbox(formData, "publication_certification")) {
      throw new Error("Confirm that the public copy is redacted and safe to publish.");
    }

    if (publicFile instanceof File && publicFile.size > 0) {
      validateEvidenceFile(publicFile);
      publicFilename = `public-evidence${evidenceExtension(publicFile)}`;
      publicMimeType = publicFile.type;
      publicStoragePath = `${agreementId}/${viewer.authUser.id}/public/${randomUUID()}-${publicFilename}`;
      const upload = await supabase.storage.from(EVIDENCE_BUCKET).upload(
        publicStoragePath,
        publicFile,
        { contentType: publicFile.type, upsert: false },
      );
      if (upload.error) {
        throw new Error(upload.error.message);
      }
    }

    await callCoreRpc("publish_trade_evidence_v3", {
      p_actor_id: viewer.authUser.id,
      p_evidence_id: evidenceId,
      p_public_mime_type: publicMimeType,
      p_public_original_filename: publicFilename,
      p_public_redaction_note: bounded(
        read(formData, "public_redaction_note"),
        "Redaction note",
        2_000,
      ),
      p_public_storage_path: publicStoragePath,
      p_public_summary: read(formData, "public_summary").slice(0, MAX_TEXT_LENGTH),
      p_public_title: read(formData, "public_title").slice(0, 300),
      p_public_url: read(formData, "public_url"),
    });
  } catch (error) {
    if (publicStoragePath) {
      await supabase.storage.from(EVIDENCE_BUCKET).remove([publicStoragePath]).catch(() => undefined);
    }
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Evidence publication failed.",
    );
  }

  revalidatePath(returnTo);
  revalidatePath("/evidence");
  revalidatePath(`/evidence/${agreementId}`);
  redirectWithMessage(returnTo, "message", "The separate redacted evidence copy is public.");
}

export async function reviewTradeEvidenceAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safePath(read(formData, "return_to"), `/trade-agreements/${agreementId}`);
  const viewer = await requireViewer(returnTo);

  try {
    const decision = read(formData, "decision");
    await callCoreRpc("review_trade_evidence_v3", {
      p_actor_id: viewer.authUser.id,
      p_challenge_reason:
        decision === "challenge"
          ? bounded(read(formData, "challenge_reason"), "Challenge reason", MAX_MESSAGE_LENGTH)
          : "",
      p_decision: decision,
      p_evidence_id: read(formData, "evidence_id"),
    });
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Evidence review failed.",
    );
  }

  revalidatePath(returnTo);
  revalidatePath(`/evidence/${agreementId}`);
  redirectWithMessage(
    returnTo,
    "message",
    read(formData, "decision") === "accept"
      ? "Evidence accepted."
      : "Evidence challenged and agreement marked disputed.",
  );
}

export async function withdrawTradeEvidenceAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);

  try {
    await callCoreRpc("withdraw_trade_evidence_v3", {
      p_actor_id: viewer.authUser.id,
      p_evidence_id: read(formData, "evidence_id"),
      p_reason: read(formData, "reason").slice(0, MAX_MESSAGE_LENGTH),
    });
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Evidence withdrawal failed.",
    );
  }

  revalidatePath(returnTo);
  revalidatePath("/evidence");
  revalidatePath(`/evidence/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Evidence withdrawn. The activity record remains.");
}

export async function confirmTradeCompletionAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);

  try {
    const result = await callCoreRpc<{ completed?: boolean }>("confirm_trade_completion_v3", {
      p_actor_id: viewer.authUser.id,
      p_agreement_id: agreementId,
    });
    revalidatePath(returnTo);
    revalidatePath(`/evidence/${agreementId}`);
    redirectWithMessage(
      returnTo,
      "message",
      result.completed
        ? "Both participants confirmed completion. Final Deal Receipt generated."
        : "Your completion confirmation was recorded.",
    );
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Completion confirmation failed.",
    );
  }
}

export async function requestAgreementExitAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);

  try {
    const result = await callCoreRpc<{ lifecycleStatus?: string }>("request_trade_exit_v3", {
      p_actor_id: viewer.authUser.id,
      p_agreement_id: agreementId,
      p_reason: bounded(read(formData, "reason"), "Exit reason", MAX_MESSAGE_LENGTH),
      p_request_type: read(formData, "request_type"),
    });
    revalidatePath(returnTo);
    redirectWithMessage(
      returnTo,
      "message",
      result.lifecycleStatus === "cancelled"
        ? "Unilateral exit executed. Future obligations ended."
        : "Mutual cancellation requested.",
    );
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Exit failed.");
  }
}

export async function respondAgreementExitAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);

  try {
    const decision = read(formData, "decision");
    await callCoreRpc("respond_trade_exit_v3", {
      p_actor_id: viewer.authUser.id,
      p_decision: decision,
      p_request_id: read(formData, "request_id"),
    });
    revalidatePath(returnTo);
    redirectWithMessage(
      returnTo,
      "message",
      decision === "accept" ? "Mutual cancellation accepted." : "Mutual cancellation declined.",
    );
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Cancellation decision failed.",
    );
  }
}
