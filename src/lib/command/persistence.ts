import { createHash, randomUUID } from "node:crypto";

import {
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
  decryptBackgroundSensitiveText,
  encryptBackgroundSensitiveText,
} from "@/lib/background-field-encryption";
import { getCommandCapability } from "@/lib/command/capabilities";
import { confirmationPhraseForTool } from "@/lib/command/confirmation";
import type {
  CommandClarification,
  CommandMessageView,
  CommandPlanStep,
  CommandRunStatus,
  CommandRunView,
  CommandSessionView,
  CommandToolCallView,
  CommandToolProposal,
  CommandToolResult,
  CommandToolStatus,
} from "@/lib/command/types";
import { COMMAND_SESSION_VERSION } from "@/lib/command/types";
import { createClient } from "@/lib/supabase/server";

const SESSION_TITLE_FIELD = "command_sessions.title";
const SESSION_SUMMARY_FIELD = "command_sessions.summary";
const MESSAGE_BODY_FIELD = "command_messages.body";
const RUN_INTENT_FIELD = "command_runs.intent";
const RUN_PLAN_FIELD = "command_runs.plan";
const RUN_CLARIFICATION_FIELD = "command_runs.clarification";
const TOOL_PAYLOAD_FIELD = "command_tool_calls.payload";
const TOOL_RATIONALE_FIELD = "command_tool_calls.rationale";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeJsonParse<T>(value: string, fallback: T): T {
  if (!value || value.startsWith("[encrypted private field")) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function decryptText(value: unknown, fieldKey: string) {
  return decryptBackgroundSensitiveText(typeof value === "string" ? value : "", fieldKey);
}

function encryptText(value: string, fieldKey: string) {
  const normalized = value.trim();
  return {
    placeholder: normalized ? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER : "",
    ciphertext: normalized ? encryptBackgroundSensitiveText(normalized, fieldKey) : "",
    version: normalized ? BACKGROUND_FIELD_ENCRYPTION_VERSION : "",
  };
}

function encryptJson(value: unknown, fieldKey: string) {
  return encryptText(JSON.stringify(value), fieldKey);
}

function iso(value: unknown) {
  return typeof value === "string" ? value : new Date().toISOString();
}

function sessionTitleFromPrompt(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (!normalized) return "New command";
  return normalized.length > 64 ? `${normalized.slice(0, 61)}…` : normalized;
}

function viewMessage(row: Record<string, unknown>): CommandMessageView {
  return {
    id: String(row.id ?? ""),
    role:
      row.role === "assistant" || row.role === "system" ? row.role : "user",
    body: decryptText(row.body_ciphertext, MESSAGE_BODY_FIELD),
    messageKind:
      row.message_kind === "clarification" || row.message_kind === "status"
        ? row.message_kind
        : "message",
    metadata: asRecord(row.metadata),
    createdAt: iso(row.created_at),
  };
}

function toolPayload(row: Record<string, unknown>) {
  const decrypted = decryptText(row.payload_ciphertext, TOOL_PAYLOAD_FIELD);
  return safeJsonParse<{ arguments?: Record<string, unknown>; rationale?: string }>(
    decrypted,
    {},
  );
}

function viewToolCall(row: Record<string, unknown>): CommandToolCallView {
  const capabilityKey = String(row.capability_key ?? "");
  const capability = getCommandCapability(capabilityKey);
  const payload = toolPayload(row);
  const argumentsValue = asRecord(payload.arguments);
  const result = row.result ? (row.result as CommandToolResult) : null;
  return {
    id: String(row.id ?? ""),
    capabilityKey,
    title: capability?.title ?? capabilityKey,
    summary: typeof payload.rationale === "string" ? payload.rationale : capability?.description ?? "",
    permissionTier: capability?.permissionTier ?? "prohibited",
    confirmationLevel: capability?.confirmationLevel ?? "confirm",
    executionMode: capability?.executionMode ?? "blocked",
    reversible: capability?.reversible ?? false,
    consequence: capability?.consequence ?? {
      public: "Unavailable.",
      financial: "Unavailable.",
      privacy: "Unavailable.",
      legal: "Unavailable.",
    },
    arguments: argumentsValue,
    confidence: typeof row.confidence === "number" ? row.confidence : 0,
    status: (row.status as CommandToolStatus) ?? "failed",
    confirmationPhrase: confirmationPhraseForTool(capabilityKey, argumentsValue),
    result,
    createdAt: iso(row.created_at),
  };
}

function viewRun(
  row: Record<string, unknown>,
  toolRows: Record<string, unknown>[],
): CommandRunView {
  const plan = safeJsonParse<CommandPlanStep[]>(
    decryptText(row.plan_ciphertext, RUN_PLAN_FIELD),
    [],
  );
  const clarification = safeJsonParse<CommandClarification | null>(
    decryptText(row.clarification_ciphertext, RUN_CLARIFICATION_FIELD),
    null,
  );
  return {
    id: String(row.id ?? ""),
    status: (row.status as CommandRunStatus) ?? "failed",
    plan,
    clarification,
    confidence: typeof row.confidence === "number" ? row.confidence : 0,
    modelMode: row.model_mode === "openai" ? "openai" : "deterministic",
    modelName: String(row.model_name ?? "deterministic-v1"),
    toolCalls: toolRows
      .filter((toolRow) => toolRow.run_id === row.id)
      .map(viewToolCall),
    createdAt: iso(row.created_at),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function viewSession(
  row: Record<string, unknown>,
  messages: Record<string, unknown>[] = [],
  runs: Record<string, unknown>[] = [],
  tools: Record<string, unknown>[] = [],
): CommandSessionView {
  return {
    id: String(row.id ?? ""),
    title: decryptText(row.title_ciphertext, SESSION_TITLE_FIELD) || "New command",
    state: row.state === "archived" ? "archived" : "active",
    summary: decryptText(row.summary_ciphertext, SESSION_SUMMARY_FIELD),
    version: COMMAND_SESSION_VERSION,
    lastActivityAt: iso(row.last_activity_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    messages: messages.map(viewMessage),
    runs: runs.map((run) => viewRun(run, tools)),
  };
}

export async function createCommandSession(profileId: string, prompt = "") {
  const supabase = (await createClient()) as any;
  const title = encryptText(sessionTitleFromPrompt(prompt), SESSION_TITLE_FIELD);
  const summary = encryptText("", SESSION_SUMMARY_FIELD);
  const { data, error } = await supabase
    .from("command_sessions")
    .insert({
      profile_id: profileId,
      title: title.placeholder,
      title_ciphertext: title.ciphertext,
      title_encryption_version: title.version,
      summary: summary.placeholder,
      summary_ciphertext: summary.ciphertext,
      summary_encryption_version: summary.version,
      state: "active",
      version: COMMAND_SESSION_VERSION,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await appendCommandAuditEvent({
    profileId,
    sessionId: String(data.id),
    eventType: "session_created",
    metadata: { version: COMMAND_SESSION_VERSION },
    supabase,
  });
  return viewSession(data);
}

export async function listCommandSessions(profileId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("command_sessions")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_activity_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => viewSession(row));
}

export async function getCommandSession(profileId: string, sessionId: string) {
  const supabase = (await createClient()) as any;
  const [sessionResult, messagesResult, runsResult, toolsResult] = await Promise.all([
    supabase
      .from("command_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("command_messages")
      .select("*")
      .eq("session_id", sessionId)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true }),
    supabase
      .from("command_runs")
      .select("*")
      .eq("session_id", sessionId)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true }),
    supabase
      .from("command_tool_calls")
      .select("*")
      .eq("session_id", sessionId)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true }),
  ]);
  for (const result of [sessionResult, messagesResult, runsResult, toolsResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  if (!sessionResult.data) return null;
  return viewSession(
    sessionResult.data,
    messagesResult.data ?? [],
    runsResult.data ?? [],
    toolsResult.data ?? [],
  );
}

export async function updateCommandSession({
  profileId,
  sessionId,
  state,
  title,
  summary,
}: {
  profileId: string;
  sessionId: string;
  state?: "active" | "archived";
  title?: string;
  summary?: string;
}) {
  const supabase = (await createClient()) as any;
  const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
  if (state) patch.state = state;
  if (title !== undefined) {
    const encrypted = encryptText(title, SESSION_TITLE_FIELD);
    Object.assign(patch, {
      title: encrypted.placeholder,
      title_ciphertext: encrypted.ciphertext,
      title_encryption_version: encrypted.version,
    });
  }
  if (summary !== undefined) {
    const encrypted = encryptText(summary, SESSION_SUMMARY_FIELD);
    Object.assign(patch, {
      summary: encrypted.placeholder,
      summary_ciphertext: encrypted.ciphertext,
      summary_encryption_version: encrypted.version,
    });
  }
  const { data, error } = await supabase
    .from("command_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("profile_id", profileId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return viewSession(data);
}

export async function insertCommandMessage({
  profileId,
  sessionId,
  role,
  body,
  messageKind = "message",
  metadata = {},
}: {
  profileId: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  body: string;
  messageKind?: "message" | "clarification" | "status";
  metadata?: Record<string, unknown>;
}) {
  const supabase = (await createClient()) as any;
  const encrypted = encryptText(body, MESSAGE_BODY_FIELD);
  const { data, error } = await supabase
    .from("command_messages")
    .insert({
      profile_id: profileId,
      session_id: sessionId,
      role,
      body: encrypted.placeholder,
      body_ciphertext: encrypted.ciphertext,
      body_encryption_version: encrypted.version,
      message_kind: messageKind,
      metadata,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await supabase
    .from("command_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("profile_id", profileId);
  return viewMessage(data);
}

export async function createCommandRun({
  profileId,
  sessionId,
  userMessageId,
  intentSummary,
  plan,
  clarification,
  confidence,
  modelMode,
  modelName,
  status,
}: {
  profileId: string;
  sessionId: string;
  userMessageId: string;
  intentSummary: string;
  plan: CommandPlanStep[];
  clarification: CommandClarification | null;
  confidence: number;
  modelMode: "deterministic" | "openai";
  modelName: string;
  status: CommandRunStatus;
}) {
  const supabase = (await createClient()) as any;
  const intent = encryptText(intentSummary, RUN_INTENT_FIELD);
  const encryptedPlan = encryptJson(plan, RUN_PLAN_FIELD);
  const encryptedClarification = encryptJson(clarification, RUN_CLARIFICATION_FIELD);
  const { data, error } = await supabase
    .from("command_runs")
    .insert({
      profile_id: profileId,
      session_id: sessionId,
      user_message_id: userMessageId,
      status,
      intent_summary: intent.placeholder,
      intent_ciphertext: intent.ciphertext,
      plan: [],
      plan_ciphertext: encryptedPlan.ciphertext,
      clarification: clarification ? {} : null,
      clarification_ciphertext: encryptedClarification.ciphertext,
      encryption_version: BACKGROUND_FIELD_ENCRYPTION_VERSION,
      confidence,
      model_mode: modelMode,
      model_name: modelName,
      completed_at:
        status === "completed" || status === "blocked" || status === "failed"
          ? new Date().toISOString()
          : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function updateCommandRun({
  profileId,
  runId,
  status,
  plan,
}: {
  profileId: string;
  runId: string;
  status: CommandRunStatus;
  plan?: CommandPlanStep[];
}) {
  const supabase = (await createClient()) as any;
  const patch: Record<string, unknown> = { status };
  if (plan) patch.plan_ciphertext = encryptJson(plan, RUN_PLAN_FIELD).ciphertext;
  if (["completed", "blocked", "failed"].includes(status)) {
    patch.completed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("command_runs")
    .update(patch)
    .eq("id", runId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}

function argumentsSummary(argumentsValue: Record<string, unknown>) {
  const summary: Record<string, unknown> = {
    fields: Object.keys(argumentsValue).slice(0, 20),
  };
  for (const key of ["agreementId", "offerId", "poolId", "threadId"] as const) {
    if (typeof argumentsValue[key] === "string") summary[key] = argumentsValue[key];
  }
  return summary;
}

export async function insertCommandToolCall({
  profileId,
  sessionId,
  runId,
  proposal,
  status,
  result = null,
}: {
  profileId: string;
  sessionId: string;
  runId: string;
  proposal: CommandToolProposal;
  status: CommandToolStatus;
  result?: CommandToolResult | null;
}) {
  const capability = getCommandCapability(proposal.capabilityKey);
  if (!capability) throw new Error(`Unknown Command capability: ${proposal.capabilityKey}`);
  const supabase = (await createClient()) as any;
  const payload = encryptJson(
    { arguments: proposal.arguments, rationale: proposal.rationale },
    TOOL_PAYLOAD_FIELD,
  );
  const rationale = encryptText(proposal.rationale, TOOL_RATIONALE_FIELD);
  const { data, error } = await supabase
    .from("command_tool_calls")
    .insert({
      profile_id: profileId,
      session_id: sessionId,
      run_id: runId,
      capability_key: capability.key,
      permission_tier: capability.permissionTier,
      confirmation_level: capability.confirmationLevel,
      execution_mode: capability.executionMode,
      reversible: capability.reversible,
      status,
      arguments_summary: argumentsSummary(proposal.arguments),
      payload_ciphertext: payload.ciphertext,
      payload_encryption_version: payload.version,
      confidence: proposal.confidence,
      rationale: rationale.placeholder,
      rationale_ciphertext: rationale.ciphertext,
      result,
      executed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return viewToolCall(data);
}

export async function getCommandToolCall(profileId: string, toolCallId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("command_tool_calls")
    .select("*")
    .eq("id", toolCallId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { row: data as Record<string, unknown>, view: viewToolCall(data) };
}

export async function updateCommandToolCall({
  profileId,
  toolCallId,
  status,
  result,
  confirmed = false,
}: {
  profileId: string;
  toolCallId: string;
  status: CommandToolStatus;
  result?: CommandToolResult | null;
  confirmed?: boolean;
}) {
  const supabase = (await createClient()) as any;
  const patch: Record<string, unknown> = { status };
  if (result !== undefined) patch.result = result;
  if (confirmed) patch.confirmed_at = new Date().toISOString();
  if (status === "completed") patch.executed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("command_tool_calls")
    .update(patch)
    .eq("id", toolCallId)
    .eq("profile_id", profileId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return viewToolCall(data);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function appendCommandAuditEvent({
  profileId,
  sessionId = null,
  runId = null,
  toolCallId = null,
  eventType,
  metadata = {},
  supabase: suppliedSupabase,
}: {
  profileId: string;
  sessionId?: string | null;
  runId?: string | null;
  toolCallId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
  supabase?: any;
}) {
  const supabase = suppliedSupabase ?? ((await createClient()) as any);
  const { data: previous, error: previousError } = await supabase
    .from("command_audit_events")
    .select("entry_hash")
    .eq("profile_id", profileId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError) throw new Error(previousError.message);
  const prevHash = typeof previous?.entry_hash === "string" ? previous.entry_hash : null;
  const canonical = stableJson({
    profileId,
    sessionId,
    runId,
    toolCallId,
    eventType,
    metadata,
    prevHash,
  });
  const entryHash = createHash("sha256").update(canonical).digest("hex");
  const { error } = await supabase.from("command_audit_events").insert({
    id: randomUUID(),
    profile_id: profileId,
    session_id: sessionId,
    run_id: runId,
    tool_call_id: toolCallId,
    event_type: eventType,
    metadata,
    prev_hash: prevHash,
    entry_hash: entryHash,
  });
  if (error) throw new Error(error.message);
}

export async function refreshCommandSession(profileId: string, sessionId: string) {
  const session = await getCommandSession(profileId, sessionId);
  if (!session) throw new Error("Command session was not found.");
  return session;
}

export async function ensureSessionTitle(profileId: string, sessionId: string, prompt: string) {
  const session = await getCommandSession(profileId, sessionId);
  if (!session) throw new Error("Command session was not found.");
  if (session.title !== "New command") return session;
  return updateCommandSession({
    profileId,
    sessionId,
    title: sessionTitleFromPrompt(prompt),
  });
}
