export const COMMAND_SESSION_VERSION = "moral-trade-command-v1" as const;

export type CommandPermissionTier =
  | "read_only"
  | "private_reversible"
  | "external_consequential"
  | "financial_strong_confirmation"
  | "prohibited";

export type CommandConfirmationLevel =
  | "none"
  | "acknowledge"
  | "confirm"
  | "type_exact_phrase";

export type CommandExecutionMode =
  | "immediate"
  | "private_handoff"
  | "confirmed_handoff"
  | "strong_confirmed_handoff"
  | "blocked";

export type CommandToolStatus =
  | "proposed"
  | "ready"
  | "awaiting_confirmation"
  | "confirmed"
  | "completed"
  | "blocked"
  | "failed";

export type CommandRunStatus =
  | "planning"
  | "awaiting_clarification"
  | "awaiting_confirmation"
  | "completed"
  | "blocked"
  | "failed";

export interface CommandCapabilityConsequence {
  public: string;
  financial: string;
  privacy: string;
  legal: string;
}

export interface CommandCapabilityDefinition {
  key: string;
  title: string;
  description: string;
  permissionTier: CommandPermissionTier;
  confirmationLevel: CommandConfirmationLevel;
  executionMode: CommandExecutionMode;
  reversible: boolean;
  authorization: "public" | "authenticated" | "participant" | "operator";
  inputSchema: Record<string, unknown>;
  consequence: CommandCapabilityConsequence;
  examples: string[];
}

export interface CommandPlanStep {
  id: string;
  label: string;
  status: "planned" | "running" | "completed" | "blocked";
  capabilityKey?: string;
}

export interface CommandClarification {
  required: boolean;
  question: string;
  options: string[];
  reason: string;
}

export interface CommandToolProposal {
  capabilityKey: string;
  arguments: Record<string, unknown>;
  confidence: number;
  rationale: string;
}

export interface CommandPlannerOutput {
  intentSummary: string;
  assistantMessage: string;
  confidence: number;
  plan: CommandPlanStep[];
  clarification: CommandClarification | null;
  tools: CommandToolProposal[];
  modelMode: "deterministic" | "openai";
  modelName: string;
}

export interface CommandLinkResult {
  href: string;
  label: string;
  description?: string;
  recordId?: string;
  recordType?: string;
}

export interface CommandToolResult {
  ok: boolean;
  status: CommandToolStatus;
  summary: string;
  stateClaim: string;
  links: CommandLinkResult[];
  data: Record<string, unknown>;
  blockers: string[];
}

export interface CommandToolCallView {
  id: string;
  capabilityKey: string;
  title: string;
  summary: string;
  permissionTier: CommandPermissionTier;
  confirmationLevel: CommandConfirmationLevel;
  executionMode: CommandExecutionMode;
  reversible: boolean;
  consequence: CommandCapabilityConsequence;
  arguments: Record<string, unknown>;
  confidence: number;
  status: CommandToolStatus;
  confirmationPhrase: string | null;
  result: CommandToolResult | null;
  createdAt: string;
}

export interface CommandMessageView {
  id: string;
  role: "user" | "assistant" | "system";
  body: string;
  messageKind: "message" | "clarification" | "status";
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CommandRunView {
  id: string;
  status: CommandRunStatus;
  plan: CommandPlanStep[];
  clarification: CommandClarification | null;
  confidence: number;
  modelMode: "deterministic" | "openai";
  modelName: string;
  toolCalls: CommandToolCallView[];
  createdAt: string;
  completedAt: string | null;
}

export interface CommandSessionView {
  id: string;
  title: string;
  state: "active" | "archived";
  summary: string;
  version: typeof COMMAND_SESSION_VERSION;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  messages: CommandMessageView[];
  runs: CommandRunView[];
}

export interface CommandTurnResponse {
  ok: boolean;
  session: CommandSessionView;
  assistantMessage: CommandMessageView | null;
  run: CommandRunView | null;
  blockers: string[];
}
