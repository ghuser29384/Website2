import type { SupabaseClient } from "@supabase/supabase-js";

interface CompletionAgreement {
  id: string;
  proposer_id: string;
  responder_id: string;
  status: string;
  lifecycle_status: string;
  completed_at: string | null;
}

/** Persist the legacy confirmation before allowing any completion side effects. */
export async function persistTradeCompletionConfirmation(
  supabase: SupabaseClient<any>,
  agreementId: string,
  userId: string,
) {
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("id, proposer_id, responder_id, status, lifecycle_status, completed_at")
    .eq("id", agreementId)
    .or(`proposer_id.eq.${userId},responder_id.eq.${userId}`)
    .maybeSingle<CompletionAgreement>();
  if (agreementError) throw new Error(agreementError.message);
  if (!agreement) throw new Error("Agreement not found.");

  // A retry after persistence succeeded must not overwrite completed_at or fail
  // merely because the response was interrupted. The caller reports this
  // neutrally, without attributing a milestone completion to manual confirmations.
  if (agreement.status === "completed" && agreement.lifecycle_status === "completed" && agreement.completed_at) {
    return { agreement, completed: true, alreadyCompleted: true };
  }
  if (!["active", "evidence_due"].includes(agreement.lifecycle_status)) {
    throw new Error("Completion cannot be confirmed in the current state.");
  }
  const { count: acceptedEvidenceCount, error: evidenceError } = await supabase
    .from("trade_evidence_items")
    .select("id", { count: "exact", head: true })
    .eq("agreement_id", agreementId)
    .eq("status", "accepted");
  if (evidenceError) throw new Error(evidenceError.message);
  if ((acceptedEvidenceCount ?? 0) < 1) {
    throw new Error("At least one evidence item must be accepted before completion.");
  }

  const { error: confirmationError } = await supabase.from("trade_completion_confirmations").upsert(
    { agreement_id: agreementId, user_id: userId, confirmed_at: new Date().toISOString() },
    { onConflict: "agreement_id,user_id" },
  );
  if (confirmationError) throw new Error(confirmationError.message);

  const { count, error: countError } = await supabase
    .from("trade_completion_confirmations")
    .select("user_id", { count: "exact", head: true })
    .eq("agreement_id", agreementId)
    .in("user_id", [agreement.proposer_id, agreement.responder_id]);
  if (countError) throw new Error(countError.message);
  if (count === null) throw new Error("Completion confirmations could not be verified. Please retry.");
  if (count < 2) return { agreement, completed: false, alreadyCompleted: false };

  const now = new Date().toISOString();
  const { data: completedAgreement, error: completionError } = await supabase
    .from("agreements")
    .update({
      status: "completed",
      lifecycle_status: "completed",
      completed_at: now,
      updated_at: now,
      public_evidence_updated_at: now,
    })
    .eq("id", agreementId)
    .in("lifecycle_status", ["active", "evidence_due"])
    .select("id")
    .maybeSingle();
  if (completionError) throw new Error(completionError.message);
  if (!completedAgreement) {
    // Another confirmation may have completed the agreement first. Verify that
    // outcome; a concurrent dispute/cancellation is never a successful completion.
    const { data: current, error: currentError } = await supabase
      .from("agreements")
      .select("status, lifecycle_status, completed_at")
      .eq("id", agreementId)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (current?.status !== "completed" || current.lifecycle_status !== "completed" || !current.completed_at) {
      throw new Error("Completion could not be saved in the current state. Please reload and retry.");
    }
  }
  return { agreement, completed: true, alreadyCompleted: false };
}
