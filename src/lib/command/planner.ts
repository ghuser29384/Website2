import { COMMAND_CAPABILITIES, getCommandCapability } from "@/lib/command/capabilities";
import { parseTradeCommand } from "@/lib/command/trade-parser";
import type {
  CommandClarification,
  CommandMessageView,
  CommandPlannerOutput,
  CommandPlanStep,
  CommandToolProposal,
} from "@/lib/command/types";

const MIN_TOOL_CONFIDENCE = 0.9;
const DEFAULT_MODEL = "gpt-5-mini";
const MODEL_TIMEOUT_MS = 20_000;

const PROHIBITED_PATTERNS = [
  /\b(?:blackmail|extort|extortion|coerce|coercion|threaten|threat)\b/i,
  /\b(?:dox|doxx|hack|steal|impersonate|fraud|forge|fake evidence)\b/i,
  /\b(?:hurt|harm|punish)\b.{0,80}\b(?:unless|if they do not|if they refuse)\b/i,
  /\b(?:manufacture|invent|fake)\b.{0,40}\b(?:baseline|counterfactual|proof|receipt)\b/i,
  /\b(?:buy|sell|swap|trade)\b.{0,30}\b(?:vote|ballot)\b/i,
  /\b(?:bypass|evade)\b.{0,40}\b(?:authorization|consent|review|safety)\b/i,
];

function normalize(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 4_000);
}

function clarification(
  question: string,
  options: string[],
  reason: string,
): CommandClarification {
  return { required: true, question, options, reason };
}

function proposal(
  capabilityKey: string,
  argumentsValue: Record<string, unknown>,
  confidence: number,
  rationale: string,
): CommandToolProposal {
  return { capabilityKey, arguments: argumentsValue, confidence, rationale };
}

function planFor(tools: CommandToolProposal[]): CommandPlanStep[] {
  return tools.map((tool, index) => ({
    id: `step-${index + 1}`,
    label: getCommandCapability(tool.capabilityKey)?.title ?? tool.capabilityKey,
    status: "planned",
    capabilityKey: tool.capabilityKey,
  }));
}

function deterministicResult({
  intentSummary,
  assistantMessage,
  tools = [],
  clarificationValue = null,
  confidence = 0.96,
}: {
  intentSummary: string;
  assistantMessage: string;
  tools?: CommandToolProposal[];
  clarificationValue?: CommandClarification | null;
  confidence?: number;
}): CommandPlannerOutput {
  return {
    intentSummary,
    assistantMessage,
    confidence,
    plan: planFor(tools),
    clarification: clarificationValue,
    tools,
    modelMode: "deterministic",
    modelName: "deterministic-v1",
  };
}

function extractAmount(value: string) {
  const match = /(?:\$|usd\s*)([\d,]+(?:\.\d{1,2})?)/i.exec(value);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function extractId(value: string, label: string) {
  const patterns = [
    new RegExp(`${label}[-_\\s:]+([a-f0-9-]{8,})`, "i"),
    /\b([a-f0-9]{8}-[a-f0-9-]{20,})\b/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match) return match[1];
  }
  return null;
}

function parseThresholdRequest(value: string) {
  const participant = /\b(\d[\d,]*)\s+(?:participants?|people|members?)\b/i.exec(value);
  const threshold = /\b(?:at least|when|if)\s+(\d[\d,]*)\s+(?:participants?|people|members?)?\b/i.exec(
    value,
  );
  const amount = extractAmount(value);
  if (!participant || !threshold || amount === null) return null;
  const participantCount = Number(participant[1].replaceAll(",", ""));
  const thresholdCount = Number(threshold[1].replaceAll(",", ""));
  if (
    !Number.isFinite(participantCount) ||
    !Number.isFinite(thresholdCount) ||
    thresholdCount < 1 ||
    participantCount < 2 ||
    thresholdCount > participantCount
  ) {
    return null;
  }
  const causeMatch = /(?:for|toward|towards|to fund)\s+(.+?)(?:[.;]|$)/i.exec(value);
  const cause = causeMatch?.[1]?.trim() || "Shared moral public good";
  return {
    title: `${cause} threshold pool`,
    participantCount,
    contributionAmount: amount,
    thresholdCount,
    cause,
  };
}

function hasAmbiguousDonation(value: string) {
  return (
    /\b(?:donate|donation|give)\b/i.test(value) &&
    extractAmount(value) !== null &&
    !/\b(?:if|in exchange|in return|offset|redirect|pool|threshold|match|conditional)\b/i.test(value)
  );
}

function routeQuery(value: string) {
  return value
    .replace(/^(?:please\s+)?(?:open|go to|take me to|navigate to|show me)\s+/i, "")
    .trim();
}

export function planCommandDeterministically(message: string): CommandPlannerOutput {
  const input = normalize(message);
  const lower = input.toLowerCase();

  if (!input) {
    return deterministicResult({
      intentSummary: "Awaiting a command",
      assistantMessage: "Describe what you want to do in Moral Trade.",
      clarificationValue: clarification(
        "What would you like to do?",
        ["Find an opportunity", "Create a private draft", "Review my commitments"],
        "No command was provided.",
      ),
      confidence: 1,
    });
  }

  if (PROHIBITED_PATTERNS.some((pattern) => pattern.test(input))) {
    const tools = [
      proposal(
        "block_prohibited_request",
        { reason: "Coercion, fabricated evidence, unauthorized access, unlawful conduct, or value-destroying threats are prohibited." },
        0.99,
        "The request could involve coercion, fabricated evidence, unauthorized access, or unlawful conduct.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Blocked unsafe or unauthorized request",
      assistantMessage:
        "I will not help create coercive terms, manufacture a worse baseline, fabricate evidence, bypass consent, or perform an unauthorized action. I can help reformulate this as a voluntary, reviewable proposal.",
      tools,
      confidence: 0.99,
    });
  }

  const threshold = parseThresholdRequest(input);
  if (threshold) {
    const tools = [
      proposal(
        "create_public_good_proposal",
        threshold,
        0.98,
        "The request specifies a participant count, per-person contribution, and activation threshold.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Prepare a threshold public-good proposal",
      assistantMessage:
        "I can prepare this as a threshold-coalition draft. Opening the editor will not fund or activate the pool; the threshold, deadline, fallback, evidence, and unmatched-contribution rules must remain explicit.",
      tools,
    });
  }

  if (hasAmbiguousDonation(input)) {
    return deterministicResult({
      intentSummary: "Clarify donation structure",
      assistantMessage:
        "That could be a direct donation, one leg of a reciprocal trade, a donation offset, or a conditional pool. I will not choose the mechanism without your direction.",
      clarificationValue: clarification(
        "Which structure should I use?",
        ["Direct donation", "Reciprocal trade", "Donation offset", "Conditional pool"],
        "The same donation language maps to materially different baselines, settlement rules, and consent requirements.",
      ),
      confidence: 0.99,
    });
  }

  if (/\b(?:find|search|browse|look for)\b.*\b(?:offer|trade|proposal|opportunit)/i.test(input)) {
    const query = input
      .replace(/^(?:please\s+)?(?:find|search|browse|look for)\s+/i, "")
      .trim();
    const tools = [
      proposal(
        "search_offers",
        { query, mode: null, limit: 8 },
        0.97,
        "The request asks to search public live proposals.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Search live proposals",
      assistantMessage: "I will search the public live-proposal inventory and return record links. No interest or agreement state will be created.",
      tools,
    });
  }

  if (/\bcompare\b.*\b(?:saved|offer|proposal)/i.test(input)) {
    const tools = [proposal("compare_offers", {}, 0.97, "The request asks for the private saved-proposal planner.")];
    return deterministicResult({
      intentSummary: "Open saved-proposal comparison",
      assistantMessage: "I will open the private planner. Comparing proposals does not accept or change them.",
      tools,
    });
  }

  if (/\b(?:my|current|active|open)\b.*\b(?:commitment|agreement)/i.test(input) || /\bwhat.*need(?:s)? attention\b/i.test(input)) {
    const tools = [proposal("review_commitments", { limit: 8 }, 0.96, "The request asks for the participant's own agreement status.")];
    return deterministicResult({
      intentSummary: "Review current commitments",
      assistantMessage: "I will list your current agreement records and their authoritative statuses. I will not infer completion from an action or message.",
      tools,
    });
  }

  if (/\b(?:counteroffer|counter offer|counter-offer)\b/i.test(input)) {
    const offerId = extractId(input, "offer");
    const agreementId = extractId(input, "agreement");
    if (!offerId && !agreementId) {
      return deterministicResult({
        intentSummary: "Clarify counteroffer target",
        assistantMessage: "I need the proposal or agreement to change before I can prepare a counteroffer.",
        clarificationValue: clarification(
          "Which proposal or agreement should I counter?",
          ["Paste the proposal link", "Paste the agreement link", "Open my commitments"],
          "A counteroffer must be attached to the exact existing record and version.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [
      proposal(
        "create_counteroffer",
        { offerId, agreementId, requestedChanges: input },
        0.95,
        "The request explicitly asks to prepare a counteroffer against an identified record.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Prepare a counteroffer",
      assistantMessage: "I will prepare the proposed changes and show the existing-versus-proposed terms. Nothing will be sent until you explicitly confirm the exact target and changes.",
      tools,
    });
  }

  if (/\b(?:invite|send an invitation|invite them)\b/i.test(input)) {
    const offerId = extractId(input, "offer");
    if (!offerId) {
      return deterministicResult({
        intentSummary: "Clarify invitation target",
        assistantMessage: "An invitation must be attached to an exact private proposal.",
        clarificationValue: clarification(
          "Which proposal should the invitation use?",
          ["Paste the proposal link", "Create a private trade draft", "Open my drafts"],
          "The recipient must receive and later confirm the same frozen terms.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [
      proposal(
        "send_invitation",
        { offerId, recipient: null, note: input },
        0.94,
        "The request asks to send an external invitation for a specific proposal.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Preview an invitation",
      assistantMessage: "I will preview the invitation and its exact proposal target. Sending is externally visible and requires explicit confirmation.",
      tools,
    });
  }

  if (/\b(?:submit|upload|add)\b.*\bevidence\b/i.test(input)) {
    const agreementId = extractId(input, "agreement");
    if (!agreementId) {
      return deterministicResult({
        intentSummary: "Clarify evidence target",
        assistantMessage: "Evidence must be attached to an exact agreement and its frozen evidence requirements.",
        clarificationValue: clarification(
          "Which agreement should receive the evidence?",
          ["Paste the agreement link", "Open my commitments"],
          "Submitting to the wrong agreement could disclose information or support the wrong claim.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [
      proposal(
        "submit_evidence",
        { agreementId, description: input, publicSafeConfirmed: false },
        0.96,
        "The request asks to add evidence to an identified agreement.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Preview evidence submission",
      assistantMessage: "I will open the agreement's evidence workflow. Evidence disclosure is consequential and requires explicit confirmation after privacy review.",
      tools,
    });
  }

  if (/\b(?:join|contribute to|pledge to)\b.*\bpool\b/i.test(input)) {
    const poolId = extractId(input, "pool");
    const amount = extractAmount(input);
    if (!poolId || amount === null) {
      return deterministicResult({
        intentSummary: "Clarify pool contribution",
        assistantMessage: "I need the exact pool and maximum contribution before preparing a join action.",
        clarificationValue: clarification(
          "Which pool and maximum amount should I use?",
          ["Paste the pool link and amount", "Browse conditional pools"],
          "Pool activation, maximum exposure, and refund behavior depend on the exact pool record.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [proposal("join_pool", { poolId, amount, currency: "USD" }, 0.96, "The request identifies a pool and contribution amount.")];
    return deterministicResult({
      intentSummary: "Preview a pool contribution",
      assistantMessage: "I will show the exact pool, maximum exposure, threshold, and failure behavior before any contribution is authorized.",
      tools,
    });
  }

  if (/\b(?:offset|redirect opposed|cancel out)\b.*\bdonat/i.test(input)) {
    const tools = [proposal("create_donation_offset", { description: input }, 0.96, "The request explicitly names a donation-offset structure.")];
    return deterministicResult({
      intentSummary: "Prepare a donation-offset draft",
      assistantMessage: "I will open the reviewed offset editor. The baseline, destinations, ratio, evidence, and unmatched-surplus rule must be reviewed before saving.",
      tools,
    });
  }

  if (/\b(?:priority|priorities|100[- ]spark|allocation)\b/i.test(input) && /\b(?:update|edit|change|adjust|set)\b/i.test(input)) {
    const tools = [proposal("update_priority_profile", { summary: input }, 0.95, "The request asks to change the private priority profile.")];
    return deterministicResult({
      intentSummary: "Open priority-profile editor",
      assistantMessage: "I will open your private priority editor. No allocation will change until you save it there.",
      tools,
    });
  }

  if (/\b(?:remind|reminder|schedule)\b/i.test(input)) {
    const agreementId = extractId(input, "agreement");
    const tools = [proposal("schedule_reminder", { agreementId, cadence: input }, 0.93, "The request asks to configure a reminder.")];
    return deterministicResult({
      intentSummary: "Configure a commitment reminder",
      assistantMessage: "I will open reminder management with the request carried forward. No notification will be scheduled until you save the rule.",
      tools,
    });
  }

  if (/\b(?:message|messages|inbox|conversation|thread)\b/i.test(input)) {
    const threadId = extractId(input, "thread");
    const tools = [proposal("open_messages", { threadId }, 0.95, "The request asks to open private messages.")];
    return deterministicResult({
      intentSummary: "Open messages",
      assistantMessage: "I will open the relevant private message workspace. Opening it does not send a message.",
      tools,
    });
  }

  if (/\b(?:refund|cancel payment|cancel authorization)\b/i.test(input)) {
    const agreementId = extractId(input, "agreement");
    const amount = extractAmount(input);
    if (!agreementId || amount === null) {
      return deterministicResult({
        intentSummary: "Clarify financial reversal",
        assistantMessage: "A financial reversal requires the exact agreement, amount, currency, and current provider state.",
        clarificationValue: clarification(
          "Which agreement and exact amount should be reviewed for cancellation or refund?",
          ["Paste the agreement link and amount", "Open my commitments"],
          "Financial state is difficult to reverse and must be confirmed against the authoritative provider record.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [proposal("cancel_or_refund_payment", { agreementId, requestedAction: /refund/i.test(input) ? "refund" : /dispute/i.test(input) ? "dispute" : "cancel", reason: input, amount, currency: "USD" }, 0.96, "The request names a financial reversal for an exact agreement and amount.")];
    return deterministicResult({
      intentSummary: "Preview a payment cancellation or refund",
      assistantMessage: "I will show the authoritative payment state and exact amount. Execution requires typing the displayed confirmation phrase.",
      tools,
    });
  }

  if (/\b(?:authorize|pay|payment)\b/i.test(input) && extractAmount(input) !== null) {
    const agreementId = extractId(input, "agreement");
    const amount = extractAmount(input);
    if (!agreementId) {
      return deterministicResult({
        intentSummary: "Clarify payment target",
        assistantMessage: "Payment authorization must be attached to an exact agreement and frozen terms.",
        clarificationValue: clarification(
          "Which agreement should receive this authorization?",
          ["Paste the agreement link", "Open my commitments"],
          "The exact recipient, amount, activation condition, cancellation, and settlement state must be verified.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [proposal("authorize_payment", { agreementId, amount, currency: "USD" }, 0.96, "The request identifies an agreement and exact payment amount.")];
    return deterministicResult({
      intentSummary: "Preview payment authorization",
      assistantMessage: "I will show the exact amount and agreement consequences. Authorization requires typing the displayed confirmation phrase and still uses the provider's authoritative checkout.",
      tools,
    });
  }

  if (/\b(?:what is|explain|how does|why)\b.*\b(?:moral trade|no[- ]trade baseline|counterfactual trust|public good|assurance|threshold|evidence)\b/i.test(input)) {
    const tools = [proposal("explain_moral_trade", { question: input }, 0.98, "The request asks for an explanation of Moral Trade concepts or mechanisms.")];
    return deterministicResult({
      intentSummary: "Explain a Moral Trade concept",
      assistantMessage: "I will answer from the product's published mechanism and safety materials and link to the relevant record or documentation.",
      tools,
    });
  }

  if (/^(?:please\s+)?(?:open|go to|take me to|navigate to|show me)\b/i.test(input)) {
    const tools = [proposal("navigate", { query: routeQuery(input) }, 0.97, "The request explicitly asks to open a product workspace.")];
    return deterministicResult({
      intentSummary: "Navigate in Moral Trade",
      assistantMessage: "I will open the matching Moral Trade workspace. Navigation itself creates no record.",
      tools,
    });
  }

  const reciprocalCandidate = parseTradeCommand(input);
  if (
    (/\b(?:create|draft|build|make|offer)\b/i.test(input) && /\b(?:trade|offer|commitment|exchange|if|in return)\b/i.test(input)) ||
    (Boolean(reciprocalCandidate.values.proposedAction) && Boolean(reciprocalCandidate.values.requestedAction) && /\b(?:if|in exchange|in return|provided that|when)\b/i.test(input))
  ) {
    const parsed = reciprocalCandidate;
    if (
      !parsed.values.proposedAction ||
      !parsed.values.requestedAction ||
      !parsed.values.offeredCause ||
      !parsed.values.requestedCause
    ) {
      return deterministicResult({
        intentSummary: "Clarify reciprocal trade terms",
        assistantMessage: "I can prepare the trade, but I will not infer a missing side or priority.",
        clarificationValue: clarification(
          "What will each participant do, and which priority does each commitment advance?",
          ["State both commitments", "Choose a reviewed template", "Open the trade editor"],
          "A valid moral trade needs both commitments and an explicit no-trade baseline.",
        ),
        confidence: 0.99,
      });
    }
    const tools = [
      proposal(
        "create_trade_draft",
        {
          offeredCause: parsed.values.offeredCause,
          requestedCause: parsed.values.requestedCause,
          proposedAction: parsed.values.proposedAction,
          requestedAction: parsed.values.requestedAction,
          noTradeBaseline: parsed.values.noTradeBaseline,
          duration: parsed.values.duration,
          evidenceRule: parsed.values.evidenceRule,
          exitConditions: parsed.values.exitConditions,
        },
        0.96,
        "The request contains two reciprocal commitments and identifiable priorities.",
      ),
    ];
    return deterministicResult({
      intentSummary: "Prepare a private reciprocal trade draft",
      assistantMessage: "I will load these terms into the private editor. No draft will be saved, sent, or made public until you review the fields and use the editor's save action.",
      tools,
    });
  }

  const tools = [proposal("search_site", { query: input }, 0.91, "The request does not map confidently to a state-changing capability, so the safest broad action is product search.")];
  return deterministicResult({
    intentSummary: "Search for a supported Moral Trade action",
    assistantMessage: "I could not identify a safe state-changing operation with at least 90% confidence. I will search Moral Trade for the closest supported workspace instead.",
    tools,
    confidence: 0.91,
  });
}

function capabilityPrompt() {
  return COMMAND_CAPABILITIES.map((capability) => ({
    key: capability.key,
    title: capability.title,
    description: capability.description,
    permissionTier: capability.permissionTier,
    confirmationLevel: capability.confirmationLevel,
    executionMode: capability.executionMode,
    authorization: capability.authorization,
    inputSchema: capability.inputSchema,
  }));
}

function plannerSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      intentSummary: { type: "string", maxLength: 240 },
      assistantMessage: { type: "string", maxLength: 1000 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      plan: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            status: { type: "string", enum: ["planned", "running", "completed", "blocked"] },
            capabilityKey: { type: ["string", "null"] },
          },
          required: ["id", "label", "status", "capabilityKey"],
        },
      },
      clarification: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            properties: {
              required: { type: "boolean" },
              question: { type: "string" },
              options: { type: "array", items: { type: "string" }, maxItems: 6 },
              reason: { type: "string" },
            },
            required: ["required", "question", "options", "reason"],
          },
        ],
      },
      tools: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            capabilityKey: { type: "string" },
            argumentsJson: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            rationale: { type: "string" },
          },
          required: ["capabilityKey", "argumentsJson", "confidence", "rationale"],
        },
      },
    },
    required: ["intentSummary", "assistantMessage", "confidence", "plan", "clarification", "tools"],
  };
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string") return content.text;
    }
  }
  return "";
}

function validateModelOutput(value: any): CommandPlannerOutput | null {
  if (!value || typeof value !== "object" || !Array.isArray(value.tools)) return null;
  const tools: CommandToolProposal[] = [];
  for (const rawTool of value.tools.slice(0, 6)) {
    const capability = getCommandCapability(String(rawTool.capabilityKey ?? ""));
    if (!capability) return null;
    let argumentsValue: Record<string, unknown>;
    try {
      const parsed = JSON.parse(String(rawTool.argumentsJson ?? "{}"));
      argumentsValue = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return null;
    }
    const confidence = Number(rawTool.confidence);
    if (!Number.isFinite(confidence) || confidence < MIN_TOOL_CONFIDENCE || confidence > 1) {
      return null;
    }
    tools.push({
      capabilityKey: capability.key,
      arguments: argumentsValue,
      confidence,
      rationale: String(rawTool.rationale ?? capability.description).slice(0, 1000),
    });
  }
  const clarificationValue = value.clarification && typeof value.clarification === "object"
    ? {
        required: Boolean(value.clarification.required),
        question: String(value.clarification.question ?? ""),
        options: Array.isArray(value.clarification.options)
          ? value.clarification.options.map(String).slice(0, 6)
          : [],
        reason: String(value.clarification.reason ?? ""),
      }
    : null;
  const confidence = Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  if (tools.some((tool) => tool.confidence < MIN_TOOL_CONFIDENCE)) return null;
  return {
    intentSummary: String(value.intentSummary ?? "Moral Trade command").slice(0, 240),
    assistantMessage: String(value.assistantMessage ?? "").slice(0, 1000),
    confidence,
    plan: Array.isArray(value.plan)
      ? value.plan.slice(0, 8).map((entry: any, index: number) => ({
          id: String(entry?.id ?? `step-${index + 1}`),
          label: String(entry?.label ?? "Review action"),
          status: ["planned", "running", "completed", "blocked"].includes(entry?.status)
            ? entry.status
            : "planned",
          capabilityKey: entry?.capabilityKey ? String(entry.capabilityKey) : undefined,
        }))
      : planFor(tools),
    clarification: clarificationValue,
    tools,
    modelMode: "openai",
    modelName: process.env.MORAL_TRADE_COMMAND_MODEL?.trim() || DEFAULT_MODEL,
  };
}

async function planWithOpenAI(
  message: string,
  history: Pick<CommandMessageView, "role" | "body">[],
): Promise<CommandPlannerOutput | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const enabled = process.env.MORAL_TRADE_COMMAND_LLM_ENABLED?.trim().toLowerCase();
  if (!apiKey || enabled === "false" || enabled === "0") return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const recentHistory = history
      .slice(-10)
      .map((entry) => `${entry.role.toUpperCase()}: ${entry.body.slice(0, 1500)}`)
      .join("\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MORAL_TRADE_COMMAND_MODEL?.trim() || DEFAULT_MODEL,
        store: false,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You are the planning layer for Moral Trade Command.",
                  "Select only capabilities from the supplied registry. Never claim that an action succeeded; execution results are authoritative.",
                  "Never bypass authentication, consent, review, row-level security, exact-version terms, or provider state.",
                  "Block coercion, threats, fabricated baselines/evidence, unlawful conduct, and unauthorized access.",
                  "For every proposed tool call, report confidence. If any material field or tool choice is below 0.90, propose no tool and ask exactly one focused clarification question.",
                  "Read-only tools may execute immediately. Private drafts may only open editors. External actions require explicit confirmation. Financial actions require an exact typed phrase and provider-hosted authoritative flow.",
                  "For public-good requests, preserve participant count, per-person contribution, activation threshold, deadline, fallback, evidence, and free-rider limitations. Never call an informal intention a funded pool.",
                  `CAPABILITIES=${JSON.stringify(capabilityPrompt())}`,
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${recentHistory ? `RECENT CONVERSATION\n${recentHistory}\n\n` : ""}CURRENT COMMAND\n${message}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "moral_trade_command_plan",
            strict: true,
            schema: plannerSchema(),
          },
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractOutputText(payload);
    if (!text) return null;
    return validateModelOutput(JSON.parse(text));
  } catch (error) {
    console.warn("[command] OpenAI planning unavailable; using deterministic planner.", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function planCommand({
  message,
  history = [],
}: {
  message: string;
  history?: Pick<CommandMessageView, "role" | "body">[];
}) {
  const deterministic = planCommandDeterministically(message);
  if (deterministic.clarification || deterministic.tools[0]?.capabilityKey === "block_prohibited_request") {
    return deterministic;
  }
  const modelPlan = await planWithOpenAI(message, history);
  if (!modelPlan) return deterministic;
  if (modelPlan.tools.some((tool) => tool.confidence < MIN_TOOL_CONFIDENCE)) {
    return deterministicResult({
      intentSummary: "Clarify before acting",
      assistantMessage: "I am not at least 90% confident about one or more proposed actions.",
      clarificationValue: clarification(
        "Which exact Moral Trade record or action should I use?",
        ["Provide a record link", "State the desired outcome", "Open product search"],
        "Command does not execute low-confidence tool calls.",
      ),
      confidence: 0.99,
    });
  }
  return modelPlan;
}

export const COMMAND_MIN_TOOL_CONFIDENCE = MIN_TOOL_CONFIDENCE;
