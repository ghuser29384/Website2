import { confirmationMatches } from "@/lib/command/confirmation";
import {
  executeCommandProposal,
  executeConfirmedCommandTool,
} from "@/lib/command/executor";
import {
  appendCommandAuditEvent,
  createCommandRun,
  ensureSessionTitle,
  getCommandSession,
  getCommandToolCall,
  insertCommandMessage,
  insertCommandToolCall,
  refreshCommandSession,
  updateCommandRun,
  updateCommandSession,
  updateCommandToolCall,
} from "@/lib/command/persistence";
import { planCommand } from "@/lib/command/planner";
import type {
  CommandPlanStep,
  CommandRunStatus,
  CommandToolCallView,
  CommandToolResult,
  CommandTurnResponse,
} from "@/lib/command/types";

function completedPlan(
  plan: CommandPlanStep[],
  tools: CommandToolCallView[],
): CommandPlanStep[] {
  return plan.map((step) => {
    const matching = step.capabilityKey
      ? tools.find((tool) => tool.capabilityKey === step.capabilityKey)
      : null;
    if (!matching) return step;
    return {
      ...step,
      status:
        matching.status === "blocked" || matching.status === "failed"
          ? "blocked"
          : matching.status === "completed"
            ? "completed"
            : "planned",
    };
  });
}

function runStatusFor({
  clarification,
  tools,
}: {
  clarification: boolean;
  tools: CommandToolCallView[];
}): CommandRunStatus {
  if (clarification) return "awaiting_clarification";
  if (tools.some((tool) => tool.status === "awaiting_confirmation")) {
    return "awaiting_confirmation";
  }
  if (tools.length && tools.every((tool) => tool.status === "blocked")) return "blocked";
  if (tools.some((tool) => tool.status === "failed")) return "failed";
  return "completed";
}

function composeAssistantBody(
  plannerMessage: string,
  results: CommandToolCallView[],
  clarificationQuestion?: string,
) {
  const sections = [plannerMessage.trim()];
  if (clarificationQuestion) sections.push(clarificationQuestion.trim());
  for (const tool of results) {
    if (!tool.result) continue;
    sections.push(`${tool.result.summary}\n${tool.result.stateClaim}`);
  }
  return sections.filter(Boolean).join("\n\n").slice(0, 12_000);
}

export async function processCommandTurn({
  profileId,
  sessionId,
  message,
}: {
  profileId: string;
  sessionId: string;
  message: string;
}): Promise<CommandTurnResponse> {
  const normalized = message.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 4_000);
  if (!normalized) {
    return {
      ok: false,
      session: await refreshCommandSession(profileId, sessionId),
      assistantMessage: null,
      run: null,
      blockers: ["A command is required."],
    };
  }

  const existing = await getCommandSession(profileId, sessionId);
  if (!existing) throw new Error("Command session was not found.");
  await ensureSessionTitle(profileId, sessionId, normalized);
  const userMessage = await insertCommandMessage({
    profileId,
    sessionId,
    role: "user",
    body: normalized,
  });
  await appendCommandAuditEvent({
    profileId,
    sessionId,
    eventType: "turn_received",
    metadata: { messageId: userMessage.id, lengthBucket: Math.ceil(normalized.length / 100) * 100 },
  });

  const planner = await planCommand({
    message: normalized,
    history: [...existing.messages, userMessage].map(({ role, body }) => ({ role, body })),
  });
  const initialStatus: CommandRunStatus = planner.clarification
    ? "awaiting_clarification"
    : "planning";
  const runRow = await createCommandRun({
    profileId,
    sessionId,
    userMessageId: userMessage.id,
    intentSummary: planner.intentSummary,
    plan: planner.plan,
    clarification: planner.clarification,
    confidence: planner.confidence,
    modelMode: planner.modelMode,
    modelName: planner.modelName,
    status: initialStatus,
  });
  const runId = String(runRow.id);
  await appendCommandAuditEvent({
    profileId,
    sessionId,
    runId,
    eventType: "plan_created",
    metadata: {
      modelMode: planner.modelMode,
      modelName: planner.modelName,
      confidenceBucket: Math.round(planner.confidence * 20) / 20,
      toolCount: planner.tools.length,
      clarificationRequired: Boolean(planner.clarification),
    },
  });

  const toolViews: CommandToolCallView[] = [];
  if (!planner.clarification) {
    for (const proposal of planner.tools) {
      const executionResult: CommandToolResult = await executeCommandProposal({
        profileId,
        proposal,
      });
      const tool = await insertCommandToolCall({
        profileId,
        sessionId,
        runId,
        proposal,
        status: executionResult.status,
        result: executionResult,
      });
      toolViews.push(tool);
      await appendCommandAuditEvent({
        profileId,
        sessionId,
        runId,
        toolCallId: tool.id,
        eventType:
          tool.status === "awaiting_confirmation"
            ? "tool_confirmation_requested"
            : tool.status === "completed"
              ? "tool_completed"
              : tool.status === "blocked"
                ? "tool_blocked"
                : "tool_failed",
        metadata: {
          capabilityKey: tool.capabilityKey,
          permissionTier: tool.permissionTier,
          status: tool.status,
          confidenceBucket: Math.round(tool.confidence * 20) / 20,
        },
      });
    }
  }

  const finalStatus = runStatusFor({
    clarification: Boolean(planner.clarification),
    tools: toolViews,
  });
  const finalPlan = completedPlan(planner.plan, toolViews);
  await updateCommandRun({ profileId, runId, status: finalStatus, plan: finalPlan });
  const assistantBody = composeAssistantBody(
    planner.assistantMessage,
    toolViews,
    planner.clarification?.question,
  );
  const assistantMessage = await insertCommandMessage({
    profileId,
    sessionId,
    role: "assistant",
    body: assistantBody,
    messageKind: planner.clarification ? "clarification" : "message",
    metadata: {
      runId,
      status: finalStatus,
      modelMode: planner.modelMode,
    },
  });
  await updateCommandSession({
    profileId,
    sessionId,
    summary: planner.intentSummary,
  });

  const session = await refreshCommandSession(profileId, sessionId);
  const run = session.runs.find((entry) => entry.id === runId) ?? null;
  return {
    ok: !["failed"].includes(finalStatus),
    session,
    assistantMessage,
    run,
    blockers: toolViews.flatMap((tool) => tool.result?.blockers ?? []),
  };
}

export async function confirmCommandTool({
  profileId,
  toolCallId,
  confirmation,
}: {
  profileId: string;
  toolCallId: string;
  confirmation: string;
}) {
  const stored = await getCommandToolCall(profileId, toolCallId);
  if (!stored) throw new Error("Command tool call was not found.");
  const tool = stored.view;
  if (tool.status !== "awaiting_confirmation") {
    return {
      ok: false,
      tool,
      session: await refreshCommandSession(profileId, String(stored.row.session_id)),
      blockers: ["This action is not awaiting confirmation."],
    };
  }
  if (
    !confirmationMatches({
      capabilityKey: tool.capabilityKey,
      argumentsValue: tool.arguments,
      confirmation,
    })
  ) {
    await appendCommandAuditEvent({
      profileId,
      sessionId: String(stored.row.session_id),
      runId: String(stored.row.run_id),
      toolCallId,
      eventType: "tool_confirmation_rejected",
      metadata: { capabilityKey: tool.capabilityKey },
    });
    return {
      ok: false,
      tool,
      session: await refreshCommandSession(profileId, String(stored.row.session_id)),
      blockers: ["The confirmation did not match the required value."],
    };
  }

  await updateCommandToolCall({
    profileId,
    toolCallId,
    status: "confirmed",
    confirmed: true,
  });
  await appendCommandAuditEvent({
    profileId,
    sessionId: String(stored.row.session_id),
    runId: String(stored.row.run_id),
    toolCallId,
    eventType: "tool_confirmed",
    metadata: {
      capabilityKey: tool.capabilityKey,
      confirmationLevel: tool.confirmationLevel,
    },
  });
  const executionResult = await executeConfirmedCommandTool({
    capabilityKey: tool.capabilityKey,
    argumentsValue: tool.arguments,
  });
  const updated = await updateCommandToolCall({
    profileId,
    toolCallId,
    status: executionResult.status,
    result: executionResult,
  });
  await appendCommandAuditEvent({
    profileId,
    sessionId: String(stored.row.session_id),
    runId: String(stored.row.run_id),
    toolCallId,
    eventType: executionResult.ok ? "confirmed_handoff_prepared" : "confirmed_handoff_failed",
    metadata: {
      capabilityKey: tool.capabilityKey,
      status: executionResult.status,
    },
  });
  const session = await refreshCommandSession(profileId, String(stored.row.session_id));
  return { ok: executionResult.ok, tool: updated, session, blockers: executionResult.blockers };
}
