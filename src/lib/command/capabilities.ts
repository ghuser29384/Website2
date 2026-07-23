import type { CommandCapabilityDefinition } from "@/lib/command/types";

const string = (description: string, maxLength = 500) => ({
  type: "string",
  description,
  maxLength,
});

const optionalId = (description: string) => ({
  type: ["string", "null"],
  description,
  maxLength: 120,
});

export const COMMAND_CAPABILITIES = [
  {
    key: "navigate",
    title: "Open a Moral Trade workspace",
    description: "Navigate to an allowed Moral Trade route.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "public",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { query: string("Route name or product area", 160) },
      required: ["query"],
    },
    consequence: {
      public: "No public record is created.",
      financial: "No payment is authorized or moved.",
      privacy: "Only the requested destination is opened.",
      legal: "Navigation does not form an agreement.",
    },
    examples: ["Open my commitments", "Take me to Evidence", "Show Trade controls"],
  },
  {
    key: "search_site",
    title: "Search Moral Trade",
    description: "Search product areas, documentation, account workspaces, and supported actions.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "public",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { query: string("Search query", 160) },
      required: ["query"],
    },
    consequence: {
      public: "No public record is created.",
      financial: "No financial action occurs.",
      privacy: "Search uses only the submitted query and public route catalogue.",
      legal: "Search results are informational.",
    },
    examples: ["Where can I manage reminders?", "Find privacy controls"],
  },
  {
    key: "search_offers",
    title: "Search live proposals",
    description: "Search open Moral Trade proposals by cause, action, participant label, or format.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "public",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: string("Terms to search for", 160),
        mode: {
          type: ["string", "null"],
          enum: ["pledge", "payment", "offset", null],
        },
        limit: { type: ["integer", "null"], minimum: 1, maximum: 8 },
      },
      required: ["query", "mode", "limit"],
    },
    consequence: {
      public: "No proposal is created or changed.",
      financial: "No payment occurs.",
      privacy: "Only public proposal fields are searched.",
      legal: "Search does not create interest or agreement state.",
    },
    examples: ["Find animal-welfare trades under $50", "Search live donation offsets"],
  },
  {
    key: "compare_offers",
    title: "Compare saved proposals",
    description: "Open the private planner for side-by-side exposure, timing, and condition review.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: [],
    },
    consequence: {
      public: "No proposal state changes.",
      financial: "No payment occurs.",
      privacy: "The planner is private to the signed-in participant.",
      legal: "Comparison is not acceptance.",
    },
    examples: ["Compare my saved offers"],
  },
  {
    key: "review_commitments",
    title: "Review commitments",
    description: "List the participant's current agreements and open their exact status records.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { limit: { type: ["integer", "null"], minimum: 1, maximum: 8 } },
      required: ["limit"],
    },
    consequence: {
      public: "No agreement state changes.",
      financial: "No payment occurs.",
      privacy: "Only agreements involving the signed-in participant are returned.",
      legal: "Reviewing status does not confirm completion.",
    },
    examples: ["What commitments need attention?", "Show my active agreements"],
  },
  {
    key: "create_trade_draft",
    title: "Create a private trade draft",
    description: "Prepare bounded reciprocal terms and open the private trade editor. Nothing is saved until the participant uses the editor's save action.",
    permissionTier: "private_reversible",
    confirmationLevel: "acknowledge",
    executionMode: "private_handoff",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        offeredCause: string("Priority advanced by the user's commitment", 180),
        requestedCause: string("Priority advanced by the counterparty commitment", 180),
        proposedAction: string("Concrete user commitment", 5000),
        requestedAction: string("Concrete reciprocal commitment", 5000),
        noTradeBaseline: string("What happens without agreement", 5000),
        duration: string("Bounded duration", 200),
        evidenceRule: string("Evidence that would count", 5000),
        exitConditions: string("How future obligations can end", 5000),
      },
      required: [
        "offeredCause",
        "requestedCause",
        "proposedAction",
        "requestedAction",
        "noTradeBaseline",
        "duration",
        "evidenceRule",
        "exitConditions",
      ],
    },
    consequence: {
      public: "Opening the editor creates no public proposal.",
      financial: "No payment or donation is authorized.",
      privacy: "Terms remain private until separately submitted and published.",
      legal: "A draft is nonbinding and requires separate bilateral confirmation.",
    },
    examples: ["Draft $5 for one vegetarian meal", "Create a 30-day reciprocal pledge"],
  },
  {
    key: "update_trade_draft",
    title: "Edit a private proposal",
    description: "Open the owner-only proposal manager for a specified draft or offer.",
    permissionTier: "private_reversible",
    confirmationLevel: "acknowledge",
    executionMode: "private_handoff",
    reversible: true,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { offerId: optionalId("Offer or draft identifier") },
      required: ["offerId"],
    },
    consequence: {
      public: "No change occurs until the owner saves or submits the editor form.",
      financial: "No payment occurs.",
      privacy: "The manager is owner-scoped.",
      legal: "Editing does not create an agreement.",
    },
    examples: ["Edit my latest draft", "Change offer 123"],
  },
  {
    key: "create_counteroffer",
    title: "Draft a counteroffer",
    description: "Open the participant conversation or proposal manager to prepare a structured term diff.",
    permissionTier: "external_consequential",
    confirmationLevel: "confirm",
    executionMode: "confirmed_handoff",
    reversible: true,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        threadId: optionalId("Message thread identifier"),
        offerId: optionalId("Offer identifier"),
        agreementId: optionalId("Agreement identifier"),
        requestedChanges: string("Requested term changes", 2000),
      },
      required: ["threadId", "offerId", "agreementId", "requestedChanges"],
    },
    consequence: {
      public: "A counteroffer remains private until explicitly sent.",
      financial: "No payment occurs.",
      privacy: "The counterparty may see sent terms and the term diff.",
      legal: "Sending proposes a new version; it does not activate an agreement.",
    },
    examples: ["Counter the first offer with a 30-day duration"],
  },
  {
    key: "send_invitation",
    title: "Invite a counterparty",
    description: "Open the exact invitation flow for a reviewed published proposal.",
    permissionTier: "external_consequential",
    confirmationLevel: "confirm",
    executionMode: "confirmed_handoff",
    reversible: false,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        offerId: optionalId("Published offer identifier"),
        recipient: { type: ["string", "null"], maxLength: 320 },
        note: { type: ["string", "null"], maxLength: 1000 },
      },
      required: ["offerId", "recipient", "note"],
    },
    consequence: {
      public: "The proposal remains governed by its existing visibility state.",
      financial: "No payment occurs.",
      privacy: "A sent invitation discloses the frozen proposal terms to the named recipient.",
      legal: "The recipient may accept, counter, or decline; invitation alone forms no agreement.",
    },
    examples: ["Invite someone to my published trade"],
  },
  {
    key: "submit_evidence",
    title: "Submit agreement evidence",
    description: "Open the participant evidence dossier for the specified agreement.",
    permissionTier: "external_consequential",
    confirmationLevel: "confirm",
    executionMode: "confirmed_handoff",
    reversible: false,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        agreementId: optionalId("Agreement identifier"),
        description: { type: ["string", "null"], maxLength: 2000 },
        publicSafeConfirmed: { type: ["boolean", "null"] },
      },
      required: ["agreementId", "description", "publicSafeConfirmed"],
    },
    consequence: {
      public: "Evidence may become public according to the frozen privacy scope and redaction review.",
      financial: "Evidence may affect later settlement but does not itself move money.",
      privacy: "Only public-safe, necessary artifacts should be submitted.",
      legal: "Submission is a factual claim subject to challenge; it is not independent certification.",
    },
    examples: ["Submit evidence for my animal-welfare agreement"],
  },
  {
    key: "join_pool",
    title: "Join a conditional pool",
    description: "Open the selected pool's contribution and threshold review flow.",
    permissionTier: "external_consequential",
    confirmationLevel: "confirm",
    executionMode: "confirmed_handoff",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        poolId: optionalId("Pool identifier"),
        amount: { type: ["number", "null"], minimum: 0 },
        currency: { type: ["string", "null"], maxLength: 8 },
      },
      required: ["poolId", "amount", "currency"],
    },
    consequence: {
      public: "Only the pool's published aggregate and allowed participant state may be visible.",
      financial: "The exact pool screen states whether the contribution is a non-money pledge, authorization, or live charge.",
      privacy: "Participant details follow pool disclosure rules.",
      legal: "Threshold and fallback terms control activation; joining does not guarantee funding.",
    },
    examples: ["Join the animal-welfare pool with $20"],
  },
  {
    key: "create_public_good_proposal",
    title: "Draft a moral public-good pool",
    description: "Open the threshold-coalition proposal editor with participant count, contribution, threshold, deadline, and evidence left explicit.",
    permissionTier: "private_reversible",
    confirmationLevel: "acknowledge",
    executionMode: "private_handoff",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: string("Public-good proposal title", 180),
        participantCount: { type: ["integer", "null"], minimum: 2, maximum: 1000000000 },
        contributionAmount: { type: ["number", "null"], minimum: 0, maximum: Math.floor(Number.MAX_SAFE_INTEGER / 100) },
        thresholdCount: { type: ["integer", "null"], minimum: 1, maximum: 1000000000 },
        cause: string("Shared moral public good", 180),
      },
      required: ["title", "participantCount", "contributionAmount", "thresholdCount", "cause"],
    },
    consequence: {
      public: "Opening the editor creates no live pool.",
      financial: "No contribution is authorized.",
      privacy: "Draft terms remain private until separately submitted.",
      legal: "A proposal must preserve threshold, fallback, evidence, and free-rider limitations.",
    },
    examples: ["Create a pool where 100 people pay $20 if 80 join"],
  },
  {
    key: "create_donation_offset",
    title: "Draft a donation offset",
    description: "Open the reviewed donation-offset editor with explicit baseline, destination, ratio, evidence, and unmatched-surplus rules.",
    permissionTier: "private_reversible",
    confirmationLevel: "acknowledge",
    executionMode: "private_handoff",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { description: string("Requested offset structure", 2000) },
      required: ["description"],
    },
    consequence: {
      public: "No offset is published by opening the editor.",
      financial: "No donation or payment is authorized.",
      privacy: "Baseline and destination terms remain private until submitted.",
      legal: "Opening a template does not establish counterfactual truth or form an agreement.",
    },
    examples: ["Draft an offset for two opposed planned donations"],
  },
  {
    key: "update_priority_profile",
    title: "Update priority profile",
    description: "Open the private 100-spark priority editor.",
    permissionTier: "private_reversible",
    confirmationLevel: "acknowledge",
    executionMode: "private_handoff",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { summary: string("Requested priority change", 1000) },
      required: ["summary"],
    },
    consequence: {
      public: "Priority changes are not public by default.",
      financial: "No payment occurs.",
      privacy: "The profile editor is private and participant-controlled.",
      legal: "Preferences do not waive safety, authority, or noncompensable constraints.",
    },
    examples: ["Put more weight on animal welfare"],
  },
  {
    key: "schedule_reminder",
    title: "Manage reminders",
    description: "Open the relevant agreement or commitments workspace to configure reminder cadence and channels.",
    permissionTier: "private_reversible",
    confirmationLevel: "acknowledge",
    executionMode: "private_handoff",
    reversible: true,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        agreementId: optionalId("Agreement identifier"),
        cadence: string("Requested reminder cadence", 120),
      },
      required: ["agreementId", "cadence"],
    },
    consequence: {
      public: "Reminder settings are private.",
      financial: "No payment occurs.",
      privacy: "External calendar labels exclude private terms by default.",
      legal: "A reminder does not amend the frozen agreement.",
    },
    examples: ["Remind me weekly about agreement 123"],
  },
  {
    key: "open_messages",
    title: "Open private messages",
    description: "Open a specific participant conversation or the messages inbox.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "authenticated",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { threadId: optionalId("Message thread identifier") },
      required: ["threadId"],
    },
    consequence: {
      public: "No message is sent.",
      financial: "No payment occurs.",
      privacy: "Only participant-authorized threads are opened.",
      legal: "Opening a thread does not accept terms.",
    },
    examples: ["Open my messages with the counterparty"],
  },
  {
    key: "authorize_payment",
    title: "Review payment authorization",
    description: "Open the exact agreement payment screen after a strong confirmation. The payment provider remains authoritative.",
    permissionTier: "financial_strong_confirmation",
    confirmationLevel: "type_exact_phrase",
    executionMode: "strong_confirmed_handoff",
    reversible: false,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        agreementId: optionalId("Agreement identifier"),
        amount: { type: ["number", "null"], minimum: 0 },
        currency: { type: ["string", "null"], maxLength: 8 },
      },
      required: ["agreementId", "amount", "currency"],
    },
    consequence: {
      public: "Payment records follow the agreement's published-state rules.",
      financial: "The provider screen may authorize or charge the exact stated amount only after its own confirmation.",
      privacy: "Provider and agreement payment metadata are participant-scoped.",
      legal: "Provider terms, refund rules, and the frozen agreement remain controlling.",
    },
    examples: ["Authorize the $25 payment on agreement 123"],
  },
  {
    key: "cancel_or_refund_payment",
    title: "Review cancellation or refund",
    description: "Open the agreement's exact cancellation, refund, or dispute workflow after strong confirmation.",
    permissionTier: "financial_strong_confirmation",
    confirmationLevel: "type_exact_phrase",
    executionMode: "strong_confirmed_handoff",
    reversible: false,
    authorization: "participant",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        agreementId: optionalId("Agreement identifier"),
        requestedAction: {
          type: "string",
          enum: ["cancel", "refund", "dispute"],
        },
        reason: string("Participant-provided reason", 1000),
        amount: { type: ["number", "null"], minimum: 0 },
        currency: { type: ["string", "null"], maxLength: 8 },
      },
      required: ["agreementId", "requestedAction", "reason", "amount", "currency"],
    },
    consequence: {
      public: "Public status changes only after the authoritative workflow records them.",
      financial: "Cancellation or refund eligibility depends on provider and agreement state.",
      privacy: "Reason text is participant-scoped unless separately disclosed.",
      legal: "The exact provider and agreement rules control the outcome.",
    },
    examples: ["Request a refund for agreement 123"],
  },
  {
    key: "explain_moral_trade",
    title: "Explain Moral Trade",
    description: "Answer questions using product rules and link to the relevant documentation or record.",
    permissionTier: "read_only",
    confirmationLevel: "none",
    executionMode: "immediate",
    reversible: true,
    authorization: "public",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { question: string("Question about Moral Trade", 2000) },
      required: ["question"],
    },
    consequence: {
      public: "No record is created.",
      financial: "No financial action occurs.",
      privacy: "The answer uses the submitted question and public product rules.",
      legal: "Explanations are not legal, tax, investment, or moral certification.",
    },
    examples: ["What is the no-trade baseline?", "How do assurance thresholds work?"],
  },
  {
    key: "block_prohibited_request",
    title: "Block prohibited request",
    description: "Refuse coercive, unlawful, fraudulent, privacy-invasive, unauthorized, or value-destroying threat requests.",
    permissionTier: "prohibited",
    confirmationLevel: "none",
    executionMode: "blocked",
    reversible: true,
    authorization: "public",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { reason: string("Policy reason", 500) },
      required: ["reason"],
    },
    consequence: {
      public: "No action is taken.",
      financial: "No action is taken.",
      privacy: "No private data is disclosed.",
      legal: "Prohibited or unauthorized actions are not executed.",
    },
    examples: ["Threaten harm unless they accept", "Access another user's private records"],
  },
] as const satisfies readonly CommandCapabilityDefinition[];

export type CommandCapabilityKey = (typeof COMMAND_CAPABILITIES)[number]["key"];

const CAPABILITY_MAP = new Map(
  COMMAND_CAPABILITIES.map((capability) => [capability.key, capability]),
);

export function getCommandCapability(key: string) {
  return CAPABILITY_MAP.get(key as CommandCapabilityKey) ?? null;
}

export function getCommandCapabilityPublicContract() {
  return COMMAND_CAPABILITIES.map((capability) => ({
    key: capability.key,
    title: capability.title,
    description: capability.description,
    permissionTier: capability.permissionTier,
    confirmationLevel: capability.confirmationLevel,
    executionMode: capability.executionMode,
    reversible: capability.reversible,
    authorization: capability.authorization,
    inputSchema: capability.inputSchema,
    consequence: capability.consequence,
    examples: capability.examples,
  }));
}

function schemaTypes(schema: Record<string, any>) {
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function valueMatchesSchema(value: unknown, schema: Record<string, any>) {
  if (value === null) return schemaTypes(schema).includes("null");
  const types = schemaTypes(schema);
  if (types.includes("string") && typeof value === "string") {
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) return false;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
    return true;
  }
  if (types.includes("number") && typeof value === "number" && Number.isFinite(value)) {
    if (typeof schema.minimum === "number" && value < schema.minimum) return false;
    if (typeof schema.maximum === "number" && value > schema.maximum) return false;
    return true;
  }
  if (types.includes("integer") && Number.isInteger(value)) {
    if (typeof schema.minimum === "number" && (value as number) < schema.minimum) return false;
    if (typeof schema.maximum === "number" && (value as number) > schema.maximum) return false;
    return true;
  }
  if (types.includes("boolean") && typeof value === "boolean") return true;
  if (types.includes("object") && value && typeof value === "object" && !Array.isArray(value)) return true;
  if (types.includes("array") && Array.isArray(value)) return true;
  return false;
}

export function validateCommandCapabilityArguments(
  capabilityKey: string,
  value: Record<string, unknown>,
) {
  const capability = getCommandCapability(capabilityKey);
  if (!capability) return { ok: false, errors: ["Unknown capability."] };
  const schema = capability.inputSchema as Record<string, any>;
  const properties = (schema.properties ?? {}) as Record<string, Record<string, any>>;
  const required = Array.isArray(schema.required) ? schema.required : [];
  const errors: string[] = [];
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!properties[key]) errors.push(`Unexpected field: ${key}`);
    }
  }
  for (const key of required) {
    if (!(key in value)) errors.push(`Missing field: ${key}`);
  }
  for (const [key, entry] of Object.entries(value)) {
    const propertySchema = properties[key];
    if (propertySchema && !valueMatchesSchema(entry, propertySchema)) {
      errors.push(`Invalid field: ${key}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
