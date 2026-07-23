import { getCommandCapability, validateCommandCapabilityArguments } from "@/lib/command/capabilities";
import { COMMAND_MIN_TOOL_CONFIDENCE } from "@/lib/command/planner";
import { COMMAND_TRADE_HANDOFF_KEY, COMMAND_TRADE_HANDOFF_VERSION } from "@/lib/command/trade-parser";
import type { CommandToolProposal, CommandToolResult } from "@/lib/command/types";
import { listAgreementsForUser } from "@/lib/app-data";
import { filterSiteSearchItems } from "@/lib/site-search";
import { createClient } from "@/lib/supabase/server";

function result(
  status: CommandToolResult["status"],
  summary: string,
  stateClaim: string,
  options: Partial<CommandToolResult> = {},
): CommandToolResult {
  return {
    ok: !["blocked", "failed"].includes(status),
    status,
    summary,
    stateClaim,
    links: options.links ?? [],
    data: options.data ?? {},
    blockers: options.blockers ?? [],
  };
}

function text(value: unknown, max = 5_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function id(value: unknown) {
  const normalized = text(value, 120);
  return normalized || null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const MAX_SAFE_FUNDING_CENTS = Number.MAX_SAFE_INTEGER;

function safeOfferQuery(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

function tradeHandoff(argumentsValue: Record<string, unknown>) {
  const fields = [
    "offeredCause",
    "requestedCause",
    "proposedAction",
    "requestedAction",
    "noTradeBaseline",
    "duration",
    "evidenceRule",
    "exitConditions",
  ] as const;
  const values = Object.fromEntries(fields.map((field) => [field, text(argumentsValue[field])])) as Record<
    string,
    string
  >;
  return {
    key: COMMAND_TRADE_HANDOFF_KEY,
    value: {
      version: COMMAND_TRADE_HANDOFF_VERSION,
      source: "command-center",
      createdAt: Date.now(),
      values: {
        ...values,
        startDate: "",
        evidenceDueDate: "",
        notes: "",
      },
      reviewFields: [
        ...(!values.noTradeBaseline ? ["no-trade baseline"] : []),
        "deadline",
        ...(!values.evidenceRule ? ["evidence"] : []),
      ],
    },
  };
}

async function executeSearchOffers(argumentsValue: Record<string, unknown>) {
  const supabase = await createClient();
  const queryText = safeOfferQuery(text(argumentsValue.query, 160));
  const mode = ["pledge", "payment", "offset"].includes(text(argumentsValue.mode, 20))
    ? text(argumentsValue.mode, 20)
    : null;
  const limitValue = Math.min(8, Math.max(1, number(argumentsValue.limit) ?? 8));
  let query = supabase.from("offers").select("id,owner_alias,mode,offered_cause,requested_cause,offer_action,request_action,duration,status,created_at").eq("status", "open");
  if (mode) query = query.eq("mode", mode as "pledge" | "payment" | "offset");
  if (queryText) {
    const pattern = `%${queryText}%`;
    query = query.or(
      [
        `offered_cause.ilike.${pattern}`,
        `requested_cause.ilike.${pattern}`,
        `offer_action.ilike.${pattern}`,
        `request_action.ilike.${pattern}`,
        `duration.ilike.${pattern}`,
        `owner_alias.ilike.${pattern}`,
      ].join(","),
    );
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limitValue);
  if (error) {
    return result(
      "failed",
      "The live proposal directory could not be searched.",
      "No proposal state changed.",
      { blockers: [error.message] },
    );
  }
  const rows = data ?? [];
  return result(
    "completed",
    rows.length
      ? `Found ${rows.length} open proposal${rows.length === 1 ? "" : "s"}.`
      : "No open proposal matched that search.",
    "Search completed. No interest, invitation, counteroffer, or agreement was created.",
    {
      links: rows.map((row) => ({
        href: `/offers/${row.id}`,
        label: `${row.offered_cause} ↔ ${row.requested_cause}`,
        description: `${row.offer_action} In return: ${row.request_action}`,
        recordId: row.id,
        recordType: "offer",
      })),
      data: { count: rows.length, query: queryText, mode },
    },
  );
}

async function executeReviewCommitments(profileId: string, argumentsValue: Record<string, unknown>) {
  const limitValue = Math.min(8, Math.max(1, number(argumentsValue.limit) ?? 8));
  try {
    const agreements = (await listAgreementsForUser(profileId)).slice(0, limitValue);
    return result(
      "completed",
      agreements.length
        ? `Found ${agreements.length} agreement record${agreements.length === 1 ? "" : "s"}.`
        : "No agreement records are currently associated with this account.",
      "Agreement statuses were read from the authoritative participant records. No status changed.",
      {
        links: agreements.map((agreement) => ({
          href: `/agreements/${agreement.id}`,
          label: `${agreement.status} · ${agreement.completion_state.replaceAll("_", " ")}`,
          description:
            agreement.offer
              ? `${agreement.offer.offered_cause} ↔ ${agreement.offer.requested_cause}`
              : agreement.structured_terms || "Manual agreement",
          recordId: agreement.id,
          recordType: "agreement",
        })),
        data: {
          count: agreements.length,
          statuses: agreements.map((agreement) => ({
            id: agreement.id,
            status: agreement.status,
            completionState: agreement.completion_state,
          })),
        },
      },
    );
  } catch (error) {
    return result(
      "failed",
      "Your commitment records could not be loaded.",
      "No agreement status changed.",
      { blockers: [error instanceof Error ? error.message : "Unknown agreement read error."] },
    );
  }
}

function explanationFor(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("no-trade") || lower.includes("baseline")) {
    return {
      summary:
        "The no-trade baseline records what each participant would actually do if no agreement forms. Proposed terms should be compared with that default, not with an invented worse outcome.",
      href: "/trade-controls",
      label: "Review counterfactual-integrity controls",
    };
  }
  if (lower.includes("public good") || lower.includes("assurance") || lower.includes("threshold")) {
    return {
      summary:
        "A conditional public-good proposal activates only under its published threshold and fallback rules. An intention or draft is not funded coordination, and free-rider incentives remain relevant until the authoritative mechanism records activation.",
      href: "/pools",
      label: "Review conditional pools",
    };
  }
  if (lower.includes("evidence")) {
    return {
      summary:
        "Evidence is attached to one frozen agreement version and supports a specific claim. Submission is not acceptance, independent verification, completion, or settlement; those states are recorded separately.",
      href: "/evidence",
      label: "Open Evidence",
    };
  }
  return {
    summary:
      "Moral trade uses differences in moral priorities to find voluntary terms that each participant prefers to the no-trade default. Exact commitments, evidence, limits, privacy, exit conditions, and separate confirmation remain explicit.",
    href: "/what-is-moral-trade",
    label: "Read What is Moral Trade?",
  };
}


async function buildConfirmationPreview(
  profileId: string,
  capabilityKey: string,
  argumentsValue: Record<string, unknown>,
): Promise<CommandToolResult> {
  const capability = getCommandCapability(capabilityKey);
  if (!capability) {
    return result("failed", "Unknown Command capability.", "No action was taken.");
  }
  const previewData: Record<string, unknown> = { previewOnly: true };
  const offerId = id(argumentsValue.offerId);
  const agreementId = id(argumentsValue.agreementId);

  try {
    const supabase = await createClient();
    if (capabilityKey === "create_counteroffer") {
      if (agreementId) {
        const { data } = await supabase
          .from("agreements")
          .select("id,structured_terms,no_trade_baseline,duration_terms,evidence_rule,exit_conditions,status")
          .eq("id", agreementId)
          .or(`proposer_id.eq.${profileId},responder_id.eq.${profileId}`)
          .maybeSingle();
        if (data) {
          previewData.diff = {
            before: [
              data.structured_terms,
              data.duration_terms,
              data.evidence_rule,
              data.exit_conditions,
            ].filter(Boolean).join(" · "),
            after: text(argumentsValue.requestedChanges, 2_000),
          };
          previewData.target = { id: data.id, type: "agreement", status: data.status };
        }
      } else if (offerId) {
        const { data } = await supabase
          .from("offers")
          .select("id,offered_cause,requested_cause,offer_action,request_action,duration,verification,status")
          .eq("id", offerId)
          .maybeSingle();
        if (data) {
          previewData.diff = {
            before: `${data.offer_action} ↔ ${data.request_action} · ${data.duration} · ${data.verification}`,
            after: text(argumentsValue.requestedChanges, 2_000),
          };
          previewData.target = { id: data.id, type: "offer", status: data.status };
        }
      }
    }

    if (capabilityKey === "send_invitation" && offerId) {
      const { data } = await supabase
        .from("offers")
        .select("id,owner_id,offered_cause,requested_cause,offer_action,request_action,status")
        .eq("id", offerId)
        .eq("owner_id", profileId)
        .maybeSingle();
      if (data) {
        previewData.target = {
          id: data.id,
          type: "offer",
          status: data.status,
          terms: `${data.offer_action} ↔ ${data.request_action}`,
        };
      }
    }

    if (["submit_evidence", "authorize_payment", "cancel_or_refund_payment"].includes(capabilityKey) && agreementId) {
      const { data } = await supabase
        .from("agreements")
        .select("id,status,completion_state,evidence_rule,privacy_scope")
        .eq("id", agreementId)
        .or(`proposer_id.eq.${profileId},responder_id.eq.${profileId}`)
        .maybeSingle();
      if (data) {
        previewData.target = {
          id: data.id,
          type: "agreement",
          status: data.status,
          completionState: data.completion_state,
          evidenceRule: data.evidence_rule,
          privacyScope: data.privacy_scope,
        };
      }
    }
  } catch (error) {
    previewData.previewWarning =
      error instanceof Error ? error.message : "Authoritative target preview is unavailable.";
  }

  return result(
    "awaiting_confirmation",
    `Review ${capability.title.toLowerCase()} before continuing.`,
    "Nothing has been sent, disclosed, authorized, charged, cancelled, refunded, or otherwise changed.",
    { data: previewData },
  );
}

export async function executeCommandProposal({
  profileId,
  proposal,
}: {
  profileId: string;
  proposal: CommandToolProposal;
}): Promise<CommandToolResult> {
  const capability = getCommandCapability(proposal.capabilityKey);
  if (!capability) {
    return result("failed", "Unknown Command capability.", "No action was taken.", {
      blockers: ["Capability is not registered."],
    });
  }
  if (proposal.confidence < COMMAND_MIN_TOOL_CONFIDENCE) {
    return result("blocked", "The proposed action is below the 90% confidence threshold.", "No action was taken.", {
      blockers: ["Clarification is required before this tool can run."],
    });
  }
  const validation = validateCommandCapabilityArguments(capability.key, proposal.arguments);
  if (!validation.ok) {
    return result("failed", "The proposed action did not pass its typed input schema.", "No action was taken.", {
      blockers: validation.errors,
    });
  }
  if (capability.executionMode === "blocked") {
    return result("blocked", "This request is prohibited or unauthorized.", "No action was taken.", {
      blockers: [proposal.rationale || "The capability is blocked by policy."],
    });
  }
  if (capability.executionMode === "confirmed_handoff" || capability.executionMode === "strong_confirmed_handoff") {
    return buildConfirmationPreview(profileId, capability.key, proposal.arguments);
  }

  switch (capability.key) {
    case "navigate":
    case "search_site": {
      const query = text(proposal.arguments.query, 160);
      const matches = filterSiteSearchItems(query, capability.key === "navigate" ? 1 : 7);
      return result(
        "completed",
        matches.length ? `Found ${matches.length} matching Moral Trade workspace${matches.length === 1 ? "" : "s"}.` : "No matching workspace was found.",
        "Navigation options were prepared. No product record changed.",
        {
          links: matches.map((item) => ({
            href: item.href,
            label: item.label,
            description: item.summary,
            recordType: "route",
          })),
          data: { query, count: matches.length },
        },
      );
    }
    case "search_offers":
      return executeSearchOffers(proposal.arguments);
    case "compare_offers":
      return result("completed", "The private proposal planner is ready.", "No proposal state changed.", {
        links: [{ href: "/saved-offers", label: "Open proposal planner", recordType: "route" }],
      });
    case "review_commitments":
      return executeReviewCommitments(profileId, proposal.arguments);
    case "open_messages": {
      const threadId = id(proposal.arguments.threadId);
      return result("completed", threadId ? "The participant conversation is ready to open." : "Your private messages are ready to open.", "No message was sent.", {
        links: [{ href: threadId ? `/messages/${threadId}` : "/messages", label: threadId ? "Open conversation" : "Open messages", recordId: threadId ?? undefined, recordType: threadId ? "message_thread" : "route" }],
      });
    }
    case "explain_moral_trade": {
      const explanation = explanationFor(text(proposal.arguments.question, 2_000));
      return result("completed", explanation.summary, "An explanation was generated. No record changed.", {
        links: [{ href: explanation.href, label: explanation.label, recordType: "documentation" }],
      });
    }
    case "create_trade_draft": {
      const handoff = tradeHandoff(proposal.arguments);
      return result(
        "completed",
        "The reciprocal terms are ready for the private editor.",
        "Terms were prepared only. No draft has been saved, submitted, published, sent, or accepted.",
        {
          links: [{ href: "/trades/new?handoff=command-center", label: "Review editable trade terms", recordType: "draft_editor" }],
          data: { handoff },
        },
      );
    }
    case "update_trade_draft": {
      const offerId = id(proposal.arguments.offerId);
      return result("completed", offerId ? "The owner-scoped proposal manager is ready." : "The proposal manager is ready.", "No proposal field changed.", {
        links: [{ href: offerId ? `/trades/${offerId}/manage` : "/dashboard", label: offerId ? "Open proposal manager" : "Open my activity", recordId: offerId ?? undefined, recordType: offerId ? "offer" : "route" }],
      });
    }
    case "create_public_good_proposal": {
      const participantCount = number(proposal.arguments.participantCount);
      const contributionAmount = number(proposal.arguments.contributionAmount);
      const thresholdCount = number(proposal.arguments.thresholdCount);
      if (
        participantCount === null ||
        contributionAmount === null ||
        thresholdCount === null ||
        !Number.isInteger(participantCount) ||
        !Number.isInteger(thresholdCount) ||
        participantCount < 2 ||
        thresholdCount < 1 ||
        thresholdCount > participantCount
      ) {
        return result(
          "failed",
          "The public-good threshold terms are inconsistent.",
          "No proposal or pool was created.",
          { blockers: ["The threshold must be a positive integer no greater than the participant count."] },
        );
      }
      const contributionCents = Math.round(contributionAmount * 100);
      if (
        contributionCents <= 0 ||
        Math.abs(contributionAmount * 100 - contributionCents) > Number.EPSILON * 100 ||
        contributionCents > Math.floor(MAX_SAFE_FUNDING_CENTS / participantCount)
      ) {
        return result(
          "failed",
          "The proposed contribution or total cannot be represented exactly in cents.",
          "No proposal or pool was created.",
          { blockers: ["Use a positive two-decimal contribution and reduce the participant count or contribution if needed."] },
        );
      }
      const normalizedContributionAmount = contributionCents / 100;
      const params = new URLSearchParams({
        template: "threshold-coalition",
        title: text(proposal.arguments.title, 180),
        cause: text(proposal.arguments.cause, 180),
        participants: String(participantCount),
        contribution: String(normalizedContributionAmount),
        threshold: String(thresholdCount),
        source: "command",
      });
      return result(
        "completed",
        "The threshold-coalition terms are ready for the private pool editor.",
        "A proposal template was prepared only. No pool exists, no threshold is active, and no contribution is authorized.",
        {
          links: [{ href: `/mpgf/pools/new?${params.toString()}`, label: "Review public-good pool terms", recordType: "pool_editor" }],
          data: {
            participantCount: proposal.arguments.participantCount,
            contributionAmount: proposal.arguments.contributionAmount,
            thresholdCount: proposal.arguments.thresholdCount,
          },
        },
      );
    }
    case "create_donation_offset":
      return result("completed", "The reviewed donation-offset template is ready.", "No donation, offset, match, or public proposal was created.", {
        links: [{ href: "/offers/new?mode=offset", label: "Review donation-offset terms", recordType: "offset_editor" }],
      });
    case "update_priority_profile":
      return result("completed", "The private priority editor is ready.", "No priority allocation changed.", {
        links: [{ href: "/profile/priorities", label: "Edit priority allocation", recordType: "profile_editor" }],
        data: { requestedChange: text(proposal.arguments.summary, 1_000) },
      });
    case "schedule_reminder": {
      const agreementId = id(proposal.arguments.agreementId);
      return result("completed", "Reminder management is ready.", "No reminder or external calendar event was created.", {
        links: [{ href: agreementId ? `/agreements/${agreementId}` : "/commitments", label: agreementId ? "Manage agreement reminders" : "Open commitments", recordId: agreementId ?? undefined, recordType: agreementId ? "agreement" : "route" }],
        data: { requestedCadence: text(proposal.arguments.cadence, 120) },
      });
    }
    default:
      return result("failed", "This capability does not have an executor.", "No action was taken.", {
        blockers: ["Executor missing for an unregistered capability."],
      });
  }
}

export async function executeConfirmedCommandTool({
  capabilityKey,
  argumentsValue,
}: {
  capabilityKey: string;
  argumentsValue: Record<string, unknown>;
}): Promise<CommandToolResult> {
  const capability = getCommandCapability(capabilityKey);
  if (!capability) {
    return result("failed", "Unknown Command capability.", "No action was taken.");
  }
  if (![
    "confirmed_handoff",
    "strong_confirmed_handoff",
  ].includes(capability.executionMode)) {
    return result("failed", "This action does not use a confirmation handoff.", "No action was taken.");
  }

  const offerId = id(argumentsValue.offerId);
  const agreementId = id(argumentsValue.agreementId);
  const threadId = id(argumentsValue.threadId);
  const poolId = id(argumentsValue.poolId);
  const links: CommandToolResult["links"] = [];
  let summary = "The exact product workflow is ready.";

  switch (capabilityKey) {
    case "create_counteroffer":
      links.push({
        href: threadId ? `/messages/${threadId}` : offerId ? `/offers/${offerId}` : agreementId ? `/agreements/${agreementId}` : "/messages",
        label: "Review and send counteroffer",
        recordId: threadId ?? offerId ?? agreementId ?? undefined,
        recordType: threadId ? "message_thread" : offerId ? "offer" : agreementId ? "agreement" : "route",
      });
      summary = "Counteroffer confirmation recorded; the exact participant workflow is ready.";
      break;
    case "send_invitation":
      if (!offerId) return result("failed", "The invitation target is missing.", "No invitation was sent.");
      links.push({ href: `/trades/${offerId}/invite`, label: "Review and send invitation", recordId: offerId, recordType: "offer" });
      summary = "Invitation confirmation recorded; the recipient and frozen terms must still be reviewed in the invitation workflow.";
      break;
    case "submit_evidence":
      if (!agreementId) return result("failed", "The agreement target is missing.", "No evidence was submitted.");
      links.push({ href: `/evidence/${agreementId}`, label: "Review and submit public-safe evidence", recordId: agreementId, recordType: "agreement" });
      summary = "Evidence confirmation recorded; no artifact has been submitted yet.";
      break;
    case "join_pool":
      if (!poolId) return result("failed", "The pool target is missing.", "No pool contribution was recorded.");
      links.push({ href: `/mpgf/pools/${poolId}`, label: "Review pool and contribution", recordId: poolId, recordType: "pool" });
      summary = "Pool confirmation recorded; threshold and financial state remain controlled by the pool page.";
      break;
    case "authorize_payment":
      if (!agreementId) return result("failed", "The agreement target is missing.", "No payment was authorized.");
      links.push({ href: `/agreements/${agreementId}`, label: "Open authoritative payment workflow", recordId: agreementId, recordType: "agreement" });
      summary = "Strong confirmation recorded; no payment has been authorized or charged by Command.";
      break;
    case "cancel_or_refund_payment":
      if (!agreementId) return result("failed", "The agreement target is missing.", "No cancellation or refund occurred.");
      links.push({ href: `/agreements/${agreementId}`, label: "Open authoritative cancellation or refund workflow", recordId: agreementId, recordType: "agreement" });
      summary = "Strong confirmation recorded; provider and agreement state still determine whether cancellation, refund, or dispute is available.";
      break;
    default:
      return result("failed", "Confirmed executor is unavailable.", "No action was taken.");
  }

  return result(
    "completed",
    summary,
    "Command recorded the confirmation and prepared the authoritative workflow. It did not infer or claim that the external or financial action succeeded.",
    { links, data: { confirmedHandoff: true } },
  );
}
