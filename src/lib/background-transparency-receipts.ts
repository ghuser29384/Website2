import { createHash } from "node:crypto";

import type { Database } from "@/lib/supabase/database.types";

type TransparencyReceiptInsert =
  Database["public"]["Tables"]["transparency_receipts"]["Insert"];

export interface BackgroundTransparencyReceiptInput {
  actorScope: string;
  eventType: string;
  previousEntryHash?: string | null;
  redactedPayload: Record<string, unknown>;
}

export interface BackgroundTransparencyReceiptChainEntry {
  entry_hash: string;
  event_type: string;
  actor_scope: string;
  prev_hash: string | null;
  redacted_payload: Record<string, unknown>;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isUnsafeReceiptPayloadValue(value: unknown): boolean {
  if (typeof value === "string") {
    return /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d|exact private wish|raw source|contact detail)/i.test(
      value,
    );
  }

  if (Array.isArray(value)) {
    return value.some(isUnsafeReceiptPayloadValue);
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(isUnsafeReceiptPayloadValue);
  }

  return false;
}

export function buildTransparencyReceiptEntry({
  actorScope,
  eventType,
  previousEntryHash = null,
  redactedPayload,
}: BackgroundTransparencyReceiptInput): TransparencyReceiptInsert {
  if (isUnsafeReceiptPayloadValue(redactedPayload)) {
    throw new Error("Transparency receipts must contain redacted payloads only.");
  }

  const prevHash = previousEntryHash || null;
  const eventHash = sha256Hex(
    stableJson({
      actorScope,
      eventType,
      redactedPayload,
    }),
  );
  const entryHash = sha256Hex(
    stableJson({
      eventHash,
      prevHash,
    }),
  );

  return {
    actor_scope: actorScope,
    entry_hash: entryHash,
    event_type: eventType,
    prev_hash: prevHash,
    redacted_payload: redactedPayload,
  };
}

export function verifyTransparencyReceiptChain(
  receipts: BackgroundTransparencyReceiptChainEntry[],
) {
  let previousHash: string | null = null;

  for (const receipt of receipts) {
    if ((receipt.prev_hash ?? null) !== previousHash) {
      return false;
    }

    const expected = buildTransparencyReceiptEntry({
      actorScope: receipt.actor_scope,
      eventType: receipt.event_type,
      previousEntryHash: receipt.prev_hash,
      redactedPayload: receipt.redacted_payload,
    });

    if (expected.entry_hash !== receipt.entry_hash) {
      return false;
    }

    previousHash = receipt.entry_hash;
  }

  return true;
}
