export type MoralTradeSafeEmailKind =
  | "offer_response_received"
  | "response_accepted"
  | "payment_reminder"
  | "payment_schedule_update"
  | "payment_confirmed"
  | "payment_failed";

export interface MoralTradeSafeEmailCopy {
  body: string;
  subject: string;
}

export interface MoralTradeEmailOutboxSafetyInput {
  body: string;
  provider?: string | null;
  subject: string;
}

export interface MoralTradeEmailOutboxSafetyResult {
  applies: boolean;
  blockers: string[];
  status: "pass" | "suppress";
}

const SAFE_EMAIL_COPY: Record<MoralTradeSafeEmailKind, MoralTradeSafeEmailCopy> = {
  offer_response_received: {
    subject: "Moral Trade: offer response update",
    body:
      "A Moral Trade offer has a new response waiting in your dashboard. For privacy, this email leaves out participant aliases, offer terms, exact wishes, contact details, payment amounts, agreement IDs, evidence, and source notes. Sign in to review the response and decide whether to form an agreement.",
  },
  payment_confirmed: {
    subject: "Moral Trade: payment update",
    body:
      "A payment status update is waiting in your Moral Trade dashboard. For privacy, this email leaves out payment amounts, agreement IDs, participant aliases, exact wishes, contact details, evidence, and source notes. Sign in to review the agreement record.",
  },
  payment_failed: {
    subject: "Moral Trade: payment update",
    body:
      "A payment status update is waiting in your Moral Trade dashboard. For privacy, this email leaves out payment amounts, agreement IDs, participant aliases, exact wishes, contact details, evidence, and source notes. Sign in to review the agreement record.",
  },
  payment_reminder: {
    subject: "Moral Trade: payment review needed",
    body:
      "A scheduled payment needs review in your Moral Trade dashboard. For privacy, this email leaves out payment amounts, agreement IDs, participant aliases, exact wishes, contact details, evidence, and source notes. Sign in to review the agreement, pay through the configured provider, or record a change.",
  },
  payment_schedule_update: {
    subject: "Moral Trade: payment schedule update",
    body:
      "A payment schedule update is waiting in your Moral Trade dashboard. For privacy, this email leaves out payment amounts, agreement IDs, participant aliases, exact wishes, contact details, evidence, and source notes. Sign in to review the agreement record.",
  },
  response_accepted: {
    subject: "Moral Trade: agreement update",
    body:
      "A Moral Trade response was accepted and an agreement record is ready in your dashboard. For privacy, this email leaves out participant aliases, offer terms, exact wishes, contact details, payment amounts, agreement IDs, evidence, and source notes. Sign in to review payment, evidence, verification, and status options.",
  },
};

const NON_MORAL_TRADE_EMAIL_PROVIDERS = new Set(["mpgf_public_goods_reminder_worker"]);

const SENSITIVE_OUTBOX_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  {
    key: "contact_email_in_body",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    key: "phone_like_contact_in_body",
    pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/,
  },
  {
    key: "payment_amount_in_body",
    pattern: /(?:[$€£]\s?\d|\b\d+(?:\.\d{2})?\s?(?:USD|EUR|GBP)\b)/i,
  },
  {
    key: "agreement_or_payment_identifier_in_body",
    pattern: /\b(?:agreement|payment)\s+[0-9a-f]{8,}(?:-[0-9a-f-]+)?\b/i,
  },
  {
    key: "offer_terms_in_body",
    pattern: /\b(?:responded to|agreement was created for)\b[\s\S]{0,160}\bfor\b/i,
  },
  {
    key: "raw_private_surface_marker_in_body",
    pattern: /\b(?:exact wish|private ask|raw source note|secret contact)\s*:/i,
  },
];

export function buildMoralTradeSafeEmailCopy(
  kind: MoralTradeSafeEmailKind,
): MoralTradeSafeEmailCopy {
  return SAFE_EMAIL_COPY[kind];
}

export function evaluateMoralTradeEmailOutboxSafety({
  body,
  provider,
  subject,
}: MoralTradeEmailOutboxSafetyInput): MoralTradeEmailOutboxSafetyResult {
  if (provider && NON_MORAL_TRADE_EMAIL_PROVIDERS.has(provider)) {
    return {
      applies: false,
      blockers: [],
      status: "pass",
    };
  }

  const text = `${subject}\n${body}`;
  const blockers = SENSITIVE_OUTBOX_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ key }) => key,
  );

  return {
    applies: true,
    blockers,
    status: blockers.length ? "suppress" : "pass",
  };
}
