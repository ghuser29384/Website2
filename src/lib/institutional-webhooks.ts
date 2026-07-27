import { isIP } from "node:net";
import { promises as dns } from "node:dns";

import {
  INSTITUTIONAL_WEBHOOK_EVENTS,
  validateSupportedInstitutionalWebhookEvents,
  type InstitutionalWebhookEvent,
} from "@/lib/institutional-trade";

const SECRET_KEY_PATTERN = /(?:secret|token|password|passphrase|api[_-]?key|private[_-]?key|authorization|credential|client[_-]?secret)/i;
const SECRET_VALUE_PATTERN = /(?:^|[^a-z0-9])(?:sk_(?:live|test)_[a-z0-9_-]{8,}|whsec_[a-z0-9_-]{8,}|sb_(?:secret|service)_[a-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|bearer\s+[a-z0-9._~+/=-]{12,})(?:$|[^a-z0-9])/i;

function walkConfig(value: unknown, path: string[] = []): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = walkConfig(value[index], [...path, String(index)]);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) return [...path, key].join(".");
      const found = walkConfig(nested, [...path, key]);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "string" && SECRET_VALUE_PATTERN.test(value)) return path.join(".") || "value";
  return null;
}

export function assertInstitutionalIntegrationConfigHasNoSecrets(config: unknown) {
  const path = walkConfig(config);
  if (path) throw new Error(`Integration configuration contains a secret-like field or value at ${path}. Store credentials through the one-time secret flow instead.`);
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isForbiddenInstitutionalWebhookAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? isPrivateIpv4(address) : family === 6 ? isPrivateIpv6(address) : true;
}

export async function validateInstitutionalWebhookDestination(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Webhook destination must be a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("Webhook destinations must use HTTPS.");
  if (url.username || url.password) throw new Error("Webhook destinations cannot contain embedded credentials.");
  if (url.port && url.port !== "443") throw new Error("Webhook destinations must use the standard HTTPS port.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Webhook destinations cannot target localhost or local network names.");
  }
  if (isIP(hostname) && isForbiddenInstitutionalWebhookAddress(hostname)) {
    throw new Error("Webhook destinations cannot target private, loopback, multicast, or link-local addresses.");
  }
  const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!resolved.length) throw new Error("Webhook destination did not resolve to an address.");
  const forbidden = resolved.find((entry) => isForbiddenInstitutionalWebhookAddress(entry.address));
  if (forbidden) throw new Error("Webhook destination resolves to a private, loopback, multicast, or link-local address.");
  return { normalizedUrl: url.toString(), resolvedAddresses: resolved.map((entry) => entry.address) };
}

export function validateInstitutionalWebhookInput(input: {
  events: readonly string[];
  config?: unknown;
}) {
  assertInstitutionalIntegrationConfigHasNoSecrets(input.config ?? {});
  return validateSupportedInstitutionalWebhookEvents(input.events);
}

export { INSTITUTIONAL_WEBHOOK_EVENTS };
export type { InstitutionalWebhookEvent };
