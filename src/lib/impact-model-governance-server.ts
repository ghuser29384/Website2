import "server-only";

import { createHash } from "node:crypto";

// Canonical hashing is revalidated on every changed exact pull-request head.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function canonicalImpactMethodologyJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function hashImpactMethodology(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(canonicalImpactMethodologyJson(value))
    .digest("hex")}`;
}
